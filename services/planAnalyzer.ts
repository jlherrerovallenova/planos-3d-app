import { RoomMarker, RoomCategory } from '../types';
import { cleanBase64Data } from './downloadHelper';

export interface PlanAnalysisResult {
  rooms: RoomMarker[];
  totalUsefulArea?: number;
  terraceArea?: number;
  constructedArea?: number;
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

  const prompt = `Actúa como arquitecto técnico y delineante experto.
Analiza detenidamente esta imagen de un plano arquitectónico o plano de ventas comercial.
Tu tarea es leer con máxima precisión todas las estancias rotuladas y sus superficies útiles en m² (metros cuadrados).

INSTRUCCIONES CLAVE:
1. Lee todos los textos y números que indican superficies en cada habitación (ejemplo: "Vestíbulo 4.14", "Salón-comedor-cocina 30.74", "Dormitorio 1", "Dormitorio 2 10.43", "Dormitorio 3 10.74", "Pasillo 7.48", "Aseo 3.56", "Baño 4.34", "Terraza 10.70", etc.).
2. Fíjate en los resúmenes o totales si aparecen (ejemplo: "S. Util 83.95 m2", "S terraza 10.70 m2", "S.const 109.43 m2").
3. Si una estancia tiene el nombre rotulado pero no se lee claramente su superficie, y dispones del total de superficie útil ("S. Util"), deduce la superficie de esa estancia restando las demás del total para que la suma sea coherente.
4. Para cada estancia, proporciona:
   - "name": Nombre en mayúsculas (ej. "VESTÍBULO", "SALÓN-COMEDOR-COCINA", "DORMITORIO 1", "DORMITORIO 2", "DORMITORIO 3", "DISTRIBUIDOR", "BAÑO", "ASEO", "TERRAZA").
   - "areaSqMeters": Número flotante con los m² útiles (ej: 4.14).
   - "category": Una de las siguientes categorías válidas: "salon_comedor", "cocina", "dormitorio_principal", "dormitorio_secundario", "bano_principal", "aseo_cortesia", "terraza_balcon", "recibidor_distribuidor", "despacho_estudio", "lavadero".
   - "x": Posición porcentual horizontal (0 a 100) del centro de la estancia en el plano.
   - "y": Posición porcentual vertical (0 a 100) del centro de la estancia en el plano.

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

  return {
    rooms: formattedRooms,
    totalUsefulArea: parsed.totalUsefulArea,
    terraceArea: parsed.terraceArea,
    constructedArea: parsed.constructedArea,
    rawResponse: textContent
  };
}
