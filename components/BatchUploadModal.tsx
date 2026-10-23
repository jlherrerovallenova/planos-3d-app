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
      setNewPromoName('');
      setNewPromoAddress('');
      setNewPromoDeveloper('');
      setShowNewPromoForm(false);
    } catch (err: any) {
      alert(`No se pudo crear la promoción: ${err.message || 'Error'}`);
    } finally {
      setIsCreatingPromo(false);
    }
  };

  // Agregar archivos a la cola
  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: BatchUploadPlanItem[] = Array.from(files)
      .filter(file => {
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        const isImg = file.type.startsWith('image/');
        return isPdf || isImg;
      })
      .map(file => {
        // Tratar de deducir automáticamente portal y tipología si están en el nombre del archivo
        const fname = file.name.toLowerCase();
        let guessedPortal = batchDefaultPortal;
        let guessedTypology = batchDefaultTypology;
        let guessedUnit = '';

        // Detección simple de portal (p1, portal 1, port 2, etc.)
        const portalMatch = fname.match(/portal[\s_-]?([0-9a-z]+)/i) || fname.match(/\bp([0-9a-z])\b/i);
        if (portalMatch) {
          guessedPortal = `Portal ${portalMatch[1].toUpperCase()}`;
        }

        // Detección de tipología (ej: 2d, 3d, atico, duplex)
        if (fname.includes('atico') || fname.includes('ático')) {
          guessedTypology = 'Ático con Terraza';
        } else if (fname.includes('duplex') || fname.includes('dúplex')) {
          guessedTypology = 'Dúplex';
        } else if (fname.includes('3d') || fname.includes('3 dorm') || fname.includes('3 hab')) {
          guessedTypology = '3 Dormitorios Tipo A';
        } else if (fname.includes('2d') || fname.includes('2 dorm') || fname.includes('2 hab')) {
          guessedTypology = '2 Dormitorios Tipo A';
        } else if (fname.includes('1d') || fname.includes('1 dorm') || fname.includes('estudio')) {
          guessedTypology = '1 Dormitorio';
        }

        // Detección de vivienda (ej: 1A, 2-B, bajo C)
        const unitMatch = fname.match(/\b([0-9]+[ºª]?[a-z]|bajo[\s_-]?[a-z]|atico[\s_-]?[a-z])\b/i);
        if (unitMatch) {
          guessedUnit = unitMatch[1].toUpperCase();
        }

        return {
          id: `${file.name}-${file.size}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          portal: guessedPortal,
          typology: guessedTypology,
          unit_identifier: guessedUnit,
          status: 'pending',
          progress: 0,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        };
      });

    setUploadItems(prev => [...prev, ...newItems]);
    setUploadSummary(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      e.target.value = '';
    }
  };

  // Aplicar portal y tipología por defecto a todos los elementos seleccionados
  const applyBatchDefaultsToAll = () => {
    setUploadItems(prev =>
      prev.map(item => ({
        ...item,
        portal: batchDefaultPortal,
        typology: batchDefaultTypology
      }))
    );
  };

  // Actualizar campo individual de un archivo
  const updateItemField = (id: string, field: 'portal' | 'typology' | 'unit_identifier', value: string) => {
    setUploadItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Eliminar elemento de la cola
  const removeItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  // Limpiar todos
  const clearAllItems = () => {
    setUploadItems([]);
    setUploadSummary(null);
  };

  // Ejecutar subida masiva
  const handleStartUpload = async () => {
    if (!selectedPromotionId) {
      alert('Por favor selecciona o crea una promoción primero.');
      return;
    }
    if (uploadItems.length === 0) {
      alert('Por favor añade al menos un plano a la lista.');
      return;
    }

    setIsUploading(true);
    setUploadSummary(null);

    const { successCount, errorCount } = await processBatchUpload(
      selectedPromotionId,
      uploadItems,
      (id, updates) => {
        setUploadItems(prev =>
          prev.map(item => (item.id === id ? { ...item, ...updates } : item))
        );
      }
    );

    setIsUploading(false);
    setUploadSummary({ success: successCount, errors: errorCount });

    if (successCount > 0 && onUploadComplete) {
      onUploadComplete(selectedPromotionId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Subida Masiva de Planos por Promoción
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  Supabase Cloud
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Organiza todos los planos de una promoción indicando portal, tipología e identificador de vivienda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Advertencia si no existen tablas o error de Supabase */}
          {promotionsError && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-amber-300">Tablas de base de datos pendientes en Supabase</div>
                <p className="mt-1 text-xs text-amber-200/80">{promotionsError}</p>
                <button
                  type="button"
                  onClick={() => setShowSqlGuide(!showSqlGuide)}
                  className="mt-2 text-xs font-semibold underline text-amber-300 hover:text-white"
                >
                  {showSqlGuide ? 'Ocultar script SQL' : '👉 Ver script SQL listo para ejecutar en Supabase (1 clic)'}
                </button>
              </div>
            </div>
          )}

          {/* Guía SQL desplegable */}
          {showSqlGuide && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Instrucciones para Supabase:</span>
                <span className="text-slate-400">Archivo: <code className="text-indigo-400">supabase-schema.sql</code></span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Ve a tu proyecto en <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-400 underline">supabase.com/dashboard</a></li>
                <li>Haz clic en la pestaña <strong>SQL Editor</strong> en la barra lateral izquierda.</li>
                <li>Haz clic en <strong>New Query</strong>, pega el contenido del archivo <code className="text-indigo-300">supabase-schema.sql</code> que hemos creado y dale al botón verde <strong>Run</strong>.</li>
                <li>Vuelve aquí y pulsa "Reintentar conexión".</li>
              </ol>
              <button
                type="button"
                onClick={loadPromotionsList}
                className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs transition-colors"
              >
                🔄 Reintentar conexión con Supabase
              </button>
            </div>
          )}

          {/* 1. SELECCIÓN O CREACIÓN DE PROMOCIÓN */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
                Promoción Inmobiliaria de Destino
              </label>
              <button
                type="button"
                onClick={() => setShowNewPromoForm(!showNewPromoForm)}
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5 font-medium"
              >
                {showNewPromoForm ? 'Cancelar nueva promoción' : '+ Crear Nueva Promoción'}
              </button>
            </div>

            {/* Formulario desplegable para nueva promoción */}
            {showNewPromoForm ? (
              <form onSubmit={handleCreatePromotion} className="p-4 bg-slate-900/90 rounded-xl border border-indigo-500/40 space-y-3 animate-fadeIn">
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Alta de Nueva Promoción
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 font-medium">Nombre de la Promoción *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Residencial Los Olivos"
                      value={newPromoName}
                      onChange={e => setNewPromoName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 font-medium">Ubicación / Dirección</label>
                    <input
                      type="text"
                      placeholder="Ej: Calle Gran Vía 12, Madrid"
                      value={newPromoAddress}
                      onChange={e => setNewPromoAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1 font-medium">Promotora / Comercializadora</label>
                    <input
                      type="text"
                      placeholder="Ej: Inmobiliaria Habitat"
                      value={newPromoDeveloper}
                      onChange={e => setNewPromoDeveloper(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewPromoForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPromo || !newPromoName.trim()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
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
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                  className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <svg className={`w-4 h-4 ${isLoadingPromotions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* 2. VALORES POR DEFECTO PARA APLICACIÓN RÁPIDA EN LOTE */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
                Valores Predeterminados para este Lote
              </label>
              <span className="text-xs text-slate-400">Podrás cambiarlos individualmente en cada plano abajo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Portal Predeterminado</label>
                <input
                  type="text"
                  list="portal-suggestions"
                  value={batchDefaultPortal}
                  onChange={e => setBatchDefaultPortal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Portal 1"
                />
                <datalist id="portal-suggestions">
                  {COMMON_PORTALS.map(p => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">Tipología Predeterminada</label>
                <input
                  type="text"
                  list="typology-suggestions"
                  value={batchDefaultTypology}
                  onChange={e => setBatchDefaultTypology(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full px-3 py-2 bg-slate-700/60 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-medium border border-slate-600 transition-colors flex items-center justify-center gap-1.5"
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
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-950/70 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 flex items-center justify-center mb-3 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Haz clic o arrastra aquí todos los planos de la promoción
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Soporta múltiples archivos a la vez: imágenes (PNG, JPG, WebP) y planos vectoriales o escaneados (PDF).
            </p>
          </div>

          {/* 4. TABLA DE PLANOS A SUBIR */}
          {uploadItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Planos preparados para subir ({uploadItems.length})</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {(uploadItems.reduce((acc, it) => acc + it.file.size, 0) / (1024 * 1024)).toFixed(1)} MB total
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearAllItems}
                  disabled={isUploading}
                  className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-colors"
                >
                  Eliminar todos
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-inner">
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                  {uploadItems.map((item, index) => {
                    const isPdf = item.file.name.toLowerCase().endsWith('.pdf');
                    return (
                      <div key={item.id} className="p-3.5 flex flex-col md:flex-row md:items-center gap-3 hover:bg-slate-800/20 transition-colors">
                        {/* Miniatura y nombre */}
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-700">
                            {item.previewUrl ? (
                              <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : isPdf ? (
                              <span className="text-[10px] font-bold text-rose-400 uppercase">PDF</span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase">IMG</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white truncate" title={item.file.name}>
                              {item.file.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {(item.file.size / 1024).toFixed(0)} KB • #{index + 1}
                            </div>
                          </div>
                        </div>

                        {/* Metadatos: Portal, Tipología, Vivienda */}
                        <div className="grid grid-cols-3 gap-2 shrink-0 md:w-auto w-full">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Portal</label>
                            <input
                              type="text"
                              disabled={isUploading || item.status === 'completed'}
                              value={item.portal}
                              onChange={e => updateItemField(item.id, 'portal', e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:border-indigo-500 outline-none"
                              placeholder="Portal 1"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Tipología</label>
                            <input
                              type="text"
                              disabled={isUploading || item.status === 'completed'}
                              value={item.typology}
                              onChange={e => updateItemField(item.id, 'typology', e.target.value)}
                              className="w-36 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:border-indigo-500 outline-none"
                              placeholder="2D Tipo A"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Vivienda</label>
                            <input
                              type="text"
                              disabled={isUploading || item.status === 'completed'}
                              value={item.unit_identifier}
                              onChange={e => updateItemField(item.id, 'unit_identifier', e.target.value)}
                              className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:border-indigo-500 outline-none"
                              placeholder="1º A"
                            />
                          </div>
                        </div>

                        {/* Estado y eliminación */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                          {item.status === 'uploading' && (
                            <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium">
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                              <span>{item.progress}%</span>
                            </div>
                          )}

                          {item.status === 'completed' && (
                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Subido
                            </span>
                          )}

                          {item.status === 'error' && (
                            <span className="text-rose-400 text-xs truncate max-w-[120px]" title={item.error}>
                              Error
                            </span>
                          )}

                          {item.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={isUploading}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
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
            <div className={`p-4 rounded-xl text-sm ${uploadSummary.errors === 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'}`}>
              <div className="font-semibold flex items-center gap-2">
                {uploadSummary.errors === 0 ? '🎉 ¡Subida masiva completada con éxito!' : '⚠️ Subida finalizada con avisos'}
              </div>
              <p className="mt-1 text-xs opacity-90">
                Se han subido correctamente <strong>{uploadSummary.success}</strong> planos a Supabase.
                {uploadSummary.errors > 0 && ` (${uploadSummary.errors} planos fallaron).`}
              </p>
            </div>
          )}
        </div>

        {/* Barra inferior de acciones */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleStartUpload}
              disabled={isUploading || uploadItems.length === 0 || !selectedPromotionId}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
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
