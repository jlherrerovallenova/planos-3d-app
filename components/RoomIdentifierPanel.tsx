import React, { useState } from 'react';
import { RoomMarker, RoomCategory } from '../types';
import { ROOM_CATEGORIES } from '../constants';

interface RoomIdentifierPanelProps {
  markers: RoomMarker[];
  onAddMarker: (category: RoomCategory, name?: string) => void;
  onUpdateMarker: (id: string, updates: Partial<RoomMarker>) => void;
  onDeleteMarker: (id: string) => void;
  onClearMarkers: () => void;
  activeMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  isPinningMode: boolean;
  onTogglePinningMode: () => void;
  disabled?: boolean;
}

export function RoomIdentifierPanel({
  markers,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onClearMarkers,
  activeMarkerId,
  onSelectMarker,
  isPinningMode,
  onTogglePinningMode,
  disabled
}: RoomIdentifierPanelProps) {
  const [customRoomName, setCustomRoomName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory>('salon_comedor');

  // Accesos directos a las estancias más comunes
  const quickCategories: { id: RoomCategory; label: string; icon: string }[] = [
    { id: 'salon_comedor', label: 'Salón', icon: 'chair' },
    { id: 'cocina', label: 'Cocina', icon: 'countertops' },
    { id: 'dormitorio_principal', label: 'Suite', icon: 'bed' },
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
    onAddMarker(selectedCategory, name);
    setCustomRoomName('');
  };

  const activeMarker = markers.find((m) => m.id === activeMarkerId);

  return (
    <div className="space-y-3.5 text-stone-800">
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

      {/* 2. Chips de Adición Rápida en 1 clic */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
          Añadir Estancia con 1 Clic:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {quickCategories.map((q) => (
            <button
              key={q.id}
              type="button"
              disabled={disabled}
              onClick={() => handleQuickAdd(q.id, q.label)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200/90 text-stone-700 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer hover:border-stone-300 active:scale-95 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[15px] text-[#c25e38]">{q.icon}</span>
              <span>+ {q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Formulario personalizado colapsable */}
      <form onSubmit={handleCustomAdd} className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] font-medium text-stone-500 block mb-0.5">Categoría:</span>
            <select
              disabled={disabled}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as RoomCategory)}
              className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#c25e38]"
            >
              {ROOM_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-[10px] font-medium text-stone-500 block mb-0.5">Nombre libre:</span>
            <input
              type="text"
              disabled={disabled}
              placeholder="Ej: Sala de Cine, Aseo 2..."
              value={customRoomName}
              onChange={(e) => setCustomRoomName(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#c25e38]"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled}
            className="px-3 py-1 bg-[#c25e38] hover:bg-[#a84d2b] text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-2xs"
          >
            Añadir
          </button>
        </div>
      </form>

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

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-stone-500">Nombre de la estancia:</span>
              <input
                type="text"
                value={activeMarker.name}
                onChange={(e) => onUpdateMarker(activeMarker.id, { name: e.target.value })}
                className="w-full mt-0.5 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-stone-500">Tipo:</span>
              <select
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
          </div>

          <div>
            <span className="text-[10px] text-stone-500">Observaciones (muebles, acabados):</span>
            <input
              type="text"
              placeholder="Ej: Sofá esquinero beige, isla con campana de techo..."
              value={activeMarker.notes || ''}
              onChange={(e) => onUpdateMarker(activeMarker.id, { notes: e.target.value })}
              className="w-full mt-0.5 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs"
            />
          </div>
        </div>
      )}

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
                  onClick={() => onSelectMarker(marker.id)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-[#c25e38] bg-orange-50/70 shadow-xs ring-1 ring-[#c25e38]'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
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
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMarker(isSelected ? null : marker.id);
                      }}
                      className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                      title="Editar estancia"
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
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomIdentifierPanel;
