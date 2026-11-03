import { useMemo, useState } from 'react';
import { Exercise } from '../types';
import { MUSCLE_GROUPS } from '../data/exerciseMeta';
import { detectMuscleZone, MuscleZone, MUSCLE_GROUP_ZONES } from '../utils/muscleZone';

/**
 * Filtros del entrenamiento aleatorio. Todos son multiselección y vacío
 * significa «todos». Devuelve también el conjunto de ejercicios que cumple
 * los filtros (`randomPool`) y las zonas que se pueden ofrecer.
 */
export function useRandomWorkoutFilters(exercises: Exercise[]) {
  const [randomGroups, setRandomGroups] = useState<string[]>([]);
  const [randomZones, setRandomZones] = useState<MuscleZone[]>([]);
  const [randomEquipment, setRandomEquipment] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState(5);

  const toggleRandomEquipment = (eq: string) => {
    setRandomEquipment((prev) => (prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]));
  };
  const toggleRandomZone = (z: MuscleZone) => {
    setRandomZones((prev) => (prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]));
  };
  const toggleRandomGroup = (g: string) => {
    const next = randomGroups.includes(g) ? randomGroups.filter((x) => x !== g) : [...randomGroups, g];
    setRandomGroups(next);
    // Al quitar un grupo, se descartan las zonas que ya no pertenecen a ningún
    // grupo seleccionado (si no queda ninguno, vuelven a estar todas disponibles).
    if (next.length > 0) {
      const allowed = new Set(next.flatMap((gg) => MUSCLE_GROUP_ZONES[gg as Exercise['muscleGroup']] ?? []));
      setRandomZones((zones) => zones.filter((z) => allowed.has(z)));
    }
  };
  const clearRandomFilters = () => {
    setRandomGroups([]);
    setRandomZones([]);
    setRandomEquipment([]);
  };

  // Zona muscular de cada ejercicio, calculada una sola vez
  const zoneByExerciseId = useMemo(() => {
    const map = new Map<string, MuscleZone>();
    exercises.forEach((e) => map.set(e.id, detectMuscleZone(e)));
    return map;
  }, [exercises]);

  // Zonas ofrecidas: las de los grupos marcados, o todas si no hay ninguno.
  // Se recorre MUSCLE_GROUPS para mantener siempre el mismo orden anatómico.
  const availableRandomZones = useMemo<MuscleZone[]>(() => {
    const groups = randomGroups.length > 0 ? randomGroups : [...MUSCLE_GROUPS];
    const zones = MUSCLE_GROUPS.filter((g) => groups.includes(g)).flatMap(
      (g) => MUSCLE_GROUP_ZONES[g as Exercise['muscleGroup']] ?? []
    );
    // Una zona puede pertenecer a dos grupos (p. ej. trapecio): se ofrece una sola vez
    return [...new Set(zones)];
  }, [randomGroups]);

  // Ejercicios que cumplen TODOS los filtros activos
  const randomPool = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (randomGroups.length === 0 || randomGroups.includes(e.muscleGroup)) &&
          (randomZones.length === 0 || randomZones.includes(zoneByExerciseId.get(e.id)!)) &&
          (randomEquipment.length === 0 || randomEquipment.includes(e.equipment))
      ),
    [exercises, randomGroups, randomZones, randomEquipment, zoneByExerciseId]
  );

  return {
    randomGroups, setRandomGroups,
    randomZones, setRandomZones,
    randomEquipment, setRandomEquipment,
    randomCount, setRandomCount,
    toggleRandomEquipment, toggleRandomZone, toggleRandomGroup, clearRandomFilters,
    availableRandomZones, randomPool,
  };
}

export type RandomWorkoutFilters = ReturnType<typeof useRandomWorkoutFilters>;
