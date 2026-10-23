import React, { useState, useRef, useEffect } from 'react';
import { RoomMarker, DefectMark, FurnitureItem, FurnitureType } from '../../types';

interface TabAmueblarProps {
  currentVersion: number;
  roomMarkers: RoomMarker[];
  furnitureItems: FurnitureItem[];
  selectedFurnitureId: string | null;
  onSelectFurniture: (id: string | null) => void;
  onUpdateFurniture: (id: string, updates: Partial<FurnitureItem>) => void;
  onDeleteFurniture: (id: string) => void;
  onAddFurniture: (item: Omit<FurnitureItem, 'id'>) => void;
  onApplyCorrection: (instruction: string, defectMark?: DefectMark | null, maskBase64?: string | null) => Promise<void>;
  isGenerating: boolean;
  hasRender: boolean;
  isPaintingMode: boolean;
  onTogglePaintingMode: () => void;
  strokeCount: number;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  onClearStrokes: () => void;
  onViewPromptModal: () => void;
  activeDefectMark?: DefectMark | null;
  onClearDefectMark?: () => void;
  externalPrefillText?: string | null;
  onClearPrefill?: () => void;
}

export function TabAmueblar({
  currentVersion = 2,
  roomMarkers,
  furnitureItems,
  selectedFurnitureId,
  onSelectFurniture,
  onUpdateFurniture,
  onDeleteFurniture,
  onAddFurniture,
  onApplyCorrection,
  isGenerating,
  hasRender,
  isPaintingMode,
  onTogglePaintingMode,
  strokeCount = 0,
  brushSize = 25,
  onChangeBrushSize,
  onClearStrokes,
  onViewPromptModal,
  activeDefectMark,
  onClearDefectMark,
  externalPrefillText,
  onClearPrefill
}: TabAmueblarProps) {
  const [instructionText, setInstructionText] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Escuchar prellenado automático cuando el usuario hace clic en el plano o pinta
  useEffect(() => {
    if (externalPrefillText) {
      setInstructionText((prev) => {
        if (!prev.trim()) return externalPrefillText;
        return `${externalPrefillText} ${prev}`;
      });
      setTimeout(() => textareaRef.current?.focus(), 50);
      if (onClearPrefill) onClearPrefill();
    }
  }, [externalPrefillText, onClearPrefill]);

  // Pastillas de sugerencias rápidas
  const quickSuggestions = [
    'Cambia el sofá por uno rinconera',
    'El suelo de la estancia 3 es parquet en espiga',
    'Gira la cama del dormitorio 1 hacia la ventana',
    'Añade una isla en la cocina si cabe',
    'Pon un escritorio en el dormitorio 3'
  ];

  const handleSuggestionClick = (text: string) => {
    setInstructionText(text);
    textareaRef.current?.focus();
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!instructionText.trim() || isGenerating) return;
    await onApplyCorrection(instructionText.trim(), activeDefectMark);
    setInstructionText('');
    if (onClearDefectMark) onClearDefectMark();
    if (onClearStrokes) onClearStrokes();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  // Plantillas de muebles para añadir rápido
  const furnitureTemplates: { name: string; type: FurnitureType; w: number; d: number }[] = [
    { name: 'Sofá 3 plazas', type: 'sofa', w: 2.2, d: 0.9 },
    { name: 'Sofá rinconera', type: 'corner_sofa', w: 2.8, d: 1.8 },
    { name: 'Mesa de comedor', type: 'dining_table', w: 1.6, d: 0.9 },
    { name: 'Mesa de centro', type: 'coffee_table', w: 1.1, d: 0.6 },
    { name: 'Mueble TV', type: 'tv_unit', w: 1.8, d: 0.4 },
    { name: 'Cama doble', type: 'bed_double', w: 1.6, d: 2.0 },
    { name: 'Cama individual', type: 'bed_single', w: 0.9, d: 1.9 },
    { name: 'Mesilla de noche', type: 'nightstand', w: 0.45, d: 0.4 },
    { name: 'Isla de cocina', type: 'kitchen_island', w: 1.4, d: 0.9 },
    { name: 'Bancada lineal', type: 'kitchen_counter', w: 3.5, d: 0.6 },
    { name: 'Escritorio', type: 'desk', w: 1.2, d: 0.6 },
    { name: 'Armario empotrado', type: 'wardrobe', w: 2.4, d: 0.6 },
    { name: 'Alfombra', type: 'rug', w: 2.4, d: 1.7 },
    { name: 'Planta decorativa', type: 'plant', w: 0.5, d: 0.5 }
  ];

  const handleQuickAddFurniture = (tpl: typeof furnitureTemplates[0]) => {
    // Si hay una estancia seleccionada o la primera
    const targetRoom = roomMarkers[0];
    onAddFurniture({
      name: tpl.name,
      type: tpl.type,
      roomId: targetRoom?.id,
      roomName: targetRoom ? targetRoom.name : 'Vivienda',
      roomIndex: 0,
      x: targetRoom ? targetRoom.x : 50,
      y: targetRoom ? targetRoom.y : 50,
      widthMeters: tpl.w,
      depthMeters: tpl.d,
      rotation: 0
    });
    setIsAddMenuOpen(false);
  };

  // Agrupar muebles por estancia
  const groupedFurniture = React.useMemo(() => {
    const groups: { [key: string]: FurnitureItem[] } = {};
    furnitureItems.forEach((item) => {
      const key = item.roomName || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [furnitureItems]);

  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto max-h-full font-sans text-slate-800">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Amueblar</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Distribución con IA, cambios y edición interactiva del mobiliario.
        </p>
      </div>

      {/* Enlace ver encargo */}
      <div className="text-xs flex items-center justify-between">
        <span className="text-slate-400">Cámbialo en Ajustes.</span>
        <button
          onClick={onViewPromptModal}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        >
          Ver el encargo enviado en v{currentVersion}
        </button>
      </div>

      {/* Pedir cambios sobre versión */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-800 block">
          Pedir cambios sobre v{currentVersion}
        </label>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={3}
          value={instructionText}
          onChange={(e) => setInstructionText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe el cambio. Puedes citar estancias por número: «el suelo de la estancia 3 es parquet en espiga»."
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs resize-none"
        />

        {/* Pastillas de sugerencias rápidas */}
        <div className="flex flex-wrap gap-1.5">
          {quickSuggestions.map((sugg, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(sugg)}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-600 rounded-full text-[11px] font-medium transition cursor-pointer shadow-2xs text-left"
            >
              {sugg}
            </button>
          ))}
        </div>

        {/* Zona a cambiar / Señalar Error */}
        <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-rose-500">edit_location_alt</span>
                <span>Zona con error / A modificar</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {strokeCount > 0
                  ? `${strokeCount} trazo(s) pintado(s). `
                  : activeDefectMark
                  ? `Punto señalado en ${activeDefectMark.roomName || 'el plano'}. `
                  : 'Pinta o pon un pin sobre el fallo en el plano.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onTogglePaintingMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isPaintingMode
                  ? 'bg-rose-600 text-white animate-pulse'
                  : activeDefectMark || strokeCount > 0
                  ? 'bg-rose-50 border border-rose-300 text-rose-700'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">draw</span>
              <span>{isPaintingMode ? 'Marcando...' : 'Marcar en plano'}</span>
            </button>
          </div>

          {/* Si hay error marcado o trazos, mostrar indicador con botón limpiar */}
          {(activeDefectMark || strokeCount > 0) && (
            <div className="flex items-center justify-between p-2 bg-rose-50/80 border border-rose-200 rounded-lg text-[11px] text-rose-800">
              <span className="font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-rose-600">check_circle</span>
                <span>
                  {activeDefectMark
                    ? `Fallo indicado en ${activeDefectMark.roomName || 'coordenadas marcadas'}`
                    : `${strokeCount} zona(s) pintada(s)`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onClearDefectMark) onClearDefectMark();
                  if (onClearStrokes) onClearStrokes();
                }}
                className="text-rose-600 hover:text-rose-900 font-bold ml-2 underline cursor-pointer"
              >
                Quitar marca
              </button>
            </div>
          )}

          {/* Slider de pincel */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60">
            <span className="text-[11px] font-semibold text-slate-600 shrink-0">Grosor</span>
            <input
              type="range"
              min={10}
              max={60}
              value={brushSize}
              onChange={(e) => onChangeBrushSize(parseInt(e.target.value))}
              className="flex-1 accent-rose-500 h-1 bg-slate-200 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => {
                onClearStrokes();
                if (onClearDefectMark) onClearDefectMark();
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer shrink-0"
              title="Borrar marcas"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Botón primario de aplicar cambio */}
        <button
          type="button"
          onClick={() => handleFormSubmit()}
          disabled={!instructionText.trim() || isGenerating}
          className="w-full py-2.5 px-4 bg-[#254b8c] hover:bg-[#1d3d75] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[17px]">
            {isGenerating ? 'sync' : 'auto_fix_high'}
          </span>
          <span>{isGenerating ? 'Aplicando corrección...' : 'Aplicar cambio'}</span>
        </button>
        <p className="text-[11px] text-slate-400 text-center">
          Ctrl+Intro para aplicar · se guarda como nueva versión
        </p>
      </div>

      {/* SECCIÓN INTERACTIVA DE MOBILIARIO */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">
            Mobiliario de v{currentVersion} ({furnitureItems.length})
          </h3>

          {/* Botón Añadir Mueble */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Añadir mueble</span>
            </button>

            {isAddMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50 text-xs space-y-0.5 animate-fadeIn max-h-60 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">
                  Piezas de mobiliario
                </div>
                {furnitureTemplates.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickAddFurniture(tpl)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-lg flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="font-medium text-slate-800">{tpl.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {tpl.w}×{tpl.d}m
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumen explicativo */}
        <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-600 leading-relaxed">
          Distribución arquitectónica interactiva en tiempo real.
        </div>

        {/* Tip con instrucciones de teclado */}
        <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-[11px] text-blue-900 leading-snug flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0">touch_app</span>
          <span>
            <strong>En el plano:</strong> Arrastra una pieza para moverla, pulsa <strong>R</strong> para girarla o <strong>Supr</strong> para borrarla.
          </span>
        </div>

        {/* Lista interactiva de mobiliario por estancia */}
        <div className="space-y-3 text-xs">
          {Object.entries(groupedFurniture).map(([groupTitle, items], gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <p className="font-bold text-slate-800 text-[12px]">{groupTitle}</p>
              <div className="space-y-1 pl-1">
                {items.map((item) => {
                  const isSelected = selectedFurnitureId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectFurniture(item.id)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400/40'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => onUpdateFurniture(item.id, { name: e.target.value })}
                          className="font-semibold text-slate-800 bg-transparent focus:outline-none focus:bg-slate-100 rounded px-1 text-xs w-full truncate"
                        />
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1 mt-0.5">
                          <span>
                            {item.widthMeters} × {item.depthMeters} m
                          </span>
                          <span>·</span>
                          <span>{item.rotation}°</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Botón Girar R */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = (item.rotation + 45) % 360;
                            onUpdateFurniture(item.id, { rotation: next });
                          }}
                          className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                          title="Girar 45° (R)"
                        >
                          <span className="material-symbols-outlined text-[15px]">rotate_right</span>
                        </button>

                        {/* Botón Eliminar Supr */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFurniture(item.id);
                            if (selectedFurnitureId === item.id) onSelectFurniture(null);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Eliminar (Supr)"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {furnitureItems.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No hay muebles en esta versión. Haz clic en "Añadir mueble" para incorporar piezas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
