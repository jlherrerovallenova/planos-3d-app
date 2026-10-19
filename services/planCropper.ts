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

export interface TrimResult {
  trimmedDataUrl: string;
  markers: RoomMarker[];
  wasTrimmed: boolean;
  cropBox?: [number, number, number, number];
}

/**
 * Escanea la imagen buscando el perímetro real del plano arquitectónico,
 * eliminando automáticamente márgenes blancos o vacíos excesivos para que el plano
 * aproveche al máximo el espacio de la ficha y el PDF sin quedar pequeño.
 * Ajusta y remapea las coordenadas relativas de los marcadores de estancia.
 */
export async function autoTrimWhitespace(
  imageSrc: string,
  markers?: RoomMarker[],
  paddingPercent: number = 2.5
): Promise<TrimResult> {
  return new Promise((resolve) => {
    if (!imageSrc) {
      resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w < 50 || h < 50) {
          resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Muestrear las 4 esquinas para detectar el color de fondo predominante (blanco o gris claro)
        const sampleCorner = (pxX: number, pxY: number) => {
          const idx = (pxY * w + pxX) * 4;
          return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
        };
        const c1 = sampleCorner(Math.min(8, w - 1), Math.min(8, h - 1));
        const c2 = sampleCorner(Math.max(0, w - 9), Math.min(8, h - 1));
        const c3 = sampleCorner(Math.min(8, w - 1), Math.max(0, h - 9));
        const c4 = sampleCorner(Math.max(0, w - 9), Math.max(0, h - 9));

        const bgR = Math.round((c1.r + c2.r + c3.r + c4.r) / 4);
        const bgG = Math.round((c1.g + c2.g + c3.g + c4.g) / 4);
        const bgB = Math.round((c1.b + c2.b + c3.b + c4.b) / 4);

        // Muchos planos CAD/PDF tienen un marco o recuadro perimetral a 1-2.5% del borde de la hoja.
        // Ignoramos esa franja exterior para no confundir el marco de la página con los muros de la vivienda.
        const padEdgeX = Math.max(5, Math.min(35, Math.floor(w * 0.02)));
        const padEdgeY = Math.max(5, Math.min(35, Math.floor(h * 0.02)));

        // Detección de píxeles con información gráfica (muros, texturas, suelos, carpinterías)
        const isContent = (x: number, y: number) => {
          if (x < padEdgeX || x >= w - padEdgeX || y < padEdgeY || y >= h - padEdgeY) {
            return false;
          }
          const idx = (y * w + x) * 4;
          const a = data[idx + 3];
          if (a < 25) return false;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const diff = Math.max(Math.abs(r - bgR), Math.abs(g - bgG), Math.abs(b - bgB));
          if (diff > 18) return true;
          return Math.max(r, g, b) < 242;
        };

        let minY = h, maxY = 0;
        let minX = w, maxX = 0;
        let contentFound = false;

        const rowThreshold = Math.max(6, Math.floor(w * 0.008));
        const colThreshold = Math.max(6, Math.floor(h * 0.008));

        // Escanear desde los 4 extremos hacia el centro para hallar con precisión el perímetro de la vivienda
        // 1. Escanear de arriba hacia abajo para minY
        for (let y = padEdgeY; y < h - padEdgeY; y += 2) {
          let count = 0;
          for (let x = padEdgeX; x < w - padEdgeX; x += 2) {
            if (isContent(x, y)) {
              count++;
              if (count >= rowThreshold) {
                minY = y;
                contentFound = true;
                break;
              }
            }
          }
          if (contentFound) break;
        }

        // 2. Escanear de abajo hacia arriba para maxY (asegurar que NUNCA se corte la parte inferior)
        let foundBottom = false;
        for (let y = h - padEdgeY; y >= padEdgeY; y -= 2) {
          let count = 0;
          for (let x = padEdgeX; x < w - padEdgeX; x += 2) {
            if (isContent(x, y)) {
              count++;
              if (count >= rowThreshold) {
                maxY = y;
                foundBottom = true;
                break;
              }
            }
          }
          if (foundBottom) break;
        }

        if (!contentFound || !foundBottom || minY >= maxY) {
          resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
          return;
        }

        // 3. Escanear de izquierda a derecha para minX
        let foundLeft = false;
        for (let x = padEdgeX; x < w - padEdgeX; x += 2) {
          let count = 0;
          for (let y = minY; y <= maxY; y += 2) {
            if (isContent(x, y)) {
              count++;
              if (count >= colThreshold) {
                minX = x;
                foundLeft = true;
                break;
              }
            }
          }
          if (foundLeft) break;
        }

        // 4. Escanear de derecha a izquierda para maxX
        let foundRight = false;
        for (let x = w - padEdgeX; x >= padEdgeX; x -= 2) {
          let count = 0;
          for (let y = minY; y <= maxY; y += 2) {
            if (isContent(x, y)) {
              count++;
              if (count >= colThreshold) {
                maxX = x;
                foundRight = true;
                break;
              }
            }
          }
          if (foundRight) break;
        }

        if (!foundLeft || !foundRight || minX >= maxX) {
          resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
          return;
        }

        // Margen de seguridad generoso (mínimo 3.5%) para jamás recortar muros ni estancias perimetrales
        const effectivePadding = Math.max(3.5, paddingPercent);
        const padX = Math.max(20, Math.round(w * (effectivePadding / 100)));
        const padY = Math.max(20, Math.round(h * (effectivePadding / 100)));

        const cropX = Math.max(0, minX - padX);
        const cropY = Math.max(0, minY - padY);
        const cropW = Math.min(w, maxX + padX) - cropX;
        const cropH = Math.min(h, maxY + padY) - cropY;

        // Si el recorte no es relevante (menos del 4% en ambos ejes)
        if (cropW >= w * 0.96 && cropH >= h * 0.96) {
          resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
          return;
        }

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
          return;
        }

        cropCtx.fillStyle = '#FFFFFF';
        cropCtx.fillRect(0, 0, cropW, cropH);
        cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        const trimmedDataUrl = cropCanvas.toDataURL('image/png', 1.0);

        const remappedMarkers = (markers || []).map((m) => {
          const origPixelX = (m.x / 100) * w;
          const origPixelY = (m.y / 100) * h;
          const newPixelX = origPixelX - cropX;
          const newPixelY = origPixelY - cropY;
          const newPctX = Math.round((newPixelX / cropW) * 1000) / 10;
          const newPctY = Math.round((newPixelY / cropH) * 1000) / 10;
          return {
            ...m,
            x: Math.max(2, Math.min(98, newPctX)),
            y: Math.max(2, Math.min(98, newPctY))
          };
        });

        resolve({
          trimmedDataUrl,
          markers: remappedMarkers,
          wasTrimmed: true,
          cropBox: [
            Math.round((cropY / h) * 1000),
            Math.round((cropX / w) * 1000),
            Math.round(((cropY + cropH) / h) * 1000),
            Math.round(((cropX + cropW) / w) * 1000)
          ]
        });
      } catch (err) {
        console.warn('Error en autoTrimWhitespace:', err);
        resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
      }
    };
    img.onerror = () => {
      resolve({ trimmedDataUrl: imageSrc, markers: markers || [], wasTrimmed: false });
    };
    img.src = imageSrc;
  });
}

