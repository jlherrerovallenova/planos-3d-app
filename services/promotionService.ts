import { supabase, BUCKET_NAME, isSupabaseConfigured } from './supabaseClient';
import { Promotion, PromotionPlan, BatchUploadPlanItem } from '../types';

/**
 * Obtiene la lista completa de promociones ordenadas por fecha reciente.
 */
export async function getPromotions(): Promise<Promotion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener promociones:', error);
    throw error;
  }
  return data || [];
}

/**
 * Crea una nueva promoción en Supabase.
 */
export async function createPromotion(params: {
  name: string;
  description?: string;
  address?: string;
  developer_name?: string;
  agency_name?: string;
}): Promise<Promotion> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { data, error } = await supabase
    .from('promotions')
    .insert([
      {
        name: params.name.trim(),
        description: params.description?.trim() || null,
        address: params.address?.trim() || null,
        developer_name: params.developer_name?.trim() || null,
        agency_name: params.agency_name?.trim() || null
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error al crear promoción:', error);
    throw error;
  }
  return data;
}

/**
 * Elimina una promoción y todos sus planos asociados.
 */
export async function deletePromotion(promotionId: string): Promise<void> {
  if (!supabase) return;

  // 1. Obtener lista de archivos para borrarlos de Storage
  const { data: plans } = await supabase
    .from('plans')
    .select('file_path')
    .eq('promotion_id', promotionId);

  if (plans && plans.length > 0) {
    const paths = plans.map(p => p.file_path);
    await supabase.storage.from(BUCKET_NAME).remove(paths);
  }

  // 2. Eliminar registro de la tabla (cascade borrará los planes en DB)
  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', promotionId);

  if (error) {
    console.error('Error al eliminar promoción:', error);
    throw error;
  }
}

/**
 * Obtiene todos los planos de una promoción específica.
 */
export async function getPlansByPromotion(promotionId: string): Promise<PromotionPlan[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('promotion_id', promotionId)
    .order('portal', { ascending: true })
    .order('typology', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener planos de la promoción:', error);
    throw error;
  }
  return data || [];
}

/**
 * Sube un archivo físico a Supabase Storage y devuelve la ruta y la URL pública.
 */
export async function uploadPlanToStorage(
  promotionId: string,
  file: File
): Promise<{ filePath: string; publicUrl: string }> {
  if (!supabase) throw new Error('Supabase no está configurado');

  // Limpiar nombre de archivo para evitar caracteres extraños en URL
  const sanitizedName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  const timestamp = Date.now();
  const filePath = `${promotionId}/${timestamp}_${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    });

  if (uploadError) {
    console.error('Error al subir a Supabase Storage:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: urlData.publicUrl
  };
}

/**
 * Registra un plano en la base de datos de Supabase.
 */
export async function createPlanRecord(planData: {
  promotion_id: string;
  portal: string;
  typology: string;
  unit_identifier?: string;
  original_filename: string;
  file_path: string;
  storage_url: string;
  mime_type: string;
  file_size: number;
}): Promise<PromotionPlan> {
  if (!supabase) throw new Error('Supabase no está configurado');

  const { data, error } = await supabase
    .from('plans')
    .insert([
      {
        promotion_id: planData.promotion_id,
        portal: planData.portal.trim() || 'Portal 1',
        typology: planData.typology.trim() || 'Tipo General',
        unit_identifier: planData.unit_identifier?.trim() || null,
        original_filename: planData.original_filename,
        file_path: planData.file_path,
        storage_url: planData.storage_url,
        mime_type: planData.mime_type,
        file_size: planData.file_size
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error al registrar plano en base de datos:', error);
    throw error;
  }

  return data;
}

/**
 * Elimina un plano individual de la base de datos y de Storage.
 */
export async function deletePlan(planId: string, filePath: string): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
  } catch (err) {
    console.warn('No se pudo borrar archivo físico de storage:', err);
  }

  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId);

  if (error) {
    console.error('Error al eliminar registro de plano:', error);
    throw error;
  }
}

/**
 * Ejecuta la subida de un lote completo de planos con actualización en vivo.
 */
export async function processBatchUpload(
  promotionId: string,
  items: BatchUploadPlanItem[],
  onUpdateItem: (id: string, updates: Partial<BatchUploadPlanItem>) => void
): Promise<{ successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  for (const item of items) {
    if (item.status === 'completed') {
      successCount++;
      continue;
    }

    try {
      onUpdateItem(item.id, { status: 'uploading', progress: 30 });

      // 1. Subida a Supabase Storage
      const { filePath, publicUrl } = await uploadPlanToStorage(promotionId, item.file);
      onUpdateItem(item.id, { progress: 75 });

      // 2. Registro en tabla plans
      await createPlanRecord({
        promotion_id: promotionId,
        portal: item.portal,
        typology: item.typology,
        unit_identifier: item.unit_identifier,
        original_filename: item.file.name,
        file_path: filePath,
        storage_url: publicUrl,
        mime_type: item.file.type || 'image/png',
        file_size: item.file.size
      });

      onUpdateItem(item.id, { status: 'completed', progress: 100 });
      successCount++;
    } catch (err: any) {
      console.error(`Error subiendo ${item.file.name}:`, err);
      onUpdateItem(item.id, {
        status: 'error',
        error: err.message || 'Error en subida',
        progress: 0
      });
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

/**
 * Descarga el archivo de un plano (por su storage_url) y lo convierte en un File para cargarlo en el visor.
 */
export async function fetchPlanFileAsObject(plan: PromotionPlan): Promise<File> {
  const response = await fetch(plan.storage_url);
  if (!response.ok) {
    throw new Error(`Error al descargar plano: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new File([blob], plan.original_filename, { type: plan.mime_type || blob.type });
}
