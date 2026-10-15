import React, { useState, useEffect, useRef } from 'react';
import { RoomMarker } from '../types';
import { parseTargetedRoomFromText } from '../services/promptBuilder';

interface CorrectionCommandBarProps {
  roomMarkers: RoomMarker[];
  activeMarkerId: string | null;
  onApplyCorrection: (instruction: string) => Promise<void>;
  isGenerating: boolean;
  hasRender: boolean;
  currentVersion: number;
  onUndoToPreviousVersion?: () => void;
  canUndo?: boolean;
  externalPrefillText?: string | null;
  onClearPrefill?: () => void;
}

export function CorrectionCommandBar({
  roomMarkers,
  activeMarkerId,
  onApplyCorrection,
  isGenerating,
  hasRender,
  currentVersion = 1,
  onUndoToPreviousVersion,
  canUndo = false,
  externalPrefillText,
  onClearPrefill
}: CorrectionCommandBarProps) {
  const [commandText, setCommandText] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Escuchar prellenado externo (por ejemplo, al hacer clic en un pin de estancia)
  useEffect(() => {
    if (externalPrefillText) {
      setCommandText(externalPrefillText);
      setIsExpanded(true);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      if (onClearPrefill) onClearPrefill();
      return () => clearTimeout(timer);
    }
  }, [externalPrefillText, onClearPrefill]);

  // Si hay un marcador activo seleccionado en la interfaz, pre-enfocar ayuda
  const activeMarker = roomMarkers.find((m) => m.id === activeMarkerId);
  const activeMarkerIdx = activeMarker ? roomMarkers.indexOf(activeMarker) : -1;

  // Analizar en tiempo real si el usuario menciona alguna estancia
  const detection = parseTargetedRoomFromText(commandText, roomMarkers);

  const isBusy = isGenerating || isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = commandText.trim();
    if (!textToSubmit || isBusy) return;

    try {
      setIsSubmitting(true);
      setFeedbackMessage(null);
      await onApplyCorrection(textToSubmit);
      setCommandText('');
      setFeedbackMessage(`✓ Modificación aplicada con éxito en la versión v${currentVersion + 1}`);
      setTimeout(() => setFeedbackMessage(null), 4500);
    } catch {
      // Mantiene el texto en caso de error para que el usuario no lo pierda
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChipClick = (snippet: string) => {
    if (!commandText.trim()) {
      setCommandText(snippet);
    } else {
      setCommandText((prev) => `${prev.trim()}, ${snippet}`);
    }
    inputRef.current?.focus();
  };

  const handleRoomChipClick = (roomNum: number, roomName: string) => {
    setCommandText(`Estancia ${roomNum} (${roomName}): `);
    inputRef.current?.focus();
  };

  // Sugerencias rápidas contextualmente inteligentes
  const quickSuggestions = [
    'suelo de parquet en espiga',
    'suelo de microcemento continuo',
    'cocina: solo vitrocerámica y fregadero (resto encimera)',
    'cambiar a cama doble 160cm',
    'paredes en blanco roto',
    'ducha de obra con mampara de cristal'
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-3xl transition-all duration-200">
      <div className="bg-stone-950/95 backdrop-blur-xl border border-stone-700/80 rounded-2xl shadow-2xl p-2.5 sm:p-3 text-white">
        {/* Cabecera de la barra de comandos */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-gradient-to-tr from-[#c25e38] to-amber-500 text-white shadow-xs">
              <span className="material-symbols-outlined text-[14px]">terminal</span>
            </span>
            <span className="font-bold text-stone-200 tracking-wide">
              Terminal de Corrección IA
            </span>
            <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-mono text-[10px] font-bold border border-stone-700">
              v{currentVersion}
            </span>

            {/* Chip de detección de estancia en tiempo real */}
            {detection.matchedMarker && typeof detection.roomIndex === 'number' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-500/50 text-blue-300 text-[10px] font-semibold animate-fadeIn">
                <span className="material-symbols-outlined text-[12px] text-blue-400">room</span>
                <span>Objetivo: #{detection.roomIndex + 1} ({detection.matchedMarker.name})</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {canUndo && onUndoToPreviousVersion && (
              <button
                type="button"
                onClick={onUndoToPreviousVersion}
                disabled={isBusy}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border border-stone-700"
                title="Deshacer y volver a la versión anterior"
              >
                <span className="material-symbols-outlined text-[14px]">undo</span>
                <span>Deshacer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
              title={isExpanded ? 'Minimizar terminal' : 'Expandir terminal'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isExpanded ? 'expand_more' : 'expand_less'}
              </span>
            </button>
          </div>
        </div>

        {/* Input de comandos */}
        {isExpanded && (
          <form onSubmit={handleSubmit} className="space-y-2">
            {feedbackMessage && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/70 border border-emerald-500/40 rounded-lg text-[11px] text-emerald-300 font-medium animate-fadeIn">
                <span className="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
                <span>{feedbackMessage}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-stone-900/90 rounded-xl px-3 py-1.5 border border-stone-700 focus-within:border-[#c25e38] transition-all">
              <span className="text-[#c25e38] font-mono font-bold text-sm select-none">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder={
                  isBusy
                    ? 'Aplicando modificación con IA sobre el render...'
                    : activeMarker
                    ? `Ej: El suelo de la estancia ${activeMarkerIdx + 1} es de parquet, o cambia mobiliario...`
                    : 'Ej: El suelo de la estancia 8 es de parquet, o añade isla en cocina...'
                }
                className="w-full bg-transparent text-white text-xs placeholder:text-stone-500 focus:outline-none disabled:opacity-50"
                disabled={isBusy}
              />

              {commandText && !isBusy && (
                <button
                  type="button"
                  onClick={() => setCommandText('')}
                  aria-label="Limpiar texto de corrección"
                  className="text-stone-500 hover:text-stone-300 text-xs px-1"
                >
                  ✕
                </button>
              )}

              <button
                type="submit"
                disabled={isBusy || !commandText.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-[#c25e38] hover:bg-[#a84d2b] disabled:opacity-40 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                title="Aplicar corrección puntual sobre el render actual con Gemini"
              >
                <span className={`material-symbols-outlined text-[14px] ${isBusy ? 'animate-spin' : ''}`}>
                  {isBusy ? 'autorenew' : 'auto_fix_high'}
                </span>
                <span>{isBusy ? 'Corrigiendo...' : 'Corregir'}</span>
              </button>
            </div>

            {/* Píldoras de estancias y sugerencias rápidas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              <span className="text-stone-500 shrink-0 text-[10px] font-semibold uppercase">
                Estancias:
              </span>
              {roomMarkers.slice(0, 8).map((m, idx) => (
                <button
                  key={m.id || m.name}
                  type="button"
                  onClick={() => handleRoomChipClick(idx + 1, m.name)}
                  className="px-2.5 py-0.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 shrink-0 transition cursor-pointer"
                >
                  #{idx + 1} {m.name}
                </button>
              ))}

              <span className="text-stone-600 shrink-0">|</span>

              <span className="text-stone-500 shrink-0 text-[10px] font-semibold uppercase">
                Ajustes:
              </span>
              {quickSuggestions.slice(0, 3).map((snippet) => (
                <button
                  key={snippet}
                  type="button"
                  onClick={() => handleChipClick(snippet)}
                  className="px-2.5 py-0.5 rounded-md bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-amber-300 border border-stone-800 shrink-0 transition cursor-pointer"
                >
                  + {snippet}
                </button>
              ))}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CorrectionCommandBar;
