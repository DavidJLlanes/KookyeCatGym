import AppMenu from '../AppMenu';
import { assetUrl } from '../../utils/assetUrl';
import { AppTab, DesktopNav } from './AppNav';

interface AppHeaderProps {
  username: string;
  isAdmin: boolean;
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onBackup: () => void;
  onLogout: () => void;
}

/** Cabecera fija: marca, navegación de escritorio y menú (con espacio para el notch de iOS). */
export default function AppHeader({ username, isAdmin, currentTab, onSelectTab, onBackup, onLogout }: AppHeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 shadow-xl sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto safe-x sm:px-6 lg:px-8 min-h-16 py-2 flex items-center justify-between gap-3">
        {/* Logo brand: el nombre se acorta si no cabe, nunca empuja a los botones */}
        <div className="flex min-w-0 items-center gap-2.5">
          <img src={assetUrl('/icon-192.png')} alt="KookyeCatGym" className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-blue-500/20" />
          <div className="min-w-0 text-left flex items-center gap-1.5">
            <span className="truncate font-black text-white tracking-tight text-lg leading-none">KookyeCatGym</span>
            <span className="hidden min-[400px]:inline shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30">
              Beta
            </span>
          </div>
        </div>

        <DesktopNav current={currentTab} isAdmin={isAdmin} onSelect={onSelectTab} />

        {/* Menú: tamaño de letra, copia de seguridad y salir */}
        <div className="flex shrink-0 items-center">
          <AppMenu username={username} onBackup={onBackup} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
