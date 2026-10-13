import React, { useState, useMemo, useRef } from 'react';
import {
  RenderConfig,
  PresetConfig,
  RenderHistoryItem,
  RoomMarker
} from './types';
import {
  DEFAULT_PRESETS,
  SAMPLE_PLANS,
  ROOM_CATEGORIES
} from './constants';
import { buildArchitecturalPrompt } from './services/promptBuilder';
import { PlanCanvasPreview } from './components/PlanCanvasPreview';
import { StyleSelector } from './components/StyleSelector';
import { IntroModal } from './components/IntroModal';
import { ProjectExportModal } from './components/ProjectExportModal';
import { safeDownloadFile, cleanBase64Data } from './services/downloadHelper';

export function App() {
  // 1. Configuración de renderizado
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

  // 4. Estados de Generación y Descarga
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
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
          setSourceImage({
            base64: cleanBase64,
            mimeType: item.mimeType || mimeType,
            name: item.name || 'Plano desde galería',
            mediaId: item.mediaId
          });
          setRenderedResult(null);
          setGenerationError(null);
          return;
        }
      } catch (err) {
        console.warn('Error al seleccionar de Flow Media:', err);
      }
    }

    // Si no está Flow o falla, abrir selector de archivos local
    fileInputRef.current?.click();
  };

  // Cargar muestra de demostración
  const handleLoadSample = (sampleUrl: string, sampleName: string) => {
    // Convertir muestra externa a base64 seguro
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
      }
    };
    img.src = sampleUrl;
  };

  // Manejo de Pines en el Canvas
  const handleCanvasClickToPositionMarker = (x: number, y: number) => {
    if (!config.roomMarkers || config.roomMarkers.length === 0) {
      // Si no hay marcadores creados, añadir el primero en el punto clickeado
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
      // Mover el pin actualmente seleccionado a las nuevas coordenadas
      setConfig((prev) => ({
        ...prev,
        roomMarkers: prev.roomMarkers.map((m) =>
          m.id === activeMarkerId ? { ...m, x, y } : m
        )
      }));
    } else {
      // Si no hay ninguno activo, mover el último de la lista o activar el más cercano
      const last = config.roomMarkers[config.roomMarkers.length - 1];
      setConfig((prev) => ({
        ...prev,
        roomMarkers: prev.roomMarkers.map((m) =>
          m.id === last.id ? { ...m, x, y } : m
        )
      }));
      setActiveMarkerId(last.id);
    }
  };

  // Manejo de Presets
  const handleApplyPreset = (preset: PresetConfig) => {
    setActivePresetId(preset.id);
    setConfig({
      ...preset.config,
      // Conservar marcadores de habitación ya colocados por el usuario si los hay
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
      setGenerationError('Por favor, selecciona o sube un plano antes de generar.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    const flowSdk = (window as any).Flow;

    try {
      // 1. Si Flow SDK está disponible
      if (flowSdk && typeof flowSdk.generate?.image === 'function') {
        const refIds = sourceImage.mediaId ? [sourceImage.mediaId] : [];
        let genRes: any = null;

        try {
          // Intento con modelo principal
          genRes = await flowSdk.generate.image({
            prompt: currentPrompt,
            referenceImageMediaIds: refIds,
            aspectRatio: config.aspectRatio,
            modelDisplayName: '🍌 Nano Banana Pro'
          });
        } catch (modelErr) {
          console.warn('Fallo con Nano Banana Pro, reintentando con Nano Banana 2.1:', modelErr);
          // Fallback dinámico a versión 2.1
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

          // Guardar en historial
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
          setIsGenerating(false);
          return;
        }
      }

      // 2. Llamada directa a la API de Gemini (entorno local o Vite)
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('No se encontró VITE_GEMINI_API_KEY en .env.local para procesar el render.');
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

          // Incluir plano 2D de referencia
          if (sourceImage && sourceImage.base64) {
            const { cleanBase64, mimeType } = cleanBase64Data(sourceImage.base64);
            parts.push({
              inlineData: {
                mimeType: sourceImage.mimeType || mimeType || 'image/jpeg',
                data: cleanBase64
              }
            });
          }

          // Incluir prompt arquitectónico compilado
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
          console.warn(`Error al conectar con ${model}:`, modelErr);
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
        setIsGenerating(false);
        return;
      }

      throw new Error(
        lastErrorMessage ||
          'El modelo generativo no devolvió una imagen renderizada válida. Revisa tu conexión y clave de API.'
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
      filename: `plano_3d_${config.cameraAngle}_${Date.now()}.png`
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

      {/* Barra de Navegación Superior */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c25e38] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[22px]">view_in_ar</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif italic text-lg lg:text-xl text-stone-900 font-normal">
                Dollhouse 3D Studio
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-[#c25e38]">
                Arquitectura IA
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              Generador de maquetas seccionadas 3D y planos comerciales amueblados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Muestras rápidas si no hay plano */}
          {!sourceImage && (
            <div className="hidden md:flex items-center gap-1.5 mr-2">
              <span className="text-[11px] text-stone-400 font-medium">Probar muestra:</span>
              {SAMPLE_PLANS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLoadSample(sample.url, sample.name)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                >
                  {sample.type}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsIntroOpen(true)}
            className="p-2 lg:px-3 lg:py-1.5 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition flex items-center gap-1.5"
            title="Guía de uso"
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
            <span className="hidden lg:inline">Guía</span>
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition flex items-center gap-1.5 border border-stone-200"
          >
            <span className="material-symbols-outlined text-[17px]">download</span>
            <span>Exportar</span>
          </button>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !sourceImage}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#c25e38] hover:bg-[#a84d2b] disabled:opacity-50 text-white shadow-xs transition flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isGenerating ? 'progress_activity' : 'auto_awesome'}
            </span>
            <span>{isGenerating ? 'Generando...' : 'Generar Render 3D'}</span>
          </button>
        </div>
      </header>

      {/* Espacio de Trabajo Principal */}
      <main className="flex-1 p-3 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1850px] w-full mx-auto">
        {/* Columna Izquierda: Visor de Planos y Canvas (7 columnas) */}
        <section className="lg:col-span-7 flex flex-col gap-3 min-h-[500px]">
          {generationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{generationError}</span>
              </span>
              <button
                onClick={() => setGenerationError(null)}
                className="text-red-500 hover:text-red-800 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex-1 h-full min-h-[480px]">
            <PlanCanvasPreview
              sourceImage={sourceImage}
              renderedResult={renderedResult}
              isGenerating={isGenerating}
              cameraAngle={config.cameraAngle}
              roomMarkers={config.roomMarkers || []}
              activeMarkerId={activeMarkerId}
              isPinningMode={isPinningMode}
              onMarkerClick={(id) => setActiveMarkerId(id)}
              onCanvasClickToPositionMarker={handleCanvasClickToPositionMarker}
              onClearPlan={() => {
                setSourceImage(null);
                setRenderedResult(null);
              }}
              onSelectFromGallery={handleSelectFromGallery}
              onUploadLocalFile={() => fileInputRef.current?.click()}
              onDownloadRender={handleDownloadRender}
              downloadStatus={downloadStatus}
            />
          </div>
        </section>

        {/* Columna Derecha: Selector de Estilos & Memoria de Calidades (5 columnas) */}
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
            disabled={isGenerating}
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
        renderedResult={renderedResult}
        history={history}
      />
    </div>
  );
}

export default App;
