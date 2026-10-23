import React, { useRef } from 'react';

interface TabPlanoProps {
  sourceImage: { base64: string; mimeType: string; name?: string } | null;
  onUploadFile: () => void;
  onClearPlan: () => void;
  onDetectWithAI: () => void;
  isDetectingWithAI: boolean;
  isPlanIsolated: boolean;
  onToggleIsolatePlan: () => void;
  isTextCleaned: boolean;
  onToggleCleanText: () => void;
  removeOriginalFurniture: boolean;
  onToggleRemoveOriginalFurniture: (val: boolean) => void;
  isEraserMode: boolean;
  onToggleEraserMode: () => void;
  detectedTextCount?: number;
  imageDimensions?: { width: number; height: number } | null;
  onLoadSample: (url: string, name: string) => void;
}

export function TabPlano({
  sourceImage,
  onUploadFile,
  onClearPlan,
  onDetectWithAI,
  isDetectingWithAI,
  isPlanIsolated,
  onToggleIsolatePlan,
  isTextCleaned,
  onToggleCleanText,
  removeOriginalFurniture,
  onToggleRemoveOriginalFurniture,
  isEraserMode,
  onToggleEraserMode,
  detectedTextCount = 0,
  imageDimensions,
  onLoadSample
}: TabPlanoProps) {
  const fileName = sourceImage?.name || 'Plano de la vivienda';
  const shortName = fileName.length > 20 ? fileName.substring(0, 18) + '...' : fileName;

  return (
    <div className="flex flex-col gap-5 p-5 overflow-y-auto max-h-full font-sans text-slate-800">
      {/* Encabezado */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Plano</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Carga y prepara el plano que leerá el motor de IA.
        </p>
      </div>

      {/* Plano de la vivienda (Tarjeta) */}
      <div className="space-y-2">
        <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider block">
          Plano de la vivienda
        </label>

        {sourceImage ? (
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={`data:${sourceImage.mimeType};base64,${sourceImage.base64}`}
                  alt="Miniatura plano"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate" title={fileName}>
                  {shortName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height} px` : 'Plano cargado'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onUploadFile}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title="Sustituir plano"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
              </button>
              <button
                onClick={onClearPlan}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Quitar plano"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={onUploadFile}
            className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/20 group"
          >
            <span className="material-symbols-outlined text-[32px] text-slate-400 group-hover:text-blue-600 transition">
              cloud_upload
            </span>
            <p className="text-xs font-semibold text-slate-700 mt-1">
              Haz clic para cargar un plano
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Formatos soportados: PDF, PNG, JPG
            </p>
          </div>
        )}
      </div>

      {/* Lectura automática */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-800">Lectura automática</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          La IA lee nombres y superficies, localiza los rótulos que hay que borrar y encuadra solo la vivienda.
        </p>

        <button
          onClick={onDetectWithAI}
          disabled={!sourceImage || isDetectingWithAI}
          className="w-full py-2 px-3 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px] text-slate-600">
            {isDetectingWithAI ? 'sync' : 'document_scanner'}
          </span>
          <span>{isDetectingWithAI ? 'Analizando plano...' : 'Volver a analizar'}</span>
        </button>
      </div>

      {/* Preparación del plano */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-800">Preparación del plano</h3>

        {/* Switch Aislar vivienda */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 block">
              Aislar la vivienda
            </span>
            <span className="text-[11px] text-slate-500 block leading-tight">
              Fuera cartelas, precios, leyendas y márgenes.
            </span>
            {isPlanIsolated && (
              <button
                onClick={onToggleIsolatePlan}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">crop</span>
                <span>Recalcular encuadre por márgenes</span>
              </button>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPlanIsolated}
            onClick={onToggleIsolatePlan}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPlanIsolated ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                isPlanIsolated ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Switch Borrar rótulos y cifras */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 block">
              Borrar rótulos y cifras
            </span>
            <span className="text-[11px] text-slate-500 block leading-tight">
              {detectedTextCount > 0 ? `${detectedTextCount} rótulos detectados. ` : ''}
              Muros, puertas y ventanas se conservan.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isTextCleaned}
            onClick={onToggleCleanText}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isTextCleaned ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                isTextCleaned ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Switch Quitar el mobiliario dibujado */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 block">
              Quitar el mobiliario dibujado
            </span>
            <span className="text-[11px] text-slate-500 block leading-tight">
              En el plano amueblado solo se conservan muros, puertas y ventanas del original; el resto del dibujo se sustituye por la propuesta.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={removeOriginalFurniture}
            onClick={() => onToggleRemoveOriginalFurniture(!removeOriginalFurniture)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              removeOriginalFurniture ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                removeOriginalFurniture ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Tarjeta Goma de rótulos */}
        <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-800">Goma de rótulos</p>
            <p className="text-[11px] text-slate-500">
              Haz clic sobre un texto rebelde en el plano.
            </p>
          </div>
          <button
            onClick={onToggleEraserMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isEraserMode
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">ink_eraser</span>
            <span>{isEraserMode ? 'Borrando...' : 'Usar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
