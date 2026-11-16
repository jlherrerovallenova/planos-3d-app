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

/**
 * Superpone los bloques de mobiliario arquitectónico 2D interactivos sobre el plano original o limpio,
 * generando una imagen sintetizada para que Gemini levante el render exactamente con la distribución configurada.
 */
export async function compositePlanWithFurniture(
  imageSrc: string,
  furnitureItems: FurnitureItem[]
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    if (!imageSrc || !furnitureItems || furnitureItems.length === 0) {
      const match = imageSrc.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return resolve({ mimeType: match[1], base64: match[2] });
      }
      return resolve({ mimeType: 'image/png', base64: imageSrc });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ mimeType: 'image/png', base64: imageSrc });
        }

        // 1. Dibujar imagen del plano base
        ctx.drawImage(img, 0, 0, w, h);

        // 2. Escala arquitectónica estimada: asumimos ancho medio de vivienda = 13.5 metros
        const pixelsPerMeter = Math.max(18, (w * 0.9) / 13.5);

        // 3. Dibujar cada elemento de mobiliario con simbología CAD 2D limpia
        furnitureItems.forEach((item) => {
          const itemPxX = (item.x / 100) * w;
          const itemPxY = (item.y / 100) * h;
          const itemW = Math.max(14, item.widthMeters * pixelsPerMeter);
          const itemD = Math.max(12, item.depthMeters * pixelsPerMeter);

          ctx.save();
          ctx.translate(itemPxX, itemPxY);
          ctx.rotate((item.rotation * Math.PI) / 180);

          // Fondo semitransparente champán/blanco para tapar sutilmente el fondo
          ctx.fillStyle = '#FAF8F5';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = Math.max(1.5, Math.min(3.5, w * 0.0015));

          const halfW = itemW / 2;
          const halfD = itemD / 2;

          ctx.beginPath();
          ctx.rect(-halfW, -halfD, itemW, itemD);
          ctx.fill();
          ctx.stroke();

          // Detalles específicos según tipología
          if (item.type === 'sofa' || item.type === 'corner_sofa') {
            // Respaldo
            ctx.fillStyle = '#64748B';
            ctx.fillRect(-halfW, -halfD, itemW, itemD * 0.28);
            // Cojines
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 1;
            const cushionCount = item.widthMeters > 2 ? 3 : 2;
            const cushionW = itemW / cushionCount;
            for (let i = 1; i < cushionCount; i++) {
              ctx.beginPath();
              ctx.moveTo(-halfW + i * cushionW, -halfD + itemD * 0.28);
              ctx.lineTo(-halfW + i * cushionW, halfD);
              ctx.stroke();
            }
          } else if (item.type === 'bed_double' || item.type === 'bed_single') {
            // Cabecero
            ctx.fillStyle = '#78350F';
            ctx.fillRect(-halfW, -halfD, itemW, itemD * 0.12);
            // Almohadas
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1;
            const pillowW = item.type === 'bed_double' ? itemW * 0.42 : itemW * 0.7;
            const pillowH = itemD * 0.2;
            if (item.type === 'bed_double') {
              ctx.fillRect(-halfW + itemW * 0.05, -halfD + itemD * 0.15, pillowW, pillowH);
              ctx.strokeRect(-halfW + itemW * 0.05, -halfD + itemD * 0.15, pillowW, pillowH);
              ctx.fillRect(halfW - itemW * 0.05 - pillowW, -halfD + itemD * 0.15, pillowW, pillowH);
              ctx.strokeRect(halfW - itemW * 0.05 - pillowW, -halfD + itemD * 0.15, pillowW, pillowH);
            } else {
              ctx.fillRect(-pillowW / 2, -halfD + itemD * 0.15, pillowW, pillowH);
              ctx.strokeRect(-pillowW / 2, -halfD + itemD * 0.15, pillowW, pillowH);
            }
            // Sábana doblada
            ctx.strokeStyle = '#B45309';
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(-halfW, halfD * 0.2);
            ctx.lineTo(halfW, halfD * 0.2);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (item.type === 'dining_table') {
            // Sillas esquemáticas
            ctx.fillStyle = '#CBD5E1';
            const chairW = itemW * 0.28;
            const chairD = itemD * 0.25;
            // Silla arriba y abajo
            ctx.fillRect(-chairW / 2, -halfD - chairD, chairW, chairD);
            ctx.fillRect(-chairW / 2, halfD, chairW, chairD);
          } else if (item.type === 'wardrobe') {
            // Barra de colgar longitudinal y perchas como líneas CAD
            ctx.strokeStyle = '#64748B';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-halfW + 4, 0);
            ctx.lineTo(halfW - 4, 0);
            ctx.stroke();
            const step = Math.max(6, itemW / 12);
            for (let px = -halfW + 8; px < halfW - 8; px += step) {
              ctx.beginPath();
              ctx.moveTo(px, -halfD * 0.4);
              ctx.lineTo(px, halfD * 0.4);
              ctx.stroke();
            }
          }

          ctx.restore();
        });

        const dataUrl = canvas.toDataURL('image/png', 0.98);
        const parts = dataUrl.split(',');
        resolve({
          mimeType: 'image/png',
          base64: parts[1] || ''
        });
      } catch (err) {
        console.warn('Error al componer muebles sobre el plano:', err);
        const match = imageSrc.match(/^data:([^;]+);base64,(.+)$/);
        resolve({
          mimeType: match ? match[1] : 'image/png',
          base64: match ? match[2] : imageSrc
        });
      }
    };
    img.onerror = () => {
      const match = imageSrc.match(/^data:([^;]+);base64,(.+)$/);
      resolve({
        mimeType: match ? match[1] : 'image/png',
        base64: match ? match[2] : imageSrc
      });
    };
    img.src = imageSrc;
  });
}
