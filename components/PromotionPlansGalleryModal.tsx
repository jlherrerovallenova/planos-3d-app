import React, { useState, useEffect } from 'react';
import { Promotion, PromotionPlan } from '../types';
import {
  getPromotions,
  getPlansByPromotion,
  deletePlan,
  fetchPlanFileAsObject
} from '../services/promotionService';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface PromotionPlansGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (file: File, planInfo: PromotionPlan, promotionName: string) => void;
  onOpenBatchUpload: () => void;
  activePromotionId?: string;
}

export function PromotionPlansGalleryModal({
  isOpen,
  onClose,
  onSelectPlan,
  onOpenBatchUpload,
  activePromotionId
}: PromotionPlansGalleryModalProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>(activePromotionId || '');
  const [plans, setPlans] = useState<PromotionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [selectedPortalFilter, setSelectedPortalFilter] = useState<string>('all');
  const [selectedTypologyFilter, setSelectedTypologyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen && isSupabaseConfigured) {
      loadPromotions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPromoId) {
      loadPlans(selectedPromoId);
    } else {
      setPlans([]);
    }
  }, [selectedPromoId]);

  const loadPromotions = async () => {
    try {
      const data = await getPromotions();
      setPromotions(data);
      if (data.length > 0 && !selectedPromoId) {
        setSelectedPromoId(data[0].id);
      }
    } catch (err) {
      console.error('Error al cargar promociones:', err);
    }
  };

  const loadPlans = async (promoId: string) => {
    setIsLoading(true);
    try {
      const data = await getPlansByPromotion(promoId);
      setPlans(data);
    } catch (err) {
      console.error('Error al cargar planos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PromotionPlan) => {
    try {
      setLoadingPlanId(plan.id);
      const file = await fetchPlanFileAsObject(plan);
      const promo = promotions.find(p => p.id === plan.promotion_id);
      onSelectPlan(file, plan, promo ? promo.name : '');
      onClose();
    } catch (err: any) {
      alert(`Error al cargar el plano: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleDeletePlan = async (e: React.MouseEvent, plan: PromotionPlan) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar plano "${plan.original_filename}"?`)) return;

    try {
      await deletePlan(plan.id, plan.file_path);
      setPlans(prev => prev.filter(p => p.id !== plan.id));
    } catch (err: any) {
      alert(`Error al eliminar plano: ${err.message || 'Error'}`);
    }
  };

  // Filtrado
  const portalsList = Array.from(new Set(plans.map(p => p.portal))).filter(Boolean);
  const typologiesList = Array.from(new Set(plans.map(p => p.typology))).filter(Boolean);

  const filteredPlans = plans.filter(p => {
    if (selectedPortalFilter !== 'all' && p.portal !== selectedPortalFilter) return false;
    if (selectedTypologyFilter !== 'all' && p.typology !== selectedTypologyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.original_filename.toLowerCase().includes(q);
      const matchUnit = p.unit_identifier?.toLowerCase().includes(q);
      const matchPortal = p.portal.toLowerCase().includes(q);
      const matchTypology = p.typology.toLowerCase().includes(q);
      return matchName || matchUnit || matchPortal || matchTypology;
    }
    return true;
  });

  const activePromo = promotions.find(p => p.id === selectedPromoId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Planos de Promociones Inmobiliarias
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                  Biblioteca Supabase
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona cualquier plano almacenado en la nube para renderizarlo en 3D o editarlo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenBatchUpload();
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Subida Masiva</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Selector de Promoción */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Promoción</label>
            <select
              value={selectedPromoId}
              onChange={e => setSelectedPromoId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {promotions.length === 0 ? (
                <option value="">(Sin promociones)</option>
              ) : (
                promotions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Filtro Portal */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Portal</label>
            <select
              value={selectedPortalFilter}
              onChange={e => setSelectedPortalFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="all">Todos los portales</option>
              {portalsList.map(port => (
                <option key={port} value={port}>{port}</option>
              ))}
            </select>
          </div>

          {/* Filtro Tipología */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Tipología</label>
            <select
              value={selectedTypologyFilter}
              onChange={e => setSelectedTypologyFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="all">Todas las tipologías</option>
              {typologiesList.map(tip => (
                <option key={tip} value={tip}>{tip}</option>
              ))}
            </select>
          </div>

          {/* Buscador de texto */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Buscar por vivienda, nombre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Galería de Planos */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <p className="text-sm">Cargando planos de la promoción...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">No se han encontrado planos</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {plans.length === 0
                    ? `La promoción "${activePromo?.name || ''}" aún no tiene planos subidos.`
                    : 'Ningún plano coincide con los filtros seleccionados.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBatchUpload();
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Subir planos en lote ahora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPlans.map(plan => {
                const isPdf = plan.original_filename.toLowerCase().endsWith('.pdf');
                const isCurrentLoading = loadingPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => !isCurrentLoading && handleSelectPlan(plan)}
                    className="group relative bg-slate-950/80 border border-slate-800 hover:border-indigo-500/80 rounded-xl overflow-hidden shadow-lg hover:shadow-indigo-500/10 cursor-pointer transition-all flex flex-col"
                  >
                    {/* Contenedor de previsualización */}
                    <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center border-b border-slate-800">
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center text-slate-500 group-hover:text-rose-400 transition-colors">
                          <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[10px] font-bold tracking-wider">PLANO PDF</span>
                        </div>
                      ) : (
                        <img
                          src={plan.storage_url}
                          alt={plan.original_filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      )}

                      {/* Badges superiores */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-bold text-indigo-300 border border-indigo-500/30 backdrop-blur-xs">
                          {plan.portal}
                        </span>
                        {plan.unit_identifier && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/90 text-[10px] font-bold text-cyan-300 border border-cyan-500/30 backdrop-blur-xs">
                            {plan.unit_identifier}
                          </span>
                        )}
                      </div>

                      {/* Botón borrar */}
                      <button
                        type="button"
                        onClick={e => handleDeletePlan(e, plan)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar plano"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Indicador de carga al hacer clic */}
                      {isCurrentLoading && (
                        <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                          <svg className="w-6 h-6 animate-spin text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span className="text-xs font-medium">Abriendo en lienzo...</span>
                        </div>
                      )}
                    </div>

                    {/* Metadatos inferiores */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-white truncate" title={plan.original_filename}>
                          {plan.original_filename}
                        </div>
                        <div className="text-[11px] text-amber-300/90 font-medium mt-0.5 truncate">
                          {plan.typology}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {plan.file_size ? `${(plan.file_size / 1024).toFixed(0)} KB` : ''}
                        </span>
                        <span className="text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Cargar plano ➔
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <span>Mostrando {filteredPlans.length} de {plans.length} planos en "{activePromo?.name || 'Promoción'}"</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-slate-300 hover:text-white font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
