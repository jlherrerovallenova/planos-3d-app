import React, { useMemo, useState, useRef } from 'react';
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

const DEFAULT_SAMPLE_INTERIOR = [
  'Salón-comedor-cocina',
  'Dormitorio principal',
  'Dormitorio 2',
  'Baño 1',
  'Baño 2',
  'Distribuidor'
];

export function SurfaceScheduleTable({
  markers,
  markerBadgeColor = '#102A45',
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
  const primaryNavy = '#102A45';
  const textDarkNavy = '#0F2F4E';

  // Estados de edición en línea
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editArea, setEditArea] = useState<string>('');

  // Estados para añadir nueva estancia manualmente
  const [isAddingRoom, setIsAddingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('Salón - Comedor');
  const [newRoomArea, setNewRoomArea] = useState<string>('');
  const newRoomCategoryRef = useRef<RoomCategory>('salon_comedor');

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
    onAddMarker(newRoomCategoryRef.current, trimmedName, isNaN(parsedArea as number) ? undefined : parsedArea);
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
    if (val === undefined || val === null || isNaN(val) || val <= 0) return '— m²';
    return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
  };

  const hasInterior = schedule.interiorRooms.length > 0;
  const hasExterior = schedule.exteriorRooms.length > 0;
  const isEmpty = schedule.sortedMarkers.length === 0;

  const renderRoomRow = (marker: RoomMarker) => {
    const isThisEditing = editingRoomId === marker.id;

    if (isThisEditing) {
      return (
        <div
          key={marker.id}
          className="flex items-center gap-1.5 py-1 px-1.5 bg-blue-50/80 border border-blue-300 rounded-lg shadow-2xs my-0.5"
        >
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
            className="flex-1 min-w-0 bg-white border border-stone-300 rounded px-1.5 py-0.5 text-[12px] font-semibold text-stone-900"
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
            aria-label="Guardar cambios"
          >
            <span className="material-symbols-outlined text-[13px] block">check</span>
          </button>
          <button
            type="button"
            onClick={cancelRoomEdit}
            className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer transition"
            title="Cancelar"
            aria-label="Cancelar"
          >
            <span className="material-symbols-outlined text-[13px] block">close</span>
          </button>
        </div>
      );
    }

    return (
      <div
        key={marker.id || `room-${marker.name}`}
        className="group flex items-center justify-between gap-2 py-1.5 border-b border-stone-200/80 transition-colors"
      >
        {canEdit ? (
          <button
            type="button"
            onClick={() => startEditingRoom(marker)}
            className="flex-1 flex items-center justify-between gap-2 min-w-0 text-left hover:bg-blue-50/50 -mx-1 px-1 py-0.5 rounded cursor-pointer transition-colors"
            title="Haz clic para editar nombre o superficie"
            aria-label={`Editar estancia ${marker.name}`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="font-medium text-[12.5px] truncate text-stone-800"
                title={marker.name}
              >
                {marker.name}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 group-hover:text-blue-600 text-[10px] shrink-0">
                ✎
              </span>
            </div>

            <span className="font-medium text-[12px] whitespace-nowrap text-right text-stone-600 shrink-0 font-sans">
              {formatM2(marker.areaSqMeters)}
            </span>
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
            <span
              className="font-medium text-[12.5px] truncate text-stone-800"
              title={marker.name}
            >
              {marker.name}
            </span>
            <span className="font-medium text-[12px] whitespace-nowrap text-right text-stone-600 shrink-0 font-sans">
              {formatM2(marker.areaSqMeters)}
            </span>
          </div>
        )}

        {canEdit && onDeleteMarker && (
          <button
            type="button"
            onClick={() => onDeleteMarker(marker.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-red-600 rounded transition cursor-pointer shrink-0"
            title={`Eliminar estancia ${marker.name}`}
            aria-label={`Eliminar estancia ${marker.name}`}
          >
            <span className="material-symbols-outlined text-[13px] block">delete</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={`bg-white w-full select-none font-sans ${className}`}
    >
      {/* Título Principal de la Ficha con Indicador de Edición */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-0.5">
        <h3
          className="text-[12px] font-black uppercase tracking-wider text-[#102A45]"
        >
          CUADRO DE SUPERFICIES ÚTILES
        </h3>
        {canEdit && (
          <span
            className="text-[9.5px] font-bold text-stone-400 uppercase tracking-wider bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200"
            title="Haz clic sobre cualquier estancia o superficie para editarla directamente"
          >
            Editable
          </span>
        )}
      </div>

      {/* Contenido de la Tabla */}
      {isEmpty ? (
        /* Muestra el diseño plantilla idéntico a la referencia cuando aún no hay marcas */
        <div className="w-full text-left">
          {DEFAULT_SAMPLE_INTERIOR.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between py-1.5 border-b border-stone-200/80 text-[12.5px]"
            >
              <span className="font-medium text-stone-800">{name}</span>
              <span className="font-medium text-stone-600 text-right">— m²</span>
            </div>
          ))}

          {/* Subtotal interior plantilla */}
          <div className="flex items-center justify-between py-1.5 border-b border-stone-300 text-[12.5px] font-bold text-stone-900">
            <span>Superficie útil interior</span>
            <span className="font-bold text-[#102A45]">— m²</span>
          </div>

          {/* Terrazas plantilla */}
          <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80 text-[12.5px]">
            <span className="font-medium text-stone-800">Terrazas</span>
            <span className="font-medium text-stone-600 text-right">— m²</span>
          </div>
        </div>
      ) : (
        <div className="w-full text-left">
          {/* 1. Estancias Útiles Interiores */}
          {schedule.interiorRooms.map((marker) => renderRoomRow(marker))}

          {/* 2. Subtotal Útil Interior */}
          <div className="flex items-center justify-between py-1.5 border-b border-stone-300 text-[12.5px] font-bold text-stone-900">
            <span>Superficie útil interior</span>
            <span className="font-bold text-[#102A45]">
              {formatM2(schedule.interiorTotal)}
            </span>
          </div>

          {/* 3. Estancias Exteriores (Terrazas, Balcones, etc.) */}
          {hasExterior ? (
            schedule.exteriorRooms.map((marker) => renderRoomRow(marker))
          ) : (
            <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80 text-[12.5px]">
              <span className="font-medium text-stone-800">Terrazas</span>
              <span className="font-medium text-stone-600 text-right">— m²</span>
            </div>
          )}
        </div>
      )}

      {/* Botón y Formulario en Línea para Añadir Nueva Estancia Manualmente */}
      {canAdd && (
        <div className="pt-2">
          {isAddingRoom ? (
            <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl space-y-2 shadow-xs animate-fadeIn">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-950">
                <span>Añadir Estancia #{schedule.sortedMarkers.length + 1}</span>
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(false)}
                  className="text-stone-400 hover:text-stone-700 cursor-pointer text-xs"
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              {/* Sugerencias Rápidas de Nombres */}
              <div className="flex flex-wrap gap-1">
                {['Salón-comedor-cocina', 'Dormitorio principal', 'Dormitorio 2', 'Baño 1', 'Baño 2', 'Distribuidor', 'Terrazas'].map((quickName) => (
                  <button
                    key={quickName}
                    type="button"
                    onClick={() => {
                      setNewRoomName(quickName);
                      if (quickName.includes('Cocina')) newRoomCategoryRef.current = 'cocina';
                      else if (quickName.includes('Dormitorio')) newRoomCategoryRef.current = 'dormitorio_secundario';
                      else if (quickName.includes('Baño') || quickName.includes('Aseo')) newRoomCategoryRef.current = 'bano_principal';
                      else if (quickName.includes('Terraza')) newRoomCategoryRef.current = 'terraza_balcon';
                      else newRoomCategoryRef.current = 'salon_comedor';
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
                  aria-label="Nombre de la estancia"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-stone-300 rounded px-1.5 py-1 text-xs font-semibold text-stone-900"
                  autoFocus
                />
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="m²"
                    aria-label="Superficie en metros cuadrados"
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
                  className="px-2 py-1 bg-[#102A45] hover:bg-blue-900 text-white rounded text-xs font-bold cursor-pointer transition shadow-xs shrink-0 flex items-center gap-1"
                  title="Añadir estancia y calcular total"
                  aria-label="Añadir estancia"
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
              className="w-full py-1 px-2 border border-dashed border-stone-300 hover:border-blue-500 bg-stone-50/60 hover:bg-blue-50/50 text-stone-600 hover:text-blue-700 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer my-1"
              title="Añadir una estancia adicional a la tabla"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>
              <span>+ Añadir estancia a la tabla</span>
            </button>
          )}
        </div>
      )}

      {/* 4. TOTAL GENERAL OFICIAL EN BARRA AZUL CELESTE */}
      {showTotal && (
        <div className="mt-2.5">
          {isEditingTotal ? (
            <div className="flex items-center gap-1.5 py-1 px-2 bg-blue-50 border border-blue-300 rounded-lg shadow-2xs">
              <span className="text-[11px] font-black uppercase text-blue-950 shrink-0">
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
                className="p-1 rounded bg-[#102A45] hover:bg-blue-900 text-white cursor-pointer transition"
                title="Guardar total"
                aria-label="Guardar total"
              >
                <span className="material-symbols-outlined text-[13px] block">check</span>
              </button>
              <button
                type="button"
                onClick={cancelTotalEdit}
                className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer transition"
                title="Cancelar"
                aria-label="Cancelar"
              >
                <span className="material-symbols-outlined text-[13px] block">close</span>
              </button>
            </div>
          ) : onChangeCustomTotalUsefulArea ? (
            <div className="bg-[#E1EEF9] rounded-lg px-3 py-2 flex items-center justify-between text-[#102A45]">
              <button
                type="button"
                onClick={startEditingTotal}
                className="flex-1 flex items-center justify-between gap-2 text-left cursor-pointer"
                title={
                  schedule.isCustomGrandTotal
                    ? 'Total personalizado manual. Haz clic para cambiarlo o pulsa [Auto] para restablecer el cálculo automático.'
                    : 'Haz clic para especificar un total manual personalizado.'
                }
                aria-label="Superficie útil total. Haz clic para editar"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-black uppercase tracking-tight text-[#102A45]">
                    SUPERFICIE ÚTIL TOTAL
                  </span>
                  {schedule.isCustomGrandTotal && (
                    <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 bg-white text-[#102A45] border border-blue-300 rounded">
                      Manual
                    </span>
                  )}
                  {!schedule.isCustomGrandTotal && (
                    <span className="opacity-0 hover:opacity-100 transition-opacity text-blue-600 text-[10px]">
                      ✎
                    </span>
                  )}
                </div>

                <span className="text-[13.5px] font-black text-[#102A45] font-sans">
                  {formatM2(schedule.grandTotal)}
                </span>
              </button>

              {schedule.isCustomGrandTotal && (
                <button
                  type="button"
                  onClick={resetToAutoTotal}
                  className="text-[9px] font-bold text-blue-700 hover:text-blue-900 hover:underline px-1 py-0.5 rounded bg-white border border-blue-200 cursor-pointer ml-1.5 shrink-0"
                  title={`Restablecer cálculo automático (Suma real: ${formatM2(schedule.calculatedGrandTotal)})`}
                  aria-label="Restablecer cálculo automático"
                >
                  Auto
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#E1EEF9] rounded-lg px-3 py-2 flex items-center justify-between text-[#102A45]">
              <span className="text-[12px] font-black uppercase tracking-tight text-[#102A45]">
                SUPERFICIE ÚTIL TOTAL
              </span>
              <span className="text-[13.5px] font-black text-[#102A45] font-sans">
                {formatM2(schedule.grandTotal)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
