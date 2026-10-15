import { RoomMarker } from '../types';

/**
 * Normaliza una cadena de texto para comparar sin acentos, mayúsculas ni signos.
 */
function cleanText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Calcula un puntaje numérico de ordenación para una estancia según la jerarquía comercial:
 * 1. Salón - Comedor - Cocina
 * 2. Dormitorio 1 / Principal
 * 3. Dormitorio 2
 * 4. Dormitorio 3 (o sucesivos)
 * 5. Baño
 * 6. Aseo
 * 7. Vestíbulo
 * 8. Pasillo / Distribuidor
 * 9. Terraza (Terraza 1, Terraza 2...)
 * 10. Otras estancias (Lavadero, etc.)
 */
export function getRoomSortScore(marker: { name: string; category?: string }): number {
  const name = cleanText(marker.name);
  const cat = (marker.category || '').toLowerCase();

  // 1. Salón - Comedor - Cocina / Salón / Comedor / Cocina
  const isLiving =
    name.includes('salon') ||
    name.includes('comedor') ||
    name.includes('estar') ||
    name.includes('living') ||
    cat === 'salon_comedor';
  const isKitchen = name.includes('cocina') || cat === 'cocina';

  if (isLiving && isKitchen) {
    return 100; // Salón - Comedor - Cocina integrado
  }
  if (isLiving) {
    return 105; // Salón - Comedor independiente
  }
  if (isKitchen) {
    return 110; // Cocina independiente
  }

  // 2. Dormitorios
  const isBedroom =
    name.includes('dormitorio') ||
    name.includes('habitacion') ||
    name.includes('suite') ||
    name.includes('alcoba') ||
    name.includes('dorm.') ||
    cat.startsWith('dormitorio');

  if (isBedroom) {
    // Dormitorio 1 o Principal
    if (
      name.includes('principal') ||
      name.includes('suite') ||
      name.includes('matrimonio') ||
      name.includes('ppal') ||
      name.includes(' 1') ||
      name.includes(' 01') ||
      name.endsWith('1') ||
      cat === 'dormitorio_principal'
    ) {
      return 201;
    }
    // Dormitorio 2
    if (name.includes(' 2') || name.includes(' 02') || name.endsWith('2')) {
      return 202;
    }
    // Dormitorio 3
    if (name.includes(' 3') || name.includes(' 03') || name.endsWith('3')) {
      return 203;
    }
    // Dormitorio 4
    if (name.includes(' 4') || name.includes(' 04') || name.endsWith('4')) {
      return 204;
    }
    // Cualquier otro número en el nombre
    const numMatch = name.match(/\d+/);
    if (numMatch) {
      return 200 + parseInt(numMatch[0], 10);
    }
    return 205;
  }

  // Despacho / Estudio (justo tras los dormitorios si existe)
  if (
    name.includes('despacho') ||
    name.includes('estudio') ||
    name.includes('oficina') ||
    cat === 'despacho_estudio'
  ) {
    return 290;
  }

  // 4. Aseo (evaluar antes de Baño para evitar falso positivo si el nombre incluye ambos)
  const isToilet =
    name.includes('aseo') ||
    name.includes('toilet') ||
    name.includes('wc') ||
    cat === 'aseo_cortesia';

  if (isToilet) {
    const numMatch = name.match(/\d+/);
    return 400 + (numMatch ? parseInt(numMatch[0], 10) : 1);
  }

  // 3. Baños
  const isBathroom =
    name.includes('bano') ||
    name.includes('baño') ||
    cat === 'bano_principal';

  if (isBathroom) {
    if (
      name.includes('principal') ||
      name.includes('suite') ||
      name.includes('ppal') ||
      name.includes(' 1') ||
      name.includes(' 01') ||
      name.endsWith('1')
    ) {
      return 301;
    }
    if (name.includes(' 2') || name.includes(' 02') || name.endsWith('2')) {
      return 302;
    }
    if (name.includes(' 3') || name.includes(' 03') || name.endsWith('3')) {
      return 303;
    }
    const numMatch = name.match(/\d+/);
    if (numMatch) {
      return 300 + parseInt(numMatch[0], 10);
    }
    return 301;
  }

  // 5. Vestíbulo / Hall / Entrada / Recibidor
  const isHall =
    name.includes('vestibulo') ||
    name.includes('hall') ||
    name.includes('recibidor') ||
    name.includes('entrada') ||
    name.includes('acceso');

  if (isHall) {
    const numMatch = name.match(/\d+/);
    return 500 + (numMatch ? parseInt(numMatch[0], 10) : 1);
  }

  // 6. Pasillo / Distribuidor / Paso / Corredor
  const isCorridor =
    name.includes('pasillo') ||
    name.includes('distribuidor') ||
    name.includes('paso') ||
    name.includes('corredor') ||
    cat === 'recibidor_distribuidor';

  if (isCorridor) {
    const numMatch = name.match(/\d+/);
    return 600 + (numMatch ? parseInt(numMatch[0], 10) : 1);
  }

  // 7. Terraza / Balcón / Porche / Tendedero
  const isTerrace =
    name.includes('terraza') ||
    name.includes('balcon') ||
    name.includes('porche') ||
    name.includes('tendedero') ||
    name.includes('solarium') ||
    cat === 'terraza_balcon';

  if (isTerrace) {
    if (
      name.includes(' 1') ||
      name.includes(' 01') ||
      name.endsWith('1') ||
      name.includes('principal')
    ) {
      return 701;
    }
    if (name.includes(' 2') || name.includes(' 02') || name.endsWith('2')) {
      return 702;
    }
    if (name.includes(' 3') || name.includes(' 03') || name.endsWith('3')) {
      return 703;
    }
    const numMatch = name.match(/\d+/);
    if (numMatch) {
      return 700 + parseInt(numMatch[0], 10);
    }
    return 701;
  }

  // 8. Otras estancias
  if (name.includes('lavadero') || name.includes('galeria') || cat === 'lavadero_galeria') {
    return 801;
  }
  if (name.includes('vestidor') || cat === 'vestidor') {
    return 802;
  }
  if (name.includes('trastero')) {
    return 803;
  }
  if (name.includes('despensa')) {
    return 804;
  }

  return 900;
}

/**
 * Ordena de forma determinista una lista de estancias según el orden comercial exigido:
 * 1. Salón - Comedor - Cocina
 * 2. Dormitorio 1 o Principal
 * 3. Dormitorio 2
 * 4. Dormitorio 3
 * 5. Baño
 * 6. Aseo
 * 7. Vestíbulo
 * 8. Pasillo
 * 9. Terraza (o Terraza 1, Terraza 2...)
 */
export function sortRoomMarkers<T extends { name: string; category?: any }>(rooms: T[]): T[] {
  if (!rooms || rooms.length <= 1) return rooms || [];

  return [...rooms].sort((a, b) => {
    const scoreA = getRoomSortScore(a);
    const scoreB = getRoomSortScore(b);
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return (a.name || '').localeCompare(b.name || '', 'es', { numeric: true });
  });
}

/**
 * Determina si una estancia es de naturaleza exterior (Terraza, Tendedero, Balcón, Porche, Jardín, etc.)
 */
export function isExteriorRoom(marker: { name: string; category?: any }): boolean {
  const name = cleanText(marker.name);
  const cat = (marker.category || '').toLowerCase();
  return (
    name.includes('terraza') ||
    name.includes('balcon') ||
    name.includes('porche') ||
    name.includes('tendedero') ||
    name.includes('solarium') ||
    name.includes('jardin') ||
    name.includes('patio') ||
    cat === 'terraza_balcon'
  );
}

export interface CategorizedSchedule {
  sortedMarkers: RoomMarker[];
  interiorRooms: RoomMarker[];
  exteriorRooms: RoomMarker[];
  interiorTotal: number;
  exteriorTotal: number;
  grandTotal: number;
  hasExterior: boolean;
}

/**
 * Agrupa y suma las estancias en Útiles Interiores y Exteriores según los estándares comerciales
 */
export function categorizeRoomsForSchedule(markers: RoomMarker[]): CategorizedSchedule {
  const sortedMarkers = sortRoomMarkers(markers || []);
  const interiorRooms: RoomMarker[] = [];
  const exteriorRooms: RoomMarker[] = [];

  sortedMarkers.forEach((m) => {
    if (isExteriorRoom(m)) {
      exteriorRooms.push(m);
    } else {
      interiorRooms.push(m);
    }
  });

  const interiorTotal = interiorRooms.reduce((acc, m) => acc + (m.areaSqMeters || 0), 0);
  const exteriorTotal = exteriorRooms.reduce((acc, m) => acc + (m.areaSqMeters || 0), 0);
  const grandTotal = interiorTotal + exteriorTotal;

  return {
    sortedMarkers,
    interiorRooms,
    exteriorRooms,
    interiorTotal,
    exteriorTotal,
    grandTotal,
    hasExterior: exteriorRooms.length > 0
  };
}

