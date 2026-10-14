import React, { useMemo } from 'react';
import { RoomMarker } from '../types';
import { sortRoomMarkers } from '../services/roomSorter';

interface SurfaceScheduleTableProps {
  markers: RoomMarker[];
  markerBadgeColor?: string;
  className?: string;
  showTotal?: boolean;
}

export function SurfaceScheduleTable({
  markers,
  markerBadgeColor = '#0F2C59',
  className = '',
  showTotal = true
}: SurfaceScheduleTableProps) {
  const sortedMarkers = useMemo(() => sortRoomMarkers(markers), [markers]);
  const accentColor = markerBadgeColor || '#0F2C59';

  // Calcular superficie total sumando las áreas existentes
  const totalArea = sortedMarkers.reduce((acc, m) => acc + (m.areaSqMeters || 0), 0);

  // Formateador con coma decimal española (ej. 26,40)
  const formatM2 = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
  };

  return (
    <div
      className={`bg-white p-5 rounded-2xl shadow-md border border-stone-200/90 max-w-sm w-full select-none font-sans ${className}`}
      style={{
        boxShadow: '0 4px 20px -2px rgba(18, 50, 88, 0.08)'
      }}
    >
      {/* Título Principal de la Ficha */}
      <h3
        className="text-[13px] font-black uppercase tracking-wider mb-1.5 text-center sm:text-left"
        style={{ color: accentColor }}
      >
        CUADRO DE SUPERFICIES ÚTILES
      </h3>

      {/* Franja decorativa color personalizado */}
      <div
        className="h-1 rounded-full mb-3.5 w-full transition-colors duration-200"
        style={{ backgroundColor: accentColor }}
      />

      {/* Lista de Estancias Numeradas */}
      <div className="space-y-1.5 text-[12px]">
        {sortedMarkers.length === 0 ? (
          <div className="py-4 text-center text-stone-400 text-xs italic">
            Sin estancias registradas.
            <br />
            Pulsa en "Extraer estancias y m² con IA".
          </div>
        ) : (
          sortedMarkers.map((marker, index) => {
            const numFormatted = String(index + 1).padStart(2, '0') + '.';
          return (
            <div
              key={marker.id || index}
              className="flex items-baseline justify-between gap-3 py-0.5 border-b border-stone-100 last:border-b-0"
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className="font-black text-[12px] shrink-0 font-mono"
                  style={{ color: accentColor }}
                >
                  {numFormatted}
                </span>
                <span
                  className="font-bold text-[11.5px] uppercase truncate text-stone-800"
                  title={marker.name}
                >
                  {marker.name}
                </span>
              </div>

              <span
                className="font-black text-[12.5px] whitespace-nowrap text-right shrink-0"
                style={{ color: accentColor }}
              >
                {formatM2(marker.areaSqMeters)}
              </span>
            </div>
          );
        })
      )}
      </div>

      {/* Total Superficie Útil */}
      {showTotal && markers.length > 0 && totalArea > 0 && (
        <div className="mt-3.5 pt-2.5 border-t-2 border-stone-200 flex items-center justify-between">
          <span
            className="text-[11px] font-black uppercase tracking-wider"
            style={{ color: accentColor }}
          >
            SUPERFICIE ÚTIL TOTAL
          </span>
          <span
            className="text-[13px] font-black"
            style={{ color: accentColor }}
          >
            {formatM2(totalArea)}
          </span>
        </div>
      )}
    </div>
  );
}

export default SurfaceScheduleTable;
