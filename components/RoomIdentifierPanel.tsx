import React, { useState } from 'react';
import { RoomMarker, RoomCategory } from '../types';
import { ROOM_CATEGORIES, MARKER_COLOR_PRESETS } from '../constants';

interface RoomIdentifierPanelProps {
  markers: RoomMarker[];
  markerBadgeColor?: string;
  onChangeMarkerBadgeColor?: (color: string) => void;
  onAddMarker: (category: RoomCategory, name?: string, area?: number) => void;
  onUpdateMarker: (id: string, updates: Partial<RoomMarker>) => void;
  onDeleteMarker: (id: string) => void;
  onClearMarkers: () => void;
  activeMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  isPinningMode: boolean;
  onTogglePinningMode: () => void;
  disabled?: boolean;
  onDetectWithAI?: () => void;
  isDetectingWithAI?: boolean;
  hasSourceImage?: boolean;
  onGenerateInterior?: (marker: RoomMarker, roomIndex: number) => void;
  isGeneratingInterior?: boolean;
  generatingRoomId?: string | null;
  customTotalUsefulArea?: number;
  onChangeCustomTotalUsefulArea?: (total: number | undefined) => void;
}

export function RoomIdentifierPanel({
  markers,
  markerBadgeColor = '#0F2C59',
  onChangeMarkerBadgeColor,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onClearMarkers,
  activeMarkerId,
  onSelectMarker,
  isPinningMode,
  onTogglePinningMode,
  disabled,
  onDetectWithAI,
  isDetectingWithAI = false,
  hasSourceImage = false,
  onGenerateInterior,
  isGeneratingInterior = false,
  generatingRoomId = null,
  customTotalUsefulArea,
  onChangeCustomTotalUsefulArea
}: RoomIdentifierPanelProps) {
  const [customRoomName, setCustomRoomName] = useState<string>('');
  const [customArea, setCustomArea] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory>('salon_comedor');
  const [isEditingTotalInPanel, setIsEditingTotalInPanel] = useState<boolean>(false);
  const [tempTotalInPanel, setTempTotalInPanel] = useState<string>('');

  // Accesos directos a las estancias más comunes
  const quickCategories: { id: RoomCategory; label: string; icon: string }[] = [
    { id: 'salon_comedor', label: 'Salón', icon: 'chair' },
    { id: 'cocina', label: 'Cocina', icon: 'countertops' },
    { id: 'dormitorio_principal', label: 'Dorm. Principal', icon: 'bed' },
    { id: 'dormitorio_secundario', label: 'Dormitorio', icon: 'single_bed' },
    { id: 'bano_principal', label: 'Baño', icon: 'bathtub' },
    { id: 'terraza_balcon', label: 'Terraza', icon: 'deck' },
    { id: 'despacho_estudio', label: 'Despacho', icon: 'laptop_mac' }
  ];

  const handleQuickAdd = (cat: RoomCategory, label: string) => {
    onAddMarker(cat, label);
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const catInfo = ROOM_CATEGORIES.find((c) => c.id === selectedCategory);
    const name = customRoomName.trim() || catInfo?.label || 'Nueva Estancia';
    const area = customArea ? parseFloat(customArea) : undefined;
    onAddMarker(selectedCategory, name, area);
    setCustomRoomName('');
    setCustomArea('');
  };

  const activeMarker = markers.find((m) => m.id === activeMarkerId);

  return (
    <div className="space-y-3.5 text-stone-800">
      {/* 0. Botón de Detección Automática con IA (Gemini Vision) */}
      {onDetectWithAI && (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <span className={`material-symbols-outlined text-[18px] ${isDetectingWithAI ? 'animate-spin' : ''}`}>
                {isDetectingWithAI ? 'autorenew' : 'auto_awesome'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-950">
                {isDetectingWithAI ? 'Analizando plano con IA...' : 'Escanear Estancias y m² con IA'}
              </p>
              <p className="text-[11px] text-blue-700/80 truncate">
                {isDetectingWithAI ? 'Leyendo rotulación y m² del plano...' : 'Lee los nombres y superficies exactas del plano'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled || !hasSourceImage || isDetectingWithAI}
            onClick={onDetectWithAI}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <span>{isDetectingWithAI ? 'Leyendo...' : 'Detectar'}</span>
          </button>
        </div>
      )}

      {/* 1. Modo Marcador Banner / Interruptor de precisión */}
      <div
        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
          isPinningMode
            ? 'bg-amber-50 border-amber-300 shadow-sm ring-1 ring-amber-300'
            : 'bg-stone-50 border-stone-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isPinningMode
                ? 'bg-amber-500 text-stone-950 font-bold animate-pulse'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPinningMode ? 'touch_app' : 'pin_drop'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-stone-900">
              {isPinningMode ? 'Puntero Activo en Canvas' : 'Colocación en el Plano'}
            </p>
            <p className="text-[11px] text-stone-500 truncate">
              {isPinningMode
                ? 'Haz clic sobre el plano para situar o mover la estancia seleccionada.'
                : 'Ubica pines para evitar que la IA confunda dormitorios o baños.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onTogglePinningMode}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
            isPinningMode
              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 ring-2 ring-amber-300'
              : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isPinningMode ? 'check_circle' : 'ads_click'}
          </span>
          <span>{isPinningMode ? 'Listo' : 'Activar Puntero'}</span>
        </button>
      </div>

      {/* 2. Sección Manual para Planos Mudos (Sin Textos) */}
      <div className="p-3 bg-blue-50/70 border border-blue-200/90 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-blue-700">edit_square</span>
            <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
              Configuración Manual de Estancias
            </span>
          </div>
          <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
            Plano Mudo
          </span>
        </div>
        <p className="text-[11px] text-blue-800/80 leading-tight">
          Asigna los números, nombres y superficies (m²) manualmente. El total se calcula automáticamente sumando todas las estancias.
        </p>

        {/* Chips de Selección Rápida */}
        <div className="flex flex-wrap gap-1">
          {quickCategories.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSelectedCategory(q.id);
                setCustomRoomName(q.label);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                selectedCategory === q.id && customRoomName === q.label
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] text-[#c25e38]">{q.icon}</span>
              <span>{q.label}</span>
            </button>
          ))}
        </div>

        {/* Formulario de Añadir Estancia con m² */}
        <form onSubmit={handleCustomAdd} className="space-y-2 pt-1">
          <div className="grid grid-cols-12 gap-2 text-xs">
            <div className="col-span-7">
              <label htmlFor="custom-room-name-input" className="text-[10px] font-semibold text-stone-600 block mb-0.5">
                Nombre de la estancia:
              </label>
              <input
                id="custom-room-name-input"
                aria-label="Nombre de la estancia"
                type="text"
                disabled={disabled}
                placeholder="Ej: Salón - Comedor"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs font-bold text-stone-800 uppercase focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="col-span-5">
              <label htmlFor="custom-room-area-input" className="text-[10px] font-semibold text-stone-600 block mb-0.5">
                Superficie (m²):
              </label>
              <div className="relative">
                <input
                  id="custom-room-area-input"
                  aria-label="Superficie en metros cuadrados"
                  type="number"
                  step="0.01"
                  disabled={disabled}
                  placeholder="Ej: 21.50"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-blue-600"
                />
                <span className="absolute right-2 top-1.5 text-[10px] font-bold text-stone-400 pointer-events-none">m²</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Añadir Estancia #{markers.length + 1} (Sumar al Total)</span>
          </button>
        </form>
      </div>

      {/* 4. Editor Contextual si hay un pin seleccionado */}
      {activeMarker && (
        <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-orange-200/60">
            <span className="text-xs font-bold text-[#c25e38] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">edit_location</span>
              <span>Editando: {activeMarker.name}</span>
            </span>
            <button
              type="button"
              onClick={() => onSelectMarker(null)}
              className="text-stone-400 hover:text-stone-700 text-xs font-medium cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label htmlFor={`edit-marker-name-${activeMarker.id}`} className="text-[10px] text-stone-500 block">
                Nombre:
              </label>
              <input
                id={`edit-marker-name-${activeMarker.id}`}
                aria-label="Nombre de la estancia activa"
                type="text"
                value={activeMarker.name}
                onChange={(e) => onUpdateMarker(activeMarker.id, { name: e.target.value })}
                className="w-full mt-0.5 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label htmlFor={`edit-marker-type-${activeMarker.id}`} className="text-[10px] text-stone-500 block">
                Tipo:
              </label>
              <select
                id={`edit-marker-type-${activeMarker.id}`}
                aria-label="Tipo de estancia activa"
                value={activeMarker.category}
                onChange={(e) =>
                  onUpdateMarker(activeMarker.id, { category: e.target.value as RoomCategory })
                }
                className="w-full mt-0.5 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs"
              >
                {ROOM_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`edit-marker-area-${activeMarker.id}`} className="text-[10px] text-stone-500 block">
                Superficie (m²):
              </label>
              <input
                id={`edit-marker-area-${activeMarker.id}`}
                aria-label="Superficie en m² de la estancia activa"
                type="number"
                step="0.01"
                placeholder="m²"
                value={activeMarker.areaSqMeters !== undefined ? activeMarker.areaSqMeters : ''}
                onChange={(e) =>
                  onUpdateMarker(activeMarker.id, {
                    areaSqMeters: e.target.value ? parseFloat(e.target.value) : undefined
                  })
                }
                className="w-full mt-0.5 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`edit-marker-notes-${activeMarker.id}`} className="text-[10px] text-stone-500 block">
              Observaciones (muebles, acabados):
            </label>
            <input
              id={`edit-marker-notes-${activeMarker.id}`}
              aria-label="Observaciones de la estancia activa"
              type="text"
              placeholder="Ej: Sofá esquinero beige, isla con campana de techo..."
              value={activeMarker.notes || ''}
              onChange={(e) => onUpdateMarker(activeMarker.id, { notes: e.target.value })}
              className="w-full mt-0.5 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs"
            />
          </div>

          {onGenerateInterior && (
            <button
              type="button"
              disabled={disabled || isGeneratingInterior || !hasSourceImage}
              onClick={() => {
                const idx = markers.findIndex((m) => m.id === activeMarker.id);
                onGenerateInterior(activeMarker, idx >= 0 ? idx : 0);
              }}
              className="w-full mt-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-outlined text-[16px] ${generatingRoomId === activeMarker.id ? 'animate-spin' : ''}`}>
                {generatingRoomId === activeMarker.id ? 'autorenew' : 'photo_camera'}
              </span>
              <span>
                {generatingRoomId === activeMarker.id
                  ? 'Generando perspectiva interior...'
                  : `Generar Vista Interior 3D de ${activeMarker.name}`}
              </span>
            </button>
          )}
        </div>
      )}


      {/* 4.5 Selector de Color de Fondo de los Puntos Identificadores */}
      <div className="p-2.5 bg-stone-50 border border-stone-200/90 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#c25e38]">palette</span>
            <span>Color de los Puntos Identificadores</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-5 h-5 rounded-full border border-white/60 shadow-xs flex items-center justify-center text-[10px] font-black text-white"
              style={{ backgroundColor: markerBadgeColor }}
            >
              1
            </span>
            <span className="text-[11px] font-mono text-stone-600 font-bold uppercase">
              {markerBadgeColor}
            </span>
          </div>
        </div>

        {/* Paleta rápida de colores y selector libre */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {MARKER_COLOR_PRESETS.map((preset) => {
            const isSelected = (markerBadgeColor || '#0F2C59').toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                onClick={() => onChangeMarkerBadgeColor && onChangeMarkerBadgeColor(preset.hex)}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer border border-black/15 flex items-center justify-center ${
                  isSelected ? 'scale-120 ring-2 ring-blue-500 ring-offset-1 shadow-sm' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: preset.hex }}
                title={preset.label}
              >
                {isSelected && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
              </button>
            );
          })}

          {/* Selector libre con <input type="color" /> */}
          <label
            className="w-6 h-6 rounded-full border border-stone-300 hover:border-stone-400 bg-white flex items-center justify-center cursor-pointer transition hover:scale-110 relative overflow-hidden shadow-xs"
            title="Elegir color personalizado libre"
          >
            <span className="material-symbols-outlined text-[13px] text-stone-700">colorize</span>
            <input
              type="color"
              value={markerBadgeColor || '#0F2C59'}
              onChange={(e) => onChangeMarkerBadgeColor && onChangeMarkerBadgeColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      {/* 5. Lista de Estancias añadidas */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <span>Estancias del Plano</span>
            <span className="px-1.5 py-0.2 rounded-md bg-stone-200 text-stone-800 text-[10px] font-mono">
              {markers.length}
            </span>
          </span>
          {markers.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClearMarkers}
              className="text-[11px] text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Borrar todas
            </button>
          )}
        </div>

        {markers.length === 0 ? (
          <div className="p-4 rounded-2xl border border-dashed border-stone-300 text-center text-xs text-stone-400 bg-stone-50/50">
            No has colocado pines aún. Usa los botones rápidos superiores o haz clic sobre el plano para fijar estancias.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {markers.map((marker, idx) => {
              const cat = ROOM_CATEGORIES.find((c) => c.id === marker.category);
              const isSelected = activeMarkerId === marker.id;

              return (
                <div
                  key={marker.id}
                  className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-[#c25e38] bg-orange-50/70 shadow-xs ring-1 ring-[#c25e38]'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectMarker(marker.id)}
                    aria-label={`Seleccionar estancia #${idx + 1} ${marker.name}`}
                    className="flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
                  >
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
                      style={{ backgroundColor: cat?.color || '#D97706' }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-900 truncate flex items-center gap-1.5">
                        <span>{marker.name}</span>
                        <span className="text-[10px] font-normal text-stone-400">
                          ({cat?.label || marker.category})
                        </span>
                      </p>
                      {marker.notes && (
                        <p className="text-[10px] text-stone-500 truncate">
                          Obs: {marker.notes}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {marker.areaSqMeters !== undefined && (
                      <span className="text-[11px] font-bold text-[#0F2C59] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-mono">
                        {marker.areaSqMeters.toLocaleString('es-ES', { minimumFractionDigits: 2 })} m²
                      </span>
                    )}
                    {onGenerateInterior && (
                      <button
                        type="button"
                        disabled={disabled || isGeneratingInterior || !hasSourceImage}
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenerateInterior(marker, idx);
                        }}
                        className={`p-1 rounded cursor-pointer transition ${
                          generatingRoomId === marker.id
                            ? 'text-blue-600 bg-blue-100 animate-pulse'
                            : 'text-stone-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        title={`Generar vista interior 3D de ${marker.name}`}
                        aria-label={`Generar vista interior 3D de ${marker.name}`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${generatingRoomId === marker.id ? 'animate-spin' : ''}`}>
                          {generatingRoomId === marker.id ? 'autorenew' : 'photo_camera'}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMarker(isSelected ? null : marker.id);
                      }}
                      className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                      title="Editar estancia"
                      aria-label={`Editar estancia ${marker.name}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMarker(marker.id);
                      }}
                      className="p-1 text-stone-400 hover:text-red-600 rounded cursor-pointer"
                      title="Eliminar estancia"
                      aria-label={`Eliminar estancia ${marker.name}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {markers.length > 0 && (
              <div className="mt-2 pt-2 border-t border-stone-200 text-xs px-1">
                {isEditingTotalInPanel ? (
                  <div className="flex items-center gap-1.5 py-1 bg-amber-50 p-1.5 rounded-lg border border-amber-300">
                    <span className="font-bold text-amber-950 text-[11px] shrink-0">Total m²:</span>
                    <input
                      type="number"
                      step="0.01"
                      aria-label="Superficie total útil manual"
                      value={tempTotalInPanel}
                      onChange={(e) => setTempTotalInPanel(e.target.value)}
                      placeholder="Ej: 78.50"
                      className="flex-1 bg-white border border-stone-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = tempTotalInPanel ? parseFloat(tempTotalInPanel) : undefined;
                          onChangeCustomTotalUsefulArea?.(val);
                          setIsEditingTotalInPanel(false);
                        }
                        if (e.key === 'Escape') {
                          setIsEditingTotalInPanel(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = tempTotalInPanel ? parseFloat(tempTotalInPanel) : undefined;
                        onChangeCustomTotalUsefulArea?.(val);
                        setIsEditingTotalInPanel(false);
                      }}
                      className="p-1 rounded bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                      title="Guardar total"
                    >
                      <span className="material-symbols-outlined text-[13px] block">check</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingTotalInPanel(false)}
                      className="p-1 rounded bg-stone-200 text-stone-700 cursor-pointer"
                      title="Cancelar"
                    >
                      <span className="material-symbols-outlined text-[13px] block">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-700">Superficie Útil Total:</span>
                      {typeof customTotalUsefulArea === 'number' && customTotalUsefulArea > 0 && (
                        <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-[#0F2C59] font-mono text-xs">
                        {((typeof customTotalUsefulArea === 'number' && customTotalUsefulArea > 0)
                          ? customTotalUsefulArea
                          : markers.reduce((acc, m) => acc + (m.areaSqMeters || 0), 0)
                        ).toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                        m²
                      </span>
                      {onChangeCustomTotalUsefulArea && (
                        <button
                          type="button"
                          onClick={() => {
                            setTempTotalInPanel(
                              String(
                                (typeof customTotalUsefulArea === 'number' && customTotalUsefulArea > 0)
                                  ? customTotalUsefulArea
                                  : markers.reduce((acc, m) => acc + (m.areaSqMeters || 0), 0) || ''
                              )
                            );
                            setIsEditingTotalInPanel(true);
                          }}
                          className="p-0.5 text-stone-400 hover:text-amber-700 rounded cursor-pointer"
                          title="Personalizar o editar la superficie útil total manualmente"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                      )}
                      {typeof customTotalUsefulArea === 'number' && customTotalUsefulArea > 0 && onChangeCustomTotalUsefulArea && (
                        <button
                          type="button"
                          onClick={() => onChangeCustomTotalUsefulArea(undefined)}
                          className="text-[9px] font-bold text-blue-700 hover:text-blue-900 hover:underline px-1 py-0.5 rounded bg-blue-50 border border-blue-200 cursor-pointer"
                          title="Restablecer suma automática de estancias"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomIdentifierPanel;
