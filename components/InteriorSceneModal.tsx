import React from 'react';
import { InteriorScene } from '../types';
import { ROOM_CATEGORIES } from '../constants';
import { safeDownloadFile } from '../services/downloadHelper';

interface InteriorSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: InteriorScene | null;
  allScenes: InteriorScene[];
  onSelectScene: (scene: InteriorScene) => void;
  onRegenerateScene: (roomId: string) => void;
  isRegenerating?: boolean;
}

export function InteriorSceneModal({
  isOpen,
  onClose,
  scene,
  allScenes,
  onSelectScene,
  onRegenerateScene,
  isRegenerating = false
}: InteriorSceneModalProps) {
  if (!isOpen || !scene) return null;

  const catInfo = ROOM_CATEGORIES.find((c) => c.id === scene.roomCategory);

  const handleDownload = () => {
    const filename = `Interior_${scene.roomName.replace(/\s+/g, '_')}_${scene.id.slice(-4)}.jpg`;
    safeDownloadFile({
      base64: scene.base64,
      filename,
      mimeType: scene.mimeType || 'image/jpeg'
    });
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-5xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between gap-3 bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
              style={{ backgroundColor: catInfo?.color || '#D97706' }}
            >
              #{scene.roomIndex + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate tracking-tight">
                  {scene.roomName}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[11px] font-medium shrink-0">
                  {catInfo?.label || scene.roomCategory}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-800/60 text-[10px] font-semibold uppercase tracking-wider shrink-0">
                  Vista Interior 3D
                </span>
              </div>
              <p className="text-xs text-stone-400 truncate">
                Perspectiva en primera persona a pie de estancia • {scene.engineUsed ? `Motor: ${scene.engineUsed.replace('gemini-', '')}` : 'Gemini AI'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isRegenerating}
              onClick={() => onRegenerateScene(scene.roomId)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Generar otra toma o variación de esta habitación"
            >
              <span className={`material-symbols-outlined text-[16px] ${isRegenerating ? 'animate-spin' : ''}`}>
                autorenew
              </span>
              <span className="hidden sm:inline">{isRegenerating ? 'Generando...' : 'Re-generar'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Descargar fotografía de la habitación"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Descargar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer ml-1"
              aria-label="Cerrar modal"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Imagen principal */}
        <div className="flex-1 min-h-0 bg-black/90 flex items-center justify-center p-3 sm:p-5 relative overflow-hidden">
          {isRegenerating ? (
            <div className="flex flex-col items-center justify-center gap-3 text-stone-300">
              <span className="material-symbols-outlined text-4xl animate-spin text-blue-500">
                autorenew
              </span>
              <p className="text-sm font-semibold">Generando nueva perspectiva interior...</p>
              <p className="text-xs text-stone-500">Fotografiando {scene.roomName} a pie de habitación</p>
            </div>
          ) : (
            <img
              src={`data:${scene.mimeType};base64,${scene.base64}`}
              alt={`Vista interior de ${scene.roomName}`}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border border-stone-800/80"
            />
          )}
        </div>

        {/* Tira inferior de miniaturas si hay más estancias generadas */}
        {allScenes.length > 1 && (
          <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center gap-2.5 overflow-x-auto hide-scrollbar shrink-0">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider shrink-0 pr-1">
              Galería Interiores ({allScenes.length}):
            </span>
            {allScenes.map((s) => {
              const isActive = s.id === scene.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectScene(s)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl border transition shrink-0 cursor-pointer text-left ${
                    isActive
                      ? 'border-blue-500 bg-blue-950/40 shadow-xs'
                      : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                  }`}
                >
                  <img
                    src={`data:${s.mimeType};base64,${s.base64}`}
                    alt={s.roomName}
                    className="w-12 h-9 object-cover rounded-lg border border-stone-700/60"
                  />
                  <div className="pr-1">
                    <p className="text-[11px] font-semibold text-stone-200 truncate max-w-[120px]">
                      {s.roomName}
                    </p>
                    <span className="text-[9px] text-stone-400 font-mono">
                      #{s.roomIndex + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
