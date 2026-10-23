import React, { useState, useEffect, useRef } from 'react';
import { FurnitureItem } from '../../types';

interface FurnitureLayerProps {
  furnitureItems: FurnitureItem[];
  selectedFurnitureId: string | null;
  onSelectFurniture: (id: string | null) => void;
  onUpdateFurniture: (id: string, updates: Partial<FurnitureItem>) => void;
  onDeleteFurniture: (id: string) => void;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
}

export function FurnitureLayer({
  furnitureItems,
  selectedFurnitureId,
  onSelectFurniture,
  onUpdateFurniture,
  onDeleteFurniture,
  canvasContainerRef,
  imageRef
}: FurnitureLayerProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number; itemX: number; itemY: number } | null>(null);

  // Escuchar atajos de teclado globales (R para rotar, Supr para eliminar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFurnitureId) return;

      // Si el usuario está escribiendo en un input o textarea, ignorar atajos
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const selected = furnitureItems.find((f) => f.id === selectedFurnitureId);
      if (!selected) return;

      // 'R' o 'r' -> Girar +45 grados
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        const nextRotation = (selected.rotation + 45) % 360;
        onUpdateFurniture(selected.id, { rotation: nextRotation });
        return;
      }

      // 'Delete' o 'Backspace' -> Eliminar objeto
      if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Supr') {
        e.preventDefault();
        onDeleteFurniture(selected.id);
        onSelectFurniture(null);
        return;
      }

      // 'Escape' -> Deseleccionar
      if (e.key === 'Escape') {
        onSelectFurniture(null);
        return;
      }

      // Flechas -> Desplazamiento fino (Nudge)
      const step = e.shiftKey ? 1.5 : 0.4;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdateFurniture(selected.id, { x: Math.max(0, selected.x - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdateFurniture(selected.id, { x: Math.min(100, selected.x + step) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateFurniture(selected.id, { y: Math.max(0, selected.y - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateFurniture(selected.id, { y: Math.min(100, selected.y + step) });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFurnitureId, furnitureItems, onUpdateFurniture, onDeleteFurniture, onSelectFurniture]);

  // Arrastre con Pointer
  const handlePointerDownItem = (e: React.PointerEvent, item: FurnitureItem) => {
    e.stopPropagation();
    onSelectFurniture(item.id);
    setDraggingId(item.id);
    dragStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      itemX: item.x,
      itemY: item.y
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingId || !dragStartPosRef.current || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStartPosRef.current.clientX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStartPosRef.current.clientY) / rect.height) * 100;

      const newX = Math.max(1, Math.min(99, dragStartPosRef.current.itemX + deltaXPercent));
      const newY = Math.max(1, Math.min(99, dragStartPosRef.current.itemY + deltaYPercent));

      onUpdateFurniture(draggingId, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
    };

    const handlePointerUp = () => {
      setDraggingId(null);
      dragStartPosRef.current = null;
    };

    if (draggingId) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingId, imageRef, onUpdateFurniture]);

  // Escala en píxeles aproximada por metro (1m ≈ 24px en pantalla estándar)
  const scaleMetersToPx = 25;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      {furnitureItems.map((item) => {
        const isSelected = selectedFurnitureId === item.id;
        const widthPx = Math.max(16, item.widthMeters * scaleMetersToPx);
        const depthPx = Math.max(14, item.depthMeters * scaleMetersToPx);

        return (
          <div
            key={item.id}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${widthPx}px`,
              height: `${depthPx}px`,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
              transformOrigin: 'center center'
            }}
            onPointerDown={(e) => handlePointerDownItem(e, item)}
            className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing transition-shadow group ${
              isSelected
                ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white shadow-2xl z-50'
                : 'hover:ring-1 hover:ring-blue-400 hover:shadow-md'
            }`}
          >
            {/* Renderizado de Bloque CAD Arquitectónico según Tipo */}
            <div className="w-full h-full relative rounded overflow-hidden flex items-center justify-center border border-slate-700/80 shadow-xs">
              {/* Sofá */}
              {(item.type === 'sofa' || item.type === 'corner_sofa') && (
                <div className="w-full h-full bg-[#cbd5e1]/90 flex flex-col justify-between p-0.5">
                  <div className="w-full h-1.5 bg-slate-500 rounded-xs" />
                  <div className="flex-1 flex gap-0.5 my-0.5">
                    <div className="flex-1 bg-white/70 rounded-xs border border-slate-400/50" />
                    <div className="flex-1 bg-white/70 rounded-xs border border-slate-400/50" />
                    <div className="flex-1 bg-white/70 rounded-xs border border-slate-400/50" />
                  </div>
                </div>
              )}

              {/* Cama doble o individual */}
              {(item.type === 'bed_double' || item.type === 'bed_single') && (
                <div className="w-full h-full bg-[#fef3c7]/95 flex flex-col justify-between p-0.5 border-t-2 border-t-amber-800">
                  <div className="flex justify-around items-center pt-0.5">
                    <div className="w-2.5 h-1.5 bg-white rounded-xs shadow-2xs border border-amber-400" />
                    {item.type === 'bed_double' && (
                      <div className="w-2.5 h-1.5 bg-white rounded-xs shadow-2xs border border-amber-400" />
                    )}
                  </div>
                  <div className="w-full h-2/3 bg-amber-100/90 rounded-xs border-t border-dashed border-amber-500/50" />
                </div>
              )}

              {/* Mesas de comedor o centro */}
              {(item.type === 'dining_table' || item.type === 'coffee_table') && (
                <div className="w-full h-full bg-[#f1f5f9]/95 flex items-center justify-center p-0.5 border border-slate-500">
                  <div className="w-full h-full border border-dashed border-slate-400 rounded-xs flex items-center justify-center">
                    <span className="text-[8px] font-bold text-slate-500 leading-none">
                      {item.widthMeters}×{item.depthMeters}
                    </span>
                  </div>
                </div>
              )}

              {/* Cocina: Bancada o Isla */}
              {(item.type === 'kitchen_counter' || item.type === 'kitchen_island') && (
                <div className="w-full h-full bg-[#e2e8f0]/95 flex items-center justify-around p-0.5 border-2 border-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full border border-slate-500" />
                  <div className="w-3 h-2 border border-slate-500 rounded-xs" />
                </div>
              )}

              {/* Mueble TV */}
              {item.type === 'tv_unit' && (
                <div className="w-full h-full bg-[#334155]/95 flex items-center justify-center p-0.5">
                  <div className="w-3/4 h-0.5 bg-white/80 rounded" />
                </div>
              )}

              {/* Alfombra */}
              {item.type === 'rug' && (
                <div className="w-full h-full bg-indigo-50/70 border-2 border-dashed border-indigo-300 rounded-xs" />
              )}

              {/* Mesilla o Armario o Escritorio */}
              {item.type === 'wardrobe' && (
                <div className="w-full h-full bg-[#d6d3d1]/95 flex items-center justify-around">
                  <div className="h-full w-[1px] bg-stone-500" />
                  <div className="h-full w-[1px] bg-stone-500" />
                </div>
              )}

              {item.type === 'desk' && (
                <div className="w-full h-full bg-[#ffedd5]/95 flex items-center justify-center">
                  <div className="w-2 h-1.5 bg-slate-700 rounded-xs" />
                </div>
              )}

              {item.type === 'plant' && (
                <div className="w-full h-full rounded-full bg-emerald-100 border border-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-emerald-700">spa</span>
                </div>
              )}

              {/* Genérico */}
              {!['sofa', 'corner_sofa', 'bed_double', 'bed_single', 'dining_table', 'coffee_table', 'kitchen_counter', 'kitchen_island', 'tv_unit', 'rug', 'wardrobe', 'desk', 'plant'].includes(item.type) && (
                <div className="w-full h-full bg-slate-200/90 border border-slate-500 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-slate-700">{item.name[0]}</span>
                </div>
              )}
            </div>

            {/* Barra flotante de acciones cuando está seleccionado */}
            {isSelected && (
              <div
                style={{
                  transform: `rotate(${-item.rotation}deg)`,
                  transformOrigin: 'bottom center'
                }}
                className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-slate-900/95 text-white rounded-lg p-1 shadow-2xl text-[10px] whitespace-nowrap backdrop-blur-md"
              >
                <span className="font-bold px-1.5 text-slate-200">{item.name}</span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = (item.rotation + 45) % 360;
                    onUpdateFurniture(item.id, { rotation: next });
                  }}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded flex items-center gap-0.5 text-blue-400 font-bold transition cursor-pointer"
                  title="Girar 45° (Tecla R)"
                >
                  <span className="material-symbols-outlined text-[13px]">rotate_right</span>
                  <span>R ({item.rotation}°)</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFurniture(item.id);
                    onSelectFurniture(null);
                  }}
                  className="p-1 hover:bg-red-600 text-slate-400 hover:text-white rounded transition cursor-pointer"
                  title="Eliminar objeto (Tecla Supr)"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
