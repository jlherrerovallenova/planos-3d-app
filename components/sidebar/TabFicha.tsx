import React from 'react';
import { RoomMarker } from '../../types';

interface TabFichaProps {
  projectTitle: string;
  onChangeProjectTitle: (val: string) => void;
  unitIdentifier: string;
  onChangeUnitIdentifier: (val: string) => void;
  promotionLogo?: string | null;
  onChangePromotionLogo?: (val: string | null) => void;
  promotorLogo?: string | null;
  onChangePromotorLogo?: (val: string | null) => void;
  commercialAgencyLogo?: string | null;
  onChangeCommercialAgencyLogo?: (val: string | null) => void;
  agencyPhone?: string | null;
  onChangeAgencyPhone?: (val: string | null) => void;
  onExportPDF: () => void;
  onExportPNG: () => void;
  onExportProjectZip: () => void;
  roomMarkers: RoomMarker[];
}

export function TabFicha({
  projectTitle,
  onChangeProjectTitle,
  unitIdentifier,
  onChangeUnitIdentifier,
  promotionLogo,
  onChangePromotionLogo,
  promotorLogo,
  onChangePromotorLogo,
  commercialAgencyLogo,
  onChangeCommercialAgencyLogo,
  agencyPhone,
  onChangeAgencyPhone,
  onExportPDF,
  onExportPNG,
  onExportProjectZip,
  roomMarkers
}: TabFichaProps) {
  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto max-h-full font-sans text-slate-800">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Ficha</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ficha comercial, cuadro de superficies y exportación.
        </p>
      </div>

      {/* Datos del Proyecto & Tipología */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-800 block">
          Datos de la vivienda
        </label>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            Nombre de la promoción
          </span>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => onChangeProjectTitle(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
            placeholder="Ej. Residencial · 140 viviendas"
          />
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            Portal, planta y letra
          </span>
          <input
            type="text"
            value={unitIdentifier}
            onChange={(e) => onChangeUnitIdentifier(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
            placeholder="Ej. Portal 1 · 1º A"
          />
        </div>
      </div>

      {/* Identidad de marca y logos */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-800 block">
          Identidad y contacto
        </label>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            Teléfono de comercialización
          </span>
          <input
            type="text"
            value={agencyPhone || ''}
            onChange={(e) => onChangeAgencyPhone && onChangeAgencyPhone(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
            placeholder="Ej. 983 34 21 32"
          />
        </div>
      </div>

      {/* Botones de Exportación */}
      <div className="space-y-2.5 pt-3 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-800 block">
          Descargas y exportación
        </label>

        <button
          onClick={onExportPDF}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
          <span>Descargar Ficha PDF Comercial</span>
        </button>

        <button
          onClick={onExportPNG}
          className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">image</span>
          <span>Descargar Render PNG</span>
        </button>

        <button
          onClick={onExportProjectZip}
          className="w-full py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">archive</span>
          <span>Exportar Todo (.ZIP)</span>
        </button>
      </div>
    </div>
  );
}
