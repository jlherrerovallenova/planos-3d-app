import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CameraAngle, RoomMarker, RoomCategory } from '../types';
import { ROOM_CATEGORIES, SAMPLE_PLANS } from '../constants';
import { SurfaceScheduleTable } from './SurfaceScheduleTable';
import { PdfExportModal } from './PdfExportModal';
import { sortRoomMarkers } from '../services/roomSorter';
import {
  exportCommercialBrochureImage,
  exportCommercialBrochurePDF,
  exportPlanOnlyPDF
} from '../services/downloadHelper';
import { CorrectionCommandBar } from './CorrectionCommandBar';

interface PlanCanvasPreviewProps {
  sourceImage: { base64: string; mimeType: string; name?: string } | null;
  renderedResult: { base64: string; mimeType: string } | null;
  isGenerating: boolean;
  cameraAngle: CameraAngle;
  roomMarkers?: RoomMarker[];
  projectTitle?: string;
  activeMarkerId?: string | null;
  isPinningMode?: boolean;
  onMarkerClick?: (id: string) => void;
  onCanvasClickToPositionMarker?: (x: number, y: number) => void;
  onUpdateMarker?: (id: string, updates: Partial<RoomMarker>) => void;
  onDeleteMarker?: (id: string) => void;
  onTogglePinningMode?: () => void;
  onClearPlan: () => void;
  onSelectFromGallery: () => void;
  onUploadLocalFile?: () => void;
  onLoadSamplePlan?: (url: string, name: string) => void;
  onDownloadRender?: () => void;
  downloadStatus?: 'idle' | 'downloading' | 'done';
  onDetectWithAI?: () => void;
  isDetectingWithAI?: boolean;
  onCleanPlanTexts?: () => void;
  isCleaningPlanText?: boolean;
  onEraseTextAtPoint?: (xPercent: number, yPercent: number) => void;
  // Corrección puntual y versiones
  onApplyCorrection?: (instruction: string) => Promise<void>;
  currentVersion?: number;
  canUndo?: boolean;
  onUndoToPreviousVersion?: () => void;
  // Soporte PDF
  isConvertingPdf?: boolean;
  pdfPagesInfo?: {
    currentPage: number;
    numPages: number;
  } | null;
  onPdfPageChange?: (page: number) => void;
  onDropFile?: (file: File) => void;
  // Personalización de color de puntos identificadores
  markerBadgeColor?: string;
  onChangeMarkerBadgeColor?: (color: string) => void;
  // Logo de la promoción para fichas comerciales
  promotionLogo?: string | null;
  onChangePromotionLogo?: (logo: string | null) => void;
  // Aislamiento / recorte automático de plano
  onIsolatePlan?: () => void;
  isPlanIsolated?: boolean;
}

function getContrastTextColor(hexColor?: string): string {
  if (!hexColor) return '#FFFFFF';
  const clean = hexColor.replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 170 ? '#18181B' : '#FFFFFF';
}

export function PlanCanvasPreview({
  sourceImage,
  renderedResult,
  isGenerating,
  cameraAngle,
  roomMarkers = [],
  projectTitle = 'Proyecto Residencial Los Álamos',
  activeMarkerId = null,
  isPinningMode = false,
  markerBadgeColor = '#0F2C59',
  onChangeMarkerBadgeColor,
  promotionLogo,
  onChangePromotionLogo,
  onIsolatePlan,
  isPlanIsolated = false,
  onMarkerClick,
  onCanvasClickToPositionMarker,
  onUpdateMarker,
  onDeleteMarker,
  onTogglePinningMode,
  onClearPlan,
  onSelectFromGallery,
  onUploadLocalFile,
  onLoadSamplePlan,
  onDownloadRender,
  downloadStatus = 'idle',
  onDetectWithAI,
  isDetectingWithAI = false,
  onCleanPlanTexts,
  isCleaningPlanText = false,
  onEraseTextAtPoint,
  onApplyCorrection,
  currentVersion = 1,
  canUndo = false,
  onUndoToPreviousVersion,
  isConvertingPdf = false,
  pdfPagesInfo = null,
  onPdfPageChange,
  onDropFile
}: PlanCanvasPreviewProps) {
  const badgeBg = markerBadgeColor || '#0F2C59';
  const badgeText = getContrastTextColor(badgeBg);
  const [activeTab, setActiveTab] = useState<'ficha' | 'rendered' | 'split' | 'source'>('rendered');
  const [commandPrefillText, setCommandPrefillText] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isEraserMode, setIsEraserMode] = useState<boolean>(false);
  const [showMarkersOverlay, setShowMarkersOverlay] = useState<boolean>(true);
  const [showScheduleOverlay, setShowScheduleOverlay] = useState<boolean>(true);
  const [isExportingFicha, setIsExportingFicha] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);

  // Refs de contenedores específicos de imagen
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const fichaPlanRef = useRef<HTMLDivElement | null>(null);
  const basePlanRef = useRef<HTMLDivElement | null>(null);
  const renderPlanRef = useRef<HTMLDivElement | null>(null);

  // Estados y refs para arrastrar y mover marcadores (Drag and Drop)
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [areMarkersLocked, setAreMarkersLocked] = useState<boolean>(false);
  const dragContainerRef = useRef<HTMLElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const is2DMode = cameraAngle === 'plan_2d_furnished';
  const sortedMarkers = useMemo(() => sortRoomMarkers(roomMarkers || []), [roomMarkers]);

  // Iniciar arrastre de un círculo de estancia
  const handleMarkerDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    markerId: string,
    containerElem: HTMLElement | null
  ) => {
    e.stopPropagation();
    if (areMarkersLocked) return;
    if (!containerElem) return;
    dragContainerRef.current = containerElem;
    setDraggingMarkerId(markerId);
    isDraggingRef.current = true;
    if (onMarkerClick) onMarkerClick(markerId);
  };

  // Listener global para mover el marcador mientras se arrastra con el ratón o táctil
  useEffect(() => {
    if (!draggingMarkerId) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !dragContainerRef.current || !onUpdateMarker) return;
      const rect = dragContainerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.max(2, Math.min(98, Math.round(rawX * 10) / 10));
      const clampedY = Math.max(2, Math.min(98, Math.round(rawY * 10) / 10));

      onUpdateMarker(draggingMarkerId, { x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      setDraggingMarkerId(null);
      dragContainerRef.current = null;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [draggingMarkerId, onUpdateMarker]);

  // Cambiar automáticamente a pestaña Ficha Comercial cuando llega el resultado renderizado
  useEffect(() => {
    if (renderedResult) {
      setActiveTab('ficha');
    }
  }, [renderedResult]);

  // Si no hay resultado todavía, asegurar que se muestre el source
  useEffect(() => {
    if (!renderedResult && sourceImage && activeTab !== 'source' && activeTab !== 'ficha') {
      setActiveTab('source');
    }
  }, [renderedResult, sourceImage]);

  // Exportar Ficha Comercial Completa (Plano + Cuadro de Superficies) en Imagen
  const handleExportFicha = async () => {
    const targetImg = renderDataUrl || sourceDataUrl;
    if (!targetImg) return;
    setIsExportingFicha(true);
    await exportCommercialBrochureImage({
      imageSrc: targetImg,
      projectTitle,
      markers: sortedMarkers,
      markerBadgeColor: badgeBg,
      promotionLogo: promotionLogo || undefined,
      filename: `ficha_comercial_${projectTitle.toLowerCase().replace(/[^\w]/g, '_')}.png`
    });
    setIsExportingFicha(false);
  };

  // Abrir selector de exportación PDF
  const handleExportPDF = () => {
    const targetImg = renderDataUrl || sourceDataUrl;
    if (!targetImg) return;
    setIsPdfModalOpen(true);
  };

  // Imprimir Ficha
  const handlePrintFicha = () => {
    window.print();
  };

  // Manejo de clicks en el plano para modo borrador o modo marcador
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, refElem: HTMLElement | null) => {
    if (!refElem) return;
    if (isEraserMode && onEraseTextAtPoint) {
      e.stopPropagation();
      const rect = refElem.getBoundingClientRect();
      const xPercent = Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(1, Math.min(99, ((e.clientY - rect.top) / rect.height) * 100));
      onEraseTextAtPoint(xPercent, yPercent);
      return;
    }
    if (isPinningMode && onCanvasClickToPositionMarker) {
      const rect = refElem.getBoundingClientRect();
      const xPercent = Math.max(2, Math.min(98, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10));
      const yPercent = Math.max(2, Math.min(98, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10));
      onCanvasClickToPositionMarker(xPercent, yPercent);
    }
  };

  // Manejo de clicks en el canvas (cerrar popovers si están abiertos)
  const handleContainerClick = () => {
    if (editingMarkerId) {
      setEditingMarkerId(null);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(2.5, prev + 0.25));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.75, prev - 0.25));
  const handleZoomReset = () => setZoomLevel(1);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onDropFile) {
      onDropFile(e.dataTransfer.files[0]);
    }
  };

  // EMPTY STATE: Cuando no hay plano cargado
  if (!sourceImage && !renderedResult) {
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="w-full h-full min-h-[540px] bg-white rounded-3xl border border-stone-200/90 shadow-sm flex flex-col justify-between p-6 lg:p-8 overflow-hidden relative"
      >
        {/* Overlay si se está convirtiendo un PDF */}
        {isConvertingPdf && (
          <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 text-white">
            <div className="w-12 h-12 border-4 border-[#c25e38] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-base font-semibold">Procesando plano PDF en alta resolución...</p>
            <p className="text-xs text-stone-300 mt-1">Renderizando vectores y líneas arquitectónicas</p>
          </div>
        )}

        {/* Glow de fondo arquitectónico */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-stone-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-auto pt-4">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#c25e38] to-[#e07a5f] text-white flex items-center justify-center shadow-lg shadow-[#c25e38]/20">
              <span className="material-symbols-outlined text-[38px]">architecture</span>
            </div>
            <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs shadow-md">
              ✨
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 mb-3 border border-stone-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c25e38] animate-pulse" />
            Paso 1: Sube o elige tu plano
          </span>

          <h3 className="font-serif italic text-3xl lg:text-4xl text-stone-900 font-normal mb-2 tracking-tight">
            Comienza con tu plano 2D
          </h3>
          <p className="text-stone-500 text-sm max-w-md leading-relaxed mb-6">
            Arrastra el plano comercial, anteproyecto o croquis de la vivienda en <strong>PDF, JPG o PNG</strong>. La IA levantará la maqueta 3D amueblada respetando todos tus tabiques.
          </p>

          {/* Botones de acción principales */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {onUploadLocalFile && (
              <button
                onClick={onUploadLocalFile}
                className="px-6 py-3.5 rounded-xl bg-[#c25e38] hover:bg-[#a84d2b] text-white text-sm font-semibold transition-all shadow-md shadow-[#c25e38]/25 flex items-center gap-2 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span>Subir plano (PDF / JPG / PNG)</span>
              </button>
            )}

            <button
              onClick={onSelectFromGallery}
              className="px-5 py-3.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-sm font-medium transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:border-stone-400"
            >
              <span className="material-symbols-outlined text-[20px] text-stone-500">photo_library</span>
              <span>Galería de proyectos</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Planos de Demostración para 1 clic */}
        {onLoadSamplePlan && SAMPLE_PLANS && SAMPLE_PLANS.length > 0 && (
          <div className="relative z-10 pt-4 border-t border-stone-200/80">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#c25e38]">lightbulb</span>
                <span>¿No tienes un plano a mano? Prueba con estas muestras reales:</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_PLANS.map((sample, idx) => (
                <div
                  key={idx}
                  onClick={() => onLoadSamplePlan(sample.url, sample.name)}
                  className="group p-3 rounded-2xl bg-stone-50/80 hover:bg-stone-100/90 border border-stone-200/90 hover:border-[#c25e38]/60 transition-all cursor-pointer flex items-center gap-3.5 shadow-2xs"
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-14 h-14 object-cover rounded-xl border border-stone-200 shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 truncate">{sample.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                        {sample.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{sample.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-stone-400 group-hover:text-[#c25e38] transition-colors shrink-0">
                    arrow_forward
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const sourceDataUrl = sourceImage ? `data:${sourceImage.mimeType};base64,${sourceImage.base64}` : null;
  const renderDataUrl = renderedResult ? `data:${renderedResult.mimeType};base64,${renderedResult.base64}` : null;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col bg-stone-900 rounded-3xl border border-stone-800 shadow-xl overflow-hidden relative ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* 1. Header Toolbar del Visor */}
      <div className="px-4 py-3 bg-stone-950/80 backdrop-blur-md border-b border-stone-800 flex items-center justify-between flex-wrap gap-2 text-white z-20">
        {/* Título de estado y pestañas */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 p-1 rounded-xl">
            {/* Pestaña Ficha Comercial con Superficies */}
            {(renderedResult || sourceImage) && (
              <button
                onClick={() => setActiveTab('ficha')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'ficha'
                    ? 'bg-[#0F2C59] text-white shadow-xs border border-blue-400/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span>Ficha Comercial</span>
              </button>
            )}

            {renderedResult && (
              <>
                <button
                  onClick={() => setActiveTab('rendered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'rendered'
                      ? 'bg-[#c25e38] text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {is2DMode ? 'space_dashboard' : 'view_in_ar'}
                  </span>
                  <span>{is2DMode ? 'Plano 2D Comercial' : 'Maqueta 3D'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('split')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'split'
                      ? 'bg-[#c25e38] text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">compare</span>
                  <span>Comparativa 2D / 3D</span>
                </button>
              </>
            )}

            {sourceImage && (
              <button
                onClick={() => setActiveTab('source')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'source' || (!renderedResult && activeTab !== 'rendered' && activeTab !== 'ficha')
                    ? 'bg-stone-800 text-stone-100 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                <span>Plano Base 2D</span>
              </button>
            )}
          </div>

          {/* Badge de estado de generación */}
          {isGenerating && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-medium animate-pulse">Renderizando maqueta 3D con IA...</span>
            </div>
          )}

          {/* Selector de páginas si el plano proviene de un PDF multipágina */}
          {pdfPagesInfo && pdfPagesInfo.numPages > 1 && onPdfPageChange && (
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-xl text-xs text-stone-200">
              <span className="material-symbols-outlined text-[16px] text-red-400">picture_as_pdf</span>
              <span className="font-semibold text-stone-300">Pág:</span>
              <button
                type="button"
                onClick={() => onPdfPageChange(pdfPagesInfo.currentPage - 1)}
                disabled={pdfPagesInfo.currentPage <= 1 || isConvertingPdf}
                className="p-1 hover:bg-stone-800 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Página anterior del PDF"
              >
                <span className="material-symbols-outlined text-[15px]">chevron_left</span>
              </button>
              <span className="px-1.5 font-mono font-bold text-white bg-stone-800 rounded">
                {pdfPagesInfo.currentPage} / {pdfPagesInfo.numPages}
              </span>
              <button
                type="button"
                onClick={() => onPdfPageChange(pdfPagesInfo.currentPage + 1)}
                disabled={pdfPagesInfo.currentPage >= pdfPagesInfo.numPages || isConvertingPdf}
                className="p-1 hover:bg-stone-800 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Página siguiente del PDF"
              >
                <span className="material-symbols-outlined text-[15px]">chevron_right</span>
              </button>
            </div>
          )}

          {/* Badge de conversión PDF */}
          {isConvertingPdf && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              <span className="font-medium animate-pulse">Cargando página PDF...</span>
            </div>
          )}
        </div>

        {/* Acciones del Canvas a la derecha */}
        <div className="flex items-center gap-2">
          {/* Botón Limpiar Todos los Textos con IA */}
          {onCleanPlanTexts && (sourceImage || renderedResult) && (
            <button
              type="button"
              onClick={onCleanPlanTexts}
              disabled={isCleaningPlanText}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-500/50 text-amber-200 hover:text-white hover:bg-amber-600/40 disabled:opacity-50"
              title="Eliminar automáticamente todos los nombres de estancias y números del plano con IA"
            >
              <span className={`material-symbols-outlined text-[16px] ${isCleaningPlanText ? 'animate-spin' : ''}`}>
                {isCleaningPlanText ? 'autorenew' : 'auto_fix_high'}
              </span>
              <span>{isCleaningPlanText ? 'Limpiando...' : 'Limpiar Textos'}</span>
            </button>
          )}

          {/* Botón Borrador Manual de Texto */}
          {onEraseTextAtPoint && (sourceImage || renderedResult) && (
            <button
              type="button"
              onClick={() => setIsEraserMode(!isEraserMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                isEraserMode
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30 font-bold animate-pulse'
                  : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
              title={
                isEraserMode
                  ? 'Borrador activado. Haz clic sobre cualquier texto en el plano para borrarlo con el suelo'
                  : 'Borrador manual: haz clic sobre cualquier texto o nombre para borrarlo con el color del suelo'
              }
            >
              <span className="material-symbols-outlined text-[16px]">
                {isEraserMode ? 'ink_eraser' : 'brush'}
              </span>
              <span>{isEraserMode ? 'Borrador ACTIVO' : 'Borrador'}</span>
            </button>
          )}

          {/* Botón Fijar / Desbloquear Puntos */}
          {roomMarkers.length > 0 && (
            <button
              onClick={() => setAreMarkersLocked(!areMarkersLocked)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                areMarkersLocked
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30'
                  : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
              title={
                areMarkersLocked
                  ? 'Puntos fijados. Haz clic para desbloquear y permitir moverlos'
                  : 'Fijar puntos para evitar movimientos accidentales'
              }
            >
              <span className="material-symbols-outlined text-[16px]">
                {areMarkersLocked ? 'lock' : 'lock_open'}
              </span>
              <span>{areMarkersLocked ? 'Puntos Fijados' : 'Fijar Puntos'}</span>
            </button>
          )}

          {/* Botones contextuales cuando está activa la Ficha Comercial */}
          {activeTab === 'ficha' && (
            <>
              <button
                onClick={handleExportFicha}
                disabled={isExportingFicha}
                className="px-3.5 py-1.5 rounded-xl bg-[#0F2C59] hover:bg-[#1a4280] disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border border-blue-400/30"
                title="Descargar Ficha Comercial completa (Plano + Cuadro de Superficies) en alta resolución"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isExportingFicha ? 'progress_activity' : 'download'}
                </span>
                <span>{isExportingFicha ? 'Generando...' : 'Descargar Ficha'}</span>
              </button>

              <button
                onClick={handlePrintFicha}
                className="p-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition cursor-pointer"
                title="Imprimir o Guardar Ficha en PDF"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
              </button>
            </>
          )}

          {/* Toggle de Cuadro de Superficies Flotante en vistas 3D o 2D */}
          {activeTab !== 'ficha' && roomMarkers.length > 0 && (
            <button
              onClick={() => setShowScheduleOverlay(!showScheduleOverlay)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showScheduleOverlay
                  ? 'bg-[#0F2C59] text-white border-blue-400/40 shadow-xs'
                  : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
              title={showScheduleOverlay ? 'Ocultar cuadro de superficies' : 'Mostrar cuadro de superficies'}
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
              <span>{showScheduleOverlay ? 'Superficies ON' : 'Superficies'}</span>
            </button>
          )}

          {/* Toggle de Modo Marcador / Pines */}
          {onTogglePinningMode && (
            <button
              onClick={onTogglePinningMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isPinningMode
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-xs font-bold'
                  : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
              title="Fija o arrastra estancias directamente sobre el plano"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPinningMode ? 'touch_app' : 'pin_drop'}
              </span>
              <span>{isPinningMode ? 'Modo Marcador ACTIVO' : 'Marcar Estancias'}</span>
            </button>
          )}

          {/* Selector rápido de color de pines */}
          {roomMarkers.length > 0 && onChangeMarkerBadgeColor && (
            <label
              className="p-1.5 rounded-xl border border-stone-700 bg-stone-800/80 hover:bg-stone-700 transition cursor-pointer flex items-center gap-1.5 relative overflow-hidden"
              title="Color de los puntos identificadores (haz clic para cambiar libremente)"
            >
              <span
                className="w-4 h-4 rounded-full border border-white/60 shadow-xs shrink-0"
                style={{ backgroundColor: badgeBg }}
              />
              <span className="text-[11px] font-mono text-stone-300 font-bold hidden md:inline">
                {badgeBg}
              </span>
              <input
                type="color"
                value={badgeBg}
                onChange={(e) => onChangeMarkerBadgeColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          )}

          {/* Botón Aislar solo el plano (eliminar precios y textos exteriores) */}
          {sourceImage && onIsolatePlan && (
            <button
              onClick={onIsolatePlan}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isPlanIsolated
                  ? 'bg-emerald-700/80 text-emerald-100 border-emerald-500 shadow-xs'
                  : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
              title={
                isPlanIsolated
                  ? 'Plano aislado: se han eliminado textos y precios exteriores. Clic para alternar original.'
                  : 'Aislar solo el plano: recorta automáticamente precios, cartelas y textos exteriores.'
              }
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPlanIsolated ? 'crop_free' : 'crop'}
              </span>
              <span>{isPlanIsolated ? 'Plano Aislado' : 'Aislar Plano'}</span>
            </button>
          )}

          {/* Ocultar/Mostrar overlay de marcadores */}
          {roomMarkers.length > 0 && activeTab !== 'ficha' && (
            <button
              onClick={() => setShowMarkersOverlay(!showMarkersOverlay)}
              className={`p-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                showMarkersOverlay
                  ? 'bg-stone-800 border-stone-700 text-stone-200'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
              title={showMarkersOverlay ? 'Ocultar pines' : 'Mostrar pines'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {showMarkersOverlay ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          )}

          {/* Botón Descargar Render Directo (PNG) */}
          {renderedResult && onDownloadRender && activeTab !== 'ficha' && (
            <button
              onClick={onDownloadRender}
              disabled={downloadStatus !== 'idle'}
              className="px-3.5 py-1.5 rounded-xl bg-[#c25e38] hover:bg-[#a84d2b] disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">
                {downloadStatus === 'done' ? 'check' : 'download'}
              </span>
              <span>
                {downloadStatus === 'downloading'
                  ? 'Descargando...'
                  : downloadStatus === 'done'
                  ? '¡Descargado!'
                  : 'Descargar Render'}
              </span>
            </button>
          )}

          {/* Botón Descargar PDF */}
          {(renderedResult || sourceImage) && (
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Descargar plano y cuadro de superficies en PDF"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>{isExportingPDF ? 'Creando PDF...' : 'Descargar PDF'}</span>
            </button>
          )}

          {/* Cambiar plano o borrar */}
          <button
            onClick={onClearPlan}
            className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition cursor-pointer"
            title="Cambiar plano o limpiar"
          >
            <span className="material-symbols-outlined text-[18px]">change_circle</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition cursor-pointer"
            title="Pantalla completa"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Área Central del Canvas */}
      <div
        className={`relative flex-1 flex items-center justify-center p-4 overflow-hidden select-none ${
          isEraserMode
            ? 'cursor-crosshair'
            : isPinningMode
            ? 'cursor-crosshair'
            : 'cursor-default'
        }`}
        style={{
          background: 'radial-gradient(circle at center, #1c1917 0%, #0c0a09 100%)'
        }}
      >
        {/* Banner informativo cuando el modo borrador está activo */}
        {isEraserMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-rose-600/95 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-rose-400 flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-[18px]">ink_eraser</span>
            <span>Haz clic directamente sobre cualquier texto o nombre en el plano para borrarlo con el color del suelo</span>
            <button
              type="button"
              onClick={() => setIsEraserMode(false)}
              className="ml-2 px-2 py-0.5 rounded bg-black/25 hover:bg-black/40 text-white font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Banner informativo cuando el modo de colocación de pines está activo */}
        {isPinningMode && !isEraserMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-400/90 backdrop-blur-md text-stone-950 px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-amber-300 flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-[18px]">touch_app</span>
            <span>Haz clic en cualquier punto del plano para ubicar o desplazar la estancia</span>
          </div>
        )}

        {/* Loading Overlay al generar */}
        {isGenerating && (
          <div className="absolute inset-0 z-40 bg-stone-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl border-4 border-[#c25e38]/30 border-t-[#c25e38] animate-spin flex items-center justify-center" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[24px]">view_in_ar</span>
              </div>
            </div>
            <h4 className="font-serif italic text-2xl text-white font-normal mb-2">
              Generando Maqueta Arquitectónica 3D
            </h4>
            <p className="text-stone-400 text-xs max-w-md leading-relaxed mb-4">
              La IA está interpretando tus tabiques, levantando muros a 1.2m, aplicando pavimentos seleccionados y configurando iluminación fotorrealista.
            </p>
            <div className="w-64 h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#c25e38] to-amber-400 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {/* CONTENEDOR DE IMAGEN (Con soporte de zoom) */}
        <div
          ref={imageContainerRef}
          onClick={handleContainerClick}
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{ transform: activeTab === 'ficha' ? 'none' : `scale(${zoomLevel})` }}
        >
          {/* MODO 0: FICHA COMERCIAL DE VENTA CON CUADRO DE SUPERFICIES ÚTILES */}
          {activeTab === 'ficha' ? (
            <div className="w-full max-w-7xl mx-auto bg-white text-stone-900 rounded-2xl shadow-2xl border border-stone-200/90 p-5 sm:p-7 flex flex-col justify-between max-h-[86vh] overflow-y-auto animate-fadeIn select-text">
              {/* Encabezado Comercial */}
              <div className="border-b border-stone-200 pb-3 mb-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {promotionLogo && (
                    <div className="bg-white p-1.5 rounded-xl border border-stone-200/90 shadow-2xs flex items-center justify-center shrink-0">
                      <img
                        src={promotionLogo}
                        alt="Logo de la Promoción"
                        className="h-9 sm:h-11 w-auto max-w-[190px] object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: badgeBg }} />
                      <h2 className="text-base sm:text-lg font-black tracking-tight uppercase font-sans" style={{ color: badgeBg }}>
                        {projectTitle || 'Vivienda Residencial'}
                      </h2>
                    </div>
                    <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mt-0.5">
                      FICHA COMERCIAL • PLANO AMUEBLADO Y CUADRO DE SUPERFICIES ÚTILES
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-stone-100 text-stone-600 text-[11px] font-bold border border-stone-200 font-mono">
                    REF: VT-01
                  </span>

                  {onChangePromotionLogo && (
                    <label
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Cambiar o subir logo de la promoción"
                    >
                      <span className="material-symbols-outlined text-[15px]">add_photo_alternate</span>
                      <span>Logo</span>
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
                                onChangePromotionLogo(evt.target.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}

                  <button
                    onClick={handleExportFicha}
                    disabled={isExportingFicha}
                    className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Descargar Ficha en Imagen PNG"
                  >
                    <span className="material-symbols-outlined text-[15px]">image</span>
                    <span>{isExportingFicha ? 'Generando...' : 'PNG'}</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                    className="px-3.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    title="Descargar Ficha Comercial en PDF de alta resolución"
                  >
                    <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                    <span>{isExportingPDF ? 'Creando PDF...' : 'Descargar PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Cuerpo de la Ficha: Plano a la Izquierda (75% del ancho) y Cuadro de Superficies a la Derecha (25%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center flex-1 my-auto">
                {/* Columna Izquierda / Central: Plano Renderizado o Base (Ocupa al menos el 75% con 9 de 12 columnas) */}
                <div className="lg:col-span-9 flex flex-col items-center justify-center bg-white rounded-xl p-2 sm:p-3 border border-stone-300 shadow-2xs min-h-[440px] max-h-[72vh] w-full">
                  {renderDataUrl || sourceDataUrl ? (
                    <>
                      <div
                        ref={fichaPlanRef}
                        onClick={(e) => handleImageClick(e, fichaPlanRef.current)}
                        className={`relative inline-block max-h-[66vh] max-w-full select-none ${
                          isEraserMode ? 'cursor-crosshair ring-2 ring-rose-500 rounded-lg' : ''
                        }`}
                      >
                        <img
                          src={renderDataUrl || sourceDataUrl!}
                          alt="Plano Ficha Comercial"
                          className="max-h-[66vh] w-auto max-w-full object-contain rounded-lg shadow-sm block pointer-events-none select-none"
                        />

                        {/* Círculos azules interactivos y arrastrables con número blanco */}
                        {sortedMarkers.map((marker, idx) => {
                          const isDragging = draggingMarkerId === marker.id;
                          return (
                            <div
                              key={marker.id || idx}
                              onMouseDown={(e) => handleMarkerDragStart(e, marker.id, fichaPlanRef.current)}
                              onTouchStart={(e) => handleMarkerDragStart(e, marker.id, fichaPlanRef.current)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                left: `${marker.x}%`,
                                top: `${marker.y}%`,
                                backgroundColor: badgeBg,
                                color: badgeText
                              }}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-xs select-none z-30 font-sans transition-transform ${
                                areMarkersLocked
                                  ? 'cursor-default'
                                  : 'cursor-grab active:cursor-grabbing hover:scale-120'
                              } ${
                                isDragging
                                  ? 'scale-135 ring-4 ring-blue-400 shadow-2xl cursor-grabbing'
                                  : ''
                              }`}
                              title={
                                areMarkersLocked
                                  ? `Estancia #${idx + 1} (Fijada)`
                                  : `Estancia #${idx + 1} (Arrastra para recolocar)`
                              }
                            >
                              <span>{idx + 1}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Barra de control de fijación de puntos */}
                      <div className="mt-2.5 flex items-center justify-between w-full max-w-md px-1 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] select-none">
                          <span
                            className={`material-symbols-outlined text-[15px] ${
                              areMarkersLocked ? 'text-emerald-600' : 'text-blue-600'
                            }`}
                          >
                            {areMarkersLocked ? 'lock' : 'pan_tool'}
                          </span>
                          <span
                            className={
                              areMarkersLocked
                                ? 'text-emerald-700 font-semibold'
                                : 'text-stone-500 font-medium'
                            }
                          >
                            {areMarkersLocked
                              ? 'Puntos fijados (protegidos contra movimientos)'
                              : 'Arrastra cualquier círculo a su estancia'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAreMarkersLocked(!areMarkersLocked)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                            areMarkersLocked
                              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          }`}
                          title={
                            areMarkersLocked
                              ? 'Haz clic para desbloquear y permitir mover los puntos'
                              : 'Fijar los puntos para que no se puedan mover'
                          }
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {areMarkersLocked ? 'lock_open' : 'lock'}
                          </span>
                          <span>{areMarkersLocked ? 'Desbloquear Puntos' : 'Fijar Puntos'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-stone-400 text-xs italic">Carga un plano para visualizar la ficha</div>
                  )}
                </div>

                {/* Columna Derecha: Cuadro de Superficies Útiles (25% del ancho) */}
                <div className="lg:col-span-3 flex flex-col justify-center items-center lg:items-end w-full">
                  {onDetectWithAI && (
                    <div className="w-full mb-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={onDetectWithAI}
                        disabled={isDetectingWithAI || (!sourceDataUrl && !renderDataUrl)}
                        className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${isDetectingWithAI ? 'animate-spin' : ''}`}>
                          {isDetectingWithAI ? 'autorenew' : 'auto_awesome'}
                        </span>
                        <span>
                          {isDetectingWithAI ? 'Analizando plano y limpiando textos...' : 'Extraer estancias y limpiar textos con IA'}
                        </span>
                      </button>

                      {onCleanPlanTexts && (
                        <button
                          type="button"
                          onClick={onCleanPlanTexts}
                          disabled={isCleaningPlanText || (!sourceDataUrl && !renderDataUrl)}
                          className="w-full px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Borrar todos los textos y superficies rotulados en el plano para dejar únicamente los círculos con números"
                        >
                          <span className={`material-symbols-outlined text-[15px] ${isCleaningPlanText ? 'animate-spin' : ''}`}>
                            {isCleaningPlanText ? 'autorenew' : 'auto_fix_high'}
                          </span>
                          <span>
                            {isCleaningPlanText ? 'Borrando textos...' : 'Limpiar nombres y m² del plano'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                  <SurfaceScheduleTable markers={sortedMarkers} markerBadgeColor={badgeBg} />
                </div>
              </div>

              {/* Pie de Ficha con Cláusula Legal */}
              <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400">
                <span>
                  Documento con carácter comercial y orientativo. Las superficies corresponden a superficie útil interior estimada.
                </span>
                <span className="font-medium text-stone-500 hidden sm:inline">
                  Estudio de Arquitectura
                </span>
              </div>
            </div>
          ) : activeTab === 'split' && sourceDataUrl && renderDataUrl ? (
            <div className="relative max-h-[82vh] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-stone-700">
              {/* Imagen 3D de fondo */}
              <img
                src={renderDataUrl}
                alt="Render 3D"
                className="max-h-[82vh] w-auto max-w-full object-contain block select-none pointer-events-none"
              />

              {/* Imagen 2D recortada superpuesta */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={sourceDataUrl}
                  alt="Plano 2D Original"
                  className="max-h-[82vh] w-auto max-w-full object-contain block"
                />
              </div>

              {/* Input deslizador invisible para control de arrastre */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />

              {/* Línea divisoria vertical con Glassmorphism */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10 shadow-2xl"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-stone-900 text-xs font-bold flex items-center justify-center shadow-xl border border-stone-300">
                  <span className="material-symbols-outlined text-[18px]">unfold_more</span>
                </div>
              </div>

              {/* Etiquetas flotantes en el comparador */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-stone-950/80 backdrop-blur-md text-white text-[11px] font-semibold border border-stone-800 pointer-events-none z-10">
                Plano Original 2D
              </div>
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#c25e38]/90 backdrop-blur-md text-white text-[11px] font-semibold border border-[#c25e38] pointer-events-none z-10 shadow-lg">
                Render 3D Fotorrealista
              </div>
            </div>
          ) : activeTab === 'rendered' && renderDataUrl ? (
            /* MODO 2: RENDER 3D FINAL */
            <div
              ref={renderPlanRef}
              onClick={(e) => handleImageClick(e, renderPlanRef.current)}
              className={`relative max-h-[82vh] inline-block rounded-2xl overflow-hidden shadow-2xl border border-stone-800 select-none ${
                isEraserMode ? 'cursor-crosshair ring-2 ring-rose-500' : ''
              }`}
            >
              <img
                src={renderDataUrl}
                alt="Render 3D Arquitectónico"
                className="max-h-[82vh] w-auto max-w-full object-contain block rounded-2xl pointer-events-none"
              />

              {/* OVERLAY DE PINES DE ESTANCIAS EN RENDER */}
              {showMarkersOverlay &&
                sortedMarkers.map((marker, idx) => {
                  const isDragging = draggingMarkerId === marker.id;
                  const isSelected = activeMarkerId === marker.id;

                  return (
                    <div
                      key={marker.id || idx}
                      onMouseDown={(e) => handleMarkerDragStart(e, marker.id, renderPlanRef.current)}
                      onTouchStart={(e) => handleMarkerDragStart(e, marker.id, renderPlanRef.current)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMarkerClick) onMarkerClick(marker.id);
                      }}
                      style={{
                        left: `${marker.x}%`,
                        top: `${marker.y}%`,
                        backgroundColor: badgeBg,
                        color: badgeText
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-xs select-none z-30 font-sans transition-transform ${
                        areMarkersLocked
                          ? 'cursor-default'
                          : 'cursor-grab active:cursor-grabbing hover:scale-120'
                      } ${
                        isDragging
                          ? 'scale-135 ring-4 ring-blue-400 shadow-2xl cursor-grabbing'
                          : isSelected
                          ? 'scale-125 ring-4 ring-blue-400 shadow-2xl'
                          : ''
                      }`}
                      title={
                        areMarkersLocked
                          ? `Estancia #${idx + 1} (Fijada)`
                          : `Estancia #${idx + 1} (Arrastra para recolocar)`
                      }
                    >
                      <span>{idx + 1}</span>
                    </div>
                  );
                })}

              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-stone-950/80 backdrop-blur-md text-stone-300 text-[10px] font-semibold border border-stone-800 flex items-center gap-1.5 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Render en Alta Definición</span>
              </div>
            </div>
          ) : sourceDataUrl ? (
            /* MODO 3: PLANO 2D BASE (Con Pines Interactivos) */
            <div
              ref={basePlanRef}
              onClick={(e) => handleImageClick(e, basePlanRef.current)}
              className={`relative max-h-[82vh] inline-block rounded-2xl overflow-hidden shadow-2xl border border-stone-800 select-none ${
                isEraserMode ? 'cursor-crosshair ring-2 ring-rose-500' : ''
              }`}
            >
                <img
                  src={sourceDataUrl}
                  alt="Plano Base 2D"
                  className="max-h-[82vh] w-auto max-w-full object-contain block rounded-2xl pointer-events-none"
                />

                {/* OVERLAY DE PINES DE ESTANCIAS */}
                {showMarkersOverlay &&
                  sortedMarkers.map((marker, idx) => {
                    const cat = ROOM_CATEGORIES.find((c) => c.id === marker.category);
                    const isSelected = activeMarkerId === marker.id;
                    const isEditing = editingMarkerId === marker.id;
                    const isDragging = draggingMarkerId === marker.id;

                    return (
                      <div
                        key={marker.id || idx}
                        onMouseDown={(e) => handleMarkerDragStart(e, marker.id, basePlanRef.current)}
                        onTouchStart={(e) => handleMarkerDragStart(e, marker.id, basePlanRef.current)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onMarkerClick) onMarkerClick(marker.id);
                          setEditingMarkerId(isEditing ? null : marker.id);
                        }}
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group ${
                          areMarkersLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                        } ${
                          isDragging ? 'z-30 cursor-grabbing' : ''
                        }`}
                        title={
                          areMarkersLocked
                            ? `Estancia #${idx + 1} (Fijada)`
                            : `Estancia #${idx + 1} (Arrastra para recolocar)`
                        }
                      >
                        {/* Círculo con número profesional */}
                        <div
                          style={{
                            backgroundColor: badgeBg,
                            color: badgeText
                          }}
                          className={`relative w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-xs font-sans transition-all duration-200 select-none ${
                            isDragging
                              ? 'scale-135 ring-4 ring-blue-400 shadow-2xl'
                              : isSelected
                              ? 'scale-125 ring-4 ring-blue-400 shadow-2xl'
                              : areMarkersLocked
                              ? ''
                              : 'hover:scale-115'
                          }`}
                        >
                          <span>{idx + 1}</span>
                        </div>

                        {/* Popover / Quick Edit al hacer click en el pin */}
                        {isEditing && onUpdateMarker && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 bg-white text-stone-900 rounded-2xl shadow-2xl border border-stone-200 p-3 z-30 animate-fadeIn"
                          >
                            <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 mb-2">
                              <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px] text-[#c25e38]">edit_location</span>
                                <span>Estancia #{idx + 1}</span>
                              </span>
                              {onDeleteMarker && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteMarker(marker.id);
                                    setEditingMarkerId(null);
                                  }}
                                  className="text-stone-400 hover:text-red-600 text-xs"
                                  title="Eliminar estancia"
                                >
                                  Borrar
                                </button>
                              )}
                            </div>

                            <div className="space-y-2 text-xs">
                              <div>
                                <label className="text-[10px] font-medium text-stone-500 block mb-0.5">Nombre:</label>
                                <input
                                  type="text"
                                  value={marker.name}
                                  onChange={(e) => onUpdateMarker(marker.id, { name: e.target.value })}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-medium text-stone-500 block mb-0.5">Tipo de estancia:</label>
                                <select
                                  value={marker.category}
                                  onChange={(e) =>
                                    onUpdateMarker(marker.id, { category: e.target.value as RoomCategory })
                                  }
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800"
                                >
                                  {ROOM_CATEGORIES.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-medium text-stone-500 block mb-0.5">Observaciones de mobiliario:</label>
                                <input
                                  type="text"
                                  placeholder="Ej: Sofá chaiselongue, cama 160..."
                                  value={marker.notes || ''}
                                  onChange={(e) => onUpdateMarker(marker.id, { notes: e.target.value })}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditingMarkerId(null)}
                              className="mt-2.5 w-full py-1 bg-[#c25e38] hover:bg-[#a84d2b] text-white rounded-lg text-xs font-semibold text-center cursor-pointer transition shadow-xs"
                            >
                              Guardar
                            </button>

                            {onApplyCorrection && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCommandPrefillText(`Estancia #${idx + 1} (${marker.name}): `);
                                  setEditingMarkerId(null);
                                }}
                                className="mt-1.5 w-full py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-700 rounded-lg text-xs font-bold text-center cursor-pointer transition flex items-center justify-center gap-1 shadow-xs"
                              >
                                <span className="material-symbols-outlined text-[13px]">auto_fix_high</span>
                                <span>Pedir corrección IA para estancia #{idx + 1}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : null}
        </div>

        {/* Cuadro de Superficies Flotante sobre el render o plano base */}
        {showScheduleOverlay && roomMarkers.length > 0 && activeTab !== 'ficha' && (
          <div className="absolute bottom-5 right-5 z-30 max-w-xs shadow-2xl animate-fadeIn hidden sm:block">
            <div className="relative">
              <button
                onClick={() => setShowScheduleOverlay(false)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center text-xs shadow-md border border-stone-700 z-10 cursor-pointer"
                title="Ocultar cuadro de superficies"
              >
                ✕
              </button>
              <SurfaceScheduleTable markers={roomMarkers} markerBadgeColor={badgeBg} />
            </div>
          </div>
        )}

        {/* Barra flotante de zoom en la esquina inferior (solo en modos interactivos de plano/render) */}
        {activeTab !== 'ficha' && (
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 bg-stone-950/80 backdrop-blur-md border border-stone-800 rounded-xl p-1 text-white shadow-xl">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
              title="Alejar"
            >
              <span className="material-symbols-outlined text-[16px]">zoom_out</span>
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1 text-[11px] font-mono font-bold text-stone-300 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
              title="Restablecer tamaño (100%)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
              title="Acercar"
            >
              <span className="material-symbols-outlined text-[16px]">zoom_in</span>
            </button>
          </div>
        )}

        {/* Terminal de Comandos para Corrección Rápida de Errores con IA */}
        {onApplyCorrection && (sourceImage || renderedResult) && (
          <CorrectionCommandBar
            roomMarkers={sortedMarkers}
            activeMarkerId={activeMarkerId}
            onApplyCorrection={onApplyCorrection}
            isGenerating={isGenerating}
            hasRender={!!renderedResult}
            currentVersion={currentVersion}
            canUndo={canUndo}
            onUndoToPreviousVersion={onUndoToPreviousVersion}
            externalPrefillText={commandPrefillText}
            onClearPrefill={() => setCommandPrefillText(null)}
          />
        )}

        {/* Modal de Exportación en Alta Definición PDF / Formatos */}
        <PdfExportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          imageSrc={renderDataUrl || sourceDataUrl}
          projectTitle={projectTitle}
          markers={sortedMarkers}
          markerBadgeColor={badgeBg}
          promotionLogo={promotionLogo}
        />
      </div>
    </div>
  );
}

export default PlanCanvasPreview;