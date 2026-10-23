import React, { useState } from 'react';
import { RenderConfig, PresetConfig, CameraAngle, InteriorStyle } from '../../types';
import { COLOR_PALETTE_SCHEMES } from '../../constants';

interface TabEstiloProps {
  config: RenderConfig;
  onChangeConfig: React.Dispatch<React.SetStateAction<RenderConfig>>;
  presets: PresetConfig[];
  activePresetId: string | null;
  onApplyPreset: (preset: PresetConfig) => void;
  onSavePreset: (name: string) => void;
  onApplyChangesInstant: () => void;
}

export function TabEstilo({
  config,
  onChangeConfig,
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onApplyChangesInstant
}: TabEstiloProps) {
  const [newPresetName, setNewPresetName] = useState('');

  // Estilos de dibujo (Realista / Catálogo / Técnico)
  const drawingStyles: {
    id: CameraAngle;
    label: string;
    desc: string;
    previewType: 'realista' | 'catalogo' | 'tecnico';
  }[] = [
    {
      id: 'cenital_90',
      label: 'Realista',
      desc: 'Suelos con textura a escala real y sombras suaves.',
      previewType: 'realista'
    },
    {
      id: 'plan_2d_furnished',
      label: 'Catálogo',
      desc: 'Colores limpios y acabados de catálogo comercial.',
      previewType: 'catalogo'
    },
    {
      id: 'isometric_45',
      label: 'Técnico',
      desc: 'Líneas CAD definidas con sombras volumétricas.',
      previewType: 'tecnico'
    }
  ];

  // Interiorismo (Nórdico, Contemporáneo, Mediterráneo, Japandi, Alta gama, Industrial)
  const interiorThemes: {
    id: InteriorStyle;
    title: string;
    desc: string;
    chips: string[];
  }[] = [
    {
      id: 'nordic_scandi',
      title: 'Nórdico',
      desc: 'Maderas claras, lino y luz limpia',
      chips: ['#e2ded6', '#b7a896', '#59695d']
    },
    {
      id: 'contemporary_minimal',
      title: 'Contemporáneo',
      desc: 'Líneas puras y luz indirecta',
      chips: ['#e4e5e7', '#a1a4a8', '#4b4d50', '#252628']
    },
    {
      id: 'mediterranean_warm',
      title: 'Mediterráneo',
      desc: 'Cal, yute y terracota',
      chips: ['#f2e6d6', '#c47d4e', '#7c8868']
    },
    {
      id: 'japandi_zen',
      title: 'Japandi',
      desc: 'Listones de roble y papel',
      chips: ['#e0d8cc', '#a8947c', '#675848', '#34312d']
    },
    {
      id: 'luxury_hotel',
      title: 'Alta gama',
      desc: 'Mármol y latón cepillado',
      chips: ['#f8f6f0', '#d8cebe', '#9e8d77', '#2b3942']
    },
    {
      id: 'industrial_loft',
      title: 'Industrial',
      desc: 'Acero negro y cuero',
      chips: ['#edf0f2', '#97a2aa', '#4e565c', '#8a5632']
    }
  ];

  // Gamas de color seleccionadas
  const activeColorPalette = config.colorPalette || 'light_soft_pastel';

  const handleSavePresetClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSavePreset(newPresetName.trim());
    setNewPresetName('');
  };

  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto max-h-full font-sans text-slate-800">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Estilo</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Estilo de dibujo, interiorismo y color.
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

      {/* Estilos guardados */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-800 block">
          Estilos guardados
        </label>
        <div className="flex items-center gap-2">
          <select
            value={activePresetId || ''}
            onChange={(e) => {
              const selected = presets.find((p) => p.id === e.target.value);
              if (selected) onApplyPreset(selected);
            }}
            className="flex-1 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 px-3 py-2 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              const p = presets.find((pr) => pr.id === activePresetId);
              if (p) onApplyPreset(p);
            }}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
            <span>Aplicar</span>
          </button>
        </div>

        {/* Guardar estilo actual */}
        <form onSubmit={handleSavePresetClick} className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Guardar el estilo actual como..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-1.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!newPresetName.trim()}
            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 cursor-pointer"
            title="Guardar nuevo preset"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
          </button>
        </form>
      </div>

      {/* Estilo de dibujo */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-800 block">
          Estilo de dibujo
        </label>

        <div className="grid grid-cols-3 gap-2">
          {drawingStyles.map((style) => {
            const isSelected = config.cameraAngle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onChangeConfig((prev) => ({ ...prev, cameraAngle: style.id }))}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Miniatura gráfica visual ilustrada */}
                <div className="w-full h-11 rounded-lg border border-slate-200/90 overflow-hidden relative flex items-center justify-center p-1 bg-slate-50">
                  {style.previewType === 'realista' && (
                    <div className="w-full h-full bg-[#dfd0bd] rounded flex items-center justify-center relative shadow-inner">
                      <div className="w-6 h-7 bg-[#94a3b8] rounded-xs shadow-xs border border-slate-400 flex items-center justify-center">
                        <div className="w-4 h-2 bg-white/70 rounded-xs -mt-3 shadow-2xs" />
                      </div>
                    </div>
                  )}
                  {style.previewType === 'catalogo' && (
                    <div className="w-full h-full bg-[#f1f5f9] rounded flex items-center justify-center relative">
                      <div className="w-6 h-7 bg-[#cbd5e1] rounded-xs border border-slate-400 flex items-center justify-center">
                        <div className="w-4 h-2 bg-white rounded-xs -mt-3" />
                      </div>
                    </div>
                  )}
                  {style.previewType === 'tecnico' && (
                    <div className="w-full h-full bg-white rounded flex items-center justify-center relative border border-dashed border-slate-300">
                      <div className="w-6 h-7 border-2 border-slate-900 rounded-xs flex items-center justify-center">
                        <div className="w-4 h-2 border border-slate-900 rounded-xs -mt-3" />
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-xs font-bold text-slate-800 self-start px-0.5">
                  {style.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leyenda del estilo seleccionado */}
        <p className="text-[11px] text-slate-500">
          {drawingStyles.find((s) => s.id === config.cameraAngle)?.desc ||
            'Suelos con textura a escala real y sombras suaves.'}
        </p>

        {/* Switch Sombras bajo el mobiliario */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-slate-800">
            Sombras bajo el mobiliario
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={true}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out translate-x-4" />
          </button>
        </div>
      </div>

      {/* Interiorismo (Cards 2 columnas con chips) */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-800 block">
          Interiorismo
        </label>

        <div className="grid grid-cols-2 gap-2">
          {interiorThemes.map((theme) => {
            const isSelected = config.interiorStyle === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onChangeConfig((prev) => ({ ...prev, interiorStyle: theme.id }))}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Barra superior de paleta con chips */}
                <div className="flex h-4 w-full rounded-md overflow-hidden border border-slate-200/80">
                  {theme.chips.map((col, cIdx) => (
                    <div
                      key={cIdx}
                      style={{ backgroundColor: col }}
                      className="flex-1 h-full"
                    />
                  ))}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">{theme.title}</p>
                  <p className="text-[11px] text-slate-500 leading-tight line-clamp-1">
                    {theme.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gama de color */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-800 block">
          Gama de color
        </label>

        <div className="grid grid-cols-3 gap-2">
          {COLOR_PALETTE_SCHEMES.slice(0, 9).map((palette) => {
            const isSelected = activeColorPalette === palette.id;
            return (
              <button
                key={palette.id}
                onClick={() => onChangeConfig((prev) => ({ ...prev, colorPalette: palette.id }))}
                className={`p-2 rounded-xl border text-left flex flex-col gap-1.5 transition cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-500/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Barra de colores */}
                <div className="flex h-3.5 w-full rounded overflow-hidden border border-slate-200/80">
                  {palette.colors.slice(0, 4).map((c, idx) => (
                    <div key={idx} style={{ backgroundColor: c }} className="flex-1 h-full" />
                  ))}
                </div>

                <span className="text-[11px] font-semibold text-slate-800 truncate" title={palette.label}>
                  {palette.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
