import React from 'react';
import {
  RenderConfig,
  FlooringType,
  KitchenFlooringType,
  KitchenGresColor,
  KitchenCountertopType,
  BathroomFlooring60x60Tone,
  TerraceFlooringType,
  WindowFrameType,
  WindowFrameFinish,
  DoorFinish,
  WallColorType
} from '../../types';

interface TabCalidadesProps {
  config: RenderConfig;
  onChangeConfig: React.Dispatch<React.SetStateAction<RenderConfig>>;
  onApplyChangesInstant: () => void;
}

export function TabCalidades({
  config,
  onChangeConfig,
  onApplyChangesInstant
}: TabCalidadesProps) {
  // Swatches visuales con texturas/colores CSS
  const salonFlooringSwatches: { id: FlooringType; label: string; bg: string }[] = [
    { id: 'light_oak_wood', label: 'Tarima roble claro', bg: '#dfc6a3' },
    { id: 'herringbone_parquet', label: 'Parquet en espiga', bg: '#c9a87d' },
    { id: 'porcelain_gres_tile', label: 'Gres porcelánico', bg: '#dcd8cf' },
    { id: 'travertine_marble', label: 'Mármol travertino', bg: '#e8e0d5' },
    { id: 'warm_microcement', label: 'Microcemento cálido', bg: '#c5c2bc' },
    { id: 'polished_concrete', label: 'Hormigón pulido', bg: '#b2b5b8' }
  ];

  const kitchenFlooringSwatches: { id: KitchenFlooringType; label: string; bg: string }[] = [
    { id: 'gres_porcelanico_cocina', label: 'Gres porcelánico', bg: '#e5e7eb' },
    { id: 'matching_living_oak', label: 'Continuo con salón', bg: '#dfc6a3' },
    { id: 'continuous_microcement', label: 'Microcemento', bg: '#c5c8cc' },
    { id: 'white_marble_slab', label: 'Mármol blanco', bg: '#f8fafc' },
    { id: 'anthracite_slate_kitchen', label: 'Pizarra antracita', bg: '#334155' }
  ];

  const kitchenGresColorSwatches: { id: KitchenGresColor; label: string; bg: string }[] = [
    { id: 'gres_blanco_nieve', label: 'Blanco nieve', bg: '#ffffff' },
    { id: 'gres_arena_marfil', label: 'Arena marfil', bg: '#f5ede3' },
    { id: 'gres_greige_calido', label: 'Greige cálido', bg: '#dccfbf' },
    { id: 'gres_gris_perla', label: 'Gris perla', bg: '#bec4cc' },
    { id: 'gres_cemento_antracita', label: 'Grafito', bg: '#374151' },
    { id: 'gres_terracota_suave', label: 'Terracota', bg: '#c2644b' }
  ];

  const bathroomTones: { id: BathroomFlooring60x60Tone; label: string; bg: string }[] = [
    { id: 'gres_60_blanco_puro', label: 'Blanco puro', bg: '#ffffff' },
    { id: 'gres_60_arena_marfil', label: 'Arena caliza', bg: '#e5d7c3' },
    { id: 'gres_60_gris_perla', label: 'Gris perla', bg: '#b9c1c9' },
    { id: 'gres_60_greige_calido', label: 'Greige cálido', bg: '#a3a9b0' },
    { id: 'gres_60_beige_travertino', label: 'Beige', bg: '#ded3c5' },
    { id: 'gres_60_antracita_grafito', label: 'Antracita', bg: '#2b3038' }
  ];

  const terraceFlooringSwatches: { id: TerraceFlooringType; label: string; bg: string }[] = [
    { id: 'teak_deck_wood', label: 'Madera técnica', bg: '#875128' },
    { id: 'grey_outdoor_porcelain', label: 'Porcelánico gris', bg: '#86919c' },
    { id: 'rustic_terracotta_tiles', label: 'Barro cocido', bg: '#b85434' },
    { id: 'artificial_grass_turf', label: 'Césped artificial', bg: '#3f7839' },
    { id: 'light_sandstone_slabs', label: 'Arenisca clara', bg: '#ebdccb' },
    { id: 'white_washed_cobble', label: 'Blanco lavado', bg: '#f1f5f9' }
  ];

  const countertopSwatches: { id: KitchenCountertopType; label: string; bg: string }[] = [
    { id: 'quartz_calacatta_white', label: 'Cuarzo Calacatta', bg: '#f8fafc' },
    { id: 'granite_black_zimbabwe', label: 'Granito negro', bg: '#18181b' },
    { id: 'ceramic_cement_grey', label: 'Cuarzo gris', bg: '#71717a' },
    { id: 'marble_white_carrara', label: 'Mármol Carrara', bg: '#ffffff' },
    { id: 'porcelain_warm_sand', label: 'Porcelánico arena', bg: '#edd9c7' },
    { id: 'wood_solid_oak', label: 'Roble macizo', bg: '#c29c6d' },
    { id: 'stainless_steel_satin', label: 'Acero inoxidable', bg: '#9ca3af' },
    { id: 'quartz_black_marquina', label: 'Pizarra negra', bg: '#27272a' }
  ];

  // Ventanas (Cards)
  const windowCards: { id: WindowFrameType; title: string; subtitle: string }[] = [
    { id: 'oscilobatiente', title: 'Oscilobatiente', subtitle: 'Hojas practicables' },
    { id: 'corredera_minimal', title: 'Corredera minimal', subtitle: 'Suelo a techo' },
    { id: 'fijo_panoramico', title: 'Fijo panorámico', subtitle: 'Sin divisiones' },
    { id: 'balconera_abatible', title: 'Balconera doble hoja', subtitle: 'Acceso a terraza' }
  ];

  const windowFrameColors: { id: WindowFrameFinish; label: string; bg: string }[] = [
    { id: 'black_anthracite_metal', label: 'Antracita RAL 7016', bg: '#2b303a' },
    { id: 'white_pvc_aluminum', label: 'Blanco RAL 9016', bg: '#ffffff' },
    { id: 'cortan_bronze', label: 'Bronce anodizado', bg: '#916a44' },
    { id: 'natural_timber_wood', label: 'Madera roble', bg: '#6e4933' },
    { id: 'anodized_silver', label: 'Aluminio plata', bg: '#a2a8b0' }
  ];

  const doorFinishes: { id: DoorFinish; label: string; bg: string }[] = [
    { id: 'white_lacquer', label: 'Lacado blanco', bg: '#ffffff' },
    { id: 'natural_oak', label: 'Roble claro', bg: '#c7a982' },
    { id: 'dark_walnut', label: 'Nogal americano', bg: '#5c4331' },
    { id: 'cashmere_sand', label: 'Gris arena', bg: '#c9beaf' },
    { id: 'matte_black', label: 'Negro mate', bg: '#1c1d1f' },
    { id: 'anthracite_grey', label: 'Grafito', bg: '#3a4047' }
  ];

  const interiorWallColors: { id: WallColorType; label: string; bg: string }[] = [
    { id: 'blanco_roto_luz', label: 'Blanco roto', bg: '#faf8f5' },
    { id: 'blanco_puro', label: 'Blanco puro', bg: '#ffffff' },
    { id: 'greige_suave', label: 'Gris cálido', bg: '#ebe5dc' },
    { id: 'arena_calida', label: 'Arena suave', bg: '#ded2c1' },
    { id: 'gris_niebla', label: 'Gris niebla', bg: '#d4d8dc' },
    { id: 'verde_salvia_tenue', label: 'Verde salvia', bg: '#d6dfd8' }
  ];

  const facadeColors: { id: WallColorType; label: string; bg: string }[] = [
    { id: 'gris_niebla', label: 'Gris niebla', bg: '#cbd5e1' },
    { id: 'blanco_roto_luz', label: 'Blanco cal', bg: '#f8fafc' },
    { id: 'arena_calida', label: 'Arena tostada', bg: '#e2d4c0' },
    { id: 'blanco_puro', label: 'Blanco puro', bg: '#f1ebd9' },
    { id: 'greige_suave', label: 'Piedra perla', bg: '#94a3b8' },
    { id: 'verde_salvia_tenue', label: 'Salvia suave', bg: '#cbd5cd' }
  ];

  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto max-h-full font-sans text-slate-800">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Calidades</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Memoria de calidades de la vivienda.
        </p>
      </div>

      {/* Banner de aviso / aplicar cambios */}
      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
        <p className="text-xs text-blue-900 leading-snug">
          Los cambios de estilo y calidades se aplican al instante, sin coste de IA.
        </p>
        <button
          onClick={onApplyChangesInstant}
          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition shrink-0 cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px]">sync</span>
          <span>Aplicar</span>
        </button>
      </div>

      {/* 1. SECCIÓN PAVIMENTOS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Pavimentos
        </h3>

        {/* Salón y dormitorios */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Salón y dormitorios</span>
            <span className="text-slate-400 text-[11px]">
              {salonFlooringSwatches.find((s) => s.id === config.flooringLiving)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {salonFlooringSwatches.map((sw) => {
              const isSelected = config.flooringLiving === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, flooringLiving: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>

        {/* Cocina */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Cocina</span>
            <span className="text-slate-400 text-[11px]">
              {kitchenFlooringSwatches.find((s) => s.id === config.flooringKitchen)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {kitchenFlooringSwatches.map((sw) => {
              const isSelected = config.flooringKitchen === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, flooringKitchen: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>

        {/* Tono del gres de cocina */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Tono del gres de cocina</span>
            <span className="text-slate-400 text-[11px]">
              {kitchenGresColorSwatches.find((s) => s.id === config.kitchenGresColor)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {kitchenGresColorSwatches.map((sw) => {
              const isSelected = config.kitchenGresColor === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, kitchenGresColor: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>

        {/* Baños - gres 60x60 */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Baños - gres 60×60</span>
            <span className="text-slate-400 text-[11px]">
              {bathroomTones.find((s) => s.id === config.flooringBathroomGres60)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {bathroomTones.map((sw) => {
              const isSelected = config.flooringBathroomGres60 === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, flooringBathroomGres60: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>

        {/* Terraza */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Terraza</span>
            <span className="text-slate-400 text-[11px]">
              {terraceFlooringSwatches.find((s) => s.id === config.flooringTerrace)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {terraceFlooringSwatches.map((sw) => {
              const isSelected = config.flooringTerrace === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, flooringTerrace: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN COCINA */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Cocina
        </h3>

        {/* Encimera */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Encimera</span>
            <span className="text-slate-400 text-[11px]">
              {countertopSwatches.find((s) => s.id === config.kitchenCountertop)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {countertopSwatches.map((sw) => {
              const isSelected = config.kitchenCountertop === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, kitchenCountertop: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN CARPINTERÍA */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Carpintería
        </h3>

        {/* Ventanas */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Ventanas</span>
            <span className="text-slate-400 text-[11px]">
              {windowCards.find((w) => w.id === config.windowType)?.title}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {windowCards.map((w) => {
              const isSelected = config.windowType === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, windowType: w.id }))}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{w.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{w.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Perfilería */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Perfilería</span>
            <span className="text-slate-400 text-[11px]">
              {windowFrameColors.find((c) => c.id === config.windowFrames)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {windowFrameColors.map((sw) => {
              const isSelected = config.windowFrames === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, windowFrames: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>

        {/* Puertas y armarios */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Puertas y armarios</span>
            <span className="text-slate-400 text-[11px]">
              {doorFinishes.find((c) => c.id === config.doorFinish)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {doorFinishes.map((sw) => {
              const isSelected = config.doorFinish === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, doorFinish: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. SECCIÓN PARAMENTOS */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Paramentos
        </h3>

        {/* Paredes interiores */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Paredes interiores</span>
            <span className="text-slate-400 text-[11px]">
              {interiorWallColors.find((c) => c.id === config.interiorWallColor)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {interiorWallColors.map((sw) => {
              const isSelected = config.interiorWallColor === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, interiorWallColor: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>

        {/* Fachada / muros perimetrales */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 font-semibold">Fachada / muros perimetrales</span>
            <span className="text-slate-400 text-[11px]">
              {facadeColors.find((c) => c.id === config.exteriorWallColor)?.label || 'Gris niebla'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {facadeColors.map((sw) => {
              const isSelected = config.exteriorWallColor === sw.id;
              return (
                <button
                  key={sw.id}
                  onClick={() => onChangeConfig((prev) => ({ ...prev, exteriorWallColor: sw.id }))}
                  style={{ backgroundColor: sw.bg }}
                  className={`w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-2xs relative ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  title={sw.label}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Reglas fijas de la casa */}
      <div className="pt-2 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 leading-relaxed italic">
          Reglas fijas de la casa: platos de ducha siempre blancos y encimeras de cocina despejadas (solo placa y fregadero).
        </p>
      </div>
    </div>
  );
}
