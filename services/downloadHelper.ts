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
