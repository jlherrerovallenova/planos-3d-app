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
  onGenerateRender?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
}

type TabMode = 'presets' | 'camera' | 'rooms' | 'flooring' | 'carpentry';

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
  onGenerateRender,
  isGenerating = false,
  disabled = false
}: StyleSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('presets');

  const updateField = <K extends keyof RenderConfig>(field: K, value: RenderConfig[K]) => {
    onChangeConfig({
      ...config,
      [field]: value
    });
  };

  // Manejo de Estancias
  const handleAddMarker = (category: RoomCategory, name?: string, area?: number) => {
    const newMarker: RoomMarker = {
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name || 'Nueva Estancia',
      category,
      x: 50,
      y: 50,
      notes: '',
      areaSqMeters: area
    };
    const updated = [...(config.roomMarkers || []), newMarker];
    updateField('roomMarkers', updated);
    onSelectMarker(newMarker.id);
  };

  const handleUpdateMarker = (id: string, updates: Partial<RoomMarker>) => {
    const updated = (config.roomMarkers || []).map((m) =>
      m.id === id ? { ...m, ...updates } : m
    );
    updateField('roomMarkers', updated);
  };

  const handleDeleteMarker = (id: string) => {
    const updated = (config.roomMarkers || []).filter((m) => m.id !== id);
    updateField('roomMarkers', updated);
    if (activeMarkerId === id) {
      onSelectMarker(null);
    }
  };

  const handleClearMarkers = () => {
    updateField('roomMarkers', []);
    onSelectMarker(null);
  };

  // Datos de opciones seleccionadas para el resumen activo
  const selectedStyle = INTERIOR_STYLES.find((s) => s.id === config.interiorStyle) || INTERIOR_STYLES[0];
  const selectedPalette = COLOR_PALETTE_SCHEMES.find((p) => p.id === config.colorPalette) || COLOR_PALETTE_SCHEMES[0];
  const selectedCamera = CAMERA_ANGLES.find((c) => c.id === config.cameraAngle) || CAMERA_ANGLES[0];
  const selectedLivingFloor = FLOORING_LIVING_OPTIONS.find((f) => f.id === config.flooringLiving) || FLOORING_LIVING_OPTIONS[0];
  const selectedWindowFrame = WINDOW_FRAME_OPTIONS.find((w) => w.id === config.windowFrames) || WINDOW_FRAME_OPTIONS[0];
  const markersCount = (config.roomMarkers || []).length;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm flex flex-col overflow-hidden text-stone-800">
      {/* 1. Header con Tabs principales de navegación tipo Studio */}
      <div className="p-3 bg-stone-50 border-b border-stone-200/90 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] text-[#c25e38]">magic_button</span>
            <span>Presets Rápidos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] text-stone-500">videocam</span>
            <span>Cámara & Luz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] text-stone-500">pin_drop</span>
            <span>Estancias</span>
            {markersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#c25e38] text-white">
                {markersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flooring')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'flooring'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] text-stone-500">view_quilt</span>
            <span>Pavimentos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('carpentry')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'carpentry'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] text-stone-500">door_front</span>
            <span>Carpintería & Muros</span>
          </button>
        </div>

        {/* Toggle Fidelidad 100% Calco */}
        <button
          type="button"
          onClick={() => updateField('strictBlueprintFidelity', !config.strictBlueprintFidelity)}
          className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
            config.strictBlueprintFidelity
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-white border-stone-200 text-stone-500'
          }`}
          title="Fuerza a la IA a calcar los tabiques sin añadir ni quitar habitaciones"
        >
          <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
          <span>{config.strictBlueprintFidelity ? 'Calco 1:1' : 'Flexible'}</span>
        </button>
      </div>

      {/* 2. Área Central con contenido scrolleable fluido */}
      <div className="p-4 sm:p-5 overflow-y-auto max-h-[64vh] space-y-4">
        {/* ============================================================== */}
        {/* PESTAÑA 1: PRESETS MAESTROS (EXPERIENCIA 1-CLIC) */}
        {/* ============================================================== */}
        {activeTab === 'presets' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Memorias de Calidades Maestras</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Selecciona un estilo arquitectónico completo con un solo clic. Modifica suelos, ventanas, iluminación y color automáticamente.
              </p>
            </div>

            {/* Presets visuales en tarjetas */}
            <PresetManager
              currentConfig={config}
              presets={presets}
              activePresetId={activePresetId}
              onApplyPreset={onApplyPreset}
              onSavePreset={onSavePreset}
              onDeletePreset={onDeletePreset}
              disabled={disabled}
            />

            {/* Selector de Gama Cromática */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">palette</span>
                  <span>Paleta Cromática Predominante</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                  {selectedPalette.label}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_PALETTE_SCHEMES.map((pal) => {
                  const isSelected = config.colorPalette === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('colorPalette', pal.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-white ring-1 ring-[#c25e38] shadow-xs'
                          : 'border-stone-200 bg-white/70 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-stone-800 block truncate">{pal.label}</span>
                      <div className="flex items-center gap-1 mt-1.5">
                        {pal.colors.map((c, i) => (
                          <span
                            key={i}
                            className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: CÁMARA, ÁNGULO Y LUZ */}
        {/* ============================================================== */}
        {activeTab === 'camera' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Ángulo de Cámara */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">photo_camera</span>
                  <span>Punto de Vista & Modo de Render</span>
                </span>
                <span className="text-[10px] text-stone-500 font-normal">
                  {selectedCamera.label.split('(')[0]}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAMERA_ANGLES.map((cam) => {
                  const isSelected = config.cameraAngle === cam.id;
                  return (
                    <button
                      key={cam.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('cameraAngle', cam.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 shadow-xs ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              isSelected ? 'text-[#c25e38]' : 'text-stone-400'
                            }`}
                          >
                            {cam.icon}
                          </span>
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#c25e38]' : 'text-stone-900'}`}>
                            {cam.label.split('(')[0]}
                          </span>
                        </div>
                        {cam.badge && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600">
                            {cam.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">{cam.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Iluminación */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">wb_sunny</span>
                <span>Iluminación & Atmósfera Solar</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LIGHTING_PRESETS.map((light) => {
                  const isSelected = config.lighting === light.id;
                  return (
                    <button
                      key={light.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('lighting', light.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50 text-[#c25e38] font-bold ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px] block mb-0.5">
                        {light.icon}
                      </span>
                      <span className="text-[11px] block truncate">{light.label.split('(')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proporción / Aspect Ratio */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">aspect_ratio</span>
                <span>Proporción de Imagen</span>
              </span>
              <div className="flex gap-1">
                {(['16:9', '4:3', '1:1', '3:4'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateField('aspectRatio', ratio)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      config.aspectRatio === ratio
                        ? 'bg-[#c25e38] text-white shadow-xs'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 3: IDENTIFICADOR DE ESTANCIAS */}
        {/* ============================================================== */}
        {activeTab === 'rooms' && (
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

        {/* ============================================================== */}
        {/* PESTAÑA 4: PAVIMENTOS & SUELOS */}
        {/* ============================================================== */}
        {activeTab === 'flooring' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Salón y Habitaciones */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">texture</span>
                <span>Suelo en Salón & Dormitorios</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FLOORING_LIVING_OPTIONS.map((floor) => {
                  const isSelected = config.flooringLiving === floor.id;
                  return (
                    <button
                      key={floor.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('flooringLiving', floor.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-1 ring-[#c25e38] shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{
                            backgroundColor:
                              floor.id.includes('oak')
                                ? '#CDB18B'
                                : floor.id.includes('herringbone')
                                ? '#B8976C'
                                : floor.id.includes('microcement')
                                ? '#CEC6B9'
                                : floor.id.includes('travertine')
                                ? '#D8CAB8'
                                : floor.id.includes('concrete')
                                ? '#8C9094'
                                : '#E5E7EB'
                          }}
                        />
                        <span className="text-xs font-bold text-stone-900 truncate">{floor.label}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-1">{floor.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cocina */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">countertops</span>
                <span>Suelo en Cocina</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {KITCHEN_FLOORING_OPTIONS.map((kFloor) => {
                  const isSelected = config.flooringKitchen === kFloor.id;
                  return (
                    <button
                      key={kFloor.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('flooringKitchen', kFloor.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-stone-900 block truncate">{kFloor.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Baños 60x60cm + Regla de Plato de Ducha */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">bathtub</span>
                  <span>Suelo en Baños (Gres Porcelánico 60x60cm)</span>
                </label>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Plato ducha: Blanco Puro
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BATHROOM_GRES_60X60_TONES.map((bTone) => {
                  const isSelected = config.flooringBathroomGres60 === bTone.id;
                  return (
                    <button
                      key={bTone.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('flooringBathroomGres60', bTone.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: bTone.previewColor }}
                      />
                      <span className="text-xs font-bold text-stone-900 truncate">{bTone.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terraza Exterior */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">deck</span>
                <span>Pavimento en Terraza Exterior / Balcón</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TERRACE_FLOORING_OPTIONS.map((tFloor) => {
                  const isSelected = config.flooringTerrace === tFloor.id;
                  return (
                    <button
                      key={tFloor.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('flooringTerrace', tFloor.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: tFloor.previewColor }}
                      />
                      <span className="text-xs font-bold text-stone-900 truncate">{tFloor.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 5: CARPINTERÍA & MUROS */}
        {/* ============================================================== */}
        {activeTab === 'carpentry' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Ventanas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">window</span>
                <span>Ventanas & Carpintería Exterior</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WINDOW_FRAME_OPTIONS.map((frame) => {
                  const isSelected = config.windowFrames === frame.id;
                  return (
                    <button
                      key={frame.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('windowFrames', frame.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: frame.colorPreview }}
                        />
                        <span className="text-xs font-bold text-stone-900 truncate">{frame.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Puertas de paso y armarios */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">door_front</span>
                <span>Puertas de Paso & Armarios Empotrados</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DOOR_FINISH_OPTIONS.map((door) => {
                  const isSelected = config.doorFinish === door.id;
                  return (
                    <button
                      key={door.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('doorFinish', door.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: door.colorPreview }}
                        />
                        <span className="text-xs font-bold text-stone-900 truncate">{door.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pintura Muros Interiores */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">format_paint</span>
                <span>Paredes Interiores (Pintura lisa)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WALL_COLOR_OPTIONS.map((wall) => {
                  const isSelected = config.interiorWallColor === wall.id;
                  return (
                    <button
                      key={wall.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('interiorWallColor', wall.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: wall.hex }}
                      />
                      <span className="text-xs font-bold text-stone-900 truncate">{wall.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observaciones extras para el modelo */}
            <div className="space-y-1 pt-2 border-t border-stone-200/80">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">notes</span>
                <span>Instrucciones Especiales de Diseño (Opcional)</span>
              </label>
              <textarea
                rows={2}
                disabled={disabled}
                value={config.extraDetails || ''}
                onChange={(e) => updateField('extraDetails', e.target.value)}
                placeholder="Ej: Isla central con taburetes, mamparas de ducha en perfilería negra..."
                className="w-full text-xs bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-stone-800 focus:outline-none focus:border-[#c25e38] resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Sticky: Resumen de Calidades + CTA de Generar Render */}
      <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Chip de resumen de configuración activa */}
        <div className="min-w-0 flex items-center gap-1.5 text-[11px] text-stone-600 truncate">
          <span className="font-bold text-stone-900">{selectedStyle.label}</span>
          <span>•</span>
          <span className="truncate">{selectedCamera.label.split('(')[0]}</span>
          <span>•</span>
          <span className="truncate">{selectedLivingFloor.label}</span>
          <span>•</span>
          <span className="truncate">{selectedWindowFrame.label}</span>
          {markersCount > 0 && (
            <>
              <span>•</span>
              <span className="font-bold text-[#c25e38]">{markersCount} estancias</span>
            </>
          )}
        </div>

        {/* Botón principal de generar si se pasa como prop */}
        {onGenerateRender && (
          <button
            type="button"
            disabled={disabled || isGenerating}
            onClick={onGenerateRender}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#c25e38] hover:bg-[#a84d2b] disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-[#c25e38]/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isGenerating ? 'progress_activity' : 'auto_awesome'}
            </span>
            <span>{isGenerating ? 'Procesando render...' : 'Generar Render 3D'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default StyleSelector;