/**
 * maskHelper.ts
 * Generación de máscaras binarias en blanco y negro para inpainting quirúrgico con Gemini.
 * Basado en las mejores prácticas de AIStudioFloorPlan:
 * - Negro (#000000): zona preservada al 100% que Gemini no debe alterar.
 * - Blanco (#FFFFFF): zona editable donde se aplica la instrucción de corrección.
 */

import { DefectMark } from '../types';

export interface BrushPath {
  id?: string;
  points: { x: number; y: number }[];
  color?: string;
}

/**
 * Genera una máscara binaria PNG en base64 a partir de un defecto o trazos de pincel.
 * @param renderBase64 Imagen base64 del render sobre el que se dibujó
 * @param defectMark Marca de defecto puntual o trazo
 * @param brushPaths Trazos múltiples del pincel
 * @returns Base64 de la máscara PNG (sin prefijo data:image/png;base64,) o null si no hay marcas
 */
export async function generateBinaryMaskFromDefect(
  renderBase64: string,
  defectMark?: DefectMark | null,
  brushPaths?: BrushPath[]
): Promise<string | null> {
  const hasDefect = !!defectMark;
  const hasPaths = Array.isArray(brushPaths) && brushPaths.length > 0;

  if (!hasDefect && !hasPaths) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1024;
      canvas.height = img.naturalHeight || 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      // 1. Fondo completamente negro (#000000) -> Protección absoluta de áreas no marcadas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Configuración de trazo blanco puro (#FFFFFF) para zonas a modificar
      ctx.strokeStyle = '#FFFFFF';
      ctx.fillStyle = '#FFFFFF';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Grosor del pincel proporcional a la resolución del render (aprox 3.5% del lado menor)
      const strokeWidth = Math.max(24, Math.min(canvas.width, canvas.height) * 0.035);
      ctx.lineWidth = strokeWidth;

      let drawnCount = 0;

      // Dibujar trazo del defectMark si contiene path
      if (defectMark?.path && defectMark.path.length > 0) {
        ctx.beginPath();
        defectMark.path.forEach((pt, i) => {
          const px = (pt.x / 100) * canvas.width;
          const py = (pt.y / 100) * canvas.height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        drawnCount++;
      }

      // Dibujar trazos adicionales de pincel si existen
      if (brushPaths && brushPaths.length > 0) {
        brushPaths.forEach((pathObj) => {
          if (pathObj.points && pathObj.points.length > 0) {
            ctx.beginPath();
            pathObj.points.forEach((pt, i) => {
              const px = (pt.x / 100) * canvas.width;
              const py = (pt.y / 100) * canvas.height;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();
            drawnCount++;
          }
        });
      }

      // Si es un pin o punto único (sin trazo a mano alzada), generar un círculo blanco en esa posición
      if (defectMark && (!defectMark.path || defectMark.path.length <= 1)) {
        const px = (defectMark.x / 100) * canvas.width;
        const py = (defectMark.y / 100) * canvas.height;
        const radius = Math.max(32, Math.min(canvas.width, canvas.height) * 0.055);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fill();
        drawnCount++;
      }

      if (drawnCount === 0) {
        return resolve(null);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const base64Clean = dataUrl.split(',')[1] || null;
      resolve(base64Clean);
    };

    img.onerror = () => resolve(null);
    img.src = `data:image/png;base64,${renderBase64}`;
  });
}
