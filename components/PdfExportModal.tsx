import React, { useState } from 'react';
import { RoomMarker } from '../types';
import {
  exportCommercialBrochurePDF,
  exportPlanOnlyPDF,
  exportCommercialBrochureImage
} from '../services/downloadHelper';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  projectTitle: string;
  markers: RoomMarker[];
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  agencyLogo?: string | null;
  unitIdentifier?: string;
}

export function PdfExportModal({
  isOpen,
  onClose,
  imageSrc,
  projectTitle,
  markers,
  markerBadgeColor,
  promotionLogo,
  agencyLogo,
  unitIdentifier
}: PdfExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'brochure_a4' | 'plan_a4' | 'plan_a3' | 'brochure_png'>('brochure_a4');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!imageSrc) return;
    setIsExporting(true);
    setSuccessMessage(null);

    const safeTitle = projectTitle.trim() || 'Proyecto_Residencial';

    try {
      if (selectedFormat === 'brochure_a4') {
        await exportCommercialBrochurePDF({
          imageSrc,
          projectTitle: safeTitle,
          markers,
          markerBadgeColor,
          promotionLogo,
          agencyLogo,
          unitIdentifier,
          filename: `ficha_vectorial_${safeTitle.toLowerCase().replace(/[^\w]/g, '_')}.pdf`
        });
      } else if (selectedFormat === 'plan_a4') {
        await exportPlanOnlyPDF({
          imageSrc,
          projectTitle: safeTitle,
          paperFormat: 'a4',
          markers,
          markerBadgeColor,
          promotionLogo,
          agencyLogo,
          filename: `plano_completo_a4_${safeTitle.toLowerCase().replace(/[^\w]/g, '_')}.pdf`
        });
      } else if (selectedFormat === 'plan_a3') {
        await exportPlanOnlyPDF({
          imageSrc,
          projectTitle: safeTitle,
          paperFormat: 'a3',
          markers,
          markerBadgeColor,
          promotionLogo,
          agencyLogo,
          filename: `plano_gran_formato_a3_${safeTitle.toLowerCase().replace(/[^\w]/g, '_')}.pdf`
        });
      } else if (selectedFormat === 'brochure_png') {
        await exportCommercialBrochureImage({
          imageSrc,
          projectTitle: safeTitle,
          markers,
          markerBadgeColor,
          promotionLogo,
          agencyLogo,
          unitIdentifier,
          filename: `ficha_comercial_hd_${safeTitle.toLowerCase().replace(/[^\w]/g, '_')}.png`
        });
      }

      setSuccessMessage('¡Documento descargado con éxito!');
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1200);
    } catch (err) {
      console.error('Error al exportar:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden text-stone-800">
        {/* Encabezado */}
        <div className="p-5 bg-gradient-to-r from-[#0F2C59] to-[#1A365D] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-[24px] text-red-400">picture_as_pdf</span>
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Exportar Documento PDF de Alta Calidad</h3>
              <p className="text-xs text-blue-200">Textos vectoriales nítidos a cualquier nivel de zoom</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            aria-label="Cerrar modal de exportación PDF"
            className="text-white/60 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Opciones */}
        <div className="p-6 space-y-4">
          {/* Logos Corporativos Incluidos en el PDF */}
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200/90 shadow-2xs flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-stone-800">
                  Membrete Oficial en Ficha y PDF
                  {unitIdentifier && <span className="ml-2 font-mono text-[11px] text-[#0F2C59] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">[{unitIdentifier}]</span>}
                </p>
                <p className="text-[10px] text-stone-500">Comercializa: Terravall • Promueve: Lubens Arroyo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Tarjeta COMERCIALIZA sin borde */}
              <div className="bg-white px-2 py-0.5 rounded-xl flex flex-col items-center justify-center">
                <span className="text-[7.5px] font-black text-[#991B1B] leading-none mb-0.5">COMERCIALIZA</span>
                <img
                  src={agencyLogo || '/logo_terravall.png'}
                  alt="Comercializa Terravall"
                  className="h-5 w-auto max-w-[95px] object-contain"
                />
              </div>

              {/* Logo Promoción Lubens sin borde */}
              <div className="bg-white px-2.5 py-1 rounded-xl flex items-center justify-center">
                <img
                  src={promotionLogo || '/logo_promocion.png'}
                  alt="Logo Lubens Arroyo"
                  className="h-6 w-auto max-w-[110px] object-contain"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-600 font-medium">
            Selecciona el formato de exportación para tu plano:
          </p>

          <div className="space-y-2.5">
            {/* Opción 1: Ficha Comercial Vectorial A4 */}
            <label
              onClick={() => setSelectedFormat('brochure_a4')}
              className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                selectedFormat === 'brochure_a4'
                  ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="pdfFormat"
                checked={selectedFormat === 'brochure_a4'}
                onChange={() => setSelectedFormat('brochure_a4')}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-stone-900">
                    Ficha Comercial Vectorial (A4 Horizontal)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Incluye el plano arquitectónico en alta resolución y el <strong>Cuadro de Superficies Útiles</strong> rotulado con textos vectoriales 100% nítidos e interactivos.
                </p>
              </div>
            </label>

            {/* Opción 2: Solo Plano A4 Página Completa */}
            <label
              onClick={() => setSelectedFormat('plan_a4')}
              className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                selectedFormat === 'plan_a4'
                  ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="pdfFormat"
                checked={selectedFormat === 'plan_a4'}
                onChange={() => setSelectedFormat('plan_a4')}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-stone-900">
                  Solo Plano a Escala Máxima (A4 Página Completa)
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  El plano ocupa el 100% de la hoja A4 sin tabla lateral. Ideal para examinar cotas, líneas y tabiquería con el mayor tamaño posible.
                </p>
              </div>
            </label>

            {/* Opción 3: Plano Gran Formato A3 */}
            <label
              onClick={() => setSelectedFormat('plan_a3')}
              className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                selectedFormat === 'plan_a3'
                  ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="pdfFormat"
                checked={selectedFormat === 'plan_a3'}
                onChange={() => setSelectedFormat('plan_a3')}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-stone-900">
                  Plano Gran Formato (A3 Técnico • 420 × 297 mm)
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Documento técnico de impresión en formato doble (A3) para planos de obra, proyectos y presentaciones de gran formato.
                </p>
              </div>
            </label>

            {/* Opción 4: Imagen PNG 300 DPI */}
            <label
              onClick={() => setSelectedFormat('brochure_png')}
              className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                selectedFormat === 'brochure_png'
                  ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="pdfFormat"
                checked={selectedFormat === 'brochure_png'}
                onChange={() => setSelectedFormat('brochure_png')}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-stone-900">
                  Imagen PNG de Alta Definición (2480 × 1754 px)
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Ficha comercial completa exportada en imagen transparente sin compresión, lista para web, redes sociales o folletos.
                </p>
              </div>
            </label>
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer / Botones */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting || !imageSrc}
            className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${isExporting ? 'animate-spin' : ''}`}>
              {isExporting ? 'autorenew' : 'download'}
            </span>
            <span>{isExporting ? 'Generando PDF...' : 'Descargar Archivo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
