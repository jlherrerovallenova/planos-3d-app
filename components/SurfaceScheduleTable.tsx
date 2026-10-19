import React, { useMemo, useState } from 'react';
import { RoomMarker, RoomCategory } from '../types';
import { categorizeRoomsForSchedule } from '../services/roomSorter';

interface SurfaceScheduleTableProps {
  markers: RoomMarker[];
  markerBadgeColor?: string;
  className?: string;
  showTotal?: boolean;
  onUpdateMarker?: (id: string, updates: Partial<RoomMarker>) => void;
  onAddMarker?: (category: RoomCategory, name?: string, area?: number) => void;
  onDeleteMarker?: (id: string) => void;
  customTotalUsefulArea?: number;
  onChangeCustomTotalUsefulArea?: (total: number | undefined) => void;
  isEditable?: boolean;
}

export function SurfaceScheduleTable({
  markers,
  markerBadgeColor = '#0E3B64',
  className = '',
  showTotal = true,
  onUpdateMarker,
  onAddMarker,
  onDeleteMarker,
  customTotalUsefulArea,
  onChangeCustomTotalUsefulArea,
  isEditable = true
}: SurfaceScheduleTableProps) {
  const schedule = useMemo(
    () => categorizeRoomsForSchedule(markers || [], customTotalUsefulArea),
    [markers, customTotalUsefulArea]
  );
  const primaryNavy = '#0E3B64';
  const textDarkNavy = '#0F2F4E';
  const skyBlueBar = '#A8D4F2';

  // Estados de edición en línea
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editArea, setEditArea] = useState<string>('');

  // Estados para añadir nueva estancia manualmente
  const [isAddingRoom, setIsAddingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('Salón - Comedor');
  const [newRoomArea, setNewRoomArea] = useState<string>('');
  const [newRoomCategory, setNewRoomCategory] = useState<RoomCategory>('salon_comedor');

  const [isEditingTotal, setIsEditingTotal] = useState<boolean>(false);
  const [editTotal, setEditTotal] = useState<string>('');

  const canEdit = isEditable && !!onUpdateMarker;
  const canAdd = isEditable && !!onAddMarker;

  // Iniciar edición de una estancia
  const startEditingRoom = (marker: RoomMarker) => {
    if (!canEdit) return;
    setEditingRoomId(marker.id);
    setEditName(marker.name);
    setEditArea(marker.areaSqMeters !== undefined && marker.areaSqMeters !== null ? String(marker.areaSqMeters) : '');
  };

  // Guardar cambios de la estancia
  const saveRoomEdit = (id: string) => {
    if (!onUpdateMarker) return;
    const trimmedName = editName.trim();
    const parsedArea = editArea.trim() === '' ? undefined : parseFloat(editArea.replace(',', '.'));
    onUpdateMarker(id, {
      name: trimmedName || 'Estancia',
      areaSqMeters: isNaN(parsedArea as number) ? undefined : parsedArea
    });
    setEditingRoomId(null);
  };

  // Añadir nueva estancia manualmente
  const handleSaveNewRoom = () => {
    if (!onAddMarker) return;
    const trimmedName = newRoomName.trim() || 'Nueva Estancia';
    const parsedArea = newRoomArea.trim() === '' ? undefined : parseFloat(newRoomArea.replace(',', '.'));
    onAddMarker(newRoomCategory, trimmedName, isNaN(parsedArea as number) ? undefined : parsedArea);
    setNewRoomName('');
    setNewRoomArea('');
    setIsAddingRoom(false);
  };

  const cancelRoomEdit = () => {
    setEditingRoomId(null);
  };

  // Iniciar edición de la superficie total
  const startEditingTotal = () => {
    if (!onChangeCustomTotalUsefulArea) return;
    setIsEditingTotal(true);
    setEditTotal(schedule.grandTotal > 0 ? String(schedule.grandTotal) : '');
  };

  // Guardar superficie total
  const saveTotalEdit = () => {
    if (!onChangeCustomTotalUsefulArea) return;
    const parsed = editTotal.trim() === '' ? undefined : parseFloat(editTotal.replace(',', '.'));
    if (parsed === undefined || isNaN(parsed) || parsed <= 0) {
      onChangeCustomTotalUsefulArea(undefined);
    } else {
      onChangeCustomTotalUsefulArea(parsed);
    }
    setIsEditingTotal(false);
  };

  const cancelTotalEdit = () => {
    setIsEditingTotal(false);
  };

  const resetToAutoTotal = () => {
    if (onChangeCustomTotalUsefulArea) {
      onChangeCustomTotalUsefulArea(undefined);
    }
  };

  // Formateador con coma decimal española (ej. 20,25 m²)
  const formatM2 = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
  };

  const hasInterior = schedule.interiorRooms.length > 0;
  const hasExterior = schedule.exteriorRooms.length > 0;
  const isEmpty = schedule.sortedMarkers.length === 0;

  const renderRoomRow = (marker: RoomMarker, displayNum: string) => {
    const isThisEditing = editingRoomId === marker.id;

    if (isThisEditing) {
      return (
        <div
          key={marker.id}
          className="flex items-center gap-1.5 py-1 px-1.5 bg-blue-50/80 border border-blue-300 rounded-lg shadow-2xs my-0.5"
        >
          <span className="font-extrabold text-[12px] shrink-0" style={{ color: primaryNavy }}>
            {displayNum}
          </span>
          <input
            type="text"
            aria-label="Nombre de la estancia"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRoomEdit(marker.id);
              if (e.key === 'Escape') cancelRoomEdit();
            }}
            placeholder="Nombre"
            className="flex-1 min-w-0 bg-white border border-stone-300 rounded px-1.5 py-0.5 text-[12px] font-bold text-stone-900 uppercase"
            autoFocus
          />
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              aria-label="Superficie útil en m²"
              value={editArea}
              onChange={(e) => setEditArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRoomEdit(marker.id);
                if (e.key === 'Escape') cancelRoomEdit();
              }}
              placeholder="m²"
              className="w-14 bg-white border border-stone-300 rounded px-1 py-0.5 text-[12px] font-mono font-bold text-stone-900 text-right"
            />
            <span className="text-[10px] text-stone-500 font-semibold">m²</span>
          </div>
          <button
            type="button"
            onClick={() => saveRoomEdit(marker.id)}
            className="p-1 rounded bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition"
            title="Guardar cambios"
          >
            <span className="material-symbols-outlined text-[13px] block">check</span>
          </button>
          <button
            type="button"
            onClick={cancelRoomEdit}
            className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer transition"
            title="Cancelar"
          >
            <span className="material-symbols-outlined text-[13px] block">close</span>
          </button>
        </div>
      );
    }

    return (
      <div
        key={marker.id || `room-${marker.name}`}
        onClick={() => canEdit && startEditingRoom(marker)}
        className={`group flex items-baseline justify-between gap-2 py-0.5 px-1 rounded transition-colors ${
          canEdit ? 'hover:bg-blue-50/60 cursor-pointer' : ''
        }`}
        title={canEdit ? 'Haz clic para editar nombre o superficie' : undefined}
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="font-extrabold text-[13px] shrink-0"
            style={{ color: primaryNavy }}
          >
            {displayNum}
          </span>
          <span
            className="font-semibold text-[13px] uppercase truncate"
            style={{ color: textDarkNavy }}
            title={marker.name}
          >
            {marker.name}
          </span>
          {canEdit && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 group-hover:text-blue-600 text-[11px] shrink-0">
              ✎
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="font-extrabold text-[13px] whitespace-nowrap text-right"
            style={{ color: primaryNavy }}
          >
            {formatM2(marker.areaSqMeters)}
          </span>
          {onDeleteMarker && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteMarker(marker.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-red-600 rounded transition cursor-pointer"
              title={`Eliminar estancia ${marker.name}`}
            >
              <span className="material-symbols-outlined text-[13px] block">delete</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`bg-white px-3 sm:px-4 py-2 max-w-[340px] w-full select-none font-schedule ${className}`}
    >
      {/* Título Principal de la Ficha con Indicador de Edición */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3
          className="text-[15.5px] font-black uppercase tracking-tight text-center sm:text-left"
          style={{ color: primaryNavy }}
        >
          CUADRO DE SUPERFICIES ÚTILES
        </h3>
        {canEdit && (
          <span
            className="text-[10px] font-bold text-stone-400 uppercase tracking-wider bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200"
            title="Haz clic sobre cualquier estancia o superficie para editarla directamente"
          >
            Editable
          </span>
        )}
      </div>

      {/* Franja decorativa azul marino gruesa bajo el título */}
      <div
        className="h-[3.5px] mb-3 w-full"
        style={{ backgroundColor: primaryNavy }}
      />

      {/* Contenido de la Tabla */}
      {isEmpty ? (
        <div className="py-4 text-center text-stone-500 text-xs space-y-2.5">
          <p className="text-stone-400 italic">Sin estancias registradas en el plano.</p>
          {canAdd && (
            <button
              type="button"
              onClick={() => setIsAddingRoom(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>+ Añadir Estancias y m² Manualmente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1 text-[13px] leading-tight">
          {/* 1. Estancias Útiles Interiores */}
          {schedule.interiorRooms.map((marker, index) => {
            const numFormatted = String(index + 1).padStart(2, '0') + '.';
            return renderRoomRow(marker, numFormatted);
          })}

          {/* 2. Subtotal Útil Interior (Solo si hay estancias exteriores para separar) */}
          {hasInterior && hasExterior && (
            <>
              <div
                className="my-1.5 border-t w-full"
                style={{ borderColor: `${primaryNavy}70` }}
              />
              <div className="flex items-baseline justify-between py-0.5 px-1">
                <span
                  className="text-[13px] font-extrabold uppercase tracking-tight"
                  style={{ color: primaryNavy }}
                >
                  ÚTIL TOTAL INTERIOR
                </span>
                <span
                  className="text-[13px] font-extrabold"
                  style={{ color: primaryNavy }}
                >
                  {formatM2(schedule.interiorTotal)}
                </span>
              </div>
              <div
                className="my-1.5 border-t w-full"
                style={{ borderColor: `${primaryNavy}70` }}
              />

              {/* 3. Estancias Exteriores (Terraza, Tendedero, Balcón, etc.) */}
              {schedule.exteriorRooms.map((marker, idx) => {
                const numFormatted =
                  String(schedule.interiorRooms.length + idx + 1).padStart(2, '0') + '.';
                return renderRoomRow(marker, numFormatted);
              })}
            </>
          )}

          {/* Botón y Formulario en Línea para Añadir Nueva Estancia Manualmente */}
          {canAdd && (
            <div className="pt-1.5 pb-0.5">
              {isAddingRoom ? (
                <div className="p-2 bg-blue-50/90 border border-blue-300 rounded-xl space-y-2 shadow-xs animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-950">
                    <span>Añadir Estancia #{schedule.sortedMarkers.length + 1}</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingRoom(false)}
                      className="text-stone-400 hover:text-stone-700 cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Sugerencias Rápidas de Nombres */}
                  <div className="flex flex-wrap gap-1">
                    {['Salón - Comedor', 'Cocina', 'Dormitorio 1', 'Dormitorio 2', 'Baño 1', 'Aseo', 'Terraza', 'Pasillo'].map((quickName) => (
                      <button
                        key={quickName}
                        type="button"
                        onClick={() => {
                          setNewRoomName(quickName);
                          if (quickName.includes('Cocina')) setNewRoomCategory('cocina');
                          else if (quickName.includes('Dormitorio')) setNewRoomCategory('dormitorio_secundario');
                          else if (quickName.includes('Baño') || quickName.includes('Aseo')) setNewRoomCategory('bano_principal');
                          else if (quickName.includes('Terraza')) setNewRoomCategory('terraza_balcon');
                          else setNewRoomCategory('salon_comedor');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                          newRoomName === quickName
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {quickName}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Nombre estancia"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="flex-1 min-w-0 bg-white border border-stone-300 rounded px-1.5 py-1 text-xs font-bold uppercase text-stone-900"
                      autoFocus
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="m²"
                        value={newRoomArea}
                        onChange={(e) => setNewRoomArea(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewRoom();
                          if (e.key === 'Escape') setIsAddingRoom(false);
                        }}
                        className="w-16 bg-white border border-stone-300 rounded px-1.5 py-1 text-xs font-mono font-bold text-stone-900 text-right"
                      />
                      <span className="text-[10px] font-bold text-stone-500">m²</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveNewRoom}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer transition shadow-xs shrink-0 flex items-center gap-1"
                      title="Añadir estancia y calcular total"
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(true)}
                  className="w-full py-1.5 px-2 border border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer my-1 shadow-2xs"
                  title="Añadir manualmente número, nombre y m² de estancia"
                >
                  <span className="material-symbols-outlined text-[16px] text-blue-600">add_circle</span>
                  <span>+ Añadir Estancia y Superficie (m²)</span>
                </button>
              )}
            </div>
          )}

          {/* Línea divisoria antes del Total */}
          {showTotal && schedule.grandTotal > 0 && (
            <>
              <div
                className="my-2 border-t w-full"
                style={{ borderColor: primaryNavy }}
              />

              {/* Total Superficie Útil (Editable) */}
              {isEditingTotal ? (
                <div className="flex items-center gap-1.5 py-1 px-1 bg-amber-50 border border-amber-300 rounded-lg shadow-2xs">
                  <span className="text-[11.5px] font-black uppercase text-amber-950 shrink-0">
                    TOTAL:
                  </span>
                  <input
                    type="text"
                    aria-label="Superficie útil total en m²"
                    value={editTotal}
                    onChange={(e) => setEditTotal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTotalEdit();
                      if (e.key === 'Escape') cancelTotalEdit();
                    }}
                    placeholder="m² totales"
                    className="flex-1 min-w-0 bg-white border border-stone-300 rounded px-1.5 py-0.5 text-[12px] font-mono font-bold text-stone-900 text-right"
                    autoFocus
                  />
                  <span className="text-[11px] text-stone-500 font-bold shrink-0">m²</span>
                  <button
                    type="button"
                    onClick={saveTotalEdit}
                    className="p-1 rounded bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition"
                    title="Guardar total"
                  >
                    <span className="material-symbols-outlined text-[13px] block">check</span>
                  </button>
                  <button
                    type="button"
                    onClick={cancelTotalEdit}
                    className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer transition"
                    title="Cancelar"
                  >
                    <span className="material-symbols-outlined text-[13px] block">close</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => onChangeCustomTotalUsefulArea && startEditingTotal()}
                  className={`group flex items-baseline justify-between pb-1 px-1 rounded transition-colors ${
                    onChangeCustomTotalUsefulArea ? 'hover:bg-amber-50/70 cursor-pointer' : ''
                  }`}
                  title={
                    onChangeCustomTotalUsefulArea
                      ? schedule.isCustomGrandTotal
                        ? 'Total personalizado manual. Haz clic para cambiarlo o pulsa [Auto] para restablecer el cálculo automático.'
                        : 'Haz clic para especificar un total manual personalizado.'
                      : undefined
                  }
                >
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-[13.5px] font-black uppercase tracking-tight"
                      style={{ color: primaryNavy }}
                    >
                      SUPERFICIE ÚTIL TOTAL
                    </span>
                    {schedule.isCustomGrandTotal && (
                      <span className="text-[9.5px] font-extrabold uppercase px-1 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                        Manual
                      </span>
                    )}
                    {onChangeCustomTotalUsefulArea && !schedule.isCustomGrandTotal && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 group-hover:text-amber-700 text-[11px]">
                        ✎
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-[14px] font-black"
                      style={{ color: primaryNavy }}
                    >
                      {formatM2(schedule.grandTotal)}
                    </span>
                    {schedule.isCustomGrandTotal && onChangeCustomTotalUsefulArea && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetToAutoTotal();
                        }}
                        className="text-[9px] font-bold text-blue-700 hover:text-blue-900 hover:underline px-1 py-0.5 rounded bg-blue-50 border border-blue-200 cursor-pointer ml-1"
                        title={`Restablecer cálculo automático (Suma real: ${formatM2(schedule.calculatedGrandTotal)})`}
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!isEditingTotal && !schedule.isCustomGrandTotal && schedule.sortedMarkers.length > 0 && (
                <div className="text-[9.5px] text-blue-800/80 font-semibold text-right pr-1">
                  ✓ Suma calculada automáticamente ({schedule.sortedMarkers.length} {schedule.sortedMarkers.length === 1 ? 'estancia' : 'estancias'})
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Franja decorativa celeste / azul cielo inferior de la ficha */}
      <div
        className="h-[5px] w-full mt-2.5"
        style={{ backgroundColor: skyBlueBar }}
      />
    </div>
  );
}

export default SurfaceScheduleTable;

