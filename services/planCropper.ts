import { RoomMarker } from '../types';
import { cleanBase64Data } from './downloadHelper';

/**
 * planCropper.ts
 * Servicio para aislar y recortar de forma milimétrica el plano de la vivienda,
 * eliminando por completo márgenes vacíos, listados de precios exteriores,
 * cartelas, sellos o dibujos secundarios que contenga la imagen importada.
 */

export interface CropResult {
  croppedDataUrl: string;
  cleanBase64: string;
  mimeType: string;
  cropBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] en escala 0-1000
}

/**
 * Determina si la caja detectada representa un plano con elementos exteriores a aislar
 * (por ejemplo, columnas de precios laterales, cartelas o márgenes que ocupan espacio).
 */
export function isSignificantCrop(box2d?: [number, number, number, number]): boolean {
  if (!box2d || box2d.length !== 4) return false;
  const [ymin, xmin, ymax, xmax] = box2d;
  const w = xmax - xmin;
  const h = ymax - ymin;

  // Si el plano no llena toda la imagen (ocupa menos del 88% en ancho o alto)
  // o está desplazado por tener textos o precios en un lateral (xmin > 60 o xmax < 940)
  return w < 880 || h < 880 || xmin > 60 || ymin > 60 || xmax < 940 || ymax < 940;
}

/**
 * Recorta la imagen al perímetro exacto de la vivienda (blueprintBoundingBox)
 * aplicando un margen de seguridad (padding) para no cortar muros ni cotas límite.
 */
export async function cropImageToBoundingBox(
  imageSrc: string,
  box2d: [number, number, number, number],
  paddingPercent: number = 2.5
): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;

        let [ymin, xmin, ymax, xmax] = box2d;

        // Añadir margen de seguridad en porcentaje de escala 0-1000
        const padX = paddingPercent * 10;
        const padY = paddingPercent * 10;

        const cropYmin = Math.max(0, ymin - padY);
        const cropXmin = Math.max(0, xmin - padX);
        const cropYmax = Math.min(1000, ymax + padY);
        const cropXmax = Math.min(1000, xmax + padX);

        // Convertir a píxeles
        const pxX = Math.floor((cropXmin / 1000) * imgW);
        const pxY = Math.floor((cropYmin / 1000) * imgH);
        const pxW = Math.max(50, Math.ceil(((cropXmax - cropXmin) / 1000) * imgW));
        const pxH = Math.max(50, Math.ceil(((cropYmax - cropYmin) / 1000) * imgH));

        // Crear canvas con las dimensiones del recorte
        const canvas = document.createElement('canvas');
        canvas.width = pxW;
        canvas.height = pxH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const { cleanBase64, mimeType } = cleanBase64Data(imageSrc);
          resolve({
            croppedDataUrl: imageSrc,
            cleanBase64,
            mimeType,
            cropBox: box2d
          });
          return;
        }

        // Fondo blanco neutro
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, pxW, pxH);

        // Dibujar la sub-región de la vivienda
        ctx.drawImage(img, pxX, pxY, pxW, pxH, 0, 0, pxW, pxH);

        const croppedDataUrl = canvas.toDataURL('image/png', 1.0);
        const { cleanBase64, mimeType } = cleanBase64Data(croppedDataUrl);

        resolve({
          croppedDataUrl,
          cleanBase64,
          mimeType,
          cropBox: [cropYmin, cropXmin, cropYmax, cropXmax]
        });
      } catch (err) {
        console.error('Error al recortar el plano:', err);
        const { cleanBase64, mimeType } = cleanBase64Data(imageSrc);
        resolve({
          croppedDataUrl: imageSrc,
          cleanBase64,
          mimeType,
          cropBox: box2d
        });
      }
    };

    img.onerror = (e) => {
      reject(new Error('No se pudo cargar la imagen para aislar el plano.'));
    };

    img.src = imageSrc;
  });
}

/**
 * Reasigna las coordenadas relativas (0 - 100) de los marcadores de estancias
 * para que encajen exactamente en el nuevo encuadre del plano recortado.
 */
export function remapMarkersToCrop(
  markers: RoomMarker[],
  cropBox: [number, number, number, number]
): RoomMarker[] {
  const [ymin, xmin, ymax, xmax] = cropBox;
  const boxW = Math.max(1, (xmax - xmin) / 10); // ancho en porcentaje 0-100
  const boxH = Math.max(1, (ymax - ymin) / 10); // alto en porcentaje 0-100
  const startX = xmin / 10;
  const startY = ymin / 10;

  return markers.map((m) => {
    const newX = Math.round((((m.x - startX) / boxW) * 100) * 10) / 10;
    const newY = Math.round((((m.y - startY) / boxH) * 100) * 10) / 10;
    return {
      ...m,
      x: Math.max(3, Math.min(97, newX)),
      y: Math.max(3, Math.min(97, newY))
    };
  });
}
