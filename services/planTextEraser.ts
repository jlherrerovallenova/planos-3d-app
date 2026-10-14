/**
 * planTextEraser.ts
 * Utilidad arquitectónica para eliminar/borrar de forma limpia y profesional
 * todos los textos, nombres de estancias y números de superficies (m²)
 * del plano, sustituyéndolos por el material/color exacto del pavimento circundante.
 */

export interface TextBoxDetection {
  text?: string;
  box2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] en escala 0 - 1000
}

/**
 * Muestrea los píxeles perimetrales exteriores a una caja de texto para obtener
 * el color/tonalidad exacto del suelo de esa estancia concreta.
 */
function sampleSurroundingFloorColor(
  ctx: CanvasRenderingContext2D,
  imgW: number,
  imgH: number,
  x: number,
  y: number,
  w: number,
  h: number
): { r: number; g: number; b: number } {
  const samples: { r: number; g: number; b: number; luma: number }[] = [];

  const addSample = (sx: number, sy: number) => {
    if (sx < 0 || sy < 0 || sx >= imgW || sy >= imgH) return;
    try {
      const p = ctx.getImageData(Math.floor(sx), Math.floor(sy), 1, 1).data;
      // Descartar píxeles completamente negros o muy oscuros (trazos de letras o muros)
      const luma = 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
      if (luma > 75) {
        samples.push({ r: p[0], g: p[1], b: p[2], luma });
      }
    } catch {
      // Ignorar fuera de límites
    }
  };

  // Muestrear borde superior (a 3-5px por encima del texto)
  const topY = Math.max(0, y - 4);
  const bottomY = Math.min(imgH - 1, y + h + 4);
  const leftX = Math.max(0, x - 4);
  const rightX = Math.min(imgW - 1, x + w + 4);

  for (let sx = x; sx <= x + w; sx += Math.max(1, Math.floor(w / 8))) {
    addSample(sx, topY);
    addSample(sx, bottomY);
  }

  for (let sy = y; sy <= y + h; sy += Math.max(1, Math.floor(h / 4))) {
    addSample(leftX, sy);
    addSample(rightX, sy);
  }

  if (samples.length === 0) {
    return { r: 245, g: 242, b: 236 }; // Suelo neutro por defecto
  }

  // Ordenar por luminosidad y tomar la mediana para evitar ruido
  samples.sort((a, b) => a.luma - b.luma);
  const median = samples[Math.floor(samples.length / 2)];
  return { r: median.r, g: median.g, b: median.b };
}

/**
 * Elimina de la imagen del plano todos los textos de las estancias recibidas
 * en coordenadas normalizadas [ymin, xmin, ymax, xmax].
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

        // 2. Iterar sobre cada caja de texto detectada y parcharla con el color del suelo
        textBoxes.forEach((box) => {
          if (!box.box2d || box.box2d.length !== 4) return;
          const [ymin, xmin, ymax, xmax] = box.box2d;

          // Convertir de escala 0-1000 a píxeles
          const rawX = (xmin / 1000) * imgW;
          const rawY = (ymin / 1000) * imgH;
          const rawW = ((xmax - xmin) / 1000) * imgW;
          const rawH = ((ymax - ymin) / 1000) * imgH;

          // Margen de seguridad (padding) para cubrir tildes, rabillos y sombras tipográficas
          const padX = Math.max(3, rawW * 0.08);
          const padY = Math.max(3, rawH * 0.15);

          const patchX = Math.max(0, rawX - padX);
          const patchY = Math.max(0, rawY - padY);
          const patchW = Math.min(imgW - patchX, rawW + padX * 2);
          const patchH = Math.min(imgH - patchY, rawH + padY * 2);

          // Obtener el color muestreado del suelo circundante
          const floor = sampleSurroundingFloorColor(ctx, imgW, imgH, patchX, patchY, patchW, patchH);

          // Aplicar parche con ligera suavidad en los bordes
          ctx.save();
          ctx.fillStyle = `rgb(${floor.r}, ${floor.g}, ${floor.b})`;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(patchX, patchY, patchW, patchH, 3);
          } else {
            ctx.rect(patchX, patchY, patchW, patchH);
          }
          ctx.fill();

          // Sutil difuminado perimetral para integración perfecta con el suelo
          ctx.strokeStyle = `rgba(${floor.r}, ${floor.g}, ${floor.b}, 0.5)`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        });

        // 3. Devolver la nueva imagen completamente limpia de textos
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
 * Borrado manual por clic / pincel: el usuario hace clic sobre un texto rebelde en el plano
 * y se parchea ese punto exacto con el suelo circundante.
 */
export async function eraseTextAtCoordinate(
  imageSrc: string,
  clickXPercent: number,
  clickYPercent: number,
  patchRadiusPercent: number = 3.5
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
        const radiusX = (patchRadiusPercent / 100) * imgW;
        const radiusY = (patchRadiusPercent / 100) * imgH * 0.55; // Forma elíptica horizontal habitual de textos

        const patchX = Math.max(0, centerX - radiusX);
        const patchY = Math.max(0, centerY - radiusY);
        const patchW = Math.min(imgW - patchX, radiusX * 2);
        const patchH = Math.min(imgH - patchY, radiusY * 2);

        const floor = sampleSurroundingFloorColor(ctx, imgW, imgH, patchX, patchY, patchW, patchH);

        ctx.save();
        ctx.fillStyle = `rgb(${floor.r}, ${floor.g}, ${floor.b})`;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(patchX, patchY, patchW, patchH, 4);
        } else {
          ctx.rect(patchX, patchY, patchW, patchH);
        }
        ctx.fill();
        ctx.restore();

        resolve(canvas.toDataURL('image/png', 1.0));
      } catch (err) {
        console.error('Error al borrar manualmente texto en coordenada:', err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}
