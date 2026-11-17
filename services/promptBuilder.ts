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
    // Detección de cocina integrada con el salón (cocina abierta / americana / salón-comedor-cocina)
  const isOpenKitchen = Boolean(
    config.flooringKitchen === 'matching_living_oak' ||
    (config.roomMarkers && config.roomMarkers.some(m =>
      /sal[oó]n.*cocina|cocina.*sal[oó]n|estancia.*cocina|living.*kitchen|abierta|americana/i.test(m.name)
    ))
  );

  // DIRECTIVA CRÍTICA UNIVERSAL: SUELO CONTINUO EN COCINAS ABIERTAS / INTEGRADAS CON EL SALÓN (TODOS LOS ESTILOS)
  const openKitchenUnifiedFlooringDirective = `CRITICAL UNIVERSAL MANDATE FOR OPEN-PLAN KITCHENS (REGLA UNIVERSAL EN TODOS LOS ESTILOS — COCINA INTEGRADA CON EL MISMO SUELO DEL SALÓN):
If the kitchen is integrated, open-plan, or part of the living/dining room space (cocina abierta, cocina americana, o salón-comedor-cocina sharing the same room without partition walls):
THE KITCHEN FLOOR MUST 100% ALWAYS HAVE THE EXACT SAME FLOORING AS THE LIVING ROOM (${selectedLivingFloor.label}).
The living room flooring (${selectedLivingFloor.label}) MUST extend continuously, seamlessly, and uninterrupted throughout the entire open kitchen zone with ZERO floor material changes, ZERO threshold lines, and ZERO tile breaks.
DO NOT render tiles, microcement, or a contrasting floor in the kitchen if it opens onto or shares space with the living room.
A separate kitchen flooring is STRICTLY AND EXCLUSIVELY permitted if and only if the kitchen is a 100% closed, separate room completely enclosed by four partition walls and an interior door.`;

  // Descripción del suelo de cocina teniendo en cuenta si está abierta al salón o cerrada
  const kitchenFloorPrompt = isOpenKitchen
    ? `Continuous seamless ${selectedLivingFloor.label} (100% matching the living room floor with zero transition across the open-plan living-kitchen)`
    : config.flooringKitchen === 'matching_living_oak'
      ? `Continuous seamless ${selectedLivingFloor.label} (identical to living room floor)`
      : config.flooringKitchen === 'metrovacesa_pastel_blue'
        ? `Soft pastel periwinkle blue wash floor in closed kitchen (#D0D7EC) (only if closed by walls; if open to living room, strictly use ${selectedLivingFloor.label})`
        : (config.flooringKitchen === 'gres_porcelanico_cocina' || config.flooringKitchen === 'porcelain_gres_kitchen')
          ? `${selectedKitchenGresColor.promptKeyword} (only if closed by walls; if open to living room, strictly use ${selectedLivingFloor.label})`
          : `${selectedKitchenFloor.label} in kitchen floor (only if closed by walls; if open to living room, strictly use ${selectedLivingFloor.label})`;

  // REGLA SUPREMA ESTRICTA: IDENTIFICACIÓN Y PINTADO DE PLATOS DE DUCHA Y BAÑERAS EN BLANCO PURO (#FFFFFF)
  const showerTrayRule = `CRITICAL MANDATORY SHOWER TRAY & BATHTUB STANDARD (IDENTIFICACIÓN EXACTA Y BLANCO PURO #FFFFFF EN PLATOS DE DUCHA):
1. SHOWER TRAY & BATHTUB IDENTIFICATION: In all bathrooms and guest half-baths, accurately locate every shower tray (plato de ducha) and bathtub enclosure indicated on the CAD blueprint (typically in corners, marked with a diagonal line, corner drain hole circle, or enclosed by a glass screen line).
2. 100% SOLID PURE CHALK WHITE COLOR FILL: Every shower tray and bathtub MUST BE RENDERED IN SOLID, OPAQUE, PRISTINE PURE WHITE (#FFFFFF) mineral resin or white acrylic.
3. ABSOLUTE PROHIBITION OF TILE OR FLOOR COLOR IN SHOWER TRAYS:
   - NEVER, UNDER ANY CIRCUMSTANCES, paint or extend the bathroom floor tiles, gres, microcement, or floor color into the shower tray!
   - The shower tray must NEVER match or blend into the bathroom floor tiles.
   - The shower tray MUST STAND OUT as a sharp, clean, high-contrast solid pure white rectangle against the ${selectedBathGres60.previewColor} floor tiles.
4. Always frame the white shower tray with a thin, transparent glass partition screen line and a minimal chrome/white drain circle.`;

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
4. PARTITION WALL PRESERVATION: If the kitchen is separated by walls in the blueprint, KEEP ALL WALLS FULLY INTACT. NEVER demolish partition walls, do NOT create open-plan American kitchens, and do NOT replace walls with kitchen island bars unless the blueprint specifically shows an open kitchen.
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

  // CLÁUSULA CRÍTICA: IDENTIFICACIÓN Y MOBILIARIO DE ESTANCIAS (CON ESCALA MÉTRICA PROPORCIONAL Y SIN TEXTO)
  let roomsIdentificationClause = '';
  if (config.roomMarkers && config.roomMarkers.length > 0) {
    const roomDescriptions = config.roomMarkers.map((marker, idx) => {
      const cat = ROOM_CATEGORIES.find(c => c.id === marker.category);
      const hPos = marker.x < 35 ? 'west' : marker.x > 65 ? 'east' : 'central';
      const vPos = marker.y < 35 ? 'north' : marker.y > 65 ? 'south' : 'middle';
      const specificNotes = marker.notes ? ` with ${marker.notes}` : '';
      const isKitchen = marker.category === 'cocina' || marker.name.toLowerCase().includes('cocina');
      const areaDesc = marker.areaSqMeters && marker.areaSqMeters > 0
        ? ` (${marker.areaSqMeters.toFixed(2)} m² useful area)`
        : '';
      const scaleGuideline = marker.areaSqMeters && marker.areaSqMeters > 0
        ? marker.category === 'dormitorio_principal' || marker.areaSqMeters >= 11
          ? ' fitted with queen/king size bed and nightstands with 80cm circulation clearance'
          : marker.category === 'dormitorio_secundario'
            ? ' fitted with proportional single/compact bed, study desk and wardrobe'
            : marker.category === 'salon_comedor' && marker.areaSqMeters >= 22
              ? ' with generous modular sofa, coffee table, entertainment console, and 6-person dining table'
              : ''
        : '';
      const kitchenConstraint = isKitchen
        ? ' (strictly bare clean countertop with solely induction cooktop and sink visible)'
        : '';
      return `Space #${idx + 1} "${marker.name}"${areaDesc} (${hPos}-${vPos}): layout as ${cat?.promptDesc || 'functional room'}${scaleGuideline}${specificNotes}${kitchenConstraint}.`;
    }).join(' ');
    roomsIdentificationClause = `Interior furnishing layout: ${roomDescriptions} All furniture must be strictly scaled in realistic ergonomic proportion to each room area (leaving clear 70-80cm circulation paths around beds, doors, and tables). All floors are clean, continuous architectural materials with furniture only.`;
  }
  const is2D = config.cameraAngle === 'plan_2d_furnished';

  // DIRECTIVA CRÍTICA: PROYECCIÓN ORTOGONAL 2D PLANA ESTRICTA (0 GRADOS, SIN PERSPECTIVA)
  const strictOrthographic2dDirective = `CRITICAL MANDATE — STRICT 0-DEGREE FLAT ORTHOGRAPHIC 2D PROJECTION:
1. PURE TOP-DOWN CAD BLUEPRINT: The render MUST BE a completely flat, 2D architectural presentation floor plan with exactly 0 degrees of perspective tilt, zero vanishing lines, zero angled shadows, and zero depth extrusion on furniture or walls.
2. FLAT FURNITURE SYMBOLS: Every piece of furniture (beds, sofas, tables, chairs, sinks, sanitarios) must be rendered as clean, flat, top-down 2D plan symbols as seen in high-end real estate sales dossiers. DO NOT draw 3D perspective volumes or tilted furniture cushions.
3. CRISP ORTHOGONAL WALL EDGES: All structural walls and partitions must have straight, perpendicular, razor-sharp edges without soft gradients or angled wall tops.`;

  // DIRECTIVA ESTRICTA DE ENCUADRE Y PROPORCIÓN ARQUITECTÓNICA (PROTECCIÓN TOTAL CONTRA RECORTES)
  const strictFramingAndOccupancyDirective = `CRITICAL ARCHITECTURAL CAMERA FRAMING & MARGINS (ZERO-CROPPING MANDATE — EL PLANO NUNCA DEBE SALIRSE DE LA IMAGEN):
1. 100% COMPLETE BUILDING FOOTPRINT FIT: The ENTIRE apartment floor plan and ALL of its exterior facade walls, perimeter rooms, bedrooms, bathrooms, corners, balconies, and terraces MUST BE FULLY AND COMPLETELY CONTAINED WITHIN THE CANVAS FRAME.
2. ABSOLUTE PROHIBITION OF CROPPING OR BLEEDING OUTSIDE THE IMAGE:
   - NEVER cut off, clip, or slice ANY perimeter wall, room, bedroom, bed, desk, nightstand, or corner.
   - NEVER let the building boundaries touch or cross the canvas borders.
3. MANDATORY SAFETY MARGINS (PADDING): Always provide a generous, balanced, uniform pure white (#FFFFFF) breathing margin around all four edges (at least 8% to 12% white space margin on top, bottom, left, and right sides).
4. The floor plan must be perfectly centered on the solid white canvas with ample clearance on all sides, ensuring zero parts of the home are cut off or spill outside the frame.
5. DO NOT generate secondary drawings, zoomed room crops, or filler artwork in margins.`;

  // DIRECTIVA ESTRICTA: NUNCA DIBUJAR TABLAS, LISTAS DE MATERIALES NI CUADROS DE TEXTO EN LA IMAGEN
  const strictNoTablesDirective = `ABSOLUTE PROHIBITION OF GRAPHIC TABLES OR TEXT SCHEDULES: DO NOT render or draw ANY table, chart, list of materials, legend, schedule box, text banner, or spreadsheet in or beside the floor plan. The output image must ONLY contain the pure architectural floor plan and its interior rooms/furniture. Absolutely NO side tables, NO material charts, NO text lists anywhere in the generated image.`;

  // DIRECTIVA ESTRICTA: DETALLE GRÁFICO ARQUITECTÓNICO EXACTO DE ARMARIOS EMPOTRADOS (BARRA Y PERCHAS COMO SIMPLES LÍNEAS CAD)
  const commercialWardrobes2dDirective = `BUILT-IN WARDROBES ARCHITECTURAL STANDARD (ARMARIOS EMPOTRADOS — PERCHAS Y ROPA COMO SIMPLES LÍNEAS RECTAS):
In all bedrooms, dressing areas, and hallway closets, render built-in wardrobes (armarios empotrados) using clean minimalist 2D CAD blueprint presentation:
1. An open rectangular wardrobe compartment flush with adjoining partition walls.
2. A single straight longitudinal hanging rail bar along the center of the wardrobe.
3. HANGING CLOTHES / HANGERS MUST BE RENDERED STRICTLY AS SIMPLE STRAIGHT PARALLEL LINES (simples líneas rectas perpendiculares | | | | | | |).
4. ABSOLUTE PROHIBITION of drawing triangular coat hangers, hanger hooks, diagonal loops, triangles, arrowheads, or complex geometries. DO NOT draw triangular hangers. ONLY draw simple, clean, equidistant straight perpendicular lines across or along the hanging bar to represent hung garments.`;

    // DIRECTIVA CRÍTICA: PROHIBICIÓN TOTAL DE INVENTAR ESPACIOS EN EL FONDO EXTERIOR
  const strictExteriorVoidDirective = `ABSOLUTE EXTERIOR VOID MANDATE:
1. The exterior facade walls of the apartment shown in the reference blueprint define the absolute boundary of the home.
2. The entire canvas area OUTSIDE these perimeter facade walls must be completely blank, solid, neutral pure white (#FFFFFF) background with zero drawings.
3. ABSOLUTELY DO NOT invent wraparound terraces, side balconies, exterior decks, gardens, patio chairs, outdoor tables, or exterior furniture in the margins outside the apartment walls.`;

  const hasTerraceMarker = config.roomMarkers && config.roomMarkers.some(
    m => m.category === 'terraza_balcon' || /terraza|balc[oó]n|porche|solarium/i.test(m.name)
  );
  const terraceDirective = hasTerraceMarker
    ? `Terrace flooring: ${selectedTerraceFloor.promptKeyword}. Render ONLY the terrace boundary clearly drawn inside the blueprint.`
    : `STRICT PROHIBITION OF EXTERIOR TERRACES OR BALCONIES: This residence has NO terrace or balcony. DO NOT invent, draw, or render ANY outdoor terrace, balcony, veranda, deck, patio, or outdoor furniture anywhere. All areas outside exterior walls MUST REMAIN 100% PURE EMPTY WHITE BACKGROUND.`;

  // MANDATO DE FIDELIDAD ESTRUCTURAL 1:1 (CALCO INMUTABLE)
  const strictFidelityMandate = config.strictBlueprintFidelity !== false
    ? `CRITICAL ARCHITECTURAL MANDATE — ZERO-HALLUCINATION BLUEPRINT FIDELITY (CALCO 1:1 ESTRUCTURAL):
1. The input image is an official architectural CAD master blueprint. Every wall line, exterior boundary, interior partition, structural column, door opening, and window is 100% FIXED AND UNALTERABLE.
2. ABSOLUTE PROHIBITION OF HALLUCINATIONS:
   - DO NOT add walls, DO NOT delete walls, DO NOT knock down kitchen partitions.
   - DO NOT invent phantom hallways, corridors, or outdoor terraces.
   - DO NOT change windows into doors, and DO NOT move door openings.
3. Every room's exact shape, perimeter, and wall thickness must correspond 1:1 with topological precision to the source blueprint.
4. DO NOT invent extra rooms or exterior spaces that do not exist in the source blueprint.`
    : `Maintain overall architectural layout and room boundaries from the reference blueprint.`;

  // MANDATO DE MOBILIARIO SEGÚN OPCIÓN DE USUARIO
  const furnitureMandate = config.removeOriginalFurniture === false
    ? `FURNITURE FIDELITY (CONSERVAR MOBILIARIO CAD ORIGINAL):
The reference blueprint already contains technical 2D CAD furniture symbols (beds, sofas, tables, sanitarios).
Render high-end photorealistic materials and textures DIRECTLY OVER these exact indicated furniture locations and orientations.
DO NOT displace, duplicate, or invent a different furniture layout.`
    : `FURNITURE STANDARD: Furnish each room cleanly and proportionately according to its architectural designation. Ensure all furniture respects circulation clearances and never obstructs doors or windows.`;

  const cleanedExtraDetails = config.extraDetails
    ? config.extraDetails
        .replace(/cuadro\s*(de)?\s*(superficies?|materiales?)/gi, '')
        .replace(/tabla\s*(de)?\s*(superficies?|materiales?)/gi, '')
        .trim()
    : '';

  // DIRECTIVA ESTRICTA PARA ESTILO VECTORIAL COMERCIAL (ESTILO FOLLETOS NIRA, NUBA, VEGA)
  const isVectorialStyle = config.interiorStyle === 'estilo_vectorial' || config.colorPalette === 'vectorial_navy_pure';
  const vectorBrochureDirective = isVectorialStyle ? `CRITICAL MANDATE — ESTILO VECTORIAL COMMERCIAL BROCHURE GRAPHICS (ESTILO VECTORIAL REAL ESTATE DOSSIER):
1. STRUCTURAL WALLS: ALL structural exterior walls and interior partitions MUST be rendered as SOLID OPAQUE DARK NAVY BLUE (#0B253A) or ARCHITECTURAL TECHNICAL BLUE (#1E3A8A). Walls must have crisp, razor-sharp straight vector boundaries with zero internal textures, zero noise, and zero gradients.
2. FLOORS (LIVING ROOM, BEDROOMS, HALLS): 100% PURE UNBROKEN SOLID WHITE (#FFFFFF). Absolutely zero wood grain, zero concrete noise, zero shadows, zero glare.
3. FURNITURE SILHOUETTES: All interior furniture (beds, sofas, coffee tables, dining tables, chairs, nightstands) must be rendered as minimalist 2D flat vector silhouettes filled with soft warm champagne-beige / sand tone (#EAE6DF) and bounded by a clean, thin 1px dark contour stroke.
4. BATHROOMS: Pristine white floor surface with a very subtle, thin light-grey 60x60 orthogonal tile grid. Pure solid white rectangular shower tray with a clean transparent glass screen line.
5. KITCHEN: Solid clean white base countertop with strictly the induction cooktop (vitrocerámica) and sink (fregadero) delineated. 100% bare uncluttered worktop. If the kitchen is open-plan or integrated into the living room, it shares the exact same continuous pure white floor as the living room.
6. TERRACE: Warm sand-colored porcelain tiles (#B8ACA0) or clean horizontal slatted exterior wood decking.
7. CAD DOORS: Thin clean 90-degree radial door swing arcs flush with partition openings.
8. WARDROBES & CLOTHES HANGERS (ARMARIOS Y PERCHAS): Built-in wardrobes must show a single longitudinal hanging rail with hanging clothes represented STRICTLY AS SIMPLE STRAIGHT PARALLEL TICK LINES (| | | | | |). NEVER draw triangular coat hangers, loops, hooks, or distorted shapes. They must look like clean, simple CAD straight lines only.
9. PRESENTATION: Clean, professional commercial property brochure vector floor plan (as seen in Edificio NIRA and NUBA Gardens dossiers).` : '';

  // DIRECTIVAS ESTRICTAS PARA ESTILOS PROMOTORES PRYCONSA Y METROVACESA
  const isPryconsaStyle = config.interiorStyle === 'estilo_pryconsa' || config.colorPalette === 'pryconsa_roble_teja';
  const pryconsaBrochureDirective = isPryconsaStyle ? `CRITICAL MANDATE — ESTILO PRYCONSA COMMERCIAL BROCHURE GRAPHICS (ESTILO PRYCONSA RESIDENCIAL SANTA VICTORIA / CAMPUS):
1. STRUCTURAL WALLS: All exterior perimeter walls and interior partitions MUST be rendered in solid dark graphite/anthracite (#4A4D52) with crisp, razor-sharp straight vector boundaries.
2. LIVING ROOM, BEDROOMS & CORRIDORS: Warm light blonde natural oak laminate flooring rendered with clear, delicate, continuous VERTICAL PLANK LINES (#F2EAD8) running longitudinally across each room. If the kitchen is open-plan / integrated with the living room, this exact same vertical oak flooring continues seamlessly across the kitchen area.
3. BATHROOMS: Medium neutral cement-grey ceramic tiles (#8E9298) with solid clean white sanitary fixtures and bathtub/shower tray.
4. TERRACE: Warm dusky terracotta/brick tile grid or reddish-wood outdoor decking (#B88D88).
5. WARDROBES: Built-in closets with a single central longitudinal bar and hanging clothes represented STRICTLY AS SIMPLE STRAIGHT PARALLEL LINES (| | | | | |), zero triangles, zero hooks.
6. FURNITURE: Minimalist crisp white 2D vector silhouettes with thin dark outlines.` : '';

  const isMetrovacesaStyle = config.interiorStyle === 'estilo_metrovacesa' || config.colorPalette === 'metrovacesa_azul_pastel';
  const metrovacesaBrochureDirective = isMetrovacesaStyle ? `CRITICAL MANDATE — ESTILO METROVACESA COMMERCIAL BROCHURE GRAPHICS (ESTILO METROVACESA ALYSSA / MESENA 80):
1. STRUCTURAL WALLS: All structural exterior and interior partition walls MUST be rendered in solid dark slate grey (#484C51) with clean, sharp edges.
2. DRY ZONES FLOOR (LIVING ROOM, BEDROOMS, VESTIBULE, HALLWAYS): Continuous, smooth, seamless light alabaster / off-white floor (#F4F5F7) without joints, clean and uniform.
3. WET ZONES SIGNATURE ACCENT TONE (SELLO DISTINTIVO METROVACESA): In closed kitchens (only if fully separated by walls from the salon), laundry/tendedero, and ALL bathrooms, render floor in soft pastel periwinkle blue (#D0D7EC / #CBD4EE). CRITICAL EXCEPTION: If the kitchen is open-plan or integrated into the living room (salón-cocina), it MUST have the EXACT SAME alabaster floor as the living room, with NO blue wash dividing the open living space.
4. FURNITURE: Pristine white 2D vector shapes with thin crisp dark contour lines.
5. DOORS: Thin 2D CAD radial 90-degree arc swing lines.
6. WARDROBES: Simple straight parallel lines for clothes hanging rail, strictly no triangular hangers.` : '';

  const hasSpecificBrochureStyle = isVectorialStyle || isPryconsaStyle || isMetrovacesaStyle;
  const strictStyleConsistencyMandate = 'CRITICAL ARCHITECTURAL CONSISTENCY & BRANDING ANCHOR: Exactly replicate the established style palette, line weights, wall fill color, and material finishes across all floor plans of this project. Absolute zero stylistic drift, zero creative reinterpretation, and zero material substitutions between floor plans.';

  if (is2D) {
    return [
      `Clean top-down 2D architectural presentation floor plan rendered strictly from the reference blueprint layout.`,
      `Zero perspective distortion, completely flat 2D graphic catalog floor plan with furniture symbols placed in top view.`,
      strictStyleConsistencyMandate,
      strictOrthographic2dDirective,
      vectorBrochureDirective,
      pryconsaBrochureDirective,
      metrovacesaBrochureDirective,
      strictFidelityMandate,
      furnitureMandate,
      strictSinglePlanMandate,
      strictExtractOnlyPlanDirective,
      strictFramingAndOccupancyDirective,
      strictNoTextInRoomsDirective,
      roomsIdentificationClause,
      commercialWardrobes2dDirective,
      !hasSpecificBrochureStyle ? `Interior style: ${selectedStyle.label}.` : '',
      !hasSpecificBrochureStyle ? `Walls: ${selectedInteriorWall.promptKeyword} on interior walls, ${selectedExteriorWall.promptKeyword} on perimeter exterior walls.` : '',
      !hasSpecificBrochureStyle ? `Flooring living & bedrooms: ${selectedLivingFloor.label}.` : '',
      !hasSpecificBrochureStyle ? `Kitchen flooring: ${kitchenFloorPrompt}.` : '',
      `Kitchen countertop: ${selectedCountertop.promptKeyword}.`,
      openKitchenUnifiedFlooringDirective,
      kitchenMinimalistRule,
      !hasSpecificBrochureStyle ? `Bathrooms flooring: ${selectedBathGres60.promptKeyword}.` : '',
      `${showerTrayRule}`,
      terraceDirective,
      strictExteriorVoidDirective,
      `Windows: ${selectedWindowType.promptKeyword} in ${selectedWindowFinish.promptKeyword}.`,
      `Doors & wardrobes: ${selectedDoor.promptKeyword}.`,
      !hasSpecificBrochureStyle ? `Color scheme: ${selectedPalette.promptKeyword}.` : '',
      cleanedExtraDetails ? `Extra notes: ${cleanedExtraDetails}.` : '',
      strictNoTablesDirective,
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
    strictStyleConsistencyMandate,
    strictFidelityMandate,
    furnitureMandate,
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
    config.cameraAngle === 'cenital_90' ? `Built-in wardrobes (armarios empotrados): top-down open cut showing central longitudinal hanging rod with simple straight parallel lines representing hung clothes flush with walls (no triangular hangers).` : '',
    `Color palette: ${selectedPalette.promptKeyword}.`,
    `Lighting: warm soft natural daylight streaming through exterior windows with gentle ambient occlusion.`,
    cleanedExtraDetails ? `Client details: ${cleanedExtraDetails}.` : '',
    strictNoTablesDirective,
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
    `CAMERA & CANVAS OCCUPANCY: Ensure the entire floor plan fits comfortably within the frame with generous, clean white margins around all perimeter walls, ensuring no walls, rooms, or furniture touch or spill outside the image borders.`,
    `MANDATORY ZERO-CROPPING RULE: Never crop or cut off any room, bed, desk, or perimeter wall.`,
    `Photorealistic archviz quality, crisp geometry, clean textures, Unreal Engine 5 rendering fidelity.`
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Añade una pequeña variación de entropía y token temporal para evitar respuestas cacheadas en Gemini
 */
export function appendPromptVariation(basePrompt: string, _forceEntropy = false): string {
  // Deterministic prompt output - suppresses random entropy variations and timestamps to guarantee 100% stylistic consistency across successive renders
  return basePrompt.trim();
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