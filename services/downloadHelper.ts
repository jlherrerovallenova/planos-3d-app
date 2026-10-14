/**
 * downloadHelper.ts
 * Utilidades seguras de descarga para Flow SDK y navegadores estándar.
 */

import { jsPDF } from 'jspdf';
import { sortRoomMarkers } from './roomSorter';
import { DEFAULT_PROMOTION_LOGO } from './defaultPromotionLogo';

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
  width = 2480,
  height = 1754
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  width?: number;
  height?: number;
}): Promise<HTMLCanvasElement | null> {
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

        const badgeBg = markerBadgeColor || '#0F2C59';
        const badgeTextColor = getContrastColor(badgeBg);

        // Proporción de escala respecto al tamaño base (2480 x 1754 es A4 300DPI)
        const scale = width / 1920;
        const sortedMarkers = sortRoomMarkers(markers || []);

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

        // Si hay logo de la promoción, dibujarlo en la esquina superior derecha del encabezado
        if (promotionLogo) {
          try {
            await new Promise<void>((resolveLogo) => {
              const logoImg = new Image();
              logoImg.crossOrigin = 'anonymous';
              logoImg.onload = () => {
                const logoAspect = logoImg.width / logoImg.height;
                const maxLogoH = 68 * scale;
                const maxLogoW = 320 * scale;
                let drawLogoH = maxLogoH;
                let drawLogoW = drawLogoH * logoAspect;
                if (drawLogoW > maxLogoW) {
                  drawLogoW = maxLogoW;
                  drawLogoH = drawLogoW / logoAspect;
                }
                const logoX = width - headerMarginX - drawLogoW;
                const logoY = 26 * scale + (maxLogoH - drawLogoH) / 2;
                ctx.drawImage(logoImg, logoX, logoY, drawLogoW, drawLogoH);
                resolveLogo();
              };
              logoImg.onerror = () => resolveLogo();
              logoImg.src = promotionLogo;
            });
          } catch (e) {
            console.warn('Error dibujando logo de promoción en canvas:', e);
          }
        }

        // Línea divisoria superior
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(headerMarginX, 122 * scale);
        ctx.lineTo(width - headerMarginX, 122 * scale);
        ctx.stroke();

        // 3. Plano Render en el área izquierda (Ocupa al menos el 75% del ancho disponible)
        const planAreaX = 50 * scale;
        const planAreaY = 145 * scale;
        const planAreaW = 1400 * scale;
        const planAreaH = (height - 145 * scale - 70 * scale);

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(planAreaX, planAreaY, planAreaW, planAreaH, 16 * scale);
        } else {
          ctx.rect(planAreaX, planAreaY, planAreaW, planAreaH);
        }
        ctx.fill();
        ctx.stroke();

        const imgAspect = img.width / img.height;
        const padding = 16 * scale;
        let drawW = planAreaW - padding * 2;
        let drawH = drawW / imgAspect;
        if (drawH > planAreaH - padding * 2) {
          drawH = planAreaH - padding * 2;
          drawW = drawH * imgAspect;
        }
        const drawX = planAreaX + (planAreaW - drawW) / 2;
        const drawY = planAreaY + (planAreaH - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Señalizar cada estancia en el plano con el color de badge personalizado
        if (sortedMarkers && sortedMarkers.length > 0) {
          const radius = 17 * scale;
          sortedMarkers.forEach((m: any, idx: number) => {
            if (typeof m.x === 'number' && typeof m.y === 'number') {
              const markerX = drawX + (m.x / 100) * drawW;
              const markerY = drawY + (m.y / 100) * drawH;

              // Anillo exterior blanco para contraste sobre fondos oscuros o texturas
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(markerX, markerY, radius + 2.5 * scale, 0, Math.PI * 2);
              ctx.fill();

              // Círculo personalizado
              ctx.fillStyle = badgeBg;
              ctx.beginPath();
              ctx.arc(markerX, markerY, radius, 0, Math.PI * 2);
              ctx.fill();

              // Número con color contrastante
              ctx.fillStyle = badgeTextColor;
              ctx.font = `bold ${Math.round(18 * scale)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(idx + 1), markerX, markerY + 1 * scale);
            }
          });
        }

        // 4. Cuadro de Superficies Útiles en el área derecha (25% del ancho disponible)
        const tableX = 1470 * scale;
        const tableY = 145 * scale;
        const tableW = 400 * scale;
        const tableH = planAreaH;

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(tableX, tableY, tableW, tableH, 16 * scale);
        } else {
          ctx.rect(tableX, tableY, tableW, tableH);
        }
        ctx.fill();
        ctx.stroke();

        // Título exacto en Azul Marino
        ctx.fillStyle = '#0F2C59';
        ctx.font = `900 ${Math.round(20 * scale)}px sans-serif`;
        ctx.fillText('CUADRO DE SUPERFICIES ÚTILES', tableX + 30 * scale, tableY + 52 * scale);

        // Franja azul marino continua
        ctx.fillStyle = '#0F2C59';
        ctx.fillRect(tableX + 30 * scale, tableY + 68 * scale, tableW - 60 * scale, 5 * scale);

        // Estancias numeradas
        let currentY = tableY + 115 * scale;
        const rowHeight = 44 * scale;
        let totalArea = 0;

        sortedMarkers.forEach((marker, idx) => {
          const numStr = String(idx + 1).padStart(2, '0') + '.';
          const area = marker.areaSqMeters || 0;
          totalArea += area;
          const areaStr =
            area > 0
              ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
              : '—';

          // Número
          ctx.fillStyle = '#0F2C59';
          ctx.font = `900 ${Math.round(15 * scale)}px monospace`;
          ctx.fillText(numStr, tableX + 30 * scale, currentY);

          // Nombre de la estancia
          ctx.fillStyle = '#1B365D';
          ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
          ctx.fillText(marker.name.toUpperCase(), tableX + 68 * scale, currentY);

          // Superficie m²
          ctx.fillStyle = '#0F2C59';
          ctx.font = `900 ${Math.round(15 * scale)}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(areaStr, tableX + tableW - 30 * scale, currentY);
          ctx.textAlign = 'left';

          // Línea divisoria tenue
          ctx.strokeStyle = '#F1F5F9';
          ctx.lineWidth = 1 * scale;
          ctx.beginPath();
          ctx.moveTo(tableX + 30 * scale, currentY + 14 * scale);
          ctx.lineTo(tableX + tableW - 30 * scale, currentY + 14 * scale);
          ctx.stroke();

          currentY += rowHeight;
        });

        // Total
        if (markers.length > 0 && totalArea > 0) {
          const totalY = Math.max(currentY + 20 * scale, tableY + tableH - 50 * scale);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.moveTo(tableX + 30 * scale, totalY - 22 * scale);
          ctx.lineTo(tableX + tableW - 30 * scale, totalY - 22 * scale);
          ctx.stroke();

          ctx.fillStyle = '#0F2C59';
          ctx.font = `900 ${Math.round(14 * scale)}px sans-serif`;
          ctx.fillText('SUPERFICIE ÚTIL TOTAL', tableX + 30 * scale, totalY);

          ctx.font = `900 ${Math.round(18 * scale)}px sans-serif`;
          ctx.textAlign = 'right';
          const totalStr =
            totalArea.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
          ctx.fillText(totalStr, tableX + tableW - 30 * scale, totalY);
          ctx.textAlign = 'left';
        }

        // 5. Pie de página con aviso legal
        ctx.fillStyle = '#94A3B8';
        ctx.font = `${Math.round(12 * scale)}px sans-serif`;
        ctx.fillText(
          'Documento con carácter orientativo y comercial. Las superficies son aproximadas y susceptibles de modificación por exigencias técnicas durante la ejecución.',
          headerMarginX,
          height - 25 * scale
        );

        resolve(canvas);
      } catch (e) {
        console.error('Error generando canvas de ficha:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

export async function exportCommercialBrochureImage({
  imageSrc,
  projectTitle,
  markers,
  markerBadgeColor,
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  filename = 'ficha_comercial_arquitectura.png'
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  filename?: string;
}): Promise<boolean> {
  const canvas = await generateBrochureCanvas({
    imageSrc,
    projectTitle,
    markers,
    markerBadgeColor,
    promotionLogo,
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
  markerBadgeColor = '#0F2C59',
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  filename = 'ficha_comercial_plano.pdf'
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  filename?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const badgeRgb = hexToRgb(markerBadgeColor || '#0F2C59');
        const badgeTextColor = getContrastColor(markerBadgeColor || '#0F2C59');
        const textRgb = hexToRgb(badgeTextColor);

        // A4 Landscape: 297mm x 210mm
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const pageWidth = 297;
        const pageHeight = 210;
        const margin = 12;

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

        // Logo de la promoción a la derecha del encabezado
        const effectiveLogo = promotionLogo || DEFAULT_PROMOTION_LOGO;
        if (effectiveLogo) {
          try {
            const logoMaxH = 10; // mm
            const logoMaxW = 42; // mm (relación de aspecto ~3.8:1)
            const logoAspect = 881 / 232;
            let drawLogoW = logoMaxH * logoAspect;
            let drawLogoH = logoMaxH;
            if (drawLogoW > logoMaxW) {
              drawLogoW = logoMaxW;
              drawLogoH = drawLogoW / logoAspect;
            }
            const logoX = pageWidth - margin - drawLogoW;
            const logoY = margin + (11 - drawLogoH) / 2;
            const isPngLogo = effectiveLogo.startsWith('data:image/png') || !effectiveLogo.startsWith('data:image/jpeg');
            doc.addImage(effectiveLogo, isPngLogo ? 'PNG' : 'JPEG', logoX, logoY, drawLogoW, drawLogoH, undefined, 'SLOW');

            // Referencia comercial a la izquierda del logo
            doc.setFont('courier', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text('REF: VT-01', logoX - 4, margin + 6, { align: 'right' });
          } catch (logoErr) {
            console.warn('Error insertando logo en PDF:', logoErr);
          }
        } else {
          // Referencia comercial a la derecha si no hay logo
          doc.setFont('courier', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('REF: VT-01', pageWidth - margin, margin + 4.5, { align: 'right' });
        }

        // Línea divisoria superior
        doc.setDrawColor(226, 232, 240); // #E2E8F0
        doc.setLineWidth(0.4);
        doc.line(margin, margin + 12, pageWidth - margin, margin + 12);

        // 3. Distribución: Plano (Ocupa al menos el 75% del ancho útil) y Cuadro de Superficies (25%)
        const contentY = margin + 16;
        const contentHeight = pageHeight - contentY - 12; // Dejar 12mm para pie
        const tableWidth = 64;
        const tableX = pageWidth - margin - tableWidth;
        const planWidth = tableX - margin - 5;

        // Recuadro contenedor arquitectónico para el plano (Fondo blanco puro, manteniendo el borde)
        doc.setFillColor(255, 255, 255); // Fondo blanco puro
        doc.setDrawColor(203, 213, 225); // Borde arquitectónico (#CBD5E1)
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, contentY, planWidth, contentHeight, 3, 3, 'FD');

        // Inserción directa de la imagen original en alta definición (sin rasterizado intermedio)
        const imgNaturalW = img.naturalWidth || img.width || 1920;
        const imgNaturalH = img.naturalHeight || img.height || 1080;
        const imgAspect = imgNaturalW / imgNaturalH;

        const planPad = 2;
        const maxImgW = planWidth - planPad * 2;
        const maxImgH = contentHeight - planPad * 2;

        let imgW = maxImgW;
        let imgH = imgW / imgAspect;
        if (imgH > maxImgH) {
          imgH = maxImgH;
          imgW = imgH * imgAspect;
        }

        const imgX = margin + (planWidth - imgW) / 2;
        const imgY = contentY + (contentHeight - imgH) / 2;

        // Detectar formato de la imagen para máxima fidelidad
        const isPng = imageSrc.startsWith('data:image/png') || !imageSrc.startsWith('data:image/jpeg');
        const imgFormat = isPng ? 'PNG' : 'JPEG';

        // Inserción con remuestreo de máxima calidad ('SLOW' bicúbico en jsPDF)
        doc.addImage(imageSrc, imgFormat, imgX, imgY, imgW, imgH, undefined, 'SLOW');

        const sortedMarkers = sortRoomMarkers(markers || []);

        // Señalizar cada estancia en el plano con círculo personalizado
        if (sortedMarkers && sortedMarkers.length > 0) {
          const circleRadius = 3.2; // mm (~6.4mm diámetro)
          sortedMarkers.forEach((m: any, idx: number) => {
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

        // 4. Cuadro de Superficies Útiles (Elementos 100% Vectoriales, Zoom Infinito)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225); // #CBD5E1
        doc.setLineWidth(0.4);
        doc.roundedRect(tableX, contentY, tableWidth, contentHeight, 3, 3, 'FD');

        // Título del Cuadro
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(badgeRgb.r, badgeRgb.g, badgeRgb.b);
        doc.text('CUADRO DE SUPERFICIES ÚTILES', tableX + 4, contentY + 7.5);

        // Barra decorativa continua
        doc.setFillColor(badgeRgb.r, badgeRgb.g, badgeRgb.b);
        doc.rect(tableX + 4, contentY + 10, tableWidth - 8, 1.3, 'F');

        // Filas de estancias numeradas
        let currentY = contentY + 17;
        const availableRowSpace = contentHeight - 32;
        const rowSpacing = Math.min(9, Math.max(6.5, availableRowSpace / Math.max(1, sortedMarkers.length)));
        let totalArea = 0;

        sortedMarkers.forEach((m, idx) => {
          const numStr = String(idx + 1).padStart(2, '0') + '.';
          const area = m.areaSqMeters || 0;
          totalArea += area;
          const areaStr =
            area > 0
              ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
              : '—';

          // Número de orden
          doc.setFont('courier', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(badgeRgb.r, badgeRgb.g, badgeRgb.b);
          doc.text(numStr, tableX + 4, currentY);

          // Nombre de la estancia
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(27, 54, 93);
          const maxNameW = tableWidth - 26;
          const cleanName = doc.splitTextToSize(m.name.toUpperCase(), maxNameW)[0];
          doc.text(cleanName, tableX + 11.5, currentY);

          // Superficie útil
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 44, 89);
          doc.text(areaStr, tableX + tableWidth - 4, currentY, { align: 'right' });

          // Línea divisoria tenue
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(tableX + 4, currentY + 2.2, tableX + tableWidth - 4, currentY + 2.2);

          currentY += rowSpacing;
        });

        // Total Superficie Útil
        if (sortedMarkers.length > 0 && totalArea > 0) {
          const totalY = contentY + contentHeight - 8;
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.5);
          doc.line(tableX + 4, totalY - 4.5, tableX + tableWidth - 4, totalY - 4.5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 44, 89);
          doc.text('SUPERFICIE ÚTIL TOTAL', tableX + 4, totalY);

          const totalStr =
            totalArea.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
          doc.setFontSize(8.5);
          doc.text(totalStr, tableX + tableWidth - 4, totalY, { align: 'right' });
        }

        // 5. Pie de página legal
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          'Documento comercial no vinculante. Las superficies corresponden a superficie útil interior estimada y pueden variar durante la ejecución de obra.',
          margin,
          pageHeight - 5.5
        );

        doc.setFont('helvetica', 'bold');
        doc.text('LUBENS ARROYO • Arquitectura & Promociones Inmobiliarias', pageWidth - margin, pageHeight - 5.5, { align: 'right' });

        const sanitizedName = sanitizeFilename(filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`);
        doc.save(sanitizedName);
        resolve(true);
      } catch (err) {
        console.error('Error al generar PDF vectorial:', err);
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = imageSrc;
  });
}

export async function exportPlanOnlyPDF({
  imageSrc,
  projectTitle = 'Plano',
  paperFormat = 'a4',
  markers = [],
  markerBadgeColor = '#0F2C59',
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  filename = 'plano_alta_resolucion.pdf'
}: {
  imageSrc: string;
  projectTitle?: string;
  paperFormat?: 'a4' | 'a3';
  markers?: Array<{ id: string; name: string; x?: number; y?: number; areaSqMeters?: number }>;
  markerBadgeColor?: string;
  promotionLogo?: string | null;
  filename?: string;
}): Promise<boolean> {
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

        // Si hay logo de la promoción, dibujarlo en la esquina superior derecha
        const effectiveLogo = promotionLogo || DEFAULT_PROMOTION_LOGO;
        if (effectiveLogo) {
          try {
            const logoMaxH = isA3 ? 10 : 8;
            const logoMaxW = isA3 ? 42 : 34;
            const logoAspect = 881 / 232;
            let drawLogoW = logoMaxH * logoAspect;
            let drawLogoH = logoMaxH;
            if (drawLogoW > logoMaxW) {
              drawLogoW = logoMaxW;
              drawLogoH = drawLogoW / logoAspect;
            }
            const logoX = pageWidth - margin - drawLogoW;
            const logoY = margin + (11 - drawLogoH) / 2;
            const isPngLogo = effectiveLogo.startsWith('data:image/png') || !effectiveLogo.startsWith('data:image/jpeg');
            doc.addImage(effectiveLogo, isPngLogo ? 'PNG' : 'JPEG', logoX, logoY, drawLogoW, drawLogoH, undefined, 'SLOW');
          } catch (logoErr) {
            console.warn('Error insertando logo en PDF de plano:', logoErr);
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

        const isPng = imageSrc.startsWith('data:image/png') || !imageSrc.startsWith('data:image/jpeg');
        const imgFormat = isPng ? 'PNG' : 'JPEG';

        // Inserción directa en máxima resolución sin pérdida
        doc.addImage(imageSrc, imgFormat, drawX, drawY, drawW, drawH, undefined, 'SLOW');

        const sortedMarkers = sortRoomMarkers(markers || []);

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
    img.src = imageSrc;
  });
}



