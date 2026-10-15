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
  ROOM_CATEGORIES,
  KITCHEN_COUNTERTOP_OPTIONS
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
  const selectedCountertop = KITCHEN_COUNTERTOP_OPTIONS.find(c => c.id === config.kitchenCountertop) || KITCHEN_COUNTERTOP_OPTIONS[0];
  // Descripción del suelo de cocina teniendo en cuenta si es GRES con color
  const kitchenFloorPrompt = (config.flooringKitchen === 'gres_porcelanico_cocina' || config.flooringKitchen === 'porcelain_gres_kitchen')
    ? selectedKitchenGresColor.promptKeyword
    : `${selectedKitchenFloor.label} in kitchen floor`;
  // REGLA CRÍTICA ESTRICTA: El plato de ducha SIEMPRE es blanco puro, NUNCA del material ni color del suelo del baño
  const showerTrayRule = `CRITICAL ARCHITECTURAL DETAIL: In all bathrooms, shower trays MUST ALWAYS BE PURE CHALK WHITE mineral resin or glossy white acrylic (never matching the bathroom floor tile color or material). Every shower tray is distinctly solid clean white with clear contrast against the ${selectedBathGres60.previewColor} floor tiles, framed by a transparent glass screen shower enclosure.`;

  // REGLA CRÍTICA ESTRICTA DE COCINAS: ÚNICAMENTE VITROCERÁMICA Y FREGADERO (EL RESTO ES EXCLUSIVAMENTE ENCIMERA)
  const kitchenMinimalistRule = `CRITICAL ARCHITECTURAL STANDARD FOR ALL KITCHENS (REGLA ESTRICTA DE COCINA: ÚNICAMENTE VITROCERÁMICA Y FREGADERO, EL RESTO EXCLUSIVAMENTE ENCIMERA LIMPIA):
In all kitchens and open-plan kitchen areas (in both 2D floor plans and 3D cutaway renders):
1. The ONLY kitchen elements and fixtures that must be visible on the kitchen worktop are:
   - The flush/integrated ceramic or induction cooktop (placa vitrocerámica o inducción enrasada).
   - The kitchen sink and faucet (fregadero y grifo).
2. THE REST OF THE KITCHEN WORKTOP MUST BE 100% UNINTERRUPTED, CLEAN BARE COUNTERTOP (ENCIMERA TOTALMENTE DESPEJADA):
   - ABSOLUTE PROHIBITION of any other visible appliances or objects: DO NOT show, draw, or render refrigerators (frigoríficos), microwaves (microondas), ovens above the counter, tall appliance towers, range hoods, coffee makers, toasters, blenders, air fryers, dish drainers, cutting boards, knives, dishware, bottles, pots, pans, food, or decorative knick-knacks.
   - The countertop surface (${selectedCountertop.promptKeyword}) must be completely flat, bare, continuous, and pristine with zero clutter.
3. Underneath the countertop there are only clean, seamless base cabinetry units.
STRICT MANDATE: In kitchens, ONLY the vitrocerámica and the fregadero are visible; the rest is strictly bare, clean countertop surface with zero other appliances and zero clutter.`;

  // DIRECTIVA ESTRICTA: NUNCA DIBUJAR TEXTO, NOMBRES DE ESTANCIA, SUBTÍTULOS EN INGLÉS NI SUPERFICIES (m²) DENTRO DE LAS ESTANCIAS
  const strictNoTextInRoomsDirective = `ABSOLUTE PROHIBITION OF TEXT, LABELS, ENGLISH SUBTITLES, ROOM NAMES, AND SQUARE METERS INSIDE THE PLAN:
1. DO NOT paint, write, print, or render ANY text, letters, words, subtitles (especially NO English subtitles or words like "Living Room", "Bedroom", "Master Bedroom", "Kitchen", "Bathroom", "Toilet", "Terrace", "Balcony", "Hallway", "Corridor", "Floor Plan", "Dollhouse", etc.), nor Spanish names ("DORMITORIO", "SALON", "COCINA", "BAÑO", "ASEO", "TERRAZA", "DISTRIBUIDOR", etc.), nor dimensions, nor square meter measurements ("m²", "sqm", numbers) inside any room or anywhere on the floor plan.
2. Completely clean, erase, and eliminate all blueprint text, annotations, callout labels, and area numbers from the reference blueprint image.
3. The floor surfaces inside all rooms must be 100% CLEAN of text: ONLY pure architectural flooring materials, walls, and furniture.
4. Each room is identified strictly by an external number badge, NEVER by printed text, English subtitles, or surface numbers in the image.
STRICT RULE: ZERO text, ZERO English subtitles, ZERO room names, ZERO square meter numbers inside the rooms or on the floor.`;

  // DIRECTIVA ESTRICTA: AISLAR Y EXTRAER EXCLUSIVAMENTE EL PLANO (PROHIBICIÓN TOTAL DE PRECIOS, TEXTOS EXTERNOS Y DIBUJOS MARGINALES)
  const strictExtractOnlyPlanDirective = `MANDATORY EXTRACTION RULE — ISOLATE ONLY THE ARCHITECTURAL FLOOR PLAN:
1. ABSOLUTE PROHIBITION OF EXTERNAL TEXTS, PRICES, AND MARGIN GRAPHICS: If the reference input blueprint or uploaded image contains prices (such as apartment floor levels and prices like "5º B 250.000", "4º B 245.000", price tables, currency sums, square meter cost), external marketing copy, title blocks, carátulas, promotional text columns, or side drawings outside the floor plan:
   DO NOT copy, paint, render, or reproduce ANY of those external texts, prices, or side elements in the generated image!
2. EXTRACT STRICTLY THE RESIDENTIAL APARTMENT FLOOR PLAN FOOTPRINT: The final generated render MUST ONLY contain the residential building floor plan itself, tightly cropped and centered on a solid clean background.
3. ZERO PRICES, ZERO EXTERIOR TEXTS, ZERO SIDE DRAWINGS anywhere in the frame.`;

  // DIRECTIVA CRÍTICA: UN SOLO PLANO ARQUITECTÓNICO ÚNICO (PROHIBICIÓN TOTAL DE VISTAS DUPLICADAS, AMPLIACIONES O PLANOS LADO A LADO)
  const strictSinglePlanMandate = `MANDATORY SINGLE-DRAWING RULE (NEVER DUPLICATE OR SPLIT):
1. The generated image MUST CONTAIN EXACTLY ONE (1) SINGLE UNIFIED APARTMENT FLOOR PLAN centered cleanly on the canvas.
2. ABSOLUTE PROHIBITION OF MULTIPLE VIEWS OR DUPLICATED ROOMS:
   - NEVER draw two plans side-by-side.
   - NEVER draw a separate zoomed-in view, detail crop, or enlarged duplicate of the living room, salon, or any other room next to the main floor plan.
   - DO NOT split the canvas into two sections.
   - Every room must appear EXACTLY ONCE in the entire image, unified inside the continuous perimeter of the apartment.
3. Center the single apartment floor plan cleanly on a solid neutral white background.`;

  // CLÁUSULA CRÍTICA: IDENTIFICACIÓN Y MOBILIARIO DE ESTANCIAS (SIN TEXTO)
  let roomsIdentificationClause = '';
  if (config.roomMarkers && config.roomMarkers.length > 0) {
    const roomDescriptions = config.roomMarkers.map((marker, idx) => {
      const cat = ROOM_CATEGORIES.find(c => c.id === marker.category);
      // Ubicación cardinal aproximada según X e Y (0-100)
      const hPos = marker.x < 35 ? 'left / west section' : marker.x > 65 ? 'right / east section' : 'central area';
      const vPos = marker.y < 35 ? 'upper / north part' : marker.y > 65 ? 'lower / south part' : 'middle area';
      const specificNotes = marker.notes ? ` with ${marker.notes}` : '';
      const isKitchen = marker.category === 'cocina' || marker.name.toLowerCase().includes('cocina');
      const kitchenConstraint = isKitchen
        ? ' (STRICT KITCHEN MANDATE: ONLY the ceramic/induction cooktop and the sink are visible; the rest is 100% bare clean countertop with zero other appliances, zero refrigerators, and zero clutter).'
        : '';
      return `Space #${idx + 1} located at ${hPos}, ${vPos}: strictly furnish and layout as a ${cat?.promptDesc || 'functional room'}${specificNotes}${kitchenConstraint}. (CRITICAL: DO NOT write "${marker.name}" or any text or surface area numbers inside this space).`;
    }).join(' ');
    roomsIdentificationClause = `INTERIOR FURNISHING LAYOUT (NO TEXT IN ROOMS): ${roomDescriptions} Ensure each room is furnished according to its layout, but keep all room floors 100% clean and free of room names, text labels, or area measurements.`;
  }
  const is2D = config.cameraAngle === 'plan_2d_furnished';

  // DIRECTIVA ESTRICTA DE ENCUADRE Y PROPORCIÓN ARQUITECTÓNICA
  const strictFramingAndOccupancyDirective = `CRITICAL ARCHITECTURAL CAMERA FRAMING & OCCUPANCY:
1. The single architectural floor plan MUST BE THE CENTRAL HERO SUBJECT, clearly centered on the canvas, maintaining its true structural proportions without stretching.
2. Frame closely around exterior perimeter walls with clean, balanced, uniform neutral white borders.
3. DO NOT generate secondary drawings, zoomed room crops, or filler artwork to fill horizontal canvas margins.`;

  // DIRECTIVA ESTRICTA: NUNCA DIBUJAR TABLAS, LISTAS DE MATERIALES NI CUADROS DE TEXTO EN LA IMAGEN
  const strictNoTablesDirective = `ABSOLUTE PROHIBITION OF GRAPHIC TABLES OR TEXT SCHEDULES: DO NOT render or draw ANY table, chart, list of materials, legend, schedule box, text banner, or spreadsheet in or beside the floor plan. The output image must ONLY contain the pure architectural floor plan and its interior rooms/furniture. Absolutely NO side tables, NO material charts, NO text lists anywhere in the generated image.`;

  // DIRECTIVA ESTRICTA: DETALLE GRÁFICO ARQUITECTÓNICO EXACTO DE ARMARIOS EMPOTRADOS (BARRA Y PERCHAS CAD)
  const commercialWardrobes2dDirective = `CRITICAL ARCHITECTURAL DRAWING STANDARD FOR BUILT-IN WARDROBES (ARMARIOS EMPOTRADOS CON BARRA Y ROPA COLGADA):
In all built-in wardrobes, fitted closets, and dressing areas (in master bedroom, secondary bedrooms, dressing rooms, and hallway/entry closets):
Render them strictly in the standard top-down 2D CAD architectural blueprint symbol for clothes hanging closets:
1. Draw an open wardrobe compartment with a continuous horizontal longitudinal centerline representing the hanging rod / clothes rail (barra de colgar longitudinal central que va de lado a lado).
2. Across this central hanging rod, draw a continuous repeating rhythm of vertical and alternating slightly slanted/diagonal hatching line strokes crossing through the rail (trazos técnicos lineales verticales e inclinados alternados: / | \\ | / | \\ / | \\ que representan las perchas y prendas de ropa colgadas vistas en planta superior).
3. The interior of every built-in wardrobe must clearly exhibit this exact linear CAD blueprint symbol (continuous longitudinal rod crossed by alternating slanted and vertical hanger ticks), exactly as shown in standard Spanish commercial catalog blueprints. Never draw an opaque solid closed box, never leave the wardrobe area blank/empty, and never draw cartoon plastic hangers.`;

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
      strictSinglePlanMandate,
      strictExtractOnlyPlanDirective,
      strictFramingAndOccupancyDirective,
      strictNoTextInRoomsDirective,
      roomsIdentificationClause,
      commercialWardrobes2dDirective,
      `Interior style: ${selectedStyle.label}.`,
      `Walls: ${selectedInteriorWall.promptKeyword} on interior walls, ${selectedExteriorWall.promptKeyword} on perimeter exterior walls.`,
      `Flooring living & bedrooms: ${selectedLivingFloor.label}.`,
      `Kitchen flooring: ${kitchenFloorPrompt}.`,
      `Kitchen countertop: ${selectedCountertop.promptKeyword}.`,
      kitchenMinimalistRule,
      `Bathrooms flooring: ${selectedBathGres60.promptKeyword}.`,
      `${showerTrayRule}`,
      `Terrace flooring: ${selectedTerraceFloor.promptKeyword}.`,
      `Windows: ${selectedWindowType.promptKeyword} in ${selectedWindowFinish.promptKeyword}.`,
      `Doors & wardrobes: ${selectedDoor.promptKeyword}.`,
      commercialWardrobes2dDirective,
      `Color scheme: ${selectedPalette.promptKeyword}.`,
      cleanedExtraDetails ? `Extra notes: ${cleanedExtraDetails}.` : '',
      strictNoTablesDirective,
      strictNoTextInRoomsDirective,
      strictExtractOnlyPlanDirective,
      strictSinglePlanMandate,
      strictFramingAndOccupancyDirective,
      kitchenMinimalistRule,
      `Crisp architectural drawing lines, completely clean floors with zero text and zero surface numbers, strictly only vitrocerámica and sink visible in kitchens with the rest clean bare countertop, professional marketing presentation.`
    ].filter(Boolean).join(' ');
  }
  // Vista 3D Dollhouse
  let angleDesc = '3D isometric cutaway dollhouse maquette view (45-degree axonometric angle)';
  if (config.cameraAngle === 'cenital_90') {
    angleDesc = 'Top-down 90-degree 3D architectural floor plan view with raised cut walls';
  } else if (config.cameraAngle === 'isometric_cutaway') {
    angleDesc = 'Sectional 3D cutaway architectural perspective';
  } else if (config.cameraAngle === 'isometric_45') {
    const orientation = config.isometricOrientation || 'south_west';
    const rot = typeof config.isometricRotationAngle === 'number' ? config.isometricRotationAngle : 0;

    let directionStr = 'viewed from the South-West corner (standard front-left axonometric vantage point)';
    if (orientation === 'south_east' || rot === 90) {
      directionStr = 'viewed from the South-East corner (front-right axonometric vantage point looking across rooms toward back-left)';
    } else if (orientation === 'north_east' || rot === 180) {
      directionStr = 'viewed from the North-East corner (rear-right axonometric vantage point looking across rooms toward front-left)';
    } else if (orientation === 'north_west' || rot === 270) {
      directionStr = 'viewed from the North-West corner (rear-left axonometric vantage point looking across rooms toward front-right)';
    } else if (orientation === 'south') {
      directionStr = 'viewed from direct South front elevation angle';
    } else if (orientation === 'east') {
      directionStr = 'viewed from direct East side elevation angle';
    } else if (orientation === 'north') {
      directionStr = 'viewed from direct North rear elevation angle';
    } else if (orientation === 'west') {
      directionStr = 'viewed from direct West side elevation angle';
    } else if (rot !== 0) {
      directionStr = `axonometric viewpoint rotated ${rot} degrees clockwise around vertical axis`;
    }

    angleDesc = `3D isometric cutaway dollhouse maquette view (45-degree axonometric angle, ${directionStr})`;
  }
  return [
    `Transform this blueprint into an ultra-realistic ${angleDesc}.`,
    `Strictly follow the room boundaries and wall positions of the reference blueprint without adding extra rooms.`,
    strictSinglePlanMandate,
    strictExtractOnlyPlanDirective,
    strictFramingAndOccupancyDirective,
    strictNoTextInRoomsDirective,
    roomsIdentificationClause,
    `Walls cut cleanly at 1.2m height showing interior rooms, furniture, and daylight.`,
    `Interior walls color: ${selectedInteriorWall.promptKeyword}. Exterior facade walls color: ${selectedExteriorWall.promptKeyword}.`,
    `Interior style: ${selectedStyle.promptKeyword}.`,
    `Living room & bedrooms flooring: ${selectedLivingFloor.label}.`,
    `Kitchen flooring: ${kitchenFloorPrompt}.`,
    `Kitchen countertop work surfaces: ${selectedCountertop.promptKeyword}.`,
    kitchenMinimalistRule,
    `Bathrooms flooring: ${selectedBathGres60.promptKeyword}.`,
    `${showerTrayRule}`,
    `Terrace flooring: ${selectedTerraceFloor.promptKeyword}.`,
    `Windows: ${selectedWindowType.promptKeyword} with ${selectedWindowFinish.promptKeyword}.`,
    `Doors: ${selectedDoor.promptKeyword}.`,
    config.cameraAngle === 'cenital_90' ? `Built-in wardrobes (armarios empotrados): top-down open cut showing central longitudinal hanging rod crossed by alternating vertical and slanted strokes representing clothes hung on hangers (CAD wardrobe hatching standard).` : '',
    `Color palette: ${selectedPalette.promptKeyword}.`,
    `Lighting: warm soft natural daylight streaming through exterior windows with gentle ambient occlusion.`,
    cleanedExtraDetails ? `Client details: ${cleanedExtraDetails}.` : '',
    strictExtractOnlyPlanDirective,
    kitchenMinimalistRule,
    `Unreal Engine 5 archviz render quality, crisp geometry, clean photorealistic textures, zero text and zero surface numbers inside rooms, kitchens strictly showing solely the ceramic cooktop and sink with bare pristine countertops.`
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
    `IMAGE-TO-IMAGE TARGETED ARCHITECTURAL RETOUCH AND EDITING:`,
    `You are editing the provided architectural 3D render image.`,
    `USER MODIFICATION COMMAND (MUST BE APPLIED CLEARLY): "${correctionInstruction}".`,
    roomContext,
    `ABSOLUTE PRESERVATION MANDATE: Strictly preserve 100% of the existing camera angle, lighting, 1.2m cutaway wall heights, structural layout, and the flooring, partitions, and furniture in ALL OTHER ROOMS of the house that are not mentioned. Do NOT re-imagine or alter unrelated areas.`,
    `Seamlessly integrate the requested change into the interior style (${config.interiorStyle || 'contemporary'}) with high archviz realism.`,
    `KITCHEN STANDARD: In all kitchens, strictly ensure ONLY the ceramic cooktop (vitrocerámica) and the sink (fregadero) are visible, and the rest is strictly bare, clean countertop with zero other appliances, zero refrigerators, and zero clutter.`,
    `ABSOLUTE PROHIBITION OF TEXT: DO NOT render, write, or print ANY text, room names, English subtitles, or area numbers inside the rooms or on the floor surfaces. Keep floors 100% clean of text.`,
    `CAMERA & CANVAS OCCUPANCY: Maintain the exact same close-up architectural framing where the floor plan occupies at least 75% to 85% of the frame.`,
    `Photorealistic archviz quality, crisp geometry, clean textures, Unreal Engine 5 rendering fidelity.`
  ]
    .filter(Boolean)
    .join(' ');
}