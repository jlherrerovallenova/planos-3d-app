import React, { useState, useEffect, useRef } from 'react';
import { Promotion, BatchUploadPlanItem } from '../types';
import {
  getPromotions,
  createPromotion,
  processBatchUpload
} from '../services/promotionService';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (promotionId: string) => void;
  initialPromotionId?: string;
}

const COMMON_PORTALS = ['Portal 1', 'Portal 2', 'Portal 3', 'Portal 4', 'Portal A', 'Portal B', 'Portal Único'];
const COMMON_TYPOLOGIES = [
  '1 Dormitorio',
  '2 Dormitorios Tipo A',
  '2 Dormitorios Tipo B',
  '3 Dormitorios Tipo A',
  '3 Dormitorios Tipo B',
  '4 Dormitorios',
  'Ático con Terraza',
  'Bajo con Jardín',
  'Dúplex',
  'Estudio'
];

export function BatchUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  initialPromotionId
}: BatchUploadModalProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>(initialPromotionId || '');
  const [isLoadingPromotions, setIsLoadingPromotions] = useState<boolean>(false);
  const [promotionsError, setPromotionsError] = useState<string | null>(null);

  // Formulario nueva promoción
  const [showNewPromoForm, setShowNewPromoForm] = useState<boolean>(false);
  const [newPromoName, setNewPromoName] = useState<string>('');
  const [newPromoAddress, setNewPromoAddress] = useState<string>('');
  const [newPromoDeveloper, setNewPromoDeveloper] = useState<string>('');
  const [isCreatingPromo, setIsCreatingPromo] = useState<boolean>(false);

  // Valores globales por defecto para aplicar en lote
  const [batchDefaultPortal, setBatchDefaultPortal] = useState<string>('Portal 1');
  const [batchDefaultTypology, setBatchDefaultTypology] = useState<string>('2 Dormitorios Tipo A');

  // Cola de archivos
  const [uploadItems, setUploadItems] = useState<BatchUploadPlanItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSummary, setUploadSummary] = useState<{ success: number; errors: number } | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cargar lista de promociones al abrir
  useEffect(() => {
    if (isOpen) {
      loadPromotionsList();
      setUploadSummary(null);
    }
  }, [isOpen]);

  const loadPromotionsList = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoadingPromotions(true);
    setPromotionsError(null);
    try {
      const data = await getPromotions();
      setPromotions(data);
      if (data.length > 0 && !selectedPromotionId) {
        setSelectedPromotionId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error cargando promociones:', err);
      if (err.message && err.message.includes('Could not find the table')) {
        setPromotionsError('Las tablas de Supabase aún no han sido creadas. Ejecuta el script SQL en el panel de Supabase.');
        setShowSqlGuide(true);
      } else {
        setPromotionsError(err.message || 'Error al conectar con Supabase');
      }
    } finally {
      setIsLoadingPromotions(false);
    }
  };

  // Crear una nueva promoción
  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoName.trim()) return;

    setIsCreatingPromo(true);
    try {
      const created = await createPromotion({
        name: newPromoName,
        address: newPromoAddress,
        developer_name: newPromoDeveloper
      });
      setPromotions(prev => [created, ...prev]);
      setSelectedPromotionId(created.id);
      setShowNewPromoForm(false);
      setNewPromoName('');
      setNewPromoAddress('');
      setNewPromoDeveloper('');
    } catch (err: any) {
      alert(`Error al crear la promoción: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsCreatingPromo(false);
    }
  };

  // Procesar selección de archivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFilesToQueue(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const validFiles = files.filter(f => {
      const isImg = f.type.startsWith('image/');
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      return isImg || isPdf;
    });

    const newItems: BatchUploadPlanItem[] = validFiles.map((file, idx) => {
      // Intentar deducir portal o letra del nombre del archivo
      let autoUnit = '';
      const match = file.name.match(/([0-9]+[ºª\s]*[a-zA-Z]|[0-9]+-[a-zA-Z]|[0-9]+[a-zA-Z])/i);
      if (match) autoUnit = match[1].toUpperCase();

      let previewUrl = '';
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }

      return {
        id: `batch_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        file,
        portal: batchDefaultPortal,
        typology: batchDefaultTypology,
        unit_identifier: autoUnit,
        status: 'pending',
        progress: 0,
        previewUrl
      };
    });

    setUploadItems(prev => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setUploadItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAllItems = () => {
    uploadItems.forEach(i => {
      if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
    });
    setUploadItems([]);
  };

  const updateItemField = (id: string, field: 'portal' | 'typology' | 'unit_identifier', value: string) => {
    setUploadItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const applyBatchDefaultsToAll = () => {
    setUploadItems(prev =>
      prev.map(item => ({
        ...item,
        portal: batchDefaultPortal,
        typology: batchDefaultTypology
      }))
    );
  };

  // Iniciar subida por lotes
  const handleStartUpload = async () => {
    if (!selectedPromotionId) {
      alert('Selecciona o crea una promoción antes de iniciar la subida.');
      return;
    }

    if (uploadItems.length === 0) {
      alert('Añade al menos un plano a la cola.');
      return;
    }

    setIsUploading(true);
    setUploadSummary(null);

    try {
      const summary = await processBatchUpload(
        selectedPromotionId,
        uploadItems,
        (itemId, updates) => {
          setUploadItems(prev =>
            prev.map(it => (it.id === itemId ? { ...it, ...updates } : it))
          );
        }
      );

      setUploadSummary({ success: summary.successCount, errors: summary.errorCount });
      if (onUploadComplete && summary.successCount > 0) {
        onUploadComplete(selectedPromotionId);
      }
    } catch (err: any) {
      alert(`Error durante la subida en lote: ${err.message || 'Error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800">
        {/* Cabecera Clara */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2C59] flex items-center justify-center text-white shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Subida Masiva de Planos por Promoción
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Supabase Cloud
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Organiza todos los planos de una promoción indicando portal, tipología e identificador de vivienda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrollable Claro */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF8F5]">
          {/* Advertencia si no existen tablas o error de Supabase */}
          {promotionsError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-amber-800">Tablas de base de datos pendientes en Supabase</div>
                <p className="mt-1 text-xs text-amber-700">{promotionsError}</p>
                <button
                  type="button"
                  onClick={() => setShowSqlGuide(!showSqlGuide)}
                  className="mt-2 text-xs font-semibold underline text-amber-800 hover:text-amber-950 cursor-pointer"
                >
                  {showSqlGuide ? 'Ocultar script SQL' : '👉 Ver script SQL listo para ejecutar en Supabase (1 clic)'}
                </button>
              </div>
            </div>
          )}

          {/* Guía SQL desplegable */}
          {showSqlGuide && (
            <div className="p-4 rounded-xl bg-white border border-stone-200 text-xs text-slate-700 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Instrucciones para Supabase:</span>
                <span className="text-slate-500">Archivo: <code className="text-[#0F2C59] font-bold">supabase-schema.sql</code></span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Ve a tu proyecto en <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline">supabase.com/dashboard</a></li>
                <li>Haz clic en la pestaña <strong>SQL Editor</strong> en la barra lateral izquierda.</li>
                <li>Haz clic en <strong>New Query</strong>, pega el contenido del archivo <code className="text-[#0F2C59] font-semibold">supabase-schema.sql</code> que hemos creado y dale al botón verde <strong>Run</strong>.</li>
                <li>Vuelve aquí y pulsa "Reintentar conexión".</li>
              </ol>
              <button
                type="button"
                onClick={loadPromotionsList}
                className="mt-2 px-3 py-1.5 bg-[#0F2C59] hover:bg-[#16385e] text-white rounded-lg font-medium text-xs transition-colors cursor-pointer"
              >
                🔄 Reintentar conexión con Supabase
              </button>
            </div>
          )}

          {/* 1. SELECCIÓN O CREACIÓN DE PROMOCIÓN */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-blue-100 text-[#0F2C59] flex items-center justify-center text-xs font-bold">1</span>
                Promoción Inmobiliaria de Destino
              </label>
              <button
                type="button"
                onClick={() => setShowNewPromoForm(!showNewPromoForm)}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
              >
                {showNewPromoForm ? 'Cancelar nueva promoción' : '+ Crear Nueva Promoción'}
              </button>
            </div>

            {/* Formulario desplegable para nueva promoción */}
            {showNewPromoForm ? (
              <form onSubmit={handleCreatePromotion} className="p-4 bg-stone-50 rounded-xl border border-blue-200 space-y-3 animate-fadeIn">
                <div className="text-xs font-bold text-[#0F2C59] uppercase tracking-wider">
                  Alta de Nueva Promoción
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-medium">Nombre de la Promoción *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Residencial Los Olivos"
                      value={newPromoName}
                      onChange={e => setNewPromoName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-[#0F2C59]/20 focus:border-[#0F2C59] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-medium">Ubicación / Dirección</label>
                    <input
                      type="text"
                      placeholder="Ej: Calle Gran Vía 12, Madrid"
                      value={newPromoAddress}
                      onChange={e => setNewPromoAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-[#0F2C59]/20 focus:border-[#0F2C59] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 mb-1 font-medium">Promotora / Comercializadora</label>
                    <input
                      type="text"
                      placeholder="Ej: Inmobiliaria Habitat"
                      value={newPromoDeveloper}
                      onChange={e => setNewPromoDeveloper(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-[#0F2C59]/20 focus:border-[#0F2C59] outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewPromoForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPromo || !newPromoName.trim()}
                    className="px-4 py-1.5 bg-[#0F2C59] hover:bg-[#16385e] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isCreatingPromo ? 'Guardando...' : 'Guardar y Seleccionar Promoción'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <select
                  value={selectedPromotionId}
                  onChange={e => setSelectedPromotionId(e.target.value)}
                  disabled={isLoadingPromotions || promotions.length === 0}
                  className="flex-1 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-[#0F2C59]/20 focus:border-[#0F2C59] outline-none shadow-2xs"
                >
                  {promotions.length === 0 ? (
                    <option value="">(No hay promociones creadas. Pulsa "+ Crear Nueva Promoción")</option>
                  ) : (
                    promotions.map(promo => (
                      <option key={promo.id} value={promo.id}>
                        {promo.name} {promo.address ? `— (${promo.address})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={loadPromotionsList}
                  title="Actualizar lista de promociones"
                  className="p-2.5 bg-white border border-stone-300 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className={`w-4 h-4 ${isLoadingPromotions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* 2. VALORES POR DEFECTO PARA APLICACIÓN RÁPIDA EN LOTE */}
          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-blue-100 text-[#0F2C59] flex items-center justify-center text-xs font-bold">2</span>
                Valores Predeterminados para este Lote
              </label>
              <span className="text-xs text-slate-500">Podrás cambiarlos individualmente en cada plano abajo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-700 mb-1 font-medium">Portal Predeterminado</label>
                <input
                  type="text"
                  list="portal-suggestions"
                  value={batchDefaultPortal}
                  onChange={e => setBatchDefaultPortal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-[#0F2C59]/20 focus:border-[#0F2C59] outline-none shadow-2xs"
                  placeholder="Portal 1"
                />
                <datalist id="portal-suggestions">
                  {COMMON_PORTALS.map(p => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1 font-medium">Tipología Predeterminada</label>
                <input
                  type="text"
                  list="typology-suggestions"
                  value={batchDefaultTypology}
                  onChange={e => setBatchDefaultTypology(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-[#0F2C59]/20 focus:border-[#0F2C59] outline-none shadow-2xs"
                  placeholder="2 Dormitorios Tipo A"
                />
                <datalist id="typology-suggestions">
                  {COMMON_TYPOLOGIES.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              <div>
                <button
                  type="button"
                  onClick={applyBatchDefaultsToAll}
                  disabled={uploadItems.length === 0}
                  className="w-full px-3 py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-semibold border border-stone-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  ⚡ Aplicar a todos los ({uploadItems.length})
                </button>
              </div>
            </div>
          </div>

          {/* 3. ZONA DE ARRASTRE Y SOLTADO DE ARCHIVOS */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 hover:border-[#0F2C59] bg-white hover:bg-blue-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group shadow-xs"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-[#0F2C59] flex items-center justify-center mb-3 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-sm font-bold text-slate-800 group-hover:text-[#0F2C59] transition-colors">
              Haz clic o arrastra aquí todos los planos de la promoción
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Soporta múltiples archivos a la vez: imágenes (PNG, JPG, WebP) y planos vectoriales o escaneados (PDF).
            </p>
          </div>

          {/* 4. TABLA DE PLANOS A SUBIR */}
          {uploadItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Planos preparados para subir ({uploadItems.length})</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-slate-600 border border-stone-200">
                    {(uploadItems.reduce((acc, it) => acc + it.file.size, 0) / (1024 * 1024)).toFixed(1)} MB total
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearAllItems}
                  disabled={isUploading}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Eliminar todos
                </button>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                  {uploadItems.map((item, index) => {
                    const isPdf = item.file.name.toLowerCase().endsWith('.pdf');
                    return (
                      <div key={item.id} className="p-3.5 flex flex-col md:flex-row md:items-center gap-3 hover:bg-stone-50 transition-colors">
                        {/* Miniatura y nombre */}
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 overflow-hidden border border-stone-200">
                            {item.previewUrl ? (
                              <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : isPdf ? (
                              <span className="text-[10px] font-bold text-rose-600 uppercase">PDF</span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 uppercase">IMG</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate" title={item.file.name}>
                              {item.file.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {(item.file.size / 1024).toFixed(0)} KB • #{index + 1}
                            </div>
                          </div>
                        </div>

                        {/* Metadatos: Portal, Tipología, Vivienda */}
                        <div className="grid grid-cols-3 gap-2 shrink-0 md:w-auto w-full">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Portal</label>
                            <input
                              type="text"
                              disabled={isUploading || item.status === 'completed'}
                              value={item.portal}
                              onChange={e => updateItemField(item.id, 'portal', e.target.value)}
                              className="w-24 px-2 py-1 bg-white border border-stone-300 rounded text-xs text-slate-800 focus:border-[#0F2C59] outline-none shadow-2xs"
                              placeholder="Portal 1"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Tipología</label>
                            <input
                              type="text"
                              disabled={isUploading || item.status === 'completed'}
                              value={item.typology}
                              onChange={e => updateItemField(item.id, 'typology', e.target.value)}
                              className="w-36 px-2 py-1 bg-white border border-stone-300 rounded text-xs text-slate-800 focus:border-[#0F2C59] outline-none shadow-2xs"
                              placeholder="2D Tipo A"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Vivienda</label>
                            <input
                              type="text"
                              disabled={isUploading || item.status === 'completed'}
                              value={item.unit_identifier}
                              onChange={e => updateItemField(item.id, 'unit_identifier', e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-stone-300 rounded text-xs text-slate-800 focus:border-[#0F2C59] outline-none shadow-2xs"
                              placeholder="1º A"
                            />
                          </div>
                        </div>

                        {/* Estado y eliminación */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                          {item.status === 'uploading' && (
                            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold">
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                              <span>{item.progress}%</span>
                            </div>
                          )}

                          {item.status === 'completed' && (
                            <span className="flex items-center gap-1 text-emerald-700 text-xs font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Subido
                            </span>
                          )}

                          {item.status === 'error' && (
                            <span className="text-rose-600 text-xs truncate max-w-[120px] font-semibold" title={item.error}>
                              Error
                            </span>
                          )}

                          {item.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={isUploading}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Eliminar de la lista"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Resumen final tras subida */}
          {uploadSummary && (
            <div className={`p-4 rounded-xl text-sm ${uploadSummary.errors === 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              <div className="font-bold flex items-center gap-2">
                {uploadSummary.errors === 0 ? '🎉 ¡Subida masiva completada con éxito!' : '⚠️ Subida finalizada con avisos'}
              </div>
              <p className="mt-1 text-xs opacity-90">
                Se han subido correctamente <strong>{uploadSummary.success}</strong> planos a Supabase.
                {uploadSummary.errors > 0 && ` (${uploadSummary.errors} planos fallaron).`}
              </p>
            </div>
          )}
        </div>

        {/* Barra inferior de acciones Clara */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleStartUpload}
              disabled={isUploading || uploadItems.length === 0 || !selectedPromotionId}
              className="px-6 py-2.5 bg-[#0F2C59] hover:bg-[#16385e] disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Subiendo lote a Supabase...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Subir {uploadItems.length} {uploadItems.length === 1 ? 'plano' : 'planos'} a Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
