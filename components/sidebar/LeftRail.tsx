import React from 'react';
import {
  FileImage,
  MapPin,
  Palette,
  Layers,
  Wand2,
  FileText,
  type LucideIcon
} from 'lucide-react';
import { cn } from '../ui/primitives';

export type ActiveSidebarTab = 'plano' | 'estancias' | 'estilo' | 'calidades' | 'amueblar' | 'ficha';

interface LeftRailProps {
  activeTab: ActiveSidebarTab;
  onSelectTab: (tab: ActiveSidebarTab) => void;
  roomCount: number;
  changesCount: number;
}

export function LeftRail({ activeTab, onSelectTab, roomCount, changesCount }: LeftRailProps) {
  const items: {
    id: ActiveSidebarTab;
    label: string;
    icon: LucideIcon;
    badge?: number;
  }[] = [
    { id: 'plano', label: 'Plano', icon: FileImage },
    { id: 'estancias', label: 'Estancias', icon: MapPin, badge: roomCount > 0 ? roomCount : undefined },
    { id: 'estilo', label: 'Estilo', icon: Palette },
    { id: 'calidades', label: 'Calidades', icon: Layers },
    { id: 'amueblar', label: 'Amueblar', icon: Wand2, badge: changesCount > 0 ? changesCount : undefined },
    { id: 'ficha', label: 'Ficha', icon: FileText }
  ];

  return (
    <nav className="w-[72px] shrink-0 bg-paper border-r border-rule flex flex-col items-center py-3 select-none z-20">
      <div className="flex flex-col gap-1 w-full px-2">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg transition-colors group',
                isActive ? 'text-prussian' : 'text-graphite hover:text-ink hover:bg-ink/[0.05]'
              )}
              title={item.label}
            >
              {/* Marca de sección activa */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 h-8 w-0.5 rounded-full bg-prussian transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
              <span
                className={cn(
                  'relative flex size-9 items-center justify-center rounded-lg transition-colors',
                  isActive && 'bg-prussian-soft'
                )}
              >
                <Icon className="size-[18px]" />
                {item.badge !== undefined && (
                  <span className="lettering tnum absolute -top-1 -right-1.5 min-w-4 h-4 px-1 bg-ink text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="lettering text-[11px] font-semibold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
