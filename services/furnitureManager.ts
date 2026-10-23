import { FurnitureItem, FurnitureType, RoomMarker } from '../types';

/**
 * Genera una distribución inicial de mobiliario arquitectónico estándar
 * calculada a partir de los puntos de estancia detectados en el plano.
 */
export function generateDefaultFurnitureForRooms(rooms: RoomMarker[]): FurnitureItem[] {
  const items: FurnitureItem[] = [];

  rooms.forEach((room, roomIdx) => {
    const num = roomIdx + 1;
    const cat = room.category || '';
    const nameLower = (room.name || '').toLowerCase();
    const rx = room.x;
    const ry = room.y;

    if (cat === 'salon_comedor' || nameLower.includes('salón') || nameLower.includes('salon') || nameLower.includes('estar')) {
      items.push(
        {
          id: `furn_${room.id}_sofa`,
          name: 'Sofá 3 plazas',
          type: 'sofa',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx - 3)),
          y: Math.max(5, Math.min(95, ry + 2)),
          widthMeters: 2.2,
          depthMeters: 0.9,
          rotation: 0
        },
        {
          id: `furn_${room.id}_coffee`,
          name: 'Mesa de centro',
          type: 'coffee_table',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx - 3)),
          y: Math.max(5, Math.min(95, ry - 1.5)),
          widthMeters: 1.1,
          depthMeters: 0.6,
          rotation: 0
        },
        {
          id: `furn_${room.id}_tv`,
          name: 'Mueble TV',
          type: 'tv_unit',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx - 3)),
          y: Math.max(5, Math.min(95, ry - 4.5)),
          widthMeters: 1.8,
          depthMeters: 0.4,
          rotation: 0
        },
        {
          id: `furn_${room.id}_dining`,
          name: 'Mesa de comedor',
          type: 'dining_table',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx + 4)),
          y: Math.max(5, Math.min(95, ry)),
          widthMeters: 1.6,
          depthMeters: 0.9,
          rotation: 90
        },
        {
          id: `furn_${room.id}_rug`,
          name: 'Alfombra de estar',
          type: 'rug',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx - 3)),
          y: Math.max(5, Math.min(95, ry + 0.5)),
          widthMeters: 2.4,
          depthMeters: 1.7,
          rotation: 0
        },
        {
          id: `furn_${room.id}_plant`,
          name: 'Planta decorativa',
          type: 'plant',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx - 6)),
          y: Math.max(5, Math.min(95, ry - 4.5)),
          widthMeters: 0.5,
          depthMeters: 0.5,
          rotation: 0
        }
      );
    } else if (cat === 'cocina' || nameLower.includes('cocina')) {
      items.push(
        {
          id: `furn_${room.id}_counter`,
          name: 'Bancada de cocina',
          type: 'kitchen_counter',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx)),
          y: Math.max(5, Math.min(95, ry - 2.5)),
          widthMeters: 3.5,
          depthMeters: 0.6,
          rotation: 0
        },
        {
          id: `furn_${room.id}_island`,
          name: 'Isla de cocina',
          type: 'kitchen_island',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx)),
          y: Math.max(5, Math.min(95, ry + 2)),
          widthMeters: 1.4,
          depthMeters: 0.9,
          rotation: 0
        }
      );
    } else if (cat === 'dormitorio_principal' || nameLower.includes('principal') || nameLower.includes('matrimonio')) {
      items.push(
        {
          id: `furn_${room.id}_bed`,
          name: 'Cama doble',
          type: 'bed_double',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: rx,
          y: ry,
          widthMeters: 1.6,
          depthMeters: 2.0,
          rotation: 0
        },
        {
          id: `furn_${room.id}_nightstand1`,
          name: 'Mesilla izquierda',
          type: 'nightstand',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx - 2.5)),
          y: Math.max(5, Math.min(95, ry - 1.5)),
          widthMeters: 0.45,
          depthMeters: 0.4,
          rotation: 0
        },
        {
          id: `furn_${room.id}_nightstand2`,
          name: 'Mesilla derecha',
          type: 'nightstand',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx + 2.5)),
          y: Math.max(5, Math.min(95, ry - 1.5)),
          widthMeters: 0.45,
          depthMeters: 0.4,
          rotation: 0
        },
        {
          id: `furn_${room.id}_wardrobe`,
          name: 'Armario empotrado',
          type: 'wardrobe',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: rx,
          y: Math.max(5, Math.min(95, ry + 3.5)),
          widthMeters: 2.4,
          depthMeters: 0.6,
          rotation: 0
        }
      );
    } else if (cat === 'dormitorio_secundario' || nameLower.includes('dormitorio') || nameLower.includes('habitacion')) {
      items.push(
        {
          id: `furn_${room.id}_bed`,
          name: 'Cama individual',
          type: 'bed_single',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: rx,
          y: ry,
          widthMeters: 0.9,
          depthMeters: 1.9,
          rotation: 0
        },
        {
          id: `furn_${room.id}_desk`,
          name: 'Escritorio',
          type: 'desk',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx + 2.5)),
          y: Math.max(5, Math.min(95, ry + 1.5)),
          widthMeters: 1.2,
          depthMeters: 0.6,
          rotation: 90
        },
        {
          id: `furn_${room.id}_mesilla`,
          name: 'Mesilla',
          type: 'nightstand',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx - 2)),
          y: Math.max(5, Math.min(95, ry - 1.5)),
          widthMeters: 0.45,
          depthMeters: 0.4,
          rotation: 0
        }
      );
    } else if (cat === 'terraza_balcon' || nameLower.includes('terraza') || nameLower.includes('balcon')) {
      items.push(
        {
          id: `furn_${room.id}_table`,
          name: 'Mesa exterior',
          type: 'coffee_table',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: rx,
          y: ry,
          widthMeters: 0.8,
          depthMeters: 0.8,
          rotation: 0
        },
        {
          id: `furn_${room.id}_chair1`,
          name: 'Silla terraza',
          type: 'chair',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx - 1.5)),
          y: ry,
          widthMeters: 0.5,
          depthMeters: 0.5,
          rotation: 90
        },
        {
          id: `furn_${room.id}_chair2`,
          name: 'Silla terraza',
          type: 'chair',
          roomId: room.id,
          roomName: `${num}. ${room.name}`,
          roomIndex: roomIdx,
          x: Math.max(5, Math.min(95, rx + 1.5)),
          y: ry,
          widthMeters: 0.5,
          depthMeters: 0.5,
          rotation: 270
        }
      );
    }
  });

  return items;
}
