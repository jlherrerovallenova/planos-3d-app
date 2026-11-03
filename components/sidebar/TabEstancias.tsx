import React, { useState, useEffect, useMemo } from 'react';
import { RoomMarker, RoomCategory } from '../../types';
import { isExteriorRoom, sortRoomMarkers } from '../../services/roomSorter';

interface TabEstanciasProps {
  markers: RoomMarker[];
  onAddMarker: (category?: RoomCategory, name?: string, area?: number, x?: number, y?: number) => void;
  onUpdateMarker: (id: string, updates: Partial<RoomMarker>) => void;
  onDeleteMarker: (id: string) => void;
  onClearMarkers: () => void;
  onReorderMarkers?: (newMarkers: RoomMarker[]) => void;
  onAutoSortMarkers?: () => void;
  activeMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  isPinningMode: boolean;
  onTogglePinningMode: () => void;
  customTotalUsefulArea?: number;
  onChangeCustomTotalUsefulArea?: (total: number | undefined) => void;
  pendingPinCoords?: { x: number; y: number } | null;
  onSetPendingPinCoords?: (coords: { x: number; y: number } | null) => void;
}

// Estancias estándar recomendadas en orden comercial
const QUICK_ROOMS: { name: string; category: RoomCategory }[] = [
  { name: 'Salón - Comedor - Cocina', category: 'salon_comedor' },
  { name: 'Salón - Comedor', category: 'salon_comedor' },
  { name: 'Cocina', category: 'cocina' },
  { name: 'Dormitorio Principal', category: 'dormitorio_principal' },
  { name: 'Dormitorio 2', category: 'dormitorio_secundario' },
  { name: 'Dormitorio 3', category: 'dormitorio_secundario' },
  { name: 'Baño Principal', category: 'bano_principal' },
  { name: 'Aseo de Cortesía', category: 'aseo_cortesia' },
  { name: 'Vestíbulo', category: 'recibidor_distribuidor' },
  { name: 'Pasillo / Distribuidor', category: 'recibidor_distribuidor' },
  { name: 'Terraza', category: 'terraza_balcon' }
];

function detectCategoryFromName(name: string): RoomCategory {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('salon') || n.includes('comedor') || n.includes('estar') || n.includes('living')) return 'salon_comedor';
  if (n.includes('cocina')) return 'cocina';
  if (n.includes('dormitorio 1') || n.includes('principal') || n.includes('suite') || n.includes('matrimonio')) return 'dormitorio_principal';
  if (n.includes('dormitorio') || n.includes('habitacion')) return 'dormitorio_secundario';
  if (n.includes('bano') || n.includes('baño')) return 'bano_principal';
  if (n.includes('aseo')) return 'aseo_cortesia';
  if (n.includes('terraza') || n.includes('balcon')) return 'terraza_balcon';
  if (n.includes('vestibulo') || n.includes('hall') || n.includes('recibidor') || n.includes('pasillo') || n.includes('distribuidor')) return 'recibidor_distribuidor';
  if (n.includes('despacho') || n.includes('estudio') || n.includes('oficina')) return 'despacho_estudio';
  if (n.includes('lavadero') || n.includes('galeria') || n.includes('tendedero')) return 'lavadero_galeria';
  if (n.includes('vestidor')) return 'vestidor';
  return 'otro';
}

export function TabEstancias({
  markers,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onClearMarkers,
  onReorderMarkers,
  onAutoSortMarkers,
  activeMarkerId,
  onSelectMarker,
  isPinningMode,
  onTogglePinningMode,
  customTotalUsefulArea,
  onChangeCustomTotalUsefulArea,
  pendingPinCoords,
  onSetPendingPinCoords
}: TabEstanciasProps) {
  // Estado para el formulario de 3 pasos para añadir una estancia
  const [isAddingRoom, setIsAddingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomCategory, setNewRoomCategory] = useState<RoomCategory>('salon_comedor');
  const [newRoomArea, setNewRoomArea] = useState<string>('');
  const [newRoomCoords, setNewRoomCoords] = useState<{ x: number; y: number } | null>(null);

  // Estado para arrastrar y soltar (Drag & Drop) estancias para alterar números
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const updated = [...markers];
    const [movedItem] = updated.splice(draggedIdx, 1);
    updated.splice(targetIndex, 0, movedItem);

    if (onReorderMarkers) {
      onReorderMarkers(updated);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index <= 0) return;
    const updated = [...markers];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(index - 1, 0, movedItem);
    if (onReorderMarkers) {
      onReorderMarkers(updated);
    }
  };

  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index >= markers.length - 1) return;
    const updated = [...markers];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(index + 1, 0, movedItem);
    if (onReorderMarkers) {
      onReorderMarkers(updated);
    }
  };

  const handleAutoSort = () => {
    if (onAutoSortMarkers) {
      onAutoSortMarkers();
    } else if (onReorderMarkers) {
      onReorderMarkers(sortRoomMarkers(markers));
    }
  };

  // Sincronizar coordenadas cuando el usuario hace clic en el plano
  useEffect(() => {
    if (pendingPinCoords) {
      setNewRoomCoords(pendingPinCoords);
      if (!isAddingRoom) {
        setIsAddingRoom(true);
      }
    }
  }, [pendingPinCoords, isAddingRoom]);

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

  // Abrir flujo de añadir estancia
  const handleStartAddRoom = () => {
    setIsAddingRoom(true);
    setNewRoomName('');
    setNewRoomCategory('salon_comedor');
    setNewRoomArea('');
    setNewRoomCoords(null);
    onSelectMarker(null);
    if (onSetPendingPinCoords) onSetPendingPinCoords(null);
    if (!isPinningMode) onTogglePinningMode();
  };

  // Cancelar flujo de añadir estancia
  const handleCancelAddRoom = () => {
    setIsAddingRoom(false);
    setNewRoomName('');
    setNewRoomArea('');
    setNewRoomCoords(null);
    if (onSetPendingPinCoords) onSetPendingPinCoords(null);
    if (isPinningMode) onTogglePinningMode();
  };

  // Guardar la nueva estancia tras los 3 pasos
  const handleSaveNewRoom = () => {
    const finalName = newRoomName.trim() || `Estancia ${markers.length + 1}`;
    const finalArea = newRoomArea !== '' ? parseFloat(newRoomArea) : undefined;
    const finalCoords = newRoomCoords || { x: 50, y: 50 };
    const finalCategory = detectCategoryFromName(finalName) || newRoomCategory;

    onAddMarker(
      finalCategory,
      finalName,
      isNaN(finalArea as number) ? undefined : finalArea,
      finalCoords.x,
      finalCoords.y
    );

    setIsAddingRoom(false);
    setNewRoomName('');
    setNewRoomArea('');
    setNewRoomCoords(null);
    if (onSetPendingPinCoords) onSetPendingPinCoords(null);
    if (isPinningMode) onTogglePinningMode();
  };

  // Activar modo pinchar en plano para ubicar la estancia (Paso 3)
  const handleTogglePinningForNew = () => {
    if (!isPinningMode) {
      onTogglePinningMode();
    }
  };

  const nextNumber = markers.length + 1;

  return (
    <div className="flex flex-col gap-4 p-5 overflow-y-auto max-h-full font-sans text-slate-800">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Estancias</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Qué es cada espacio, cuánto mide y dónde se ubica en el plano.
        </p>
      </div>

      {/* Barra superior de acciones */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800">
            Estancias ({markers.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          {markers.length > 1 && (
            <button
              type="button"
              onClick={handleAutoSort}
              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
              title="Auto-ordenar según el estándar comercial inmobiliario"
            >
              <span className="material-symbols-outlined text-[14px]">sort</span>
              <span>Auto-ordenar</span>
            </button>
          )}

          {markers.length > 0 && (
            <button
              onClick={onClearMarkers}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
              title="Borrar todas las estancias"
            >
              <span className="material-symbols-outlined text-[17px]">ink_eraser</span>
            </button>
          )}
        </div>
      </div>

      {/* Botones de acción principales */}
      {!isAddingRoom && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              handleStartAddRoom();
              if (!isPinningMode) onTogglePinningMode();
            }}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border shadow-2xs ${
              isPinningMode
                ? 'bg-amber-500 text-white border-amber-600 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {isPinningMode ? 'my_location' : 'pin_drop'}
            </span>
            <span>{isPinningMode ? 'Pinchando...' : 'Pinchar en plano'}</span>
          </button>

          <button
            onClick={handleStartAddRoom}
            className="py-2 px-3 rounded-xl text-xs font-bold bg-[#0F2C59] text-white hover:bg-[#1B365D] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[17px]">add</span>
            <span>Añadir estancia</span>
          </button>
        </div>
      )}

      {/* FORMULARIO DE 3 PASOS PARA AÑADIR ESTANCIA */}
      {isAddingRoom && (
        <div className="bg-slate-50 border-2 border-blue-500/50 rounded-2xl p-4 space-y-3.5 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0F2C59] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {nextNumber}
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Añadir Estancia #{nextNumber}
              </h3>
            </div>
            <button
              onClick={handleCancelAddRoom}
              className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          {/* 1. Nombre de estancia */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>Nombre de la estancia:</span>
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Ej: Salón, Dormitorio 1, Cocina, Baño..."
              value={newRoomName}
              onChange={(e) => {
                setNewRoomName(e.target.value);
                const cat = detectCategoryFromName(e.target.value);
                if (cat) setNewRoomCategory(cat);
              }}
              className="w-full text-xs bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold"
            />

            {/* Atajos rápidos en un clic */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {QUICK_ROOMS.map((qr) => (
                <button
                  key={qr.name}
                  type="button"
                  onClick={() => {
                    setNewRoomName(qr.name);
                    setNewRoomCategory(qr.category);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                    newRoomName === qr.name
                      ? 'bg-[#0F2C59] text-white border-[#0F2C59] font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {qr.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Superficie de la estancia */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>Superficie de la estancia:</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative w-36">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={newRoomArea}
                  onChange={(e) => setNewRoomArea(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-900 font-bold"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold pointer-events-none">
                  m²
                </span>
              </div>
              <span className="text-[10px] text-slate-400 italic">
                (opcional si el plano no la indica)
              </span>
            </div>
          </div>

          {/* 3. Ubicar la estancia en el plano */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>Ubicar la estancia en el plano:</span>
            </label>

            <button
              type="button"
              onClick={handleTogglePinningForNew}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border shadow-xs ${
                newRoomCoords
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                  : isPinningMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-pulse ring-2 ring-amber-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {newRoomCoords ? 'check_circle' : isPinningMode ? 'ads_click' : 'pin_drop'}
              </span>
              <span>
                {newRoomCoords
                  ? `✓ Número ${nextNumber} ubicado en el plano (${Math.round(newRoomCoords.x)}%, ${Math.round(newRoomCoords.y)}%)`
                  : isPinningMode
                  ? `👉 Haz clic en la estancia del plano para colocar el número ${nextNumber}`
                  : `Colocar número ${nextNumber} en el plano`}
              </span>
            </button>
            {newRoomCoords ? (
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">check</span>
                <span>Número situado con éxito en el plano. Si quieres moverlo, haz clic en otro punto.</span>
              </p>
            ) : isPinningMode ? (
              <p className="text-[11px] text-amber-700 font-medium animate-pulse mt-1">
                👉 Haz clic sobre la habitación en el plano para situar el círculo del número {nextNumber}.
              </p>
            ) : (
              <p className="text-[10px] text-slate-500 mt-1">
                Pulsa el botón y después haz clic sobre la estancia en el plano.
              </p>
            )}
          </div>

          {/* Botones de acción del formulario */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancelAddRoom}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-200/60 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!newRoomName.trim()}
              onClick={handleSaveNewRoom}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Guardar Estancia</span>
            </button>
          </div>
        </div>
      )}

      {/* Pista informativa de arrastrar y soltar */}
      {markers.length > 1 && !isAddingRoom && (
        <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0">drag_indicator</span>
          <span className="leading-tight">
            Arrastra el icono <span className="font-bold text-slate-700">⠿</span> o usa las flechas <span className="font-bold text-slate-700">▲▼</span> para alterar el número de cada estancia en el plano.
          </span>
        </div>
      )}

      {/* Lista de estancias existentes */}
      <div className="space-y-2 mt-1">
        {markers.map((marker, idx) => {
          const isSelected = activeMarkerId === marker.id;
          const roomNumber = idx + 1;
          const isDragging = draggedIdx === idx;
          const isOver = dragOverIdx === idx && draggedIdx !== null && draggedIdx !== idx;

          return (
            <div
              key={marker.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectMarker(marker.id)}
              className={`group relative flex items-center gap-1.5 p-2 rounded-xl transition border cursor-pointer select-none ${
                isDragging
                  ? 'opacity-30 border-dashed border-blue-500 bg-blue-50/50 scale-[0.98]'
                  : isOver
                  ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500 shadow-md translate-y-0.5'
                  : isSelected
                  ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400/40'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
              }`}
            >
              {/* Grip para arrastrar + botones flechas arriba/abajo */}
              <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
                <div
                  className="p-0.5 cursor-grab active:cursor-grabbing hover:text-blue-600 rounded transition"
                  title="Arrastra para cambiar la posición y el número de esta estancia"
                >
                  <span className="material-symbols-outlined text-[18px] block">drag_indicator</span>
                </div>
                <div className="flex flex-col -space-y-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => handleMoveUp(e, idx)}
                    className="p-0.5 text-slate-300 hover:text-blue-600 disabled:opacity-0 disabled:pointer-events-none transition cursor-pointer"
                    title="Subir posición (número anterior)"
                  >
                    <span className="material-symbols-outlined text-[13px] block">keyboard_arrow_up</span>
                  </button>
                  <button
                    type="button"
                    disabled={idx === markers.length - 1}
                    onClick={(e) => handleMoveDown(e, idx)}
                    className="p-0.5 text-slate-300 hover:text-blue-600 disabled:opacity-0 disabled:pointer-events-none transition cursor-pointer"
                    title="Bajar posición (número siguiente)"
                  >
                    <span className="material-symbols-outlined text-[13px] block">keyboard_arrow_down</span>
                  </button>
                </div>
              </div>

              {/* Badge numerado en círculo azul marino con número blanco */}
              <div
                className="w-7 h-7 rounded-full bg-[#0F2C59] text-white flex items-center justify-center text-xs font-bold shrink-0 border border-white/60 shadow-xs transition-transform group-hover:scale-105"
                title={`Estancia #${roomNumber}`}
              >
                {roomNumber}
              </div>

              {/* 1. Input nombre estancia */}
              <input
                type="text"
                value={marker.name || ''}
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
                onChange={(e) => onUpdateMarker(marker.id, { name: e.target.value })}
                className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none focus:bg-slate-50 px-1.5 py-0.5 rounded"
                placeholder="Nombre estancia"
                title="1. Nombre de estancia"
              />

              {/* 2. Input m² */}
              <div
                className="flex items-center gap-1 shrink-0 w-24"
                title="2. Superficie en m²"
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={marker.areaSqMeters !== undefined && marker.areaSqMeters > 0 ? marker.areaSqMeters : ''}
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    onUpdateMarker(marker.id, { areaSqMeters: isNaN(val as number) ? 0 : val });
                  }}
                  placeholder="0,00"
                  className="w-16 text-right text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 rounded px-1.5 py-1 text-slate-800 font-bold focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 font-medium">m²</span>
              </div>

              {/* 3. Botón para reubicar número en el plano */}
              <button
                type="button"
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMarker(marker.id);
                  if (!isPinningMode) onTogglePinningMode();
                }}
                className={`p-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                  isSelected && isPinningMode
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title="3. Ubicar / mover el número en el plano"
              >
                <span className="material-symbols-outlined text-[16px]">pin_drop</span>
              </button>

              {/* Botón eliminar */}
              <button
                type="button"
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMarker(marker.id);
                }}
                className="p-1 text-slate-300 hover:text-red-600 rounded transition shrink-0 cursor-pointer"
                title="Eliminar estancia"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
          );
        })}

        {markers.length === 0 && !isAddingRoom && (
          <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No hay estancias añadidas. Haz clic en "Añadir estancia" o "Pinchar en plano" para crear la primera.
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
