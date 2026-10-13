import React, { useState } from 'react';
import { RenderConfig, PresetConfig, RoomMarker, RoomCategory } from '../types';
import { PresetManager } from './PresetManager';
import { RoomIdentifierPanel } from './RoomIdentifierPanel';
import {
  CAMERA_ANGLES,
  COLOR_PALETTE_SCHEMES,
  INTERIOR_STYLES,
  LIGHTING_PRESETS,
  FLOORING_LIVING_OPTIONS,
  KITCHEN_FLOORING_OPTIONS,
  KITCHEN_GRES_COLORS,
  BATHROOM_GRES_60X60_TONES,
  TERRACE_FLOORING_OPTIONS,
  WINDOW_TYPE_OPTIONS,
  WINDOW_FRAME_OPTIONS,
  DOOR_FINISH_OPTIONS,
  WALL_COLOR_OPTIONS
} from '../constants';
interface StyleSelectorProps {
  config: RenderConfig;
  onChangeConfig: (newConfig: RenderConfig) => void;
  presets: PresetConfig[];
  activePresetId: string | null;
  onApplyPreset: (preset: PresetConfig) => void;
  onSavePreset: (name: string, config: RenderConfig) => void;
  onDeletePreset: (id: string) => void;
  // Manejo de marcadores de estancias
  activeMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  isPinningMode: boolean;
  onTogglePinningMode: () => void;
  disabled?: boolean;
}
type MenuSection = 'general' | 'rooms' | 'flooring' | 'windows' | 'doors' | 'walls';
export function StyleSelector({
  config,
  onChangeConfig,
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  activeMarkerId,
  onSelectMarker,
  isPinningMode,
  onTogglePinningMode,
  disabled
}: StyleSelectorProps) {
  const [activeSection, setActiveSection] = useState<MenuSection>('general');
  const updateField = <K extends keyof RenderConfig>(field: K, value: RenderConfig[K]) => {
    onChangeConfig({
      ...config,
      [field]: value
    });
  };
  // Manejo de Estancias
  const handleAddMarker = (category: RoomCategory, name?: string) => {
    const newMarker: RoomMarker = {
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name || 'Nueva Estancia',
      category,
      x: 50,
      y: 50,
      notes: ''
    };
    const updated = [...(config.roomMarkers || []), newMarker];
    updateField('roomMarkers', updated);
    onSelectMarker(newMarker.id);
  };
  const handleUpdateMarker = (id: string, updates: Partial<RoomMarker>) => {
    const updated = (config.roomMarkers || []).map(m => m.id === id ? { ...m, ...updates } : m);
    updateField('roomMarkers', updated);
  };
  const handleDeleteMarker = (id: string) => {
    const updated = (config.roomMarkers || []).filter(m => m.id !== id);
    updateField('roomMarkers', updated);
    if (activeMarkerId === id) {
      onSelectMarker(null);
    }
  };
  const handleClearMarkers = () => {
    updateField('roomMarkers', []);
    onSelectMarker(null);
  };
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
  const markersCount = (config.roomMarkers || []).length;
  const menuSections: { id: MenuSection; label: string; icon: string; count?: string; highlight?: boolean }[] = [
    { id: 'general', label: 'General', icon: 'tune', count: '1.1 - 1.5' },
    {
      id: 'rooms',
      label: 'Identificar Estancias',
      icon: 'pin_drop',
      count: markersCount > 0 ? `${markersCount}` : undefined,
      highlight: markersCount > 0
    },
    { id: 'flooring', label: 'Pavimento', icon: 'view_quilt', count: '2.1 - 2.4' },
    { id: 'windows', label: 'Ventanas', icon: 'window' },
    { id: 'doors', label: 'Puertas', icon: 'door_front' },
    { id: 'walls', label: 'Muros', icon: 'format_paint' }
  ];
  return (
    <div className="space-y-4">
      {/* 0. Gestor de Configuraciones Guardadas / Presets */}
      <PresetManager
        currentConfig={config}
        presets={presets}
        activePresetId={activePresetId}
        onApplyPreset={onApplyPreset}
        onSavePreset={onSavePreset}
        onDeletePreset={onDeletePreset}
        disabled={disabled}
      />
      {/* Banner de Fidelidad Estricta al Plano */}
      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[15px]">verified_user</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-950 flex items-center gap-1">
              Fidelidad Estricta al Plano
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-200/70 text-emerald-800 rounded font-semibold">
                ACTIVA
              </span>
            </p>
            <p className="text-[10px] text-emerald-700 truncate">
              Mantiene tabiques 1:1, número exacto de estancias y no inventa terrazas ni habitaciones.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => updateField('strictBlueprintFidelity', !config.strictBlueprintFidelity)}
          className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${config.strictBlueprintFidelity
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-stone-300 text-stone-600'
            }`}
          title="Fuerza al modelo a ceñirse exclusivamente a los tabiques y estancias dibujados"
        >
          {config.strictBlueprintFidelity ? '100% Calco' : 'Flexible'}
        </button>
      </div>
      {/* Menú Principal de Navegación por Secciones Solicitadas */}
      <div className="p-1 bg-stone-100 rounded-xl overflow-x-auto">
        <div className="flex items-center gap-1 min-w-full">
          {menuSections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex-1 min-w-fit py-2 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 shrink-0 ${isActive
                    ? 'bg-white text-stone-900 shadow-xs font-bold ring-1 ring-stone-200'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
              >
                <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-[#c25e38]' : sec.highlight ? 'text-amber-600' : 'text-stone-400'
                  }`}>
                  {sec.icon}
                </span>
                <span>{sec.label}</span>
                {sec.count && (
                  <span className={`text-[9px] font-mono px-1 rounded ${sec.highlight ? 'bg-orange-100 text-[#c25e38] font-bold' : 'bg-stone-200 text-stone-700'
                    }`}>
                    {sec.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {/* SECCIÓN NUEVA: IDENTIFICADOR DE ESTANCIAS */}
      {activeSection === 'rooms' && (
        <div className="space-y-4 animate-fadeIn">
          <RoomIdentifierPanel
            markers={config.roomMarkers || []}
            onAddMarker={handleAddMarker}
            onUpdateMarker={handleUpdateMarker}
            onDeleteMarker={handleDeleteMarker}
            onClearMarkers={handleClearMarkers}
            activeMarkerId={activeMarkerId}
            onSelectMarker={onSelectMarker}
            isPinningMode={isPinningMode}
            onTogglePinningMode={onTogglePinningMode}
            disabled={disabled}
          />
        </div>
      )}
      {/* SECCIÓN 1: GENERAL (1.1 A 1.5) */}
      {activeSection === 'general' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 1.1 Ángulo de Cámara & Modo de Render */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">1.1</span>
                <span>Ángulo de Cámara & Modo de Render</span>
              </label>
              {config.cameraAngle === 'plan_2d_furnished' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Modo 2D Plano Amueblado
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CAMERA_ANGLES.map((cam) => {
                const isSelected = config.cameraAngle === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateField('cameraAngle', cam.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${isSelected
                        ? 'border-[#c25e38] bg-orange-50/50 shadow-xs ring-1 ring-[#c25e38]'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[17px] ${isSelected ? 'text-[#c25e38]' : 'text-stone-400'}`}>
                          {cam.icon}
                        </span>
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                          {cam.label.split('(')[0]}
                        </span>
                      </div>
                      {cam.badge && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {cam.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">
                      {cam.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          {/* 1.2 Gama Cromática General (Paredes & Textiles) */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">1.2</span>
                <span>Gama Cromática General (Paredes & Textiles)</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c25e38] text-white font-medium">
                {selectedPalette.badge}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COLOR_PALETTE_SCHEMES.map((pal) => {
                const isSelected = config.colorPalette === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateField('colorPalette', pal.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${isSelected
                        ? 'border-[#c25e38] bg-orange-50/40 shadow-xs ring-1 ring-[#c25e38]'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                        {pal.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 mb-1.5 line-clamp-2 leading-relaxed">
                      {pal.desc}
                    </p>
                    <div className="flex items-center gap-1 pt-1 border-t border-stone-100">
                      {pal.colors.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* 1.3 Estilo Decorativo General */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">1.3</span>
                <span>Estilo Decorativo General</span>
              </label>
              <span className="text-[10px] text-stone-500 font-medium">{selectedStyle.label}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INTERIOR_STYLES.map((style) => {
                const isSelected = config.interiorStyle === style.id;
                return (
                  <button
                    key={style.id}
                    disabled={disabled}
                    onClick={() => updateField('interiorStyle', style.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${isSelected
                        ? 'border-[#c25e38] bg-orange-50/40 shadow-xs ring-1 ring-[#c25e38]'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-[#c25e38]' : 'text-stone-900'}`}>
                        {style.label}
                      </span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        {style.badge.split('&')[0]}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 mb-1.5 line-clamp-2 leading-relaxed">
                      {style.desc}
                    </p>
                    <div className="flex items-center gap-1 pt-1 border-t border-stone-100">
                      {style.palette.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* 1.4 Iluminación y Sol */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
            <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">1.4</span>
              <span>Iluminación y Sol</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LIGHTING_PRESETS.map((light) => {
                const isSelected = config.lighting === light.id;
                return (
                  <button
                    key={light.id}
                    disabled={disabled}
                    onClick={() => updateField('lighting', light.id as any)}
                    className={`p-2 rounded-xl border text-center transition-all ${isSelected
                        ? 'border-[#c25e38] bg-orange-50 text-[#c25e38] font-semibold ring-1 ring-[#c25e38]'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-600'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px] block mb-0.5">
                      {light.icon}
                    </span>
                    <span className="text-[10px] block leading-tight truncate">{light.label.split('(')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* 1.5 Formato de Render */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between">
            <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">1.5</span>
              <span>Formato de Render</span>
            </label>
            <div className="flex items-center gap-1.5">
              {(['16:9', '4:3', '1:1', '3:4'] as const).map((ratio) => (
                <button
                  key={ratio}
                  disabled={disabled}
                  onClick={() => updateField('aspectRatio', ratio)}
                  className={`px-3 py-1 text-xs rounded-lg font-mono font-medium transition-all ${config.aspectRatio === ratio
                      ? 'bg-[#c25e38] text-white font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* SECCIÓN 2: PAVIMENTO DE VIVIENDA (2.1 A 2.4) */}
      {activeSection === 'flooring' && (
        <div className="space-y-4 animate-fadeIn">
          {/* 2.1 Salón & Habitaciones */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">2.1</span>
                <span>Salón & Habitaciones</span>
              </label>
              <span className="text-[10px] font-medium text-stone-500">{selectedLivingFloor.label}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FLOORING_LIVING_OPTIONS.map((floor) => {
                const isSelected = config.flooringLiving === floor.id;
                return (
                  <button
                    key={floor.id}
                    disabled={disabled}
                    onClick={() => updateField('flooringLiving', floor.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${isSelected
                        ? 'border-[#c25e38] bg-orange-50/50 shadow-xs ring-1 ring-[#c25e38]'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                  >
                    <p className={`text-xs font-bold ${isSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                      {floor.label}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                      {floor.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          {/* 2.2 Cocina (con material GRES y selector de color) */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-stone-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">2.2</span>
                <span>Cocina</span>
              </label>
              <span className="text-[10px] font-medium text-stone-500">{selectedKitchenFloor.label}</span>
            </div>
            {/* Opciones de material para cocina */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {KITCHEN_FLOORING_OPTIONS.map((kFloor) => {
                const isSelected = config.flooringKitchen === kFloor.id;
                return (
                  <button
                    key={kFloor.id}
                    disabled={disabled}
                    onClick={() => updateField('flooringKitchen', kFloor.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${isSelected
                        ? 'border-[#c25e38] bg-orange-50/50 shadow-xs ring-1 ring-[#c25e38]'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-bold ${isSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                        {kFloor.label}
                      </p>
                      {kFloor.isGres && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Color Personalizable
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                      {kFloor.desc}
                    </p>
                  </button>
                );
              })}
            </div>
            {/* Subsección: Selector de Color para GRES de Cocina */}
            {(config.flooringKitchen === 'gres_porcelanico_cocina' || config.flooringKitchen === 'porcelain_gres_kitchen') && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#c25e38]">palette</span>
                    <span>Color del Pavimento de GRES en Cocina</span>
                  </label>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-stone-800 border border-amber-200">
                    {selectedKitchenGresColor.label.split('/')[0]}
                  </span>
                </div>
                <p className="text-[10px] text-stone-600">
                  Selecciona la tonalidad y acabado del gres cerámico para el suelo de la cocina:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {KITCHEN_GRES_COLORS.map((gColor) => {
                    const isColorSelected = config.kitchenGresColor === gColor.id;
                    return (
                      <button
                        key={gColor.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => updateField('kitchenGresColor', gColor.id)}
                        className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${isColorSelected
                            ? 'border-[#c25e38] bg-white shadow-xs ring-2 ring-[#c25e38]'
                            : 'border-stone-200 bg-white hover:border-amber-400'
                          }`}
                      >
                        <span
                          className="w-4 h-4 rounded-md border border-black/25 shrink-0 shadow-2xs"
                          style={{ backgroundColor: gColor.previewColor }}
                        />
                        <div className="min-w-0">
                          <p className={`text-[11px] truncate font-bold ${isColorSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                            {gColor.label.split('/')[0]}
                          </p>
                          <p className="text-[9px] text-stone-500 truncate">
                            {gColor.desc.split(',')[0]}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* 2.3 Baños (Solo gres de 60x60cm) elegir tonalidad + PLATO DE DUCHA BLANCO ESTRICTO */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-blue-700 text-white text-[10px] font-mono flex items-center justify-center font-bold">2.3</span>
                <span>Baños (Solo gres de 60x60cm) — Elegir tonalidad</span>
              </label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                Formato fijo 60x60 cm
              </span>
            </div>
            {/* Aviso Regla Estricta: Plato de Ducha SIEMPRE Blanco */}
            <div className="p-2 rounded-lg bg-white border border-blue-300 flex items-center gap-2 shadow-2xs">
              <span className="w-4 h-4 rounded-md bg-white border-2 border-stone-400 shrink-0 shadow-xs" title="Plato de ducha blanco" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-950 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-blue-700">shower</span>
                  Platos de ducha: SIEMPRE en Blanco Puro
                </p>
                <p className="text-[9px] text-stone-500">
                  Resina mineral blanca lisa independiente del tono de gres elegido para el pavimento del baño.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-blue-800">
              Baldosa rectificada cuadrada de 60x60 cm para el resto del suelo del baño:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BATHROOM_GRES_60X60_TONES.map((tone) => {
                const isSelected = config.flooringBathroomGres60 === tone.id;
                return (
                  <button
                    key={tone.id}
                    disabled={disabled}
                    onClick={() => updateField('flooringBathroomGres60', tone.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${isSelected
                        ? 'border-blue-600 bg-white shadow-xs ring-2 ring-blue-500'
                        : 'border-stone-200 bg-white hover:border-blue-300'
                      }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md border border-black/20 shrink-0 shadow-2xs mt-0.5"
                      style={{ backgroundColor: tone.previewColor }}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-stone-800'}`}>
                        {tone.label}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                        {tone.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* 2.4 Terraza */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-emerald-700 text-white text-[10px] font-mono flex items-center justify-center font-bold">2.4</span>
                <span>Terraza</span>
              </label>
              <span className="text-[10px] font-medium text-emerald-800">{selectedTerraceFloor.label}</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Se aplica exclusivamente si el plano cuenta con terraza o balcón exterior:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TERRACE_FLOORING_OPTIONS.map((tFloor) => {
                const isSelected = config.flooringTerrace === tFloor.id;
                return (
                  <button
                    key={tFloor.id}
                    disabled={disabled}
                    onClick={() => updateField('flooringTerrace', tFloor.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${isSelected
                        ? 'border-emerald-600 bg-white shadow-xs ring-2 ring-emerald-500'
                        : 'border-stone-200 bg-white hover:border-emerald-300'
                      }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md border border-black/20 shrink-0 shadow-2xs mt-0.5"
                      style={{ backgroundColor: tFloor.previewColor }}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${isSelected ? 'text-emerald-900' : 'text-stone-800'}`}>
                        {tFloor.label}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                        {tFloor.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* SECCIÓN 3: VENTANAS */}
      {activeSection === 'windows' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-sky-200">
              <h3 className="text-xs font-bold text-sky-950 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px] text-sky-700">window</span>
                Ventanas (Tipo, material y color de ventanas)
              </h3>
              <span className="text-[10px] font-mono text-sky-900 bg-white px-2 py-0.5 rounded border border-sky-200">
                {selectedWindowFinish.colorName}
              </span>
            </div>
            {/* A. Tipo de Ventanas */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                A. Tipo de Ventanas y Sistema de Apertura
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WINDOW_TYPE_OPTIONS.map((wType) => {
                  const isSelected = config.windowType === wType.id;
                  return (
                    <button
                      key={wType.id}
                      disabled={disabled}
                      onClick={() => updateField('windowType', wType.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${isSelected
                          ? 'border-sky-600 bg-white shadow-xs ring-2 ring-sky-500'
                          : 'border-stone-200 bg-white hover:border-sky-300'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`material-symbols-outlined text-[17px] ${isSelected ? 'text-sky-700' : 'text-stone-400'}`}>
                          {wType.icon}
                        </span>
                        <p className={`text-xs font-bold ${isSelected ? 'text-sky-900' : 'text-stone-800'}`}>
                          {wType.label}
                        </p>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-2">
                        {wType.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* B. Material y Color de Ventanas */}
            <div className="pt-2 border-t border-sky-200/70">
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                B. Material y Color de la Perfilería
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WINDOW_FRAME_OPTIONS.map((wFrame) => {
                  const isSelected = config.windowFrames === wFrame.id;
                  return (
                    <button
                      key={wFrame.id}
                      disabled={disabled}
                      onClick={() => updateField('windowFrames', wFrame.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${isSelected
                          ? 'border-sky-600 bg-white shadow-xs ring-2 ring-sky-500'
                          : 'border-stone-200 bg-white hover:border-sky-300'
                        }`}
                    >
                      <span
                        className="w-5 h-5 rounded-md border border-black/20 shrink-0 shadow-2xs mt-0.5"
                        style={{ backgroundColor: wFrame.colorPreview }}
                      />
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${isSelected ? 'text-sky-900' : 'text-stone-800'}`}>
                          {wFrame.label}
                        </p>
                        <p className="text-[10px] text-stone-600 font-medium">
                          {wFrame.material} • {wFrame.colorName}
                        </p>
                        <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                          {wFrame.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SECCIÓN 4: PUERTAS */}
      {activeSection === 'doors' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-3.5 rounded-xl bg-orange-50/40 border border-orange-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-orange-200">
              <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px] text-[#c25e38]">door_front</span>
                Puertas (Material y color de puertas)
              </h3>
              <span className="text-[10px] font-mono text-[#c25e38] bg-white px-2 py-0.5 rounded border border-orange-200 font-medium">
                {selectedDoor.colorName}
              </span>
            </div>
            <p className="text-[11px] text-stone-600">
              Afecta a puertas de paso interiores, puertas correderas y frentes de armarios empotrados.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOOR_FINISH_OPTIONS.map((door) => {
                const isSelected = config.doorFinish === door.id;
                return (
                  <button
                    key={door.id}
                    disabled={disabled}
                    onClick={() => updateField('doorFinish', door.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${isSelected
                        ? 'border-[#c25e38] bg-white shadow-xs ring-2 ring-[#c25e38]'
                        : 'border-stone-200 bg-white hover:border-orange-300'
                      }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md border border-black/20 shrink-0 shadow-2xs mt-0.5"
                      style={{ backgroundColor: door.colorPreview }}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${isSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                        {door.label}
                      </p>
                      <p className="text-[10px] text-stone-600 font-medium">
                        {door.material} • {door.colorName}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                        {door.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* SECCIÓN 5: MUROS */}
      {activeSection === 'walls' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px] text-[#c25e38]">format_paint</span>
                Muros exteriores e interiores (color)
              </h3>
            </div>
            {/* Muros Interiores */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800">
                  Color de Muros Interiores (Tabiquería & Pintura)
                </label>
                <span className="text-[10px] text-stone-500">{selectedInteriorWall.label}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WALL_COLOR_OPTIONS.map((wall) => {
                  const isSelected = config.interiorWallColor === wall.id;
                  return (
                    <button
                      key={wall.id}
                      disabled={disabled}
                      onClick={() => updateField('interiorWallColor', wall.id)}
                      className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${isSelected
                          ? 'border-[#c25e38] bg-white shadow-xs ring-2 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: wall.hex }}
                      />
                      <span className={`text-[11px] truncate ${isSelected ? 'text-[#c25e38] font-bold' : 'text-stone-700'}`}>
                        {wall.label.split('/')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Muros Exteriores */}
            <div className="space-y-2 pt-3 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800">
                  Color de Muros Exteriores (Fachada & Balcones)
                </label>
                <span className="text-[10px] text-stone-500">{selectedExteriorWall.label}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WALL_COLOR_OPTIONS.map((wall) => {
                  const isSelected = config.exteriorWallColor === wall.id;
                  return (
                    <button
                      key={wall.id}
                      disabled={disabled}
                      onClick={() => updateField('exteriorWallColor', wall.id)}
                      className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${isSelected
                          ? 'border-[#c25e38] bg-white shadow-xs ring-2 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: wall.hex }}
                      />
                      <span className={`text-[11px] truncate ${isSelected ? 'text-[#c25e38] font-bold' : 'text-stone-700'}`}>
                        {wall.label.split('/')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Instrucciones Adicionales */}
      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
          Instrucciones Adicionales / Peticiones de Mobiliario (Opcional)
        </label>
        <input
          type="text"
          disabled={disabled}
          value={config.extraDetails}
          onChange={(e) => updateField('extraDetails', e.target.value)}
          placeholder="Ej: Isla de cocina con encimera blanca, alfombra de yute, plantas..."
          className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c25e38]"
        />
      </div>
    </div>
  );
}