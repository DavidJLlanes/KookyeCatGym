import { Apple, ClipboardList, Dumbbell, Images, Play, TrendingUp, Users } from 'lucide-react';

export type AppTab = 'train' | 'routines' | 'exercises' | 'progress' | 'nutrition' | 'photos' | 'users';

const BASE_TABS = [
  { id: 'train', label: 'Entrenar', icon: Play },
  { id: 'routines', label: 'Rutinas', icon: ClipboardList },
  { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
  { id: 'progress', label: 'Progreso', icon: TrendingUp },
  { id: 'nutrition', label: 'Nutrición', icon: Apple },
  { id: 'photos', label: 'Fotos', icon: Images },
] as const;

/** Pestañas visibles: «Usuarios» solo para administradores. */
function tabsFor(isAdmin: boolean) {
  return [...BASE_TABS, ...(isAdmin ? [{ id: 'users', label: 'Usuarios', icon: Users } as const] : [])];
}

interface NavProps {
  current: AppTab;
  isAdmin: boolean;
  onSelect: (tab: AppTab) => void;
}

/** Navegación horizontal de la cabecera (escritorio). */
export function DesktopNav({ current, isAdmin, onSelect }: NavProps) {
  return (
    <nav className="hidden md:flex items-center gap-1.5">
      {tabsFor(isAdmin).map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
              current === tab.id
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Barra inferior (móvil, con espacio para el home indicator de iOS). Cada botón
 * ocupa todo su carril para que el área táctil sea cómoda.
 */
export function MobileNav({ current, isAdmin, onSelect }: NavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] flex z-30 shadow-2xl">
      {tabsFor(isAdmin).map((tab) => {
        const Icon = tab.icon;
        const isSelected = current === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            aria-current={isSelected ? 'page' : undefined}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-0.5 py-2 min-h-[3.5rem] cursor-pointer"
          >
            <div
              className={`flex h-7 w-11 max-w-full items-center justify-center rounded-full transition-all ${
                isSelected ? 'bg-blue-600/25 text-blue-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className={`block w-full truncate text-center text-[10px] leading-none tracking-tight ${isSelected ? 'text-blue-300 font-black' : 'text-slate-400 font-semibold'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
