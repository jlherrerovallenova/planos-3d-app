import React, { useState, useMemo, useRef } from 'react';
import {
  RenderConfig,
  PresetConfig,
  RenderHistoryItem,
  RoomMarker
} from './types';
import {
  DEFAULT_PRESETS,
  SAMPLE_PLANS
} from './constants';
import { buildArchitecturalPrompt } from './services/promptBuilder';
import { PlanCanvasPreview } from './components/PlanCanvasPreview';
import { StyleSelector } from './components/StyleSelector';
import { IntroModal } from './components/IntroModal';
import { ProjectExportModal } from './components/ProjectExportModal';
import { safeDownloadFile, cleanBase64Data } from './services/downloadHelper';
import { analyzeBlueprintRooms } from './services/planAnalyzer';

export function App() {
  // 1. Título y Configuración de renderizado
  const [projectTitle, setProjectTitle] = useState<string>('Proyecto Residencial Los Álamos');
  const [presets, setPresets] = useState<PresetConfig[]>(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESETS[0].id);
  const [config, setConfig] = useState<RenderConfig>(DEFAULT_PRESETS[0].config);

  // 2. Estados de Imagen y Canvas
  const [sourceImage, setSourceImage] = useState<{
    base64: string;
    mimeType: string;
    name?: string;
    mediaId?: string;
  } | null>(null);

  const [renderedResult, setRenderedResult] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);

  // 3. Marcadores y Pines
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [isPinningMode, setIsPinningMode] = useState<boolean>(false);
  const [isAnalyzingPlan, setIsAnalyzingPlan] = useState<boolean>(false);

  // 4. Estados de Generación y Descarga
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccessMessage, setGenerationSuccessMessage] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');

  // 5. Historial y Modales
  const [history, setHistory] = useState<RenderHistoryItem[]>([]);
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prompt en tiempo real
  const currentPrompt = useMemo(() => {
    return buildArchitecturalPrompt(config);
  }, [config]);

  // Análisis automático de estancias y superficies útiles con Gemini Vision
  const triggerPlanAnalysis = async (imgBase64: string, mime: string) => {
    setIsAnalyzingPlan(true);
    setGenerationError(null);
    try {
      const result = await analyzeBlueprintRooms(imgBase64, mime);
      if (result.rooms && result.rooms.length > 0) {
        setConfig((prev) => ({
          ...prev,
          roomMarkers: result.rooms
        }));
        setGenerationSuccessMessage(
          `¡Plano analizado con IA! Se han detectado ${result.rooms.length} estancias con sus superficies útiles reales (${result.totalUsefulArea ? result.totalUsefulArea + ' m²' : ''}).`
        );
      }
    } catch (err: any) {
      console.warn('Auto-análisis con Gemini:', err);
    } finally {
      setIsAnalyzingPlan(false);
    }
  };

  const handleDetectRooms = async () => {
    if (!sourceImage) {
      setGenerationError('Carga primero una imagen del plano para analizarla.');
      return;
    }
    setIsAnalyzingPlan(true);
    setGenerationError(null);
    setGenerationSuccessMessage(null);
    try {
      const result = await analyzeBlueprintRooms(sourceImage.base64, sourceImage.mimeType);
      if (result.rooms && result.rooms.length > 0) {
        setConfig((prev) => ({
          ...prev,
          roomMarkers: result.rooms
        }));
        setGenerationSuccessMessage(
          `¡Extracción completada! Se detectaron ${result.rooms.length} estancias y sus superficies útiles (${result.totalUsefulArea ? result.totalUsefulArea + ' m²' : ''}).`
        );
      } else {
        setGenerationError('No se encontraron estancias rotuladas en el plano.');
      }
    } catch (err: any) {
      setGenerationError(`Error al analizar el plano: ${err?.message || err}`);
    } finally {
      setIsAnalyzingPlan(false);
    }
  };

  // Manejo de carga de archivos local
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
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

      setSourceImage({
        base64: cleanBase64,
        mimeType,
        name: file.name,
        mediaId
      });
      setRenderedResult(null);
      setGenerationError(null);
      // Extraer estancias y superficies automáticamente con IA
      triggerPlanAnalysis(cleanBase64, mimeType);
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Selección desde Galería Flow
  const handleSelectFromGallery = async () => {
    const flowSdk = (window as any).Flow;
    if (flowSdk && typeof flowSdk.media?.select === 'function') {
      try {
        const item = await flowSdk.media.select({ filter: 'image' });
        if (item && item.base64) {
          const { cleanBase64, mimeType } = cleanBase64Data(item.base64);
          const finalMime = item.mimeType || mimeType;
          setSourceImage({
            base64: cleanBase64,
            mimeType: finalMime,
            name: item.name || 'Plano desde galería',
            mediaId: item.mediaId
          });
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
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const { cleanBase64 } = cleanBase64Data(dataUrl);
        setSourceImage({
          base64: cleanBase64,
          mimeType: 'image/png',
          name: sampleName
        });
        setRenderedResult(null);
        setGenerationError(null);
        triggerPlanAnalysis(cleanBase64, 'image/png');
      }
    };
    img.src = sampleUrl;
  };

  // Manejo de Pines en el Canvas
  const handleCanvasClickToPositionMarker = (x: number, y: number) => {
    // Si no está activado el modo de pines o los marcadores están fijos, ignorar clics accidentales
    if (!isPinningMode) return;

    if (!config.roomMarkers || config.roomMarkers.length === 0) {
      const newMarker: RoomMarker = {
        id: `room_${Date.now()}`,
        name: 'Salón Principal',
        category: 'salon_comedor',
        x,
        y,
        notes: ''
      };
      setConfig((prev) => ({
        ...prev,
        roomMarkers: [newMarker]
      }));
      setActiveMarkerId(newMarker.id);
      return;
    }

    if (activeMarkerId) {
      setConfig((prev) => ({
        ...prev,
        roomMarkers: prev.roomMarkers.map((m) =>
          m.id === activeMarkerId ? { ...m, x, y } : m
        )
      }));
    }
  };

  const handleUpdateMarker = (id: string, updates: Partial<RoomMarker>) => {
    setConfig((prev) => ({
      ...prev,
      roomMarkers: prev.roomMarkers.map((m) => (m.id === id ? { ...m, ...updates } : m))
    }));
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

  // Generación con IA
  const handleGenerate = async () => {
    if (!sourceImage) {
      setGenerationError('Por favor, selecciona o sube un plano 2D antes de generar la maqueta.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccessMessage(null);

    const flowSdk = (window as any).Flow;

    try {
      // 1. Si Flow SDK está disponible
      if (flowSdk && typeof flowSdk.generate?.image === 'function') {
        const refIds = sourceImage.mediaId ? [sourceImage.mediaId] : [];
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
          const result = { base64: cleanBase64, mimeType: genRes.mimeType || mimeType };
          setRenderedResult(result);

          const historyItem: RenderHistoryItem = {
            id: `render_${Date.now()}`,
            mediaId: genRes.mediaId || '',
            base64: cleanBase64,
            mimeType: result.mimeType,
            prompt: currentPrompt,
            config: { ...config },
            timestamp: Date.now()
          };
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

      const candidateModels = [
        'nano-banana-pro-preview',
        'gemini-nano-banana-2.1',
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview'
      ];

      let generatedImage: { base64: string; mimeType: string } | null = null;
      let lastErrorMessage = '';

      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const parts: any[] = [];

          if (sourceImage && sourceImage.base64) {
            const { cleanBase64, mimeType } = cleanBase64Data(sourceImage.base64);
            parts.push({
              inlineData: {
                mimeType: sourceImage.mimeType || mimeType || 'image/jpeg',
                data: cleanBase64
              }
            });
          }

          parts.push({ text: currentPrompt });

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }]
            })
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
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Error llamando a ${model}:`, modelErr);
          lastErrorMessage = modelErr?.message || 'Error de conexión con Gemini';
        }
      }

      if (generatedImage) {
        setRenderedResult(generatedImage);

        const historyItem: RenderHistoryItem = {
          id: `render_${Date.now()}`,
          mediaId: 'gemini_nano_banana',
          base64: generatedImage.base64,
          mimeType: generatedImage.mimeType,
          prompt: currentPrompt,
          config: { ...config },
          timestamp: Date.now()
        };
        setHistory((prev) => [historyItem, ...prev]);
        setGenerationSuccessMessage('¡Maqueta 3D renderizada con éxito!');
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
      setIsGenerating(false);
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
        accept="image/png,image/jpeg,image/webp"
        onChange={handleLocalFileSelect}
        className="hidden"
      />

      {/* 1. Header Comercial / Barra Superior */}
      <header className="border-b border-stone-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between">
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
                <span>✨</span> Dollhouse 3D Studio
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
            <span>Motor: Gemini Nano Banana</span>
          </div>

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
      <div className="bg-stone-100/60 border-b border-stone-200/80 px-4 lg:px-8 py-2 flex items-center justify-between text-xs text-stone-500 overflow-x-auto">
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
            {SAMPLE_PLANS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadSample(sample.url, sample.name)}
                className="px-2.5 py-0.5 rounded-lg bg-white border border-stone-200 hover:border-[#c25e38] text-stone-700 text-[11px] font-medium transition cursor-pointer"
              >
                {sample.type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Espacio Principal de Trabajo (Proporción Áurea: 7 cols Canvas + 5 cols Control) */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1900px] w-full mx-auto">
        {/* Columna Izquierda: Visor Interactivo (7 columnas) */}
        <section className="lg:col-span-7 flex flex-col gap-3 min-h-[520px]">
          {/* Mensajes de Notificación */}
          {generationError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between shadow-xs animate-fadeIn">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
                <span>{generationError}</span>
              </span>
              <button
                onClick={() => setGenerationError(null)}
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
                onClick={() => setGenerationSuccessMessage(null)}
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
              projectTitle={projectTitle}
              activeMarkerId={activeMarkerId}
              isPinningMode={isPinningMode}
              onMarkerClick={(id) => setActiveMarkerId(id)}
              onCanvasClickToPositionMarker={handleCanvasClickToPositionMarker}
              onUpdateMarker={handleUpdateMarker}
              onDeleteMarker={handleDeleteMarker}
              onTogglePinningMode={() => setIsPinningMode(!isPinningMode)}
              onClearPlan={() => {
                setSourceImage(null);
                setRenderedResult(null);
              }}
              onSelectFromGallery={handleSelectFromGallery}
              onUploadLocalFile={() => fileInputRef.current?.click()}
              onLoadSamplePlan={handleLoadSample}
              onDownloadRender={handleDownloadRender}
              downloadStatus={downloadStatus}
              onDetectWithAI={handleDetectRooms}
              isDetectingWithAI={isAnalyzingPlan}
            />
          </div>
        </section>

        {/* Columna Derecha: Panel de Estilo & Memoria de Calidades (5 columnas) */}
        <section className="lg:col-span-5 flex flex-col gap-3">
          <StyleSelector
            config={config}
            onChangeConfig={setConfig}
            presets={presets}
            activePresetId={activePresetId}
            onApplyPreset={handleApplyPreset}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
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
          />
        </section>
      </main>

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
    </div>
  );
}

export default App;
