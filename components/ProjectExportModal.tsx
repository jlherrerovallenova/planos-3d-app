import React, { useState } from 'react';
import { RenderConfig, RenderHistoryItem } from '../types';
import {
  safeDownloadFile,
  downloadJsonConfig,
  exportCommercialBrochureImage
} from '../services/downloadHelper';

interface ProjectExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RenderConfig;
  currentPrompt: string;
  projectTitle?: string;
  renderedResult: { base64: string; mimeType: string } | null;
  history: RenderHistoryItem[];
}

export function ProjectExportModal({
  isOpen,
  onClose,
  config,
  currentPrompt,
  projectTitle = 'Proyecto Residencial Los Álamos',
  renderedResult,
  history
}: ProjectExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingFicha, setIsExportingFicha] = useState(false);

  if (!isOpen) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = (base64: string, mimeType: string, index?: number) => {
    const filename = `dollhouse_render_${index !== undefined ? index + 1 : 'final'}.png`;
    safeDownloadFile({ base64, mimeType, filename });
  };

  const handleDownloadFichaComercial = async () => {
    if (!renderedResult) return;
    setIsExportingFicha(true);
    await exportCommercialBrochureImage({
      imageSrc: `data:${renderedResult.mimeType};base64,${renderedResult.base64}`,
      projectTitle,
      markers: config.roomMarkers || [],
      filename: `ficha_comercial_${projectTitle.toLowerCase().replace(/[^\w]/g, '_')}.png`
    });
    setIsExportingFicha(false);
  };

  const handleDownloadConfigJson = () => {
    downloadJsonConfig(config, 'memoria_calidades_render3d.json');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-stone-800 flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="bg-[#1c1917] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-[#c25e38]">archive</span>
            <div>
              <h3 className="font-serif italic text-2xl text-stone-100 font-normal">
                Exportar Proyecto & Renders
              </h3>
              <p className="text-stone-400 text-xs mt-0.5">
                Descarga los activos del proyecto, la memoria de calidades o el historial de imágenes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition rounded-lg p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Opción 1: Descargar Render Actual */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#c25e38] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">image</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-stone-900">Render 3D Actual en Alta Resolución</h4>
                <p className="text-[11px] text-stone-500">
                  {renderedResult
                    ? 'Imagen generada lista para dossier de venta o catálogo comercial.'
                    : 'Aún no se ha generado ningún render en esta sesión.'}
                </p>
              </div>
            </div>
            <button
              disabled={!renderedResult}
              onClick={() => renderedResult && handleDownloadImage(renderedResult.base64, renderedResult.mimeType)}
              className="px-4 py-2 rounded-xl bg-[#c25e38] hover:bg-[#a84d2b] disabled:opacity-40 text-white text-xs font-semibold transition shrink-0 flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Descargar PNG</span>
            </button>
          </div>

          {/* Opción 1.5: Descargar Ficha Comercial Completa (Plano + Cuadro de Superficies) */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs"
                style={{ backgroundColor: '#0F2C59' }}
              >
                <span className="material-symbols-outlined text-[22px]">description</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-stone-900">
                    Ficha Comercial de Venta (Plano + Superficies Útiles)
                  </h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    4K Editorial
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Genera la lámina comercial completa con el plano amueblado y el Cuadro de Superficies Útiles oficial en azul marino.
                </p>
              </div>
            </div>
            <button
              disabled={!renderedResult || isExportingFicha}
              onClick={handleDownloadFichaComercial}
              className="px-4 py-2 rounded-xl text-white text-xs font-semibold transition shrink-0 flex items-center gap-1.5 shadow-xs disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: '#0F2C59' }}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isExportingFicha ? 'progress_activity' : 'download'}
              </span>
              <span>{isExportingFicha ? 'Generando...' : 'Descargar Ficha'}</span>
            </button>
          </div>

          {/* Opción 2: Descargar Memoria de Calidades en JSON */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">data_object</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-stone-900">Configuración Completa del Proyecto (.json)</h4>
                <p className="text-[11px] text-stone-500">
                  Exporta suelos, acabados, ventanas, puertas y las coordenadas de las estancias marcadas.
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadConfigJson}
              className="px-4 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition shrink-0 flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Guardar JSON</span>
            </button>
          </div>

          {/* Opción 3: Prompt Arquitectónico */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">terminal</span>
                <span>Prompt Arquitectónico Compilado</span>
              </label>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-stone-300 hover:bg-stone-100 rounded-lg text-stone-700 transition flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={3}
              value={currentPrompt}
              className="w-full text-[11px] font-mono text-stone-700 bg-white border border-stone-200 rounded-lg p-2.5 resize-none focus:outline-none"
            />
          </div>

          {/* Historial de Renders de la Sesión */}
          {history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-200">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">history</span>
                <span>Historial de Renders de la Sesión ({history.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {history.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-1.5 rounded-xl border border-stone-200 bg-white space-y-1.5 group"
                  >
                    <img
                      src={`data:${item.mimeType};base64,${item.base64}`}
                      alt={`Render ${idx + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-stone-100"
                    />
                    <div className="flex items-center justify-between text-[10px] text-stone-500">
                      <span>#{idx + 1}</span>
                      <button
                        onClick={() => handleDownloadImage(item.base64, item.mimeType, idx)}
                        className="text-[#c25e38] hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[13px]">download</span>
                        <span>Bajar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium transition shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectExportModal;
