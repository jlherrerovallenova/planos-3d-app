/**
 * downloadHelper.ts
 * Utilidades seguras de descarga para Flow SDK y navegadores estándar.
 */

import { jsPDF } from 'jspdf';
import { sortRoomMarkers, categorizeRoomsForSchedule } from './roomSorter';
import { autoTrimWhitespace } from './planCropper';
import { DEFAULT_PROMOTION_LOGO } from './defaultPromotionLogo';
import { DEFAULT_AGENCY_LOGO } from './defaultAgencyLogo';
import { DEFAULT_PROMUEVE_LOGO } from './defaultPromueveLogo';

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
  promotorLogo = DEFAULT_PROMUEVE_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  agencyPhone = '983 34 21 32',
  unitIdentifier = 'PORTAL XX LETRA X',
  customTotalUsefulArea,
  width = 2480,
  height = 1754
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  promotorLogo?: string | null;
  agencyLogo?: string | null;
  agencyPhone?: string | null;
  unitIdentifier?: string;
  customTotalUsefulArea?: number;
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
        const schedule = categorizeRoomsForSchedule(effectiveMarkers as any, customTotalUsefulArea);

        // 1. Fondo blanco comercial
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // 2. Encabezado comercial
        const headerMarginX = 60 * scale;
        ctx.fillStyle = '#0F2C59';
        ctx.font = `bold ${Math.round(34 * scale)}px sans-serif`;
        ctx.fillText(projectTitle.toUpperCase(), headerMarginX, 68 * scale);

        ctx.fillStyle = '#64748B';
        ctx.font = `600 ${Math.round(14 * scale)}px sans-serif`;
        ctx.fillText('FICHA COMERCIAL ARQUITECTÓNICA • PLANO AMUEBLADO Y CUADRO DE SUPERFICIES ÚTILES', headerMarginX, 98 * scale);

        // Logo de la promoción (LUBENS ARROYO) en la esquina superior derecha
        let promoLogoW = 0;
        const effectivePromo = promotionLogo || DEFAULT_PROMOTION_LOGO;
        if (effectivePromo) {
          try {
            await new Promise<void>((resolveLogo) => {
              const logoImg = new Image();
              logoImg.crossOrigin = 'anonymous';
              logoImg.onload = () => {
                const logoAspect = logoImg.width / logoImg.height;
                const maxLogoH = 75 * scale;
                const maxLogoW = 320 * scale;
                let drawLogoH = maxLogoH;
                let drawLogoW = drawLogoH * logoAspect;
                if (drawLogoW > maxLogoW) {
                  drawLogoW = maxLogoW;
                  drawLogoH = drawLogoW / logoAspect;
                }
                promoLogoW = drawLogoW;
                const logoX = width - headerMarginX - drawLogoW;
                const logoY = 22 * scale + (maxLogoH - drawLogoH) / 2;
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

        // Línea divisoria superior
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(headerMarginX, 116 * scale);
        ctx.lineTo(width - headerMarginX, 116 * scale);
        ctx.stroke();

        // 3. Distribución: Plano a la izquierda (máximo espacio) y Cuadro + Entidades a la derecha
        const tableW = 440 * scale;
        const tableX = width - headerMarginX - tableW;
        const planAreaX = headerMarginX;
        const planAreaY = 130 * scale;
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

        // 4. Columna Derecha:
        // 4.1 Identificador de Vivienda (ej: PORTAL XX LETRA X) arriba del cuadro
        let rightColumnY = planAreaY + 45 * scale;
        const activeUnitText = (unitIdentifier || 'PORTAL XX LETRA X').toUpperCase().trim();
        ctx.fillStyle = '#0E3B64';
        ctx.font = `900 ${Math.round(28 * scale)}px sans-serif`;
        ctx.fillText(activeUnitText, tableX + 8 * scale, rightColumnY);
        rightColumnY += 50 * scale;

        // 4.2 Título CUADRO DE SUPERFICIES ÚTILES
        ctx.fillStyle = primaryNavy;
        ctx.font = `900 ${Math.round(18 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
        ctx.fillText('CUADRO DE SUPERFICIES ÚTILES', tableX + 8 * scale, rightColumnY);
        rightColumnY += 12 * scale;

        // Franja azul marino gruesa continua
        ctx.fillStyle = primaryNavy;
        ctx.fillRect(tableX + 8 * scale, rightColumnY, tableW - 16 * scale, 3.5 * scale);
        rightColumnY += 32 * scale;

        // Filas de estancias interiores
        const rowHeight = 32 * scale;
        schedule.interiorRooms.forEach((marker, idx) => {
          const numStr = String(idx + 1).padStart(2, '0') + '.';
          const area = marker.areaSqMeters || 0;
          const areaStr = area > 0
            ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
            : '—';

          // Número
          ctx.fillStyle = primaryNavy;
          ctx.font = `bold ${Math.round(16 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
          ctx.fillText(numStr, tableX + 8 * scale, rightColumnY);

          // Nombre
          ctx.fillStyle = textDarkNavy;
          ctx.font = `600 ${Math.round(15 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
          ctx.fillText(marker.name.toUpperCase(), tableX + 46 * scale, rightColumnY);

          // Superficie m²
          ctx.fillStyle = primaryNavy;
          ctx.font = `bold ${Math.round(16 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(areaStr, tableX + tableW - 8 * scale, rightColumnY);
          ctx.textAlign = 'left';

          rightColumnY += rowHeight;
        });

        // Subtotal Interior si hay exteriores
        if (schedule.hasExterior) {
          rightColumnY += 4 * scale;
          ctx.strokeStyle = `${primaryNavy}90`;
          ctx.lineWidth = 1 * scale;
          ctx.beginPath();
          ctx.moveTo(tableX + 8 * scale, rightColumnY - 8 * scale);
          ctx.lineTo(tableX + tableW - 8 * scale, rightColumnY - 8 * scale);
          ctx.stroke();

          ctx.fillStyle = primaryNavy;
          ctx.font = `bold ${Math.round(16 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
          ctx.fillText('ÚTIL TOTAL INTERIOR', tableX + 8 * scale, rightColumnY + 12 * scale);

          const intAreaStr = schedule.interiorTotal > 0
            ? schedule.interiorTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
            : '—';
          ctx.textAlign = 'right';
          ctx.fillText(intAreaStr, tableX + tableW - 8 * scale, rightColumnY + 12 * scale);
          ctx.textAlign = 'left';

          rightColumnY += 26 * scale;
          ctx.beginPath();
          ctx.moveTo(tableX + 8 * scale, rightColumnY - 6 * scale);
          ctx.lineTo(tableX + tableW - 8 * scale, rightColumnY - 6 * scale);
          ctx.stroke();
          rightColumnY += 10 * scale;

          // Estancias Exteriores
          schedule.exteriorRooms.forEach((marker, idx) => {
            const numStr = String(schedule.interiorRooms.length + idx + 1).padStart(2, '0') + '.';
            const area = marker.areaSqMeters || 0;
            const areaStr = area > 0
              ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
              : '—';

            ctx.fillStyle = primaryNavy;
            ctx.font = `bold ${Math.round(16 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
            ctx.fillText(numStr, tableX + 8 * scale, rightColumnY);

            ctx.fillStyle = textDarkNavy;
            ctx.font = `600 ${Math.round(15 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
            ctx.fillText(marker.name.toUpperCase(), tableX + 46 * scale, rightColumnY);

            ctx.fillStyle = primaryNavy;
            ctx.font = `bold ${Math.round(16 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText(areaStr, tableX + tableW - 8 * scale, rightColumnY);
            ctx.textAlign = 'left';

            rightColumnY += rowHeight;
          });
        }

        // Línea previa al Total
        rightColumnY += 4 * scale;
        ctx.strokeStyle = primaryNavy;
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.moveTo(tableX + 8 * scale, rightColumnY - 6 * scale);
        ctx.lineTo(tableX + tableW - 8 * scale, rightColumnY - 6 * scale);
        ctx.stroke();

        // Total
        ctx.fillStyle = primaryNavy;
        ctx.font = `900 ${Math.round(17 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
        ctx.fillText('SUPERFICIE ÚTIL TOTAL', tableX + 8 * scale, rightColumnY + 16 * scale);

        ctx.font = `900 ${Math.round(19 * scale)}px 'Barlow Semi Condensed', 'Roboto Condensed', sans-serif`;
        ctx.textAlign = 'right';
        const totalStr = schedule.grandTotal > 0
          ? schedule.grandTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
          : '—';
        ctx.fillText(totalStr, tableX + tableW - 8 * scale, rightColumnY + 16 * scale);
        ctx.textAlign = 'left';

        // Franja decorativa celeste / azul cielo inferior
        ctx.fillStyle = skyBlueBar;
        ctx.fillRect(tableX + 8 * scale, rightColumnY + 28 * scale, tableW - 16 * scale, 5 * scale);
        rightColumnY += 65 * scale;

        // 4.3 Sección PROMUEVE:
        ctx.fillStyle = '#0E3B64';
        ctx.font = `900 ${Math.round(14 * scale)}px sans-serif`;
        ctx.fillText('PROMUEVE:', tableX + 8 * scale, rightColumnY);
        rightColumnY += 12 * scale;

        const effectivePromotor = promotorLogo || DEFAULT_PROMUEVE_LOGO;
        if (effectivePromotor) {
          try {
            await new Promise<void>((resolvePromotor) => {
              const promImg = new Image();
              promImg.crossOrigin = 'anonymous';
              promImg.onload = () => {
                const maxH = 50 * scale;
                const maxW = 320 * scale;
                const aspect = promImg.width / promImg.height;
                let w = maxH * aspect;
                let h = maxH;
                if (w > maxW) {
                  w = maxW;
                  h = w / aspect;
                }
                ctx.drawImage(promImg, tableX + 8 * scale, rightColumnY, w, h);
                rightColumnY += h + 28 * scale;
                resolvePromotor();
              };
              promImg.onerror = () => {
                rightColumnY += 35 * scale;
                resolvePromotor();
              };
              promImg.src = effectivePromotor;
            });
          } catch {
            rightColumnY += 35 * scale;
          }
        } else {
          rightColumnY += 35 * scale;
        }

        // 4.4 Sección COMERCIALIZA:
        ctx.fillStyle = '#991B1B';
        ctx.font = `900 ${Math.round(14 * scale)}px sans-serif`;
        ctx.fillText('COMERCIALIZA:', tableX + 8 * scale, rightColumnY);
        rightColumnY += 14 * scale;

        const effectiveAgency = agencyLogo || DEFAULT_AGENCY_LOGO;
        if (effectiveAgency) {
          try {
            await new Promise<void>((resolveAg) => {
              const agImg = new Image();
              agImg.crossOrigin = 'anonymous';
              agImg.onload = () => {
                const maxH = 56 * scale;
                const maxW = 320 * scale;
                const aspect = agImg.width / agImg.height;
                let w = maxH * aspect;
                let h = maxH;
                if (w > maxW) {
                  w = maxW;
                  h = w / aspect;
                }
                ctx.drawImage(agImg, tableX + 8 * scale, rightColumnY, w, h);
                rightColumnY += h + 32 * scale;
                resolveAg();
              };
              agImg.onerror = () => {
                rightColumnY += 45 * scale;
                resolveAg();
              };
              agImg.src = effectiveAgency;
            });
          } catch {
            rightColumnY += 45 * scale;
          }
        } else {
          rightColumnY += 45 * scale;
        }

        // 4.5 Teléfono destacado (ej. 983 34 21 32)
        if (agencyPhone) {
          ctx.fillStyle = '#991B1B';
          ctx.font = `900 ${Math.round(40 * scale)}px sans-serif`;
          ctx.fillText(agencyPhone, tableX + 8 * scale, rightColumnY);
        }

        // 5. Pie de página legal
        ctx.fillStyle = '#94A3B8';
        ctx.font = `${Math.round(11 * scale)}px sans-serif`;
        ctx.fillText(
          'Documento comercial no vinculante. Las superficies corresponden a superficie útil interior estimada y pueden variar durante la ejecución de obra.',
          headerMarginX,
          height - 24 * scale
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
  promotorLogo = DEFAULT_PROMUEVE_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  agencyPhone = '983 34 21 32',
  unitIdentifier = 'PORTAL XX LETRA X',
  customTotalUsefulArea,
  filename = 'ficha_comercial_arquitectura.png'
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  promotorLogo?: string | null;
  agencyLogo?: string | null;
  agencyPhone?: string | null;
  unitIdentifier?: string;
  customTotalUsefulArea?: number;
  filename?: string;
}): Promise<boolean> {
  const canvas = await generateBrochureCanvas({
    imageSrc,
    projectTitle,
    markers,
    markerBadgeColor,
    promotionLogo,
    promotorLogo,
    agencyLogo,
    agencyPhone,
    unitIdentifier,
    customTotalUsefulArea,
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
  promotorLogo = DEFAULT_PROMUEVE_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  agencyPhone = '983 34 21 32',
  unitIdentifier = 'PORTAL XX LETRA X',
  customTotalUsefulArea,
  filename = 'ficha_comercial_plano.pdf'
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  promotorLogo?: string | null;
  agencyLogo?: string | null;
  agencyPhone?: string | null;
  unitIdentifier?: string;
  customTotalUsefulArea?: number;
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

        const schedule = categorizeRoomsForSchedule(effectiveMarkers as any, customTotalUsefulArea);

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
        doc.setFontSize(15);
        doc.setTextColor(15, 44, 89); // #0F2C59
        const cleanTitle = (projectTitle || 'PROYECTO RESIDENCIAL DE 140 VIVIENDAS').toUpperCase();
        doc.text(cleanTitle, margin, margin + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // #64748B
        doc.text('FICHA COMERCIAL ARQUITECTÓNICA • PLANO AMUEBLADO Y CUADRO DE SUPERFICIES ÚTILES', margin, margin + 9);

        // Logo de la promoción (LUBENS ARROYO) a la derecha
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
            const promoLogoX = pageWidth - margin - drawLogoW;
            const logoY = margin + (11 - drawLogoH) / 2;
            const isPngLogo = effectiveLogo.startsWith('data:image/png') || !effectiveLogo.startsWith('data:image/jpeg');
            doc.addImage(effectiveLogo, isPngLogo ? 'PNG' : 'JPEG', promoLogoX, logoY, drawLogoW, drawLogoH, undefined, 'SLOW');
          } catch (logoErr) {
            console.warn('Error insertando logo en PDF:', logoErr);
          }
        }

        // Línea divisoria superior
        doc.setDrawColor(226, 232, 240); // #E2E8F0
        doc.setLineWidth(0.4);
        doc.line(margin, margin + 12, pageWidth - margin, margin + 12);

        // 3. Distribución: Plano y Cuadro de Superficies + Entidades
        const contentY = margin + 14;
        const contentHeight = pageHeight - contentY - 8;
        const tableWidth = 65;
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

        const isPng = effectiveImageSrc.startsWith('data:image/png') || !effectiveImageSrc.startsWith('data:image/jpeg');
        const imgFormat = isPng ? 'PNG' : 'JPEG';
        doc.addImage(effectiveImageSrc, imgFormat, imgX, imgY, imgW, imgH, undefined, 'SLOW');

        // Señalizar cada estancia en el plano con círculo numerado
        if (schedule.sortedMarkers && schedule.sortedMarkers.length > 0) {
          const circleRadius = 3.2; // mm
          schedule.sortedMarkers.forEach((m: any, idx: number) => {
            if (typeof m.x === 'number' && typeof m.y === 'number') {
              const markerX = imgX + (m.x / 100) * imgW;
              const markerY = imgY + (m.y / 100) * imgH;

              doc.setFillColor(255, 255, 255);
              doc.circle(markerX, markerY, circleRadius + 0.45, 'F');

              doc.setFillColor(badgeRgb.r, badgeRgb.g, badgeRgb.b);
              doc.circle(markerX, markerY, circleRadius, 'F');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
              doc.text(String(idx + 1), markerX, markerY + 0.9, { align: 'center' });
            }
          });
        }

        // 4. Columna Derecha:
        // 4.1 Identificador de Vivienda en Azul Marino arriba del cuadro
        let curY = contentY + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(14, 59, 100);
        const displayIdentifier = unitIdentifier ? unitIdentifier.toUpperCase().trim() : 'PORTAL XX LETRA X';
        doc.text(displayIdentifier, tableX + 2, curY + 3);
        curY += 10;

        // 4.2 Título del Cuadro en Azul Marino
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(14, 59, 100);
        doc.text('CUADRO DE SUPERFICIES ÚTILES', tableX + 2, curY + 2);

        // Barra decorativa azul marino gruesa continua
        doc.setFillColor(14, 59, 100);
        doc.rect(tableX + 2, curY + 3.5, tableWidth - 4, 1.2, 'F');
        curY += 8;

        // Filas de estancias interiores
        const rowH = 4.4;
        schedule.interiorRooms.forEach((m, idx) => {
          const numStr = String(idx + 1).padStart(2, '0') + '.';
          const area = m.areaSqMeters || 0;
          const areaStr = area > 0
            ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
            : '—';

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.2);
          doc.setTextColor(14, 59, 100);
          doc.text(numStr, tableX + 2, curY);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(30, 58, 95);
          const maxNameW = tableWidth - 25;
          const cleanName = doc.splitTextToSize(m.name.toUpperCase(), maxNameW)[0];
          doc.text(cleanName, tableX + 8.5, curY);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.2);
          doc.setTextColor(14, 59, 100);
          doc.text(areaStr, tableX + tableWidth - 2, curY, { align: 'right' });

          curY += rowH;
        });

        // Subtotal Útil Interior si existen estancias exteriores
        if (schedule.hasExterior) {
          curY += 0.5;
          doc.setDrawColor(14, 59, 100);
          doc.setLineWidth(0.2);
          doc.line(tableX + 2, curY - 1.5, tableX + tableWidth - 2, curY - 1.5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.2);
          doc.setTextColor(14, 59, 100);
          doc.text('ÚTIL TOTAL INTERIOR', tableX + 2, curY + 2.2);

          const intAreaStr = schedule.interiorTotal > 0
            ? schedule.interiorTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
            : '—';
          doc.text(intAreaStr, tableX + tableWidth - 2, curY + 2.2, { align: 'right' });

          curY += 5;
          doc.line(tableX + 2, curY - 1.5, tableX + tableWidth - 2, curY - 1.5);
          curY += 1.8;

          // Estancias exteriores (Terraza, etc.)
          schedule.exteriorRooms.forEach((m, idx) => {
            const numStr = String(schedule.interiorRooms.length + idx + 1).padStart(2, '0') + '.';
            const area = m.areaSqMeters || 0;
            const areaStr = area > 0
              ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
              : '—';

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(14, 59, 100);
            doc.text(numStr, tableX + 2, curY);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(30, 58, 95);
            const maxNameW = tableWidth - 25;
            const cleanName = doc.splitTextToSize(m.name.toUpperCase(), maxNameW)[0];
            doc.text(cleanName, tableX + 8.5, curY);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(14, 59, 100);
            doc.text(areaStr, tableX + tableWidth - 2, curY, { align: 'right' });

            curY += rowH;
          });
        }

        // Línea divisoria antes del Total
        curY += 0.5;
        doc.setDrawColor(14, 59, 100);
        doc.setLineWidth(0.3);
        doc.line(tableX + 2, curY - 1.5, tableX + tableWidth - 2, curY - 1.5);

        // Total Superficie Útil
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(14, 59, 100);
        doc.text('SUPERFICIE ÚTIL TOTAL', tableX + 2, curY + 2.5);

        const totalStr = schedule.grandTotal > 0
          ? schedule.grandTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
          : '—';
        doc.setFontSize(8.2);
        doc.text(totalStr, tableX + tableWidth - 2, curY + 2.5, { align: 'right' });

        // Franja decorativa celeste inferior (#A8D4F2)
        doc.setFillColor(168, 212, 242);
        doc.rect(tableX + 2, curY + 4.8, tableWidth - 4, 1.4, 'F');
        curY += 14;

        // 4.3 Sección PROMUEVE:
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(14, 59, 100);
        doc.text('PROMUEVE:', tableX + 2, curY);
        curY += 2;

        const effectivePromotor = promotorLogo || DEFAULT_PROMUEVE_LOGO;
        if (effectivePromotor) {
          try {
            const promProps = doc.getImageProperties(effectivePromotor);
            const promAspect = promProps.width / (promProps.height || 1);
            const maxPromW = 46;
            const maxPromH = 8.5;
            let promW = maxPromH * promAspect;
            let promH = maxPromH;
            if (promW > maxPromW) {
              promW = maxPromW;
              promH = promW / promAspect;
            }
            const isPngProm = effectivePromotor.startsWith('data:image/png') || !effectivePromotor.startsWith('data:image/jpeg');
            doc.addImage(effectivePromotor, isPngProm ? 'PNG' : 'JPEG', tableX + 2, curY, promW, promH, undefined, 'SLOW');
            curY += promH + 5.5;
          } catch {
            curY += 7;
          }
        } else {
          curY += 7;
        }

        // 4.4 Sección COMERCIALIZA:
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(153, 27, 27); // #991B1B
        doc.text('COMERCIALIZA:', tableX + 2, curY);
        curY += 2.2;

        const effectiveAgency = agencyLogo || DEFAULT_AGENCY_LOGO;
        if (effectiveAgency) {
          try {
            const agProps = doc.getImageProperties(effectiveAgency);
            const agAspect = agProps.width / (agProps.height || 1);
            const maxAgW = 46;
            const maxAgH = 9.5;
            let agW = maxAgH * agAspect;
            let agH = maxAgH;
            if (agW > maxAgW) {
              agW = maxAgW;
              agH = agW / agAspect;
            }
            const isPngAg = effectiveAgency.startsWith('data:image/png') || !effectiveAgency.startsWith('data:image/jpeg');
            doc.addImage(effectiveAgency, isPngAg ? 'PNG' : 'JPEG', tableX + 2, curY, agW, agH, undefined, 'SLOW');
            curY += agH + 6;
          } catch {
            curY += 8;
          }
        } else {
          curY += 8;
        }

        // 4.5 Teléfono destacado (ej. 983 34 21 32)
        if (agencyPhone) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(153, 27, 27); // #991B1B
          doc.text(agencyPhone, tableX + 2, curY + 2);
        }

        // 5. Pie de página legal
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          'Documento comercial no vinculante. Las superficies corresponden a superficie útil interior estimada y pueden variar durante la ejecución de obra.',
          margin,
          pageHeight - 5
        );

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



