import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  RenderConfig,
  PresetConfig,
  RenderHistoryItem,
  RoomMarker,
  RoomCategory,
  DefectMark,
  InteriorScene,
  PromotionPlan,
  FurnitureItem
} from './types';
import { generateDefaultFurnitureForRooms } from './services/furnitureManager';
import {
  DEFAULT_PRESETS,
  SAMPLE_PLANS
} from './constants';
import {
  buildArchitecturalPrompt,
  buildTargetedCorrectionPrompt,
  parseTargetedRoomFromText,
  buildFirstPersonInteriorPrompt,
  createFloorPlanWithViewpointMarker,
  appendPromptVariation
} from './services/promptBuilder';

import { DEFAULT_PROMOTION_LOGO } from './services/defaultPromotionLogo';
import { DEFAULT_AGENCY_LOGO } from './services/defaultAgencyLogo';
import { DEFAULT_PROMUEVE_LOGO } from './services/defaultPromueveLogo';
import { PlanCanvasPreview } from './components/PlanCanvasPreview';
import { StyleSelector } from './components/StyleSelector';
import { LeftRail, ActiveSidebarTab } from './components/sidebar/LeftRail';
import { TabPlano } from './components/sidebar/TabPlano';
import { TabEstancias } from './components/sidebar/TabEstancias';
import { TabEstilo } from './components/sidebar/TabEstilo';
import { TabCalidades } from './components/sidebar/TabCalidades';
import { TabAmueblar } from './components/sidebar/TabAmueblar';
import { TabFicha } from './components/sidebar/TabFicha';
import { ClaudeCanvas, CanvasViewMode } from './components/ClaudeCanvas';
import { IntroModal } from './components/IntroModal';
import { ProjectExportModal } from './components/ProjectExportModal';
import { InteriorSceneModal } from './components/InteriorSceneModal';
import { BatchUploadModal } from './components/BatchUploadModal';
import { PromotionPlansGalleryModal } from './components/PromotionPlansGalleryModal';
import { isSupabaseConfigured } from './services/supabaseClient';

import { safeDownloadFile, cleanBase64Data } from './services/downloadHelper';
import { analyzeBlueprintRooms } from './services/planAnalyzer';
import { sortRoomMarkers } from './services/roomSorter';
import { eraseTextAtCoordinate } from './services/planTextEraser';
import { convertPdfToImage } from './services/pdfConverter';
import {
  cropImageToBoundingBox,
  remapMarkersToCrop,
  isSignificantCrop,
  autoTrimWhitespace
} from './services/planCropper';

/**
 * Realiza llamadas a Gemini con reintentos progresivos y retroceso exponencial (Backoff).
 * Protege contra errores temporales 500/503/429 o micro-cortes de red.
 */
async function fetchGeminiWithBackoff(endpoint: string, payload: any, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  let lastResponse: Response | null = null;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      lastResponse = response;
      if (response.ok) {
        return response;
      }
      if (response.status === 500 || response.status === 503 || response.status === 429) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 6000);
        console.warn(`[Gemini API ${response.status}] Reintento ${attempt}/${maxRetries} en ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      return response;
    } catch (netErr) {
      if (attempt >= maxRetries) throw netErr;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 6000);
      console.warn(`[Error de Red Gemini] Reintento ${attempt}/${maxRetries} en ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  return lastResponse!;
}

export function App() {

  // 1. Título y Configuración de renderizado
  const [projectTitle, setProjectTitle] = useState<string>('Proyecto residencial de 140 viviendas');
  const [presets, setPresets] = useState<PresetConfig[]>(() => {
    try {
      const saved = localStorage.getItem('planos3d_custom_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PRESETS;
  });
  const [activePresetId, setActivePresetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('planos3d_active_preset_id') || DEFAULT_PRESETS[0].id;
    } catch {
      return DEFAULT_PRESETS[0].id;
    }
  });
  const [config, setConfig] = useState<RenderConfig>(() => {
    try {
      const saved = localStorage.getItem('planos3d_default_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return DEFAULT_PRESETS[0].config;
  });

  // Persistir presets y preset activo en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('planos3d_custom_presets', JSON.stringify(presets));
    } catch {}
  }, [presets]);

  useEffect(() => {
    try {
      if (activePresetId) {
        localStorage.setItem('planos3d_active_preset_id', activePresetId);
      }
    } catch {}
  }, [activePresetId]);

  // 2. Estados de Imagen y Canvas
  const [sourceImage, setSourceImage] = useState<{
    base64: string;
    mimeType: string;
    name?: string;
    mediaId?: string;
  } | null>(null);

  // Referencia sincronizada al sourceImage para garantizar acceso a la versión más reciente limpia de textos
  const latestSourceImageRef = useRef(sourceImage);
  useEffect(() => {
    latestSourceImageRef.current = sourceImage;
  }, [sourceImage]);

  // Imagen original sin recortar (permite alternar entre plano aislado y original)
  const originalSourceImageRef = useRef<{
    base64: string;
    mimeType: string;
    name?: string;
    mediaId?: string;
  } | null>(null);
  // Versión sin limpiar (con textos y cotas) para poder alternar con el borrado quirúrgico
  const uncleanedSourceImageRef = useRef<{
    base64: string;
    mimeType: string;
    name?: string;
    mediaId?: string;
  } | null>(null);
  // Versión con borrado quirúrgico preservando muros y mobiliario
  const cleanedSourceImageRef = useRef<{
    base64: string;
    mimeType: string;
    name?: string;
    mediaId?: string;
  } | null>(null);
  const [isTextCleaned, setIsTextCleaned] = useState<boolean>(false);
  const [isPlanIsolated, setIsPlanIsolated] = useState<boolean>(false);
  const detectedBlueprintBoxRef = useRef<[number, number, number, number] | null>(null);

  const [renderedResult, setRenderedResult] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);

  // 3. Marcadores y Pines
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [isPinningMode, setIsPinningMode] = useState<boolean>(false);
  const [isAnalyzingPlan, setIsAnalyzingPlan] = useState<boolean>(false);
  const isAnalyzingPlanRef = useRef<boolean>(false);

  // 4. Estados de Generación y Descarga
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccessMessage, setGenerationSuccessMessage] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');

  // 5. Historial y Modales
  const [history, setHistory] = useState<RenderHistoryItem[]>([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(1);
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSidebarWide, setIsSidebarWide] = useState<boolean>(true);

  // 4.5 Vistas Interiores 3D en primera persona (Ground-Level First-Person View)
  const [interiorScenes, setInteriorScenes] = useState<InteriorScene[]>([]);
  const [activeInteriorScene, setActiveInteriorScene] = useState<InteriorScene | null>(null);
  const [isGeneratingInterior, setIsGeneratingInterior] = useState<boolean>(false);
  const [generatingRoomId, setGeneratingRoomId] = useState<string | null>(null);
  const [isInteriorModalOpen, setIsInteriorModalOpen] = useState<boolean>(false);

  // 4.6 Gestión de Promociones y Subida Masiva (Supabase)
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [activePromotionId, setActivePromotionId] = useState<string>('');
  const [activePromotionName, setActivePromotionName] = useState<string>('');


  // 4.7 Estados del Nuevo Diseño y Layout (Inspirado en Claude)
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab>('plano');
  const [canvasViewMode, setCanvasViewMode] = useState<CanvasViewMode>('plano');
  const [paintedStrokes, setPaintedStrokes] = useState<{ id: string; points: { x: number; y: number }[] }[]>([]);
  const [brushSize, setBrushSize] = useState<number>(25);
  const [isPaintingMode, setIsPaintingMode] = useState<boolean>(false);
  const [isEraserMode, setIsEraserMode] = useState<boolean>(false);
  const [removeOriginalFurniture, setRemoveOriginalFurniture] = useState<boolean>(true);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);
  const [activeDefectMark, setActiveDefectMark] = useState<DefectMark | null>(null);
  const [externalPrefillText, setExternalPrefillText] = useState<string | null>(null);

  // 4.8 Estado de Mobiliario Interactivo (Mover, Rotar, Eliminar)
  const [furnitureItems, setFurnitureItems] = useState<FurnitureItem[]>(() => {
    try {
      const saved = localStorage.getItem('planos3d_furniture_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);

  // Persistir muebles
  useEffect(() => {
    try {
      localStorage.setItem('planos3d_furniture_items', JSON.stringify(furnitureItems));
    } catch {}
  }, [furnitureItems]);

  // Si no hay muebles inicializados pero sí estancias, autogenerar la distribución estándar
  useEffect(() => {
    if (furnitureItems.length === 0 && config.roomMarkers && config.roomMarkers.length > 0) {
      const generated = generateDefaultFurnitureForRooms(config.roomMarkers);
      if (generated.length > 0) {
        setFurnitureItems(generated);
      }
    }
  }, [config.roomMarkers]);

  const handleUpdateFurniture = (id: string, updates: Partial<FurnitureItem>) => {
    setFurnitureItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDeleteFurniture = (id: string) => {
    setFurnitureItems((prev) => prev.filter((f) => f.id !== id));
    setGenerationSuccessMessage('Pieza de mobiliario eliminada');
    setTimeout(() => setGenerationSuccessMessage(null), 2500);
  };

  const handleAddFurniture = (item: Omit<FurnitureItem, 'id'>) => {
    const newItem: FurnitureItem = {
      ...item,
      id: `furn_${Date.now()}`
    };
    setFurnitureItems((prev) => [...prev, newItem]);
    setSelectedFurnitureId(newItem.id);
    setGenerationSuccessMessage(`Añadido al plano: ${newItem.name}`);
    setTimeout(() => setGenerationSuccessMessage(null), 2500);
  };

  // Calcular dimensiones de imagen automáticamente al cargar
  useEffect(() => {
    if (sourceImage && sourceImage.base64) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = `data:${sourceImage.mimeType};base64,${sourceImage.base64}`;
    } else {
      setImageDimensions(null);
    }
  }, [sourceImage]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isGeneratingBusyRef = useRef<boolean>(false);

  // Soporte para archivos PDF y paginación
  const [isConvertingPdf, setIsConvertingPdf] = useState<boolean>(false);
  const [pdfFileInfo, setPdfFileInfo] = useState<{
    file: File;
    numPages: number;
    currentPage: number;
  } | null>(null);

  // Prompt en tiempo real
  const currentPrompt = useMemo(() => {
    return buildArchitecturalPrompt(config);
  }, [config]);

  // Limpieza de textos y nombres en plano
  const [isCleaningPlanText, setIsCleaningPlanText] = useState<boolean>(false);

  // Análisis automático de estancias, aislamiento de plano y superficies útiles con Gemini Vision
  const triggerPlanAnalysis = async (imgBase64: string, mime: string) => {
    isAnalyzingPlanRef.current = true;
    setIsAnalyzingPlan(true);
    setGenerationError(null);
    try {
      const result = await analyzeBlueprintRooms(imgBase64, mime);
      let activeBase64 = result.cleanedImageBase64 || imgBase64;
      let activeMime = mime;
      let processedRooms = result.rooms || [];
      let wasCropped = false;
      let uncleanedBase = imgBase64;

      // Aislamiento automático del plano: si contiene precios, cartelas o márgenes exteriores
      if (result.blueprintBoundingBox && isSignificantCrop(result.blueprintBoundingBox)) {
        try {
          detectedBlueprintBoxRef.current = result.blueprintBoundingBox;
          const dataUrl = `data:${activeMime};base64,${activeBase64}`;
          const cropRes = await cropImageToBoundingBox(dataUrl, result.blueprintBoundingBox, 2.5);
          activeBase64 = cropRes.cleanBase64;
          activeMime = cropRes.mimeType;

          // También recortar versión original sin limpiar para que ambas tengan el mismo encuadre
          try {
            const rawUrl = `data:${mime};base64,${imgBase64}`;
            const rawCropRes = await cropImageToBoundingBox(rawUrl, result.blueprintBoundingBox, 2.5);
            uncleanedBase = rawCropRes.cleanBase64;
          } catch {
            // Ignorar
          }

          processedRooms = remapMarkersToCrop(processedRooms, cropRes.cropBox);
          wasCropped = true;
          setIsPlanIsolated(true);
        } catch (cropErr) {
          console.warn('Error al aislar plano automáticamente:', cropErr);
        }
      } else if (!wasCropped) {
        // Fallback local: auto-recorte de márgenes blancos o marcos para asegurar ocupación del 70-75%
        try {
          const dataUrl = `data:${activeMime};base64,${activeBase64}`;
          const trimRes = await autoTrimWhitespace(dataUrl, processedRooms, 2.5);
          if (trimRes.wasTrimmed && trimRes.cropBox) {
            detectedBlueprintBoxRef.current = trimRes.cropBox;
            const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
            activeBase64 = cleanTrimmed.cleanBase64;
            activeMime = cleanTrimmed.mimeType;
            processedRooms = trimRes.markers;
            wasCropped = true;
            setIsPlanIsolated(true);

            try {
              const rawUrl = `data:${mime};base64,${imgBase64}`;
              const rawTrimRes = await autoTrimWhitespace(rawUrl, undefined, 2.5);
              if (rawTrimRes.wasTrimmed) {
                const rawTrimmed = cleanBase64Data(rawTrimRes.trimmedDataUrl);
                uncleanedBase = rawTrimmed.cleanBase64;
              }
            } catch {
              // Ignorar
            }
          }
        } catch (trimErr) {
          console.warn('Error en auto-recorte fallback:', trimErr);
        }
      }

      uncleanedSourceImageRef.current = {
        base64: uncleanedBase,
        mimeType: activeMime
      };

      if (result.cleanedImageBase64) {
        cleanedSourceImageRef.current = {
          base64: activeBase64,
          mimeType: activeMime
        };
        setIsTextCleaned(true);
      } else {
        setIsTextCleaned(false);
      }

      setSourceImage((prev) => (prev ? { ...prev, base64: activeBase64, mimeType: activeMime } : prev));

      if (processedRooms.length > 0) {
        const sorted = sortRoomMarkers(processedRooms);
        setConfig((prev) => ({
          ...prev,
          roomMarkers: sorted
        }));
        setGenerationSuccessMessage(
          wasCropped
            ? `¡Plano arquitectónico extraído y aislado! Textos eliminados quirúrgicamente preservando muros (${processedRooms.length} estancias).`
            : `¡Plano analizado! Nombres y m² eliminados quirúrgicamente con muros y mobiliario intactos (${processedRooms.length} estancias).`
        );
      }
    } catch (err: any) {
      console.warn('Auto-análisis con Gemini:', err);
    } finally {
      isAnalyzingPlanRef.current = false;
      setIsAnalyzingPlan(false);
    }
  };

  const handleDetectRooms = async () => {
    const targetImg = uncleanedSourceImageRef.current || originalSourceImageRef.current || sourceImage;
    if (!targetImg) {
      setGenerationError('Carga primero una imagen del plano para analizarla.');
      return;
    }
    isAnalyzingPlanRef.current = true;
    setIsAnalyzingPlan(true);
    setGenerationError(null);
    setGenerationSuccessMessage(null);
    try {
      const result = await analyzeBlueprintRooms(targetImg.base64, targetImg.mimeType);
      let activeBase64 = result.cleanedImageBase64 || targetImg.base64;
      let activeMime = targetImg.mimeType;
      let processedRooms = result.rooms || [];
      let wasCropped = false;
      let uncleanedBase = targetImg.base64;

      if (result.blueprintBoundingBox && isSignificantCrop(result.blueprintBoundingBox)) {
        try {
          detectedBlueprintBoxRef.current = result.blueprintBoundingBox;
          const dataUrl = `data:${activeMime};base64,${activeBase64}`;
          const cropRes = await cropImageToBoundingBox(dataUrl, result.blueprintBoundingBox, 2.5);
          activeBase64 = cropRes.cleanBase64;
          activeMime = cropRes.mimeType;

          try {
            const rawUrl = `data:${targetImg.mimeType};base64,${targetImg.base64}`;
            const rawCropRes = await cropImageToBoundingBox(rawUrl, result.blueprintBoundingBox, 2.5);
            uncleanedBase = rawCropRes.cleanBase64;
          } catch {
            // Ignorar
          }

          processedRooms = remapMarkersToCrop(processedRooms, cropRes.cropBox);
          wasCropped = true;
          setIsPlanIsolated(true);
        } catch (cropErr) {
          console.warn('Error al aislar plano:', cropErr);
        }
      } else if (!wasCropped) {
        try {
          const dataUrl = `data:${activeMime};base64,${activeBase64}`;
          const trimRes = await autoTrimWhitespace(dataUrl, processedRooms, 2.5);
          if (trimRes.wasTrimmed && trimRes.cropBox) {
            detectedBlueprintBoxRef.current = trimRes.cropBox;
            const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
            activeBase64 = cleanTrimmed.cleanBase64;
            activeMime = cleanTrimmed.mimeType;
            processedRooms = trimRes.markers;
            wasCropped = true;
            setIsPlanIsolated(true);

            try {
              const rawUrl = `data:${targetImg.mimeType};base64,${targetImg.base64}`;
              const rawTrimRes = await autoTrimWhitespace(rawUrl, undefined, 2.5);
              if (rawTrimRes.wasTrimmed) {
                const rawTrimmed = cleanBase64Data(rawTrimRes.trimmedDataUrl);
                uncleanedBase = rawTrimmed.cleanBase64;
              }
            } catch {
              // Ignorar
            }
          }
        } catch (cropErr) {
          console.warn('Error en auto-recorte fallback en handleDetectRooms:', cropErr);
        }
      }

      uncleanedSourceImageRef.current = {
        base64: uncleanedBase,
        mimeType: activeMime
      };

      if (result.cleanedImageBase64) {
        cleanedSourceImageRef.current = {
          base64: activeBase64,
          mimeType: activeMime
        };
        setIsTextCleaned(true);
      } else {
        setIsTextCleaned(false);
      }

      setSourceImage((prev) => (prev ? { ...prev, base64: activeBase64, mimeType: activeMime } : prev));

      if (processedRooms.length > 0) {
        const sorted = sortRoomMarkers(processedRooms);
        setConfig((prev) => ({
          ...prev,
          roomMarkers: sorted
        }));
        setGenerationSuccessMessage(
          wasCropped
            ? `¡Plano aislado con éxito! Precios y textos eliminados quirúrgicamente (${processedRooms.length} estancias detectadas).`
            : `¡Plano analizado! Textos de estancias eliminados preservando muros y líneas (${processedRooms.length} estancias).`
        );
      } else {
        setGenerationError('No se encontraron estancias rotuladas en el plano.');
      }
    } catch (err: any) {
      setGenerationError(`Error al analizar el plano: ${err?.message || err}`);
    } finally {
      isAnalyzingPlanRef.current = false;
      setIsAnalyzingPlan(false);
    }
  };

  // Alternar entre el plano aislado (recortado sin precios/textos) y la imagen original completa
  const handleToggleIsolatePlan = async () => {
    if (!sourceImage && !originalSourceImageRef.current) return;

    if (isPlanIsolated && originalSourceImageRef.current) {
      // Revertir al plano original sin recorte
      const targetRevert = (isTextCleaned && cleanedSourceImageRef.current)
        ? cleanedSourceImageRef.current
        : originalSourceImageRef.current;
      setSourceImage(targetRevert);
      setIsPlanIsolated(false);
      setGenerationSuccessMessage('Mostrando plano original completo (sin recorte).');
      return;
    }

    const baseImg = uncleanedSourceImageRef.current || originalSourceImageRef.current || sourceImage;
    if (!baseImg) return;

    if (detectedBlueprintBoxRef.current) {
      try {
        const dataUrl = `data:${baseImg.mimeType};base64,${baseImg.base64}`;
        const cropRes = await cropImageToBoundingBox(dataUrl, detectedBlueprintBoxRef.current, 2.5);
        setSourceImage({
          ...baseImg,
          base64: cropRes.cleanBase64,
          mimeType: cropRes.mimeType
        });
        if (config.roomMarkers && config.roomMarkers.length > 0) {
          setConfig((prev) => ({
            ...prev,
            roomMarkers: remapMarkersToCrop(prev.roomMarkers, cropRes.cropBox)
          }));
        }
        setIsPlanIsolated(true);
        setGenerationSuccessMessage('¡Plano arquitectónico aislado! Precios y textos exteriores eliminados.');
      } catch (err) {
        console.warn('Error recortando plano:', err);
      }
    } else {
      // Auto-recorte inteligente local inmediato para aislar el plano y llenar el 75%
      try {
        const dataUrl = `data:${baseImg.mimeType};base64,${baseImg.base64}`;
        const trimRes = await autoTrimWhitespace(dataUrl, config.roomMarkers, 2.5);
        if (trimRes.wasTrimmed && trimRes.cropBox) {
          detectedBlueprintBoxRef.current = trimRes.cropBox;
          const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
          setSourceImage({
            ...baseImg,
            base64: cleanTrimmed.cleanBase64,
            mimeType: cleanTrimmed.mimeType
          });
          if (trimRes.markers && trimRes.markers.length > 0) {
            setConfig((prev) => ({
              ...prev,
              roomMarkers: trimRes.markers
            }));
          }
          setIsPlanIsolated(true);
          setGenerationSuccessMessage('¡Plano arquitectónico aislado! Márgenes eliminados para ocupar el 70-75% del marco.');
          return;
        }
      } catch (err) {
        console.warn('Error recortando plano con autoTrim:', err);
      }
      triggerPlanAnalysis(baseImg.base64, baseImg.mimeType);
    }
  };

  // Alternar entre ver el plano con textos y cotas o ver el plano limpio quirúrgicamente
  const handleToggleCleanText = async () => {
    if (!sourceImage) return;

    if (isTextCleaned && uncleanedSourceImageRef.current) {
      setSourceImage((prev) => (prev ? { ...prev, base64: uncleanedSourceImageRef.current!.base64 } : prev));
      setIsTextCleaned(false);
      setGenerationSuccessMessage('Mostrando plano original con textos y cotas.');
      return;
    }

    if (cleanedSourceImageRef.current) {
      setSourceImage((prev) => (prev ? { ...prev, base64: cleanedSourceImageRef.current!.base64 } : prev));
      setIsTextCleaned(true);
      setGenerationSuccessMessage('Mostrando plano con borrado quirúrgico (muros, tabiques y mobiliario intactos).');
      return;
    }

    handleCleanPlanTexts();
  };

  const handleCleanPlanTexts = async () => {
    if (!sourceImage) return;
    setIsCleaningPlanText(true);
    setGenerationError(null);
    try {
      const baseImg = uncleanedSourceImageRef.current || sourceImage;
      const result = await analyzeBlueprintRooms(baseImg.base64, baseImg.mimeType);
      if (result.cleanedImageBase64) {
        let cleanBase = result.cleanedImageBase64;
        if (isPlanIsolated && detectedBlueprintBoxRef.current) {
          try {
            const dataUrl = `data:${baseImg.mimeType};base64,${cleanBase}`;
            const cropRes = await cropImageToBoundingBox(dataUrl, detectedBlueprintBoxRef.current, 2.5);
            cleanBase = cropRes.cleanBase64;
          } catch (cropErr) {
            console.warn('Error recortando versión limpia:', cropErr);
          }
        }
        const cleanedImg = {
          ...sourceImage,
          base64: cleanBase
        };
        cleanedSourceImageRef.current = cleanedImg;
        setSourceImage(cleanedImg);
        setIsTextCleaned(true);
      }
      if (result.rooms && result.rooms.length > 0) {
        setConfig((prev) => ({
          ...prev,
          roomMarkers: sortRoomMarkers(result.rooms)
        }));
      }
      setGenerationSuccessMessage('¡Borrado quirúrgico completado! Textos y cifras eliminados preservando al 100% muros, tabiques y mobiliario.');
    } catch (err: any) {
      setGenerationError(`Error al limpiar textos del plano: ${err?.message || err}`);
    } finally {
      setIsCleaningPlanText(false);
    }
  };

  const handleEraseTextAtPoint = async (xPercent: number, yPercent: number) => {
    if (!sourceImage) return;
    try {
      const dataUrl = `data:${sourceImage.mimeType};base64,${sourceImage.base64}`;
      const cleanedDataUrl = await eraseTextAtCoordinate(dataUrl, xPercent, yPercent, 1.5);
      const { cleanBase64 } = cleanBase64Data(cleanedDataUrl);
      setSourceImage((prev) => (prev ? { ...prev, base64: cleanBase64 } : prev));
    } catch (err) {
      console.warn('Error borrando texto en punto:', err);
    }
  };

  // Procesar archivo cargado (tanto de selector como de drag & drop)
  const processUploadedFile = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        setIsConvertingPdf(true);
        setGenerationError(null);
        const res = await convertPdfToImage(file, 1);
        setPdfFileInfo({
          file,
          numPages: res.numPages,
          currentPage: 1
        });
        const rawImg = {
          base64: res.base64,
          mimeType: 'image/png',
          name: file.name.replace(/\.pdf$/i, '') + (res.numPages > 1 ? ' (Pág. 1)' : '')
        };
        originalSourceImageRef.current = rawImg;

        let activeBase64 = res.base64;
        let wasTrimmed = false;
        try {
          const trimRes = await autoTrimWhitespace(`data:image/png;base64,${res.base64}`, undefined, 2.5);
          if (trimRes.wasTrimmed && trimRes.cropBox) {
            detectedBlueprintBoxRef.current = trimRes.cropBox;
            const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
            activeBase64 = cleanTrimmed.cleanBase64;
            wasTrimmed = true;
          }
        } catch (trimErr) {
          console.warn('Auto-recorte inicial PDF:', trimErr);
        }

        const loadedImg = {
          base64: activeBase64,
          mimeType: 'image/png',
          name: rawImg.name
        };
        setSourceImage(loadedImg);
        uncleanedSourceImageRef.current = loadedImg;
        cleanedSourceImageRef.current = null;
        setIsTextCleaned(false);
        setIsPlanIsolated(wasTrimmed);
        setRenderedResult(null);
        triggerPlanAnalysis(activeBase64, 'image/png');
      } catch (err: any) {
        console.error('Error al procesar el archivo PDF:', err);
        setGenerationError('No se pudo procesar el archivo PDF. Asegúrate de que no esté protegido con contraseña.');
      } finally {
        setIsConvertingPdf(false);
      }
      return;
    }

    setPdfFileInfo(null);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const { cleanBase64, mimeType } = cleanBase64Data(dataUrl);
      let mediaId: string | undefined = undefined;

      // Registro opcional en Flow SDK si está presente
      const flowSdk = (window as any).Flow;
      if (flowSdk && typeof flowSdk.upload === 'function') {
        try {
          const uploadRes = await flowSdk.upload({
            base64: cleanBase64,
            mimeType,
            name: file.name
          });
          mediaId = uploadRes?.mediaId;
        } catch (err) {
          console.warn('Flow.upload no completado, usando base64 directo:', err);
        }
      }

      const rawImg = {
        base64: cleanBase64,
        mimeType,
        name: file.name,
        mediaId
      };
      originalSourceImageRef.current = rawImg;

      // Auto-recorte inteligente inmediato para eliminar márgenes vacíos y marcos CAD
      let activeBase64 = cleanBase64;
      let activeMime = mimeType;
      let wasTrimmed = false;
      try {
        const trimRes = await autoTrimWhitespace(dataUrl, undefined, 2.5);
        if (trimRes.wasTrimmed && trimRes.cropBox) {
          detectedBlueprintBoxRef.current = trimRes.cropBox;
          const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
          activeBase64 = cleanTrimmed.cleanBase64;
          activeMime = cleanTrimmed.mimeType;
          wasTrimmed = true;
        }
      } catch (trimErr) {
        console.warn('Auto-recorte inicial imagen:', trimErr);
      }

      const loadedImg = {
        base64: activeBase64,
        mimeType: activeMime,
        name: file.name,
        mediaId
      };
      setSourceImage(loadedImg);
      uncleanedSourceImageRef.current = loadedImg;
      cleanedSourceImageRef.current = null;
      setIsTextCleaned(false);
      setIsPlanIsolated(wasTrimmed);
      setRenderedResult(null);
      setGenerationError(null);
      // Extraer estancias y aislar plano automáticamente con IA
      triggerPlanAnalysis(activeBase64, activeMime);
    };

    reader.readAsDataURL(file);
  };

  // Cambio de página en documentos PDF multipágina
  const handlePdfPageChange = async (targetPage: number) => {
    if (!pdfFileInfo) return;
    try {
      setIsConvertingPdf(true);
      setGenerationError(null);
      const res = await convertPdfToImage(pdfFileInfo.file, targetPage);
      setPdfFileInfo((prev) => (prev ? { ...prev, currentPage: targetPage } : null));

      const rawImg = {
        base64: res.base64,
        mimeType: 'image/png',
        name: `${pdfFileInfo.file.name.replace(/\.pdf$/i, '')} (Pág. ${targetPage})`
      };
      originalSourceImageRef.current = rawImg;

      let activeBase64 = res.base64;
      let wasTrimmed = false;
      try {
        const trimRes = await autoTrimWhitespace(`data:image/png;base64,${res.base64}`, undefined, 2.5);
        if (trimRes.wasTrimmed && trimRes.cropBox) {
          detectedBlueprintBoxRef.current = trimRes.cropBox;
          const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
          activeBase64 = cleanTrimmed.cleanBase64;
          wasTrimmed = true;
        }
      } catch (trimErr) {
        console.warn('Auto-recorte PDF página:', trimErr);
      }

      const loadedImg = {
        base64: activeBase64,
        mimeType: 'image/png',
        name: rawImg.name
      };
      setSourceImage(loadedImg);
      uncleanedSourceImageRef.current = loadedImg;
      cleanedSourceImageRef.current = null;
      setIsTextCleaned(false);
      setIsPlanIsolated(wasTrimmed);
      setRenderedResult(null);
      triggerPlanAnalysis(activeBase64, 'image/png');
    } catch (err: any) {
      console.error('Error al cambiar de página en PDF:', err);
      setGenerationError('Error al renderizar la página seleccionada del PDF.');
    } finally {
      setIsConvertingPdf(false);
    }
  };

  // Manejo de carga de archivos local
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    processUploadedFile(e.target.files[0]);
    e.target.value = '';
  };

  // Selección desde Galería Flow
  // Selección de plano desde Supabase (Promociones)
  const handleSelectPlanFromSupabase = async (
    file: File,
    planInfo: PromotionPlan,
    promoName: string
  ) => {
    setActivePromotionId(planInfo.promotion_id);
    setActivePromotionName(promoName);
    if (promoName) {
      setProjectTitle(`${promoName} - ${planInfo.portal}`);
    }
    setConfig((prev) => ({
      ...prev,
      unitIdentifier: `${planInfo.portal}${planInfo.unit_identifier ? ` - ${planInfo.unit_identifier}` : ''} (${planInfo.typology})`
    }));
    await processUploadedFile(file);
  };

  // Selección desde Galería (Supabase o Flow)
  const handleSelectFromGallery = async () => {
    if (isSupabaseConfigured) {
      setIsGalleryOpen(true);
      return;
    }
    const flowSdk = (window as any).Flow;
    if (flowSdk && typeof flowSdk.media?.select === 'function') {
      try {
        const item = await flowSdk.media.select({ filter: 'image' });
        if (item && item.base64) {
          const { cleanBase64, mimeType } = cleanBase64Data(item.base64);
          const finalMime = item.mimeType || mimeType;
          const loadedImg = {
            base64: cleanBase64,
            mimeType: finalMime,
            name: item.name || 'Plano desde galería',
            mediaId: item.mediaId
          };
          setSourceImage(loadedImg);
          originalSourceImageRef.current = loadedImg;
          uncleanedSourceImageRef.current = loadedImg;
          cleanedSourceImageRef.current = null;
          setIsTextCleaned(false);
          setIsPlanIsolated(false);
          setRenderedResult(null);
          setGenerationError(null);
          triggerPlanAnalysis(cleanBase64, finalMime);
          return;
        }
      } catch (err) {
        console.warn('Error al seleccionar de Flow Media:', err);
      }
    }

    // Fallback: abrir selector de archivos local
    fileInputRef.current?.click();
  };

  // Cargar muestra de demostración
  const handleLoadSample = (sampleUrl: string, sampleName: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const { cleanBase64 } = cleanBase64Data(dataUrl);
        const rawImg = {
          base64: cleanBase64,
          mimeType: 'image/png',
          name: sampleName
        };
        originalSourceImageRef.current = rawImg;

        let activeBase64 = cleanBase64;
        let wasTrimmed = false;
        try {
          const trimRes = await autoTrimWhitespace(dataUrl, undefined, 2.5);
          if (trimRes.wasTrimmed && trimRes.cropBox) {
            detectedBlueprintBoxRef.current = trimRes.cropBox;
            const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
            activeBase64 = cleanTrimmed.cleanBase64;
            wasTrimmed = true;
          }
        } catch (trimErr) {
          console.warn('Auto-recorte muestra:', trimErr);
        }

        const loadedImg = {
          base64: activeBase64,
          mimeType: 'image/png',
          name: sampleName
        };
        setSourceImage(loadedImg);
        uncleanedSourceImageRef.current = loadedImg;
        cleanedSourceImageRef.current = null;
        setIsTextCleaned(false);
        setIsPlanIsolated(wasTrimmed);
        setRenderedResult(null);
        setGenerationError(null);
        triggerPlanAnalysis(activeBase64, 'image/png');
      }
    };
    img.src = sampleUrl;
  };

  // Añadir nueva estancia manualmente
  const handleAddMarker = (
    category: RoomCategory = 'salon_comedor',
    name?: string,
    area?: number,
    x: number = 50,
    y: number = 50
  ) => {
    // Si no se suministraron coordenadas y ya hay marcadores, distribuirlos ligeramente para no solaparse
    const existingCount = config.roomMarkers?.length || 0;
    const finalX = x !== 50 || y !== 50 ? x : Math.min(85, Math.max(15, 30 + ((existingCount * 12) % 50)));
    const finalY = x !== 50 || y !== 50 ? y : Math.min(85, Math.max(15, 30 + ((existingCount * 10) % 50)));

    const newMarker: RoomMarker = {
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name || `Estancia ${existingCount + 1}`,
      category,
      x: finalX,
      y: finalY,
      notes: '',
      areaSqMeters: area
    };
    setConfig((prev) => ({
      ...prev,
      roomMarkers: sortRoomMarkers([...(prev.roomMarkers || []), newMarker])
    }));
    setActiveMarkerId(newMarker.id);
  };

  // Manejo de Pines en el Canvas
  const handleCanvasClickToPositionMarker = (x: number, y: number) => {
    // Si no está activado el modo de pines o los marcadores están fijos, ignorar clics accidentales
    if (!isPinningMode) return;

    if (activeMarkerId) {
      // Si hay una estancia seleccionada, mover su círculo al punto pulsado
      setConfig((prev) => ({
        ...prev,
        roomMarkers: prev.roomMarkers.map((m) =>
          m.id === activeMarkerId ? { ...m, x, y } : m
        )
      }));
      return;
    }

    // Si NO hay estancia seleccionada, crear automáticamente la siguiente estancia numerada en esa posición del plano
    const currentCount = config.roomMarkers?.length || 0;
    const defaultTemplates: { name: string; cat: RoomCategory }[] = [
      { name: 'Salón - Comedor', cat: 'salon_comedor' },
      { name: 'Cocina', cat: 'cocina' },
      { name: 'Dormitorio 1', cat: 'dormitorio_principal' },
      { name: 'Dormitorio 2', cat: 'dormitorio_secundario' },
      { name: 'Baño 1', cat: 'bano_principal' },
      { name: 'Aseo', cat: 'aseo_cortesia' },
      { name: 'Terraza', cat: 'terraza_balcon' },
      { name: 'Vestíbulo / Pasillo', cat: 'recibidor_distribuidor' }
    ];
    const template = defaultTemplates[currentCount] || {
      name: `Estancia ${currentCount + 1}`,
      cat: 'otro' as RoomCategory
    };

    const newMarker: RoomMarker = {
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: template.name,
      category: template.cat,
      x,
      y,
      notes: ''
    };

    setConfig((prev) => ({
      ...prev,
      roomMarkers: sortRoomMarkers([...(prev.roomMarkers || []), newMarker])
    }));
    setActiveMarkerId(newMarker.id);
  };

  const handleUpdateMarker = (id: string, updates: Partial<RoomMarker>) => {
    setConfig((prev) => {
      const updated = prev.roomMarkers.map((m) => (m.id === id ? { ...m, ...updates } : m));
      const shouldSort = updates.name !== undefined || updates.category !== undefined;
      return {
        ...prev,
        roomMarkers: shouldSort ? sortRoomMarkers(updated) : updated
      };
    });
  };

  const handleDeleteMarker = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      roomMarkers: prev.roomMarkers.filter((m) => m.id !== id)
    }));
    if (activeMarkerId === id) setActiveMarkerId(null);
  };

  // Manejo de Presets
  const handleApplyPreset = (preset: PresetConfig) => {
    setActivePresetId(preset.id);
    setConfig({
      ...preset.config,
      roomMarkers: config.roomMarkers?.length ? config.roomMarkers : preset.config.roomMarkers
    });
  };

  const handleSavePreset = (name: string, newConfig: RenderConfig) => {
    const newPreset: PresetConfig = {
      id: `preset_custom_${Date.now()}`,
      name,
      createdAt: Date.now(),
      config: { ...newConfig }
    };
    setPresets((prev) => [newPreset, ...prev]);
    setActivePresetId(newPreset.id);
  };

  const handleDeletePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  };

  const handleImportPresetJson = (importedData: any, filename?: string) => {
    try {
      let targetConfig: RenderConfig | null = null;
      let presetName = filename ? filename.replace(/\.json$/i, '').replace(/_/g, ' ') : 'Configuración Importada';

      if (importedData && typeof importedData === 'object') {
        if (importedData.config && typeof importedData.config === 'object') {
          // Archivo exportado como PresetConfig
          targetConfig = importedData.config;
          if (importedData.name) presetName = importedData.name;
        } else if (
          importedData.cameraAngle ||
          importedData.interiorStyle ||
          importedData.flooringLiving ||
          importedData.kitchenCountertop ||
          importedData.windowFrames
        ) {
          // Archivo con estructura directa de RenderConfig
          targetConfig = importedData as RenderConfig;
        }
      }

      if (!targetConfig) {
        setGenerationError('El archivo JSON seleccionado no contiene una configuración o preset válido.');
        return;
      }

      // Combinar configuración preservando marcadores de plano actuales si existen
      const finalConfig: RenderConfig = {
        ...targetConfig,
        roomMarkers: config.roomMarkers?.length ? config.roomMarkers : (targetConfig.roomMarkers || [])
      };

      const newPreset: PresetConfig = {
        id: `preset_import_${Date.now()}`,
        name: presetName,
        createdAt: Date.now(),
        config: finalConfig
      };

      setPresets((prev) => [newPreset, ...prev.filter((p) => p.name !== newPreset.name)]);
      setActivePresetId(newPreset.id);
      setConfig(finalConfig);

      // Fijar automáticamente en localStorage para que siempre persista como la activa
      try {
        localStorage.setItem('planos3d_default_config', JSON.stringify(finalConfig));
        localStorage.setItem('planos3d_active_preset_id', newPreset.id);
      } catch {}

      setGenerationSuccessMessage(`Configuración "${presetName}" cargada correctamente. Todos los renders se realizarán con estas características.`);
    } catch (err: any) {
      setGenerationError(`Error al procesar el archivo JSON: ${err?.message || 'Formato no válido'}`);
    }
  };

  const handleSetDefaultConfig = (cfgToDefault: RenderConfig) => {
    try {
      localStorage.setItem('planos3d_default_config', JSON.stringify(cfgToDefault));
      setGenerationSuccessMessage('Esta configuración ha quedado guardada como predeterminada: la aplicación se iniciará siempre con ella.');
    } catch (err: any) {
      console.warn('Error guardando en localStorage:', err);
    }
  };

  // Generación con IA
  const handleGenerate = async () => {
    if (isGenerating || isGeneratingBusyRef.current) return;

    // Si la limpieza automática de texto o detección está ejecutándose, esperar a que termine
    // para asegurar que Gemini NUNCA reciba un plano con nombres o superficies ("Máxima de Oro").
    if (isAnalyzingPlanRef.current) {
      setGenerationSuccessMessage('Finalizando eliminación de textos y estancias del plano...');
      let attempts = 0;
      while (isAnalyzingPlanRef.current && attempts < 40) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        attempts++;
      }
      setGenerationSuccessMessage(null);
    }

    const currentImg = cleanedSourceImageRef.current || latestSourceImageRef.current || sourceImage;
    if (!currentImg) {
      setGenerationError('Por favor, selecciona o sube un plano 2D antes de generar la maqueta.');
      return;
    }

    isGeneratingBusyRef.current = true;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccessMessage(null);

    const flowSdk = (window as any).Flow;

    try {
      // 1. Si Flow SDK está disponible
      if (flowSdk && typeof flowSdk.generate?.image === 'function') {
        const refIds = currentImg.mediaId ? [currentImg.mediaId] : [];
        let genRes: any = null;

        try {
          genRes = await flowSdk.generate.image({
            prompt: currentPrompt,
            referenceImageMediaIds: refIds,
            aspectRatio: config.aspectRatio,
            modelDisplayName: '🍌 Nano Banana Pro'
          });
        } catch (modelErr) {
          console.warn('Fallback a Nano Banana 2.1:', modelErr);
          genRes = await flowSdk.generate.image({
            prompt: currentPrompt,
            referenceImageMediaIds: refIds,
            aspectRatio: config.aspectRatio,
            modelDisplayName: '🍌 Nano Banana 2.1'
          });
        }

        if (genRes && genRes.base64) {
          const { cleanBase64, mimeType } = cleanBase64Data(genRes.base64);
          let finalBase64 = cleanBase64;
          let finalMime = genRes.mimeType || mimeType;
          try {
            const trimRes = await autoTrimWhitespace(`data:${finalMime};base64,${finalBase64}`, undefined, 2.0);
            if (trimRes.wasTrimmed) {
              const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
              finalBase64 = cleanTrimmed.cleanBase64;
              finalMime = cleanTrimmed.mimeType;
            }
          } catch (e) {}
          const result = { base64: finalBase64, mimeType: finalMime };
          setRenderedResult(result);

          const historyItem: RenderHistoryItem = {
            id: `render_${Date.now()}`,
            mediaId: genRes.mediaId || '',
            base64: cleanBase64,
            mimeType: result.mimeType,
            prompt: currentPrompt,
            config: { ...config },
            timestamp: Date.now(),
            versionNumber: 1,
            appliedInstruction: 'Render inicial'
          };
          setCurrentVersionNumber(1);
          setHistory((prev) => [historyItem, ...prev]);
          setGenerationSuccessMessage('¡Render 3D generado con éxito!');
          setIsGenerating(false);
          return;
        }
      }

      // 2. Llamada directa a Gemini API
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('No se encontró VITE_GEMINI_API_KEY en .env.local.');
      }

      // Priorizar el motor de render seleccionado por el usuario en config.renderEngine
      const chosenEngine = config.renderEngine && config.renderEngine !== 'auto' ? config.renderEngine : null;
      const defaultSequence = [
        'gemini-3.1-flash-image',
        'gemini-3-pro-image',
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-image-preview',
        'gemini-3-pro-image-preview',
        'gemini-3.1-flash-lite-image'
      ];
      const candidateModels = chosenEngine
        ? [chosenEngine, ...defaultSequence.filter((m) => m !== chosenEngine)]
        : defaultSequence;

      let generatedImage: { base64: string; mimeType: string } | null = null;
      let usedEngineName = '';
      let lastErrorMessage = '';

      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const parts: any[] = [];

          if (currentImg && currentImg.base64) {
            const { cleanBase64, mimeType } = cleanBase64Data(currentImg.base64);
            parts.push({
              inlineData: {
                mimeType: currentImg.mimeType || mimeType || 'image/jpeg',
                data: cleanBase64
              }
            });
          }

          const promptWithVariation = appendPromptVariation(currentPrompt);
          parts.push({ text: promptWithVariation });

          const response = await fetchGeminiWithBackoff(endpoint, {
            systemInstruction: {
              parts: [{
                text: 'You are an elite architectural 3D visualizer and delineator. Render clean architectural plans with high-end materials and furniture only. Never print or render text, typography, room titles, dimensions, or numerical labels on floor or wall surfaces.'
              }]
            },
            contents: [{ parts }]
          });


          if (!response.ok) {
            const errText = await response.text();
            console.warn(`Modelo ${model} no disponible (${response.status}):`, errText);
            lastErrorMessage = `API error ${response.status}: ${errText}`;
            continue;
          }

          const data = await response.json();
          const imagePart = data.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData && p.inlineData.data
          );

          if (imagePart?.inlineData?.data) {
            const { cleanBase64, mimeType } = cleanBase64Data(imagePart.inlineData.data);
            generatedImage = {
              base64: cleanBase64,
              mimeType: imagePart.inlineData.mimeType || mimeType || 'image/jpeg'
            };
            usedEngineName = model;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Error llamando a ${model}:`, modelErr);
          lastErrorMessage = modelErr?.message || 'Error de conexión con Gemini';
        }
      }

      if (generatedImage) {
        let finalRender = generatedImage;
        try {
          const trimRes = await autoTrimWhitespace(`data:${generatedImage.mimeType};base64,${generatedImage.base64}`, undefined, 2.0);
          if (trimRes.wasTrimmed) {
            const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
            finalRender = {
              base64: cleanTrimmed.cleanBase64,
              mimeType: cleanTrimmed.mimeType
            };
          }
        } catch (e) {}

        setRenderedResult(finalRender);

        const historyItem: RenderHistoryItem = {
          id: `render_${Date.now()}`,
          mediaId: 'gemini_image',
          base64: finalRender.base64,
          mimeType: finalRender.mimeType,
          prompt: currentPrompt,
          config: { ...config },
          timestamp: Date.now(),
          versionNumber: 1,
          appliedInstruction: 'Render inicial',
          usedEngine: usedEngineName
        };
        setCurrentVersionNumber(1);
        setHistory((prev) => [historyItem, ...prev]);
        setGenerationSuccessMessage(
          `¡Render completado con éxito! (Motor: ${usedEngineName.replace('gemini-', '')})`
        );
        setIsGenerating(false);
        return;
      }

      throw new Error(
        lastErrorMessage ||
          'El modelo generativo no devolvió una imagen válida. Verifica tu conexión.'
      );
    } catch (err: any) {
      console.error('Error al generar render:', err);
      setGenerationError(err?.message || 'Error durante la generación de la imagen.');
    } finally {
      isGeneratingBusyRef.current = false;
      setIsGenerating(false);
    }
  };

  // 4.1 Corrección puntual con IA (Image-to-Image sobre el render actual preservando el resto con máscara binaria)
  const handleApplyTargetedCorrection = async (
    instruction: string,
    defectMark?: DefectMark | null,
    maskBase64?: string | null
  ) => {
    if (isGenerating || isGeneratingBusyRef.current) return;
    if (!instruction.trim()) return;

    if (!sourceImage && !renderedResult) {
      setGenerationError('Carga un plano o genera un render inicial antes de aplicar correcciones.');
      return;
    }

    isGeneratingBusyRef.current = true;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccessMessage(null);

    // 1. Detección automática de estancia para sincronizar metadatos
    const detection = parseTargetedRoomFromText(instruction, config.roomMarkers || []);
    let updatedMarkers = config.roomMarkers || [];
    if (detection.matchedMarker && typeof detection.roomIndex === 'number') {
      const targetMarker = detection.matchedMarker;
      updatedMarkers = updatedMarkers.map((m) =>
        m.id === targetMarker.id
          ? {
              ...m,
              notes: m.notes ? `${m.notes}, ${detection.cleanNotes}` : detection.cleanNotes
            }
          : m
      );
      setConfig((prev) => ({
        ...prev,
        roomMarkers: updatedMarkers
      }));
    }

    const targetedPrompt = buildTargetedCorrectionPrompt(
      config,
      instruction,
      detection.matchedMarker,
      detection.roomIndex,
      defectMark,
      !!maskBase64
    );


    const nextVersion = (history.length > 0 ? (history[0].versionNumber || history.length) : 1) + 1;

    try {
      // 2. Si Flow SDK está disponible
      const flowSdk = (window as any).Flow;
      if (flowSdk && typeof flowSdk.generate?.image === 'function') {
        const latestMediaId = (history.length > 0 && history[0].mediaId) ? history[0].mediaId : sourceImage?.mediaId;
        const refIds = latestMediaId ? [latestMediaId] : [];
        let genRes: any = null;
        try {
          genRes = await flowSdk.generate.image({
            prompt: targetedPrompt,
            referenceImageMediaIds: refIds,
            aspectRatio: config.aspectRatio,
            modelDisplayName: '🍌 Nano Banana Pro'
          });
        } catch (modelErr) {
          genRes = await flowSdk.generate.image({
            prompt: targetedPrompt,
            referenceImageMediaIds: refIds,
            aspectRatio: config.aspectRatio,
            modelDisplayName: '🍌 Nano Banana 2.1'
          });
        }

        if (genRes && genRes.base64) {
          const { cleanBase64, mimeType } = cleanBase64Data(genRes.base64);
          let finalBase64 = cleanBase64;
          let finalMime = genRes.mimeType || mimeType;
          try {
            const trimRes = await autoTrimWhitespace(`data:${finalMime};base64,${finalBase64}`, undefined, 2.0);
            if (trimRes.wasTrimmed) {
              const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
              finalBase64 = cleanTrimmed.cleanBase64;
              finalMime = cleanTrimmed.mimeType;
            }
          } catch (e) {}
          const result = { base64: finalBase64, mimeType: finalMime };
          setRenderedResult(result);
          setCurrentVersionNumber(nextVersion);

          const historyItem: RenderHistoryItem = {
            id: `render_${Date.now()}`,
            mediaId: genRes.mediaId || '',
            base64: cleanBase64,
            mimeType: result.mimeType,
            prompt: targetedPrompt,
            config: { ...config, roomMarkers: updatedMarkers },
            timestamp: Date.now(),
            versionNumber: nextVersion,
            appliedInstruction: instruction,
            defectMark: defectMark || null
          };
          setHistory((prev) => [historyItem, ...prev]);
          setGenerationSuccessMessage(`¡Corrección aplicada con éxito! (Versión v${nextVersion} guardada)`);
          setIsGenerating(false);
          return;
        }
      }

      // 3. Llamada directa a Gemini API con Image-to-Image (Render actual como base principal)
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('No se encontró VITE_GEMINI_API_KEY en .env.local.');
      }

      // Priorizar el motor de render seleccionado por el usuario en config.renderEngine
      const chosenEngine = config.renderEngine && config.renderEngine !== 'auto' ? config.renderEngine : null;
      const defaultSequence = [
        'gemini-3.1-flash-image',
        'gemini-3-pro-image',
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-image-preview',
        'gemini-3-pro-image-preview',
        'gemini-3.1-flash-lite-image'
      ];
      const candidateModels = chosenEngine
        ? [chosenEngine, ...defaultSequence.filter((m) => m !== chosenEngine)]
        : defaultSequence;

      // Imagen base: priorizar el render actual (Image-to-Image) para preservar contexto arquitectónico
      const baseImgToRefine = renderedResult || sourceImage;
      const parts: any[] = [];

      if (baseImgToRefine && baseImgToRefine.base64) {
        const { cleanBase64, mimeType } = cleanBase64Data(baseImgToRefine.base64);
        parts.push({
          inlineData: {
            mimeType: baseImgToRefine.mimeType || mimeType || 'image/jpeg',
            data: cleanBase64
          }
        });
      }

      // Máscara binaria blanco/negro para inpainting quirúrgico
      if (maskBase64) {
        const { cleanBase64 } = cleanBase64Data(maskBase64);
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64
          }
        });
      }

      const promptWithVariation = appendPromptVariation(targetedPrompt);
      parts.push({ text: promptWithVariation });

      let generatedImage: { base64: string; mimeType: string } | null = null;
      let usedEngineName = '';
      let lastErrorMessage = '';

      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetchGeminiWithBackoff(endpoint, {
            systemInstruction: {
              parts: [{
                text: 'You are an elite architectural 3D visualizer and delineator. Render clean architectural plans with high-end materials and furniture only. Never print or render text, typography, room titles, dimensions, or numerical labels on floor or wall surfaces.'
              }]
            },
            contents: [{ parts }]
          });


          if (!response.ok) {
            const errText = await response.text();
            console.warn(`Modelo ${model} no disponible (${response.status}):`, errText);
            lastErrorMessage = `API error ${response.status}: ${errText}`;
            continue;
          }

          const data = await response.json();
          const imagePart = data.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData && p.inlineData.data
          );

          if (imagePart?.inlineData?.data) {
            const { cleanBase64, mimeType } = cleanBase64Data(imagePart.inlineData.data);
            generatedImage = {
              base64: cleanBase64,
              mimeType: imagePart.inlineData.mimeType || mimeType || 'image/jpeg'
            };
            usedEngineName = model;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Error llamando a ${model}:`, modelErr);
          lastErrorMessage = modelErr?.message || 'Error de conexión con Gemini';
        }
      }

      if (generatedImage) {
        let finalRender = generatedImage;
        try {
          const trimRes = await autoTrimWhitespace(`data:${generatedImage.mimeType};base64,${generatedImage.base64}`, undefined, 2.0);
          if (trimRes.wasTrimmed) {
            const cleanTrimmed = cleanBase64Data(trimRes.trimmedDataUrl);
            finalRender = {
              base64: cleanTrimmed.cleanBase64,
              mimeType: cleanTrimmed.mimeType
            };
          }
        } catch (e) {}

        setRenderedResult(finalRender);
        setCurrentVersionNumber(nextVersion);

        const historyItem: RenderHistoryItem = {
          id: `render_${Date.now()}`,
          mediaId: 'gemini_correction',
          base64: finalRender.base64,
          mimeType: finalRender.mimeType,
          prompt: targetedPrompt,
          config: { ...config, roomMarkers: updatedMarkers },
          timestamp: Date.now(),
          versionNumber: nextVersion,
          appliedInstruction: instruction,
          usedEngine: usedEngineName,
          defectMark: defectMark || null
        };
        setHistory((prev) => [historyItem, ...prev]);
        setGenerationSuccessMessage(
          `¡Corrección aplicada con éxito en v${nextVersion}! (Motor: ${usedEngineName.replace('gemini-', '')})`
        );
        setIsGenerating(false);
        return;
      }

      throw new Error(
        lastErrorMessage || 'El modelo generativo no devolvió una imagen válida tras la corrección.'
      );
    } catch (err: any) {
      console.error('Error al aplicar corrección puntual:', err);
      setGenerationError(err?.message || 'Error durante la corrección del render.');
    } finally {
      isGeneratingBusyRef.current = false;
      setIsGenerating(false);
    }
  };

  // Generar render interior 3D a pie de estancia (en primera persona)
  const handleGenerateRoomInterior = async (marker: RoomMarker, roomIndex: number) => {
    const currentImg = latestSourceImageRef.current || sourceImage;
    if (!currentImg || !currentImg.base64) {
      setGenerationError('Carga primero un plano arquitectónico para generar perspectivas interiores.');
      return;
    }

    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setGenerationError('No se encontró VITE_GEMINI_API_KEY en .env.local.');
      return;
    }

    setIsGeneratingInterior(true);
    setGeneratingRoomId(marker.id);
    setGenerationError(null);

    try {
      // 1. Superponer visualmente el punto de vista (círculo rojo con número) en el plano
      const markedPlan = await createFloorPlanWithViewpointMarker(
        currentImg.base64,
        currentImg.mimeType || 'image/png',
        marker.x,
        marker.y,
        roomIndex
      );

      // 2. Construir prompt arquitectónico en primera persona
      const interiorPrompt = buildFirstPersonInteriorPrompt(config, marker, roomIndex);

      // 3. Motores de imagen Gemini candidatos
      const chosenEngine = config.renderEngine && config.renderEngine !== 'auto' ? config.renderEngine : null;
      const defaultSequence = [
        'gemini-3.1-flash-image',
        'gemini-3-pro-image',
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-image-preview',
        'gemini-3-pro-image-preview',
        'gemini-3.1-flash-lite-image'
      ];
      const candidateModels = chosenEngine
        ? [chosenEngine, ...defaultSequence.filter((m) => m !== chosenEngine)]
        : defaultSequence;

      let generatedInterior: { base64: string; mimeType: string } | null = null;
      let usedEngineName = '';
      let lastErrorMessage = '';

      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const promptWithVariation = appendPromptVariation(interiorPrompt);
          const parts: any[] = [
            {
              inlineData: {
                mimeType: markedPlan.mimeType,
                data: markedPlan.base64
              }
            },
            { text: promptWithVariation }
          ];

          const response = await fetchGeminiWithBackoff(endpoint, {
            systemInstruction: {
              parts: [{
                text: 'You are an elite architectural interior photographer and 3D visualizer. Render photorealistic eye-level indoor photographs from the viewpoint specified on the floor plan. Never print or render text, titles, or watermarks.'
              }]
            },
            contents: [{ parts }]
          });


          if (!response.ok) {
            const errText = await response.text();
            lastErrorMessage = `API error ${response.status}: ${errText}`;
            continue;
          }

          const data = await response.json();
          const imagePart = data.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData && p.inlineData.data
          );

          if (imagePart?.inlineData?.data) {
            const { cleanBase64, mimeType } = cleanBase64Data(imagePart.inlineData.data);
            generatedInterior = {
              base64: cleanBase64,
              mimeType: imagePart.inlineData.mimeType || mimeType || 'image/jpeg'
            };
            usedEngineName = model;
            break;
          }
        } catch (modelErr: any) {
          lastErrorMessage = modelErr?.message || 'Error de conexión con Gemini';
        }
      }

      if (generatedInterior) {
        const newScene: InteriorScene = {
          id: `interior_${Date.now()}`,
          roomId: marker.id,
          roomName: marker.name,
          roomCategory: marker.category,
          roomIndex,
          base64: generatedInterior.base64,
          mimeType: generatedInterior.mimeType,
          prompt: interiorPrompt,
          timestamp: Date.now(),
          engineUsed: usedEngineName
        };

        setInteriorScenes((prev) => [newScene, ...prev.filter((s) => s.roomId !== marker.id)]);
        setActiveInteriorScene(newScene);
        setIsInteriorModalOpen(true);
        setGenerationSuccessMessage(`¡Vista interior de ${marker.name} generada con éxito!`);
      } else {
        throw new Error(lastErrorMessage || 'No se pudo generar la perspectiva interior.');
      }
    } catch (err: any) {
      console.error('Error generando vista interior:', err);
      setGenerationError(err?.message || 'Error al generar la perspectiva interior.');
    } finally {
      setIsGeneratingInterior(false);
      setGeneratingRoomId(null);
    }
  };

  const handleRegenerateInteriorScene = (roomId: string) => {
    const marker = config.roomMarkers.find((m) => m.id === roomId);
    if (marker) {
      const idx = config.roomMarkers.findIndex((m) => m.id === roomId);
      handleGenerateRoomInterior(marker, idx >= 0 ? idx : 0);
    }
  };

  // Restaurar versión específica del historial
  const handleRestoreVersion = (item: RenderHistoryItem) => {

    setRenderedResult({
      base64: item.base64,
      mimeType: item.mimeType
    });
    if (item.versionNumber) {
      setCurrentVersionNumber(item.versionNumber);
    }
    if (item.config) {
      setConfig(item.config);
    }
    setGenerationSuccessMessage(`Restaurada la versión v${item.versionNumber || 'seleccionada'}`);
  };

  // Deshacer al render inmediatamente anterior
  const handleUndo = () => {
    if (history.length > 1) {
      const prevItem = history[1]; // el segundo elemento en la lista ordenada es el anterior
      handleRestoreVersion(prevItem);
    }
  };

  // Descarga directa
  const handleDownloadRender = async () => {
    if (!renderedResult) return;
    setDownloadStatus('downloading');
    const success = await safeDownloadFile({
      base64: renderedResult.base64,
      mimeType: renderedResult.mimeType,
      filename: `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_3d_${config.cameraAngle}.png`
    });
    setDownloadStatus(success ? 'done' : 'idle');
    setTimeout(() => setDownloadStatus('idle'), 2500);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f4f5f7] text-slate-900 flex flex-col font-sans select-none">
      {/* Input oculto para subida local */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
        onChange={handleLocalFileSelect}
        className="hidden"
      />

      {/* 1. Header Superior Minimalista Estilo Claude */}
      <header className="h-14 bg-white border-b border-slate-200/90 px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Izquierda: Icono App + Migas de pan Proyecto / Portal */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[20px]">view_in_ar</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="font-bold text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white rounded px-1.5 py-0.5 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none transition-all max-w-[220px] sm:max-w-[280px] truncate"
              title="Haz clic para renombrar la promoción"
            />
            <span className="text-slate-400">/</span>
            <button
              onClick={() => setIsGalleryOpen(true)}
              className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded px-1.5 py-0.5 transition cursor-pointer"
              title="Cambiar vivienda o tipología"
            >
              <span>{config.unitIdentifier || 'Portal 1 · 1º A'}</span>
              <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
            </button>
          </div>
        </div>

        {/* Derecha: Estado IA + Deshacer + Galería + Botón Amueblar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge Estado Servidor IA */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Claude / Gemini vía servidor</span>
          </div>

          {/* Botones de acción rápidos */}
          <div className="flex items-center gap-1 text-slate-500">
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition disabled:opacity-30 cursor-pointer"
              title="Deshacer cambio (Ctrl+Z)"
            >
              <span className="material-symbols-outlined text-[20px]">undo</span>
            </button>
            <button
              onClick={() => {}}
              disabled={true}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition disabled:opacity-30 cursor-pointer"
              title="Rehacer"
            >
              <span className="material-symbols-outlined text-[20px]">redo</span>
            </button>
            <button
              onClick={() => setIsGalleryOpen(true)}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Galería de planos de la promoción"
            >
              <span className="material-symbols-outlined text-[20px]">folder_open</span>
            </button>
            <button
              onClick={() => setIsBatchUploadOpen(true)}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Subida masiva de planos"
            >
              <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
            </button>
          </div>

          {/* Botón Primario: Amueblar */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !sourceImage}
            className="px-4 py-2 bg-[#254b8c] hover:bg-[#1d3d75] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isGenerating ? 'sync' : 'auto_awesome'}
            </span>
            <span>{isGenerating ? 'Generando...' : 'Amueblar'}</span>
          </button>
        </div>
      </header>

      {/* 2. Cuerpo Principal: LeftRail + Sub-panel Contextual + ClaudeCanvas */}
      <div className="flex-1 flex overflow-hidden w-full h-[calc(100vh-56px)]">
        {/* Rail Vertical Izquierdo de Iconos */}
        <LeftRail
          activeTab={activeSidebarTab}
          onSelectTab={(tab) => {
            setActiveSidebarTab(tab);
            if (tab === 'plano') setCanvasViewMode('plano');
            else if (tab === 'amueblar' && renderedResult) setCanvasViewMode('amueblado');
            else if (tab === 'ficha') setCanvasViewMode('ficha');
          }}
          roomCount={config.roomMarkers?.length || 0}
          changesCount={history.length}
        />

        {/* Panel Contextual Secundario */}
        <aside className="w-[360px] xl:w-[390px] 2xl:w-[410px] shrink-0 bg-white border-r border-slate-200 h-full overflow-hidden flex flex-col z-10 shadow-xs">
          {activeSidebarTab === 'plano' && (
            <TabPlano
              sourceImage={sourceImage}
              onUploadFile={() => fileInputRef.current?.click()}
              onClearPlan={() => {
                setSourceImage(null);
                originalSourceImageRef.current = null;
                uncleanedSourceImageRef.current = null;
                cleanedSourceImageRef.current = null;
                setIsTextCleaned(false);
                setIsPlanIsolated(false);
                detectedBlueprintBoxRef.current = null;
                setRenderedResult(null);
              }}
              onDetectWithAI={handleDetectRooms}
              isDetectingWithAI={isAnalyzingPlan}
              isPlanIsolated={isPlanIsolated}
              onToggleIsolatePlan={handleToggleIsolatePlan}
              isTextCleaned={isTextCleaned}
              onToggleCleanText={handleToggleCleanText}
              removeOriginalFurniture={removeOriginalFurniture}
              onToggleRemoveOriginalFurniture={setRemoveOriginalFurniture}
              isEraserMode={isEraserMode}
              onToggleEraserMode={() => setIsEraserMode(!isEraserMode)}
              detectedTextCount={3}
              imageDimensions={imageDimensions}
              onLoadSample={handleLoadSample}
            />
          )}

          {activeSidebarTab === 'estancias' && (
            <TabEstancias
              markers={config.roomMarkers || []}
              onAddMarker={handleAddMarker}
              onUpdateMarker={handleUpdateMarker}
              onDeleteMarker={handleDeleteMarker}
              onClearMarkers={() => setConfig((prev) => ({ ...prev, roomMarkers: [] }))}
              activeMarkerId={activeMarkerId}
              onSelectMarker={setActiveMarkerId}
              isPinningMode={isPinningMode}
              onTogglePinningMode={() => setIsPinningMode(!isPinningMode)}
              customTotalUsefulArea={config.customTotalUsefulArea}
              onChangeCustomTotalUsefulArea={(val) =>
                setConfig((prev) => ({ ...prev, customTotalUsefulArea: val }))
              }
            />
          )}

          {activeSidebarTab === 'estilo' && (
            <TabEstilo
              config={config}
              onChangeConfig={setConfig}
              presets={presets}
              activePresetId={activePresetId}
              onApplyPreset={handleApplyPreset}
              onSavePreset={(name) => handleSavePreset(name, config)}
              onApplyChangesInstant={() => {
                setGenerationSuccessMessage('Estilo de renderizado actualizado');
                setTimeout(() => setGenerationSuccessMessage(null), 3000);
              }}
            />
          )}

          {activeSidebarTab === 'calidades' && (
            <TabCalidades
              config={config}
              onChangeConfig={setConfig}
              onApplyChangesInstant={() => {
                setGenerationSuccessMessage('Memoria de calidades aplicada al instante');
                setTimeout(() => setGenerationSuccessMessage(null), 3000);
              }}
            />
          )}

          {activeSidebarTab === 'amueblar' && (
            <TabAmueblar
              currentVersion={currentVersionNumber}
              roomMarkers={config.roomMarkers || []}
              furnitureItems={furnitureItems}
              selectedFurnitureId={selectedFurnitureId}
              onSelectFurniture={setSelectedFurnitureId}
              onUpdateFurniture={handleUpdateFurniture}
              onDeleteFurniture={handleDeleteFurniture}
              onAddFurniture={handleAddFurniture}
              onApplyCorrection={handleApplyTargetedCorrection}
              isGenerating={isGenerating}
              hasRender={!!renderedResult}
              isPaintingMode={isPaintingMode}
              onTogglePaintingMode={() => {
                const next = !isPaintingMode;
                setIsPaintingMode(next);
                if (next) setActiveSidebarTab('amueblar');
              }}
              strokeCount={paintedStrokes.length}
              brushSize={brushSize}
              onChangeBrushSize={setBrushSize}
              onClearStrokes={() => setPaintedStrokes([])}
              onViewPromptModal={() => setIsPromptModalOpen(true)}
              activeDefectMark={activeDefectMark}
              onClearDefectMark={() => setActiveDefectMark(null)}
              externalPrefillText={externalPrefillText}
              onClearPrefill={() => setExternalPrefillText(null)}
            />
          )}

          {activeSidebarTab === 'ficha' && (
            <TabFicha
              projectTitle={projectTitle}
              onChangeProjectTitle={setProjectTitle}
              unitIdentifier={config.unitIdentifier || 'Portal 1 · 1º A'}
              onChangeUnitIdentifier={(val) =>
                setConfig((prev) => ({ ...prev, unitIdentifier: val }))
              }
              agencyPhone={config.agencyPhone}
              onChangeAgencyPhone={(val) =>
                setConfig((prev) => ({ ...prev, agencyPhone: val || undefined }))
              }
              onExportPDF={() => setIsExportOpen(true)}
              onExportPNG={handleDownloadRender}
              onExportProjectZip={() => setIsExportOpen(true)}
              roomMarkers={config.roomMarkers || []}
            />
          )}
        </aside>

        {/* Canvas Central */}
        <main className="flex-1 h-full overflow-hidden relative flex flex-col">
          {/* Mensajes de feedback */}
          {generationError && (
            <div className="absolute top-16 left-6 right-6 z-40 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between shadow-md">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-red-600">error</span>
                <span>{generationError}</span>
              </span>
              <button
                type="button"
                onClick={() => setGenerationError(null)}
                className="text-red-500 hover:text-red-800 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {generationSuccessMessage && (
            <div className="absolute top-16 left-6 right-6 z-40 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-md">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                <span>{generationSuccessMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setGenerationSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-800 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <ClaudeCanvas
            sourceImage={sourceImage}
            renderedResult={renderedResult}
            isGenerating={isGenerating}
            roomMarkers={config.roomMarkers || []}
            activeMarkerId={activeMarkerId}
            onSelectMarker={setActiveMarkerId}
            isPinningMode={isPinningMode}
            onCanvasClickToPositionMarker={handleCanvasClickToPositionMarker}
            onUpdateMarkerPosition={(id, x, y) => handleUpdateMarker(id, { x, y })}
            isPaintingMode={isPaintingMode}
            onTogglePaintingMode={() => {
              const next = !isPaintingMode;
              setIsPaintingMode(next);
              if (next) setActiveSidebarTab('amueblar');
            }}
            brushSize={brushSize}
            onChangeBrushSize={setBrushSize}
            paintedStrokes={paintedStrokes}
            onAddStroke={(s) => setPaintedStrokes((prev) => [...prev, s])}
            onClearStrokes={() => setPaintedStrokes([])}
            activeDefectMark={activeDefectMark}
            onSetDefectMark={(mark) => {
              setActiveDefectMark(mark);
              setActiveSidebarTab('amueblar');
            }}
            onAnnotationComplete={(prefill) => {
              setExternalPrefillText(prefill);
              setActiveSidebarTab('amueblar');
            }}
            history={history}
            currentVersion={currentVersionNumber}
            onSelectVersion={handleRestoreVersion}
            projectTitle={projectTitle}
            unitIdentifier={config.unitIdentifier || 'Portal 1 · 1º A'}
            furnitureItems={furnitureItems}
            selectedFurnitureId={selectedFurnitureId}
            onSelectFurniture={setSelectedFurnitureId}
            onUpdateFurniture={handleUpdateFurniture}
            onDeleteFurniture={handleDeleteFurniture}
            viewMode={canvasViewMode}
            onChangeViewMode={setCanvasViewMode}
            onUploadFile={() => fileInputRef.current?.click()}
            onDropFile={processUploadedFile}
            isEraserMode={isEraserMode}
            onEraseAtPoint={handleEraseTextAtPoint}
          />
        </main>
      </div>

      {/* Modal para ver el encargo/prompt enviado */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Encargo arquitectónico enviado (v{currentVersionNumber})
              </h3>
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-xs font-mono text-slate-700 max-h-80 overflow-y-auto leading-relaxed border border-slate-200">
              {currentPrompt}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentPrompt);
                  setGenerationSuccessMessage('Encargo copiado al portapapeles');
                  setIsPromptModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
              >
                Copiar Encargo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      <IntroModal isOpen={isIntroOpen} onClose={() => setIsIntroOpen(false)} />
      <ProjectExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        config={config}
        currentPrompt={currentPrompt}
        projectTitle={projectTitle}
        renderedResult={renderedResult}
        history={history}
      />
      <InteriorSceneModal
        isOpen={isInteriorModalOpen}
        onClose={() => setIsInteriorModalOpen(false)}
        scene={activeInteriorScene}
        allScenes={interiorScenes}
        onSelectScene={(scene) => setActiveInteriorScene(scene)}
        onRegenerateScene={handleRegenerateInteriorScene}
        isRegenerating={isGeneratingInterior}
      />
      <BatchUploadModal
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        initialPromotionId={activePromotionId}
        onUploadComplete={(promoId) => {
          setActivePromotionId(promoId);
          setIsBatchUploadOpen(false);
          setIsGalleryOpen(true);
        }}
      />
      <PromotionPlansGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        activePromotionId={activePromotionId}
        onSelectPlan={handleSelectPlanFromSupabase}
        onOpenBatchUpload={() => {
          setIsGalleryOpen(false);
          setIsBatchUploadOpen(true);
        }}
      />
    </div>
  );
}

export default App;
