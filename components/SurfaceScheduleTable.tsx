import React from 'react';
import { RoomMarker } from '../types';

interface SurfaceScheduleTableProps {
  markers: RoomMarker[];
  className?: string;
  showTotal?: boolean;
}

export function SurfaceScheduleTable({
  markers,
  className = '',
  showTotal = true
}: SurfaceScheduleTableProps) {
  // Calcular superficie total sumando las áreas existentes
  const totalArea = markers.reduce((acc, m) => acc + (m.areaSqMeters || 0), 0);

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
        style={{ color: '#0F2C59' }}
      >
        CUADRO DE SUPERFICIES ÚTILES
      </h3>

      {/* Franja decorativa azul marino gruesa idéntica a la captura */}
      <div
        className="h-1 rounded-full mb-3.5 w-full"
        style={{ backgroundColor: '#0F2C59' }}
      />

      {/* Lista de Estancias Numeradas */}
      <div className="space-y-1.5 text-[12px]">
        {markers.map((marker, index) => {
          const numFormatted = String(index + 1).padStart(2, '0') + '.';
          return (
            <div
              key={marker.id || index}
              className="flex items-baseline justify-between gap-3 py-0.5 border-b border-stone-100 last:border-b-0"
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className="font-black text-[12px] shrink-0 font-mono"
                  style={{ color: '#0F2C59' }}
                >
                  {numFormatted}
                </span>
                <span
                  className="font-bold text-[11.5px] uppercase truncate"
                  style={{ color: '#1B365D' }}
                  title={marker.name}
                >
                  {marker.name}
                </span>
              </div>

              <span
                className="font-black text-[12.5px] whitespace-nowrap text-right shrink-0"
                style={{ color: '#0F2C59' }}
              >
                {formatM2(marker.areaSqMeters)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total Superficie Útil */}
      {showTotal && markers.length > 0 && totalArea > 0 && (
        <div className="mt-3.5 pt-2.5 border-t-2 border-stone-200 flex items-center justify-between">
          <span
            className="text-[11px] font-black uppercase tracking-wider"
            style={{ color: '#0F2C59' }}
          >
            SUPERFICIE ÚTIL TOTAL
          </span>
          <span
            className="text-[13px] font-black"
            style={{ color: '#0F2C59' }}
          >
            {formatM2(totalArea)}
          </span>
        </div>
      )}
    </div>
  );
}

export default SurfaceScheduleTable;
