export type CameraAngle = 'isometric_45' | 'cenital_90' | 'plan_2d_furnished' | 'isometric_cutaway';
export type InteriorStyle =
  | 'nordic_scandi'
  | 'contemporary_minimal'
  | 'mediterranean_warm'
  | 'industrial_loft'
  | 'japandi_zen'
  | 'luxury_hotel';
export type ColorPaletteScheme =
  | 'light_soft_pastel'      // Colores claros y suaves (blancos rotos, crudos, greige sedoso, arenas y pasteles sutiles)
  | 'warm_sand_cream'        // Arena cálida, crema y marfil luminoso
  | 'soft_sage_light'        // Salvia suave, lino y blanco empolvado
  | 'soft_rose_linen'        // Palo de rosa empolvado, alabastro y lino
  | 'neutral_balanced'       // Neutro equilibrado arquitectónico
  | 'deep_contrasts';        // Contrastes oscuros
export type FlooringType =
  | 'light_oak_wood'
  | 'herringbone_parquet'
  | 'polished_concrete'
  | 'travertine_marble'
  | 'warm_microcement'
  | 'porcelain_gres_tile';
export type KitchenFlooringType =
  | 'gres_porcelanico_cocina'
  | 'porcelain_gres_kitchen'
  | 'continuous_microcement'
  | 'matching_living_oak'
  | 'white_marble_slab'
  | 'anthracite_slate_kitchen';
export type KitchenGresColor =
  | 'gres_blanco_nieve'
  | 'gres_arena_marfil'
  | 'gres_greige_calido'
  | 'gres_gris_perla'
  | 'gres_cemento_antracita'
  | 'gres_terracota_suave';
export type KitchenCountertopType =
  | 'quartz_calacatta_white'
  | 'granite_black_zimbabwe'
  | 'ceramic_cement_grey'
  | 'marble_white_carrara'
  | 'porcelain_warm_sand'
  | 'wood_solid_oak'
  | 'stainless_steel_satin'
  | 'quartz_black_marquina';
export type BathroomFlooring60x60Tone =
  | 'gres_60_blanco_puro'
  | 'gres_60_arena_marfil'
  | 'gres_60_gris_perla'
  | 'gres_60_antracita_grafito'
  | 'gres_60_beige_travertino'
  | 'gres_60_greige_calido';
export type TerraceFlooringType =
  | 'teak_deck_wood'
  | 'grey_outdoor_porcelain'
  | 'rustic_terracotta_tiles'
  | 'artificial_grass_turf'
  | 'light_sandstone_slabs'
  | 'white_washed_cobble';
export type WindowFrameType =
  | 'oscilobatiente'
  | 'corredera_minimal'
  | 'fijo_panoramico'
  | 'balconera_abatible';
export type WindowFrameFinish =
  | 'black_anthracite_metal'
  | 'white_pvc_aluminum'
  | 'natural_timber_wood'
  | 'cortan_bronze'
  | 'anodized_silver';
export type DoorFinish =
  | 'white_lacquer'
  | 'natural_oak'
  | 'dark_walnut'
  | 'matte_black'
  | 'cashmere_sand'
  | 'anthracite_grey';
export type WallColorType =
  | 'blanco_roto_luz'
  | 'blanco_puro'
  | 'greige_suave'
  | 'arena_calida'
  | 'gris_niebla'
  | 'verde_salvia_tenue';
export type RoomCategory =
  | 'salon_comedor'
  | 'cocina'
  | 'dormitorio_principal'
  | 'dormitorio_secundario'
  | 'bano_principal'
  | 'aseo_cortesia'
  | 'terraza_balcon'
  | 'lavadero_galeria'
  | 'despacho_estudio'
  | 'recibidor_distribuidor'
  | 'vestidor'
  | 'otro';
export interface RoomMarker {
  id: string;
  name: string;
  category: RoomCategory;
  /** Posición porcentual (0 a 100) en el plano */
  x: number;
  y: number;
  notes?: string;
  /** Superficie útil en metros cuadrados (m²) */
  areaSqMeters?: number;
}
export interface RenderConfig {
  // 1. General
  cameraAngle: CameraAngle;
  colorPalette: ColorPaletteScheme;
  interiorStyle: InteriorStyle;
  lighting: 'daylight_warm' | 'golden_hour' | 'ambient_studio' | 'night_architectural';
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:4';
  // 2. Pavimento de Vivienda
  flooringLiving: FlooringType;          // 2.1 Salón & Habitaciones
  flooringKitchen: KitchenFlooringType;  // 2.2 Cocina
  kitchenGresColor: KitchenGresColor;    // 2.2 Color para material de GRES en Cocina
  kitchenCountertop?: KitchenCountertopType; // 2.2 Encimera de Cocina (Material y Color)
  flooringBathroomGres60: BathroomFlooring60x60Tone; // 2.3 Baños (Solo gres 60x60cm) tonalidad
  flooringTerrace: TerraceFlooringType;  // 2.4 Terraza
  // 3. Ventanas
  windowType: WindowFrameType;
  windowFrames: WindowFrameFinish;
  // 4. Puertas
  doorFinish: DoorFinish;
  // 5. Muros exteriores e interiores
  interiorWallColor: WallColorType;
  exteriorWallColor: WallColorType;
  // 6. Identificador de Estancias (Corrección y precisión)
  roomMarkers: RoomMarker[];
  markerBadgeColor?: string;             // Color de fondo libre para los puntos identificadores (por defecto #0F2C59)
  promotionLogo?: string;                // Logo de la promoción para las fichas comerciales (base64 o URL)
  // Ajustes auxiliares
  extraDetails: string;
  strictBlueprintFidelity: boolean;
}
export interface PresetConfig {
  id: string;
  name: string;
  createdAt: number;
  config: RenderConfig;
  isDefault?: boolean;
}
export interface RenderHistoryItem {
  id: string;
  mediaId: string;
  base64: string;
  mimeType: string;
  prompt: string;
  config: RenderConfig;
  timestamp: number;
  versionNumber?: number;
  appliedInstruction?: string;
}