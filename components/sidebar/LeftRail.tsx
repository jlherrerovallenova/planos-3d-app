import React from 'react';

export type ActiveSidebarTab = 'plano' | 'estancias' | 'estilo' | 'calidades' | 'amueblar' | 'ficha';

interface LeftRailProps {
  activeTab: ActiveSidebarTab;
  onSelectTab: (tab: ActiveSidebarTab) => void;
  roomCount: number;
  changesCount: number;
}

export function LeftRail({
  activeTab,
  onSelectTab,
  roomCount,
  changesCount
}: LeftRailProps) {
  const items: {
    id: ActiveSidebarTab;
    label: string;
    icon: string;
    badge?: number;
  }[] = [
    { id: 'plano', label: 'Plano', icon: 'description' },
    { id: 'estancias', label: 'Estancias', icon: 'location_on', badge: roomCount > 0 ? roomCount : undefined },
    { id: 'estilo', label: 'Estilo', icon: 'palette' },
    { id: 'calidades', label: 'Calidades', icon: 'layers' },
    { id: 'amueblar', label: 'Amueblar', icon: 'auto_awesome', badge: changesCount > 0 ? changesCount : undefined },
    { id: 'ficha', label: 'Ficha', icon: 'article' },
  ];

  return (
    <nav className="w-[72px] shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-3 select-none z-20">
      <div className="flex flex-col gap-2 w-full px-2">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-150 cursor-pointer group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-500/20 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              title={item.label}
            >
              {/* Badge contador */}
              {item.badge !== undefined && (
                <span className="absolute top-1.5 right-2 min-w-[17px] h-[17px] px-1 bg-slate-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-xs">
                  {item.badge}
                </span>
              )}

              <span className={`material-symbols-outlined text-[23px] transition-transform group-hover:scale-105 ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                {item.icon}
              </span>
              <span className="text-[11px] mt-1 font-medium tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
