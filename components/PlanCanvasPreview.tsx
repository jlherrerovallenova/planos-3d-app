import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CameraAngle, RoomMarker, RoomCategory, IsometricOrientation, DefectMark } from '../types';
import { ROOM_CATEGORIES, SAMPLE_PLANS, ISOMETRIC_ORIENTATIONS } from '../constants';
import { SurfaceScheduleTable } from './SurfaceScheduleTable';
import { PdfExportModal } from './PdfExportModal';
import { sortRoomMarkers, isExteriorRoom } from '../services/roomSorter';
import { DEFAULT_PROMOTION_LOGO } from '../services/defaultPromotionLogo';
import { DEFAULT_AGENCY_LOGO } from '../services/defaultAgencyLogo';
import { DEFAULT_PROMUEVE_LOGO } from '../services/defaultPromueveLogo';
import {
  exportCommercialBrochureImage,
  exportCommercialBrochurePDF,
  exportPlanOnlyPDF
} from '../services/downloadHelper';
import { CorrectionCommandBar } from './CorrectionCommandBar';
import { generateBinaryMaskFromDefect } from '../services/maskHelper';

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
  onAddMarker?: (category: RoomCategory, name?: string, area?: number, x?: number, y?: number) => void;
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
  // Corrección puntual y versiones con soporte de marcas de error y máscara binaria
  onApplyCorrection?: (instruction: string, defectMark?: DefectMark | null, maskBase64?: string | null) => Promise<void>;

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
  // Logo de quien promueve (LUBENS Proyecto S.L.)
  promotorLogo?: string | null;
  onChangePromotorLogo?: (logo: string | null) => void;
  // Logo de la comercializadora con fondo blanco y COMERCIALIZA
  commercialAgencyLogo?: string | null;
  onChangeCommercialAgencyLogo?: (logo: string | null) => void;
  // Teléfono de la comercializadora
  agencyPhone?: string | null;
  onChangeAgencyPhone?: (phone: string | null) => void;
  // Orientación y rotación isométrica (360°)
  isometricOrientation?: IsometricOrientation;
  isometricRotationAngle?: number;
  onChangeIsometricOrientation?: (orientation: IsometricOrientation, angle: number) => void;
  // Identificador de vivienda (PORTAL - PISO - LETRA)
  unitIdentifier?: string;
  onChangeUnitIdentifier?: (val: string) => void;
  // Aislamiento / recorte automático de plano
  onIsolatePlan?: () => void;
  isPlanIsolated?: boolean;
  // Limpieza quirúrgica de textos y cotas
  isTextCleaned?: boolean;
  onToggleCleanText?: () => void;
  // Vistas interiores en primera persona
  onGenerateInterior?: (marker: RoomMarker, roomIndex: number) => void;
  isGeneratingInterior?: boolean;
  generatingRoomId?: string | null;
  // Control rápido Día / Noche
  lighting?: 'daylight_warm' | 'golden_hour' | 'ambient_studio' | 'night_architectural';
  onChangeLighting?: (lighting: 'daylight_warm' | 'night_architectural') => void;
  // Superficie útil total personalizada / manual
  customTotalUsefulArea?: number;
  onChangeCustomTotalUsefulArea?: (total: number | undefined) => void;
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

const EMPTY_ROOM_MARKERS: RoomMarker[] = [];

export function PlanCanvasPreview({
  sourceImage,
  renderedResult,
  isGenerating,
  cameraAngle,
  roomMarkers = EMPTY_ROOM_MARKERS,
  projectTitle = 'Proyecto residencial de 140 viviendas',
  activeMarkerId = null,
  isPinningMode = false,
  markerBadgeColor = '#0F2C59',
  onChangeMarkerBadgeColor,
  promotionLogo,
  onChangePromotionLogo,
  promotorLogo,
  onChangePromotorLogo,
  commercialAgencyLogo,
  onChangeCommercialAgencyLogo,
  agencyPhone = '983 34 21 32',
  onChangeAgencyPhone,
  unitIdentifier,
  onChangeUnitIdentifier,
  isometricOrientation,
  isometricRotationAngle,
  onChangeIsometricOrientation,
  onIsolatePlan,
  isPlanIsolated = false,
  isTextCleaned = false,
  onToggleCleanText,
  onMarkerClick,
  onCanvasClickToPositionMarker,
  onAddMarker,
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
  onDropFile,
  onGenerateInterior,
  isGeneratingInterior = false,
  generatingRoomId = null,
  lighting = 'daylight_warm',
  onChangeLighting,
  customTotalUsefulArea,
  onChangeCustomTotalUsefulArea
}: PlanCanvasPreviewProps) {

  const badgeBg = markerBadgeColor || '#0F2C59';
  const badgeText = getContrastTextColor(badgeBg);
  const [localUnitIdentifier, setLocalUnitIdentifier] = useState<string>(unitIdentifier || 'Portal 1 · 1º A');
  const activeUnitId = unitIdentifier !== undefined && unitIdentifier !== '' ? unitIdentifier : localUnitIdentifier || 'Portal 1 · 1º A';
  const handleUnitIdentifierChange = (value: string) => {
    setLocalUnitIdentifier(value);
    if (onChangeUnitIdentifier) {
      onChangeUnitIdentifier(value);
    }
  };

  // Formato Planta y Letra para el pie del plano (ej. PLANTA 1ª · LETRA A)
  const floorAndLetterText = useMemo(() => {
    if (!activeUnitId) return 'PLANTA 1ª · LETRA A';
    const clean = activeUnitId.trim();
    const match = clean.match(/(?:(?:portal\s*\d+)?\s*[·\-\s]\s*)?(\d+)[ºª\s]*\s*([a-zA-Z])/i);
    if (match) {
      return `PLANTA ${match[1]}ª · LETRA ${match[2].toUpperCase()}`;
    }
    const plantaMatch = clean.match(/planta\s*([^\s·\-]+)/i);
    const letraMatch = clean.match(/letra\s*([a-zA-Z])/i);
    if (plantaMatch || letraMatch) {
      return `PLANTA ${plantaMatch ? plantaMatch[1] : '1ª'} · LETRA ${letraMatch ? letraMatch[1].toUpperCase() : 'A'}`;
    }
    return clean.toUpperCase();
  }, [activeUnitId]);

  // Contadores dinámicos para los badges del bloque VIVIENDA
  const { bedroomsCount, bathroomsCount, terracesCount } = useMemo(() => {
    let bed = 0;
    let bath = 0;
    let terr = 0;

    (roomMarkers || []).forEach((m) => {
      const name = (m.name || '').toLowerCase();
      const cat = (m.category || '').toLowerCase();
      if (cat.includes('dormitorio') || name.includes('dormitorio') || name.includes('habitacion')) {
        bed++;
      } else if (cat.includes('bano') || cat.includes('aseo') || name.includes('baño') || name.includes('bano') || name.includes('aseo')) {
        bath++;
      } else if (isExteriorRoom(m) || name.includes('terraza') || name.includes('balcon') || name.includes('porche')) {
        terr++;
      }
    });

    return {
      bedroomsCount: bed || 2,
      bathroomsCount: bath || 2,
      terracesCount: terr || 2
    };
  }, [roomMarkers]);
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
  const [planOccupancyPercent, setPlanOccupancyPercent] = useState<number | 'fit'>('fit');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [isEditingUnitId, setIsEditingUnitId] = useState<boolean>(false);
  const [tempUnitId, setTempUnitId] = useState<string>('');

  const handleSaveUnitId = () => {
    if (tempUnitId.trim()) {
      handleUnitIdentifierChange(tempUnitId.trim());
    }
    setIsEditingUnitId(false);
  };

  // Estados de rotación interactiva 360° para el plano y corte isométrico
  const [canvasRotation, setCanvasRotation] = useState<number>(isometricRotationAngle || 0);
  const [showRotationControls, setShowRotationControls] = useState<boolean>(false);

  // Sincronizar rotación con prop externa si cambia
  useEffect(() => {
    if (typeof isometricRotationAngle === 'number') {
      setCanvasRotation(isometricRotationAngle);
    }
  }, [isometricRotationAngle]);

  const handleRotate = (delta: number) => {
    const next = (canvasRotation + delta + 360) % 360;
    setCanvasRotation(next);
    if (onChangeIsometricOrientation) {
      const mapped = ISOMETRIC_ORIENTATIONS.find((o) => Math.abs(o.angle - next) < 25) || ISOMETRIC_ORIENTATIONS[0];
      onChangeIsometricOrientation(mapped.id, next);
    }
  };

  const handleSetRotation = (angle: number) => {
    const normalized = ((angle % 360) + 360) % 360;
    setCanvasRotation(normalized);
    if (onChangeIsometricOrientation) {
      const mapped = ISOMETRIC_ORIENTATIONS.find((o) => Math.abs(o.angle - normalized) < 25) || ISOMETRIC_ORIENTATIONS[0];
      onChangeIsometricOrientation(mapped.id, normalized);
    }
  };

  // Resetear zoom y encuadre cada vez que se carga un nuevo plano para asegurar que entre en el área visible
  const [prevSourceBase64, setPrevSourceBase64] = useState<string | null>(null);
  const currentBase64 = sourceImage?.base64 || null;
  if (currentBase64 && currentBase64 !== prevSourceBase64) {
    setPrevSourceBase64(currentBase64);
    setZoomLevel(1);
    setPlanOccupancyPercent('fit');
  }

  const isRotated90 = canvasRotation === 90 || canvasRotation === 270;
  const planBoxStyle: React.CSSProperties = {
    maxHeight: isRotated90 ? 'min(64vh, 560px)' : 'min(72vh, calc(100% - 1.5rem))',
    maxWidth: isRotated90 ? 'min(64vh, 560px)' : '100%',
    transform: canvasRotation !== 0 ? `rotate(${canvasRotation}deg)` : undefined,
    transformOrigin: 'center center',
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.25s ease, max-width 0.25s ease'
  };
  const planImgStyle: React.CSSProperties = {
    maxHeight: isRotated90 ? 'min(64vh, 560px)' : 'min(72vh, calc(100% - 1.5rem))',
    maxWidth: isRotated90 ? 'min(64vh, 560px)' : '100%'
  };

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

  // Estados para menús desplegables profesionales
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estados para herramienta de Señalar / Pintar Defectos en el Render
  const [isAnnotatingError, setIsAnnotatingError] = useState<boolean>(false);
  const [annotationTool, setAnnotationTool] = useState<'brush' | 'pin'>('brush');
  const [annotationColor, setAnnotationColor] = useState<string>('#ef4444');
  const [activeDefectMark, setActiveDefectMark] = useState<DefectMark | null>(null);
  const [defectBrushPaths, setDefectBrushPaths] = useState<{ id: string; points: { x: number; y: number }[]; color: string }[]>([]);
  const isDefectDrawingRef = useRef<boolean>(false);
  const [currentDefectPoints, setCurrentDefectPoints] = useState<{ x: number; y: number }[]>([]);
  const defectStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const is2DMode = cameraAngle === 'plan_2d_furnished';
  const sortedMarkers = useMemo(() => sortRoomMarkers(roomMarkers || []), [roomMarkers]);

  // Convertir puntos porcentuales a string path de SVG
  const pointsToSvgPath = (points: { x: number; y: number }[]): string => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  // Buscar estancia más cercana para asociar contexto al fallo
  const findNearestRoom = (x: number, y: number): { marker: RoomMarker; index: number } | null => {
    if (!sortedMarkers || sortedMarkers.length === 0) return null;
    let bestMarker: RoomMarker | null = null;
    let bestIdx = -1;
    let minDistance = Infinity;
    sortedMarkers.forEach((m, idx) => {
      const dx = m.x - x;
      const dy = m.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDistance) {
        minDistance = d;
        bestMarker = m;
        bestIdx = idx;
      }
    });
    if (minDistance <= 35 && bestMarker) {
      return { marker: bestMarker, index: bestIdx };
    }
    return null;
  };

  // Manejadores de puntero para pintar o colocar marca de fallo
  const handleDefectPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAnnotatingError) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore if pointer capture unsupported
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (annotationTool === 'pin') {
      const nearest = findNearestRoom(x, y);
      const defect: DefectMark = {
        id: `defect_${Date.now()}`,
        type: 'pin',
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        color: annotationColor,
        roomName: nearest ? nearest.marker.name : undefined,
        roomIndex: nearest ? nearest.index : undefined
      };
      setActiveDefectMark(defect);
      setCommandPrefillText(
        `En la zona marcada (${
          defect.roomName ? `Estancia #${(defect.roomIndex || 0) + 1} ${defect.roomName}` : `${Math.round(x)}%, ${Math.round(y)}%`
        }): `
      );
      return;
    }

    isDefectDrawingRef.current = true;
    defectStrokeRef.current = [{ x, y }];
    setCurrentDefectPoints([{ x, y }]);
  };

  const handleDefectPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAnnotatingError || !isDefectDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const last = defectStrokeRef.current[defectStrokeRef.current.length - 1];
    if (!last || Math.hypot(last.x - x, last.y - y) >= 0.5) {
      defectStrokeRef.current.push({ x, y });
      setCurrentDefectPoints([...defectStrokeRef.current]);
    }
  };

  const handleDefectPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAnnotatingError || !isDefectDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore if pointer capture unsupported
    }
    isDefectDrawingRef.current = false;
    const pts = [...defectStrokeRef.current];
    if (pts.length > 0) {
      const sumX = pts.reduce((acc, p) => acc + p.x, 0);
      const sumY = pts.reduce((acc, p) => acc + p.y, 0);
      const avgX = Math.round((sumX / pts.length) * 10) / 10;
      const avgY = Math.round((sumY / pts.length) * 10) / 10;
      const nearest = findNearestRoom(avgX, avgY);

      const defect: DefectMark = {
        id: `defect_${Date.now()}`,
        type: 'brush',
        x: avgX,
        y: avgY,
        path: pts,
        color: annotationColor,
        roomName: nearest ? nearest.marker.name : undefined,
        roomIndex: nearest ? nearest.index : undefined
      };
      setActiveDefectMark(defect);
      setDefectBrushPaths((prev) => [...prev, { id: defect.id, points: pts, color: annotationColor }]);
      setCurrentDefectPoints([]);
      defectStrokeRef.current = [];
      setCommandPrefillText(
        `En el área señalada (${
          defect.roomName ? `Estancia #${(defect.roomIndex || 0) + 1} ${defect.roomName}` : 'del render'
        }): `
      );
    }
  };

  const handleClearDefectMark = () => {
    setActiveDefectMark(null);
    setDefectBrushPaths([]);
    setCurrentDefectPoints([]);
    defectStrokeRef.current = [];
  };

  // Renderizado de capa de defecto (trazos + diana interactiva)
  const renderDefectOverlay = () => (
    <div
      className={`absolute inset-0 ${
        isAnnotatingError
          ? 'z-40 cursor-crosshair touch-none pointer-events-auto'
          : activeDefectMark || defectBrushPaths.length > 0
          ? 'z-30 pointer-events-none'
          : 'hidden'
      }`}
      onPointerDown={handleDefectPointerDown}
      onPointerMove={handleDefectPointerMove}
      onPointerUp={handleDefectPointerUp}
      onPointerCancel={handleDefectPointerUp}
    >
      <svg
        className="w-full h-full absolute inset-0 pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {defectBrushPaths.map((bp) => {
          const pathD = pointsToSvgPath(bp.points);
          return (
            <g key={bp.id}>
              {/* Si es trazo continuo */}
              {bp.points.length > 1 && (
                <path
                  d={pathD}
                  fill="rgba(239, 68, 68, 0.18)"
                  stroke={bp.color || '#ef4444'}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }}
                />
              )}
              {/* Si es un punto o tap único */}
              {bp.points.length === 1 && (
                <circle
                  cx={bp.points[0].x}
                  cy={bp.points[0].y}
                  r="2.5"
                  fill={bp.color || '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  style={{ filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }}
                />
              )}
            </g>
          );
        })}

        {currentDefectPoints.length > 1 && (
          <path
            d={pointsToSvgPath(currentDefectPoints)}
            fill="none"
            stroke={annotationColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}
        {currentDefectPoints.length === 1 && (
          <circle
            cx={currentDefectPoints[0].x}
            cy={currentDefectPoints[0].y}
            r="2.5"
            fill={annotationColor}
            stroke="#ffffff"
            strokeWidth="0.8"
            opacity="0.9"
          />
        )}
      </svg>

      {activeDefectMark && (
        <button
          type="button"
          aria-label={`Referenciar error marcado ${activeDefectMark.roomName ? `en ${activeDefectMark.roomName}` : ''} en el terminal`}
          style={{
            left: `${activeDefectMark.x}%`,
            top: `${activeDefectMark.y}%`,
            transform:
              canvasRotation !== 0
                ? `translate(-50%, -50%) rotate(${-canvasRotation}deg)`
                : 'translate(-50%, -50%)'
          }}
          className="absolute z-40 pointer-events-auto flex flex-col items-center select-none cursor-pointer group bg-transparent border-0 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setCommandPrefillText(
              `En el error marcado (${
                activeDefectMark.roomName
                  ? `Estancia #${(activeDefectMark.roomIndex || 0) + 1} ${activeDefectMark.roomName}`
                  : `${Math.round(activeDefectMark.x)}%, ${Math.round(activeDefectMark.y)}%`
              }): `
            );
          }}
          title="Clic para referenciar este defecto en el terminal"
        >
          <div className="relative flex items-center justify-center">
            <span
              className="absolute w-8 h-8 rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: activeDefectMark.color || '#ef4444' }}
            />
            <div
              className="w-7 h-7 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: activeDefectMark.color || '#ef4444' }}
            >
              <span className="material-symbols-outlined text-[15px]">my_location</span>
            </div>
          </div>
          <div className="mt-1 px-2 py-0.5 rounded-md bg-stone-950/95 text-white text-[10px] font-bold border border-rose-500/80 shadow-md whitespace-nowrap flex items-center gap-1 group-hover:scale-105 transition-transform">
            <span>⚠️ Error señalado</span>
            {activeDefectMark.roomName && (
              <span className="text-amber-300 font-normal">
                #{((activeDefectMark.roomIndex || 0) + 1)} {activeDefectMark.roomName}
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  );

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

  // Cambiar automáticamente de pestaña de forma inteligente cuando llega un nuevo render
  const [prevRenderedResult, setPrevRenderedResult] = useState(renderedResult);
  if (renderedResult !== prevRenderedResult) {
    const isFirstRender = !prevRenderedResult && !!renderedResult;
    setPrevRenderedResult(renderedResult);
    if (isFirstRender) {
      setActiveTab('ficha');
    } else if (renderedResult && activeTab === 'source') {
      setActiveTab('rendered');
    } else if (!renderedResult && sourceImage && activeTab !== 'source' && activeTab !== 'ficha') {
      setActiveTab('source');
    }
  }

  // Cerrar popover de edición con tecla Escape
  useEffect(() => {
    if (!editingMarkerId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingMarkerId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingMarkerId]);

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
      promotorLogo: promotorLogo || undefined,
      agencyLogo: commercialAgencyLogo || undefined,
      agencyPhone: agencyPhone || undefined,
      unitIdentifier: activeUnitId,
      filename: `ficha_comercial_${activeUnitId.toLowerCase().replace(/[\s\W]+/g, '_')}_${projectTitle.toLowerCase().replace(/[^\w]/g, '_')}.png`
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
              {SAMPLE_PLANS.map((sample) => (
                <div
                  key={sample.url}
                  role="button"
                  tabIndex={0}
                  aria-label={`Probar plano muestra ${sample.name}`}
                  onClick={() => onLoadSamplePlan(sample.url, sample.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onLoadSamplePlan(sample.url, sample.name);
                    }
                  }}
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
                type="button"
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
                  type="button"
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
                  type="button"
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
                type="button"
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

        {/* Acciones del Canvas a la derecha (Estructura Limpia y Profesional) */}
        <div className="flex items-center gap-2">
          {/* Selector Rápido Día / Noche */}
          {onChangeLighting && (
            <button
              type="button"
              onClick={() => onChangeLighting(lighting === 'night_architectural' ? 'daylight_warm' : 'night_architectural')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                lighting === 'night_architectural'
                  ? 'bg-indigo-950/90 text-indigo-200 border-indigo-700 hover:bg-indigo-900 shadow-xs'
                  : 'bg-amber-950/70 text-amber-200 border-amber-800/80 hover:bg-amber-900/90 shadow-xs'
              }`}
              title={
                lighting === 'night_architectural'
                  ? 'Iluminación nocturna activa. Clic para cambiar a luz de día'
                  : 'Iluminación diurna activa. Clic para cambiar a iluminación nocturna'
              }
            >
              <span className="material-symbols-outlined text-[15px] text-amber-400">
                {lighting === 'night_architectural' ? 'dark_mode' : 'light_mode'}
              </span>
              <span className="hidden sm:inline">
                {lighting === 'night_architectural' ? 'Noche' : 'Día'}
              </span>
            </button>
          )}

          {/* 1. Botón Principal: Señalar / Pintar Error en el Render */}
          {onApplyCorrection && (sourceImage || renderedResult) && (

            <button
              type="button"
              onClick={() => setIsAnnotatingError(!isAnnotatingError)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                isAnnotatingError
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/30 font-bold'
                  : activeDefectMark
                  ? 'bg-rose-950/80 border-rose-500/70 text-rose-300 hover:text-white hover:bg-rose-900'
                  : 'bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-800 hover:border-stone-700'
              }`}
              title={
                isAnnotatingError
                  ? 'Modo anotar activo. Pinta o pon una marca sobre el render donde esté el fallo'
                  : 'Pintar o poner una marca sobre el render para indicar qué está mal'
              }
            >
              <span className="material-symbols-outlined text-[16px] text-rose-400">
                {isAnnotatingError ? 'draw' : 'edit_location_alt'}
              </span>
              <span>
                {isAnnotatingError
                  ? 'Pintando error...'
                  : activeDefectMark
                  ? 'Error marcado'
                  : 'Señalar Error'}
              </span>
              {activeDefectMark && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping ml-0.5" />
              )}
            </button>
          )}

          {/* 2. Menú Desplegable de Herramientas de Edición del Plano */}
          {(sourceImage || renderedResult) && (
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsToolsMenuOpen(!isToolsMenuOpen);
                  setIsExportMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isToolsMenuOpen || isEraserMode || isCleaningPlanText || isPlanIsolated
                    ? 'bg-stone-800 text-white border-stone-700 shadow-xs'
                    : 'bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-800 hover:border-stone-700'
                }`}
                title="Herramientas de edición y opciones del plano"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-500">build</span>
                <span>Herramientas</span>
                <span className="material-symbols-outlined text-[14px] text-stone-400">
                  {isToolsMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
                {(isPlanIsolated || isEraserMode) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              {isToolsMenuOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-stone-950/95 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl p-2 text-stone-200 animate-fadeIn space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Edición del Plano
                  </div>

                  {/* Aislar plano */}
                  {onIsolatePlan && sourceImage && (
                    <button
                      type="button"
                      onClick={() => {
                        onIsolatePlan();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">crop</span>
                        <div>
                          <div className="font-semibold text-white">
                            {isPlanIsolated ? 'Ver plano original completo' : 'Aislar plano arquitectónico'}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {isPlanIsolated ? 'Restaura márgenes y cartelas' : 'Recorta textos exteriores y precios'}
                          </div>
                        </div>
                      </div>
                      {isPlanIsolated && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                          Aislado
                        </span>
                      )}
                    </button>
                  )}

                  {/* Limpiar textos con IA quirúrgica */}
                  {(onToggleCleanText || onCleanPlanTexts) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onToggleCleanText) {
                          onToggleCleanText();
                        } else if (onCleanPlanTexts) {
                          onCleanPlanTexts();
                        }
                        setIsToolsMenuOpen(false);
                      }}
                      disabled={isCleaningPlanText}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center justify-between transition cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[16px] text-amber-400 ${isCleaningPlanText ? 'animate-spin' : ''}`}>
                          {isCleaningPlanText ? 'autorenew' : isTextCleaned ? 'history' : 'auto_fix_high'}
                        </span>
                        <div>
                          <div className="font-semibold text-white">
                            {isTextCleaned ? 'Restaurar textos y cotas' : 'Limpiar textos y m² (Quirúrgico)'}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {isTextCleaned ? 'Vuelve a mostrar textos originales' : 'Borrado fino preservando muros y muebles'}
                          </div>
                        </div>
                      </div>
                      {isTextCleaned && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-900/60 text-amber-300 border border-amber-700/50">
                          Limpio
                        </span>
                      )}
                    </button>
                  )}

                  {/* Borrador manual */}
                  {onEraseTextAtPoint && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEraserMode(!isEraserMode);
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-rose-400">ink_eraser</span>
                        <div>
                          <div className="font-semibold text-white">Borrador puntual</div>
                          <div className="text-[10px] text-stone-400">Clic sobre cualquier texto para borrarlo</div>
                        </div>
                      </div>
                      {isEraserMode && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-900/60 text-rose-300 border border-rose-700/50">
                          Activo
                        </span>
                      )}
                    </button>
                  )}

                  <div className="border-t border-stone-800/80 my-1.5" />

                  <div className="px-2.5 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Puntos y Estancias
                  </div>

                  {/* Bloquear / Desbloquear puntos */}
                  {roomMarkers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAreMarkersLocked(!areMarkersLocked)}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[16px] ${areMarkersLocked ? 'text-emerald-400' : 'text-stone-400'}`}>
                          {areMarkersLocked ? 'lock' : 'lock_open'}
                        </span>
                        <div>
                          <div className="font-semibold text-white">
                            {areMarkersLocked ? 'Puntos bloqueados' : 'Puntos editables'}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {areMarkersLocked ? 'Protegidos contra arrastre' : 'Arrastra cualquier círculo a su lugar'}
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Mostrar / Ocultar overlay de marcadores */}
                  {roomMarkers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowMarkersOverlay(!showMarkersOverlay)}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center gap-2 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-stone-400">
                        {showMarkersOverlay ? 'visibility' : 'visibility_off'}
                      </span>
                      <div className="font-semibold text-white">
                        {showMarkersOverlay ? 'Ocultar círculos de estancia' : 'Mostrar círculos de estancia'}
                      </div>
                    </button>
                  )}

                  {/* Modo Marcador Pinning */}
                  {onTogglePinningMode && (
                    <button
                      type="button"
                      onClick={() => {
                        onTogglePinningMode();
                        setIsToolsMenuOpen(false);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-amber-400">pin_drop</span>
                        <div>
                          <div className="font-semibold text-white">Colocar nuevas estancias</div>
                          <div className="text-[10px] text-stone-400">Clic en el plano para añadir marcadores</div>
                        </div>
                      </div>
                      {isPinningMode && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-900/60 text-amber-300 border border-amber-700/50">
                          Activo
                        </span>
                      )}
                    </button>
                  )}

                  {/* Tabla de superficies flotante */}
                  {roomMarkers.length > 0 && activeTab !== 'ficha' && (
                    <button
                      type="button"
                      onClick={() => setShowScheduleOverlay(!showScheduleOverlay)}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center gap-2 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-blue-400">table_rows</span>
                      <div className="font-semibold text-white">
                        {showScheduleOverlay ? 'Ocultar tabla flotante de m²' : 'Mostrar tabla flotante de m²'}
                      </div>
                    </button>
                  )}

                  {/* Selector de color de puntos identificadores */}
                  {roomMarkers.length > 0 && onChangeMarkerBadgeColor && (
                    <div className="px-2.5 py-2 flex items-center justify-between rounded-xl hover:bg-stone-800/40">
                      <span className="text-xs font-medium text-stone-300">Color de círculos:</span>
                      <label className="flex items-center gap-2 cursor-pointer bg-stone-900 border border-stone-700 px-2 py-1 rounded-lg">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/60 shrink-0"
                          style={{ backgroundColor: badgeBg }}
                        />
                        <span className="text-[11px] font-mono text-stone-300 font-bold">{badgeBg}</span>
                        <input
                          type="color"
                          value={badgeBg}
                          onChange={(e) => onChangeMarkerBadgeColor(e.target.value)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Menú Desplegable Profesional de Exportación */}
          {(renderedResult || sourceImage) && (
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsExportMenuOpen(!isExportMenuOpen);
                  setIsToolsMenuOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#0F2C59] hover:bg-[#1a4280] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-400/30 active:scale-95"
                title="Opciones de descarga y exportación comercial"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Exportar</span>
                <span className="material-symbols-outlined text-[14px]">
                  {isExportMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-stone-950/95 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl p-2 text-stone-200 animate-fadeIn space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Formatos de Exportación
                  </div>

                  {/* Descargar Imagen Render HD */}
                  {renderedResult && onDownloadRender && (
                    <button
                      type="button"
                      onClick={() => {
                        onDownloadRender();
                        setIsExportMenuOpen(false);
                      }}
                      disabled={downloadStatus !== 'idle'}
                      className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#c25e38]">image</span>
                      <div>
                        <div className="font-semibold text-white">Render 3D en Alta Resolución</div>
                        <div className="text-[10px] text-stone-400">Imagen PNG limpia para catálogo</div>
                      </div>
                    </button>
                  )}

                  {/* Descargar Ficha Comercial PNG */}
                  <button
                    type="button"
                    onClick={() => {
                      handleExportFicha();
                      setIsExportMenuOpen(false);
                    }}
                    disabled={isExportingFicha}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-blue-400">description</span>
                    <div>
                      <div className="font-semibold text-white">Ficha Comercial Completa (PNG)</div>
                      <div className="text-[10px] text-stone-400">Plano amueblado + cuadro de superficies</div>
                    </div>
                  </button>

                  {/* Descargar Ficha en PDF */}
                  <button
                    type="button"
                    onClick={() => {
                      handleExportPDF();
                      setIsExportMenuOpen(false);
                    }}
                    disabled={isExportingPDF}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-rose-400">picture_as_pdf</span>
                    <div>
                      <div className="font-semibold text-white">Ficha en Documento PDF</div>
                      <div className="text-[10px] text-stone-400">Formato vectorial de impresión y envío</div>
                    </div>
                  </button>

                  <div className="border-t border-stone-800/80 my-1" />

                  {/* Imprimir Ficha */}
                  <button
                    type="button"
                    onClick={() => {
                      handlePrintFicha();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-stone-800/80 flex items-center gap-2.5 transition cursor-pointer text-stone-300 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px] text-stone-400">print</span>
                    <div>
                      <div className="font-semibold">Imprimir Ficha</div>
                      <div className="text-[10px] text-stone-400">Enviar a impresora del sistema</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. Control Compacto de Rotación del Plano (360°) */}
          {(sourceImage || renderedResult) && (
            <div className="relative flex items-center bg-stone-900 border border-stone-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => handleRotate(90)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                title="Girar plano 90° a la derecha"
              >
                <span className="material-symbols-outlined text-[15px]">rotate_right</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRotationControls(!showRotationControls)}
                className={`px-1.5 py-0.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center gap-0.5 cursor-pointer ${
                  canvasRotation !== 0
                    ? 'bg-[#c25e38] text-white shadow-xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
                title="Ajuste fino de rotación en 360°"
              >
                <span>{canvasRotation}°</span>
              </button>

              {/* Popover de rotación multi-direccional */}
              {showRotationControls && (
                <div className="absolute top-full mt-2 right-0 z-50 bg-stone-900 text-white rounded-2xl p-3 shadow-2xl border border-stone-700 w-60 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-stone-200">
                      <span className="material-symbols-outlined text-[15px] text-[#c25e38]">explore</span>
                      <span>Giro del Plano (360°)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRotationControls(false)}
                      className="text-stone-400 hover:text-white p-0.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: 'SO 0°', angle: 0 },
                      { label: 'SE 90°', angle: 90 },
                      { label: 'NE 180°', angle: 180 },
                      { label: 'NO 270°', angle: 270 }
                    ].map((btn) => (
                      <button
                        key={btn.angle}
                        type="button"
                        onClick={() => handleSetRotation(btn.angle)}
                        className={`px-1.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          canvasRotation === btn.angle
                            ? 'bg-[#c25e38] text-white border-[#c25e38]'
                            : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleRotate(-45)}
                      className="flex-1 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold border border-stone-700 cursor-pointer"
                    >
                      ↺ -45°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotate(45)}
                      className="flex-1 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold border border-stone-700 cursor-pointer"
                    >
                      ↻ +45°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetRotation(0)}
                      className="flex-1 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white text-[10px] font-bold border border-stone-700 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Acciones Auxiliares: Cambiar plano y Pantalla Completa */}
          <button
            onClick={onClearPlan}
            className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition cursor-pointer"
            title="Cambiar plano o cargar otro archivo"
          >
            <span className="material-symbols-outlined text-[17px]">change_circle</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition cursor-pointer"
            title="Pantalla completa"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Área Central del Canvas */}
      <div
        className={`relative flex-1 min-h-0 min-w-0 w-full h-full flex items-center justify-center p-2 sm:p-4 ${
          zoomLevel > 1 ? 'overflow-auto' : 'overflow-hidden'
        } select-none ${
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
        {/* BARRA FLOTANTE DE HERRAMIENTAS DE ANOTACIÓN DE ERROR */}
        {isAnnotatingError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 backdrop-blur-xl border border-rose-500/80 rounded-2xl shadow-2xl p-2 px-3 text-white flex items-center gap-3 animate-fadeIn flex-wrap justify-center">
            <div className="flex items-center gap-1.5 pr-2 border-r border-stone-800">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-600 text-white shadow-xs">
                <span className="material-symbols-outlined text-[15px]">draw</span>
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-wide">
                  Herramienta de Error
                </span>
                <span className="text-[10px] text-stone-400">
                  {annotationTool === 'brush' ? 'Pinta a mano alzada' : 'Clic puntual sobre el error'}
                </span>
              </div>
            </div>

            {/* Selector de modo: Pincel o Pin */}
            <div className="flex items-center bg-stone-900 border border-stone-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setAnnotationTool('brush')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  annotationTool === 'brush'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="Pintar o rodear zona con error a mano alzada"
              >
                <span className="material-symbols-outlined text-[15px]">brush</span>
                <span>Pincel</span>
              </button>

              <button
                type="button"
                onClick={() => setAnnotationTool('pin')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  annotationTool === 'pin'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="Colocar una marca o diana puntual con un clic"
              >
                <span className="material-symbols-outlined text-[15px]">my_location</span>
                <span>Pin puntual</span>
              </button>
            </div>

            {/* Selector de color */}
            <div className="flex items-center gap-1.5 pl-1 border-l border-stone-800">
              {[
                { color: '#ef4444', label: 'Rojo error' },
                { color: '#f59e0b', label: 'Ámbar atención' },
                { color: '#06b6d4', label: 'Cian contraste' }
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setAnnotationColor(c.color)}
                  className={`w-4 h-4 rounded-full border-2 transition cursor-pointer ${
                    annotationColor === c.color
                      ? 'border-white scale-110 shadow-sm'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>

            {/* Botón limpiar marcas */}
            {(activeDefectMark || defectBrushPaths.length > 0) && (
              <button
                type="button"
                onClick={handleClearDefectMark}
                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition cursor-pointer border border-stone-700 flex items-center gap-1"
                title="Limpiar marcas y dibujos de error"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}

            {/* Botón cerrar / salir de modo anotar */}
            <button
              type="button"
              onClick={() => setIsAnnotatingError(false)}
              className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition cursor-pointer"
              title="Finalizar modo señalamiento de error"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

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
          className="relative w-full h-full max-w-full max-h-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{ transform: activeTab === 'ficha' ? 'none' : `scale(${zoomLevel})` }}
        >
          {/* MODO 0: FICHA COMERCIAL DE VENTA CON CUADRO DE SUPERFICIES ÚTILES */}
          {activeTab === 'ficha' ? (
            <div className="w-full max-w-none mx-auto bg-white text-stone-900 rounded-none sm:rounded-sm shadow-xl border border-stone-200/90 p-5 sm:p-7 flex flex-col justify-between max-h-[86vh] overflow-y-auto animate-fadeIn select-text font-sans">
              {/* Encabezado Comercial */}
              <div className="border-b border-stone-200 pb-3 mb-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1">
                    FICHA COMERCIAL · PLANO AMUEBLADO
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#102A45]">
                    {projectTitle || 'Proyecto residencial de 140 viviendas'}
                  </h2>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Logo de la Promoción Lubens Arroyo en la esquina superior derecha */}
                  {(promotionLogo || DEFAULT_PROMOTION_LOGO) && (
                    <div className="p-1 flex items-center justify-center shrink-0">
                      <img
                        src={promotionLogo || DEFAULT_PROMOTION_LOGO}
                        alt="Logo de la Promoción"
                        className="h-10 sm:h-12 w-auto max-w-[220px] object-contain"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleExportFicha}
                    disabled={isExportingFicha}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Descargar Ficha en Imagen PNG"
                  >
                    <span className="material-symbols-outlined text-[15px]">image</span>
                    <span>{isExportingFicha ? 'Generando...' : 'PNG'}</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                    className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    title="Descargar Ficha Comercial en PDF de alta resolución"
                  >
                    <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                    <span>{isExportingPDF ? 'Creando PDF...' : 'Descargar PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Cuerpo de la Ficha: Plano a la Izquierda (~65%) y Cuadro de Superficies + Datos a la Derecha (~35%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 my-auto">
                {/* Columna Izquierda: Tarjeta contenedora con fondo arena/beige suave para el plano */}
                <div className="lg:col-span-8 flex flex-col justify-between bg-[#F8F6F1] rounded-xs p-4 sm:p-5 border border-stone-200/60 shadow-2xs min-h-[500px]">
                  {/* Zona de Imagen del Plano */}
                  <div className="flex-1 flex items-center justify-center overflow-hidden w-full py-2">
                    {renderDataUrl || sourceDataUrl ? (
                      <div
                        ref={fichaPlanRef}
                        role="region"
                        aria-label="Plano de la Ficha Comercial"
                        tabIndex={0}
                        onClick={(e) => handleImageClick(e, fichaPlanRef.current)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleImageClick(e as any, fichaPlanRef.current);
                        }}
                        style={{
                          width: planOccupancyPercent === 'fit' ? 'auto' : `${planOccupancyPercent}%`,
                          maxWidth: '100%',
                          maxHeight: planOccupancyPercent === 'fit' ? (isRotated90 ? 'min(48vh, 450px)' : 'min(58vh, 520px)') : `${Math.round(planOccupancyPercent * 0.70)}vh`,
                          transform: canvasRotation !== 0 ? `rotate(${canvasRotation}deg)` : undefined,
                          transformOrigin: 'center center',
                          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                        className="relative inline-flex items-center justify-center max-w-full select-none"
                      >
                        <img
                          src={renderDataUrl || sourceDataUrl || ''}
                          alt="Plano amueblado de la vivienda"
                          style={planImgStyle}
                          className="w-auto h-auto object-contain block max-w-full max-h-[58vh] select-none pointer-events-none drop-shadow-sm"
                        />

                        {/* Capa interactiva de marcado y pintura de defectos */}
                        {renderDefectOverlay()}

                        {/* OVERLAY DE PINES DE ESTANCIAS EN FICHA COMERCIAL */}
                        {showMarkersOverlay &&
                          sortedMarkers.map((marker, idx) => {
                            const isDragging = draggingMarkerId === marker.id;
                            const isSelected = activeMarkerId === marker.id;

                            return (
                              <button
                                type="button"
                                key={marker.id || `ficha-marker-${marker.name}`}
                                aria-label={`Estancia #${idx + 1} ${marker.name}`}
                                onMouseDown={(e) => handleMarkerDragStart(e, marker.id, fichaPlanRef.current)}
                                onTouchStart={(e) => handleMarkerDragStart(e, marker.id, fichaPlanRef.current)}
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
                                    ? `Estancia #${idx + 1} ${marker.name} (Fijada)`
                                    : `Estancia #${idx + 1} ${marker.name} (Arrastra libremente para colocar en el plano)`
                                }
                              >
                                <span style={{ transform: canvasRotation !== 0 ? `rotate(${-canvasRotation}deg)` : undefined }}>
                                  {idx + 1}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-stone-400">
                        <span className="material-symbols-outlined text-5xl mb-2 opacity-40">floor</span>
                        <p className="text-sm font-semibold">Carga o genera un plano para visualizar la ficha</p>
                      </div>
                    )}
                  </div>

                  {/* Pie interior de la tarjeta del plano */}
                  <div className="w-full flex items-center justify-between pt-3 border-t border-stone-200/70 text-xs mt-2">
                    <span className="text-stone-400 font-medium">Plano orientativo · Sin escala</span>
                    <span className="text-[#102A45] font-bold uppercase tracking-wider">{floorAndLetterText}</span>
                  </div>
                </div>

                {/* Columna Derecha: Tarjeta Azul Marina "VIVIENDA" + Tabla de Superficies + Promueve/Comercializa */}
                <div className="lg:col-span-4 flex flex-col justify-between gap-4 h-full">
                  <div className="flex flex-col gap-4">
                  {/* Tarjeta Azul Marina de Identificación de Vivienda */}
                  <div className="bg-[#102A45] rounded-xs p-4 sm:p-5 text-white shadow-xs">
                    <span className="text-[11px] font-bold tracking-widest text-slate-300 uppercase block mb-1">
                      VIVIENDA
                    </span>
                    <div className="my-1">
                      {isEditingUnitId ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            aria-label="Identificador de la vivienda (ej. Portal 1 · 1º A)"
                            value={tempUnitId}
                            onChange={(e) => setTempUnitId(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveUnitId();
                              if (e.key === 'Escape') setIsEditingUnitId(false);
                            }}
                            autoFocus
                            className="text-2xl font-black bg-white/10 text-white px-2 py-0.5 rounded border border-white/30 focus:outline-hidden focus:ring-2 focus:ring-sky-400 w-full"
                          />
                          <button
                            type="button"
                            onClick={handleSaveUnitId}
                            className="p-1 hover:bg-white/20 rounded text-emerald-400"
                            title="Guardar"
                          >
                            <span className="material-symbols-outlined text-lg">check</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="group flex items-center gap-2 cursor-pointer text-left w-full bg-transparent border-0 p-0 focus:outline-hidden focus:ring-2 focus:ring-sky-400 rounded"
                          onClick={() => {
                            setTempUnitId(activeUnitId || 'Portal 1 · 1º A');
                            setIsEditingUnitId(true);
                          }}
                          title="Haz clic para editar la identificación de la vivienda"
                        >
                          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {activeUnitId || 'Portal 1 · 1º A'}
                          </h3>
                          <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-70 text-slate-300 transition">
                            edit
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Pastillas informativas de dormitorios, baños y terrazas */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-white/10">
                      <span className="bg-[#16385e] border border-sky-400/30 text-sky-100 text-[11px] font-semibold px-3 py-1 rounded-full shadow-2xs">
                        {bedroomsCount} {bedroomsCount === 1 ? 'dormitorio' : 'dormitorios'}
                      </span>
                      <span className="bg-[#16385e] border border-sky-400/30 text-sky-100 text-[11px] font-semibold px-3 py-1 rounded-full shadow-2xs">
                        {bathroomsCount} {bathroomsCount === 1 ? 'baño' : 'baños'}
                      </span>
                      {terracesCount > 0 && (
                        <span className="bg-[#16385e] border border-sky-400/30 text-sky-100 text-[11px] font-semibold px-3 py-1 rounded-full shadow-2xs">
                          {terracesCount} {terracesCount === 1 ? 'terraza' : 'terrazas'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones de IA para Estancias (Discretas) */}
                  {onDetectWithAI && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onDetectWithAI}
                        disabled={isDetectingWithAI}
                        className="flex-1 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Detectar estancias y superficies automáticamente con IA"
                      >
                        <span className="material-symbols-outlined text-[16px] text-amber-500">
                          {isDetectingWithAI ? 'sync' : 'auto_awesome'}
                        </span>
                        <span>{isDetectingWithAI ? 'Analizando plano...' : 'Auto-detectar con IA'}</span>
                      </button>
                    </div>
                  )}

                  {/* Tabla de Superficies Útiles */}
                  <SurfaceScheduleTable
                    markers={sortedMarkers}
                    markerBadgeColor={badgeBg}
                    onUpdateMarker={onUpdateMarker}
                    onAddMarker={onAddMarker}
                    onDeleteMarker={onDeleteMarker}
                    customTotalUsefulArea={customTotalUsefulArea}
                    onChangeCustomTotalUsefulArea={onChangeCustomTotalUsefulArea}
                  />
                  </div>

                  {/* Bloque Inferior Anclado: PROMUEVE, COMERCIALIZA e INFORMACIÓN Y VENTA */}
                  <div className="mt-auto pt-4">
                    {/* Grid de 2 Columnas: PROMUEVE a la izquierda, COMERCIALIZA + INFORMACIÓN Y VENTA a la derecha */}
                    <div className="grid grid-cols-2 gap-4 items-start">
                      {/* Columna Izquierda: PROMUEVE */}
                      <div>
                        <span className="text-[11px] font-bold tracking-wider text-stone-500 uppercase block mb-1">
                          PROMUEVE
                        </span>
                        <div className="flex items-center min-h-[44px]">
                          <img
                            src={promotorLogo || DEFAULT_PROMUEVE_LOGO}
                            alt="LUBENS Proyecto S.L."
                            className="h-9 sm:h-10 w-auto max-w-[130px] object-contain"
                          />
                        </div>
                      </div>

                      {/* Columna Derecha: COMERCIALIZA + INFORMACIÓN Y VENTA debajo */}
                      <div className="flex flex-col gap-2">
                        <div>
                          <span className="text-[11px] font-bold tracking-wider text-stone-500 uppercase block mb-1">
                            COMERCIALIZA
                          </span>
                          <div className="flex items-center min-h-[44px]">
                            <img
                              src={commercialAgencyLogo || DEFAULT_AGENCY_LOGO}
                              alt="TERRAVALL Servicios Inmobiliarios"
                              className="h-9 sm:h-10 w-auto max-w-[130px] object-contain"
                            />
                          </div>
                        </div>

                        {/* Bloque: INFORMACIÓN Y VENTA (debajo del logo de TERRAVALL) */}
                        <div className="pt-0.5">
                          <span className="text-[11px] font-bold tracking-wider text-stone-500 uppercase block mb-0.5">
                            INFORMACIÓN Y VENTA
                          </span>
                          <a
                            href={`tel:${(agencyPhone || '983342132').replace(/\s+/g, '')}`}
                            className="text-2xl sm:text-3xl font-black text-[#C5221F] tracking-tight hover:underline block"
                            title="Llamar a Información y Venta"
                          >
                            {agencyPhone || '983 34 21 32'}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de Ficha con Cláusula Legal y Unidad */}
              <div className="mt-6 pt-3 border-t border-stone-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-stone-400 font-normal">
                  Documento comercial no vinculante. Las superficies corresponden a superficie útil interior estimada y pueden variar durante la ejecución de obra.
                </span>
                <span className="text-[#102A45] font-bold tracking-wide">
                  {activeUnitId || 'Portal 1 · 1º A'}
                </span>
              </div>
            </div>
          ) : activeTab === 'split' && sourceDataUrl && renderDataUrl ? (
            <div
              style={planBoxStyle}
              className="relative inline-flex items-center justify-center max-w-full rounded-2xl overflow-hidden shadow-2xl border border-stone-700 select-none"
            >
              {/* Imagen 3D de fondo */}
              <img
                src={renderDataUrl}
                alt="Render 3D"
                style={planImgStyle}
                className="w-auto h-auto object-contain block select-none pointer-events-none"
              />

              {/* Imagen 2D recortada superpuesta */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={sourceDataUrl}
                  alt="Plano 2D Original"
                  style={planImgStyle}
                  className="w-auto h-auto object-contain block select-none pointer-events-none"
                />
              </div>

              {/* Input deslizador invisible para control de arrastre */}
              <input
                type="range"
                aria-label="Posición de comparación 2D y 3D"
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
              role="region"
              aria-label="Lienzo de render 3D interactivo"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImageClick(e as any, renderPlanRef.current);
              }}
              onClick={(e) => handleImageClick(e, renderPlanRef.current)}
              style={planBoxStyle}
              className={`relative inline-flex items-center justify-center max-w-full rounded-2xl overflow-hidden shadow-2xl border border-stone-800 select-none ${
                isEraserMode ? 'cursor-crosshair ring-2 ring-rose-500' : ''
              }`}
            >
              <img
                src={renderDataUrl}
                alt="Render 3D Arquitectónico"
                style={planImgStyle}
                className="w-auto h-auto object-contain block rounded-2xl pointer-events-none select-none"
              />

              {/* Capa interactiva de marcado y pintura de defectos */}
              {renderDefectOverlay()}

              {/* OVERLAY DE PINES DE ESTANCIAS EN RENDER */}
              {showMarkersOverlay &&
                sortedMarkers.map((marker, idx) => {
                  const isDragging = draggingMarkerId === marker.id;
                  const isSelected = activeMarkerId === marker.id;

                  return (
                    <button
                      type="button"
                      key={marker.id || `rendered-marker-${marker.name}`}
                      aria-label={`Estancia #${idx + 1} ${marker.name}`}
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
                      <span style={{ transform: canvasRotation !== 0 ? `rotate(${-canvasRotation}deg)` : undefined }}>
                        {idx + 1}
                      </span>
                    </button>
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
              role="region"
              aria-label="Lienzo de plano base 2D interactivo"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImageClick(e as any, basePlanRef.current);
              }}
              onClick={(e) => handleImageClick(e, basePlanRef.current)}
              style={planBoxStyle}
              className={`relative inline-flex items-center justify-center max-w-full rounded-2xl overflow-hidden shadow-2xl border border-stone-800 select-none ${
                isEraserMode ? 'cursor-crosshair ring-2 ring-rose-500' : ''
              }`}
            >
                <img
                  src={sourceDataUrl}
                  alt="Plano Base 2D"
                  style={planImgStyle}
                  className="w-auto h-auto object-contain block rounded-2xl pointer-events-none select-none"
                />

                {/* Capa interactiva de marcado y pintura de defectos */}
                {renderDefectOverlay()}

                {/* OVERLAY DE PINES DE ESTANCIAS */}
                {showMarkersOverlay &&
                  sortedMarkers.map((marker, idx) => {
                    const cat = ROOM_CATEGORIES.find((c) => c.id === marker.category);
                    const isSelected = activeMarkerId === marker.id;
                    const isEditing = editingMarkerId === marker.id;
                    const isDragging = draggingMarkerId === marker.id;

                    return (
                      <div
                        key={marker.id || `base-marker-${marker.name}`}
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
                        <button
                          type="button"
                          aria-label={`Estancia #${idx + 1} ${marker.name}`}
                          onMouseDown={(e) => handleMarkerDragStart(e, marker.id, basePlanRef.current)}
                          onTouchStart={(e) => handleMarkerDragStart(e, marker.id, basePlanRef.current)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onMarkerClick) onMarkerClick(marker.id);
                            setEditingMarkerId(isEditing ? null : marker.id);
                          }}
                          style={{
                            backgroundColor: badgeBg,
                            color: badgeText
                          }}
                          className={`relative w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center font-bold text-xs font-sans transition-all duration-200 select-none cursor-pointer ${
                            isDragging
                              ? 'scale-135 ring-4 ring-blue-400 shadow-2xl'
                              : isSelected
                              ? 'scale-125 ring-4 ring-blue-400 shadow-2xl'
                              : areMarkersLocked
                              ? ''
                              : 'hover:scale-115'
                          }`}
                        >
                          <span style={{ transform: canvasRotation !== 0 ? `rotate(${-canvasRotation}deg)` : undefined }}>
                            {idx + 1}
                          </span>
                        </button>

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
                                <label htmlFor={`marker-name-${marker.id}`} className="text-[10px] font-medium text-stone-500 block mb-0.5">Nombre:</label>
                                <input
                                  id={`marker-name-${marker.id}`}
                                  aria-label="Nombre de la estancia"
                                  type="text"
                                  value={marker.name}
                                  onChange={(e) => onUpdateMarker(marker.id, { name: e.target.value })}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-800"
                                />
                              </div>

                              <div>
                                <label htmlFor={`marker-area-${marker.id}`} className="text-[10px] font-medium text-stone-500 block mb-0.5">Superficie útil (m²):</label>
                                <input
                                  id={`marker-area-${marker.id}`}
                                  aria-label="Superficie útil en m²"
                                  type="number"
                                  step="0.01"
                                  placeholder="Ej: 14.25"
                                  value={marker.areaSqMeters !== undefined && marker.areaSqMeters !== null ? marker.areaSqMeters : ''}
                                  onChange={(e) =>
                                    onUpdateMarker(marker.id, {
                                      areaSqMeters: e.target.value ? parseFloat(e.target.value) : undefined
                                    })
                                  }
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-stone-800"
                                />
                              </div>

                              <div>
                                <label htmlFor={`marker-cat-${marker.id}`} className="text-[10px] font-medium text-stone-500 block mb-0.5">Tipo de estancia:</label>
                                <select
                                  id={`marker-cat-${marker.id}`}
                                  aria-label="Tipo de estancia"
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
                                <label htmlFor={`marker-notes-${marker.id}`} className="text-[10px] font-medium text-stone-500 block mb-0.5">Observaciones de mobiliario:</label>
                                <input
                                  id={`marker-notes-${marker.id}`}
                                  aria-label="Observaciones de mobiliario"
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

                            {onGenerateInterior && (
                              <button
                                type="button"
                                disabled={isGeneratingInterior}
                                onClick={() => {
                                  onGenerateInterior(marker, idx);
                                  setEditingMarkerId(null);
                                }}
                                className="mt-1.5 w-full py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs disabled:opacity-50"
                              >
                                <span className={`material-symbols-outlined text-[15px] ${generatingRoomId === marker.id ? 'animate-spin' : ''}`}>
                                  {generatingRoomId === marker.id ? 'autorenew' : 'photo_camera'}
                                </span>
                                <span>{generatingRoomId === marker.id ? 'Generando...' : '📸 Vista Interior 3D'}</span>
                              </button>
                            )}


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
                type="button"
                onClick={() => setShowScheduleOverlay(false)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center text-xs shadow-md border border-stone-700 z-10 cursor-pointer"
                title="Ocultar cuadro de superficies"
              >
                ✕
              </button>
              <SurfaceScheduleTable
                markers={roomMarkers}
                markerBadgeColor={badgeBg}
                onUpdateMarker={onUpdateMarker}
                onAddMarker={onAddMarker}
                onDeleteMarker={onDeleteMarker}
                customTotalUsefulArea={customTotalUsefulArea}
                onChangeCustomTotalUsefulArea={onChangeCustomTotalUsefulArea}
              />
            </div>
          </div>
        )}

        {/* Barra flotante de zoom en la esquina inferior (solo en modos interactivos de plano/render) */}
        {activeTab !== 'ficha' && (
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 bg-stone-950/80 backdrop-blur-md border border-stone-800 rounded-xl p-1 text-white shadow-xl">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
              title="Alejar"
            >
              <span className="material-symbols-outlined text-[16px]">zoom_out</span>
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="px-2 py-1 text-[11px] font-mono font-bold text-stone-300 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
              title="Restablecer tamaño (100%)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
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
            onApplyCorrection={async (instruction, defectMark) => {
              let binaryMask: string | null = null;
              if (renderedResult?.base64 && (defectMark || defectBrushPaths.length > 0)) {
                try {
                  binaryMask = await generateBinaryMaskFromDefect(
                    renderedResult.base64,
                    defectMark,
                    defectBrushPaths
                  );
                } catch (err) {
                  console.warn('Error al generar la máscara binaria para inpainting:', err);
                }
              }
              await onApplyCorrection(instruction, defectMark, binaryMask);
            }}
            isGenerating={isGenerating}
            hasRender={!!renderedResult}
            currentVersion={currentVersion}
            canUndo={canUndo}
            onUndoToPreviousVersion={onUndoToPreviousVersion}
            externalPrefillText={commandPrefillText}

            onClearPrefill={() => setCommandPrefillText(null)}
            activeDefectMark={activeDefectMark}
            onClearDefectMark={handleClearDefectMark}
            isAnnotationMode={isAnnotatingError}
            onToggleAnnotationMode={() => setIsAnnotatingError(!isAnnotatingError)}
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
          promotorLogo={promotorLogo}
          agencyLogo={commercialAgencyLogo}
          agencyPhone={agencyPhone}
          unitIdentifier={activeUnitId}
          customTotalUsefulArea={customTotalUsefulArea}
        />
      </div>
    </div>
  );
}

export default PlanCanvasPreview;