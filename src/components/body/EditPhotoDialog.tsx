import type { BodyProgressSectionProps } from '../BodyProgressSection';
import React, { useState } from 'react';
import { X} from 'lucide-react';
import type { MediaItem, ProgressMuscle } from '../../api/client';
import {
  MeasureUnit,
  localDay,
  parseMeasure} from '../../utils/photoTools';
import MeasureInput from './MeasureInput';
import MuscleChips from './MuscleChips';

export default function EditPhotoDialog({
  photo,
  unit,
  onUnit,
  onSave,
  onClose,
}: {
  photo: MediaItem;
  unit: MeasureUnit;
  onUnit: (u: MeasureUnit) => void;
  onSave: BodyProgressSectionProps['onUpdate'];
  onClose: () => void;
}) {
  const [takenAt, setTakenAt] = useState(photo.takenAt);
  const [muscle, setMuscle] = useState<ProgressMuscle>(photo.muscle ?? 'Pecho');
  const toText = (mm: number | null, u: MeasureUnit) => (mm ? (u === 'cm' ? String(mm / 10).replace('.', ',') : String(mm)) : '');
  const [measure, setMeasure] = useState(toText(photo.measureMm, unit));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const changeUnit = (u: MeasureUnit) => {
    setMeasure(toText(parseMeasure(measure, unit), u));
    onUnit(u);
  };

  const save = async () => {
    const mm = measure.trim() ? parseMeasure(measure, unit) : null;
    if (measure.trim() && mm === null) {
      setError('La medida no es válida');
      return;
    }
    setBusy(true);
    try {
      await onSave(photo.id, { takenAt, muscle, measureMm: mm });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">Editar foto</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <img src={photo.url} alt="" className="w-full max-h-48 object-cover rounded-xl" />
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fecha de la foto</label>
          <input
            type="date"
            value={takenAt}
            max={localDay()}
            onChange={(e) => setTakenAt(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Grupo muscular</label>
          <MuscleChips value={muscle} onChange={setMuscle} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Medida (opcional)</label>
          <MeasureInput value={measure} onChange={setMeasure} unit={unit} onUnit={changeUnit} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={save}
          disabled={busy || !takenAt}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold cursor-pointer"
        >
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
