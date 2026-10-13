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

  return (
    <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#c25e38]">bookmarks</span>
          <span>Memorias de Calidades y Presets Maestros</span>
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsSavingNew(!isSavingNew)}
          className="text-xs font-semibold text-[#c25e38] hover:text-[#a84d2b] flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">
            {isSavingNew ? 'close' : 'add'}
          </span>
          <span>{isSavingNew ? 'Cancelar' : 'Guardar Actual'}</span>
        </button>
      </div>

      {/* Formulario guardar nuevo preset */}
      {isSavingNew && (
        <form onSubmit={handleSave} className="p-2.5 bg-orange-50/60 border border-orange-200 rounded-lg space-y-2">
          <p className="text-[11px] font-medium text-stone-700">
            Guarda la memoria de calidades completa (suelos, carpintería, muros y modo) como plantilla reutilizable:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              required
              disabled={disabled}
              placeholder="Nombre del preset (ej: Promoción Jardines de Olivo)"
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              className="flex-1 text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#c25e38]"
            />
            <button
              type="submit"
              disabled={disabled}
              className="px-3 py-1.5 bg-[#c25e38] hover:bg-[#a84d2b] text-white rounded-lg text-xs font-medium transition shadow-xs"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Grid de Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {presets.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                isSelected
                  ? 'border-[#c25e38] bg-orange-50/70 shadow-xs ring-1 ring-[#c25e38]'
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100 hover:border-stone-300'
              }`}
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-[#c25e38]' : 'text-stone-400'}`}>
                  {preset.isDefault ? 'verified' : 'tune'}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#c25e38]' : 'text-stone-800'}`}>
                    {preset.name}
                  </p>
                  <p className="text-[10px] text-stone-500 truncate">
                    {preset.config.interiorStyle} • {preset.config.cameraAngle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleExportJson(e, preset)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded"
                  title="Exportar preset en JSON"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                </button>
                {!preset.isDefault && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePreset(preset.id);
                    }}
                    className="p-1 text-stone-400 hover:text-red-600 rounded"
                    title="Eliminar preset"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
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
