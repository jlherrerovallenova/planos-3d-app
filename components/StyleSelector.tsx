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
  MARKER_COLOR_PRESETS,
  ISOMETRIC_ORIENTATIONS,
  RENDER_ENGINE_OPTIONS
} from '../constants';
import { DEFAULT_PROMOTION_LOGO } from '../services/defaultPromotionLogo';
import { DEFAULT_AGENCY_LOGO } from '../services/defaultAgencyLogo';

interface StyleSelectorProps {
  config: RenderConfig;
  onChangeConfig: (newConfig: RenderConfig) => void;
  presets: PresetConfig[];
  activePresetId: string | null;
  onApplyPreset: (preset: PresetConfig) => void;
  onSavePreset: (name: string, config: RenderConfig) => void;
  onDeletePreset: (id: string) => void;
  onImportPresetJson?: (presetOrConfig: any, filename?: string) => void;
  onSetDefaultConfig?: (config: RenderConfig) => void;
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
  onGenerateInterior?: (marker: RoomMarker, roomIndex: number) => void;
  isGeneratingInterior?: boolean;
  generatingRoomId?: string | null;
  // Correcciones puntuales y control de versiones
  history?: RenderHistoryItem[];
  onApplyCorrection?: (instruction: string) => Promise<void>;
  onRestoreVersion?: (item: RenderHistoryItem) => void;
  currentVersion?: number;
  // Control de ancho del panel lateral
  isWide?: boolean;
  onToggleWide?: () => void;
}


type TabMode = 'presets' | 'camera' | 'rooms' | 'calidades' | 'config' | 'corrections' | 'flooring' | 'carpentry';

export function StyleSelector({
  config,
  onChangeConfig,
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onImportPresetJson,
  onSetDefaultConfig,
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
  onGenerateInterior,
  isGeneratingInterior = false,
  generatingRoomId = null,
  history = [],
  onApplyCorrection,
  onRestoreVersion,
  currentVersion = 1,
  isWide = true,

  onToggleWide
}: StyleSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('presets');
  const [calidadesSubTab, setCalidadesSubTab] = useState<'flooring' | 'carpentry'>('flooring');
  const [panelCorrectionInput, setPanelCorrectionInput] = useState<string>('');

  const handleSelectTab = (tab: TabMode) => {
    if (tab === 'flooring') {
      setActiveTab('calidades');
      setCalidadesSubTab('flooring');
    } else if (tab === 'carpentry') {
      setActiveTab('calidades');
      setCalidadesSubTab('carpentry');
    } else {
      setActiveTab(tab);
    }
  };

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
  const selectedBathGres60 = BATHROOM_GRES_60X60_TONES.find((b) => b.id === config.flooringBathroomGres60) || BATHROOM_GRES_60X60_TONES[0];
  const selectedWindowType = WINDOW_TYPE_OPTIONS.find((w) => w.id === config.windowType) || WINDOW_TYPE_OPTIONS[0];
  const selectedWindowFrame = WINDOW_FRAME_OPTIONS.find((w) => w.id === config.windowFrames) || WINDOW_FRAME_OPTIONS[0];
  const selectedDoor = DOOR_FINISH_OPTIONS.find((d) => d.id === config.doorFinish) || DOOR_FINISH_OPTIONS[0];
  const selectedInteriorWall = WALL_COLOR_OPTIONS.find((w) => w.id === config.interiorWallColor) || WALL_COLOR_OPTIONS[0];
  const selectedExteriorWall = WALL_COLOR_OPTIONS.find((w) => w.id === config.exteriorWallColor) || WALL_COLOR_OPTIONS[0];
  const markersCount = (config.roomMarkers || []).length;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm flex flex-col overflow-hidden text-stone-800">
      {/* 1. Header con Tabs principales de navegación tipo Studio (Siempre visibles sin ocultación) */}
      <div className="p-2 sm:p-2.5 bg-stone-50 border-b border-stone-200/90 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-[#c25e38]">tune</span>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">Configuración & Calidades</span>
          </div>

          {/* Acciones de cabecera: Alternar ancho y Modo Calco */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleWide && (
              <button
                type="button"
                onClick={onToggleWide}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer shadow-2xs"
                title={isWide ? 'Cambiar a ancho estándar' : 'Expandir ancho del panel'}
              >
                <span className="material-symbols-outlined text-[16px] text-stone-500">
                  {isWide ? 'collapse_content' : 'expand_content'}
                </span>
                <span className="hidden sm:inline">{isWide ? 'Ancho Cómodo' : 'Extra Ancho'}</span>
              </button>
            )}

            {/* Toggle Fidelidad 100% Calco */}
            <button
              type="button"
              onClick={() => updateField('strictBlueprintFidelity', !config.strictBlueprintFidelity)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
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
        </div>

        {/* Cuadrícula de 6 Pestañas siempre accesibles a 1 solo clic (Sin scroll horizontal oculto) */}
        <div className="grid grid-cols-3 gap-1.5 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/80">
          <button
            type="button"
            onClick={() => handleSelectTab('presets')}
            className={`px-2 py-2 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'presets'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200 font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            title="Estilos de interiorismo y paletas de color"
          >
            <span className="material-symbols-outlined text-[16px] text-[#c25e38]">palette</span>
            <span className="truncate">1. Estilos</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('camera')}
            className={`px-2 py-2 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'camera'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200 font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            title="Punto de vista, ángulo de cámara, luz y motor Gemini"
          >
            <span className="material-symbols-outlined text-[16px] text-sky-600">videocam</span>
            <span className="truncate">2. Cámara</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('rooms')}
            className={`px-2 py-2 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'rooms'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200 font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            title="Identificador de estancias y pins"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">pin_drop</span>
            <span className="truncate">3. Estancias</span>
            {markersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#c25e38] text-white">
                {markersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('calidades')}
            className={`px-2 py-2 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'calidades' || activeTab === 'flooring' || activeTab === 'carpentry'
                ? 'bg-white text-amber-900 shadow-xs border border-amber-300 font-bold ring-1 ring-amber-400/40'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            title="Suelos de salón, baños 60x60, cocina, puertas y ventanas"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-700">texture</span>
            <span className="truncate font-bold">4. Calidades</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('config')}
            className={`px-2 py-2 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'config'
                ? 'bg-white text-[#0F2C59] shadow-xs border border-blue-300 font-bold ring-1 ring-[#0F2C59]/30'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            title="Logotipos oficiales, identificador de vivienda y ficha comercial"
          >
            <span className="material-symbols-outlined text-[16px] text-[#0F2C59]">settings</span>
            <span className="truncate font-bold">5. Configuración</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('corrections')}
            className={`px-2 py-2 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              activeTab === 'corrections'
                ? 'bg-[#c25e38] text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
            title="Terminal de correcciones IA e historial de versiones"
          >
            <span className={`material-symbols-outlined text-[16px] ${activeTab === 'corrections' ? 'text-white' : 'text-[#c25e38]'}`}>
              auto_fix_high
            </span>
            <span className="truncate">6. Correcciones</span>
            {history && history.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'corrections' ? 'bg-black/25 text-white' : 'bg-[#c25e38] text-white'
              }`}>
                v{history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Área Central con contenido scrolleable fluido */}
      <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(100vh-250px)] min-h-[480px] space-y-4">
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
              onImportPresetJson={onImportPresetJson}
              onSetDefaultConfig={onSetDefaultConfig}
              disabled={disabled}
            />

            {/* Acceso Rápido y Resumen de Materiales Actuales (Suelos, Baños, Puertas, Ventanas) */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#c25e38]">inventory_2</span>
                  <span>Memoria de Calidades Activa (Suelos, Baños, Ventanas, Puertas)</span>
                </span>
                <span className="text-[10px] font-semibold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Acceso directo
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-tight">
                Puedes cambiar el suelo de cada zona, el modelo de ventana y puertas haciendo clic en los botones directos o en las pestañas superiores:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Suelo vivienda */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('flooring')}
                  className="p-2.5 rounded-xl bg-white border border-amber-200 hover:border-[#c25e38] text-left transition flex items-center justify-between gap-2 group cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-stone-500 block uppercase tracking-wide">
                      🪵 Suelo Vivienda (Salón/Hab.)
                    </span>
                    <span className="font-bold text-stone-900 truncate block text-[11px]">
                      {selectedLivingFloor.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#c25e38] group-hover:underline shrink-0">
                    Editar ➔
                  </span>
                </button>

                {/* Suelo baños */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('flooring')}
                  className="p-2.5 rounded-xl bg-white border border-amber-200 hover:border-[#c25e38] text-left transition flex items-center justify-between gap-2 group cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-stone-500 block uppercase tracking-wide">
                      🛁 Suelo Baños (Gres 60x60cm)
                    </span>
                    <span className="font-bold text-stone-900 truncate block text-[11px]">
                      {selectedBathGres60.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#c25e38] group-hover:underline shrink-0">
                    Editar ➔
                  </span>
                </button>

                {/* Ventanas */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('carpentry')}
                  className="p-2.5 rounded-xl bg-white border border-amber-200 hover:border-[#c25e38] text-left transition flex items-center justify-between gap-2 group cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-stone-500 block uppercase tracking-wide">
                      🪟 Ventanas & Balconeras
                    </span>
                    <span className="font-bold text-stone-900 truncate block text-[11px]">
                      {selectedWindowType.label.split('/')[0]} · {selectedWindowFrame.label.split('—')[0]}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#c25e38] group-hover:underline shrink-0">
                    Editar ➔
                  </span>
                </button>

                {/* Puertas */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('carpentry')}
                  className="p-2.5 rounded-xl bg-white border border-amber-200 hover:border-[#c25e38] text-left transition flex items-center justify-between gap-2 group cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-stone-500 block uppercase tracking-wide">
                      🚪 Puertas & Armarios
                    </span>
                    <span className="font-bold text-stone-900 truncate block text-[11px]">
                      {selectedDoor.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#c25e38] group-hover:underline shrink-0">
                    Editar ➔
                  </span>
                </button>
              </div>
            </div>

            {/* Selector de Gama Cromática */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">palette</span>
                  <span>Paleta Cromática Predominante</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 shrink-0">
                  {selectedPalette.label}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COLOR_PALETTE_SCHEMES.map((pal) => {
                  const isSelected = config.colorPalette === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('colorPalette', pal.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-white ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white/80 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className={`text-xs font-bold leading-snug break-words ${isSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                          {pal.label}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#c25e38] bg-orange-100/70 px-1.5 py-0.2 rounded-full shrink-0">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pal.colors.map((c, i) => (
                          <span
                            key={`${pal.id}-color-${i}-${c}`}
                            className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0"
                            style={{ backgroundColor: c }}
                            title={c}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`material-symbols-outlined text-[18px] shrink-0 ${
                              isSelected ? 'text-[#c25e38]' : 'text-stone-400'
                            }`}
                          >
                            {cam.icon}
                          </span>
                          <span className={`text-xs font-bold leading-snug break-words ${isSelected ? 'text-[#c25e38]' : 'text-stone-900'}`}>
                            {cam.label.split('(')[0].trim()}
                          </span>
                        </div>
                        {cam.badge && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 shrink-0">
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

            {/* Control de Rotación y Orientación Isométrica 360° */}
            {(config.cameraAngle === 'isometric_45' || config.cameraAngle === 'isometric_cutaway') && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/60 border border-orange-200/90 shadow-2xs space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[17px] text-[#c25e38]">explore</span>
                    <span>Orientación y Giro Isométrico 360°</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-full border border-orange-200 text-stone-800 font-mono text-[11px] font-bold shadow-2xs">
                    <span className="text-[#c25e38]">📐</span>
                    <span>{typeof config.isometricRotationAngle === 'number' ? config.isometricRotationAngle : 0}°</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Gira la perspectiva de la maqueta 3D en todas las direcciones para observar la vivienda desde sus diferentes esquinas y fachadas exteriores.
                </p>

                {/* 4 Esquinas Principales (SO, SE, NE, NO) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Puntos de Vista Cardinales / 4 Esquinas
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {ISOMETRIC_ORIENTATIONS.slice(0, 4).map((orient) => {
                      const isCurrent = (config.isometricOrientation || 'south_west') === orient.id;
                      return (
                        <button
                          key={orient.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            updateField('isometricOrientation', orient.id);
                            updateField('isometricRotationAngle', orient.angle);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isCurrent
                              ? 'border-[#c25e38] bg-white shadow-xs ring-2 ring-[#c25e38]/30 font-bold'
                              : 'border-stone-200 bg-white/80 hover:bg-white hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-bold">
                              {orient.cardinal}
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-[#c25e38]">
                              {orient.icon}
                            </span>
                          </div>
                          <span className={`text-[11px] leading-tight ${isCurrent ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                            {orient.label.split('(')[0]}
                          </span>
                          <span className="text-[9px] text-stone-400 mt-0.5">
                            {orient.angle}°
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rosa de los Vientos / 4 Vistas Directas de Fachada (S, E, N, O) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Vistas Frontales y Laterales de Fachada
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ISOMETRIC_ORIENTATIONS.slice(4, 8).map((orient) => {
                      const isCurrent = config.isometricOrientation === orient.id;
                      return (
                        <button
                          key={orient.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            updateField('isometricOrientation', orient.id);
                            updateField('isometricRotationAngle', orient.angle);
                          }}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            isCurrent
                              ? 'border-[#c25e38] bg-white shadow-xs ring-1 ring-[#c25e38] font-bold text-[#c25e38]'
                              : 'border-stone-200 bg-white/70 hover:bg-white text-stone-700'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">{orient.icon}</span>
                            <span className="text-[11px] font-bold">{orient.cardinal}</span>
                          </div>
                          <span className="text-[9px] text-stone-400 block mt-0.5">{orient.angle}°</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dial de rotación continua 0° - 360° */}
                <div className="space-y-1.5 pt-1.5 border-t border-stone-200/70">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-stone-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-[#c25e38]">rotate_right</span>
                      <span>Giro libre 360°</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const current = config.isometricRotationAngle || 0;
                          const next = (current - 45 + 360) % 360;
                          updateField('isometricRotationAngle', next);
                        }}
                        className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-bold cursor-pointer transition active:scale-95"
                        title="Girar 45° antihorario"
                      >
                        ↺ -45°
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const current = config.isometricRotationAngle || 0;
                          const next = (current + 45) % 360;
                          updateField('isometricRotationAngle', next);
                        }}
                        className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-bold cursor-pointer transition active:scale-95"
                        title="Girar 45° horario"
                      >
                        ↻ +45°
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateField('isometricOrientation', 'south_west');
                          updateField('isometricRotationAngle', 0);
                        }}
                        className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-800 text-[10px] cursor-pointer"
                        title="Restablecer ángulo frontal estándar"
                      >
                        0° Reset
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    aria-label="Ángulo de rotación isométrica"
                    min="0"
                    max="359"
                    step="5"
                    value={config.isometricRotationAngle || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateField('isometricRotationAngle', val);
                    }}
                    className="w-full accent-[#c25e38] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>0° (SO)</span>
                    <span>90° (SE)</span>
                    <span>180° (NE)</span>
                    <span>270° (NO)</span>
                    <span>360°</span>
                  </div>
                </div>
              </div>
            )}

            {/* Iluminación */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">wb_sunny</span>
                <span>Iluminación & Atmósfera Solar</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {LIGHTING_PRESETS.map((light) => {
                  const isSelected = config.lighting === light.id;
                  return (
                    <button
                      key={light.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('lighting', light.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50 text-[#c25e38] font-bold ring-1 ring-[#c25e38]'
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px] block mb-0.5">
                        {light.icon}
                      </span>
                      <span className="text-[11px] font-semibold leading-tight text-center break-words">{light.label.split('(')[0].trim()}</span>
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

            {/* 5. Selector de Motor de Render Gemini */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">neurology</span>
                  <span>Motor de Render IA (Gemini Image)</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-mono">
                  {config.renderEngine ? config.renderEngine.replace('gemini-', '') : 'auto'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RENDER_ENGINE_OPTIONS.map((engine) => {
                  const isSelected = (config.renderEngine || 'auto') === engine.id;
                  return (
                    <button
                      key={engine.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('renderEngine', engine.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-white ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white/70 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`material-symbols-outlined text-[16px] shrink-0 ${
                              isSelected ? 'text-[#c25e38]' : 'text-stone-400'
                            }`}
                          >
                            {engine.icon}
                          </span>
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                            {engine.label}
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 shrink-0 font-mono">
                          {engine.versionTag}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-stone-500 leading-tight line-clamp-2">
                        {engine.desc}
                      </p>
                      <div className="flex items-center justify-between text-[9.5px] text-stone-400 font-medium pt-1 border-t border-stone-100">
                        <span>{engine.speed}</span>
                        {isSelected && <span className="text-[#c25e38] font-bold">Activo ✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2 leading-relaxed">
                <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0 mt-0.5">info</span>
                <div>
                  <span className="font-bold">¿Es posible usar la versión 4?</span> En la API oficial de Google, los modelos <strong>Gemini 4</strong> (como <em>Gemini 4 Argon</em>) están diseñados para razonamiento lingüístico y análisis multimodal. Para la <strong>generación fotorrealista de imágenes</strong>, Google emplea su familia especializada <strong>Gemini Image</strong> (<em>Gemini 3.1 Flash Image</em> y <em>Gemini 3 Pro Image / Nano Banana</em>). Si Google activa la síntesis de imagen para Gemini 4, estará disponible automáticamente.
                </div>
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
              onGenerateInterior={onGenerateInterior}
              isGeneratingInterior={isGeneratingInterior}
              generatingRoomId={generatingRoomId}
              customTotalUsefulArea={config.customTotalUsefulArea}
              onChangeCustomTotalUsefulArea={(val) => updateField('customTotalUsefulArea', val)}
            />

          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 4: CALIDADES (PAVIMENTOS & CARPINTERÍA) */}
        {/* ============================================================== */}
        {(activeTab === 'calidades' || activeTab === 'flooring' || activeTab === 'carpentry') && (
          <div className="space-y-4 animate-fadeIn">
            {/* Sub-selector de Calidades: Pavimentos / Carpintería */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setCalidadesSubTab('flooring')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  calidadesSubTab === 'flooring'
                    ? 'bg-white text-amber-900 shadow-xs border border-amber-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-amber-700">texture</span>
                <span>Pavimentos & Baños</span>
              </button>
              <button
                type="button"
                onClick={() => setCalidadesSubTab('carpentry')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  calidadesSubTab === 'carpentry'
                    ? 'bg-white text-emerald-950 shadow-xs border border-emerald-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-emerald-700">door_front</span>
                <span>Puertas, Ventanas & Muros</span>
              </button>
            </div>

            {calidadesSubTab === 'flooring' && (
              <div className="space-y-4 animate-fadeIn">
            {/* Salón y Habitaciones */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">texture</span>
                <span>Suelo en Salón & Dormitorios</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FLOORING_LIVING_OPTIONS.map((floor) => {
                  const isSelected = config.flooringLiving === floor.id;
                  return (
                    <button
                      key={floor.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('flooringLiving', floor.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/15 shrink-0"
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
                        <span className="text-xs font-bold text-stone-900 leading-snug break-words">{floor.label}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-2 leading-tight">{floor.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cocina */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">countertops</span>
                <span>Suelo en Cocina</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {KITCHEN_FLOORING_OPTIONS.map((kFloor) => {
                  const isSelected = config.flooringKitchen === kFloor.id;
                  return (
                    <button
                      key={kFloor.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('flooringKitchen', kFloor.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-stone-900 block leading-snug break-words">{kFloor.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selector de color/tonalidad de gres de cocina */}
              {(config.flooringKitchen === 'gres_porcelanico_cocina' ||
                config.flooringKitchen === 'porcelain_gres_kitchen') && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2 mt-2">
                  <span className="text-xs font-bold text-stone-900 block">
                    Tonalidad del Gres Cerámico para Cocina:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {KITCHEN_GRES_COLORS.map((gColor) => {
                      const isSelected = (config.kitchenGresColor || 'gres_gris_perla') === gColor.id;
                      return (
                        <button
                          key={gColor.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => updateField('kitchenGresColor', gColor.id)}
                          className={`p-2 rounded-lg border text-left transition flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'border-[#c25e38] bg-white ring-2 ring-[#c25e38]/30'
                              : 'border-stone-200 bg-white/70 hover:bg-white'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                            style={{ backgroundColor: gColor.previewColor }}
                          />
                          <span className="text-[11px] font-bold text-stone-900 truncate">{gColor.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Encimera de Cocina (Material y Color) */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#c25e38]">soup_kitchen</span>
                    <span>Encimera de Cocina (Material & Color)</span>
                  </span>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    Regla activa: Únicamente vitrocerámica y fregadero visibles (resto encimera limpia)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Solo vitro + fregadero
                  </span>
                  <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                    {KITCHEN_COUNTERTOP_OPTIONS.find((c) => c.id === (config.kitchenCountertop || 'quartz_calacatta_white'))?.material}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {KITCHEN_COUNTERTOP_OPTIONS.map((countertop) => {
                  const isSelected = (config.kitchenCountertop || 'quartz_calacatta_white') === countertop.id;
                  return (
                    <button
                      key={countertop.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('kitchenCountertop', countertop.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: countertop.colorPreview }}
                        />
                        <span className="text-xs font-bold text-stone-900 leading-snug break-words">{countertop.label}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-2 leading-tight">{countertop.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Baños 60x60cm + Regla de Plato de Ducha */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">bathtub</span>
                  <span>Suelo en Baños (Gres Porcelánico 60x60cm)</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Plato ducha: Blanco Puro
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BATHROOM_GRES_60X60_TONES.map((bTone) => {
                  const isSelected = config.flooringBathroomGres60 === bTone.id;
                  return (
                    <button
                      key={bTone.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('flooringBathroomGres60', bTone.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: bTone.previewColor }}
                      />
                      <span className="text-xs font-bold text-stone-900 leading-snug break-words">{bTone.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terraza Exterior */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">deck</span>
                <span>Pavimento en Terraza Exterior / Balcón</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TERRACE_FLOORING_OPTIONS.map((tFloor) => {
                  const isSelected = config.flooringTerrace === tFloor.id;
                  return (
                    <button
                      key={tFloor.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('flooringTerrace', tFloor.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: tFloor.previewColor }}
                      />
                      <span className="text-xs font-bold text-stone-900 leading-snug break-words">{tFloor.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {calidadesSubTab === 'carpentry' && (
          <div className="space-y-4 animate-fadeIn">
            {/* A. Sistema y Tipo de Ventanas */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">window</span>
                <span>A. Sistema y Tipo de Ventanas</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WINDOW_TYPE_OPTIONS.map((wType) => {
                  const isSelected = config.windowType === wType.id;
                  return (
                    <button
                      key={wType.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('windowType', wType.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#c25e38] shrink-0">
                          {wType.icon}
                        </span>
                        <span className="text-xs font-bold text-stone-900 leading-snug break-words">
                          {wType.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-2 leading-tight">
                        {wType.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. Material y Acabado de Marcos de Ventana */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">palette</span>
                <span>B. Material y Acabado de Carpintería de Ventanas</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WINDOW_FRAME_OPTIONS.map((frame) => {
                  const isSelected = config.windowFrames === frame.id;
                  return (
                    <button
                      key={frame.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('windowFrames', frame.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: frame.colorPreview }}
                      />
                      <span className="text-xs font-bold text-stone-900 leading-snug break-words">{frame.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Puertas de paso y armarios */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#c25e38]">door_front</span>
                  <span>Puertas de Paso & Armarios Empotrados</span>
                </span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DOOR_FINISH_OPTIONS.map((door) => {
                  const isSelected = config.doorFinish === door.id;
                  return (
                    <button
                      key={door.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('doorFinish', door.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: door.colorPreview }}
                      />
                      <span className="text-xs font-bold text-stone-900 leading-snug break-words">{door.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pintura Muros Interiores */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">format_paint</span>
                <span>Paredes Interiores (Pintura lisa)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WALL_COLOR_OPTIONS.map((wall) => {
                  const isSelected = config.interiorWallColor === wall.id;
                  return (
                    <button
                      key={wall.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('interiorWallColor', wall.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: wall.hex }}
                      />
                      <span className="text-xs font-bold text-stone-900 leading-snug break-words">{wall.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pintura Muros Exteriores / Fachada */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">apartment</span>
                <span>Muros Exteriores & Fachada</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WALL_COLOR_OPTIONS.map((wall) => {
                  const isSelected = (config.exteriorWallColor || 'blanco_roto_luz') === wall.id;
                  return (
                    <button
                      key={wall.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateField('exteriorWallColor', wall.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-[#c25e38] bg-orange-50/50 ring-2 ring-[#c25e38]/30 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: wall.hex }}
                      />
                      <span className="text-xs font-bold text-stone-900 leading-snug break-words">{wall.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observaciones extras para el modelo */}
            <div className="space-y-1 pt-2 border-t border-stone-200/80">
              <label htmlFor="config-extra-details-textarea" className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">notes</span>
                <span>Instrucciones Especiales de Diseño (Opcional)</span>
              </label>
              <textarea
                id="config-extra-details-textarea"
                aria-label="Instrucciones Especiales de Diseño (Opcional)"
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
    )}

        {/* ============================================================== */}
        {/* PESTAÑA 5: CONFIGURACIÓN CORPORATIVA & FICHA COMERCIAL */}
        {/* ============================================================== */}
        {activeTab === 'config' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-200">
                    <span className="material-symbols-outlined text-[18px] text-[#0F2C59]">settings</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">5. Configuración & Membrete Oficial</h3>
                    <p className="text-xs text-stone-500">Logotipos corporativos, identificador de vivienda y ficha comercial</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-[#0F2C59] font-mono">
                  FICHA COMERCIAL
                </span>
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
              <div className="bg-white rounded-xl p-3 flex items-center justify-center min-h-[50px] border border-stone-200/60">
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

            {/* Logo de la Comercializadora con fondo blanco y rótulo COMERCIALIZA */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#991B1B]">storefront</span>
                  <span>Logo Comercializadora (COMERCIALIZA)</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-mono font-bold">
                  TERRAVALL
                </span>
              </div>

              {/* Vista previa en caja blanca oficial COMERCIALIZA */}
              <div className="bg-white rounded-xl p-2.5 flex flex-col items-center justify-center min-h-[64px] border border-stone-200/60">
                <span className="text-[9px] font-black text-[#991B1B] tracking-wider uppercase mb-1">
                  COMERCIALIZA
                </span>
                {config.commercialAgencyLogo ? (
                  <img
                    src={config.commercialAgencyLogo}
                    alt="Logo de la Comercializadora"
                    className="max-h-9 w-auto max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-stone-400 italic">Sin logo comercializadora</span>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2">
                <label className="flex-1 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
                  <span className="material-symbols-outlined text-[15px] text-[#991B1B]">upload</span>
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
                            updateField('commercialAgencyLogo', evt.target.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {config.commercialAgencyLogo !== DEFAULT_AGENCY_LOGO && (
                  <button
                    type="button"
                    onClick={() => updateField('commercialAgencyLogo', DEFAULT_AGENCY_LOGO)}
                    className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition cursor-pointer"
                    title="Restablecer logo oficial Terravall"
                  >
                    Restablecer
                  </button>
                )}

                {config.commercialAgencyLogo && (
                  <button
                    type="button"
                    onClick={() => updateField('commercialAgencyLogo', undefined)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-xl transition cursor-pointer"
                    title="Quitar logo"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Identificador de Vivienda: PORTAL - PISO - LETRA */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0F2C59]">home</span>
                  <span>Identificador de Vivienda (PORTAL - PISO - LETRA)</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-mono">
                  FICHA
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Se rotula en el encabezado de la ficha comercial y documentos PDF vectoriales (ej: PORTAL 1 - 2º B).
              </p>
              <div className="flex items-center bg-white border border-stone-300 focus-within:border-[#0F2C59] focus-within:ring-2 focus-within:ring-[#0F2C59]/20 rounded-xl px-3 py-2 gap-2 shadow-2xs transition">
                <span className="material-symbols-outlined text-[18px] text-stone-400">domain</span>
                <label htmlFor="config-tab-unit-id-input" className="sr-only">
                  Portal, Piso y Letra de la vivienda
                </label>
                <input
                  id="config-tab-unit-id-input"
                  type="text"
                  value={config.unitIdentifier || 'PORTAL 1 - 1º A'}
                  onChange={(e) => updateField('unitIdentifier', e.target.value.toUpperCase())}
                  placeholder="PORTAL 1 - 1º A"
                  className="bg-transparent border-none outline-none text-xs font-mono font-bold text-stone-900 placeholder:text-stone-400 w-full uppercase"
                />
              </div>
            </div>

            {/* Color de Fondo de los Puntos Identificadores */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0F2C59]">palette</span>
                  <span>Color de Puntos Identificadores (Estancias)</span>
                </span>
                <div
                  className="w-5 h-5 rounded-full border border-stone-300 shadow-2xs"
                  style={{ backgroundColor: config.markerBadgeColor || '#0F2C59' }}
                  title={config.markerBadgeColor || '#0F2C59'}
                />
              </div>
              <p className="text-[11px] text-stone-500">
                Tonalidad corporativa de los círculos numerados sobre el plano y las tablas comerciales.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'Azul Marino', hex: '#0F2C59' },
                  { label: 'Azul Noche', hex: '#0E3B64' },
                  { label: 'Terracota', hex: '#C25E38' },
                  { label: 'Verde Esmeralda', hex: '#166534' },
                  { label: 'Grafito', hex: '#334155' },
                  { label: 'Borgoña', hex: '#991B1B' }
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => updateField('markerBadgeColor', c.hex)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                      (config.markerBadgeColor || '#0F2C59') === c.hex
                        ? 'border-[#0F2C59] bg-blue-50 font-bold text-[#0F2C59] ring-1 ring-[#0F2C59]/30'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 6: CORRECCIONES PUNTUALES Y CONTROL DE VERSIONES */}
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
              <label htmlFor="panel-correction-input-textarea" className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c25e38]">terminal</span>
                <span>Orden de corrección en lenguaje natural</span>
              </label>
              <textarea
                id="panel-correction-input-textarea"
                aria-label="Orden de corrección en lenguaje natural"
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
                  'Cocina: solo vitrocerámica y fregadero (resto encimera)',
                  'Cama doble 160cm con cabecero',
                  'Ducha mineral blanco puro con mampara',
                  'Paredes en blanco roto cálido'
                ].map((chip) => (
                  <button
                    key={chip}
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
                        key={item.id || `version-${vNum}-${item.timestamp}`}
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
        {/* Chip de resumen de configuración activa con etiquetas interactivas */}
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600">
          <button
            type="button"
            onClick={() => handleSelectTab('presets')}
            className="font-bold text-stone-900 px-2 py-0.5 rounded-md bg-stone-200/80 hover:bg-stone-300 transition cursor-pointer"
            title="Ver/cambiar estilo y presets"
          >
            {selectedStyle.label}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('camera')}
            className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 font-medium hover:bg-stone-200 transition cursor-pointer"
            title="Ver/cambiar cámara y punto de vista"
          >
            {selectedCamera.label.split('(')[0].trim()}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('flooring')}
            className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 hover:border-amber-400 text-amber-900 font-bold transition cursor-pointer"
            title="Ver/cambiar suelos y baños"
          >
            🪵 {selectedLivingFloor.label}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('carpentry')}
            className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-emerald-900 font-bold transition cursor-pointer"
            title="Ver/cambiar puertas y ventanas"
          >
            🪟 {selectedWindowFrame.label.split('—')[0].trim()}
          </button>
          {markersCount > 0 && (
            <button
              type="button"
              onClick={() => handleSelectTab('rooms')}
              className="font-bold text-[#c25e38] px-2 py-0.5 rounded-md bg-orange-100/60 border border-orange-200 hover:bg-orange-200 transition cursor-pointer"
              title="Ver estancias identificadas"
            >
              📍 {markersCount} estancias
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSelectTab('config')}
            className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 hover:border-blue-300 text-[#0F2C59] font-bold transition cursor-pointer"
            title="Ver/cambiar logotipos y datos de la ficha comercial"
          >
            🏢 Logos & Ficha
          </button>
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