import { RoomMarker, RoomCategory } from '../types';
import { cleanBase64Data } from './downloadHelper';
import { sortRoomMarkers } from './roomSorter';
import { cleanPlanTextsFromBoxes, TextBoxDetection } from './planTextEraser';

export interface PlanAnalysisResult {
  rooms: RoomMarker[];
  totalUsefulArea?: number;
  terraceArea?: number;
  constructedArea?: number;
  textBoxes?: TextBoxDetection[];
  cleanedImageBase64?: string;
  rawResponse?: string;
}

export async function analyzeBlueprintRooms(
  base64Data: string,
  mimeType: string = 'image/png'
): Promise<PlanAnalysisResult> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('No se encontró VITE_GEMINI_API_KEY en las variables de entorno.');
  }

  const { cleanBase64 } = cleanBase64Data(base64Data);
  const dataUrl = `data:${mimeType || 'image/png'};base64,${cleanBase64}`;

  const prompt = `Actúa como arquitecto técnico y delineante experto.
Analiza detenidamente esta imagen de un plano arquitectónico o plano de ventas comercial.
Tu tarea es leer con máxima precisión todas las estancias rotuladas y sus superficies útiles en m² (metros cuadrados).

INSTRUCCIONES CLAVE:
1. Lee todos los textos y números que indican superficies en cada habitación (ejemplo: "Vestíbulo 4.14", "Salón-comedor-cocina 30.74", "Dormitorio 1", "Dormitorio 2 10.43", "Dormitorio 3 10.74", "Pasillo 7.48", "Aseo 3.56", "Baño 4.34", "Terraza 10.70", etc.).
2. Fíjate en los resúmenes o totales si aparecen (ejemplo: "S. Util 83.95 m2", "S terraza 10.70 m2", "S.const 109.43 m2").
3. Si una estancia tiene el nombre rotulado pero no se lee claramente su superficie, y dispones del total de superficie útil ("S. Util"), deduce la superficie de esa estancia restando las demás del total para que la suma sea coherente.
4. Para cada estancia, proporciona:
   - "name": Nombre en mayúsculas (ej. "SALÓN - COMEDOR - COCINA", "DORMITORIO 1", "DORMITORIO 2", "DORMITORIO 3", "BAÑO", "ASEO", "VESTÍBULO", "PASILLO", "TERRAZA").
   - "areaSqMeters": Número flotante con los m² útiles (ej: 4.14).
   - "category": Una de las siguientes categorías válidas: "salon_comedor", "cocina", "dormitorio_principal", "dormitorio_secundario", "bano_principal", "aseo_cortesia", "terraza_balcon", "recibidor_distribuidor", "despacho_estudio", "lavadero".
   - "x": Posición porcentual horizontal (0 a 100) del centro de la estancia en el plano.
   - "y": Posición porcentual vertical (0 a 100) del centro de la estancia en el plano.
5. ORDEN ESTRICTO OBLIGATORIO EN EL ARRAY "rooms":
   Ordena las estancias exactamente con esta jerarquía:
   1º Salón - Comedor - Cocina
   2º Dormitorio 1 o principal
   3º Dormitorio 2
   4º Dormitorio 3
   5º Baño
   6º Aseo
   7º Vestíbulo
   8º Pasillo / Distribuidor
   9º Terraza (o Terraza 1, Terraza 2 si hay varias)
   Si no hay 3 dormitorios, el Baño pasa a la posición 4 y así sucesivamente de forma natural.
6. DETECCIÓN DE TEXTOS PARA ELIMINACIÓN:
   Detecta las cajas de delimitación [ymin, xmin, ymax, xmax] en escala 0-1000 de TODOS los textos rotulados dentro de las habitaciones (nombres de estancias como 'Salón', 'Dormitorio', 'Baño', 'Aseo', 'Vestíbulo', 'Pasillo', 'Distribuidor', 'Terraza' y números de superficie m2 como '30.74', '10.43', '4.14', etc.). Devuélvelos en el array 'textBoxes'.

Devuelve estrictamente un objeto JSON con el siguiente esquema:
{
  "rooms": [
    {
      "name": "VESTÍBULO",
      "areaSqMeters": 4.14,
      "category": "recibidor_distribuidor",
      "x": 20,
      "y": 78
    }
  ],
  "textBoxes": [
    {
      "text": "Vestíbulo",
      "box2d": [591, 62, 608, 103]
    }
  ],
  "totalUsefulArea": 83.95,
  "terraceArea": 10.70,
  "constructedArea": 109.43
}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/png',
                data: cleanBase64
              }
            },
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en API Gemini (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('Gemini no devolvió respuesta para el análisis del plano.');
  }

  const parsed = JSON.parse(textContent);

  const formattedRooms: RoomMarker[] = (parsed.rooms || []).map((r: any, idx: number) => ({
    id: `room_detected_${Date.now()}_${idx}`,
    name: r.name || `Estancia ${idx + 1}`,
    category: (r.category as RoomCategory) || 'salon_comedor',
    x: typeof r.x === 'number' ? Math.max(5, Math.min(95, r.x)) : 50,
    y: typeof r.y === 'number' ? Math.max(5, Math.min(95, r.y)) : 50,
    areaSqMeters: typeof r.areaSqMeters === 'number' ? r.areaSqMeters : undefined,
    notes: r.notes || ''
  }));

  // Limpiar y borrar todos los textos del plano automáticamente con el color del suelo
  let cleanedBase64Result: string | undefined = undefined;
  const detectedBoxes: TextBoxDetection[] = Array.isArray(parsed.textBoxes) ? parsed.textBoxes : [];

  if (detectedBoxes.length > 0) {
    try {
      const cleanedDataUrl = await cleanPlanTextsFromBoxes(dataUrl, detectedBoxes);
      const cleaned = cleanBase64Data(cleanedDataUrl);
      cleanedBase64Result = cleaned.cleanBase64;
    } catch (cleanErr) {
      console.warn('Advertencia al limpiar textos del plano:', cleanErr);
    }
  }

  return {
    rooms: sortRoomMarkers(formattedRooms),
    totalUsefulArea: parsed.totalUsefulArea,
    terraceArea: parsed.terraceArea,
    constructedArea: parsed.constructedArea,
    textBoxes: detectedBoxes,
    cleanedImageBase64: cleanedBase64Result,
    rawResponse: textContent
  };
}
