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
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState<RoomCategory>('salon_comedor');
  const [customRoomName, setCustomRoomName] = useState<string>('');

  const handleAdd = () => {
    const categoryInfo = ROOM_CATEGORIES.find((c) => c.id === selectedCategoryToAdd);
    const name = customRoomName.trim() || categoryInfo?.label || 'Nueva Estancia';
    onAddMarker(selectedCategoryToAdd, name);
    setCustomRoomName('');
  };

  const activeMarker = markers.find((m) => m.id === activeMarkerId);

  return (
    <div className="space-y-3.5 text-stone-800">
      {/* Banner de Modo Pin / Ubicación */}
      <div
        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
          isPinningMode
            ? 'bg-amber-50 border-amber-300 shadow-xs'
            : 'bg-stone-50 border-stone-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isPinningMode
                ? 'bg-[#c25e38] text-white animate-pulse'
                : 'bg-stone-200 text-stone-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isPinningMode ? 'add_location_alt' : 'pin_drop'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-stone-900">
              {isPinningMode ? 'Modo Marcador ACTIVO' : 'Colocación de Estancias'}
            </p>
            <p className="text-[10px] text-stone-500 truncate">
              {isPinningMode
                ? 'Haz clic sobre el plano 2D para ubicar o reubicar el pin seleccionado.'
                : 'Fija coordenadas en el plano para evitar confusiones en el render.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onTogglePinningMode}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            isPinningMode
              ? 'bg-[#c25e38] text-white shadow-xs hover:bg-[#a84d2b]'
              : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isPinningMode ? 'check' : 'ads_click'}
          </span>
          <span>{isPinningMode ? 'Listo' : 'Activar Puntero'}</span>
        </button>
      </div>

      {/* Formulario rápido para añadir estancia */}
      <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2.5 shadow-xs">
        <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#c25e38]">add_circle</span>
          <span>Añadir Nueva Estancia al Plano</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] font-medium text-stone-500 mb-1 block">Tipo de estancia:</span>
            <select
              disabled={disabled}
              value={selectedCategoryToAdd}
              onChange={(e) => setSelectedCategoryToAdd(e.target.value as RoomCategory)}
              className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#c25e38]"
            >
              {ROOM_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[10px] font-medium text-stone-500 mb-1 block">Nombre / Etiqueta (opcional):</span>
            <input
              type="text"
              disabled={disabled}
              placeholder="Ej: Salón Principal o Suite 1"
              value={customRoomName}
              onChange={(e) => setCustomRoomName(e.target.value)}
              className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#c25e38]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={handleAdd}
            className="px-3.5 py-1.5 bg-[#c25e38] hover:bg-[#a84d2b] disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Añadir Pin</span>
          </button>
        </div>
      </div>

      {/* Editor del Pin actualmente seleccionado */}
      {activeMarker && (
        <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#c25e38] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">edit_location</span>
              <span>Editando: {activeMarker.name}</span>
            </span>
            <button
              type="button"
              onClick={() => onSelectMarker(null)}
              className="text-stone-400 hover:text-stone-700 text-xs"
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
              <span className="text-[10px] text-stone-500">Categoría:</span>
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
            <span className="text-[10px] text-stone-500">
              Observaciones específicas para el render (ej. "isla central con taburetes", "ducha de lluvia"):
            </span>
            <input
              type="text"
              placeholder="Detalles de mobiliario o acabados específicos..."
              value={activeMarker.notes || ''}
              onChange={(e) => onUpdateMarker(activeMarker.id, { notes: e.target.value })}
              className="w-full mt-0.5 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs"
            />
          </div>

          <div className="text-[10px] text-stone-500 flex items-center justify-between pt-1">
            <span>Coordenadas relativas: X: {Math.round(activeMarker.x)}% | Y: {Math.round(activeMarker.y)}%</span>
            <span className="italic text-[#c25e38]">Haz clic en el plano para moverlo</span>
          </div>
        </div>
      )}

      {/* Lista de Estancias añadidas */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
            Estancias Identificadas ({markers.length})
          </span>
          {markers.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClearMarkers}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium"
            >
              Borrar todas
            </button>
          )}
        </div>

        {markers.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-stone-300 text-center text-xs text-stone-400 bg-stone-50/50">
            No has colocado pines aún. Añade estancias para garantizar que el modelo distinga con precisión salones, dormitorios, cocinas y baños.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
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
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-[12px] font-bold"
                      style={{ backgroundColor: cat?.color || '#D97706' }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-900 truncate flex items-center gap-1.5">
                        <span>{marker.name}</span>
                        <span className="text-[10px] font-normal text-stone-500">
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
                      className="p-1 text-stone-400 hover:text-stone-700 rounded"
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
                      className="p-1 text-stone-400 hover:text-red-600 rounded"
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
