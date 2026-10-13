import React, { useState, useRef, useEffect } from 'react';
import { CameraAngle, RoomMarker } from '../types';
import { ROOM_CATEGORIES } from '../constants';
interface PlanCanvasPreviewProps {
  sourceImage: { base64: string; mimeType: string; name?: string } | null;
  renderedResult: { base64: string; mimeType: string } | null;
  isGenerating: boolean;
  cameraAngle: CameraAngle;
  roomMarkers?: RoomMarker[];
  activeMarkerId?: string | null;
  isPinningMode?: boolean;
  onMarkerClick?: (id: string) => void;
  onCanvasClickToPositionMarker?: (x: number, y: number) => void;
  onClearPlan: () => void;
  onSelectFromGallery: () => void;
  onUploadLocalFile?: () => void;
  onDownloadRender?: () => void;
  downloadStatus?: 'idle' | 'downloading' | 'done';
}
export function PlanCanvasPreview({
  sourceImage,
  renderedResult,
  isGenerating,
  cameraAngle,
  roomMarkers = [],
  activeMarkerId = null,
  isPinningMode = false,
  onMarkerClick,
  onCanvasClickToPositionMarker,
  onClearPlan,
  onSelectFromGallery,
  onUploadLocalFile,
  onDownloadRender,
  downloadStatus = 'idle'
}: PlanCanvasPreviewProps) {
  const [activeTab, setActiveTab] = useState<'rendered' | 'split' | 'source'>('rendered');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [showMarkersOverlay, setShowMarkersOverlay] = useState<boolean>(true);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const is2DMode = cameraAngle === 'plan_2d_furnished';

  useEffect(() => {
    if (renderedResult) {
      setActiveTab('rendered');
    }
  }, [renderedResult]);
  if (!sourceImage && !renderedResult) {
    return (
      <div className="w-full h-full min-h-[480px] lg:min-h-[620px] bg-stone-100/70 border-2 border-dashed border-stone-300 rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all hover:border-[#c25e38]/50 hover:bg-stone-100">
        <div className="w-20 h-20 rounded-2xl bg-white shadow-sm border border-stone-200 flex items-center justify-center text-[#c25e38] mb-4">
          <span className="material-symbols-outlined text-[40px]">architecture</span>
        </div>
        <h3 className="font-serif italic text-2xl lg:text-3xl text-stone-800 mb-1">
          Ningún plano seleccionado
        </h3>
        <p className="text-stone-500 text-sm max-w-md mb-6">
          Sube un plano comercial de una vivienda (JPG/PNG) para generar la maqueta 3D amueblada o el plano 2D delineado de catálogo.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onUploadLocalFile && (
            <button
              onClick={onUploadLocalFile}
              className="px-6 py-3 rounded-xl bg-[#c25e38] hover:bg-[#a84d2b] text-white text-sm font-medium transition-all shadow-sm flex items-center gap-2 hover:shadow active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">upload_file</span>
              <span>Subir Archivo (JPG / PNG)</span>
            </button>
          )}
          <button
            onClick={onSelectFromGallery}
            className="px-5 py-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-sm font-medium transition-all shadow-2xs flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px] text-stone-500">photo_library</span>
            <span>Galería Flow</span>
          </button>
        </div>
      </div>
    );
  }
  const sourceDataUrl = sourceImage ? `data:${sourceImage.mimeType};base64,${sourceImage.base64}` : null;
  const renderDataUrl = renderedResult ? `data:${renderedResult.mimeType};base64,${renderedResult.base64}` : null;
  const currentViewingImage = (activeTab === 'source' || (!renderDataUrl && sourceDataUrl))
    ? sourceDataUrl
    : renderDataUrl;
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCanvasClickToPositionMarker) return;
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(2, Math.min(98, x));
    const clampedY = Math.max(2, Math.min(98, y));
    onCanvasClickToPositionMarker(clampedX, clampedY);
  };
  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Barra superior de visor */}
      <div className="px-4 py-2.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#c25e38]">apartment</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            {renderedResult
              ? (is2DMode ? 'Plano 2D Comercial Amueblado' : 'Visor 3D Dollhouse')
              : 'Plano Base'}
          </span>
          {isGenerating && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              {is2DMode ? 'Delineando Plano 2D & Amueblando...' : 'Levantando 3D & Amueblando...'}
            </span>
          )}
        </div>
        {/* Acciones del visor */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle de visibilidad de marcadores */}
          {roomMarkers.length > 0 && (
            <button
              onClick={() => setShowMarkersOverlay(!showMarkersOverlay)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${showMarkersOverlay
                  ? 'bg-orange-50 border-orange-200 text-[#c25e38]'
                  : 'bg-white border-stone-200 text-stone-500 hover:text-stone-800'
                }`}
              title="Mostrar u ocultar los marcadores de estancias sobre el plano"
            >
              <span className="material-symbols-outlined text-[15px]">
                {showMarkersOverlay ? 'visibility' : 'visibility_off'}
              </span>
              <span>{showMarkersOverlay ? 'Estancias' : 'Ocultar'} ({roomMarkers.length})</span>
            </button>
          )}
          {renderedResult && onDownloadRender && (
            <button
              onClick={onDownloadRender}
              disabled={downloadStatus !== 'idle'}
              className="px-3 py-1.5 rounded-lg bg-[#c25e38] hover:bg-[#a84d2b] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-75"
              title="Descargar imagen en alta resolución"
            >
              <span className="material-symbols-outlined text-[15px]">
                {downloadStatus === 'done' ? 'check' : 'download'}
              </span>
              <span>
                {downloadStatus === 'downloading'
                  ? 'Descargando...'
                  : downloadStatus === 'done'
                    ? 'Descargado ✓'
                    : 'Descargar Render'}
              </span>
            </button>
          )}
          {/* Selector de pestañas de visualización */}
          <div className="flex items-center gap-1 bg-stone-200/60 p-1 rounded-lg text-xs">
            {renderedResult && (
              <>
                <button
                  onClick={() => setActiveTab('rendered')}
                  className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1 ${activeTab === 'rendered' ? 'bg-white shadow text-stone-900 font-bold' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  title="Vista principal del render"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {is2DMode ? 'space_dashboard' : 'view_in_ar'}
                  </span>
                  <span>{is2DMode ? 'Plano 2D' : 'Plano 3D'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('split')}
                  className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1 ${activeTab === 'split' ? 'bg-white shadow text-stone-900 font-bold' : 'text-stone-600 hover:text-stone-900'
                    }`}
                >
                  <span className="material-symbols-outlined text-[14px]">compare</span>
                  <span>Comparativa</span>
                </button>
              </>
            )}
            {sourceImage && (
              <button
                onClick={() => setActiveTab('source')}
                className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1 ${activeTab === 'source' || (!renderedResult && activeTab !== 'rendered')
                    ? 'bg-white shadow text-stone-900 font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                  }`}
              >
                <span className="material-symbols-outlined text-[14px]">description</span>
                <span>Original</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Aviso de Modo Marcado */}
      {isPinningMode && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-amber-600">pin_drop</span>
            <span className="font-semibold">Modo Marcado Activo:</span>
            <span>Haz clic en la habitación deseada dentro del plano para posicionar la estancia.</span>
          </div>
          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
            Puntero activo
          </span>
        </div>
      )}
      {/* Área del Canvas con Modos de Visualización */}
      <div
        ref={imageContainerRef}
        onClick={handleContainerClick}
        className={`relative flex-1 min-h-[540px] lg:min-h-[660px] bg-[#121110] flex items-center justify-center overflow-hidden group select-none ${isPinningMode ? 'cursor-crosshair' : 'cursor-default'
          }`}
      >
        {/* Generando Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-40 bg-stone-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="relative w-20 h-20 mb-5">
              <div className="absolute inset-0 rounded-2xl border-2 border-orange-500/30 animate-ping" />
              <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-[#c25e38] to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <span className="material-symbols-outlined text-[36px] text-white animate-spin">autorenew</span>
              </div>
            </div>
            <h4 className="font-serif italic text-2xl lg:text-3xl text-stone-100 mb-1">
              {is2DMode ? 'Creando plano 2D comercial amueblado...' : 'Elevando tabiques y amueblando en 3D...'}
            </h4>
            <p className="text-stone-400 text-xs max-w-sm">
              Interpretando distribución arquitectónica, estancias identificadas y materiales seleccionados.
            </p>
          </div>
        )}
        {/* IMAGEN DE FONDO (Render 3D o Plano Original) */}
        {activeTab !== 'split' && currentViewingImage && (
          <div className="relative w-full h-full flex items-center justify-center p-3">
            <img
              src={currentViewingImage}
              alt="Plano Arquitectónico"
              className="w-full h-full object-contain max-h-[820px] rounded-lg shadow-2xl transition-all"
            />
            {/* PINES Y ETIQUETAS DE ESTANCIAS SUPERPUESTAS */}
            {showMarkersOverlay && roomMarkers.map((marker, index) => {
              const cat = ROOM_CATEGORIES.find(c => c.id === marker.category) || ROOM_CATEGORIES[0];
              const isSelected = activeMarkerId === marker.id;
              return (
                <div
                  key={marker.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMarkerClick) onMarkerClick(marker.id);
                  }}
                  style={{
                    left: `${marker.x}%`,
                    top: `${marker.y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group/pin transition-transform hover:scale-110 ${isSelected ? 'scale-110 z-40' : ''
                    }`}
                  title={`${marker.name} (${cat.label})`}
                >
                  <div className="relative flex flex-col items-center">
                    {/* Badge / Pin */}
                    <div
                      className={`px-2 py-0.5 rounded-full text-white font-bold text-[11px] shadow-lg flex items-center gap-1 border-2 transition-all ${isSelected
                          ? 'border-white ring-4 ring-[#c25e38]/50 ring-offset-1'
                          : 'border-white/80'
                        }`}
                      style={{ backgroundColor: cat.color }}
                    >
                      <span className="material-symbols-outlined text-[13px]">{cat.icon}</span>
                      <span className="truncate max-w-[90px]">{marker.name}</span>
                    </div>
                    {/* Flecha inferior del pin */}
                    <div
                      className="w-2 h-2 rotate-45 -mt-1 border-r-2 border-b-2 border-white/80"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* MODO SPLIT SLIDER */}
        {activeTab === 'split' && renderDataUrl && sourceDataUrl && (
          <div className="relative w-full h-full flex items-center justify-center bg-stone-950">
            <img
              src={renderDataUrl}
              alt={is2DMode ? "Plano 2D Comercial Amueblado" : "Render 3D Dollhouse"}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={sourceDataUrl}
                alt="Plano 2D original"
                className="absolute inset-0 w-full h-full object-contain bg-white"
                style={{ width: '100vw', maxWidth: 'none' }}
              />
            </div>
            <div
              className="absolute top-0 bottom-0 z-20 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-stone-900 shadow-lg border border-stone-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">drag_handle</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize z-20 w-full h-full"
            />
            <div className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono tracking-wider uppercase">
              Plano Original
            </div>
            <div className="absolute bottom-4 right-4 z-10 px-3 py-1 rounded bg-[#c25e38]/90 backdrop-blur-sm text-white text-[11px] font-mono tracking-wider uppercase">
              {is2DMode ? 'Plano 2D Amueblado' : 'Dollhouse 3D'}
            </div>
          </div>
        )}
      </div>
      {/* Barra de estado inferior */}
      <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-stone-400">info</span>
          <span>
            {sourceImage?.name ? `Archivo: ${sourceImage.name}` : 'Plano cargado en memoria de trabajo'}
          </span>
          {roomMarkers.length > 0 && (
            <span className="hidden sm:inline-block text-[11px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.2 rounded-full">
              {roomMarkers.length} estancias etiquetadas
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onUploadLocalFile && (
            <button
              onClick={onUploadLocalFile}
              className="text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              Subir Archivo
            </button>
          )}
          <span className="text-stone-300">|</span>
          <button
            onClick={onSelectFromGallery}
            className="text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Galería
          </button>
          <span className="text-stone-300">|</span>
          <button
            onClick={onClearPlan}
            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}