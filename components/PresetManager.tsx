import React, { useState } from 'react';
import { PresetConfig, RenderConfig } from '../types';
import { downloadJsonConfig } from '../services/downloadHelper';
import {
  INTERIOR_STYLES,
  CAMERA_ANGLES,
  FLOORING_LIVING_OPTIONS,
  LIGHTING_PRESETS
} from '../constants';

interface PresetManagerProps {
  currentConfig: RenderConfig;
  presets: PresetConfig[];
  activePresetId: string | null;
  onApplyPreset: (preset: PresetConfig) => void;
  onSavePreset: (name: string, config: RenderConfig) => void;
  onDeletePreset: (id: string) => void;
  onImportPresetJson?: (presetOrConfig: any, filename?: string) => void;
  onSetDefaultConfig?: (config: RenderConfig) => void;
  disabled?: boolean;
}

export function PresetManager({
  currentConfig,
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onImportPresetJson,
  onSetDefaultConfig,
  disabled
}: PresetManagerProps) {
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;
    onSavePreset(presetNameInput.trim(), currentConfig);
    setPresetNameInput('');
    setIsSavingNew(false);
  };

  const handleExportJson = (e: React.MouseEvent, preset: PresetConfig) => {
    e.stopPropagation();
    downloadJsonConfig(preset, `${preset.name.toLowerCase().replace(/\s+/g, '_')}_preset.json`);
  };

  const handleExportCurrentJson = () => {
    downloadJsonConfig(currentConfig, 'configuracion_render_plano_3d.json');
  };

  const processJsonFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (onImportPresetJson) {
          onImportPresetJson(parsed, file.name);
        }
      } catch (err: any) {
        alert(`No se pudo leer el archivo JSON: ${err?.message || 'Formato no válido'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processJsonFile(file);
    }
    // Resetear valor para permitir cargar el mismo archivo varias veces si se desea
    e.target.value = '';
  };

  // Helper labels en español legible para evitar identificadores técnicos truncados
  const getStyleLabel = (id?: string) => {
    if (!id) return '';
    const found = INTERIOR_STYLES.find((s) => s.id === id);
    return found ? found.label.replace('Estilo ', '') : id;
  };

  const getCameraLabel = (id?: string) => {
    if (!id) return '';
    const found = CAMERA_ANGLES.find((c) => c.id === id);
    return found ? found.label.split('(')[0].trim() : id;
  };

  const getFlooringLabel = (id?: string) => {
    if (!id) return '';
    const found = FLOORING_LIVING_OPTIONS.find((f) => f.id === id);
    return found ? found.label : id;
  };

  const getLightingLabel = (id?: string) => {
    if (!id) return '';
    const found = LIGHTING_PRESETS.find((l) => l.id === id);
    return found ? found.label.split('(')[0].trim() : id;
  };

  // Iconos y gradientes para los presets maestros
  const getPresetVisuals = (id: string) => {
    if (id.includes('nordic')) {
      return { icon: 'park', color: '#16A34A', gradient: 'from-emerald-50 to-stone-50' };
    }
    if (id.includes('mediterranean')) {
      return { icon: 'wb_sunny', color: '#D97706', gradient: 'from-amber-50 to-stone-50' };
    }
    if (id.includes('contemporary')) {
      return { icon: 'apartment', color: '#475569', gradient: 'from-slate-50 to-stone-50' };
    }
    if (id.includes('2d')) {
      return { icon: 'architecture', color: '#2563EB', gradient: 'from-blue-50 to-stone-50' };
    }
    return { icon: 'auto_awesome', color: '#c25e38', gradient: 'from-orange-50 to-stone-50' };
  };

  return (
    <div
      className={`space-y-3 relative transition-all rounded-2xl ${
        isDraggingJson ? 'ring-2 ring-[#c25e38] bg-orange-50/50' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingJson(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDraggingJson(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingJson(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && (file.name.endsWith('.json') || file.type.includes('json'))) {
          processJsonFile(file);
        }
      }}
    >
      {/* Input oculto para cargar archivos JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#c25e38]">bookmarks</span>
          <span>Plantillas y Memoria de Calidades</span>
        </span>

        {/* Barra de acciones JSON y Guardado */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Botón CARGAR JSON */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-[#0F2C59] hover:bg-[#081B38] text-white rounded-xl text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1"
            title="Cargar y aplicar archivo .json de configuración"
          >
            <span className="material-symbols-outlined text-[15px]">upload_file</span>
            <span>Cargar .JSON</span>
          </button>

          {/* Botón GUARDAR JSON ACTUAL */}
          <button
            type="button"
            disabled={disabled}
            onClick={handleExportCurrentJson}
            className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-[11px] font-semibold cursor-pointer transition shadow-2xs flex items-center gap-1"
            title="Descargar la configuración actual en un archivo .json"
          >
            <span className="material-symbols-outlined text-[15px] text-stone-500">download</span>
            <span>Guardar .JSON</span>
          </button>

          {/* Botón FIJAR COMO POR DEFECTO */}
          {onSetDefaultConfig && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSetDefaultConfig(currentConfig)}
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-semibold cursor-pointer transition flex items-center gap-1"
              title="Fijar esta configuración para que se cargue siempre al abrir la aplicación"
            >
              <span className="material-symbols-outlined text-[15px] text-amber-600">push_pin</span>
              <span className="hidden sm:inline">Siempre por Defecto</span>
            </button>
          )}

          {/* Botón GUARDAR PRESET LOCAL */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsSavingNew(!isSavingNew)}
            className="px-2 py-1.5 text-xs font-bold text-[#c25e38] hover:text-[#a84d2b] transition flex items-center gap-1 cursor-pointer shrink-0"
            title="Guardar como plantilla con nombre propio"
          >
            <span className="material-symbols-outlined text-[15px]">
              {isSavingNew ? 'close' : 'add'}
            </span>
            <span>{isSavingNew ? 'Cancelar' : 'Nueva Plantilla'}</span>
          </button>
        </div>
      </div>

      {/* Indicador de arrastre */}
      {isDraggingJson && (
        <div className="p-3 bg-orange-100 border-2 border-dashed border-[#c25e38] rounded-2xl text-center text-xs font-bold text-[#c25e38] animate-pulse">
          Suelta tu archivo .JSON aquí para cargarlo automáticamente
        </div>
      )}

      {/* Formulario guardar nuevo preset */}
      {isSavingNew && (
        <form onSubmit={handleSave} className="p-3 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-2 animate-fadeIn">
          <p className="text-[11px] font-medium text-stone-700">
            Guarda la memoria de calidades completa (pavimentos, carpintería, muros y modo) como preset reutilizable:
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="preset-name-input" className="text-[11px] font-semibold text-stone-700">
              Nombre de la memoria:
            </label>
            <div className="flex gap-2">
              <input
                id="preset-name-input"
                type="text"
                required
                disabled={disabled}
                placeholder="Ej: Promoción Dama de la Noche - Bloque 2"
                aria-label="Nombre de la memoria de calidades"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                className="flex-1 text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:border-[#c25e38]"
              />
              <button
                type="submit"
                disabled={disabled}
                className="px-4 py-2 bg-[#c25e38] hover:bg-[#a84d2b] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs shrink-0"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grid de Presets Maestros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {presets.map((preset) => {
          const isSelected = activePresetId === preset.id;
          const { icon, color, gradient } = getPresetVisuals(preset.id);
          const styleName = getStyleLabel(preset.config.interiorStyle);
          const cameraName = getCameraLabel(preset.config.cameraAngle);
          const floorName = getFlooringLabel(preset.config.flooringLiving);
          const lightName = getLightingLabel(preset.config.lighting);

          return (
            <div
              key={preset.id}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between gap-3 group relative overflow-hidden bg-gradient-to-br ${gradient} ${
                isSelected
                  ? 'border-[#c25e38] ring-2 ring-[#c25e38] shadow-md shadow-orange-500/10'
                  : 'border-stone-200/90 hover:border-stone-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className="flex items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer group/btn"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs mt-0.5"
                    style={{ backgroundColor: color }}
                  >
                    <span className="material-symbols-outlined text-[19px]">{icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-xs font-bold leading-snug break-words ${isSelected ? 'text-[#c25e38]' : 'text-stone-900 group-hover/btn:text-[#c25e38]'}`}>
                      {preset.name}
                    </h4>
                    <p className="text-[10px] text-stone-600 mt-0.5 leading-tight break-words">
                      {styleName} • {cameraName}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {onSetDefaultConfig && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefaultConfig(preset.config);
                      }}
                      className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition"
                      title="Fijar esta plantilla como predeterminada al arrancar la app"
                      aria-label={`Fijar preset ${preset.name} por defecto`}
                    >
                      <span className="material-symbols-outlined text-[16px]">push_pin</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleExportJson(e, preset)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-black/5 rounded-lg cursor-pointer transition"
                    title="Exportar archivo JSON"
                    aria-label={`Exportar preset ${preset.name} a JSON`}
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                  </button>
                  {!preset.isDefault && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePreset(preset.id);
                      }}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition"
                      title="Eliminar preset"
                      aria-label={`Eliminar preset ${preset.name}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Indicador de activo & resumen de calidades */}
              <button
                type="button"
                onClick={() => onApplyPreset(preset)}
                className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[10px] gap-2 text-left cursor-pointer w-full"
              >
                <span className="text-stone-600 font-medium leading-tight break-words">
                  {floorName} • {lightName}
                </span>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 font-bold text-[#c25e38] shrink-0 bg-white/80 px-2 py-0.5 rounded-full border border-orange-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c25e38]" />
                    Activo
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PresetManager;
