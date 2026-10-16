/**
 * downloadHelper.ts
 * Utilidades seguras de descarga para Flow SDK y navegadores estándar.
 */

import { jsPDF } from 'jspdf';
import { sortRoomMarkers, categorizeRoomsForSchedule } from './roomSorter';
import { autoTrimWhitespace } from './planCropper';
import { DEFAULT_PROMOTION_LOGO } from './defaultPromotionLogo';
import { DEFAULT_AGENCY_LOGO } from './defaultAgencyLogo';

export function sanitizeFilename(filename: string): string {
  // Mantener solo caracteres alfanuméricos, guiones y puntos
  return filename
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

export function cleanBase64Data(base64: string): { cleanBase64: string; mimeType: string } {
  let cleanBase64 = base64.trim();
  let mimeType = 'image/png';

  // Si incluye encabezado data:mime;base64,...
  const match = cleanBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    cleanBase64 = match[2];
  }

  // Eliminar posibles saltos de línea o retornos de carro
  cleanBase64 = cleanBase64.replace(/[\r\n]+/g, '');

  return { cleanBase64, mimeType };
}

export async function safeDownloadFile({
  base64,
  mimeType,
  filename
}: {
  base64: string;
  mimeType?: string;
  filename: string;
}): Promise<boolean> {
  const sanitizedName = sanitizeFilename(filename);
  const { cleanBase64, mimeType: detectedMime } = cleanBase64Data(base64);
  const finalMime = mimeType || detectedMime;

  // 1. Intentar descargar a través de Flow SDK si está disponible
  const flowSdk = (window as any).Flow;
  if (flowSdk && typeof flowSdk.download === 'function') {
    try {
      await flowSdk.download({
        base64: cleanBase64,
        mimeType: finalMime,
        filename: sanitizedName
      });
      return true;
    } catch (err) {
      console.warn('Flow.download error, usando fallback del navegador:', err);
    }
  }

  // 2. Fallback estándar para navegador local (Blob + <a>)
  try {
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: finalMime });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = sanitizedName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    return false;
  }
}

export async function downloadJsonConfig(data: any, filename = 'plano-3d-preset.json'): Promise<boolean> {
  const jsonString = JSON.stringify(data, null, 2);
  const base64 = btoa(unescape(encodeURIComponent(jsonString)));
  return safeDownloadFile({
    base64,
    mimeType: 'application/json',
    filename
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return { r: 15, g: 44, b: 89 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getContrastColor(hex: string): '#FFFFFF' | '#18181B' {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 155 ? '#18181B' : '#FFFFFF';
}

export async function generateBrochureCanvas({
  imageSrc,
  projectTitle,
  markers,
  markerBadgeColor = '#0F2C59',
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  unitIdentifier = 'PORTAL 1 - 1º A',
  width = 2480,
  height = 1754
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  agencyLogo?: string | null;
  unitIdentifier?: string;
  width?: number;
  height?: number;
}): Promise<HTMLCanvasElement | null> {
  const trimRes = await autoTrimWhitespace(imageSrc, markers as any, 2.0);
  const effectiveImageSrc = trimRes.trimmedDataUrl;
  const effectiveMarkers = trimRes.markers;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const primaryNavy = '#0E3B64';
        const textDarkNavy = '#0F2F4E';
        const skyBlueBar = '#A8D4F2';
        const badgeBg = markerBadgeColor || primaryNavy;
        const badgeTextColor = getContrastColor(badgeBg);

        const scale = width / 1920;
        const schedule = categorizeRoomsForSchedule(effectiveMarkers as any);

        // 1. Fondo blanco comercial
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // 2. Encabezado comercial
        const headerMarginX = 60 * scale;
        ctx.fillStyle = '#0F2C59';
        ctx.font = `bold ${Math.round(36 * scale)}px sans-serif`;
        ctx.fillText(projectTitle.toUpperCase(), headerMarginX, 72 * scale);

        ctx.fillStyle = '#64748B';
        ctx.font = `600 ${Math.round(15 * scale)}px sans-serif`;
        ctx.fillText('FICHA COMERCIAL • PLANO AMUEBLADO Y CUADRO DE SUPERFICIES ÚTILES', headerMarginX, 104 * scale);

        // Si hay logo de la promoción (LUBENS ARROYO), dibujarlo en la esquina superior derecha
        let promoLogoW = 0;
        const effectivePromo = promotionLogo || DEFAULT_PROMOTION_LOGO;
        if (effectivePromo) {
          try {
            await new Promise<void>((resolveLogo) => {
              const logoImg = new Image();
              logoImg.crossOrigin = 'anonymous';
              logoImg.onload = () => {
                const logoAspect = logoImg.width / logoImg.height;
                const maxLogoH = 68 * scale;
                const maxLogoW = 300 * scale;
                let drawLogoH = maxLogoH;
                let drawLogoW = drawLogoH * logoAspect;
                if (drawLogoW > maxLogoW) {
                  drawLogoW = maxLogoW;
                  drawLogoH = drawLogoW / logoAspect;
                }
                promoLogoW = drawLogoW;
                const logoX = width - headerMarginX - drawLogoW;
                const logoY = 26 * scale + (maxLogoH - drawLogoH) / 2;
                ctx.drawImage(logoImg, logoX, logoY, drawLogoW, drawLogoH);
                resolveLogo();
              };
              logoImg.onerror = () => resolveLogo();
              logoImg.src = effectivePromo;
            });
          } catch (e) {
            console.warn('Error dibujando logo de promoción en canvas:', e);
          }
        }

        // Si hay logo de comercializadora (Terravall), dibujarlo en una caja con fondo blanco que ponga: COMERCIALIZA
        const effectiveAgency = agencyLogo || DEFAULT_AGENCY_LOGO;
        if (effectiveAgency) {
          try {
            await new Promise<void>((resolveAgency) => {
              const agencyImg = new Image();
              agencyImg.crossOrigin = 'anonymous';
              agencyImg.onload = () => {
                const cardH = 80 * scale;
                const cardW = 270 * scale;
                const cardX = width - headerMarginX - (promoLogoW > 0 ? promoLogoW + 24 * scale : 0) - cardW;
                const cardY = 22 * scale;

                // Fondo blanco sin borde
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                  ctx.roundRect(cardX, cardY, cardW, cardH, 8 * scale);
                } else {
                  ctx.rect(cardX, cardY, cardW, cardH);
                }
                ctx.fill();

                // Rótulo COMERCIALIZA
                ctx.fillStyle = '#991B1B';
                ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('COMERCIALIZA', cardX + cardW / 2, cardY + 20 * scale);

                // Logo Terravall
                const maxImgH = 46 * scale;
                const maxImgW = 230 * scale;
                const imgAspect = agencyImg.width / agencyImg.height;
                let drawImgW = maxImgH * imgAspect;
                let drawImgH = maxImgH;
                if (drawImgW > maxImgW) {
                  drawImgW = maxImgW;
                  drawImgH = drawImgW / imgAspect;
                }
                const imgX = cardX + (cardW - drawImgW) / 2;
                const imgY = cardY + 24 * scale + (maxImgH - drawImgH) / 2;
                ctx.drawImage(agencyImg, imgX, imgY, drawImgW, drawImgH);
                ctx.textAlign = 'left';
                resolveAgency();
              };
              agencyImg.onerror = () => resolveAgency();
              agencyImg.src = effectiveAgency;
            });
          } catch (e) {
            console.warn('Error dibujando logo comercializadora:', e);
          }
        }

        // Identificador de vivienda (PORTAL - PISO - LETRA) a la izquierda de los logos
        if (unitIdentifier) {
          const displayUnit = unitIdentifier.toUpperCase().trim();
          ctx.fillStyle = '#0F2C59';
          ctx.font = `bold ${Math.round(15 * scale)}px monospace`;
          ctx.textAlign = 'right';
          const rightOffset = width - headerMarginX - (promoLogoW > 0 ? promoLogoW + 24 * scale : 0) - (effectiveAgency ? 285 * scale : 0);
          ctx.fillText(displayUnit, rightOffset - 12 * scale, 64 * scale);
          ctx.textAlign = 'left';
        }

        // Línea divisoria superior
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(headerMarginX, 122 * scale);
        ctx.lineTo(width - headerMarginX, 122 * scale);
        ctx.stroke();

        // 3. Distribución: Plano a la izquierda (máximo espacio) y Cuadro a la derecha
        const tableW = 430 * scale;
        const tableX = width - headerMarginX - tableW;
        const planAreaX = headerMarginX;
        const planAreaY = 138 * scale;
        const planAreaW = tableX - planAreaX - 35 * scale;
        const planAreaH = height - planAreaY - 45 * scale;

        const imgAspect = img.width / img.height;
        let drawW = planAreaW;
        let drawH = drawW / imgAspect;
        if (drawH > planAreaH) {
          drawH = planAreaH;
          drawW = drawH * imgAspect;
        }
        const drawX = planAreaX + (planAreaW - drawW) / 2;
        const drawY = planAreaY + (planAreaH - drawH) / 2;

        // Dibujar el plano recortado en alta fidelidad (sin marco redondeado)
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Señalizar cada estancia en el plano
        if (schedule.sortedMarkers && schedule.sortedMarkers.length > 0) {
          const radius = 18 * scale;
          schedule.sortedMarkers.forEach((m: any, idx: number) => {
            if (typeof m.x === 'number' && typeof m.y === 'number') {
              const markerX = drawX + (m.x / 100) * drawW;
              const markerY = drawY + (m.y / 100) * drawH;

              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(markerX, markerY, radius + 3 * scale, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = badgeBg;
              ctx.beginPath();
              ctx.arc(markerX, markerY, radius, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = badgeTextColor;
              ctx.font = `bold ${Math.round(18 * scale)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(idx + 1), markerX, markerY + 1 * scale);
            }
          });
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // 4. Cuadro de Superficies Útiles (Diseño y Tipografía Arquitectónica de Referencia)
        const rowHeight = 36 * scale;
        const hasExt = schedule.hasExterior;
        const totalRows = schedule.interiorRooms.length + schedule.exteriorRooms.length;
        const subtotalH = hasExt ? 75 * scale : 0;
        const tableCardH = 90 * scale + totalRows * rowHeight + subtotalH + 75 * scale + 15 * scale;

        // Fondo limpio del cuadro (sin marco azul ni bordes redondeados)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(tableX, planAreaY, tableW, tableCardH);

        // Título exacto en Azul Marino
        ctx.fillStyle = primaryNavy;
        ctx.font = `900 ${Math.round(20 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
        ctx.fillText('CUADRO DE SUPERFICIES ÚTILES', tableX + 28 * scale, planAreaY + 44 * scale);

        // Franja azul marino gruesa continua
        ctx.fillStyle = primaryNavy;
        ctx.fillRect(tableX + 28 * scale, planAreaY + 56 * scale, tableW - 56 * scale, 4.5 * scale);

        // Estancias Interiores
        let currentY = planAreaY + 98 * scale;
        schedule.interiorRooms.forEach((marker, idx) => {
          const numStr = String(idx + 1).padStart(2, '0') + '.';
          const area = marker.areaSqMeters || 0;
          const areaStr = area > 0
            ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
            : '—';

          // Número
          ctx.fillStyle = primaryNavy;
          ctx.font = `bold ${Math.round(17 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
          ctx.fillText(numStr, tableX + 28 * scale, currentY);

          // Nombre
          ctx.fillStyle = textDarkNavy;
          ctx.font = `600 ${Math.round(16 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
          ctx.fillText(marker.name.toUpperCase(), tableX + 68 * scale, currentY);

          // Superficie m²
          ctx.fillStyle = primaryNavy;
          ctx.font = `bold ${Math.round(17 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(areaStr, tableX + tableW - 28 * scale, currentY);
          ctx.textAlign = 'left';

          currentY += rowHeight;
        });

        // Subtotal Interior si hay exteriores
        if (hasExt) {
          currentY += 4 * scale;
          ctx.strokeStyle = `${primaryNavy}90`;
          ctx.lineWidth = 1 * scale;
          ctx.beginPath();
          ctx.moveTo(tableX + 28 * scale, currentY - 10 * scale);
          ctx.lineTo(tableX + tableW - 28 * scale, currentY - 10 * scale);
          ctx.stroke();

          ctx.fillStyle = primaryNavy;
          ctx.font = `bold ${Math.round(17 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
          ctx.fillText('ÚTIL TOTAL INTERIOR', tableX + 28 * scale, currentY + 14 * scale);

          const intAreaStr = schedule.interiorTotal > 0
            ? schedule.interiorTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
            : '—';
          ctx.textAlign = 'right';
          ctx.fillText(intAreaStr, tableX + tableW - 28 * scale, currentY + 14 * scale);
          ctx.textAlign = 'left';

          currentY += 30 * scale;
          ctx.beginPath();
          ctx.moveTo(tableX + 28 * scale, currentY - 6 * scale);
          ctx.lineTo(tableX + tableW - 28 * scale, currentY - 6 * scale);
          ctx.stroke();
          currentY += 12 * scale;

          // Estancias Exteriores
          schedule.exteriorRooms.forEach((marker, idx) => {
            const numStr = String(schedule.interiorRooms.length + idx + 1).padStart(2, '0') + '.';
            const area = marker.areaSqMeters || 0;
            const areaStr = area > 0
              ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
              : '—';

            ctx.fillStyle = primaryNavy;
            ctx.font = `bold ${Math.round(17 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
            ctx.fillText(numStr, tableX + 28 * scale, currentY);

            ctx.fillStyle = textDarkNavy;
            ctx.font = `600 ${Math.round(16 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
            ctx.fillText(marker.name.toUpperCase(), tableX + 68 * scale, currentY);

            ctx.fillStyle = primaryNavy;
            ctx.font = `bold ${Math.round(17 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText(areaStr, tableX + tableW - 28 * scale, currentY);
            ctx.textAlign = 'left';

            currentY += rowHeight;
          });
        }

        // Línea previa al Total
        currentY += 6 * scale;
        ctx.strokeStyle = primaryNavy;
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(tableX + 28 * scale, currentY - 8 * scale);
        ctx.lineTo(tableX + tableW - 28 * scale, currentY - 8 * scale);
        ctx.stroke();

        // Total
        ctx.fillStyle = primaryNavy;
        ctx.font = `900 ${Math.round(18 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
        ctx.fillText('SUPERFICIE ÚTIL TOTAL', tableX + 28 * scale, currentY + 18 * scale);

        ctx.font = `900 ${Math.round(20 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
        ctx.textAlign = 'right';
        const totalStr = schedule.grandTotal > 0
          ? schedule.grandTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
          : '—';
        ctx.fillText(totalStr, tableX + tableW - 28 * scale, currentY + 18 * scale);
        ctx.textAlign = 'left';

        // Franja decorativa celeste / azul cielo inferior
        ctx.fillStyle = skyBlueBar;
        ctx.fillRect(tableX + 28 * scale, currentY + 34 * scale, tableW - 56 * scale, 6 * scale);

        // 5. Pie de página con aviso legal
        ctx.fillStyle = '#94A3B8';
        ctx.font = `${Math.round(12 * scale)}px sans-serif`;
        ctx.fillText(
          'Documento comercial no vinculante. Las superficies corresponden a superficie útil interior estimada y pueden variar durante la ejecución de obra.',
          headerMarginX,
          height - 22 * scale
        );

        ctx.textAlign = 'right';
        ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`;
        ctx.fillStyle = '#64748B';
        ctx.fillText('LUBENS ARROYO • Arquitectura & Promociones Inmobiliarias', width - headerMarginX, height - 22 * scale);
        ctx.textAlign = 'left';

        resolve(canvas);
      } catch (e) {
        console.error('Error generando canvas de ficha:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = effectiveImageSrc;
  });
}

export async function exportCommercialBrochureImage({
  imageSrc,
  projectTitle,
  markers,
  markerBadgeColor,
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  unitIdentifier = 'PORTAL 1 - 1º A',
  filename = 'ficha_comercial_arquitectura.png'
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  agencyLogo?: string | null;
  unitIdentifier?: string;
  filename?: string;
}): Promise<boolean> {
  const canvas = await generateBrochureCanvas({
    imageSrc,
    projectTitle,
    markers,
    markerBadgeColor,
    promotionLogo,
    agencyLogo,
    unitIdentifier,
    width: 2480,
    height: 1754
  });

  if (!canvas) return false;

  const dataUrl = canvas.toDataURL('image/png');
  const { cleanBase64 } = cleanBase64Data(dataUrl);
  return safeDownloadFile({
    base64: cleanBase64,
    mimeType: 'image/png',
    filename
  });
}

export async function exportCommercialBrochurePDF({
  imageSrc,
  projectTitle,
  markers,
  markerBadgeColor = '#0E3B64',
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  unitIdentifier = 'PORTAL 1 - 1º A',
  filename = 'ficha_comercial_plano.pdf'
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  agencyLogo?: string | null;
  unitIdentifier?: string;
  filename?: string;
}): Promise<boolean> {
  const trimRes = await autoTrimWhitespace(imageSrc, markers as any, 2.0);
  const effectiveImageSrc = trimRes.trimmedDataUrl;
  const effectiveMarkers = trimRes.markers;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const primaryNavy = '#0E3B64';
        const primaryNavyRgb = { r: 14, g: 59, b: 100 };
        const badgeBg = markerBadgeColor || primaryNavy;
        const badgeRgb = hexToRgb(badgeBg);
        const badgeTextColor = getContrastColor(badgeBg);
        const textRgb = hexToRgb(badgeTextColor);

        const schedule = categorizeRoomsForSchedule(effectiveMarkers as any);

        // A4 Landscape: 297mm x 210mm
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const pageWidth = 297;
        const pageHeight = 210;
        const margin = 10;

        // 1. Fondo blanco puro
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // 2. Encabezado corporativo vectorial ultra-nítido
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(15, 44, 89); // #0F2C59
        const cleanTitle = (projectTitle || 'PROYECTO RESIDENCIAL').toUpperCase();
        doc.text(cleanTitle, margin, margin + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // #64748B
        doc.text('FICHA COMERCIAL ARQUITECTÓNICA • PLANO AMUEBLADO Y CUADRO DE SUPERFICIES ÚTILES', margin, margin + 9.5);

        // 1. Logo de la promoción (LUBENS ARROYO) a la derecha
        let promoLogoW = 0;
        let promoLogoX = pageWidth - margin;
        const effectiveLogo = promotionLogo || DEFAULT_PROMOTION_LOGO;
        if (effectiveLogo) {
          try {
            const logoMaxH = 9.5; // mm
            const logoMaxW = 38; // mm (relación de aspecto ~3.8:1)
            const logoAspect = 881 / 232;
            let drawLogoW = logoMaxH * logoAspect;
            let drawLogoH = logoMaxH;
            if (drawLogoW > logoMaxW) {
              drawLogoW = logoMaxW;
              drawLogoH = drawLogoW / logoAspect;
            }
            promoLogoW = drawLogoW;
            promoLogoX = pageWidth - margin - drawLogoW;
            const logoY = margin + (11 - drawLogoH) / 2;
            const isPngLogo = effectiveLogo.startsWith('data:image/png') || !effectiveLogo.startsWith('data:image/jpeg');
            doc.addImage(effectiveLogo, isPngLogo ? 'PNG' : 'JPEG', promoLogoX, logoY, drawLogoW, drawLogoH, undefined, 'SLOW');
          } catch (logoErr) {
            console.warn('Error insertando logo en PDF:', logoErr);
          }
        }

        // 2. Logo comercializadora con fondo blanco que pone: COMERCIALIZA
        const effectiveAgency = agencyLogo || DEFAULT_AGENCY_LOGO;
        let agencyBoxX = promoLogoX;
        if (effectiveAgency) {
          try {
            const boxW = 38; // mm
            const boxH = 11; // mm
            agencyBoxX = (promoLogoW > 0 ? promoLogoX : (pageWidth - margin)) - boxW - 3;
            const boxY = margin + 0.3;

            // Caja con fondo blanco puro sin borde
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(agencyBoxX, boxY, boxW, boxH, 1.2, 1.2, 'F');

            // Rótulo "COMERCIALIZA"
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.2);
            doc.setTextColor(153, 27, 27); // #991B1B rojo/burdeos Terravall
            doc.text('COMERCIALIZA', agencyBoxX + boxW / 2, boxY + 2.6, { align: 'center' });

            // Logo Terravall (aspecto 3.76:1)
            const maxImgH = 6.4;
            const maxImgW = 32;
            const imgAspect = 376 / 100;
            let drawAgencyW = maxImgH * imgAspect;
            let drawAgencyH = maxImgH;
            if (drawAgencyW > maxImgW) {
              drawAgencyW = maxImgW;
              drawAgencyH = drawAgencyW / imgAspect;
            }
            const imgX = agencyBoxX + (boxW - drawAgencyW) / 2;
            const imgY = boxY + 3.2;
            const isPng = effectiveAgency.startsWith('data:image/png') || !effectiveAgency.startsWith('data:image/jpeg');
            doc.addImage(effectiveAgency, isPng ? 'PNG' : 'JPEG', imgX, imgY, drawAgencyW, drawAgencyH, undefined, 'SLOW');
          } catch (agencyErr) {
            console.warn('Error insertando logo de comercializadora:', agencyErr);
          }
        }

        // Identificador de vivienda (PORTAL - PISO - LETRA) a la izquierda de los logos
        doc.setFont('courier', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 44, 89);
        const refX = (effectiveAgency ? agencyBoxX : promoLogoX) - 4;
        const displayIdentifier = unitIdentifier ? unitIdentifier.toUpperCase().trim() : 'PORTAL 1 - 1º A';
        doc.text(displayIdentifier, refX, margin + 5.8, { align: 'right' });

        // Línea divisoria superior
        doc.setDrawColor(226, 232, 240); // #E2E8F0
        doc.setLineWidth(0.4);
        doc.line(margin, margin + 12, pageWidth - margin, margin + 12);

        // 3. Distribución: Plano (Ocupa máximo espacio hasta 78% del ancho) y Cuadro de Superficies
        const contentY = margin + 14;
        const contentHeight = pageHeight - contentY - 8;
        const tableWidth = 62;
        const tableX = pageWidth - margin - tableWidth;
        const planAreaW = tableX - margin - 6;
        const planAreaH = contentHeight;

        // Inserción directa de la imagen con recorte automático en alta definición
        const imgNaturalW = img.naturalWidth || img.width || 1920;
        const imgNaturalH = img.naturalHeight || img.height || 1080;
        const imgAspect = imgNaturalW / imgNaturalH;

        let imgW = planAreaW;
        let imgH = imgW / imgAspect;
        if (imgH > planAreaH) {
          imgH = planAreaH;
          imgW = imgH * imgAspect;
        }

        const imgX = margin + (planAreaW - imgW) / 2;
        const imgY = contentY + (planAreaH - imgH) / 2;

        // Detectar formato de la imagen para máxima fidelidad
        const isPng = effectiveImageSrc.startsWith('data:image/png') || !effectiveImageSrc.startsWith('data:image/jpeg');
        const imgFormat = isPng ? 'PNG' : 'JPEG';

        // Inserción con remuestreo de máxima calidad ('SLOW' bicúbico en jsPDF) sin marco redondeado
        doc.addImage(effectiveImageSrc, imgFormat, imgX, imgY, imgW, imgH, undefined, 'SLOW');

        // Señalizar cada estancia en el plano con círculo numerado
        if (schedule.sortedMarkers && schedule.sortedMarkers.length > 0) {
          const circleRadius = 3.2; // mm (~6.4mm diámetro)
          schedule.sortedMarkers.forEach((m: any, idx: number) => {
            if (typeof m.x === 'number' && typeof m.y === 'number') {
              const markerX = imgX + (m.x / 100) * imgW;
              const markerY = imgY + (m.y / 100) * imgH;

              // Anillo exterior blanco
              doc.setFillColor(255, 255, 255);
              doc.circle(markerX, markerY, circleRadius + 0.45, 'F');

              // Círculo personalizado
              doc.setFillColor(badgeRgb.r, badgeRgb.g, badgeRgb.b);
              doc.circle(markerX, markerY, circleRadius, 'F');

              // Número en color contrastante
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
              doc.text(String(idx + 1), markerX, markerY + 0.9, { align: 'center' });
            }
          });
        }

        // 4. Cuadro de Superficies Útiles (Diseño y Tipografía de Referencia Exacta)
        const rowH = 4.8;
        const hasExt = schedule.hasExterior;
        const totalRows = schedule.interiorRooms.length + schedule.exteriorRooms.length;
        const subtotalH = hasExt ? 11 : 0;
        const tableCardH = 12 + totalRows * rowH + subtotalH + 11 + 3;

        // Fondo limpio para el cuadro (sin marco ni bordes redondeados)
        doc.setFillColor(255, 255, 255);
        doc.rect(tableX, contentY, tableWidth, tableCardH, 'F');

        // Título del Cuadro en Azul Marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(14, 59, 100);
        doc.text('CUADRO DE SUPERFICIES ÚTILES', tableX + 3.5, contentY + 6);

        // Barra decorativa azul marino gruesa continua
        doc.setFillColor(14, 59, 100);
        doc.rect(tableX + 3.5, contentY + 7.8, tableWidth - 7, 1.2, 'F');

        // Filas de estancias interiores
        let curY = contentY + 13.5;
        schedule.interiorRooms.forEach((m, idx) => {
          const numStr = String(idx + 1).padStart(2, '0') + '.';
          const area = m.areaSqMeters || 0;
          const areaStr = area > 0
            ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
            : '—';

          // Número de orden (helvetica bold condensado, no monospace)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(14, 59, 100);
          doc.text(numStr, tableX + 3.5, curY);

          // Nombre de la estancia
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.2);
          doc.setTextColor(30, 58, 95);
          const maxNameW = tableWidth - 25;
          const cleanName = doc.splitTextToSize(m.name.toUpperCase(), maxNameW)[0];
          doc.text(cleanName, tableX + 10.5, curY);

          // Superficie útil
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(14, 59, 100);
          doc.text(areaStr, tableX + tableWidth - 3.5, curY, { align: 'right' });

          curY += rowH;
        });

        // Subtotal Útil Interior si existen estancias exteriores
        if (hasExt) {
          curY += 0.5;
          doc.setDrawColor(14, 59, 100);
          doc.setLineWidth(0.2);
          doc.line(tableX + 3.5, curY - 1.5, tableX + tableWidth - 3.5, curY - 1.5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(14, 59, 100);
          doc.text('ÚTIL TOTAL INTERIOR', tableX + 3.5, curY + 2.5);

          const intAreaStr = schedule.interiorTotal > 0
            ? schedule.interiorTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
            : '—';
          doc.text(intAreaStr, tableX + tableWidth - 3.5, curY + 2.5, { align: 'right' });

          curY += 5.5;
          doc.line(tableX + 3.5, curY - 1.5, tableX + tableWidth - 3.5, curY - 1.5);
          curY += 2;

          // Estancias exteriores (Terraza, Tendedero, etc.)
          schedule.exteriorRooms.forEach((m, idx) => {
            const numStr = String(schedule.interiorRooms.length + idx + 1).padStart(2, '0') + '.';
            const area = m.areaSqMeters || 0;
            const areaStr = area > 0
              ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
              : '—';

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(14, 59, 100);
            doc.text(numStr, tableX + 3.5, curY);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(30, 58, 95);
            const maxNameW = tableWidth - 25;
            const cleanName = doc.splitTextToSize(m.name.toUpperCase(), maxNameW)[0];
            doc.text(cleanName, tableX + 10.5, curY);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(14, 59, 100);
            doc.text(areaStr, tableX + tableWidth - 3.5, curY, { align: 'right' });

            curY += rowH;
          });
        }

        // Línea divisoria antes del Total
        curY += 0.5;
        doc.setDrawColor(14, 59, 100);
        doc.setLineWidth(0.3);
        doc.line(tableX + 3.5, curY - 1.5, tableX + tableWidth - 3.5, curY - 1.5);

        // Total Superficie Útil
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(14, 59, 100);
        doc.text('SUPERFICIE ÚTIL TOTAL', tableX + 3.5, curY + 2.8);

        const totalStr = schedule.grandTotal > 0
          ? schedule.grandTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
          : '—';
        doc.setFontSize(8.5);
        doc.text(totalStr, tableX + tableWidth - 3.5, curY + 2.8, { align: 'right' });

        // Franja decorativa celeste / azul cielo inferior de la ficha (#A8D4F2)
        doc.setFillColor(168, 212, 242);
        doc.rect(tableX + 3.5, curY + 5.5, tableWidth - 7, 1.6, 'F');

        // 5. Pie de página legal
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          'Documento comercial no vinculante. Las superficies corresponden a superficie útil interior estimada y pueden variar durante la ejecución de obra.',
          margin,
          pageHeight - 5
        );

        doc.setFont('helvetica', 'bold');
        doc.text('LUBENS ARROYO • Arquitectura & Promociones Inmobiliarias', pageWidth - margin, pageHeight - 5, { align: 'right' });

        const sanitizedName = sanitizeFilename(filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`);
        doc.save(sanitizedName);
        resolve(true);
      } catch (err) {
        console.error('Error al generar PDF vectorial:', err);
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = effectiveImageSrc;
  });
}

export async function exportPlanOnlyPDF({
  imageSrc,
  projectTitle = 'Plano',
  paperFormat = 'a4',
  markers = [],
  markerBadgeColor = '#0F2C59',
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  filename = 'plano_alta_resolucion.pdf'
}: {
  imageSrc: string;
  projectTitle?: string;
  paperFormat?: 'a4' | 'a3';
  markers?: Array<{ id: string; name: string; x?: number; y?: number; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  agencyLogo?: string | null;
  filename?: string;
}): Promise<boolean> {
  const trimRes = await autoTrimWhitespace(imageSrc, markers as any, 2.0);
  const effectiveImageSrc = trimRes.trimmedDataUrl;
  const effectiveMarkers = trimRes.markers;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const badgeRgb = hexToRgb(markerBadgeColor || '#0F2C59');
        const badgeTextColor = getContrastColor(markerBadgeColor || '#0F2C59');
        const textRgb = hexToRgb(badgeTextColor);

        const isLandscape = (img.naturalWidth || img.width) >= (img.naturalHeight || img.height);
        const format = paperFormat === 'a3' ? 'a3' : 'a4';

        const doc = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format,
          compress: true
        });

        // Dimensiones según formato
        const isA3 = format === 'a3';
        const pageWidth = isLandscape ? (isA3 ? 420 : 297) : (isA3 ? 297 : 210);
        const pageHeight = isLandscape ? (isA3 ? 297 : 210) : (isA3 ? 420 : 297);
        const margin = 10;

        // Fondo blanco
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Encabezado técnico sutil
        const headerH = 14;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isA3 ? 16 : 13);
        doc.setTextColor(15, 44, 89);
        doc.text((projectTitle || 'PLANO ARQUITECTÓNICO').toUpperCase(), margin, margin + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isA3 ? 9 : 7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`DOCUMENTO TÉCNICO ARQUITECTÓNICO • ESCALA COMPLETA • FORMATO ${format.toUpperCase()}`, margin, margin + 8.5);

        // 1. Logo de la promoción (LUBENS ARROYO)
        let promoLogoW = 0;
        let promoLogoX = pageWidth - margin;
        const effectiveLogo = promotionLogo || DEFAULT_PROMOTION_LOGO;
        if (effectiveLogo) {
          try {
            const logoMaxH = isA3 ? 9.5 : 7.5;
            const logoMaxW = isA3 ? 40 : 32;
            const logoAspect = 881 / 232;
            let drawLogoW = logoMaxH * logoAspect;
            let drawLogoH = logoMaxH;
            if (drawLogoW > logoMaxW) {
              drawLogoW = logoMaxW;
              drawLogoH = drawLogoW / logoAspect;
            }
            promoLogoW = drawLogoW;
            promoLogoX = pageWidth - margin - drawLogoW;
            const logoY = margin + (headerH - drawLogoH) / 2;
            const isPngLogo = effectiveLogo.startsWith('data:image/png') || !effectiveLogo.startsWith('data:image/jpeg');
            doc.addImage(effectiveLogo, isPngLogo ? 'PNG' : 'JPEG', promoLogoX, logoY, drawLogoW, drawLogoH, undefined, 'SLOW');
          } catch (logoErr) {
            console.warn('Error insertando logo en PDF de plano:', logoErr);
          }
        }

        // 2. Logo comercializadora con fondo blanco que pone: COMERCIALIZA
        const effectiveAgency = agencyLogo || DEFAULT_AGENCY_LOGO;
        if (effectiveAgency) {
          try {
            const boxW = isA3 ? 36 : 30;
            const boxH = isA3 ? 10.5 : 8.5;
            const agencyBoxX = (promoLogoW > 0 ? promoLogoX : (pageWidth - margin)) - boxW - (isA3 ? 4 : 3);
            const boxY = margin + (headerH - boxH) / 2;

            // Caja blanca sin borde
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(agencyBoxX, boxY, boxW, boxH, 1, 1, 'F');

            // Rótulo COMERCIALIZA
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(isA3 ? 5 : 4.5);
            doc.setTextColor(153, 27, 27);
            doc.text('COMERCIALIZA', agencyBoxX + boxW / 2, boxY + (isA3 ? 2.5 : 2.1), { align: 'center' });

            // Logo Terravall
            const maxImgH = isA3 ? 5.8 : 4.8;
            const maxImgW = isA3 ? 30 : 25;
            const imgAspect = 376 / 100;
            let drawAgencyW = maxImgH * imgAspect;
            let drawAgencyH = maxImgH;
            if (drawAgencyW > maxImgW) {
              drawAgencyW = maxImgW;
              drawAgencyH = drawAgencyW / imgAspect;
            }
            const imgX = agencyBoxX + (boxW - drawAgencyW) / 2;
            const imgY = boxY + (isA3 ? 3.1 : 2.6);
            const isPng = effectiveAgency.startsWith('data:image/png') || !effectiveAgency.startsWith('data:image/jpeg');
            doc.addImage(effectiveAgency, isPng ? 'PNG' : 'JPEG', imgX, imgY, drawAgencyW, drawAgencyH, undefined, 'SLOW');
          } catch (agencyErr) {
            console.warn('Error insertando logo comercializadora:', agencyErr);
          }
        }

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin, margin + 11, pageWidth - margin, margin + 11);

        // Área disponible para el plano
        const availableW = pageWidth - margin * 2;
        const availableH = pageHeight - margin * 2 - headerH - 6;

        const imgNaturalW = img.naturalWidth || img.width || 1920;
        const imgNaturalH = img.naturalHeight || img.height || 1080;
        const imgAspect = imgNaturalW / imgNaturalH;

        let drawW = availableW;
        let drawH = drawW / imgAspect;
        if (drawH > availableH) {
          drawH = availableH;
          drawW = drawH * imgAspect;
        }

        const drawX = margin + (availableW - drawW) / 2;
        const drawY = margin + headerH + (availableH - drawH) / 2;

        const isPng = effectiveImageSrc.startsWith('data:image/png') || !effectiveImageSrc.startsWith('data:image/jpeg');
        const imgFormat = isPng ? 'PNG' : 'JPEG';

        // Inserción directa en máxima resolución sin pérdida
        doc.addImage(effectiveImageSrc, imgFormat, drawX, drawY, drawW, drawH, undefined, 'SLOW');

        const sortedMarkers = sortRoomMarkers(effectiveMarkers || []);

        // Señalizar cada estancia en el plano con el color de badge personalizado
        if (sortedMarkers && sortedMarkers.length > 0) {
          const circleRadius = isA3 ? 4.2 : 3.2; // mm
          sortedMarkers.forEach((m: any, idx: number) => {
            if (typeof m.x === 'number' && typeof m.y === 'number') {
              const markerX = drawX + (m.x / 100) * drawW;
              const markerY = drawY + (m.y / 100) * drawH;

              // Anillo exterior blanco
              doc.setFillColor(255, 255, 255);
              doc.circle(markerX, markerY, circleRadius + 0.45, 'F');

              // Círculo personalizado
              doc.setFillColor(badgeRgb.r, badgeRgb.g, badgeRgb.b);
              doc.circle(markerX, markerY, circleRadius, 'F');

              // Número con contraste adecuado
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(isA3 ? 10 : 8);
              doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
              doc.text(String(idx + 1), markerX, markerY + (isA3 ? 1.2 : 0.9), { align: 'center' });
            }
          });
        }

        // Pie de plano
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Plano arquitectónico de alta resolución', margin, pageHeight - 4.5);

        const sanitizedName = sanitizeFilename(filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`);
        doc.save(sanitizedName);
        resolve(true);
      } catch (err) {
        console.error('Error al exportar plano en PDF:', err);
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = effectiveImageSrc;
  });
}



