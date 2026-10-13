import React, { useState } from 'react';
import { PresetConfig, RenderConfig } from '../types';
import { downloadJsonConfig } from '../services/downloadHelper';

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
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#c25e38]">bookmarks</span>
          <span>Plantillas de Estilo Disponibles</span>
        </span>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsSavingNew(!isSavingNew)}
          className="text-xs font-bold text-[#c25e38] hover:text-[#a84d2b] transition flex items-center gap-1 cursor-pointer"
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
              className="px-4 py-2 bg-[#c25e38] hover:bg-[#a84d2b] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Grid de Presets Maestros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {presets.map((preset) => {
          const isSelected = activePresetId === preset.id;
          const { icon, color, gradient } = getPresetVisuals(preset.id);

          return (
            <div
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between gap-2.5 group relative overflow-hidden bg-gradient-to-br ${gradient} ${
                isSelected
                  ? 'border-[#c25e38] ring-2 ring-[#c25e38] shadow-sm'
                  : 'border-stone-200/90 hover:border-stone-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs"
                    style={{ backgroundColor: color }}
                  >
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#c25e38]' : 'text-stone-900'}`}>
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">
                      {preset.config.interiorStyle} • {preset.config.cameraAngle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleExportJson(e, preset)}
                    className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
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
                      className="p-1 text-stone-400 hover:text-red-600 rounded cursor-pointer"
                      title="Eliminar preset"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Indicador de activo */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-[10px]">
                <span className="text-stone-500 font-medium truncate">
                  {preset.config.flooringLiving} • {preset.config.lighting}
                </span>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 font-bold text-[#c25e38]">
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
