import { RenderConfig } from '../types';
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
  // CLÁUSULA CRÍTICA: IDENTIFICACIÓN EXPLÍCITA DE ESTANCIAS
  let roomsIdentificationClause = '';
  if (config.roomMarkers && config.roomMarkers.length > 0) {
    const roomDescriptions = config.roomMarkers.map((marker, idx) => {
      const cat = ROOM_CATEGORIES.find(c => c.id === marker.category);
      // Ubicación cardinal aproximada según X e Y (0-100)
      const hPos = marker.x < 35 ? 'left / west section' : marker.x > 65 ? 'right / east section' : 'central area';
      const vPos = marker.y < 35 ? 'upper / north part' : marker.y > 65 ? 'lower / south part' : 'middle area';
      const specificNotes = marker.notes ? ` with ${marker.notes}` : '';
      return `Room ${idx + 1} named "${marker.name}" located at ${hPos}, ${vPos}: strictly furnish and designate as a ${cat?.promptDesc || marker.name}${specificNotes}.`;
    }).join(' ');
    roomsIdentificationClause = `CRITICAL USER-SPECIFIED ROOM IDENTIFIERS & BOUNDARIES (OVERRIDE DEFAULT DETECTION): ${roomDescriptions} Ensure that each labelled area correctly corresponds to its assigned room purpose without swapping or misidentifying rooms.`;
  }
  const is2D = config.cameraAngle === 'plan_2d_furnished';
  if (is2D) {
    return [
      `Clean top-down 2D colored architectural floor plan rendered strictly from the reference blueprint layout.`,
      `Zero perspective distortion, completely flat 2D graphic catalog floor plan with furniture symbols placed in top view.`,
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
      config.extraDetails ? `Extra notes: ${config.extraDetails}.` : '',
      `Crisp architectural drawing lines, professional marketing presentation.`
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
    config.extraDetails ? `Client details: ${config.extraDetails}.` : '',
    `Unreal Engine 5 archviz render quality, crisp geometry, clean photorealistic textures.`
  ].filter(Boolean).join(' ');
}