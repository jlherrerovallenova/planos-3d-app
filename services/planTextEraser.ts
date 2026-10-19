/**
 * planTextEraser.ts
 * Motor quirúrgico de borrado arquitectónico para eliminar nombres de estancias
 * y cifras de superficies (m²) sin dañar JAMÁS muros, tabiques, puertas ni mobiliario.
 */

export interface TextBoxDetection {
  text?: string;
  box2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] en escala 0 - 1000
}

/**
 * Muestrea los píxeles perimetrales exteriores a una caja de texto para obtener
 * el color/tonalidad exacto del suelo de esa estancia concreta, ignorando trazos de muros o tinta.
 */
function sampleSurroundingFloorColor(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  x: number,
  y: number,
  w: number,
  h: number
): { r: number; g: number; b: number; luma: number } {
  const samples: { r: number; g: number; b: number; luma: number }[] = [];

  const addSample = (sx: number, sy: number) => {
    if (sx < 0 || sy < 0 || sx >= imgW || sy >= imgH) return;
    try {
      const p = ctx.getImageData(Math.floor(sx), Math.floor(sy), 1, 1).data;
      const luma = 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
      // Descartar píxeles oscuros (trazos de letras, muros o cotas)
      if (luma > 140) {
        samples.push({ r: p[0], g: p[1], b: p[2], luma });
      }
    } catch {
      // Ignorar fuera de límites
    }
  };

  // Muestrear borde exterior perimetral (a 3-5px de distancia)
  const topY = Math.max(0, y - 4);
  const bottomY = Math.min(imgH - 1, y + h + 4);
  const leftX = Math.max(0, x - 4);
  const rightX = Math.min(imgW - 1, x + w + 4);

  const stepX = Math.max(1, Math.floor(w / 10));
  for (let sx = x; sx <= x + w; sx += stepX) {
    addSample(sx, topY);
    addSample(sx, bottomY);
  }

  const stepY = Math.max(1, Math.floor(h / 6));
  for (let sy = y; sy <= y + h; sy += stepY) {
    addSample(leftX, sy);
    addSample(rightX, sy);
  }

  if (samples.length === 0) {
    // Si no se encuentran muestras claras cerca (ej. texto pegado a un tabique), buscar más lejos
    for (let r = 8; r <= 16; r += 4) {
      addSample(Math.max(0, x - r), Math.max(0, y - r));
      addSample(Math.min(imgW - 1, x + w + r), Math.min(imgH - 1, y + h + r));
      if (samples.length >= 4) break;
    }
  }

  if (samples.length === 0) {
    return { r: 250, g: 250, b: 248, luma: 250 }; // Papel/suelo neutro claro
  }

  // Ordenar por luminosidad y tomar la mediana para máxima robustez
  samples.sort((a, b) => a.luma - b.luma);
  const median = samples[Math.floor(samples.length / 2)];
  return { r: median.r, g: median.g, b: median.b, luma: median.luma };
}

/**
 * Inpaint quirúrgico para una región rectangular:
 * - Detecta píxeles de tinta correspondientes a texto (letras y números).
 * - Identifica y PRESERVA al 100% elementos arquitectónicos estructurales
 *   (muros, tabiques, arcos de puertas, mobiliario) que toquen o crucen el parche
 *   verificando su continuidad exterior fuera de la caja.
 * - Solo sustituye los píxeles de glifos de texto aislados por el color del suelo circundante.
 */
/**
 * Inpaint quirúrgico para una región rectangular:
 * - Detecta píxeles de tinta correspondientes a texto (letras y números).
 * - Identifica y PRESERVA al 100% elementos arquitectónicos estructurales
 *   (muros, tabiques, arcos de puertas, mobiliario) que toquen o crucen el parche
 *   verificando si forman trazos continuos que cruzan de lado a lado.
 * - Sustituye los píxeles de glifos de texto (letras, cifras y rótulos) por el color del suelo circundante.
 */
function inpaintPatchSurgically(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  patchX: number,
  patchY: number,
  patchW: number,
  patchH: number
): void {
  if (patchW <= 0 || patchH <= 0) return;

  const floor = sampleSurroundingFloorColor(ctx, imgW, imgH, patchX, patchY, patchW, patchH);

  // Leer la imagen del parche interior
  const patchData = ctx.getImageData(patchX, patchY, patchW, patchH);
  const data = patchData.data;
  const totalPixels = patchW * patchH;

  // 0: Fondo (suelo intacto), 1: Tinta candidata
  const mask = new Uint8Array(totalPixels);

  for (let y = 0; y < patchH; y++) {
    for (let x = 0; x < patchW; x++) {
      const idx = (y * patchW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const dist = Math.hypot(r - floor.r, g - floor.g, b - floor.b);

      if ((floor.luma - luma > 25) || (dist > 30)) {
        mask[y * patchW + x] = 1; // Tinta
      } else {
        mask[y * patchW + x] = 0; // Suelo
      }
    }
  }

  // Agrupar tinta en componentes conexas (8-conectividad)
  const visited = new Uint8Array(totalPixels);
  const queueX = new Int32Array(totalPixels);
  const queueY = new Int32Array(totalPixels);
  const compPixels: number[] = [];

  let erasedCount = 0;

  for (let startY = 0; startY < patchH; startY++) {
    for (let startX = 0; startX < patchW; startX++) {
      const startIdx = startY * patchW + startX;
      if (mask[startIdx] !== 1 || visited[startIdx] === 1) continue;

      compPixels.length = 0;
      let qHead = 0;
      let qTail = 0;

      queueX[qTail] = startX;
      queueY[qTail] = startY;
      qTail++;
      visited[startIdx] = 1;

      let minX = startX;
      let maxX = startX;
      let minY = startY;
      let maxY = startY;

      while (qHead < qTail) {
        const cx = queueX[qHead];
        const cy = queueY[qHead];
        qHead++;

        const cIdx = cy * patchW + cx;
        compPixels.push(cIdx);

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < patchW && ny >= 0 && ny < patchH) {
              const nIdx = ny * patchW + nx;
              if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queueX[qTail] = nx;
                queueY[qTail] = ny;
                qTail++;
              }
            }
          }
        }
      }

      const compW = maxX - minX + 1;
      const compH = maxY - minY + 1;

      // Un trazo pertenece a una línea de muro o tabique estructural SÓLO SI:
      // es un trazo continuo fino que atraviesa el parche de extremo a extremo
      const spansFullHeight = (minY <= 1 && maxY >= patchH - 2 && compH >= patchH - 2);
      const spansFullWidth = (minX <= 1 && maxX >= patchW - 2 && compW >= patchW - 2);
      const isStructuralWall = (spansFullHeight && compW <= 7) || (spansFullWidth && compH <= 7);

      // Si no es un muro estructural que atraviesa de lado a lado, es texto (letras, cifras o símbolos) -> BORRAR
      if (!isStructuralWall) {
        for (let i = 0; i < compPixels.length; i++) {
          const idx = compPixels[i] * 4;
          data[idx] = floor.r;
          data[idx + 1] = floor.g;
          data[idx + 2] = floor.b;
          data[idx + 3] = 255;
          erasedCount++;
        }
      }
    }
  }

  // Volcar al canvas si hubo borrado
  if (erasedCount > 0) {
    ctx.putImageData(patchData, patchX, patchY);
  }
}

/**
 * Elimina de la imagen del plano todos los textos de las estancias recibidas
 * en coordenadas normalizadas [ymin, xmin, ymax, xmax] aplicando borrado quirúrgico
 * con preservación total de muros, tabiques y elementos arquitectónicos.
 */
export async function cleanPlanTextsFromBoxes(
  imageSrc: string,
  textBoxes: TextBoxDetection[]
): Promise<string> {
  if (!imageSrc || !textBoxes || textBoxes.length === 0) {
    return imageSrc;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // 1. Dibujar el plano original completo en el canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgW = canvas.width;
        const imgH = canvas.height;

        // 2. Iterar sobre cada caja de texto detectada y aplicar inpainting quirúrgico
        textBoxes.forEach((box) => {
          if (!box.box2d || box.box2d.length !== 4) return;
          const [ymin, xmin, ymax, xmax] = box.box2d;
          if (ymin >= ymax || xmin >= xmax) return;

          // Convertir de escala 0-1000 a píxeles
          const rawX = (xmin / 1000) * imgW;
          const rawY = (ymin / 1000) * imgH;
          const rawW = ((xmax - xmin) / 1000) * imgW;
          const rawH = ((ymax - ymin) / 1000) * imgH;

          // FILTRO DE CORDURA: Los rótulos de estancias y m² nunca ocupan más del 35% del ancho ni 12% del alto
          // Si una caja es gigante, es un error de detección que abarcaría toda una habitación. Se descarta.
          if (rawW > imgW * 0.35 || rawH > imgH * 0.12) {
            return;
          }
          if (rawW < 4 || rawH < 4) {
            return;
          }

          // Margen quirúrgico adecuado para asegurar que los extremos de letras (ascendentes/descendentes) queden cubiertos
          const padX = Math.max(6, Math.min(16, Math.round(rawW * 0.05)));
          const padY = Math.max(6, Math.min(14, Math.round(rawH * 0.12)));

          const patchX = Math.max(0, Math.floor(rawX - padX));
          const patchY = Math.max(0, Math.floor(rawY - padY));
          const patchW = Math.min(imgW - patchX, Math.floor(rawW + padX * 2));
          const patchH = Math.min(imgH - patchY, Math.floor(rawH + padY * 2));

          inpaintPatchSurgically(ctx, imgW, imgH, patchX, patchY, patchW, patchH);
        });

        // 3. Devolver la nueva imagen quirúrgicamente limpia de textos con muros intactos
        const cleanedDataUrl = canvas.toDataURL('image/png', 1.0);
        resolve(cleanedDataUrl);
      } catch (err) {
        console.error('Error al limpiar textos del plano:', err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Borrado manual por clic / pincel: el usuario hace clic sobre un texto rebelde en el plano.
 * Se aplica borrado quirúrgico con preservación automática de muros y líneas adyacentes.
 */
export async function eraseTextAtCoordinate(
  imageSrc: string,
  clickXPercent: number,
  clickYPercent: number,
  patchRadiusPercent: number = 1.5
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgW = canvas.width;
        const imgH = canvas.height;

        const centerX = (clickXPercent / 100) * imgW;
        const centerY = (clickYPercent / 100) * imgH;

        // Radio quirúrgico ajustado (entre 12px y 30px máx para no invadir estancias contiguas)
        const radiusX = Math.max(12, Math.min(30, (patchRadiusPercent / 100) * imgW));
        const radiusY = Math.max(8, Math.min(22, (patchRadiusPercent / 100) * imgH * 0.7));

        const patchX = Math.max(0, Math.floor(centerX - radiusX));
        const patchY = Math.max(0, Math.floor(centerY - radiusY));
        const patchW = Math.min(imgW - patchX, Math.floor(radiusX * 2));
        const patchH = Math.min(imgH - patchY, Math.floor(radiusY * 2));

        inpaintPatchSurgically(ctx, imgW, imgH, patchX, patchY, patchW, patchH);

        resolve(canvas.toDataURL('image/png', 1.0));
      } catch (err) {
        console.error('Error al borrar quirúrgicamente texto en coordenada:', err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}
