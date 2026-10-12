import React, { useMemo, useState } from 'react';
import { FileUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Exercise, WorkoutLog } from '../types';
import {
  IMPORT_SOURCE_LABEL,
  ImportParseResult,
  importedLogId,
  parseWorkoutExport,
  sessionsToLogs,
} from '../utils/importers';
import { AUTO_MATCH_SCORE, guessEquipment, guessMuscleGroup, rankExercises } from '../utils/importers/exerciseMatch';

type MuscleGroup = Exercise['muscleGroup'];

type Choice =
  | { mode: 'existing'; exerciseId: string }
  | { mode: 'custom'; group: MuscleGroup }
  | { mode: 'skip' };

export interface ImportOutcome {
  saved: number;
  failed: number;
}

interface ImportPanelProps {
  exercises: Exercise[];
  existingLogIds: Set<string>;
  onImport: (
    logs: WorkoutLog[],
    newExercises: Exercise[],
    onProgress: (done: number, total: number) => void
  ) => Promise<ImportOutcome>;
}

const MUSCLE_GROUPS: MuscleGroup[] = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Abdomen'];

// Mismas imágenes de reemplazo que usa la biblioteca al crear un ejercicio personalizado
function placeholderImage(group: MuscleGroup): string {
  if (group === 'Pecho') return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&auto=format&fit=crop&q=80';
  if (group === 'Piernas') return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80';
  if (group === 'Espalda') return 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80';
}

export default function ImportPanel({ exercises, existingLogIds, onImport }: ImportPanelProps) {
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [strongUnit, setStrongUnit] = useState<'kg' | 'lb'>('kg');
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [searching, setSearching] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo<{ result?: ImportParseResult; error?: string }>(() => {
    if (fileText === null) return {};
    try {
      return { result: parseWorkoutExport(fileText, strongUnit) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'No se pudo leer el archivo' };
    }
  }, [fileText, strongUnit]);

  const result = parsed.result;

  const newSessions = useMemo(
    () => (result ? result.sessions.filter((s) => !existingLogIds.has(importedLogId(result.source, s.key))) : []),
    [result, existingLogIds]
  );

  // Ejercicios distintos del archivo (solo de las sesiones que faltan), con sus sugerencias
  const importedExercises = useMemo(() => {
    const byName = new Map<string, { name: string; category?: string; sets: number }>();
    for (const s of newSessions) {
      for (const e of s.exercises) {
        const entry = byName.get(e.name) ?? { name: e.name, category: e.category, sets: 0 };
        entry.sets += e.sets.length;
        byName.set(e.name, entry);
      }
    }
    return [...byName.values()]
      .sort((a, b) => b.sets - a.sets)
      .map((e) => ({ ...e, candidates: rankExercises(e.name, exercises) }));
  }, [newSessions, exercises]);

  const choiceFor = (name: string): Choice => {
    if (choices[name]) return choices[name];
    const entry = importedExercises.find((e) => e.name === name);
    const best = entry?.candidates[0];
    if (best && best.score >= AUTO_MATCH_SCORE) return { mode: 'existing', exerciseId: best.exercise.id };
    return { mode: 'custom', group: guessMuscleGroup(name, entry?.category) };
  };

  const setChoice = (name: string, choice: Choice) => setChoices((prev) => ({ ...prev, [name]: choice }));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setChoices({});
    setOutcome(null);
    setError(null);
    setFileText(await file.text());
  };

  const reset = () => {
    setFileText(null);
    setFileName('');
    setChoices({});
    setOutcome(null);
    setError(null);
    setProgress(null);
  };

  const handleImport = async () => {
    if (!result) return;
    setError(null);

    const createdByName = new Map<string, Exercise>();
    importedExercises.forEach((e, idx) => {
      const c = choiceFor(e.name);
      if (c.mode !== 'custom') return;
      createdByName.set(e.name, {
        id: `custom-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: e.name,
        muscleGroup: c.group,
        equipment: guessEquipment(e.name),
        imageUrl: placeholderImage(c.group),
        defaultRestTime: 90,
        instructions: ['Comienza en una posición estable y ejecuta el movimiento controlando la fase excéntrica.'],
        isCustom: true,
      });
    });

    const logs = sessionsToLogs(result.source, newSessions, (name) => {
      const c = choiceFor(name);
      if (c.mode === 'existing') return c.exerciseId;
      if (c.mode === 'custom') return createdByName.get(name)?.id ?? null;
      return null;
    });

    if (logs.length === 0) {
      setError('No hay nada que importar: todos los ejercicios están omitidos.');
      return;
    }

    setProgress({ done: 0, total: logs.length });
    try {
      const res = await onImport(logs, [...createdByName.values()], (done, total) => setProgress({ done, total }));
      setOutcome(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setProgress(null);
    }
  };

  const libraryByGroup = useMemo(() => {
    const groups = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const list = groups.get(ex.muscleGroup) ?? [];
      list.push(ex);
      groups.set(ex.muscleGroup, list);
    }
    groups.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'es')));
    return groups;
  }, [exercises]);

  if (outcome) {
    return (
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex gap-2 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <div>
            {outcome.saved} {outcome.saved === 1 ? 'entrenamiento importado' : 'entrenamientos importados'} a tu historial.
            {outcome.failed > 0 && (
              <div className="text-amber-300 mt-1">
                {outcome.failed} no se pudieron guardar. Vuelve a importar el mismo archivo para reintentarlos (no se duplicarán).
              </div>
            )}
          </div>
        </div>
        <button
          onClick={reset}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
        >
          Importar otro archivo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-300 cursor-pointer transition-colors">
        <FileUp className="h-4 w-4 text-blue-400" />
        {fileName || 'Elegir archivo CSV de Hevy, Strong o FitNotes'}
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>

      {parsed.error && (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 flex gap-2 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {parsed.error}
        </div>
      )}

      {result && (
        <>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div>
              Archivo de <span className="font-bold text-slate-200">{IMPORT_SOURCE_LABEL[result.source]}</span>:{' '}
              <span className="font-bold text-slate-200">{result.sessions.length}</span> entrenamientos
              {result.sessions.length > 0 && (
                <>
                  {' '}del {result.sessions[result.sessions.length - 1].date.toLocaleDateString('es-ES')} al{' '}
                  {result.sessions[0].date.toLocaleDateString('es-ES')}
                </>
              )}
              .
            </div>
            {result.sessions.length - newSessions.length > 0 && (
              <div>{result.sessions.length - newSessions.length} ya estaban importados y se saltarán.</div>
            )}
            {result.skippedRows > 0 && (
              <div>
                {result.skippedRows === 1
                  ? '1 fila sin repeticiones (cardio) se ignora.'
                  : `${result.skippedRows} filas sin repeticiones (cardio) se ignoran.`}
              </div>
            )}
          </div>

          {result.unitUnknown && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>El CSV de Strong no indica la unidad. Tus pesos están en:</span>
              {(['kg', 'lb'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setStrongUnit(u)}
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                    strongUnit === u ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          )}

          {importedExercises.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">
                Revisa a qué ejercicio de tu biblioteca corresponde cada uno:
              </div>
              {importedExercises.map((e) => {
                const choice = choiceFor(e.name);
                const value =
                  choice.mode === 'existing' ? choice.exerciseId : choice.mode === 'custom' ? '__custom' : '__skip';
                const chosenOutsideSuggestions =
                  choice.mode === 'existing' && !e.candidates.some((c) => c.exercise.id === choice.exerciseId);
                const chosenName =
                  choice.mode === 'existing' ? exercises.find((x) => x.id === choice.exerciseId)?.name : undefined;

                return (
                  <div key={e.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200">{e.name}</span>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">{e.sets} series</span>
                    </div>
                    <select
                      value={value}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        if (v === '__custom') setChoice(e.name, { mode: 'custom', group: guessMuscleGroup(e.name, e.category) });
                        else if (v === '__skip') setChoice(e.name, { mode: 'skip' });
                        else if (v === '__search') setSearching(e.name);
                        else setChoice(e.name, { mode: 'existing', exerciseId: v });
                      }}
                      className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-base sm:text-xs"
                    >
                      {chosenOutsideSuggestions && chosenName && (
                        <option value={choice.mode === 'existing' ? choice.exerciseId : ''}>{chosenName}</option>
                      )}
                      {e.candidates.length > 0 && (
                        <optgroup label="Sugeridos">
                          {e.candidates.map((c) => (
                            <option key={c.exercise.id} value={c.exercise.id}>
                              {c.exercise.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__search">Buscar otro ejercicio de la biblioteca…</option>
                      <option value="__custom">Crear como ejercicio personalizado</option>
                      <option value="__skip">No importar este ejercicio</option>
                    </select>

                    {searching === e.name && (
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={(ev) => {
                          if (ev.target.value) setChoice(e.name, { mode: 'existing', exerciseId: ev.target.value });
                          setSearching(null);
                        }}
                        onBlur={() => setSearching(null)}
                        className="w-full px-2 py-2 bg-slate-900 border border-blue-600 rounded-lg text-slate-200 text-base sm:text-xs"
                      >
                        <option value="">Elige un ejercicio…</option>
                        {[...libraryByGroup.entries()].map(([group, list]) => (
                          <optgroup key={group} label={group}>
                            {list.map((ex) => (
                              <option key={ex.id} value={ex.id}>
                                {ex.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    )}

                    {choice.mode === 'custom' && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        Grupo muscular:
                        <select
                          value={choice.group}
                          onChange={(ev) => setChoice(e.name, { mode: 'custom', group: ev.target.value as MuscleGroup })}
                          className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-base sm:text-xs"
                        >
                          {MUSCLE_GROUPS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 flex gap-2 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {progress ? (
            <div className="space-y-1">
              <div className="text-xs text-slate-400">
                Guardando {progress.done} de {progress.total}…
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={newSessions.length === 0}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Importar {newSessions.length} {newSessions.length === 1 ? 'entrenamiento' : 'entrenamientos'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
