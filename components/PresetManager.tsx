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
  disabled?: boolean;
}

export function PresetManager({
  currentConfig,
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  disabled
}: PresetManagerProps) {
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#c25e38]">bookmarks</span>
          <span>Plantillas de Estilo Disponibles</span>
        </span>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsSavingNew(!isSavingNew)}
          className="text-xs font-bold text-[#c25e38] hover:text-[#a84d2b] transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[15px]">
            {isSavingNew ? 'close' : 'add'}
          </span>
          <span>{isSavingNew ? 'Cancelar' : 'Guardar Memoria Actual'}</span>
        </button>
      </div>

      {/* Formulario guardar nuevo preset */}
      {isSavingNew && (
        <form onSubmit={handleSave} className="p-3 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-2 animate-fadeIn">
          <p className="text-[11px] font-medium text-stone-700">
            Guarda la memoria de calidades completa (pavimentos, carpintería, muros y modo) como preset reutilizable:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              required
              disabled={disabled}
              placeholder="Ej: Promoción Dama de la Noche - Bloque 2"
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
              onClick={() => onApplyPreset(preset)}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between gap-3 group relative overflow-hidden bg-gradient-to-br ${gradient} ${
                isSelected
                  ? 'border-[#c25e38] ring-2 ring-[#c25e38] shadow-md shadow-orange-500/10'
                  : 'border-stone-200/90 hover:border-stone-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs mt-0.5"
                    style={{ backgroundColor: color }}
                  >
                    <span className="material-symbols-outlined text-[19px]">{icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-xs font-bold leading-snug break-words ${isSelected ? 'text-[#c25e38]' : 'text-stone-900'}`}>
                      {preset.name}
                    </h4>
                    <p className="text-[10px] text-stone-600 mt-0.5 leading-tight break-words">
                      {styleName} • {cameraName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleExportJson(e, preset)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-black/5 rounded-lg cursor-pointer transition"
                    title="Exportar archivo JSON"
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
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Indicador de activo & resumen de calidades */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[10px] gap-2">
                <span className="text-stone-600 font-medium leading-tight break-words">
                  {floorName} • {lightName}
                </span>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 font-bold text-[#c25e38] shrink-0 bg-white/80 px-2 py-0.5 rounded-full border border-orange-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c25e38]" />
                    Activo
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PresetManager;
