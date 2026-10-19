import { RenderConfig, RoomMarker, DefectMark } from '../types';
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

  // DIRECTIVA ESTRICTA DE SUPERFICIES Y ACABADOS LIMPIOS
  const strictNoTextInRoomsDirective = `ARCHITECTURAL SURFACE MANDATE: All floors throughout the residence must be completely continuous, pristine, seamless flooring material with interior furniture arranged on top. Completely clean, smooth, uniform floor surfaces without any typography, room names, or overlay labels.`;

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
      const hPos = marker.x < 35 ? 'west' : marker.x > 65 ? 'east' : 'central';
      const vPos = marker.y < 35 ? 'north' : marker.y > 65 ? 'south' : 'middle';
      const specificNotes = marker.notes ? ` with ${marker.notes}` : '';
      const isKitchen = marker.category === 'cocina' || marker.name.toLowerCase().includes('cocina');
      const kitchenConstraint = isKitchen
        ? ' (strictly bare clean countertop with solely induction cooktop and sink visible)'
        : '';
      return `Space #${idx + 1} (${hPos}-${vPos}): layout as ${cat?.promptDesc || 'functional room'}${specificNotes}${kitchenConstraint}.`;
    }).join(' ');
    roomsIdentificationClause = `Interior furnishing layout: ${roomDescriptions} All floors are clean, continuous architectural materials with furniture only.`;
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
      `Clean top-down 2D architectural presentation floor plan rendered strictly from the reference blueprint layout.`,
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
      strictExtractOnlyPlanDirective,
      strictSinglePlanMandate,
      strictFramingAndOccupancyDirective,
      kitchenMinimalistRule,
      `High-end architectural presentation graphics with clean, pristine, unbroken floor surfaces and top-view furniture.`
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
    `Transform this clean architectural blueprint into an ultra-realistic ${angleDesc}.`,
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
    strictNoTextInRoomsDirective,
    `Unreal Engine 5 archviz render quality, crisp geometry, clean photorealistic textures, unbroken seamless floors with furniture only, kitchens strictly showing solely the ceramic cooktop and sink with bare pristine countertops.`
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
  roomIndex?: number | null,
  defectMark?: DefectMark | null,
  hasBinaryMask?: boolean
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

  let defectLocationClause = '';
  if (defectMark) {
    const xRound = Math.round(defectMark.x);
    const yRound = Math.round(defectMark.y);
    const hPos = xRound < 35 ? 'left / west section' : xRound > 65 ? 'right / east section' : 'central horizontal section';
    const vPos = yRound < 35 ? 'upper / north section' : yRound > 65 ? 'lower / south section' : 'middle vertical section';
    const roomDesc = defectMark.roomName ? ` inside/near "${defectMark.roomName}"` : '';
    defectLocationClause = `CRITICAL DEFECT LOCATION (VISUALLY MARKED BY USER): The user has pointed out a flaw/defect at coordinates horizontal: ${xRound}%, vertical: ${yRound}% (${hPos}, ${vPos})${roomDesc}. FOCUS THE CORRECTION ON THIS EXACT SPOT.`;
  }

  let maskClause = '';
  if (hasBinaryMask) {
    maskClause = `CRITICAL BINARY MASK INSTRUCTIONS (PRECISE INPAINTING): You are provided with a black-and-white MASK image alongside the BASE RENDER image. TASK: Apply the requested modification ("${correctionInstruction}") STRICTLY AND EXCLUSIVELY inside the WHITE areas of the mask. The BLACK areas of the mask are 100% PROTECTED AND MUST REMAIN COMPLETELY UNCHANGED, preserving their exact walls, colors, furniture, and lighting. Seamlessly blend the modified white region into the surrounding black areas.`;
  }

  return [
    `IMAGE-TO-IMAGE TARGETED ARCHITECTURAL RETOUCH AND EDITING:`,
    `You are editing the provided architectural 3D render image.`,
    maskClause,
    defectLocationClause,
    `USER MODIFICATION COMMAND (MUST BE APPLIED CLEARLY): "${correctionInstruction}".`,
    roomContext,
    `ABSOLUTE PRESERVATION MANDATE: Strictly preserve 100% of the existing camera angle, lighting, 1.2m cutaway wall heights, structural layout, and the flooring, partitions, and furniture in ALL OTHER ROOMS of the house that are not mentioned. Do NOT re-imagine or alter unrelated areas.`,
    `Seamlessly integrate the requested change into the interior style (${config.interiorStyle || 'contemporary'}) with high archviz realism.`,
    `KITCHEN STANDARD: In all kitchens, strictly ensure ONLY the ceramic cooktop (vitrocerámica) and the sink (fregadero) are visible, and the rest is strictly bare, clean countertop with zero other appliances, zero refrigerators, and zero clutter.`,
    `SURFACE FINISHES: All room floors are seamless, continuous, pristine surfaces with furniture only. No typography or printed labels anywhere on the floor surfaces.`,
    `CAMERA & CANVAS OCCUPANCY: Maintain the exact same close-up architectural framing where the floor plan occupies at least 75% to 85% of the frame.`,
    `Photorealistic archviz quality, crisp geometry, clean textures, Unreal Engine 5 rendering fidelity.`
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Añade una pequeña variación de entropía y token temporal para evitar respuestas cacheadas en Gemini
 */
export function appendPromptVariation(basePrompt: string): string {
  const variations = [
    '',
    ' Render with pristine crisp clarity.',
    ' Ensure distinctive architectural refinement.',
    ' Focus on razor-sharp geometric alignment.',
    ' Achieve ultra-clean material textures.'
  ];
  const randomSuffix = variations[Math.floor(Math.random() * variations.length)];
  return `${basePrompt}${randomSuffix} [ref_${Date.now().toString(36)}]`;
}


/**
 * Genera el prompt para un render en primera persona (a pie de habitación)
 * desde el punto de vista de la estancia seleccionada.
 */
export function buildFirstPersonInteriorPrompt(
  config: RenderConfig,
  marker: RoomMarker,
  roomIndex: number
): string {
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
  const selectedCountertop = KITCHEN_COUNTERTOP_OPTIONS.find(c => c.id === config.kitchenCountertop) || KITCHEN_COUNTERTOP_OPTIONS[0];

  const isKitchen = marker.category === 'cocina' || marker.name.toLowerCase().includes('cocina');
  const isBathroom = marker.category === 'bano_principal' || marker.category === 'aseo_cortesia' || marker.name.toLowerCase().includes('baño') || marker.name.toLowerCase().includes('aseo');
  const isTerrace = marker.category === 'terraza_balcon' || marker.name.toLowerCase().includes('terraza');

  let roomMaterialSpecs = '';
  if (isKitchen) {
    const kitchenFloor = (config.flooringKitchen === 'gres_porcelanico_cocina' || config.flooringKitchen === 'porcelain_gres_kitchen')
      ? selectedKitchenGresColor.promptKeyword
      : `${selectedKitchenFloor.label} flooring`;
    roomMaterialSpecs = `
      ROOM SPECIFICS (KITCHEN):
      - Flooring: ${kitchenFloor}.
      - Countertops: ${selectedCountertop.promptKeyword}.
      - CRITICAL KITCHEN RULE: The kitchen worktop has ONLY the integrated ceramic/induction cooktop and sink. All other countertop surfaces are clean, bare, and uncluttered. Sleek modern cabinetry.`;
  } else if (isBathroom) {
    roomMaterialSpecs = `
      ROOM SPECIFICS (BATHROOM):
      - Flooring: ${selectedBathGres60.promptKeyword} 60x60cm tiles.
      - Shower tray: ALWAYS solid chalk pure white mineral resin tray with a minimalist transparent glass enclosure screen.
      - Vanity unit with modern basin, chrome/matte black tapware, backlit LED mirror.`;
  } else if (isTerrace) {
    roomMaterialSpecs = `
      ROOM SPECIFICS (TERRACE/BALCONY):
      - Flooring: ${selectedTerraceFloor.promptKeyword}.
      - Modern glass or aluminum balustrades, outdoor lounge furniture, beautiful natural exterior daylight.`;
  } else {
    roomMaterialSpecs = `
      ROOM SPECIFICS (LIVING / BEDROOM):
      - Flooring: ${selectedLivingFloor.label} (${selectedLivingFloor.desc}).
      - High-end furniture matching ${selectedStyle.label} style, cozy textured textiles, elegant lighting.`;
  }

  const lightingDesc = config.lighting === 'night_architectural'
    ? 'Atmospheric evening scene with warm artificial interior lighting (recessed LED downlights, accent lamps) and dark sky outside windows.'
    : config.lighting === 'golden_hour'
    ? 'Warm late afternoon golden hour sunlight streaming in through the windows with long soft shadows.'
    : 'Bright, crisp natural morning daylight illuminating the entire room with realistic architectural bounce light and soft shadows.';

  return [
    `Generate a photorealistic FIRST-PERSON VIEW interior architectural photograph from the exact viewpoint of Room #${roomIndex + 1} ("${marker.name}") located at the red viewpoint marker on the reference floor plan.`,
    `VIEWPOINT & CAMERA MANDATE:`,
    `- Camera position: Inside "${marker.name}" at human eye-level height (approx. 1.60 meters).`,
    `- Camera angle: Ground-level horizontal interior photograph looking across the furnished room.`,
    `- ABSOLUTE PROHIBITION OF TOP-DOWN OR AERIAL VIEWS: Do NOT render an aerial view, cutaway axonometric model, or floor plan drawing. The final output MUST BE a normal interior photograph as seen by a person standing inside the room.`,
    `INTERIOR DESIGN & MATERIAL SPECIFICATIONS:`,
    `- Interior Style: ${selectedStyle.label} (${selectedStyle.desc}).`,
    `- Color Palette: ${selectedPalette.label} (${selectedPalette.desc}).`,
    `- Walls: ${selectedInteriorWall.promptKeyword}.`,
    `- Doors: ${selectedDoor.promptKeyword}.`,
    `- Windows: ${selectedWindowType.label} with ${selectedWindowFinish.promptKeyword}.`,

    roomMaterialSpecs,
    `LIGHTING: ${lightingDesc}`,
    `PHOTOGRAPHY QUALITY: Crisp 8k architectural editorial photograph, Architectural Digest quality, hyper-realistic textures, clean finishes, zero clutter, zero people, zero text or watermarks.`
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Superpone un marcador de punto de vista visual (círculo rojo con número blanco)
 * sobre el plano de planta para guiar a Gemini hacia la estancia exacta.
 */
export async function createFloorPlanWithViewpointMarker(
  base64Data: string,
  mimeType: string = 'image/png',
  xPercent: number,
  yPercent: number,
  roomIndex: number
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({ base64: base64Data, mimeType });
      }

      ctx.drawImage(img, 0, 0);

      const pxX = (xPercent / 100) * canvas.width;
      const pxY = (yPercent / 100) * canvas.height;
      const radius = Math.max(22, Math.min(canvas.width, canvas.height) * 0.035);

      // Sombra exterior para máxima legibilidad sobre cualquier fondo
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Círculo rojo de punto de vista
      ctx.beginPath();
      ctx.arc(pxX, pxY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#EF4444'; // Red-500 llamativo
      ctx.fill();
      ctx.restore();

      // Borde blanco nítido
      ctx.lineWidth = Math.max(3.5, radius * 0.16);
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Número identificativo centrado
      ctx.font = `bold ${Math.round(radius * 1.05)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(roomIndex + 1), pxX, pxY);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const parts = dataUrl.split(',');
      resolve({
        base64: parts[1] || base64Data,
        mimeType: 'image/jpeg'
      });
    };
    img.onerror = () => resolve({ base64: base64Data, mimeType });
    img.src = `data:${mimeType};base64,${base64Data}`;
  });
}