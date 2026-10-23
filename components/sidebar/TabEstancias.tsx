import React, { useMemo } from 'react';
import { RoomMarker, RoomCategory } from '../../types';
import { isExteriorRoom } from '../../services/roomSorter';

interface TabEstanciasProps {
  markers: RoomMarker[];
  onAddMarker: (category?: RoomCategory, name?: string, area?: number) => void;
  onUpdateMarker: (id: string, updates: Partial<RoomMarker>) => void;
  onDeleteMarker: (id: string) => void;
  onClearMarkers: () => void;
  activeMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  isPinningMode: boolean;
  onTogglePinningMode: () => void;
  customTotalUsefulArea?: number;
  onChangeCustomTotalUsefulArea?: (total: number | undefined) => void;
}

export function TabEstancias({
  markers,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onClearMarkers,
  activeMarkerId,
  onSelectMarker,
  isPinningMode,
  onTogglePinningMode,
  customTotalUsefulArea,
  onChangeCustomTotalUsefulArea
}: TabEstanciasProps) {
  // Cálculo de superficies
  const { usefulInterior, usefulExterior, missingAreaCount } = useMemo(() => {
    let interior = 0;
    let exterior = 0;
    let missing = 0;

    markers.forEach((m) => {
      const area = typeof m.areaSqMeters === 'number' && !isNaN(m.areaSqMeters) ? m.areaSqMeters : 0;
      if (area <= 0) {
        missing++;
      }
      if (isExteriorRoom(m)) {
        exterior += area;
      } else {
        interior += area;
      }
    });

    return {
      usefulInterior: interior,
      usefulExterior: exterior,
      missingAreaCount: missing
    };
  }, [markers]);

  return (
    <div className="flex flex-col gap-4 p-5 overflow-y-auto max-h-full font-sans text-slate-800">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Estancias</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Qué es cada espacio y cuánto mide.
        </p>
      </div>

      {/* Barra superior de acciones */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800">
            Estancias ({markers.length})
          </span>
        </div>

        {markers.length > 0 && (
          <button
            onClick={onClearMarkers}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Borrar todas las estancias"
          >
            <span className="material-symbols-outlined text-[17px]">ink_eraser</span>
          </button>
        )}
      </div>

      {/* Botones Pinchar en el plano / Añadir */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onTogglePinningMode}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border shadow-2xs ${
            isPinningMode
              ? 'bg-blue-600 text-white border-blue-600 font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">
            {isPinningMode ? 'my_location' : 'pin_drop'}
          </span>
          <span>{isPinningMode ? 'Pinchando...' : 'Pinchar en plano'}</span>
        </button>

        <button
          onClick={() => onAddMarker('salon_comedor', 'Nueva estancia', 0)}
          className="py-2 px-3 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
        >
          <span className="material-symbols-outlined text-[17px]">add</span>
          <span>Añadir</span>
        </button>
      </div>

      {/* Lista de estancias */}
      <div className="space-y-2 mt-1">
        {markers.map((marker, idx) => {
          const isSelected = activeMarkerId === marker.id;
          const roomNumber = idx + 1;

          return (
            <div
              key={marker.id}
              onClick={() => onSelectMarker(marker.id)}
              className={`flex items-center gap-2 p-2 rounded-xl transition border cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/30'
                  : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Badge numerado estilo Claude (círculo oscuro) */}
              <div className="w-6 h-6 rounded-full bg-[#1e293b] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {roomNumber}
              </div>

              {/* Input nombre estancia */}
              <input
                type="text"
                value={marker.name || ''}
                onChange={(e) => onUpdateMarker(marker.id, { name: e.target.value })}
                className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none focus:bg-slate-50 px-1.5 py-0.5 rounded"
                placeholder="Nombre estancia"
              />

              {/* Input m² */}
              <div className="flex items-center gap-1 shrink-0 w-24">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={marker.areaSqMeters !== undefined && marker.areaSqMeters > 0 ? marker.areaSqMeters : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    onUpdateMarker(marker.id, { areaSqMeters: isNaN(val as number) ? 0 : val });
                  }}
                  placeholder="0,00"
                  className="w-16 text-right text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded px-1.5 py-1 text-slate-800 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 font-medium">m²</span>
              </div>

              {/* Botón eliminar */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMarker(marker.id);
                }}
                className="p-1 text-slate-300 hover:text-red-600 rounded transition shrink-0"
                title="Eliminar estancia"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
          );
        })}

        {markers.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No hay estancias añadidas. Haz clic en "Pinchar en plano" o "Añadir".
          </div>
        )}
      </div>

      {/* Cuadro de superficies */}
      <div className="pt-4 border-t border-slate-200/90 space-y-2.5">
        <h3 className="text-xs font-bold text-slate-800">Cuadro de superficies</h3>

        <div className="space-y-1.5 text-xs text-slate-600 font-medium">
          <div className="flex justify-between items-center py-0.5">
            <span>Útil interior</span>
            <span className="font-bold text-slate-800">
              {usefulInterior > 0 ? `${usefulInterior.toFixed(2)} m²` : '— m²'}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span>Exterior</span>
            <span className="font-bold text-slate-800">
              {usefulExterior > 0 ? `${usefulExterior.toFixed(2)} m²` : '— m²'}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
            <span className="font-semibold text-slate-700">Útil total declarada</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={customTotalUsefulArea !== undefined ? customTotalUsefulArea : (usefulInterior + usefulExterior) || ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  if (onChangeCustomTotalUsefulArea) {
                    onChangeCustomTotalUsefulArea(isNaN(val as number) ? undefined : val);
                  }
                }}
                placeholder="0"
                className="w-18 text-right text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded px-2 py-1 font-bold text-slate-900 focus:outline-none"
              />
              <span className="text-xs text-slate-500 font-bold">m²</span>
            </div>
          </div>
        </div>

        {/* Alerta si faltan superficies */}
        {missingAreaCount > 0 && (
          <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-fadeIn mt-2">
            <span className="material-symbols-outlined text-[17px] text-red-500 shrink-0 mt-0.5">
              warning
            </span>
            <p className="leading-snug">
              <strong>{missingAreaCount} estancia(s)</strong> sin superficie: en la ficha aparecerán como «s/d».
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
