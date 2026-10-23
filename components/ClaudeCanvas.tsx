import React, { useState, useRef, useEffect } from 'react';
import { RoomMarker, DefectMark, RenderHistoryItem, FurnitureItem } from '../types';
import { SurfaceScheduleTable } from './SurfaceScheduleTable';
import { FurnitureLayer } from './canvas/FurnitureLayer';

export type CanvasViewMode = 'plano' | 'amueblado' | 'comparar' | 'ficha';

interface ClaudeCanvasProps {
  sourceImage: { base64: string; mimeType: string; name?: string } | null;
  renderedResult: { base64: string; mimeType: string } | null;
  isGenerating: boolean;
  roomMarkers: RoomMarker[];
  activeMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  isPinningMode: boolean;
  onCanvasClickToPositionMarker?: (x: number, y: number) => void;
  onUpdateMarkerPosition?: (id: string, x: number, y: number) => void;
  // Inpainting / Marcar zona con error
  isPaintingMode: boolean;
  onTogglePaintingMode: () => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  paintedStrokes: { id: string; points: { x: number; y: number }[] }[];
  onAddStroke: (stroke: { id: string; points: { x: number; y: number }[] }) => void;
  onClearStrokes: () => void;
  activeDefectMark?: DefectMark | null;
  onSetDefectMark?: (mark: DefectMark | null) => void;
  onAnnotationComplete?: (prefill: string) => void;
  // Versiones e historial
  history: RenderHistoryItem[];
  currentVersion: number;
  onSelectVersion: (item: RenderHistoryItem) => void;
  // Datos del proyecto y cartela
  projectTitle: string;
  unitIdentifier: string;
  // Mobiliario interactivo (Mover, Rotar, Eliminar)
  furnitureItems: FurnitureItem[];
  selectedFurnitureId: string | null;
  onSelectFurniture: (id: string | null) => void;
  onUpdateFurniture: (id: string, updates: Partial<FurnitureItem>) => void;
  onDeleteFurniture: (id: string) => void;
  // Control de vista
  viewMode: CanvasViewMode;
  onChangeViewMode: (mode: CanvasViewMode) => void;
  // Acciones
  onDropFile?: (file: File) => void;
  onUploadFile?: () => void;
  onEraseAtPoint?: (x: number, y: number) => void;
  isEraserMode?: boolean;
}

export function ClaudeCanvas({
  sourceImage,
  renderedResult,
  isGenerating,
  roomMarkers,
  activeMarkerId,
  onSelectMarker,
  isPinningMode,
  onCanvasClickToPositionMarker,
  onUpdateMarkerPosition,
  isPaintingMode,
  onTogglePaintingMode,
  brushSize,
  onChangeBrushSize,
  paintedStrokes,
  onAddStroke,
  onClearStrokes,
  activeDefectMark,
  onSetDefectMark,
  onAnnotationComplete,
  history,
  currentVersion,
  onSelectVersion,
  projectTitle,
  unitIdentifier,
  furnitureItems,
  selectedFurnitureId,
  onSelectFurniture,
  onUpdateFurniture,
  onDeleteFurniture,
  viewMode,
  onChangeViewMode,
  onDropFile,
  onUploadFile,
  onEraseAtPoint,
  isEraserMode = false
}: ClaudeCanvasProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [splitSliderPosition, setSplitSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);

  // Herramienta de anotación de error: pincel o pin puntual
  const [annotationTool, setAnnotationTool] = useState<'brush' | 'pin'>('brush');

  // Trazo actual de brocha
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const isDrawingStrokeRef = useRef<boolean>(false);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setZoomLevel(0.85);

  // Encontrar la estancia más cercana a unas coordenadas porcentuales (0-100)
  const findNearestRoom = (x: number, y: number) => {
    if (!roomMarkers || roomMarkers.length === 0) return null;
    let closest = roomMarkers[0];
    let minDist = 999999;
    roomMarkers.forEach((m) => {
      const dist = Math.hypot(m.x - x, m.y - y);
      if (dist < minDist) {
        minDist = dist;
        closest = m;
      }
    });
    return closest;
  };

  // Arrastre y click en canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    // Si está en modo borrador de textos
    if (isEraserMode && onEraseAtPoint) {
      onEraseAtPoint(x, y);
      return;
    }

    // Si está en modo colocar pin de nueva estancia
    if (isPinningMode && onCanvasClickToPositionMarker) {
      onCanvasClickToPositionMarker(x, y);
      return;
    }

    // Si está en modo SEÑALAR ERROR / MARCAR ZONA
    if (isPaintingMode) {
      if (annotationTool === 'pin') {
        const nearest = findNearestRoom(x, y);
        const mark: DefectMark = {
          id: `defect_${Date.now()}`,
          type: 'pin',
          x,
          y,
          color: '#ef4444',
          roomName: nearest?.name
        };
        if (onSetDefectMark) onSetDefectMark(mark);
        if (onAnnotationComplete) {
          onAnnotationComplete(`En el área señalada${nearest ? ` (${nearest.name})` : ''}: `);
        }
        return;
      }

      // Modo pincel
      isDrawingStrokeRef.current = true;
      setCurrentStroke([{ x, y }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    // Arrastrando marcador existente
    if (draggingMarkerId && onUpdateMarkerPosition) {
      onUpdateMarkerPosition(draggingMarkerId, x, y);
      return;
    }

    // Pintando trazo de error
    if (isPaintingMode && isDrawingStrokeRef.current) {
      setCurrentStroke((prev) => [...prev, { x, y }]);
    }

    // Moviendo slider de comparar
    if (isDraggingSlider) {
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const sliderX = Math.max(0, Math.min(100, ((e.clientX - containerRect.left) / containerRect.width) * 100));
        setSplitSliderPosition(sliderX);
      }
    }
  };

  const handlePointerUp = () => {
    if (isPaintingMode && isDrawingStrokeRef.current && currentStroke.length > 0) {
      onAddStroke({
        id: `stroke_${Date.now()}`,
        points: currentStroke
      });
      // Detectar estancia promedio del trazo
      const avgX = currentStroke.reduce((s, p) => s + p.x, 0) / currentStroke.length;
      const avgY = currentStroke.reduce((s, p) => s + p.y, 0) / currentStroke.length;
      const nearest = findNearestRoom(avgX, avgY);
      if (onAnnotationComplete) {
        onAnnotationComplete(`En la zona marcada${nearest ? ` (${nearest.name})` : ''}: `);
      }
      setCurrentStroke([]);
    }
    isDrawingStrokeRef.current = false;
    setDraggingMarkerId(null);
    setIsDraggingSlider(false);
  };

  // Convertir puntos porcentuales a path SVG
  const strokeToPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  };

  // Imagen activa a renderizar
  const currentImageSrc =
    viewMode === 'amueblado' && renderedResult
      ? `data:${renderedResult.mimeType};base64,${renderedResult.base64}`
      : sourceImage
      ? `data:${sourceImage.mimeType};base64,${sourceImage.base64}`
      : null;

  return (
    <div
      ref={canvasContainerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative flex-1 w-full h-full blueprint-grid flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* 1. Selector flotante superior de Vistas [ Plano | Amueblado | Comparar | Ficha ] + [ Señalar Error ] */}
      <div className="absolute top-4 z-30 flex items-center gap-2">
        {/* Píldora de Vistas */}
        <div className="flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full p-1 shadow-md">
          {(
            [
              { id: 'plano', label: 'Plano' },
              { id: 'amueblado', label: 'Amueblado' },
              { id: 'comparar', label: 'Comparar' },
              { id: 'ficha', label: 'Ficha' }
            ] as const
          ).map((tab) => {
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeViewMode(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Botón Destacado: Señalar Error / Marcar Zona */}
        {(sourceImage || renderedResult) && (
          <button
            onClick={onTogglePaintingMode}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              isPaintingMode
                ? 'bg-rose-600 text-white ring-2 ring-rose-400 animate-pulse'
                : activeDefectMark || paintedStrokes.length > 0
                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                : 'bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-700 hover:text-rose-600 hover:border-rose-300'
            }`}
            title="Haz clic para marcar o pintar una zona con error a corregir"
          >
            <span className="material-symbols-outlined text-[17px] text-rose-500">
              {isPaintingMode ? 'draw' : 'edit_location_alt'}
            </span>
            <span>
              {isPaintingMode
                ? 'Marcando error en plano...'
                : activeDefectMark || paintedStrokes.length > 0
                ? 'Zona de error señalada'
                : 'Señalar Error / Zona'}
            </span>
            {(activeDefectMark || paintedStrokes.length > 0) && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        )}
      </div>

      {/* 1.1 Barra Flotante de Herramientas de Anotación (Pincel vs Pin) */}
      {isPaintingMode && (
        <div className="absolute top-16 z-30 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl px-3 py-1.5 shadow-xl text-xs animate-fadeIn">
          <span className="text-slate-400 font-medium text-[11px] mr-1">Herramienta:</span>
          <button
            onClick={() => setAnnotationTool('brush')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
              annotationTool === 'brush' ? 'bg-rose-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">brush</span>
            <span>Pincel</span>
          </button>
          <button
            onClick={() => setAnnotationTool('pin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
              annotationTool === 'pin' ? 'bg-rose-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">pin_drop</span>
            <span>Pin puntual</span>
          </button>

          {annotationTool === 'brush' && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <span className="text-[11px] text-slate-400">Grosor:</span>
              <input
                type="range"
                min={10}
                max={60}
                value={brushSize}
                onChange={(e) => onChangeBrushSize(parseInt(e.target.value))}
                className="w-16 accent-rose-500 h-1 bg-slate-700 rounded cursor-pointer"
              />
            </div>
          )}

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          <button
            onClick={() => {
              onClearStrokes();
              if (onSetDefectMark) onSetDefectMark(null);
            }}
            className="text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-1 rounded cursor-pointer transition text-[11px]"
            title="Borrar marcas y empezar de nuevo"
          >
            Limpiar
          </button>

          <button
            onClick={onTogglePaintingMode}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold cursor-pointer transition shadow-xs flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">check</span>
            <span>Listo</span>
          </button>
        </div>
      )}

      {/* 2. Área Principal de Presentación del Plano */}
      <div
        className="relative max-w-full max-h-full flex items-center justify-center p-8 transition-transform duration-150 ease-out"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {currentImageSrc ? (
          <div
            className={`relative bg-white shadow-2xl rounded-sm p-4 border border-slate-200/80 max-h-[75vh] max-w-[80vw] flex items-center justify-center ${
              isPaintingMode ? 'cursor-crosshair' : 'cursor-default'
            }`}
            onPointerDown={handlePointerDown}
          >
            {/* Si está en modo Comparar (Split Slider) */}
            {viewMode === 'comparar' && renderedResult && sourceImage ? (
              <div className="relative overflow-hidden select-none" style={{ maxHeight: '72vh' }}>
                {/* Imagen Base (Plano) */}
                <img
                  ref={imageRef}
                  src={`data:${sourceImage.mimeType};base64,${sourceImage.base64}`}
                  alt="Plano Base"
                  className="max-h-[72vh] max-w-full object-contain pointer-events-none block"
                />

                {/* Imagen Amueblada superpuesta recortada por el slider */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${splitSliderPosition}%` }}
                >
                  <img
                    src={`data:${renderedResult.mimeType};base64,${renderedResult.base64}`}
                    alt="Plano Amueblado"
                    className="max-h-[72vh] max-w-none object-contain pointer-events-none block"
                    style={{
                      width: imageRef.current ? `${imageRef.current.clientWidth}px` : '100%',
                      height: imageRef.current ? `${imageRef.current.clientHeight}px` : '100%'
                    }}
                  />
                </div>

                {/* Línea divisoria del slider */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-40 flex items-center justify-center"
                  style={{ left: `${splitSliderPosition}%` }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingSlider(true);
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-white text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-[14px]">code</span>
                  </div>
                </div>
              </div>
            ) : viewMode === 'ficha' ? (
              /* Vista Ficha Comercial */
              <div className="w-[680px] bg-white p-6 border border-slate-200 rounded-lg shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{projectTitle}</h3>
                    <p className="text-xs text-slate-500">{unitIdentifier}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 rounded text-xs font-bold text-slate-700">
                    FICHA COMERCIAL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="h-48 bg-slate-50 border rounded-lg overflow-hidden flex items-center justify-center">
                    {sourceImage && (
                      <img
                        src={`data:${sourceImage.mimeType};base64,${sourceImage.base64}`}
                        alt="Plano 2D"
                        className="max-h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="h-48 bg-slate-50 border rounded-lg overflow-hidden flex items-center justify-center">
                    {renderedResult ? (
                      <img
                        src={`data:${renderedResult.mimeType};base64,${renderedResult.base64}`}
                        alt="Render 3D"
                        className="max-h-full object-contain"
                      />
                    ) : (
                      <p className="text-xs text-slate-400">Sin render 3D aún</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <SurfaceScheduleTable markers={roomMarkers} />
                </div>
              </div>
            ) : (
              /* Vista Estándar (Plano o Amueblado) */
              <div className="relative">
                <img
                  ref={imageRef}
                  src={currentImageSrc}
                  alt="Plano"
                  className="max-h-[72vh] max-w-full object-contain pointer-events-none block"
                />

                {/* Overlay de Trazos de Brocha (Inpainting / Defectos) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-30"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {paintedStrokes.map((s) => (
                    <path
                      key={s.id}
                      d={strokeToPath(s.points)}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={brushSize / 10}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.65"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }}
                    />
                  ))}
                  {currentStroke.length > 0 && (
                    <path
                      d={strokeToPath(currentStroke)}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={brushSize / 10}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.85"
                    />
                  )}
                </svg>

                {/* Pin puntual de defecto marcado */}
                {activeDefectMark && (
                  <div
                    style={{
                      left: `${activeDefectMark.x}%`,
                      top: `${activeDefectMark.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    className="absolute z-40 pointer-events-none flex flex-col items-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-600/90 border-2 border-white text-white flex items-center justify-center shadow-lg animate-bounce">
                      <span className="material-symbols-outlined text-[18px]">priority_high</span>
                    </div>
                    {activeDefectMark.roomName && (
                      <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white text-[10px] font-bold rounded shadow-md whitespace-nowrap">
                        {activeDefectMark.roomName}
                      </span>
                    )}
                  </div>
                )}

                {/* Marcadores numerados de estancia (Círculos oscuros estilo Claude) */}
                {viewMode === 'plano' &&
                  roomMarkers.map((marker, idx) => {
                    const isSelected = activeMarkerId === marker.id;
                    const num = idx + 1;

                    return (
                      <div
                        key={marker.id}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          onSelectMarker(marker.id);
                          setDraggingMarkerId(marker.id);
                        }}
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        className={`absolute z-20 w-6 h-6 rounded-full bg-[#1e293b] text-white flex items-center justify-center text-xs font-bold cursor-grab active:cursor-grabbing shadow-md border border-white/60 transition-transform hover:scale-110 ${
                          isSelected ? 'ring-2 ring-blue-500 scale-110' : ''
                        }`}
                        title={`${num}. ${marker.name || 'Estancia'}`}
                      >
                        {num}
                      </div>
                    );
                  })}

                {/* Capa de Mobiliario Interactivo (Arrastrar, Tecla R para girar, Supr para borrar) */}
                <FurnitureLayer
                  furnitureItems={furnitureItems}
                  selectedFurnitureId={selectedFurnitureId}
                  onSelectFurniture={onSelectFurniture}
                  onUpdateFurniture={onUpdateFurniture}
                  onDeleteFurniture={onDeleteFurniture}
                  canvasContainerRef={canvasContainerRef}
                  imageRef={imageRef}
                />
              </div>
            )}
          </div>
        ) : (
          /* Estado Vacío: Cargar Plano */
          <div
            onClick={onUploadFile}
            className="w-[480px] h-[340px] bg-white border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition shadow-sm group"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition mb-3">
              <span className="material-symbols-outlined text-[32px] text-slate-400 group-hover:text-blue-600">
                cloud_upload
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              Carga un plano arquitectónico
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              Arrastra un archivo aquí o haz clic para subirlo en formato PDF, PNG o JPG
            </p>
          </div>
        )}
      </div>

      {/* 3. Controles flotantes inferiores izquierdos de Zoom: [ - 49% + ⛶ ] */}
      <div className="absolute bottom-5 left-6 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl px-2 py-1 shadow-md text-xs font-semibold text-slate-700">
        <button
          onClick={handleZoomOut}
          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition cursor-pointer"
          title="Alejar"
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>
        <span className="px-1 text-slate-800 min-w-[38px] text-center font-bold">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition cursor-pointer"
          title="Acercar"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
        <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
        <button
          onClick={handleResetZoom}
          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition cursor-pointer"
          title="Ajustar al centro"
        >
          <span className="material-symbols-outlined text-[16px]">crop_free</span>
        </button>
      </div>

      {/* 4. Filmstrip / Carrusel de Versiones en la parte inferior */}
      {sourceImage && (
        <div className="absolute bottom-5 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1.5 shadow-md">
          {/* Miniatura Plano Base */}
          <button
            onClick={() => onChangeViewMode('plano')}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition cursor-pointer border ${
              viewMode === 'plano'
                ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/40'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            title="Plano base"
          >
            <div className="w-12 h-9 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
              <img
                src={`data:${sourceImage.mimeType};base64,${sourceImage.base64}`}
                alt="Plano base"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-700">Plano base</span>
          </button>

          {/* Miniaturas de Versiones Generadas */}
          {history.map((hist, idx) => {
            const isCurrent = renderedResult && renderedResult.base64 === hist.base64;
            const vNum = hist.versionNumber || history.length - idx;

            return (
              <button
                key={hist.id || idx}
                onClick={() => {
                  onSelectVersion(hist);
                  onChangeViewMode('amueblado');
                }}
                className={`flex flex-col items-center gap-1 p-1 rounded-xl transition cursor-pointer border ${
                  isCurrent && viewMode === 'amueblado'
                    ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                title={`Versión v${vNum}`}
              >
                <div className="w-12 h-9 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                  <img
                    src={`data:${hist.mimeType};base64,${hist.base64}`}
                    alt={`v${vNum}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-700">v{vNum}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Cajetín Técnico / Cartela en la esquina inferior derecha */}
      <div className="absolute bottom-5 right-6 z-30 flex flex-col items-end gap-1 pointer-events-none select-none">
        <div className="bg-white/95 backdrop-blur-md border border-slate-300 text-slate-800 text-[10px] rounded shadow-xs overflow-hidden leading-tight">
          <div className="px-2.5 py-1 border-b border-slate-200 font-bold bg-slate-50 text-slate-900">
            {projectTitle}
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200 px-2 py-0.5 text-slate-600">
            <span className="pr-1.5 font-medium">
              Vista: {viewMode === 'plano' ? 'Plano base' : viewMode === 'amueblado' ? 'Amueblado' : viewMode === 'comparar' ? 'Comparativa' : 'Ficha'}
            </span>
            <span className="px-1.5 font-medium">
              Versión: {viewMode === 'plano' ? '—' : `v${currentVersion}`}
            </span>
            <span className="pl-1.5 font-medium">Escala: S/E</span>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          v{currentVersion} · Propuesta Gemini Pro
        </span>
      </div>
    </div>
  );
}
