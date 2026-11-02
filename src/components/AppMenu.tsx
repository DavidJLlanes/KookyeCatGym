import React, { useState } from 'react';
import { Settings2, Upload, LogOut, Type } from 'lucide-react';
import AnchoredPopover from './AnchoredPopover';
import { FONT_SCALES, loadFontScaleId, saveFontScale } from '../utils/fontScale';

interface AppMenuProps {
  username: string;
  onBackup: () => void;
  onLogout: () => void;
}

/**
 * Menú de la cabecera: tamaño de letra, copia de seguridad y cerrar sesión. Un
 * solo botón en lugar de varios, para que la cabecera quepa en cualquier ancho.
 */
export default function AppMenu({ username, onBackup, onLogout }: AppMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [fontId, setFontId] = useState(loadFontScaleId);

  const pickFont = (id: string) => {
    saveFontScale(id);
    setFontId(id);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-label="Menú: tamaño de letra, copia de seguridad y salir"
        className="icon-btn"
      >
        <Settings2 className="h-5 w-5" aria-hidden="true" />
      </button>

      {anchor && (
        <AnchoredPopover anchor={anchor} align="right" width={288} onClose={() => setAnchor(null)}>
          <div role="menu" className="space-y-3 p-1">
            <div className="px-1 text-xs text-slate-400">
              Sesión de <b className="text-slate-100">{username}</b>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Type className="h-3.5 w-3.5" aria-hidden="true" />
                Tamaño de letra
              </div>
              <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Tamaño de letra">
                {FONT_SCALES.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={fontId === o.id}
                    onClick={() => pickFont(o.id)}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border py-2 cursor-pointer min-h-[3.25rem] ${
                      fontId === o.id ? 'border-blue-500 bg-blue-600/20 text-white' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-black leading-none" style={{ fontSize: `${0.8 + o.scale * 0.45}rem` }}>
                      Aa
                    </span>
                    <span className="max-w-full truncate px-0.5 text-[9px] font-bold leading-none text-slate-400">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-800 pt-3">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAnchor(null);
                  onBackup();
                }}
                className="btn btn-secondary w-full justify-start"
              >
                <Upload className="text-blue-400" aria-hidden="true" />
                Copia de seguridad y datos
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAnchor(null);
                  onLogout();
                }}
                className="btn btn-danger w-full justify-start"
              >
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </AnchoredPopover>
      )}
    </>
  );
}
