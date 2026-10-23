import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  RenderConfig,
  PresetConfig,
  RenderHistoryItem,
  RoomMarker,
  RoomCategory,
  DefectMark,
  InteriorScene,
  PromotionPlan
} from './types';
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
    <div className="min-h-screen bg-[#fcfbfa] text-stone-900 flex flex-col font-sans selection:bg-[#c25e38] selection:text-white">
      {/* Input oculto para subida local */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
        onChange={handleLocalFileSelect}
        className="hidden"
      />

      {/* 1. Header Comercial / Barra Superior */}
      <header className="border-b border-stone-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#c25e38] to-[#e07a5f] text-white flex items-center justify-center shadow-md shadow-[#c25e38]/20">
            <span className="material-symbols-outlined text-[24px]">view_in_ar</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="font-serif italic text-lg lg:text-xl text-stone-900 font-normal bg-transparent hover:bg-stone-50 focus:bg-white rounded-lg px-1.5 py-0.5 border border-transparent hover:border-stone-200 focus:border-[#c25e38] focus:outline-none transition-all"
                title="Haz clic para renombrar el proyecto"
              />
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#c25e38]">
                <span>✨</span> Estudio de Planos 3D
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden md:block">
              De plano 2D a maqueta arquitectónica 3D fotorrealista con IA
            </p>
          </div>
        </div>

        {/* Acciones principales a la derecha */}
        <div className="flex items-center gap-2">
          {/* Badge de conexión a IA */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Motor: Renderizado Inteligente IA</span>
          </div>

          {/* Selector y Subida Masiva de Promociones Supabase */}
          <div className="flex items-center gap-1 bg-indigo-50/80 border border-indigo-200/90 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setIsGalleryOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-950 hover:bg-white hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Explorar planos guardados por promoción, portal y tipología"
            >
              <span className="material-symbols-outlined text-[17px] text-indigo-600">apartment</span>
              <span className="max-w-[130px] truncate">
                {activePromotionName || 'Promociones'}
              </span>
            </button>
            <button
              onClick={() => setIsBatchUploadOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Subida masiva: subir todos los planos de la promoción con portal y tipología"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
              <span className="hidden sm:inline">Subida Masiva</span>
            </button>
          </div>

          {/* Botón Maximizar Área de Trabajo / Alternar Panel Lateral */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer shadow-2xs ${
              isSidebarOpen
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200'
                : 'bg-[#c25e38]/10 hover:bg-[#c25e38]/20 text-[#c25e38] border-[#c25e38]/30 font-bold'
            }`}
            title={isSidebarOpen ? 'Ocultar panel lateral (Área de trabajo máxima)' : 'Mostrar panel de calidades'}
          >
            <span className="material-symbols-outlined text-[17px]">
              {isSidebarOpen ? 'dock_to_right' : 'view_sidebar'}
            </span>
            <span className="hidden md:inline">
              {isSidebarOpen ? 'Ocultar Calidades' : 'Ver Calidades'}
            </span>
          </button>

          {/* Botón Alternar Ancho del Panel */}
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarWide((prev) => !prev)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer shadow-2xs bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200"
              title={isSidebarWide ? 'Cambiar a ancho estándar' : 'Cambiar a panel extra ancho'}
            >
              <span className="material-symbols-outlined text-[17px]">
                {isSidebarWide ? 'collapse_content' : 'expand_content'}
              </span>
              <span className="hidden md:inline">
                {isSidebarWide ? 'Ancho Cómodo' : 'Extra Ancho'}
              </span>
            </button>
          )}

          <button
            onClick={() => setIsIntroOpen(true)}
            className="p-2 lg:px-3 lg:py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition flex items-center gap-1.5 cursor-pointer"
            title="Guía rápida"
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
            <span className="hidden sm:inline">Guía</span>
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition flex items-center gap-1.5 border border-stone-200 cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[17px]">archive</span>
            <span>Exportar</span>
          </button>

          {/* Botón Primario de Generación */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !sourceImage}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#c25e38] hover:bg-[#a84d2b] disabled:opacity-50 text-white shadow-md shadow-[#c25e38]/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isGenerating ? 'progress_activity' : 'auto_awesome'}
            </span>
            <span>{isGenerating ? 'Renderizando...' : 'Generar Render 3D'}</span>
          </button>
        </div>
      </header>

      {/* 2. Barra de Pasos / Guía de Flujo Sutil */}
      <div className="bg-stone-100/60 border-b border-stone-200/80 px-4 lg:px-6 py-2 flex items-center justify-between text-xs text-stone-500 overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          <div className="flex items-center gap-2 font-medium">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                sourceImage ? 'bg-emerald-600 text-white' : 'bg-[#c25e38] text-white'
              }`}
            >
              {sourceImage ? '✓' : '1'}
            </span>
            <span className={sourceImage ? 'text-stone-900 font-semibold' : 'text-[#c25e38] font-bold'}>
              1. Carga tu Plano 2D
            </span>
          </div>

          <span className="text-stone-300">→</span>

          <div className="flex items-center gap-2 font-medium">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                config.roomMarkers?.length ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {config.roomMarkers?.length ? '✓' : '2'}
            </span>
            <span className={config.roomMarkers?.length ? 'text-stone-900 font-semibold' : 'text-stone-500'}>
              2. Marca Estancias ({config.roomMarkers?.length || 0})
            </span>
          </div>

          <span className="text-stone-300">→</span>

          <div className="flex items-center gap-2 font-medium">
            <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-[11px] font-bold">
              3
            </span>
            <span className="text-stone-900 font-semibold">
              3. Elige Estilo & Calidades
            </span>
          </div>

          <span className="text-stone-300">→</span>

          <div className="flex items-center gap-2 font-medium">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                renderedResult ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {renderedResult ? '✓' : '4'}
            </span>
            <span className={renderedResult ? 'text-emerald-700 font-bold' : 'text-stone-500'}>
              4. Render 3D & Descarga
            </span>
          </div>
        </div>

        {/* Acceso rápido a muestras de prueba */}
        {!sourceImage && (
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-stone-400">Probar plano muestra:</span>
            {SAMPLE_PLANS.map((sample) => (
              <button
                key={sample.url}
                onClick={() => handleLoadSample(sample.url, sample.name)}
                className="px-2.5 py-0.5 rounded-lg bg-white border border-stone-200 hover:border-[#c25e38] text-stone-700 text-[11px] font-medium transition cursor-pointer"
              >
                {sample.type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Espacio Principal de Trabajo (Aprovechamiento total del ancho de pantalla sin márgenes artificiales) */}
      <main className="flex-1 w-full px-3 sm:px-4 lg:px-6 py-3 flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Columna Izquierda: Visor Interactivo (Ocupa todo el espacio disponible) */}
        <section className="flex-1 min-w-0 flex flex-col gap-3 min-h-[540px]">
          {/* Mensajes de Notificación */}
          {generationError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between shadow-xs animate-fadeIn">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
                <span>{generationError}</span>
              </span>
              <button
                type="button"
                onClick={() => setGenerationError(null)}
                aria-label="Cerrar notificación de error"
                className="text-red-500 hover:text-red-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {generationSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-fadeIn">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                <span>{generationSuccessMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setGenerationSuccessMessage(null)}
                aria-label="Cerrar mensaje de éxito"
                className="text-emerald-500 hover:text-emerald-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex-1 h-full min-h-[500px]">
            <PlanCanvasPreview
              sourceImage={sourceImage}
              renderedResult={renderedResult}
              isGenerating={isGenerating}
              cameraAngle={config.cameraAngle}
              roomMarkers={config.roomMarkers || []}
              markerBadgeColor={config.markerBadgeColor || '#0F2C59'}
              onChangeMarkerBadgeColor={(color) => setConfig((prev) => ({ ...prev, markerBadgeColor: color }))}
              promotionLogo={config.promotionLogo || DEFAULT_PROMOTION_LOGO}
              onChangePromotionLogo={(logo) => setConfig((prev) => ({ ...prev, promotionLogo: logo || undefined }))}
              promotorLogo={config.promotorLogo || DEFAULT_PROMUEVE_LOGO}
              onChangePromotorLogo={(logo) => setConfig((prev) => ({ ...prev, promotorLogo: logo || undefined }))}
              commercialAgencyLogo={config.commercialAgencyLogo || DEFAULT_AGENCY_LOGO}
              onChangeCommercialAgencyLogo={(logo) => setConfig((prev) => ({ ...prev, commercialAgencyLogo: logo || undefined }))}
              agencyPhone={config.agencyPhone || '983 34 21 32'}
              onChangeAgencyPhone={(phone) => setConfig((prev) => ({ ...prev, agencyPhone: phone || undefined }))}
              unitIdentifier={config.unitIdentifier}
              onChangeUnitIdentifier={(val) => setConfig((prev) => ({ ...prev, unitIdentifier: val }))}
              isometricOrientation={config.isometricOrientation}
              isometricRotationAngle={config.isometricRotationAngle}
              onChangeIsometricOrientation={(orientation, angle) => setConfig((prev) => ({ ...prev, isometricOrientation: orientation, isometricRotationAngle: angle }))}
              onIsolatePlan={handleToggleIsolatePlan}
              isPlanIsolated={isPlanIsolated}
              isTextCleaned={isTextCleaned}
              onToggleCleanText={handleToggleCleanText}
              projectTitle={projectTitle}
              activeMarkerId={activeMarkerId}
              isPinningMode={isPinningMode}
              onMarkerClick={(id) => setActiveMarkerId(id)}
              onCanvasClickToPositionMarker={handleCanvasClickToPositionMarker}
              onAddMarker={handleAddMarker}
              onUpdateMarker={handleUpdateMarker}
              onDeleteMarker={handleDeleteMarker}
              onTogglePinningMode={() => setIsPinningMode(!isPinningMode)}
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
              onSelectFromGallery={handleSelectFromGallery}
              onUploadLocalFile={() => fileInputRef.current?.click()}
              onLoadSamplePlan={handleLoadSample}
              onDownloadRender={handleDownloadRender}
              downloadStatus={downloadStatus}
              onDetectWithAI={handleDetectRooms}
              isDetectingWithAI={isAnalyzingPlan}
              onCleanPlanTexts={handleCleanPlanTexts}
              isCleaningPlanText={isCleaningPlanText}
              onEraseTextAtPoint={handleEraseTextAtPoint}
              onApplyCorrection={handleApplyTargetedCorrection}
              currentVersion={currentVersionNumber}
              canUndo={history.length > 1}
              onUndoToPreviousVersion={handleUndo}
              isConvertingPdf={isConvertingPdf}
              pdfPagesInfo={pdfFileInfo ? { currentPage: pdfFileInfo.currentPage, numPages: pdfFileInfo.numPages } : null}
              onPdfPageChange={handlePdfPageChange}
              onDropFile={processUploadedFile}
              onGenerateInterior={handleGenerateRoomInterior}
              isGeneratingInterior={isGeneratingInterior}
              generatingRoomId={generatingRoomId}
              lighting={config.lighting}
              onChangeLighting={(l) => setConfig((prev) => ({ ...prev, lighting: l }))}
              customTotalUsefulArea={config.customTotalUsefulArea}
              onChangeCustomTotalUsefulArea={(val) => setConfig((prev) => ({ ...prev, customTotalUsefulArea: val }))}
            />

          </div>
        </section>

        {/* Columna Derecha: Panel de Estilo & Memoria de Calidades (Opcionalmente colapsable) */}
        {isSidebarOpen && (
          <section
            className={`w-full shrink-0 flex flex-col gap-3 animate-fadeIn transition-all duration-200 ${
              isSidebarWide
                ? 'lg:w-[500px] xl:w-[560px] 2xl:w-[620px]'
                : 'lg:w-[420px] xl:w-[460px] 2xl:w-[500px]'
            }`}
          >
            <StyleSelector
              config={config}
              onChangeConfig={setConfig}
              presets={presets}
              activePresetId={activePresetId}
              onApplyPreset={handleApplyPreset}
              onSavePreset={handleSavePreset}
              onDeletePreset={handleDeletePreset}
              onImportPresetJson={handleImportPresetJson}
              onSetDefaultConfig={handleSetDefaultConfig}
              activeMarkerId={activeMarkerId}
              onSelectMarker={setActiveMarkerId}
              isPinningMode={isPinningMode}
              onTogglePinningMode={() => setIsPinningMode(!isPinningMode)}
              onGenerateRender={handleGenerate}
              isGenerating={isGenerating}
              disabled={isGenerating || isAnalyzingPlan}
              onDetectWithAI={handleDetectRooms}
              isDetectingWithAI={isAnalyzingPlan}
              hasSourceImage={!!sourceImage}
              onGenerateInterior={handleGenerateRoomInterior}
              isGeneratingInterior={isGeneratingInterior}
              generatingRoomId={generatingRoomId}
              history={history}
              onApplyCorrection={handleApplyTargetedCorrection}
              onRestoreVersion={handleRestoreVersion}
              currentVersion={currentVersionNumber}
              isWide={isSidebarWide}
              onToggleWide={() => setIsSidebarWide((prev) => !prev)}
            />
          </section>
        )}
      </main>

      {/* Botón flotante para restaurar panel si está oculto */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-2xl bg-stone-900/95 hover:bg-stone-900 text-white text-xs font-bold shadow-2xl border border-stone-700/80 backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer animate-fadeIn"
          title="Abrir panel de estilos y calidades"
        >
          <span className="material-symbols-outlined text-[18px] text-[#c25e38]">tune</span>
          <span>Abrir Panel de Calidades</span>
        </button>
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
