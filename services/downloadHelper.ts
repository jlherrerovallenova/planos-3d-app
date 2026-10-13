/**
 * downloadHelper.ts
 * Utilidades seguras de descarga para Flow SDK y navegadores estándar.
 */

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

export async function exportCommercialBrochureImage({
  imageSrc,
  projectTitle,
  markers,
  filename = 'ficha_comercial_arquitectura.png'
}: {
  imageSrc: string;
  projectTitle: string;
  markers: Array<{ id: string; name: string; areaSqMeters?: number }>;
  filename?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = 1920;
        const height = 1080;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(false);
          return;
        }

        // 1. Fondo blanco comercial
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // 2. Encabezado comercial
        ctx.fillStyle = '#0F2C59';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText(projectTitle.toUpperCase(), 60, 72);

        ctx.fillStyle = '#64748B';
        ctx.font = '600 15px sans-serif';
        ctx.fillText('FICHA COMERCIAL • PLANO AMUEBLADO Y CUADRO DE SUPERFICIES ÚTILES', 60, 102);

        // Línea divisoria superior
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, 120);
        ctx.lineTo(width - 60, 120);
        ctx.stroke();

        // 3. Plano Render en el área izquierda
        const planAreaX = 60;
        const planAreaY = 145;
        const planAreaW = 1280;
        const planAreaH = 830;

        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(planAreaX, planAreaY, planAreaW, planAreaH, 16);
        } else {
          ctx.rect(planAreaX, planAreaY, planAreaW, planAreaH);
        }
        ctx.fill();

        const imgAspect = img.width / img.height;
        let drawW = planAreaW - 40;
        let drawH = (planAreaW - 40) / imgAspect;
        if (drawH > planAreaH - 40) {
          drawH = planAreaH - 40;
          drawW = (planAreaH - 40) * imgAspect;
        }
        const drawX = planAreaX + (planAreaW - drawW) / 2;
        const drawY = planAreaY + (planAreaH - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // 4. Cuadro de Superficies Útiles en el área derecha
        const tableX = 1370;
        const tableY = 145;
        const tableW = 490;
        const tableH = 830;

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(tableX, tableY, tableW, tableH, 16);
        } else {
          ctx.rect(tableX, tableY, tableW, tableH);
        }
        ctx.fill();
        ctx.stroke();

        // Título exacto en Azul Marino
        ctx.fillStyle = '#0F2C59';
        ctx.font = '900 20px sans-serif';
        ctx.fillText('CUADRO DE SUPERFICIES ÚTILES', tableX + 30, tableY + 52);

        // Franja azul marino continua
        ctx.fillStyle = '#0F2C59';
        ctx.fillRect(tableX + 30, tableY + 68, tableW - 60, 5);

        // Estancias numeradas
        let currentY = tableY + 115;
        let totalArea = 0;

        markers.forEach((marker, idx) => {
          const numStr = String(idx + 1).padStart(2, '0') + '.';
          const area = marker.areaSqMeters || 0;
          totalArea += area;
          const areaStr =
            area > 0
              ? area.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
              : '—';

          // Número
          ctx.fillStyle = '#0F2C59';
          ctx.font = '900 16px monospace';
          ctx.fillText(numStr, tableX + 30, currentY);

          // Nombre de la estancia
          ctx.fillStyle = '#1B365D';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(marker.name.toUpperCase(), tableX + 70, currentY);

          // Superficie m²
          ctx.fillStyle = '#0F2C59';
          ctx.font = '900 16px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(areaStr, tableX + tableW - 30, currentY);
          ctx.textAlign = 'left';

          // Línea divisoria tenue
          ctx.strokeStyle = '#F1F5F9';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tableX + 30, currentY + 14);
          ctx.lineTo(tableX + tableW - 30, currentY + 14);
          ctx.stroke();

          currentY += 46;
        });

        // Total
        if (markers.length > 0 && totalArea > 0) {
          const totalY = Math.max(currentY + 25, tableY + tableH - 60);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tableX + 30, totalY - 22);
          ctx.lineTo(tableX + tableW - 30, totalY - 22);
          ctx.stroke();

          ctx.fillStyle = '#0F2C59';
          ctx.font = '900 15px sans-serif';
          ctx.fillText('SUPERFICIE ÚTIL TOTAL', tableX + 30, totalY);

          ctx.font = '900 20px sans-serif';
          ctx.textAlign = 'right';
          const totalStr =
            totalArea.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
          ctx.fillText(totalStr, tableX + tableW - 30, totalY);
          ctx.textAlign = 'left';
        }

        // 5. Pie de página con aviso legal
        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px sans-serif';
        ctx.fillText(
          'Documento con carácter orientativo y comercial. Las superficies son aproximadas y susceptibles de modificación por exigencias técnicas durante la ejecución.',
          60,
          1030
        );

        const dataUrl = canvas.toDataURL('image/png');
        const { cleanBase64 } = cleanBase64Data(dataUrl);
        safeDownloadFile({
          base64: cleanBase64,
          mimeType: 'image/png',
          filename
        }).then(resolve);
      } catch (e) {
        console.error('Error generando ficha comercial:', e);
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = imageSrc;
  });
}

