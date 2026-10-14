import React, { useState } from 'react';
import { RenderConfig, PresetConfig, RoomMarker, RoomCategory, RenderHistoryItem } from '../types';
import { PresetManager } from './PresetManager';
import { RoomIdentifierPanel } from './RoomIdentifierPanel';
import { sortRoomMarkers } from '../services/roomSorter';
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
  WALL_COLOR_OPTIONS,
  KITCHEN_COUNTERTOP_OPTIONS,
  MARKER_COLOR_PRESETS
} from '../constants';
import { DEFAULT_PROMOTION_LOGO } from '../services/defaultPromotionLogo';

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
  onDetectWithAI?: () => void;
  isDetectingWithAI?: boolean;
  hasSourceImage?: boolean;
  // Correcciones puntuales y control de versiones
  history?: RenderHistoryItem[];
  onApplyCorrection?: (instruction: string) => Promise<void>;
  onRestoreVersion?: (item: RenderHistoryItem) => void;
  currentVersion?: number;
}

type TabMode = 'presets' | 'camera' | 'rooms' | 'flooring' | 'carpentry' | 'corrections';

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
  disabled = false,
  onDetectWithAI,
  isDetectingWithAI = false,
  hasSourceImage = false,
  history = [],
  onApplyCorrection,
  onRestoreVersion,
  currentVersion = 1
}: StyleSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('presets');
  const [panelCorrectionInput, setPanelCorrectionInput] = useState<string>('');

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
    const updated = sortRoomMarkers([...(config.roomMarkers || []), newMarker]);
    updateField('roomMarkers', updated);
    onSelectMarker(newMarker.id);
  };

  const handleUpdateMarker = (id: string, updates: Partial<RoomMarker>) => {
    const updated = (config.roomMarkers || []).map((m) =>
      m.id === id ? { ...m, ...updates } : m
    );
    const shouldSort = updates.name !== undefined || updates.category !== undefined;
    updateField('roomMarkers', shouldSort ? sortRoomMarkers(updated) : updated);
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

          <button
            type="button"
            onClick={() => setActiveTab('corrections')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'corrections'
                ? 'bg-[#c25e38] text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span className={`material-symbols-outlined text-[17px] ${activeTab === 'corrections' ? 'text-white' : 'text-amber-600'}`}>
              auto_fix_high
            </span>
            <span>Correcciones</span>
            {history && history.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'corrections' ? 'bg-black/25 text-white' : 'bg-[#c25e38] text-white'
              }`}>
                v{history.length}
              </span>
            )}
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

            {/* Logo de la Promoción para Fichas Comerciales */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">apartment</span>
                  <span>Logo de la Promoción (Fichas Comerciales)</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-mono">
                  LUBENS
                </span>
              </div>

              {/* Vista previa del logo actual */}
              <div className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-center min-h-[50px] shadow-2xs">
                {config.promotionLogo ? (
                  <img
                    src={config.promotionLogo}
                    alt="Logo de la promoción"
                    className="max-h-10 w-auto max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-stone-400 italic">Sin logo configurado</span>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2">
                <label className="flex-1 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
                  <span className="material-symbols-outlined text-[15px] text-[#c25e38]">upload</span>
                  <span>Subir otro logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (typeof evt.target?.result === 'string') {
                            updateField('promotionLogo', evt.target.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {config.promotionLogo !== DEFAULT_PROMOTION_LOGO && (
                  <button
                    type="button"
                    onClick={() => updateField('promotionLogo', DEFAULT_PROMOTION_LOGO)}
                    className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition cursor-pointer"
                    title="Restablecer logo oficial Lubens"
                  >
                    Restablecer
                  </button>
                )}

                {config.promotionLogo && (
                  <button
                    type="button"
                    onClick={() => updateField('promotionLogo', undefined)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-xl transition cursor-pointer"
                    title="Quitar logo"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
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
              markerBadgeColor={config.markerBadgeColor || '#0F2C59'}
              onChangeMarkerBadgeColor={(color) => updateField('markerBadgeColor', color)}
              onAddMarker={handleAddMarker}
              onUpdateMarker={handleUpdateMarker}
              onDeleteMarker={handleDeleteMarker}
              onClearMarkers={handleClearMarkers}
              activeMarkerId={activeMarkerId}
              onSelectMarker={onSelectMarker}
              isPinningMode={isPinningMode}
              onTogglePinningMode={onTogglePinningMode}
              disabled={disabled}
              onDetectWithAI={onDetectWithAI}
              isDetectingWithAI={isDetectingWithAI}
              hasSourceImage={hasSourceImage}
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

            {/* Encimera de Cocina (Material y Color) */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">soup_kitchen</span>
                  <span>Encimera de Cocina (Material & Color)</span>
                </label>
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                  {KITCHEN_COUNTERTOP_OPTIONS.find((c) => c.id === (config.kitchenCountertop || 'quartz_calacatta_white'))?.material}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {KITCHEN_COUNTERTOP_OPTIONS.map((countertop) => {
                  const isSelected = (config.kitchenCountertop || 'quartz_calacatta_white') === countertop.id;
                  return (
                    <button
                      key={countertop.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('kitchenCountertop', countertop.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: countertop.colorPreview }}
                        />
                        <span className="text-xs font-bold text-stone-900 truncate">{countertop.label}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-1">{countertop.desc}</p>
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">door_front</span>
                  <span>Puertas de Paso & Armarios Empotrados</span>
                </label>
                {config.cameraAngle === 'plan_2d_furnished' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="material-symbols-outlined text-[12px]">checkroom</span>
                    Estándar CAD: Barra + perchas
                  </span>
                )}
              </div>
              {config.cameraAngle === 'plan_2d_furnished' && (
                <div className="text-[11px] text-stone-600 bg-stone-50 border border-stone-200/90 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-stone-800 text-[11px]">
                      <span className="material-symbols-outlined text-[15px] text-[#c25e38] shrink-0">checkroom</span>
                      <span>Simbología de Armarios Empotrados (Plano 2D Comercial):</span>
                    </div>
                    <span className="text-[9px] font-mono text-stone-500 uppercase px-1.5 py-0.5 bg-stone-200/70 rounded font-semibold">CAD Oficial</span>
                  </div>
                  
                  {/* Gráfico vectorial réplica exacta de la simbología arquitectónica solicitada */}
                  <div className="w-full bg-white border border-stone-200/80 rounded-lg p-2.5 flex flex-col items-center justify-center shadow-xs">
                    <svg viewBox="0 0 240 28" className="w-full max-w-[260px] h-7 stroke-stone-700" fill="none">
                      {/* Línea guía superior de balda / fondo */}
                      <line x1="2" y1="3" x2="238" y2="3" strokeWidth="0.8" className="stroke-stone-300" />
                      {/* Barra longitudinal de colgar central */}
                      <line x1="2" y1="14" x2="238" y2="14" strokeWidth="1.5" className="stroke-stone-800" />
                      {/* Trazos de perchas y prendas colgadas en planta */}
                      <line x1="12" y1="5" x2="10" y2="23" strokeWidth="1.1" />
                      <line x1="22" y1="5" x2="22" y2="23" strokeWidth="1.1" />
                      <line x1="32" y1="5" x2="38" y2="23" strokeWidth="1.1" />
                      <line x1="47" y1="5" x2="47" y2="23" strokeWidth="1.1" />
                      <line x1="58" y1="5" x2="64" y2="23" strokeWidth="1.1" />
                      <line x1="74" y1="5" x2="70" y2="23" strokeWidth="1.1" />
                      <line x1="86" y1="5" x2="93" y2="23" strokeWidth="1.1" />
                      <line x1="104" y1="5" x2="100" y2="23" strokeWidth="1.1" />
                      <line x1="116" y1="5" x2="123" y2="23" strokeWidth="1.1" />
                      <line x1="134" y1="5" x2="130" y2="23" strokeWidth="1.1" />
                      <line x1="146" y1="5" x2="153" y2="23" strokeWidth="1.1" />
                      <line x1="164" y1="5" x2="160" y2="23" strokeWidth="1.1" />
                      <line x1="176" y1="5" x2="183" y2="23" strokeWidth="1.1" />
                      <line x1="194" y1="5" x2="194" y2="23" strokeWidth="1.1" />
                      <line x1="204" y1="5" x2="204" y2="23" strokeWidth="1.1" />
                      <line x1="214" y1="5" x2="219" y2="23" strokeWidth="1.1" />
                      <line x1="228" y1="5" x2="228" y2="23" strokeWidth="1.1" />
                    </svg>
                  </div>

                  <p className="text-[10px] text-stone-500 leading-tight">
                    Barra de colgar longitudinal continua atravesada de extremo a extremo por trazos verticales e inclinados alternos (ropa colgada en perchas vista en planta cenital).
                  </p>
                </div>
              )}
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

        {/* ============================================================== */}
        {/* PESTAÑA 5: CORRECCIONES PUNTUALES Y CONTROL DE VERSIONES */}
        {/* ============================================================== */}
        {activeTab === 'corrections' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c25e38]" />
                <h3 className="text-sm font-bold text-stone-900">Corrección Puntual con IA</h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Corrige detalles puntuales de la maqueta actual sin regenerar todo desde cero (suelo, muebles, tabiques o acabados).
              </p>
            </div>

            {/* Formulario de envío de corrección */}
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2.5">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">terminal</span>
                <span>Orden de corrección en lenguaje natural</span>
              </label>
              <textarea
                rows={2}
                disabled={disabled || isGenerating}
                value={panelCorrectionInput}
                onChange={(e) => setPanelCorrectionInput(e.target.value)}
                placeholder="Ej: El suelo de la estancia 8 es de parquet en espiga, y cambia el mobiliario de la estancia 7..."
                className="w-full text-xs bg-white border border-stone-300 rounded-xl p-2.5 text-stone-800 focus:outline-none focus:border-[#c25e38] resize-none shadow-2xs"
              />
              <button
                type="button"
                disabled={disabled || isGenerating || !panelCorrectionInput.trim()}
                onClick={() => {
                  if (onApplyCorrection && panelCorrectionInput.trim()) {
                    onApplyCorrection(panelCorrectionInput.trim());
                    setPanelCorrectionInput('');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#c25e38] to-amber-600 hover:from-[#a84d2b] hover:to-amber-700 disabled:opacity-40 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span className={`material-symbols-outlined text-[16px] ${isGenerating ? 'animate-spin' : ''}`}>
                  {isGenerating ? 'autorenew' : 'auto_fix_high'}
                </span>
                <span>{isGenerating ? 'Aplicando corrección al render...' : 'Aplicar Corrección Puntual ⚡'}</span>
              </button>
            </div>

            {/* Píldoras de Corrección Rápida */}
            <div>
              <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block mb-2">
                Ajustes Rápidos Sugeridos
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  'Suelo parquet espiga en habitaciones',
                  'Suelo microcemento continuo en salón',
                  'Isla central con taburetes en cocina',
                  'Cama doble 160cm con cabecero',
                  'Ducha mineral blanco puro con mampara',
                  'Paredes en blanco roto cálido'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPanelCorrectionInput((prev) => (prev ? `${prev}, ${chip}` : chip))}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 hover:text-stone-900 text-[11px] font-medium transition cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Historial de Versiones */}
            <div className="pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-blue-600">history</span>
                  <span>Historial de Versiones ({history.length})</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  v{currentVersion} activa
                </span>
              </div>

              {history.length === 0 ? (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-center text-xs text-stone-400 italic">
                  Aún no se han generado versiones. Genera el render inicial y podrás aplicar correcciones puntuales guardando cada versión.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {history.map((item, idx) => {
                    const vNum = item.versionNumber || (history.length - idx);
                    const isCurrent = vNum === currentVersion;
                    return (
                      <div
                        key={item.id || idx}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                          isCurrent
                            ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                            : 'bg-white hover:bg-stone-50 border-stone-200'
                        }`}
                      >
                        {item.base64 && (
                          <img
                            src={`data:${item.mimeType || 'image/jpeg'};base64,${item.base64}`}
                            alt={`v${vNum}`}
                            className="w-12 h-12 rounded-lg object-cover border border-stone-300 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-900 font-mono">v{vNum}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                                Actual
                              </span>
                            )}
                            <span className="text-[10px] text-stone-400 ml-auto">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">
                            {item.appliedInstruction || 'Render inicial'}
                          </p>
                        </div>

                        {!isCurrent && onRestoreVersion && (
                          <button
                            type="button"
                            onClick={() => onRestoreVersion(item)}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold border border-stone-300 shrink-0 transition cursor-pointer"
                            title="Volver a esta versión"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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