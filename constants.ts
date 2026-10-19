import {
  CameraAngle,
  InteriorStyle,
  ColorPaletteScheme,
  FlooringType,
  KitchenFlooringType,
  KitchenGresColor,
  KitchenCountertopType,
  BathroomFlooring60x60Tone,
  TerraceFlooringType,
  WindowFrameType,
  WindowFrameFinish,
  DoorFinish,
  WallColorType,
  RoomCategory,
  PresetConfig,
  IsometricOrientation,
  RenderEngine
} from './types';
import { DEFAULT_PROMOTION_LOGO } from './services/defaultPromotionLogo';
import { DEFAULT_AGENCY_LOGO } from './services/defaultAgencyLogo';
import { DEFAULT_PROMUEVE_LOGO } from './services/defaultPromueveLogo';
// Categorías de Estancias para el Identificador
export const ROOM_CATEGORIES: {
  id: RoomCategory;
  label: string;
  icon: string;
  color: string;
  bgLight: string;
  promptDesc: string;
}[] = [
    {
      id: 'salon_comedor',
      label: 'Salón - Comedor',
      icon: 'chair',
      color: '#D97706',
      bgLight: '#FEF3C7',
      promptDesc: 'Living Room / Dining Room with comfortable sofa, coffee table, TV console and dining table with chairs'
    },
    {
      id: 'cocina',
      label: 'Cocina',
      icon: 'countertops',
      color: '#EA580C',
      bgLight: '#FFEDD5',
      promptDesc: 'Kitchen fitted with continuous countertop where ONLY the ceramic/induction cooktop (vitrocerámica) and sink (fregadero) are visible, with the entire remainder being strictly bare, clean countertop (zero other appliances, zero refrigerators, zero clutter)'
    },
    {
      id: 'dormitorio_principal',
      label: 'Dormitorio Principal',
      icon: 'bed',
      color: '#4F46E5',
      bgLight: '#EEF2FF',
      promptDesc: 'Master Bedroom with double/king-size bed, nightstands, decorative headboard and built-in wardrobe (showing top-down interior hanging bar with 6-7 clothes hangers)'
    },
    {
      id: 'dormitorio_secundario',
      label: 'Dormitorio / Habitación',
      icon: 'single_bed',
      color: '#2563EB',
      bgLight: '#EFF6FF',
      promptDesc: 'Secondary Bedroom with bed, bedside table, study desk and built-in closet (showing top-down hanging bar with clothes hangers)'
    },
    {
      id: 'bano_principal',
      label: 'Baño Principal',
      icon: 'bathtub',
      color: '#0284C7',
      bgLight: '#E0F2FE',
      promptDesc: 'Full Bathroom with vanity sink, mirror, toilet and pure white shower tray with glass partition'
    },
    {
      id: 'aseo_cortesia',
      label: 'Aseo de Cortesía',
      icon: 'shower',
      color: '#0891B2',
      bgLight: '#CFFAFE',
      promptDesc: 'Guest Toilet / Half Bath with vanity sink and toilet'
    },
    {
      id: 'terraza_balcon',
      label: 'Terraza / Balcón exterior',
      icon: 'deck',
      color: '#16A34A',
      bgLight: '#DCFCE7',
      promptDesc: 'Exterior Terrace / Balcony with outdoor chairs, small coffee table and open railing view'
    },
    {
      id: 'lavadero_galeria',
      label: 'Lavadero / Galería / Tendedero',
      icon: 'local_laundry_service',
      color: '#0D9488',
      bgLight: '#CCFBF1',
      promptDesc: 'Laundry room / Utility gallery with washing machine, dryer and storage unit'
    },
    {
      id: 'despacho_estudio',
      label: 'Despacho / Estudio',
      icon: 'laptop_mac',
      color: '#7C3AED',
      bgLight: '#F3E8FF',
      promptDesc: 'Home Office / Study room with desk, ergonomic chair, shelving and reading lamp'
    },
    {
      id: 'vestidor',
      label: 'Vestidor',
      icon: 'checkroom',
      color: '#DB2777',
      bgLight: '#FCE7F3',
      promptDesc: 'Walk-in Closet / Dressing area lined with custom modular wardrobes showing interior hanging bars with clothes hangers and full-length mirror'
    },
    {
      id: 'recibidor_distribuidor',
      label: 'Recibidor / Distribuidor',
      icon: 'meeting_room',
      color: '#78716C',
      bgLight: '#F5F5F4',
      promptDesc: 'Entrance hall / corridor / foyer connecting the rooms'
    },
    {
      id: 'otro',
      label: 'Otra estancia personalizada',
      icon: 'grid_view',
      color: '#64748B',
      bgLight: '#F1F5F9',
      promptDesc: 'Designated room space'
    }
  ];
// 1.1 Ángulo de Cámara & Modo de Render
export const CAMERA_ANGLES: { id: CameraAngle; label: string; icon: string; desc: string; badge?: string }[] = [
  {
    id: 'isometric_45',
    label: 'Corte Isométrico 45°',
    icon: 'view_in_ar',
    desc: 'Vista tridimensional tipo maqueta cortada con volumen de paredes y muebles.'
  },
  {
    id: 'cenital_90',
    label: 'Planta Cenital 90°',
    icon: 'crop_free',
    desc: 'Vista perpendicular cenital con sombras arrojadas y muebles 3D en planta.'
  },
  {
    id: 'plan_2d_furnished',
    label: 'Plano 2D Comercial Amueblado',
    icon: 'space_dashboard',
    desc: 'Plano 2D ortográfico delineado de catálogo con texturas, armarios con barra y 6-7 perchas, y mobiliario en 2D.',
    badge: 'Modo 2D'
  },
  {
    id: 'isometric_cutaway',
    label: 'Sección Escorzo Transversal',
    icon: 'architecture',
    desc: 'Corte oblicuo arquitectónico con visión interior y exterior.'
  }
];

// 1.1b Orientación y Ángulo de Visión para Corte Isométrico (360°)
export interface IsometricOrientationOption {
  id: IsometricOrientation;
  label: string;
  cardinal: string;
  angle: number; // 0°, 90°, 180°, 270°, etc.
  desc: string;
  icon: string;
}

export const ISOMETRIC_ORIENTATIONS: IsometricOrientationOption[] = [
  {
    id: 'south_west',
    label: 'Suroeste (Frontal Izquierda)',
    cardinal: 'SO',
    angle: 0,
    desc: 'Esquina frontal-izquierda (perspectiva clásica y más amplia de maqueta).',
    icon: 'south_west'
  },
  {
    id: 'south_east',
    label: 'Sureste (Frontal Derecha)',
    cardinal: 'SE',
    angle: 90,
    desc: 'Esquina frontal-derecha con muros cortados mostrando el interior lateral.',
    icon: 'south_east'
  },
  {
    id: 'north_east',
    label: 'Noreste (Posterior Derecha)',
    cardinal: 'NE',
    angle: 180,
    desc: 'Esquina posterior-derecha viendo la vivienda desde atrás hacia el frente.',
    icon: 'north_east'
  },
  {
    id: 'north_west',
    label: 'Noroeste (Posterior Izquierda)',
    cardinal: 'NO',
    angle: 270,
    desc: 'Esquina posterior-izquierda con perspectiva cruzada invertida.',
    icon: 'north_west'
  },
  {
    id: 'south',
    label: 'Sur (Frontal Directo)',
    cardinal: 'S',
    angle: 45,
    desc: 'Perspectiva isométrica frontal centrada.',
    icon: 'south'
  },
  {
    id: 'east',
    label: 'Este (Lateral Derecho)',
    cardinal: 'E',
    angle: 135,
    desc: 'Perspectiva lateral derecha con volumen.',
    icon: 'east'
  },
  {
    id: 'north',
    label: 'Norte (Posterior Directo)',
    cardinal: 'N',
    angle: 225,
    desc: 'Perspectiva posterior directa de la vivienda.',
    icon: 'north'
  },
  {
    id: 'west',
    label: 'Oeste (Lateral Izquierdo)',
    cardinal: 'O',
    angle: 315,
    desc: 'Perspectiva lateral izquierda con volumen.',
    icon: 'west'
  }
];

// 1.1b Motores de Render Gemini Disponibles
export interface RenderEngineOption {
  id: RenderEngine;
  label: string;
  modelName: string;
  badge: string;
  desc: string;
  speed: 'Ultra Rápido' | 'Rápido' | 'Alta Definición';
  icon: string;
  versionTag: string;
}

export const RENDER_ENGINE_OPTIONS: RenderEngineOption[] = [
  {
    id: 'auto',
    label: 'Automático Inteligente',
    modelName: 'Selección dinámica',
    badge: 'Recomendado',
    desc: 'Selecciona dinámicamente el mejor motor según el modo 2D, maqueta 3D o retoque, con tolerancia a fallos.',
    speed: 'Rápido',
    icon: 'auto_mode',
    versionTag: 'Auto'
  },
  {
    id: 'gemini-3.1-flash-image',
    label: 'Gemini 3.1 Flash Image',
    modelName: 'gemini-3.1-flash-image',
    badge: 'Última Generación',
    desc: 'Motor de última generación (Nano Banana 2). Gran equilibrio entre velocidad, fidelidad de planos y texturas limpias.',
    speed: 'Rápido',
    icon: 'bolt',
    versionTag: 'v3.1 Flash'
  },
  {
    id: 'gemini-3-pro-image',
    label: 'Gemini 3 Pro Image',
    modelName: 'gemini-3-pro-image',
    badge: 'Máximo Detalle',
    desc: 'Motor Pro de máxima fidelidad (Nano Banana Pro). Mayor riqueza en acabados arquitectónicos, mobiliario y cotas.',
    speed: 'Alta Definición',
    icon: 'hotel_class',
    versionTag: 'v3.0 Pro'
  },
  {
    id: 'gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash Image',
    modelName: 'gemini-2.5-flash-image',
    badge: 'Estable & Seguro',
    desc: 'Motor clásico de alta estabilidad para planos 2D y maquetas 3D comerciales.',
    speed: 'Rápido',
    icon: 'verified',
    versionTag: 'v2.5 Flash'
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    label: 'Gemini 3.1 Flash Lite Image',
    modelName: 'gemini-3.1-flash-lite-image',
    badge: 'Baja Latencia',
    desc: 'Motor ultrarrápido ideal para pruebas ágiles y previsualizaciones instantáneas.',
    speed: 'Ultra Rápido',
    icon: 'speed',
    versionTag: 'v3.1 Lite'
  }
];

// 1.2 Gama Cromática General (Paredes & Textiles)
export const COLOR_PALETTE_SCHEMES: {
  id: ColorPaletteScheme;
  label: string;
  badge: string;
  desc: string;
  colors: string[];
  promptKeyword: string;
}[] = [
    {
      id: 'light_soft_pastel',
      label: 'Claros y Suaves',
      badge: 'Recomendado',
      desc: 'Blancos rotos, crudos de lino, tonos crema etéreos, toques sutiles de gris perla y pasteles sedosos.',
      colors: ['#FAF9F6', '#F3EFEA', '#EAE3D9', '#D5DFD8', '#F5EBE6'],
      promptKeyword: 'soft and light pastel color palette, delicate off-white walls, powdery ecru, gentle warm cream upholstery, subtle blush and bleached linen textures, luminous and airy'
    },
    {
      id: 'warm_sand_cream',
      label: 'Arena, Vainilla & Marfil',
      badge: 'Cálido Claro',
      desc: 'Gama luminosa en beiges empolvados, marfil brillante y madera clara blanqueada.',
      colors: ['#FCFBF7', '#F6F1E7', '#EDE4D3', '#DFD3BF'],
      promptKeyword: 'warm sand, soft ivory and vanilla cream palette, luminous chalk-white surfaces, light beige bouclé fabrics, gentle morning light'
    },
    {
      id: 'soft_sage_light',
      label: 'Verde Salvia Suave & Lino',
      badge: 'Botánico Tenue',
      desc: 'Tonos salvia muy claros y empolvados combinados con blanco nube y roble pálido.',
      colors: ['#F9FAF8', '#E9EFE9', '#D3DDD4', '#E6E2D8'],
      promptKeyword: 'soft muted pale sage green accents, delicate misty morning greens, paired with soft chalk white and washed linen'
    },
    {
      id: 'soft_rose_linen',
      label: 'Palo de Rosa Suave & Crema',
      badge: 'Suave & Acogedor',
      desc: 'Toques muy delicados de rosa empolvado apagado, yeso blanco y lino lavado.',
      colors: ['#FCFAF9', '#F9EFEB', '#EFE0DA', '#DCD5CE'],
      promptKeyword: 'whisper-soft dusty rose tones, powdery alabaster plaster, warm light oatmeal textiles'
    },
    {
      id: 'neutral_balanced',
      label: 'Neutros Arquitectónicos',
      badge: 'Equilibrado',
      desc: 'Blancos, greiges intermedios y maderas naturales equilibradas.',
      colors: ['#FFFFFF', '#EAE6E1', '#C6BFB6', '#8C857B'],
      promptKeyword: 'balanced architectural neutral tones, clean modern off-whites and greige finishes'
    },
    {
      id: 'deep_contrasts',
      label: 'Contraste Intenso & Grafito',
      badge: 'Marcado',
      desc: 'Presencia de negros, maderas oscuras y acentos de grafito intenso.',
      colors: ['#F4F4F5', '#71717A', '#3F3F46', '#18181B'],
      promptKeyword: 'high contrast interior, charcoal and graphite accents with distinct dark architectural elements'
    },
    {
      id: 'navy_indigo_honey',
      label: 'Azul Índigo & Roble Miel',
      badge: 'Mediterráneo Noche',
      desc: 'Azul marino y pizarra profundo en tapicerías, roble miel cálido y blanco tiza.',
      colors: ['#F4F5F7', '#C69C6D', '#4A6B82', '#1B365D'],
      promptKeyword: 'sophisticated deep indigo navy blue and slate accents, warm honey oak woodwork, crisp pure white walls, coastal European elegance'
    },
    {
      id: 'terracotta_earth_clay',
      label: 'Terracota Tostada, Arcilla & Caliza',
      badge: 'Tierra Toscana',
      desc: 'Cálidos colores teja artesanal, caldero y arcilla tostada con caliza y lino.',
      colors: ['#EADFC9', '#D98A6C', '#C15C3D', '#6B705C'],
      promptKeyword: 'warm earthy terracotta tile tones, rich burnt sienna and baked clay pottery accents, natural golden limestone, Mediterranean warmth'
    },
    {
      id: 'emerald_forest_brass',
      label: 'Verde Bosque Esmeralda & Latón',
      badge: 'Lujo Botánico',
      desc: 'Verdes profundos de bosque y eucalipto, nogal noble y destellos de latón dorado.',
      colors: ['#FAF8F5', '#4D6A56', '#1E3F20', '#C5A059'],
      promptKeyword: 'rich deep emerald forest green upholstery, eucalyptus green accents, warm walnut woodwork, elegant brushed brass and gold metallic hardware'
    },
    {
      id: 'mustard_ochre_walnut',
      label: 'Mostaza Ocre, Teca & Antracita',
      badge: 'Mid-Century 60s',
      desc: 'Vibrante amarillo mostaza y ocre tostado, maderas de teca y estructura en carbón.',
      colors: ['#F7F5F0', '#D4A017', '#8B5A2B', '#33383F'],
      promptKeyword: 'vibrant warm mustard yellow and golden ochre textiles, mid-century teak and dark walnut furniture, sharp charcoal anthracite graphic contrast'
    },
    {
      id: 'cognac_leather_walnut',
      label: 'Cuero Coñac, Nogal & Pizarra',
      badge: 'Club Británico',
      desc: 'Cuero caramelo envejecido, panelados de nogal tostado y texturas de pizarra gris.',
      colors: ['#D8C3A5', '#A0522D', '#4A2E1B', '#706E6B'],
      promptKeyword: 'rich cognac caramel leather armchairs, dark smoked walnut cabinetry, slate grey stone textures, warm masculine clubroom sophistication'
    },
    {
      id: 'coastal_turquoise_coral',
      label: 'Turquesa Balear, Coral & Blanco',
      badge: 'Costero Fresco',
      desc: 'Aguamarina turquesa brillante y toques de coral terracota sobre fondo blanco puro.',
      colors: ['#FFFFFF', '#E3CAA5', '#E07A5F', '#2A7F8E'],
      promptKeyword: 'vibrant Mediterranean turquoise and sea glass accents, warm sunset coral and terracotta details, luminous pure whitewashed walls, sun-drenched coastal villa'
    }
  ];
// 1.3 Estilo Decorativo General
export const INTERIOR_STYLES: {
  id: InteriorStyle;
  label: string;
  badge: string;
  desc: string;
  palette: string[];
  promptKeyword: string;
}[] = [
    {
      id: 'nordic_scandi',
      label: 'Nórdico Escandinavo',
      badge: 'Maderas Claras & Lino',
      desc: 'Maderas de abedul o roble claro, tonos blancos rotos, textiles de lino beige y luminosidad limpia.',
      palette: ['#F7F6F2', '#E2DCD5', '#B8A495', '#4A5B4E'],
      promptKeyword: 'Scandinavian minimalist interior design, light blonde wood, light oak furniture, linen fabrics, off-white walls, serene soft daylight'
    },
    {
      id: 'contemporary_minimal',
      label: 'Contemporáneo Minimal',
      badge: 'Líneas Puras',
      desc: 'Líneas puras, sofás modulares de perfil bajo, iluminación indirecta integrada y sobriedad elegante.',
      palette: ['#EDEDED', '#C2C2C2', '#5A5A5A', '#222222'],
      promptKeyword: 'contemporary luxury minimalist interior architecture, low-slung Italian designer sofa, hidden recessed LED cove lighting, warm light grey plaster'
    },
    {
      id: 'mediterranean_warm',
      label: 'Mediterráneo Cálido',
      badge: 'Terracota & Cal',
      desc: 'Paredes encaladas, fibras naturales de yute, carpintería cálida y luz soleada.',
      palette: ['#FFFDF9', '#E8D8C8', '#C87D55', '#7F8B68'],
      promptKeyword: 'Mediterranean contemporary home design, whitewashed textured walls, natural terracotta accents, jute rugs, bright balmy sun'
    },
    {
      id: 'japandi_zen',
      label: 'Japandi Zen',
      badge: 'Wabi-Sabi & Noguchi',
      desc: 'Fusión japonesa y nórdica, listones de madera, lámparas de papel y armonía limpia.',
      palette: ['#ECE8DE', '#C7B9A5', '#786655', '#2C2B29'],
      promptKeyword: 'Japandi aesthetic, wabi-sabi balance, vertical oak wood slats, low platform beds, paper pendant lights, earth tones'
    },
    {
      id: 'luxury_hotel',
      label: 'Alta Gama & Hotel Boutique',
      badge: 'Mármoles & Bronce',
      desc: 'Suelos de mármol calacatta, latón cepillado y atmósfera de gran lujo.',
      palette: ['#F9F9FB', '#DDD7CD', '#98836E', '#1C272C'],
      promptKeyword: 'ultra-luxury boutique residential suite, Calacatta marble slab countertops, brushed brass fixtures, architectural lighting'
    },
    {
      id: 'industrial_loft',
      label: 'Loft Industrial Elegante',
      badge: 'Hormigón & Acero',
      desc: 'Microcemento pulido, perfilería de acero negro mate, cuero y ladrillo visto suave.',
      palette: ['#D6D6D6', '#8F9094', '#4E5054', '#8C5835'],
      promptKeyword: 'sophisticated urban industrial loft, polished concrete flooring, slim black steel glass partitions, warm leather armchairs'
    }
  ];
// 1.4 Iluminación y Sol
export const LIGHTING_PRESETS = [
  { id: 'daylight_warm', label: 'Luz Diurna Natural (11:00h)', icon: 'wb_sunny', desc: 'Sombras nítidas de 30° proyectadas por los tabiques.' },
  { id: 'ambient_studio', label: 'Estudio Arquitectónico Neutro', icon: 'wb_incandescent', desc: 'Difusión de luz homogénea tipo render de catálogo.' },
  { id: 'golden_hour', label: 'Atardecer Dorado (18:30h)', icon: 'flare', desc: 'Tonos miel cálidos y largos haces de luz en terrazas.' },
  { id: 'night_architectural', label: 'Nocturna con Focos Integrados', icon: 'bedtime', desc: 'Iluminación cálida encendida dentro de cada estancia.' }
];
// 2.1 Pavimento: Salón & Habitaciones
export const FLOORING_LIVING_OPTIONS: { id: FlooringType; label: string; desc: string }[] = [
  { id: 'light_oak_wood', label: 'Tarima Roble Claro Natural', desc: 'Lamas anchas de madera clara continua.' },
  { id: 'herringbone_parquet', label: 'Parquet Espiga Francés', desc: 'Elegancia clásica refinada en espiga.' },
  { id: 'porcelain_gres_tile', label: 'Gres Porcelánico Gran Formato', desc: 'Baldosas rectificadas contemporáneas tono arena.' },
  { id: 'warm_microcement', label: 'Microcemento Continuo Cálido', desc: 'Acabado contemporáneo continuo sin juntas.' },
  { id: 'travertine_marble', label: 'Mármol Travertino / Piedra Caliza', desc: 'Piedra mineral clara de tacto suave.' },
  { id: 'polished_concrete', label: 'Hormigón Pulido Satinado', desc: 'Estética moderna sobria y reflectante.' }
];
// 2.2 Pavimento: Cocina
export const KITCHEN_FLOORING_OPTIONS: { id: KitchenFlooringType; label: string; desc: string; isGres?: boolean }[] = [
  { id: 'gres_porcelanico_cocina', label: 'Gres Cerámico / Porcelánico', desc: 'Pavimento de gres con juntas finas rectificadas y color seleccionable.', isGres: true },
  { id: 'porcelain_gres_kitchen', label: 'Porcelánico Técnico Arena / Antideslizante', desc: 'Gran formato 120x60cm resistente y luminoso.' },
  { id: 'continuous_microcement', label: 'Microcemento Continuo Impermeable', desc: 'Suelo continuo integrado sin juntas con el mobiliario.' },
  { id: 'matching_living_oak', label: 'Mismo Roble que el Salón (Continuo)', desc: 'Continuidad visual total entre salón y cocina abierta.' },
  { id: 'white_marble_slab', label: 'Mármol Blanco Calacatta Pulido', desc: 'Baldosas nobles con sutiles vetas grises.' },
  { id: 'anthracite_slate_kitchen', label: 'Pizarra Grafito / Antracita Mate', desc: 'Contraste moderno con muebles blancos o de madera.' }
];
// 2.2 Colores disponibles para GRES en Cocina
export const KITCHEN_GRES_COLORS: {
  id: KitchenGresColor;
  label: string;
  desc: string;
  previewColor: string;
  promptKeyword: string;
}[] = [
    {
      id: 'gres_blanco_nieve',
      label: 'Blanco Nieve / Satinado',
      desc: 'Gres blanco luminoso y limpio con juntas rectificadas finas.',
      previewColor: '#FFFFFF',
      promptKeyword: 'pure snowy white rectified ceramic gres tile flooring in kitchen, minimal joints, bright reflective finish'
    },
    {
      id: 'gres_arena_marfil',
      label: 'Arena Cálida / Crema Marfil',
      desc: 'Tono arena cálido natural, aporta calidez y luminosidad.',
      previewColor: '#E8DCC4',
      promptKeyword: 'warm ivory cream sand gres ceramic tile floor in kitchen, warm Mediterranean light undertones'
    },
    {
      id: 'gres_greige_calido',
      label: 'Greige Seda Contemporáneo',
      desc: 'Equilibrio elegante entre beige y gris neutro suave.',
      previewColor: '#CEC6B9',
      promptKeyword: 'contemporary warm greige silk-finish porcelain gres tiles in kitchen floor'
    },
    {
      id: 'gres_gris_perla',
      label: 'Gris Perla / Cemento Claro',
      desc: 'Gris neutro arquitectónico atemporal de fácil limpieza.',
      previewColor: '#C5C9CD',
      promptKeyword: 'light pearl grey modern architectural gres tile flooring in kitchen'
    },
    {
      id: 'gres_cemento_antracita',
      label: 'Antracita Grafito / Carbón',
      desc: 'Gres oscuro moderno para crear contraste con muebles claros.',
      previewColor: '#323438',
      promptKeyword: 'deep charcoal anthracite graphite matte gres tile floor in kitchen, sleek contrast'
    },
    {
      id: 'gres_terracota_suave',
      label: 'Terracota / Barro Tostado',
      desc: 'Gres cerámico estilo tejar contemporáneo mediterráneo.',
      previewColor: '#C46D4B',
      promptKeyword: 'warm toasted terracotta ceramic gres floor tiles in kitchen, artisanal Mediterranean look'
    }
  ];
// 2.2 Encimera de Cocina: Material y Color
export const KITCHEN_COUNTERTOP_OPTIONS: {
  id: KitchenCountertopType;
  label: string;
  material: string;
  desc: string;
  colorPreview: string;
  promptKeyword: string;
}[] = [
    {
      id: 'quartz_calacatta_white',
      label: 'Cuarzo / Silestone Blanco Calacatta',
      material: 'Cuarzo Compacto',
      desc: 'Blanco luminoso con sutiles vetas grises suaves, estilo limpio contemporáneo.',
      colorPreview: '#F5F5F0',
      promptKeyword: 'luxurious white Calacatta quartz kitchen countertop with subtle soft grey veining, clean polished straight edges'
    },
    {
      id: 'granite_black_zimbabwe',
      label: 'Granito Negro Zimbabue / Ébano',
      material: 'Granito Natural Mate',
      desc: 'Negro profundo satinado antihuellas, contraste arquitectónico elegante.',
      colorPreview: '#1E1E22',
      promptKeyword: 'honed deep black Zimbabwe granite kitchen countertop work surfaces with crisp squared edges'
    },
    {
      id: 'ceramic_cement_grey',
      label: 'Porcelánico Dekton Gris Cemento',
      material: 'Superficie Ultracompacta Dekton',
      desc: 'Gris neutro mate suave, estética minimalista y moderna.',
      colorPreview: '#8E8E93',
      promptKeyword: 'seamless matte cement grey Dekton ultra-compact porcelain kitchen countertop, minimalist architectural look'
    },
    {
      id: 'marble_white_carrara',
      label: 'Mármol Blanco Carrara Pulido',
      material: 'Piedra Natural Mármol',
      desc: 'Fondo blanco perlado con veteado plumoso clásico y luminoso.',
      colorPreview: '#ECECEE',
      promptKeyword: 'polished authentic white Carrara marble kitchen countertop with gentle grey feathery veins'
    },
    {
      id: 'porcelain_warm_sand',
      label: 'Porcelánico Arena Cálida / Travertino',
      material: 'Gres Porcelánico Gran Formato',
      desc: 'Tonalidad cálida y acogedora en crema travertino mate suave.',
      colorPreview: '#E5D8C5',
      promptKeyword: 'warm ivory sand travertine porcelain kitchen countertop, velvety matte surface and subtle mineral texture'
    },
    {
      id: 'wood_solid_oak',
      label: 'Roble Macizo Alistonado Tratado',
      material: 'Madera Natural Tratada',
      desc: 'Madera de roble natural barnizado hidrófugo, calidez nórdica y artesanal.',
      colorPreview: '#C49A6C',
      promptKeyword: 'solid natural oiled oak butcher-block timber kitchen countertop with warm wood grain'
    },
    {
      id: 'stainless_steel_satin',
      label: 'Acero Inoxidable Satinado Chef',
      material: 'Acero Inox Quirúrgico',
      desc: 'Acabado metálico continuo higiénico para cocinas estilo chef profesional.',
      colorPreview: '#B0B0B5',
      promptKeyword: 'seamless brushed satin stainless steel chef kitchen countertop with integrated sleek worktop'
    },
    {
      id: 'quartz_black_marquina',
      label: 'Negro Marquina con Veta Blanca',
      material: 'Cuarzo / Dekton Laurent',
      desc: 'Fondo negro azabache con espectaculares vetas blancas cruzadas de alta gama.',
      colorPreview: '#252528',
      promptKeyword: 'dramatic black Marquina quartz countertop with bold white lightning veins and polished finish'
    }
  ];
// Paleta de colores predeterminados para los puntos identificadores de estancias
export const MARKER_COLOR_PRESETS: { label: string; hex: string }[] = [
  { label: 'Azul Marino Clásico', hex: '#0F2C59' },
  { label: 'Negro Arquitectónico', hex: '#18181B' },
  { label: 'Teja Terracota', hex: '#C25E38' },
  { label: 'Verde Salvia Botánico', hex: '#2D5A43' },
  { label: 'Borgoña Vino', hex: '#722F37' },
  { label: 'Grafito Antracita', hex: '#3F3F46' },
  { label: 'Azul Cobalto', hex: '#1D4ED8' },
  { label: 'Dorado Mostaza', hex: '#B45309' },
  { label: 'Púrpura Ciruela', hex: '#6B21A8' }
];
// 2.3 Baños: Solo gres de 60x60cm (Elegir tonalidad)
export const BATHROOM_GRES_60X60_TONES: {
  id: BathroomFlooring60x60Tone;
  label: string;
  desc: string;
  previewColor: string;
  promptKeyword: string;
}[] = [
    {
      id: 'gres_60_blanco_puro',
      label: 'Gres 60x60cm Blanco Nieve Satinado',
      desc: 'Baldosa cuadrada de 60x60 cm en blanco impoluto mate/satinado.',
      previewColor: '#FFFFFF',
      promptKeyword: 'square 60x60cm rectified white porcelain gres floor tiles with minimal thin grout joints in bathroom'
    },
    {
      id: 'gres_60_arena_marfil',
      label: 'Gres 60x60cm Arena / Crema Marfil',
      desc: 'Baldosa 60x60 cm tono cálido arena suave, aporta calidez y luz.',
      previewColor: '#E6DCB8',
      promptKeyword: 'square 60x60cm warm ivory sand gres floor tiles in bathroom, rectified joints'
    },
    {
      id: 'gres_60_gris_perla',
      label: 'Gres 60x60cm Gris Perla / Cemento Claro',
      desc: 'Baldosa 60x60 cm gris arquitectónico neutro suave.',
      previewColor: '#C4C8CC',
      promptKeyword: 'square 60x60cm light pearl grey porcelain gres floor tiles in bathroom'
    },
    {
      id: 'gres_60_greige_calido',
      label: 'Gres 60x60cm Greige Cálido Seda',
      desc: 'Fusión perfecta entre beige y gris en pieza cuadrada de 60x60 cm.',
      previewColor: '#CCC5B9',
      promptKeyword: 'square 60x60cm warm greige porcelain floor tiles in bathroom with subtle texture'
    },
    {
      id: 'gres_60_beige_travertino',
      label: 'Gres 60x60cm Piedra Travertino Beige',
      desc: 'Textura mineral ligera en gres rectificado de 60x60 cm.',
      previewColor: '#D8CAB8',
      promptKeyword: 'square 60x60cm beige travertine-effect gres ceramic tiles in bathroom'
    },
    {
      id: 'gres_60_antracita_grafito',
      label: 'Gres 60x60cm Antracita Grafito Mate',
      desc: 'Gres 60x60 cm oscuro elegante para alto contraste.',
      previewColor: '#2B2D2F',
      promptKeyword: 'square 60x60cm dark matte anthracite charcoal gres tiles in bathroom'
    }
  ];
// 2.4 Pavimento: Terraza
export const TERRACE_FLOORING_OPTIONS: {
  id: TerraceFlooringType;
  label: string;
  desc: string;
  previewColor: string;
  promptKeyword: string;
}[] = [
    {
      id: 'teak_deck_wood',
      label: 'Tarima de Madera Ipe / Teka Exterior',
      desc: 'Lamas continuas de madera tecnológica para exterior.',
      previewColor: '#8B5A2B',
      promptKeyword: 'slatted warm teak wood outdoor decking terrace flooring'
    },
    {
      id: 'grey_outdoor_porcelain',
      label: 'Gres Porcelánico Gris Antideslizante',
      desc: 'Placas rectificadas tono gris cemento exterior.',
      previewColor: '#9CA3AF',
      promptKeyword: 'large-format non-slip matte grey architectural porcelain tile terrace floor'
    },
    {
      id: 'rustic_terracotta_tiles',
      label: 'Baldosa de Barro / Terracota Rústica',
      desc: 'Tono tejar tostado mediterráneo con sensación acogedora.',
      previewColor: '#C25E38',
      promptKeyword: 'warm reddish-orange terracotta clay tiles on exterior terrace'
    },
    {
      id: 'artificial_grass_turf',
      label: 'Césped Artificial + Remate de Piedra',
      desc: 'Superficie verde esponjosa con remate perimetral.',
      previewColor: '#2E7D32',
      promptKeyword: 'lush green artificial turf lawn with stone border on terrace'
    },
    {
      id: 'light_sandstone_slabs',
      label: 'Arenisca Blanca / Travertino Exterior',
      desc: 'Piedra clara natural antideslizante que refleja el sol.',
      previewColor: '#E5DCC5',
      promptKeyword: 'light beige natural sandstone pavers on exterior terrace floor'
    },
    {
      id: 'white_washed_cobble',
      label: 'Microcemento Exterior Blanco / Crema',
      desc: 'Suelo continuo claro de inspiración ibicenca.',
      previewColor: '#F5F5F0',
      promptKeyword: 'whitewashed smooth lime plaster microcement floor on balcony terrace'
    }
  ];
// Ventanas: Tipo de Ventanas
export const WINDOW_TYPE_OPTIONS: {
  id: WindowFrameType;
  label: string;
  desc: string;
  icon: string;
  promptKeyword: string;
}[] = [
    {
      id: 'oscilobatiente',
      label: 'Abatible / Oscilobatiente Tradicional',
      desc: 'Hojas practicables con perfilería perimetral estanca y manilla ergonómica.',
      icon: 'window',
      promptKeyword: 'tilt-and-turn casement windows with clean frame lines'
    },
    {
      id: 'corredera_minimal',
      label: 'Corredera Perfil Oculto / Minimalista',
      desc: 'Grandes hojas acristaladas de suelo a techo con perfil incrustado en suelo.',
      icon: 'view_column',
      promptKeyword: 'minimalist slim-frame sliding glass patio doors and floor-to-ceiling windows'
    },
    {
      id: 'fijo_panoramico',
      label: 'Fijo Panorámico de Gran Cristal',
      desc: 'Vidrio continuo sin divisiones intermedias para máxima luminosidad.',
      icon: 'crop_landscape',
      promptKeyword: 'panoramic fixed frameless floor-to-ceiling glass picture windows'
    },
    {
      id: 'balconera_abatible',
      label: 'Balconera Abatible Doble Hoja',
      desc: 'Puertas acristaladas de acceso a terraza con travesaño superior.',
      icon: 'door_front',
      promptKeyword: 'double-leaf glass French balcony doors leading to outdoor areas'
    }
  ];
// Ventanas: Material y Color de Ventanas
export const WINDOW_FRAME_OPTIONS: {
  id: WindowFrameFinish;
  label: string;
  material: string;
  colorName: string;
  desc: string;
  colorPreview: string;
  promptKeyword: string;
}[] = [
    {
      id: 'black_anthracite_metal',
      label: 'Aluminio Texturado — Negro Antracita',
      material: 'Aluminio Lacado RPT',
      colorName: 'Negro Antracita Mate (RAL 7016)',
      desc: 'Perfilería delgada de corte contemporáneo oscuro estilo industrial fino.',
      colorPreview: '#18181B',
      promptKeyword: 'slim minimalist black anthracite powder-coated aluminum window frames'
    },
    {
      id: 'white_pvc_aluminum',
      label: 'PVC / Aluminio — Blanco Satinado',
      material: 'PVC / Aluminio Multicámara',
      colorName: 'Blanco Puro Satinado (RAL 9016)',
      desc: 'Perfiles blancos clásicos y luminosos integrados con las paredes.',
      colorPreview: '#F4F4F5',
      promptKeyword: 'clean pure white satin PVC and aluminum window casings and profiles'
    },
    {
      id: 'natural_timber_wood',
      label: 'Madera Maciza Barnizada — Roble Natural',
      material: 'Madera de Roble / Iroko',
      colorName: 'Roble Claro Barnizado',
      desc: 'Madera cálida artesanal con veta visible para huecos de fachada y balconeras.',
      colorPreview: '#B38B59',
      promptKeyword: 'warm natural varnished timber oak wooden window framing'
    },
    {
      id: 'cortan_bronze',
      label: 'Metal Anodizado — Bronce Corten',
      material: 'Aluminio Anodizado',
      colorName: 'Bronce Oscuro / Corten',
      desc: 'Tono bronce oscuro metalizado, aspecto arquitectónico de alta gama.',
      colorPreview: '#6E533F',
      promptKeyword: 'architectural anodized bronze metal window frames, warm metallic exterior profiles'
    },
    {
      id: 'anodized_silver',
      label: 'Aluminio Plata Cepillado — Metal Natural',
      material: 'Aluminio Mecanizado',
      colorName: 'Plata Satinado / Gris Inox',
      desc: 'Acabado metálico plateado mate limpio de estilo contemporáneo.',
      colorPreview: '#A1A1AA',
      promptKeyword: 'natural silver anodized brushed aluminum window casings'
    }
  ];
// Puertas: Material y Color de Puertas
export const DOOR_FINISH_OPTIONS: {
  id: DoorFinish;
  label: string;
  material: string;
  colorName: string;
  desc: string;
  colorPreview: string;
  promptKeyword: string;
}[] = [
    {
      id: 'white_lacquer',
      label: 'Lacado Blanco Satinado',
      material: 'Madera lacada lisa',
      colorName: 'Blanco Nieve Satinado',
      desc: 'Puertas de paso y armarios empotrados a juego, lisos con manivela oculta.',
      colorPreview: '#F9FAFB',
      promptKeyword: 'smooth satin white lacquered interior doors with matching flush fitted wardrobe doors'
    },
    {
      id: 'natural_oak',
      label: 'Roble Natural Veta Vertical',
      material: 'Chapa de roble noble',
      colorName: 'Roble Pálido Cálido',
      desc: 'Chapa de madera con veta vertical para puertas de paso y frentes de armario.',
      colorPreview: '#CDB18B',
      promptKeyword: 'natural warm oak timber interior doors and matching vertical grain fitted closet doors'
    },
    {
      id: 'dark_walnut',
      label: 'Nogal Tostado Oscuro',
      material: 'Madera de nogal macizo',
      colorName: 'Nogal Café Profundo',
      desc: 'Tono madera tostado sofisticado para puertas macizas de diseño contemporáneo.',
      colorPreview: '#523E2E',
      promptKeyword: 'rich dark walnut wood interior doors and luxury wardrobe front cabinetry'
    },
    {
      id: 'cashmere_sand',
      label: 'Gris Cashmere / Arena Cálido',
      material: 'Laca seda antihuellas',
      colorName: 'Greige Cashmere Suave',
      desc: 'Tono greige suave satinado, tendencia en interiorismo contemporáneo.',
      colorPreview: '#C9BEB2',
      promptKeyword: 'warm cashmere greige painted interior doors and soft sand tone built-in wardrobes'
    },
    {
      id: 'matte_black',
      label: 'Negro Mate Arquitectónico',
      material: 'Madera teñida / metal negro',
      colorName: 'Negro Carbón Profundo',
      desc: 'Puertas y frentes de armario en negro profundo mate con herrajes integrados.',
      colorPreview: '#1E1E1E',
      promptKeyword: 'architectural matte black interior doors and minimalist matte black closet wardrobes'
    },
    {
      id: 'anthracite_grey',
      label: 'Gris Antracita Seda',
      material: 'Laca grafito mate',
      colorName: 'Antracita Pizarra',
      desc: 'Contraste sobrio con tonos grises grafito mate y manivelas discretas.',
      colorPreview: '#43464B',
      promptKeyword: 'dark anthracite slate grey interior doors and matte graphite fitted closet wardrobes'
    }
  ];
// Muros exteriores e interiores: Colores
export const WALL_COLOR_OPTIONS: {
  id: WallColorType;
  label: string;
  desc: string;
  hex: string;
  promptKeyword: string;
}[] = [
    {
      id: 'blanco_roto_luz',
      label: 'Blanco Roto / Lino Suave',
      desc: 'Blanco ligeramente cálido, refleja la luz sin destellos fríos.',
      hex: '#F9F8F5',
      promptKeyword: 'luminous soft off-white plaster walls with warm undertones'
    },
    {
      id: 'blanco_puro',
      label: 'Blanco Puro Mate Arquitectónico',
      desc: 'Luminosidad máxima limpia e higiénica.',
      hex: '#FFFFFF',
      promptKeyword: 'pure matte white painted walls, crisp clean edges'
    },
    {
      id: 'greige_suave',
      label: 'Greige Suave Seda',
      desc: 'Equilibrio perfecto entre gris y beige, muy acogedor.',
      hex: '#E5E0D8',
      promptKeyword: 'soft light greige textured plaster walls, sophisticated interior'
    },
    {
      id: 'arena_calida',
      label: 'Arena Cálida / Cal Natural',
      desc: 'Inspiración mediterránea con textura sedosa de estuco.',
      hex: '#EADFC9',
      promptKeyword: 'warm sand lime-washed walls, natural mineral warmth'
    },
    {
      id: 'gris_niebla',
      label: 'Gris Niebla Arquitectónico',
      desc: 'Gris muy claro contemporáneo para estilos modernos.',
      hex: '#D9DCDD',
      promptKeyword: 'pale mist grey architectural plaster wall finish'
    },
    {
      id: 'verde_salvia_tenue',
      label: 'Salvia Tenue Empolvado',
      desc: 'Toque biofílico muy sutil y relajante.',
      hex: '#D7DFD5',
      promptKeyword: 'whisper-soft pale sage green tinted wall finish'
    }
  ];
// Presets arquitectónicos predeterminados
export const DEFAULT_PRESETS: PresetConfig[] = [
  {
    id: 'preset_comercial_2d_neutro',
    name: 'Plano 2D Comercial Neutro Limpio',
    createdAt: 0,
    isDefault: true,
    config: {
      cameraAngle: 'plan_2d_furnished',
      isometricOrientation: 'south_west',
      isometricRotationAngle: 0,
      colorPalette: 'neutral_balanced',
      interiorStyle: 'contemporary_minimal',
      lighting: 'ambient_studio',
      aspectRatio: '16:9',
      flooringLiving: 'light_oak_wood',
      flooringKitchen: 'matching_living_oak',
      kitchenGresColor: 'gres_gris_perla',
      kitchenCountertop: 'quartz_calacatta_white',
      flooringBathroomGres60: 'gres_60_gris_perla',
      flooringTerrace: 'grey_outdoor_porcelain',
      windowType: 'oscilobatiente',
      windowFrames: 'black_anthracite_metal',
      doorFinish: 'white_lacquer',
      interiorWallColor: 'blanco_roto_luz',
      exteriorWallColor: 'gris_niebla',
      roomMarkers: [],
      markerBadgeColor: '#0F2C59',
      promotionLogo: DEFAULT_PROMOTION_LOGO,
      promotorLogo: DEFAULT_PROMUEVE_LOGO,
      commercialAgencyLogo: DEFAULT_AGENCY_LOGO,
      agencyPhone: '983 34 21 32',
      unitIdentifier: 'PORTAL 1 - 1º A',
      extraDetails: '',
      strictBlueprintFidelity: true,
      renderEngine: 'auto'
    }
  },
  {
    id: 'preset_nordic_standard',
    name: 'Estándar Nórdico (Roble & Blanco)',
    createdAt: 1,
    isDefault: true,
    config: {
      cameraAngle: 'isometric_45',
      isometricOrientation: 'south_west',
      isometricRotationAngle: 0,
      colorPalette: 'light_soft_pastel',
      interiorStyle: 'nordic_scandi',
      lighting: 'daylight_warm',
      aspectRatio: '16:9',
      flooringLiving: 'light_oak_wood',
      flooringKitchen: 'gres_porcelanico_cocina',
      kitchenGresColor: 'gres_blanco_nieve',
      kitchenCountertop: 'wood_solid_oak',
      flooringBathroomGres60: 'gres_60_blanco_puro',
      flooringTerrace: 'teak_deck_wood',
      windowType: 'oscilobatiente',
      windowFrames: 'black_anthracite_metal',
      doorFinish: 'white_lacquer',
      interiorWallColor: 'blanco_roto_luz',
      exteriorWallColor: 'blanco_puro',
      roomMarkers: [],
      markerBadgeColor: '#0F2C59',
      promotionLogo: DEFAULT_PROMOTION_LOGO,
      promotorLogo: DEFAULT_PROMUEVE_LOGO,
      commercialAgencyLogo: DEFAULT_AGENCY_LOGO,
      agencyPhone: '983 34 21 32',
      extraDetails: '',
      strictBlueprintFidelity: true
    }
  },
  {
    id: 'preset_mediterranean_warm',
    name: 'Mediterráneo Cálido (Arena & Cal)',
    createdAt: 2,
    isDefault: true,
    config: {
      cameraAngle: 'isometric_45',
      isometricOrientation: 'south_west',
      isometricRotationAngle: 0,
      colorPalette: 'warm_sand_cream',
      interiorStyle: 'mediterranean_warm',
      lighting: 'golden_hour',
      aspectRatio: '16:9',
      flooringLiving: 'travertine_marble',
      flooringKitchen: 'gres_porcelanico_cocina',
      kitchenGresColor: 'gres_arena_marfil',
      kitchenCountertop: 'porcelain_warm_sand',
      flooringBathroomGres60: 'gres_60_beige_travertino',
      flooringTerrace: 'rustic_terracotta_tiles',
      windowType: 'corredera_minimal',
      windowFrames: 'natural_timber_wood',
      doorFinish: 'natural_oak',
      interiorWallColor: 'arena_calida',
      exteriorWallColor: 'blanco_puro',
      roomMarkers: [],
      markerBadgeColor: '#0F2C59',
      promotionLogo: DEFAULT_PROMOTION_LOGO,
      promotorLogo: DEFAULT_PROMUEVE_LOGO,
      commercialAgencyLogo: DEFAULT_AGENCY_LOGO,
      agencyPhone: '983 34 21 32',
      extraDetails: 'Vigas vistas y lino natural',
      strictBlueprintFidelity: true
    }
  },
  {
    id: 'preset_contemporary_minimal',
    name: 'Minimal Contemporáneo (Microcemento)',
    createdAt: 3,
    isDefault: true,
    config: {
      cameraAngle: 'cenital_90',
      isometricOrientation: 'south_west',
      isometricRotationAngle: 0,
      colorPalette: 'neutral_balanced',
      interiorStyle: 'contemporary_minimal',
      lighting: 'ambient_studio',
      aspectRatio: '16:9',
      flooringLiving: 'warm_microcement',
      flooringKitchen: 'continuous_microcement',
      kitchenGresColor: 'gres_greige_calido',
      kitchenCountertop: 'ceramic_cement_grey',
      flooringBathroomGres60: 'gres_60_greige_calido',
      flooringTerrace: 'grey_outdoor_porcelain',
      windowType: 'corredera_minimal',
      windowFrames: 'black_anthracite_metal',
      doorFinish: 'cashmere_sand',
      interiorWallColor: 'greige_suave',
      exteriorWallColor: 'gris_niebla',
      roomMarkers: [],
      markerBadgeColor: '#0F2C59',
      promotionLogo: DEFAULT_PROMOTION_LOGO,
      promotorLogo: DEFAULT_PROMUEVE_LOGO,
      commercialAgencyLogo: DEFAULT_AGENCY_LOGO,
      agencyPhone: '983 34 21 32',
      extraDetails: 'Líneas limpias y mobiliario bajo',
      strictBlueprintFidelity: true
    }
  },
  {
    id: 'preset_2d_commercial_catalog',
    name: 'Plano 2D Comercial de Catálogo',
    createdAt: 4,
    isDefault: true,
    config: {
      cameraAngle: 'plan_2d_furnished',
      isometricOrientation: 'south_west',
      isometricRotationAngle: 0,
      colorPalette: 'light_soft_pastel',
      interiorStyle: 'nordic_scandi',
      lighting: 'ambient_studio',
      aspectRatio: '16:9',
      flooringLiving: 'herringbone_parquet',
      flooringKitchen: 'gres_porcelanico_cocina',
      kitchenGresColor: 'gres_blanco_nieve',
      kitchenCountertop: 'quartz_calacatta_white',
      flooringBathroomGres60: 'gres_60_blanco_puro',
      flooringTerrace: 'grey_outdoor_porcelain',
      windowType: 'oscilobatiente',
      windowFrames: 'black_anthracite_metal',
      doorFinish: 'white_lacquer',
      interiorWallColor: 'blanco_puro',
      exteriorWallColor: 'gris_niebla',
      roomMarkers: [],
      markerBadgeColor: '#0F2C59',
      promotionLogo: DEFAULT_PROMOTION_LOGO,
      promotorLogo: DEFAULT_PROMUEVE_LOGO,
      commercialAgencyLogo: DEFAULT_AGENCY_LOGO,
      agencyPhone: '983 34 21 32',
      extraDetails: '',
      strictBlueprintFidelity: true
    }
  }
];
export const SAMPLE_PLANS = [
  {
    name: 'Piso 3 Dormitorios + Gran Terraza',
    desc: 'Distribución completa con dormitorio principal, 2 dormitorios dobles, 2 baños, salón abierto y terraza exterior amueblable.',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    type: 'Piso Familiar'
  },
  {
    name: 'Ático Dúplex con Terraza Solárium',
    desc: 'Gran espacio central diáfano, escalera lineal, 2 baños completos y terraza panorámica.',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    type: 'Ático'
  }
];