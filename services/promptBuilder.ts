import { RenderConfig, RoomMarker } from '../types';
import {
  COLOR_PALETTE_SCHEMES,
  INTERIOR_STYLES,
  FLOORING_LIVING_OPTIONS,
  KITCHEN_FLOORING_OPTIONS,
  KITCHEN_GRES_COLORS,
  BATHROOM_GRES_60X60_TONES,
  TERRACE_FLOORING_OPTIONS,
  WINDOW_TYPE_OPTIONS,
  WINDOW_FRAME_OPTIONS,
  DOOR_FINISH_OPTIONS,
  WALL_COLOR_OPTIONS,
  ROOM_CATEGORIES
} from '../constants';
export function buildArchitecturalPrompt(config: RenderConfig): string {
  const selectedPalette = COLOR_PALETTE_SCHEMES.find(p => p.id === config.colorPalette) || COLOR_PALETTE_SCHEMES[0];
  const selectedStyle = INTERIOR_STYLES.find(s => s.id === config.interiorStyle) || INTERIOR_STYLES[0];
  const selectedLivingFloor = FLOORING_LIVING_OPTIONS.find(f => f.id === config.flooringLiving) || FLOORING_LIVING_OPTIONS[0];
  const selectedKitchenFloor = KITCHEN_FLOORING_OPTIONS.find(k => k.id === config.flooringKitchen) || KITCHEN_FLOORING_OPTIONS[0];
  const selectedKitchenGresColor = KITCHEN_GRES_COLORS.find(c => c.id === config.kitchenGresColor) || KITCHEN_GRES_COLORS[0];
  const selectedBathGres60 = BATHROOM_GRES_60X60_TONES.find(b => b.id === config.flooringBathroomGres60) || BATHROOM_GRES_60X60_TONES[0];
  const selectedTerraceFloor = TERRACE_FLOORING_OPTIONS.find(t => t.id === config.flooringTerrace) || TERRACE_FLOORING_OPTIONS[0];
  const selectedWindowType = WINDOW_TYPE_OPTIONS.find(w => w.id === config.windowType) || WINDOW_TYPE_OPTIONS[0];
  const selectedWindowFinish = WINDOW_FRAME_OPTIONS.find(w => w.id === config.windowFrames) || WINDOW_FRAME_OPTIONS[0];
  const selectedDoor = DOOR_FINISH_OPTIONS.find(d => d.id === config.doorFinish) || DOOR_FINISH_OPTIONS[0];
  const selectedInteriorWall = WALL_COLOR_OPTIONS.find(w => w.id === config.interiorWallColor) || WALL_COLOR_OPTIONS[0];
  const selectedExteriorWall = WALL_COLOR_OPTIONS.find(w => w.id === config.exteriorWallColor) || WALL_COLOR_OPTIONS[0];
  // Descripción del suelo de cocina teniendo en cuenta si es GRES con color
  const kitchenFloorPrompt = (config.flooringKitchen === 'gres_porcelanico_cocina' || config.flooringKitchen === 'porcelain_gres_kitchen')
    ? selectedKitchenGresColor.promptKeyword
    : `${selectedKitchenFloor.label} in kitchen floor`;
  // REGLA CRÍTICA ESTRICTA: El plato de ducha SIEMPRE es blanco puro, NUNCA del material ni color del suelo del baño
  const showerTrayRule = `CRITICAL ARCHITECTURAL DETAIL: In all bathrooms, shower trays MUST ALWAYS BE PURE CHALK WHITE mineral resin or glossy white acrylic (never matching the bathroom floor tile color or material). Every shower tray is distinctly solid clean white with clear contrast against the ${selectedBathGres60.previewColor} floor tiles, framed by a transparent glass screen shower enclosure.`;
  // DIRECTIVA ESTRICTA: NUNCA DIBUJAR TEXTO, NOMBRES DE ESTANCIA, SUBTÍTULOS EN INGLÉS NI SUPERFICIES (m²) DENTRO DE LAS ESTANCIAS
  const strictNoTextInRoomsDirective = `ABSOLUTE PROHIBITION OF TEXT, LABELS, ENGLISH SUBTITLES, ROOM NAMES, AND SQUARE METERS INSIDE THE PLAN:
1. DO NOT paint, write, print, or render ANY text, letters, words, subtitles (especially NO English subtitles or words like "Living Room", "Bedroom", "Master Bedroom", "Kitchen", "Bathroom", "Toilet", "Terrace", "Balcony", "Hallway", "Corridor", "Floor Plan", "Dollhouse", etc.), nor Spanish names ("DORMITORIO", "SALON", "COCINA", "BAÑO", "ASEO", "TERRAZA", "DISTRIBUIDOR", etc.), nor dimensions, nor square meter measurements ("m²", "sqm", numbers) inside any room or anywhere on the floor plan.
2. Completely clean, erase, and eliminate all blueprint text, annotations, callout labels, and area numbers from the reference blueprint image.
3. The floor surfaces inside all rooms must be 100% CLEAN of text: ONLY pure architectural flooring materials, walls, and furniture.
4. Each room is identified strictly by an external number badge, NEVER by printed text, English subtitles, or surface numbers in the image.
STRICT RULE: ZERO text, ZERO English subtitles, ZERO room names, ZERO square meter numbers inside the rooms or on the floor.`;

  // CLÁUSULA CRÍTICA: IDENTIFICACIÓN Y MOBILIARIO DE ESTANCIAS (SIN TEXTO)
  let roomsIdentificationClause = '';
  if (config.roomMarkers && config.roomMarkers.length > 0) {
    const roomDescriptions = config.roomMarkers.map((marker, idx) => {
      const cat = ROOM_CATEGORIES.find(c => c.id === marker.category);
      // Ubicación cardinal aproximada según X e Y (0-100)
      const hPos = marker.x < 35 ? 'left / west section' : marker.x > 65 ? 'right / east section' : 'central area';
      const vPos = marker.y < 35 ? 'upper / north part' : marker.y > 65 ? 'lower / south part' : 'middle area';
      const specificNotes = marker.notes ? ` with ${marker.notes}` : '';
      return `Space #${idx + 1} located at ${hPos}, ${vPos}: strictly furnish and layout as a ${cat?.promptDesc || 'functional room'}${specificNotes}. (CRITICAL: DO NOT write "${marker.name}" or any text or surface area numbers inside this space).`;
    }).join(' ');
    roomsIdentificationClause = `INTERIOR FURNISHING LAYOUT (NO TEXT IN ROOMS): ${roomDescriptions} Ensure each room is furnished according to its layout, but keep all room floors 100% clean and free of room names, text labels, or area measurements.`;
  }
  const is2D = config.cameraAngle === 'plan_2d_furnished';

  // DIRECTIVA ESTRICTA DE ENCUADRE Y ZOOM: EL RENDER DEL PLANO DEBE OCUPAR AL MENOS EL 75%-85% DEL ENCUADRE
  const strictFramingAndOccupancyDirective = `CRITICAL ARCHITECTURAL CAMERA FRAMING & MAXIMUM CANVAS OCCUPANCY (AT LEAST 75% TO 85%):
1. The architectural floor plan / 3D cutaway dollhouse MUST OCCUPY AT LEAST 75% TO 85% of the total rendered image area.
2. Tight camera zoom and close framing: zoom in tightly directly on the building floor plan footprint, cropping closely around exterior walls.
3. ABSOLUTELY MINIMIZE empty surrounding margins, dead space, blank borders, or vast empty floor/ground around the perimeter.
4. The floor plan structure MUST BE THE BOLD HERO SUBJECT filling 75% to 85% of the frame, ensuring room layouts, furniture, and materials are clear, prominent, and large.`;

  // DIRECTIVA ESTRICTA: NUNCA DIBUJAR TABLAS, LISTAS DE MATERIALES NI CUADROS DE TEXTO EN LA IMAGEN
  const strictNoTablesDirective = `ABSOLUTE PROHIBITION OF GRAPHIC TABLES OR TEXT SCHEDULES: DO NOT render or draw ANY table, chart, list of materials, legend, schedule box, text banner, or spreadsheet in or beside the floor plan. The output image must ONLY contain the pure architectural floor plan and its interior rooms/furniture. Absolutely NO side tables, NO material charts, NO text lists anywhere in the generated image.`;

  const cleanedExtraDetails = config.extraDetails
    ? config.extraDetails
        .replace(/cuadro\s*(de)?\s*(superficies?|materiales?)/gi, '')
        .replace(/tabla\s*(de)?\s*(superficies?|materiales?)/gi, '')
        .trim()
    : '';

  if (is2D) {
    return [
      `Clean top-down 2D colored architectural floor plan rendered strictly from the reference blueprint layout.`,
      `Zero perspective distortion, completely flat 2D graphic catalog floor plan with furniture symbols placed in top view.`,
      strictFramingAndOccupancyDirective,
      strictNoTextInRoomsDirective,
      roomsIdentificationClause,
      `Interior style: ${selectedStyle.label}.`,
      `Walls: ${selectedInteriorWall.promptKeyword} on interior walls, ${selectedExteriorWall.promptKeyword} on perimeter exterior walls.`,
      `Flooring living & bedrooms: ${selectedLivingFloor.label}.`,
      `Kitchen flooring: ${kitchenFloorPrompt}.`,
      `Bathrooms flooring: ${selectedBathGres60.promptKeyword}.`,
      `${showerTrayRule}`,
      `Terrace flooring: ${selectedTerraceFloor.promptKeyword}.`,
      `Windows: ${selectedWindowType.promptKeyword} in ${selectedWindowFinish.promptKeyword}.`,
      `Doors & wardrobes: ${selectedDoor.promptKeyword}.`,
      `Color scheme: ${selectedPalette.promptKeyword}.`,
      cleanedExtraDetails ? `Extra notes: ${cleanedExtraDetails}.` : '',
      strictNoTablesDirective,
      strictNoTextInRoomsDirective,
      strictFramingAndOccupancyDirective,
      `Crisp architectural drawing lines, completely clean floors with zero text and zero surface numbers, professional marketing presentation.`
    ].filter(Boolean).join(' ');
  }
  // Vista 3D Dollhouse
  let angleDesc = '3D isometric cutaway dollhouse maquette view (45-degree axonometric angle)';
  if (config.cameraAngle === 'cenital_90') {
    angleDesc = 'Top-down 90-degree 3D architectural floor plan view with raised cut walls';
  } else if (config.cameraAngle === 'isometric_cutaway') {
    angleDesc = 'Sectional 3D cutaway architectural perspective';
  }
  return [
    `Transform this blueprint into an ultra-realistic ${angleDesc}.`,
    `Strictly follow the room boundaries and wall positions of the reference blueprint without adding extra rooms.`,
    strictFramingAndOccupancyDirective,
    strictNoTextInRoomsDirective,
    roomsIdentificationClause,
    `Walls cut cleanly at 1.2m height showing interior rooms, furniture, and daylight.`,
    `Interior walls color: ${selectedInteriorWall.promptKeyword}. Exterior facade walls color: ${selectedExteriorWall.promptKeyword}.`,
    `Interior style: ${selectedStyle.promptKeyword}.`,
    `Living room & bedrooms flooring: ${selectedLivingFloor.label}.`,
    `Kitchen flooring: ${kitchenFloorPrompt}.`,
    `Bathrooms flooring: ${selectedBathGres60.promptKeyword}.`,
    `${showerTrayRule}`,
    `Terrace flooring: ${selectedTerraceFloor.promptKeyword}.`,
    `Windows: ${selectedWindowType.promptKeyword} with ${selectedWindowFinish.promptKeyword}.`,
    `Doors: ${selectedDoor.promptKeyword}.`,
    `Color palette: ${selectedPalette.promptKeyword}.`,
    `Lighting: warm soft natural daylight streaming through exterior windows with gentle ambient occlusion.`,
    cleanedExtraDetails ? `Client details: ${cleanedExtraDetails}.` : '',
    `Unreal Engine 5 archviz render quality, crisp geometry, clean photorealistic textures, zero text and zero surface numbers inside rooms.`
  ].filter(Boolean).join(' ');
}

/**
 * Analiza un comando en lenguaje natural (ej. "el suelo de la estancia 8 es de parquet")
 * e identifica automáticamente si hace referencia a una estancia concreta por número o nombre.
 */
export function parseTargetedRoomFromText(
  text: string,
  markers: RoomMarker[]
): {
  matchedMarker: RoomMarker | null;
  roomIndex: number | null;
  cleanNotes: string;
} {
  const normalized = text.toLowerCase().trim();

  // 1. Buscar número de estancia: "estancia 8", "estancia #8", "habitacion 3", "#8", etc.
  const numMatch =
    normalized.match(/(?:estancia|habitaci[oó]n|cuarto|espacio|zona|dormitorio)\s*(?:n[ºo°]?\s*)?#?(\d+)/i) ||
    normalized.match(/#(\d+)/);

  if (numMatch) {
    const targetIdx = parseInt(numMatch[1], 10) - 1; // 1-indexado a 0-indexado
    if (targetIdx >= 0 && targetIdx < markers.length) {
      return {
        matchedMarker: markers[targetIdx],
        roomIndex: targetIdx,
        cleanNotes: text.replace(/(?:en\s+la\s+|el\s+)?(?:estancia|habitaci[oó]n|espacio)\s*#?\d+\s*(?:es|de|:)?/gi, '').trim()
      };
    }
  }

  // 2. Buscar por nombre exacto de estancia registrado en el plano
  for (let i = 0; i < markers.length; i++) {
    const markerName = markers[i].name.toLowerCase();
    if (markerName && normalized.includes(markerName)) {
      return {
        matchedMarker: markers[i],
        roomIndex: i,
        cleanNotes: text
      };
    }
  }

  // 3. Buscar por palabras clave de categorías habituales
  const categoryKeywords: { [key: string]: string[] } = {
    salon_comedor: ['salón', 'salon', 'comedor'],
    cocina: ['cocina'],
    dormitorio_principal: ['dormitorio principal', 'suite'],
    dormitorio_secundario: ['dormitorio', 'habitación', 'habitacion'],
    bano_principal: ['baño', 'bano', 'baño principal'],
    aseo_cortesia: ['aseo', 'toilet'],
    terraza_balcon: ['terraza', 'balcón', 'balcon']
  };

  for (let i = 0; i < markers.length; i++) {
    const cat = markers[i].category;
    const keywords = categoryKeywords[cat] || [];
    if (keywords.some((k) => normalized.includes(k))) {
      return {
        matchedMarker: markers[i],
        roomIndex: i,
        cleanNotes: text
      };
    }
  }

  return {
    matchedMarker: null,
    roomIndex: null,
    cleanNotes: text
  };
}

/**
 * Construye un prompt especializado para corrección puntual / refinamiento Image-to-Image.
 * Le indica a Gemini que debe PRESERVAR el 100% del render actual salvo la orden específica.
 */
export function buildTargetedCorrectionPrompt(
  config: RenderConfig,
  correctionInstruction: string,
  matchedMarker?: RoomMarker | null,
  roomIndex?: number | null
): string {
  let roomContext = '';
  if (matchedMarker && typeof roomIndex === 'number') {
    const hPos =
      matchedMarker.x < 35
        ? 'left / west section'
        : matchedMarker.x > 65
        ? 'right / east section'
        : 'central area';
    const vPos =
      matchedMarker.y < 35
        ? 'upper / north part'
        : matchedMarker.y > 65
        ? 'lower / south part'
        : 'middle area';
    roomContext = `CRITICAL FOCUS: The targeted area is Space #${roomIndex + 1} ("${matchedMarker.name}") located at the ${hPos}, ${vPos} of the layout.`;
  }

  return [
    `IMAGE-TO-IMAGE TARGETED ARCHITECTURAL RETOUCH AND CORRECTION:`,
    `You are modifying the reference 3D architectural render image.`,
    `ABSOLUTE PRESERVATION MANDATE: Strictly preserve 100% of the existing camera angle, lighting, 1.2m cutaway wall heights, and the flooring, partitions, and furniture in ALL OTHER ROOMS of the house. Do NOT alter or re-imagine any rooms or areas that are not mentioned.`,
    `SPECIFIC TARGETED CORRECTION TO EXECUTE:`,
    `"${correctionInstruction}"`,
    roomContext,
    `Seamlessly integrate this change into the interior style (${config.interiorStyle || 'contemporary'}) with high realism.`,
    `ABSOLUTE PROHIBITION OF TEXT: DO NOT render, write, or print ANY text, room names, English subtitles, or area numbers inside the rooms or on the floor surfaces. Keep floors 100% clean of text.`,
    `CAMERA & CANVAS OCCUPANCY: Maintain the exact same close-up architectural framing where the floor plan occupies at least 75% to 85% of the frame.`,
    `Photorealistic archviz quality, crisp geometry, clean textures, Unreal Engine 5 rendering fidelity.`
  ]
    .filter(Boolean)
    .join(' ');
}