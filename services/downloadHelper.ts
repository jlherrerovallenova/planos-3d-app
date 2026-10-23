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


function drawCanvasRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function parseUnitFloorAndLetter(unitId?: string): string {
  if (!unitId) return 'PLANTA 1ª · LETRA A';
  const clean = unitId.trim();
  const match = clean.match(/(?:(?:portal\s*\d+)?\s*[·\-\s]\s*)?(\d+)[ºª\s]*\s*([a-zA-Z])/i);
  if (match) {
    return `PLANTA ${match[1]}ª · LETRA ${match[2].toUpperCase()}`;
  }
  const plantaMatch = clean.match(/planta\s*([^\s·\-]+)/i);
  const letraMatch = clean.match(/letra\s*([a-zA-Z])/i);
  if (plantaMatch || letraMatch) {
    return `PLANTA ${plantaMatch ? plantaMatch[1] : '1ª'} · LETRA ${letraMatch ? letraMatch[1].toUpperCase() : 'A'}`;
  }
  return clean.toUpperCase();
}

function countRoomTypes(markers: Array<{ id: string; name: string; category?: string; isExterior?: boolean }>) {
  let bed = 0;
  let bath = 0;
  let terr = 0;

  (markers || []).forEach((m) => {
    const name = (m.name || '').toLowerCase();
    const cat = (m.category || '').toLowerCase();
    if (
      cat === 'dormitorio' ||
      name.includes('dormitorio') ||
      name.includes('habitación') ||
      name.includes('habitacion') ||
      name.includes('bedroom')
    ) {
      bed++;
    } else if (
      cat === 'baño' ||
      name.includes('baño') ||
      name.includes('bano') ||
      name.includes('aseo') ||
      name.includes('bath')
    ) {
      bath++;
    } else if (
      cat === 'exterior' ||
      m.isExterior ||
      name.includes('terraza') ||
      name.includes('balcón') ||
      name.includes('balcon') ||
      name.includes('porche') ||
      name.includes('tendedero') ||
      name.includes('patio')
    ) {
      terr++;
    }
  });

  return {
    bedroomsCount: bed || 2,
    bathroomsCount: bath || 2,
    terracesCount: terr || 2
  };
}

export async function generateBrochureCanvas({
  imageSrc,
  projectTitle,
  markers,
  markerBadgeColor = '#102A45',
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  promotorLogo = DEFAULT_PROMUEVE_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  agencyPhone = '983 34 21 32',
  unitIdentifier = 'Portal 1 · 1º A',
  customTotalUsefulArea,
  width = 2480,
  height = 1754
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number; category?: string; isExterior?: boolean }>;
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

        const scale = width / 1920;
        const schedule = categorizeRoomsForSchedule(effectiveMarkers as any, customTotalUsefulArea);
        const { bedroomsCount, bathroomsCount, terracesCount } = countRoomTypes(effectiveMarkers as any);
        const floorAndLetterText = parseUnitFloorAndLetter(unitIdentifier);
        const badgeRgb = hexToRgb(markerBadgeColor || '#102A45');

        // 1. Fondo blanco comercial
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // 2. Encabezado comercial
        const headerMarginX = 64 * scale;
        const headerTopY = 48 * scale;

        // Kicker: FICHA COMERCIAL · PLANO AMUEBLADO
        ctx.fillStyle = '#64748B';
        ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
        ctx.fillText('FICHA COMERCIAL · PLANO AMUEBLADO', headerMarginX, headerTopY);

        // Título del Proyecto: Title Case / Navy #102A45
        ctx.fillStyle = '#102A45';
        ctx.font = `bold ${Math.round(32 * scale)}px sans-serif`;
        ctx.fillText(projectTitle || 'Proyecto residencial de 140 viviendas', headerMarginX, headerTopY + 36 * scale);

        // Logo de la Promoción (LUBENS ARROYO) a la derecha
        const effectivePromo = promotionLogo || DEFAULT_PROMOTION_LOGO;
        if (effectivePromo) {
          try {
            await new Promise<void>((resolveLogo) => {
              const logoImg = new Image();
              logoImg.crossOrigin = 'anonymous';
              logoImg.onload = () => {
                const logoAspect = logoImg.width / logoImg.height;
                const maxLogoH = 65 * scale;
                const maxLogoW = 280 * scale;
                let drawLogoH = maxLogoH;
                let drawLogoW = drawLogoH * logoAspect;
                if (drawLogoW > maxLogoW) {
                  drawLogoW = maxLogoW;
                  drawLogoH = drawLogoW / logoAspect;
                }
                const logoX = width - headerMarginX - drawLogoW;
                const logoY = headerTopY - 10 * scale + (maxLogoH - drawLogoH) / 2;
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
        const dividerY = headerTopY + 54 * scale;
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.moveTo(headerMarginX, dividerY);
        ctx.lineTo(width - headerMarginX, dividerY);
        ctx.stroke();

        // 3. Distribución del cuerpo:
        // Columna Izquierda (~66%): Tarjeta redondeada arena/beige con plano limpio
        // Columna Derecha (~34%): Tarjeta VIVIENDA + Tabla + Promueve/Comercializa + Teléfono
        const bodyY = dividerY + 28 * scale;
        const bodyH = height - bodyY - 50 * scale;
        const rightColW = 560 * scale;
        const colGap = 36 * scale;
        const leftColW = width - headerMarginX * 2 - rightColW - colGap;
        const leftColX = headerMarginX;
        const rightColX = leftColX + leftColW + colGap;

        // 3.1 Tarjeta Izquierda para el Plano (#F8F6F1)
        ctx.fillStyle = '#F8F6F1';
        drawCanvasRoundedRect(ctx, leftColX, bodyY, leftColW, bodyH, 4 * scale);
        ctx.fill();

        ctx.strokeStyle = '#E7E5E4';
        ctx.lineWidth = 1.2 * scale;
        drawCanvasRoundedRect(ctx, leftColX, bodyY, leftColW, bodyH, 4 * scale);
        ctx.stroke();

        // Área interna de imagen (dejando margen superior e inferior para el pie de tarjeta)
        const planPadX = 32 * scale;
        const planPadY = 28 * scale;
        const planFooterH = 44 * scale;
        const maxPlanW = leftColW - planPadX * 2;
        const maxPlanH = bodyH - planPadY * 2 - planFooterH;

        const imgAspect = img.width / img.height;
        let drawW = maxPlanW;
        let drawH = drawW / imgAspect;
        if (drawH > maxPlanH) {
          drawH = maxPlanH;
          drawW = drawH * imgAspect;
        }
        const drawX = leftColX + planPadX + (maxPlanW - drawW) / 2;
        const drawY = bodyY + planPadY + (maxPlanH - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Señalizar marcadores numerados de estancias sobre el plano
        if (markers && markers.length > 0) {
          const sortedMarkers = sortRoomMarkers(markers);
          const circleRadius = 14 * scale;
          sortedMarkers.forEach((m: any, idx: number) => {
            if (typeof m.x === 'number' && typeof m.y === 'number') {
              const markerX = drawX + (m.x / 100) * drawW;
              const markerY = drawY + (m.y / 100) * drawH;

              // Sombra / halo suave
              ctx.save();
              ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
              ctx.shadowBlur = 6 * scale;
              ctx.shadowOffsetY = 2 * scale;

              // Anillo blanco
              ctx.beginPath();
              ctx.arc(markerX, markerY, circleRadius + 2.5 * scale, 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
              ctx.restore();

              // Círculo corporativo
              ctx.beginPath();
              ctx.arc(markerX, markerY, circleRadius, 0, Math.PI * 2);
              ctx.fillStyle = markerBadgeColor || '#102A45';
              ctx.fill();

              // Número correlativo de la estancia
              ctx.fillStyle = '#FFFFFF';
              ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(idx + 1), markerX, markerY + 0.5 * scale);
            }
          });
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }

        // Línea divisoria interior y pie de la tarjeta del plano
        const planCardFooterY = bodyY + bodyH - planFooterH;
        ctx.strokeStyle = '#E7E5E4';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(leftColX + 24 * scale, planCardFooterY);
        ctx.lineTo(leftColX + leftColW - 24 * scale, planCardFooterY);
        ctx.stroke();

        ctx.fillStyle = '#A8A29E';
        ctx.font = `500 ${Math.round(13 * scale)}px sans-serif`;
        ctx.fillText('Plano orientativo · Sin escala', leftColX + 28 * scale, planCardFooterY + 26 * scale);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#102A45';
        ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
        ctx.fillText(floorAndLetterText, leftColX + leftColW - 28 * scale, planCardFooterY + 26 * scale);
        ctx.textAlign = 'left';

        // 3.2 Columna Derecha
        let rightY = bodyY;

        // Tarjeta Azul Marino VIVIENDA (#102A45)
        const navyCardH = 130 * scale;
        ctx.fillStyle = '#102A45';
        drawCanvasRoundedRect(ctx, rightColX, rightY, rightColW, navyCardH, 4 * scale);
        ctx.fill();

        // Kicker VIVIENDA
        ctx.fillStyle = '#CBD5E1';
        ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`;
        ctx.fillText('VIVIENDA', rightColX + 24 * scale, rightY + 30 * scale);

        // Identificador de Vivienda (Portal 1 · 1º A)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 ${Math.round(28 * scale)}px sans-serif`;
        ctx.fillText(unitIdentifier || 'Portal 1 · 1º A', rightColX + 24 * scale, rightY + 68 * scale);

        // Badges / Pastillas: [ 2 dormitorios ] [ 2 baños ] [ 2 terrazas ]
        const badgeY = rightY + 84 * scale;
        const badgeH = 26 * scale;
        let badgeX = rightColX + 24 * scale;

        const badgesList = [
          `${bedroomsCount} ${bedroomsCount === 1 ? 'dormitorio' : 'dormitorios'}`,
          `${bathroomsCount} ${bathroomsCount === 1 ? 'baño' : 'baños'}`
        ];
        if (terracesCount > 0) {
          badgesList.push(`${terracesCount} ${terracesCount === 1 ? 'terraza' : 'terrazas'}`);
        }

        ctx.font = `600 ${Math.round(12 * scale)}px sans-serif`;
        badgesList.forEach((badgeText) => {
          const textW = ctx.measureText(badgeText).width;
          const bW = textW + 20 * scale;

          ctx.fillStyle = '#16385e';
          drawCanvasRoundedRect(ctx, badgeX, badgeY, bW, badgeH, 13 * scale);
          ctx.fill();

          ctx.strokeStyle = '#38bdf840';
          ctx.lineWidth = 1 * scale;
          drawCanvasRoundedRect(ctx, badgeX, badgeY, bW, badgeH, 13 * scale);
          ctx.stroke();

          ctx.fillStyle = '#E0F2FE';
          ctx.fillText(badgeText, badgeX + 10 * scale, badgeY + 18 * scale);

          badgeX += bW + 10 * scale;
        });

        rightY += navyCardH + 24 * scale;

        // Tabla de Superficies Útiles
        const tableRowH = 28 * scale;
        const totalInterior = schedule.interiorRooms.length > 0 ? schedule.interiorRooms : [
          { name: 'Vestíbulo', areaSqMeters: 4.80 },
          { name: 'Cocina', areaSqMeters: 10.25 },
          { name: 'Salón-comedor', areaSqMeters: 24.50 },
          { name: 'Distribuidor', areaSqMeters: 3.60 },
          { name: 'Dormitorio principal', areaSqMeters: 14.20 },
          { name: 'Dormitorio 2', areaSqMeters: 10.80 },
          { name: 'Baño 1', areaSqMeters: 4.50 },
          { name: 'Baño 2', areaSqMeters: 3.90 }
        ];

        totalInterior.forEach((room: any) => {
          ctx.fillStyle = '#1C1917';
          ctx.font = `500 ${Math.round(14 * scale)}px sans-serif`;
          ctx.fillText(room.name, rightColX + 8 * scale, rightY + 18 * scale);

          const areaVal = room.areaSqMeters || 0;
          const areaText = areaVal > 0 ? `${areaVal.toFixed(2).replace('.', ',')} m²` : '— m²';
          ctx.textAlign = 'right';
          ctx.fillStyle = '#102A45';
          ctx.font = `600 ${Math.round(14 * scale)}px sans-serif`;
          ctx.fillText(areaText, rightColX + rightColW - 8 * scale, rightY + 18 * scale);
          ctx.textAlign = 'left';

          ctx.strokeStyle = '#E7E5E4';
          ctx.lineWidth = 0.8 * scale;
          ctx.beginPath();
          ctx.moveTo(rightColX + 8 * scale, rightY + tableRowH);
          ctx.lineTo(rightColX + rightColW - 8 * scale, rightY + tableRowH);
          ctx.stroke();

          rightY += tableRowH;
        });

        // Subtotal Útil Interior
        rightY += 4 * scale;
        ctx.fillStyle = '#102A45';
        ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
        ctx.fillText('Superficie útil interior', rightColX + 8 * scale, rightY + 18 * scale);

        const interiorTotalNum = schedule.interiorTotal > 0 ? schedule.interiorTotal : 76.55;
        ctx.textAlign = 'right';
        ctx.fillText(`${interiorTotalNum.toFixed(2).replace('.', ',')} m²`, rightColX + rightColW - 8 * scale, rightY + 18 * scale);
        ctx.textAlign = 'left';

        ctx.strokeStyle = '#D6D3D1';
        ctx.lineWidth = 1.2 * scale;
        ctx.beginPath();
        ctx.moveTo(rightColX + 8 * scale, rightY + tableRowH);
        ctx.lineTo(rightColX + rightColW - 8 * scale, rightY + tableRowH);
        ctx.stroke();
        rightY += tableRowH + 4 * scale;

        // Estancias Exteriores (Terrazas)
        const exteriorList = schedule.exteriorRooms.length > 0 ? schedule.exteriorRooms : [
          { name: 'Terraza 1', areaSqMeters: 6.40 },
          { name: 'Terraza 2', areaSqMeters: 3.20 }
        ];

        exteriorList.forEach((extRoom: any) => {
          ctx.fillStyle = '#1C1917';
          ctx.font = `500 ${Math.round(14 * scale)}px sans-serif`;
          ctx.fillText(extRoom.name, rightColX + 8 * scale, rightY + 18 * scale);

          const areaVal = extRoom.areaSqMeters || 0;
          const areaText = areaVal > 0 ? `${areaVal.toFixed(2).replace('.', ',')} m²` : '— m²';
          ctx.textAlign = 'right';
          ctx.fillStyle = '#102A45';
          ctx.font = `600 ${Math.round(14 * scale)}px sans-serif`;
          ctx.fillText(areaText, rightColX + rightColW - 8 * scale, rightY + 18 * scale);
          ctx.textAlign = 'left';

          ctx.strokeStyle = '#E7E5E4';
          ctx.lineWidth = 0.8 * scale;
          ctx.beginPath();
          ctx.moveTo(rightColX + 8 * scale, rightY + tableRowH);
          ctx.lineTo(rightColX + rightColW - 8 * scale, rightY + tableRowH);
          ctx.stroke();

          rightY += tableRowH;
        });

        // Fila Total Destacada en Azul Cielo (#E1EEF9)
        rightY += 8 * scale;
        const totalBarH = 38 * scale;
        ctx.fillStyle = '#E1EEF9';
        drawCanvasRoundedRect(ctx, rightColX + 4 * scale, rightY, rightColW - 8 * scale, totalBarH, 8 * scale);
        ctx.fill();

        ctx.fillStyle = '#102A45';
        ctx.font = `bold ${Math.round(15 * scale)}px sans-serif`;
        ctx.fillText('SUPERFICIE ÚTIL TOTAL', rightColX + 16 * scale, rightY + 24 * scale);

        const grandTotalNum = schedule.grandTotal > 0 ? schedule.grandTotal : 86.15;
        ctx.textAlign = 'right';
        ctx.font = `900 ${Math.round(16 * scale)}px sans-serif`;
        ctx.fillText(`${grandTotalNum.toFixed(2).replace('.', ',')} m²`, rightColX + rightColW - 16 * scale, rightY + 24 * scale);
        ctx.textAlign = 'left';
        rightY += totalBarH + 24 * scale;

        // Bloque Inferior: PROMUEVE, COMERCIALIZA e INFORMACIÓN Y VENTA (Anclado siempre a la base)
        const bottomSectionH = 135 * scale;
        const targetBottomY = bodyY + bodyH - bottomSectionH;
        const entityY = Math.max(rightY + 20 * scale, targetBottomY);

        const entityColW = (rightColW - 20 * scale) / 2;

        // PROMUEVE
        ctx.fillStyle = '#78716C';
        ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
        ctx.fillText('PROMUEVE', rightColX + 8 * scale, entityY);

        const effectivePromotor = promotorLogo || DEFAULT_PROMUEVE_LOGO;
        if (effectivePromotor) {
          try {
            await new Promise<void>((resolveProm) => {
              const pImg = new Image();
              pImg.crossOrigin = 'anonymous';
              pImg.onload = () => {
                const maxH = 46 * scale;
                const maxW = entityColW - 16 * scale;
                const asp = pImg.width / pImg.height;
                let w = maxH * asp;
                let h = maxH;
                if (w > maxW) {
                  w = maxW;
                  h = w / asp;
                }
                ctx.drawImage(pImg, rightColX + 8 * scale, entityY + 8 * scale, w, h);
                resolveProm();
              };
              pImg.onerror = () => resolveProm();
              pImg.src = effectivePromotor;
            });
          } catch {
            // fallback
          }
        }

        // COMERCIALIZA
        const comColX = rightColX + entityColW + 20 * scale;
        ctx.fillStyle = '#78716C';
        ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
        ctx.fillText('COMERCIALIZA', comColX, entityY);

        const effectiveAgency = agencyLogo || DEFAULT_AGENCY_LOGO;
        if (effectiveAgency) {
          try {
            await new Promise<void>((resolveAg) => {
              const aImg = new Image();
              aImg.crossOrigin = 'anonymous';
              aImg.onload = () => {
                const maxH = 46 * scale;
                const maxW = entityColW - 16 * scale;
                const asp = aImg.width / aImg.height;
                let w = maxH * asp;
                let h = maxH;
                if (w > maxW) {
                  w = maxW;
                  h = w / asp;
                }
                ctx.drawImage(aImg, comColX, entityY + 8 * scale, w, h);
                resolveAg();
              };
              aImg.onerror = () => resolveAg();
              aImg.src = effectiveAgency;
            });
          } catch {
            // fallback
          }
        }

        const infoVentaY = entityY + 68 * scale;

        // INFORMACIÓN Y VENTA (A la derecha, debajo de TERRAVALL)
        ctx.fillStyle = '#78716C';
        ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
        ctx.fillText('INFORMACIÓN Y VENTA', comColX, infoVentaY);

        ctx.fillStyle = '#C5221F';
        ctx.font = `900 ${Math.round(34 * scale)}px sans-serif`;
        ctx.fillText(agencyPhone || '983 34 21 32', comColX, infoVentaY + 36 * scale);

        // 4. Pie de página legal
        const footerY = height - 26 * scale;
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(headerMarginX, footerY - 14 * scale);
        ctx.lineTo(width - headerMarginX, footerY - 14 * scale);
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = `normal ${Math.round(12 * scale)}px sans-serif`;
        ctx.fillText(
          'Documento comercial no vinculante. Las superficies corresponden a superficie útil interior estimada y pueden variar durante la ejecución de obra.',
          headerMarginX,
          footerY
        );

        ctx.textAlign = 'right';
        ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
        ctx.fillStyle = '#102A45';
        ctx.fillText(unitIdentifier || 'Portal 1 · 1º A', width - headerMarginX, footerY);
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
  markerBadgeColor = '#102A45',
  promotionLogo = DEFAULT_PROMOTION_LOGO,
  promotorLogo = DEFAULT_PROMUEVE_LOGO,
  agencyLogo = DEFAULT_AGENCY_LOGO,
  agencyPhone = '983 34 21 32',
  unitIdentifier = 'Portal 1 · 1º A',
  customTotalUsefulArea,
  filename = 'ficha_comercial_plano.pdf'
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number; category?: string; isExterior?: boolean }>;
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
        const schedule = categorizeRoomsForSchedule(effectiveMarkers as any, customTotalUsefulArea);
        const { bedroomsCount, bathroomsCount, terracesCount } = countRoomTypes(effectiveMarkers as any);
        const floorAndLetterText = parseUnitFloorAndLetter(unitIdentifier);
        const badgeRgb = hexToRgb(markerBadgeColor || '#102A45');

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

        // 2. Encabezado corporativo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // #64748B
        doc.text('FICHA COMERCIAL · PLANO AMUEBLADO', margin, margin + 3.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(16, 42, 69); // #102A45
        doc.text(projectTitle || 'Proyecto residencial de 140 viviendas', margin, margin + 9.5);

        // Logo de la promoción (LUBENS ARROYO) a la derecha
        const effectiveLogo = promotionLogo || DEFAULT_PROMOTION_LOGO;
        if (effectiveLogo) {
          try {
            const logoMaxH = 9.5;
            const logoMaxW = 38;
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
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, margin + 12, pageWidth - margin, margin + 12);

        // 3. Distribución:
        // Columna Izquierda (Plano en caja arena #F8F6F1)
        // Columna Derecha (Tarjeta Azul VIVIENDA + Tabla + Entidades)
        const contentY = margin + 15;
        const contentH = pageHeight - contentY - 11;
        const rightColW = 82;
        const colGap = 6;
        const leftColW = pageWidth - margin * 2 - rightColW - colGap;
        const leftColX = margin;
        const rightColX = leftColX + leftColW + colGap;

        // 3.1 Caja izquierda con fondo arena
        doc.setFillColor(248, 246, 241); // #F8F6F1
        doc.roundedRect(leftColX, contentY, leftColW, contentH, 0.8, 0.8, 'F');
        doc.setDrawColor(231, 229, 228); // #E7E5E4
        doc.setLineWidth(0.2);
        doc.roundedRect(leftColX, contentY, leftColW, contentH, 0.8, 0.8, 'S');

        // Imagen del plano centrada
        const planPad = 6;
        const planFooterH = 8;
        const maxPlanW = leftColW - planPad * 2;
        const maxPlanH = contentH - planPad * 2 - planFooterH;

        const imgNaturalW = img.naturalWidth || img.width || 1920;
        const imgNaturalH = img.naturalHeight || img.height || 1080;
        const imgAspect = imgNaturalW / imgNaturalH;

        let imgW = maxPlanW;
        let imgH = imgW / imgAspect;
        if (imgH > maxPlanH) {
          imgH = maxPlanH;
          imgW = imgH * imgAspect;
        }

        const imgX = leftColX + planPad + (maxPlanW - imgW) / 2;
        const imgY = contentY + planPad + (maxPlanH - imgH) / 2;

        const isPng = effectiveImageSrc.startsWith('data:image/png') || !effectiveImageSrc.startsWith('data:image/jpeg');
        doc.addImage(effectiveImageSrc, isPng ? 'PNG' : 'JPEG', imgX, imgY, imgW, imgH, undefined, 'SLOW');

        // Pines numerados de estancias en el plano del PDF
        if (markers && markers.length > 0) {
          const sortedMarkers = sortRoomMarkers(markers);
          const circleRadius = 2.8; // mm
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

              // Número correlativo de estancia
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.5);
              doc.setTextColor(255, 255, 255);
              doc.text(String(idx + 1), markerX, markerY + 0.9, { align: 'center' });
            }
          });
        }

        // Pie interior de la caja del plano
        const planCardFooterY = contentY + contentH - planFooterH;
        doc.setDrawColor(231, 229, 228);
        doc.setLineWidth(0.2);
        doc.line(leftColX + 4, planCardFooterY, leftColX + leftColW - 4, planCardFooterY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(168, 162, 158); // #A8A29E
        doc.text('Plano orientativo · Sin escala', leftColX + 5, planCardFooterY + 5.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(16, 42, 69); // #102A45
        doc.text(floorAndLetterText, leftColX + leftColW - 5, planCardFooterY + 5.2, { align: 'right' });

        // 3.2 Columna Derecha
        let curY = contentY;

        // Tarjeta Azul Marino VIVIENDA (#102A45)
        const navyCardH = 22;
        doc.setFillColor(16, 42, 69); // #102A45
        doc.roundedRect(rightColX, curY, rightColW, navyCardH, 0.8, 0.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(203, 213, 225); // #CBD5E1
        doc.text('VIVIENDA', rightColX + 4, curY + 4.8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text(unitIdentifier || 'Portal 1 · 1º A', rightColX + 4, curY + 11.2);

        // Badges: [ 2 dormitorios ] [ 2 baños ] [ 2 terrazas ]
        const badgeY = curY + 14;
        let badgeX = rightColX + 4;
        const badges = [
          `${bedroomsCount} ${bedroomsCount === 1 ? 'dormitorio' : 'dormitorios'}`,
          `${bathroomsCount} ${bathroomsCount === 1 ? 'baño' : 'baños'}`
        ];
        if (terracesCount > 0) {
          badges.push(`${terracesCount} ${terracesCount === 1 ? 'terraza' : 'terrazas'}`);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        badges.forEach((bText) => {
          const txtW = doc.getTextWidth(bText);
          const bW = txtW + 4;
          const bH = 5;

          doc.setFillColor(22, 56, 94); // #16385e
          doc.roundedRect(badgeX, badgeY, bW, bH, 2, 2, 'F');
          doc.setDrawColor(56, 189, 248);
          doc.setLineWidth(0.1);
          doc.roundedRect(badgeX, badgeY, bW, bH, 2, 2, 'S');

          doc.setTextColor(224, 242, 254); // #E0F2FE
          doc.text(bText, badgeX + 2, badgeY + 3.6);
          badgeX += bW + 2.5;
        });

        curY += navyCardH + 4.5;

        // Filas de estancias interiores
        const rowH = 4.3;
        const totalInterior = schedule.interiorRooms.length > 0 ? schedule.interiorRooms : [
          { name: 'Vestíbulo', areaSqMeters: 4.80 },
          { name: 'Cocina', areaSqMeters: 10.25 },
          { name: 'Salón-comedor', areaSqMeters: 24.50 },
          { name: 'Distribuidor', areaSqMeters: 3.60 },
          { name: 'Dormitorio principal', areaSqMeters: 14.20 },
          { name: 'Dormitorio 2', areaSqMeters: 10.80 },
          { name: 'Baño 1', areaSqMeters: 4.50 },
          { name: 'Baño 2', areaSqMeters: 3.90 }
        ];

        totalInterior.forEach((room: any) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(28, 25, 23); // #1C1917
          doc.text(room.name, rightColX + 2, curY + 3);

          const areaVal = room.areaSqMeters || 0;
          const areaText = areaVal > 0 ? `${areaVal.toFixed(2).replace('.', ',')} m²` : '— m²';
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(16, 42, 69);
          doc.text(areaText, rightColX + rightColW - 2, curY + 3, { align: 'right' });

          doc.setDrawColor(231, 229, 228);
          doc.setLineWidth(0.15);
          doc.line(rightColX + 2, curY + rowH, rightColX + rightColW - 2, curY + rowH);

          curY += rowH;
        });

        // Subtotal Útil Interior
        curY += 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(16, 42, 69);
        doc.text('Superficie útil interior', rightColX + 2, curY + 3.2);

        const interiorTotalNum = schedule.interiorTotal > 0 ? schedule.interiorTotal : 76.55;
        doc.text(`${interiorTotalNum.toFixed(2).replace('.', ',')} m²`, rightColX + rightColW - 2, curY + 3.2, { align: 'right' });

        doc.setDrawColor(214, 211, 209);
        doc.setLineWidth(0.25);
        doc.line(rightColX + 2, curY + rowH + 0.5, rightColX + rightColW - 2, curY + rowH + 0.5);
        curY += rowH + 1.5;

        // Estancias Exteriores (Terrazas)
        const exteriorList = schedule.exteriorRooms.length > 0 ? schedule.exteriorRooms : [
          { name: 'Terraza 1', areaSqMeters: 6.40 },
          { name: 'Terraza 2', areaSqMeters: 3.20 }
        ];

        exteriorList.forEach((extRoom: any) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(28, 25, 23);
          doc.text(extRoom.name, rightColX + 2, curY + 3);

          const areaVal = extRoom.areaSqMeters || 0;
          const areaText = areaVal > 0 ? `${areaVal.toFixed(2).replace('.', ',')} m²` : '— m²';
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(16, 42, 69);
          doc.text(areaText, rightColX + rightColW - 2, curY + 3, { align: 'right' });

          doc.setDrawColor(231, 229, 228);
          doc.setLineWidth(0.15);
          doc.line(rightColX + 2, curY + rowH, rightColX + rightColW - 2, curY + rowH);

          curY += rowH;
        });

        // Franja Superficie Útil Total (#E1EEF9)
        curY += 2;
        const totalBarH = 7;
        doc.setFillColor(225, 238, 249); // #E1EEF9
        doc.roundedRect(rightColX + 1, curY, rightColW - 2, totalBarH, 2, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(16, 42, 69);
        doc.text('SUPERFICIE ÚTIL TOTAL', rightColX + 3.5, curY + 4.8);

        const grandTotalNum = schedule.grandTotal > 0 ? schedule.grandTotal : 86.15;
        doc.setFontSize(8.5);
        doc.text(`${grandTotalNum.toFixed(2).replace('.', ',')} m²`, rightColX + rightColW - 3.5, curY + 4.8, { align: 'right' });
        curY += totalBarH + 4.5;

        // Bloque Inferior: PROMUEVE, COMERCIALIZA e INFORMACIÓN Y VENTA (Anclado siempre a la base)
        const pdfBottomSectionH = 26; // mm
        const targetPdfBottomY = contentY + contentH - pdfBottomSectionH;
        const entityY = Math.max(curY + 3, targetPdfBottomY);

        const entityColW = (rightColW - 4) / 2;

        // PROMUEVE
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(120, 113, 108); // #78716C
        doc.text('PROMUEVE', rightColX + 2, entityY);

        const effectivePromotor = promotorLogo || DEFAULT_PROMUEVE_LOGO;
        if (effectivePromotor) {
          try {
            const promProps = doc.getImageProperties(effectivePromotor);
            const promAspect = promProps.width / (promProps.height || 1);
            const maxPromW = entityColW - 4;
            const maxPromH = 7.5;
            let promW = maxPromH * promAspect;
            let promH = maxPromH;
            if (promW > maxPromW) {
              promW = maxPromW;
              promH = promW / promAspect;
            }
            const isPngProm = effectivePromotor.startsWith('data:image/png') || !effectivePromotor.startsWith('data:image/jpeg');
            doc.addImage(effectivePromotor, isPngProm ? 'PNG' : 'JPEG', rightColX + 2, entityY + 1.5, promW, promH, undefined, 'SLOW');
          } catch {
            // fallback
          }
        }

        // COMERCIALIZA
        const comColX = rightColX + entityColW + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(120, 113, 108);
        doc.text('COMERCIALIZA', comColX, entityY);

        const effectiveAgency = agencyLogo || DEFAULT_AGENCY_LOGO;
        if (effectiveAgency) {
          try {
            const agProps = doc.getImageProperties(effectiveAgency);
            const agAspect = agProps.width / (agProps.height || 1);
            const maxAgW = entityColW - 4;
            const maxAgH = 7.5;
            let agW = maxAgH * agAspect;
            let agH = maxAgH;
            if (agW > maxAgW) {
              agW = maxAgW;
              agH = agW / agAspect;
            }
            const isPngAg = effectiveAgency.startsWith('data:image/png') || !effectiveAgency.startsWith('data:image/jpeg');
            doc.addImage(effectiveAgency, isPngAg ? 'PNG' : 'JPEG', comColX, entityY + 1.5, agW, agH, undefined, 'SLOW');
          } catch {
            // fallback
          }
        }

        const infoVentaY = entityY + 12;

        // INFORMACIÓN Y VENTA (A la derecha, debajo de TERRAVALL)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(120, 113, 108);
        doc.text('INFORMACIÓN Y VENTA', comColX, infoVentaY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(197, 34, 31); // #C5221F
        doc.text(agencyPhone || '983 34 21 32', comColX, infoVentaY + 6);

        // 4. Pie de página legal
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 7, pageWidth - margin, pageHeight - 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          'Documento comercial no vinculante. Las superficies corresponden a superficie útil interior estimada y pueden variar durante la ejecución de obra.',
          margin,
          pageHeight - 4
        );

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(16, 42, 69);
        doc.text(unitIdentifier || 'Portal 1 · 1º A', pageWidth - margin, pageHeight - 4, { align: 'right' });

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



