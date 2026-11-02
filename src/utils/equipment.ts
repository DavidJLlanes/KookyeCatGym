import type { Exercise } from '../types';
import type { MyEquipment } from './userData';

/** El peso corporal no necesita material: siempre se puede hacer. */
export const ALWAYS_AVAILABLE = 'Peso Corporal';

/** ¿Puedes hacer este ejercicio con el equipamiento que tienes? (Sin filtro activo, sí.) */
export function canDoWithEquipment(ex: Pick<Exercise, 'equipment'>, mine: MyEquipment): boolean {
  if (!mine.enabled) return true;
  return ex.equipment === ALWAYS_AVAILABLE || mine.owned.includes(ex.equipment);
}

export function toggleOwned(mine: MyEquipment, equipment: string): MyEquipment {
  const owned = mine.owned.includes(equipment) ? mine.owned.filter((e) => e !== equipment) : [...mine.owned, equipment];
  return { ...mine, owned };
}

export function toggleFavorite(favorites: string[], id: string): string[] {
  return favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
}
