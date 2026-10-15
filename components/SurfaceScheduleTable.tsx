import React, { useMemo } from 'react';
import { RoomMarker } from '../types';
import { categorizeRoomsForSchedule } from '../services/roomSorter';

interface SurfaceScheduleTableProps {
  markers: RoomMarker[];
  markerBadgeColor?: string;
  className?: string;
  showTotal?: boolean;
}

export function SurfaceScheduleTable({
  markers,
  markerBadgeColor = '#0E3B64',
  className = '',
  showTotal = true
}: SurfaceScheduleTableProps) {
  const schedule = useMemo(() => categorizeRoomsForSchedule(markers || []), [markers]);
  const primaryNavy = '#0E3B64';
  const textDarkNavy = '#0F2F4E';
  const skyBlueBar = '#A8D4F2';

  // Formateador con coma decimal española (ej. 20,25 m²)
  const formatM2 = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
  };

  const hasInterior = schedule.interiorRooms.length > 0;
  const hasExterior = schedule.exteriorRooms.length > 0;
  const isEmpty = schedule.sortedMarkers.length === 0;

  return (
    <div
      className={`bg-white px-3 sm:px-4 py-2 max-w-[340px] w-full select-none font-schedule ${className}`}
    >
      {/* Título Principal de la Ficha */}
      <h3
        className="text-[15.5px] font-black uppercase tracking-tight text-center sm:text-left mb-1.5"
        style={{ color: primaryNavy }}
      >
        CUADRO DE SUPERFICIES ÚTILES
      </h3>

      {/* Franja decorativa azul marino gruesa bajo el título */}
      <div
        className="h-[3.5px] mb-3 w-full"
        style={{ backgroundColor: primaryNavy }}
      />

      {/* Contenido de la Tabla */}
      {isEmpty ? (
        <div className="py-5 text-center text-stone-400 text-xs italic">
          Sin estancias registradas.
          <br />
          Pulsa en "Extraer estancias y m² con IA".
        </div>
      ) : (
        <div className="space-y-1 text-[13px] leading-tight">
          {/* 1. Estancias Útiles Interiores */}
          {schedule.interiorRooms.map((marker, index) => {
            const numFormatted = String(index + 1).padStart(2, '0') + '.';
            return (
              <div
                key={marker.id || `${marker.name}-${marker.areaSqMeters ?? index}`}
                className="flex items-baseline justify-between gap-2 py-0.5"
              >
                <div className="flex items-baseline gap-2 min-w-0">
                  <span
                    className="font-extrabold text-[13px] shrink-0"
                    style={{ color: primaryNavy }}
                  >
                    {numFormatted}
                  </span>
                  <span
                    className="font-semibold text-[13px] uppercase truncate"
                    style={{ color: textDarkNavy }}
                    title={marker.name}
                  >
                    {marker.name}
                  </span>
                </div>

                <span
                  className="font-extrabold text-[13px] whitespace-nowrap text-right shrink-0"
                  style={{ color: primaryNavy }}
                >
                  {formatM2(marker.areaSqMeters)}
                </span>
              </div>
            );
          })}

          {/* 2. Subtotal Útil Interior (Solo si hay estancias exteriores para separar) */}
          {hasInterior && hasExterior && (
            <>
              <div
                className="my-1.5 border-t w-full"
                style={{ borderColor: `${primaryNavy}70` }}
              />
              <div className="flex items-baseline justify-between py-0.5">
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
                return (
                  <div
                    key={marker.id || `${marker.name}-${marker.areaSqMeters ?? idx}`}
                    className="flex items-baseline justify-between gap-2 py-0.5"
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span
                        className="font-extrabold text-[13px] shrink-0"
                        style={{ color: primaryNavy }}
                      >
                        {numFormatted}
                      </span>
                      <span
                        className="font-semibold text-[13px] uppercase truncate"
                        style={{ color: textDarkNavy }}
                        title={marker.name}
                      >
                        {marker.name}
                      </span>
                    </div>

                    <span
                      className="font-extrabold text-[13px] whitespace-nowrap text-right shrink-0"
                      style={{ color: primaryNavy }}
                    >
                      {formatM2(marker.areaSqMeters)}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* Línea divisoria antes del Total */}
          {showTotal && schedule.grandTotal > 0 && (
            <>
              <div
                className="my-2 border-t w-full"
                style={{ borderColor: primaryNavy }}
              />

              {/* Total Superficie Útil */}
              <div className="flex items-baseline justify-between pb-1">
                <span
                  className="text-[13.5px] font-black uppercase tracking-tight"
                  style={{ color: primaryNavy }}
                >
                  SUPERFICIE ÚTIL TOTAL
                </span>
                <span
                  className="text-[14px] font-black"
                  style={{ color: primaryNavy }}
                >
                  {formatM2(schedule.grandTotal)}
                </span>
              </div>
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

