import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PdfConversionResult {
  base64: string;
  dataUrl: string;
  mimeType: 'image/png';
  numPages: number;
  currentPage: number;
  width: number;
  height: number;
}

/**
 * Convierte una página de un archivo PDF en una imagen PNG en alta resolución.
 * @param file Archivo PDF o ArrayBuffer
 * @param pageNumber Número de página (1-indexado, por defecto 1)
 * @param scale Escala de renderizado (por defecto 2.5 para planos arquitectónicos nítidos)
 */
export async function convertPdfToImage(
  file: File | ArrayBuffer,
  pageNumber: number = 1,
  scale: number = 2.5
): Promise<PdfConversionResult> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;

  const validPageNum = Math.max(1, Math.min(pageNumber, pdfDoc.numPages));
  const page = await pdfDoc.getPage(validPageNum);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo obtener el contexto 2D del canvas');
  }

  // Fondo blanco para planos arquitectónicos con fondo transparente
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas
  };

  await page.render(renderContext).promise;

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

  return {
    base64,
    dataUrl,
    mimeType: 'image/png',
    numPages: pdfDoc.numPages,
    currentPage: validPageNum,
    width: canvas.width,
    height: canvas.height
  };
}
