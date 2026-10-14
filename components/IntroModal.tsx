import React from 'react';
interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export function IntroModal({ isOpen, onClose }: IntroModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Banner superior arquitectónico */}
        <div className="bg-[#1c1917] text-white p-6 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#c25e38] text-white">
              <span className="material-symbols-outlined text-[14px]">view_in_ar</span>
              Arquitectura & Visualización Inmobiliaria
            </span>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white transition-colors rounded-lg p-1"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <h2 className="font-serif italic text-3xl text-stone-100 font-normal">
            Estudio de Planos 3D
          </h2>
          <p className="text-stone-300 text-sm mt-1">
            Transforma planos comerciales en 2D en espectaculares maquetas seccionadas 3D para catálogos y dossieres de venta.
          </p>
        </div>
        {/* Contenido / Pasos */}
        <div className="p-6 space-y-4 text-stone-700 text-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-[#c25e38] font-bold text-xs flex items-center justify-center shrink-0">
              01
            </div>
            <div>
              <p className="font-semibold text-stone-900">Sube el plano arquitectónico</p>
              <p className="text-stone-500 text-xs mt-0.5">
                Carga el plano 2D en JPG/PNG desde tu galería o genera una muestra guiada para probar el flujo.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-[#c25e38] font-bold text-xs flex items-center justify-center shrink-0">
              02
            </div>
            <div>
              <p className="font-semibold text-stone-900">Elige estilo decorativo y ángulo</p>
              <p className="text-stone-500 text-xs mt-0.5">
                Selecciona entre cortes isométricos 45° tipo maqueta o cenitales 90°, maderas de roble, estilo nórdico, japandi o contemporáneo.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-[#c25e38] font-bold text-xs flex items-center justify-center shrink-0">
              03
            </div>
            <div>
              <p className="font-semibold text-stone-900">Genera el render de alta fidelidad</p>
              <p className="text-stone-500 text-xs mt-0.5">
                La IA eleva tabiques digitalmente, amuebla estancias (cocina con isla, dormitorios, sofás) y añade iluminación volumétrica.
              </p>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 px-6 flex items-center justify-between">
          <span className="text-xs text-stone-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
            Listo para renders comerciales
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#c25e38] hover:bg-[#a84d2b] text-white font-medium text-sm transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
          >
            <span>Comenzar a Estilizar</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}