// Fusión de tres vías ("three-way merge") para cuando dos dispositivos editan a
// la vez lo mismo. En lugar de que quien guarda último pise todo lo del otro,
// se compara cada campo con la versión BASE (lo último que este dispositivo
// vio del servidor):
//   - si solo cambió uno de los dos, se queda su cambio;
//   - si cambiaron los dos y es una lista de elementos con `id` (ejercicios de
//     una rutina, series de un ejercicio...), se fusiona elemento a elemento;
//   - si cambiaron los dos el mismo campo escalar, gana el dispositivo que
//     guarda (`mine`), que es lo que el usuario acaba de hacer.

type Json = unknown;

const isObject = (v: Json): v is Record<string, Json> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isIdList = (v: Json): v is Array<Record<string, Json> & { id: string }> =>
  Array.isArray(v) && v.length > 0 && v.every((x) => isObject(x) && typeof x.id === 'string');

export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

/** Fusiona un valor cualquiera. `base` es undefined si ese valor no existía. */
export function mergeValue(base: Json, mine: Json, theirs: Json): Json {
  if (deepEqual(mine, theirs)) return mine;
  if (deepEqual(mine, base)) return theirs; // yo no toqué nada: me quedo con lo suyo
  if (deepEqual(theirs, base)) return mine; // ellos no tocaron nada: mantengo lo mío

  if (isObject(mine) && isObject(theirs)) {
    const b = isObject(base) ? base : {};
    const out: Record<string, Json> = {};
    for (const k of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
      const v = mergeValue(b[k], mine[k], theirs[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }

  if (isIdList(mine) && isIdList(theirs)) return mergeIdList(isIdList(base) ? base : [], mine, theirs);

  return mine; // los dos cambiaron lo mismo y no se puede combinar: gana quien guarda
}

type Item = Record<string, Json> & { id: string };

function mergeIdList(base: Item[], mine: Item[], theirs: Item[]): Item[] {
  const b = new Map(base.map((x) => [x.id, x]));
  const t = new Map(theirs.map((x) => [x.id, x]));
  const m = new Map(mine.map((x) => [x.id, x]));
  const out: Item[] = [];
  const seen = new Set<string>();

  // El orden es el mío; lo que solo ellos tienen se añade al final.
  for (const item of mine) {
    seen.add(item.id);
    const bi = b.get(item.id);
    const ti = t.get(item.id);
    if (!ti) {
      // Ellos no lo tienen: o lo borraron (y yo no lo toqué → desaparece) o lo he creado yo.
      if (bi && deepEqual(item, bi)) continue;
      out.push(item);
    } else {
      out.push(mergeValue(bi, item, ti) as Item);
    }
  }
  for (const item of theirs) {
    if (seen.has(item.id)) continue;
    const bi = b.get(item.id);
    // Yo lo borré: si ellos no lo tocaron, queda borrado; si lo cambiaron, lo conservo.
    if (bi && !m.has(item.id) && deepEqual(item, bi)) continue;
    out.push(item);
  }
  return out;
}

/** Fusiona dos versiones de un mismo registro (rutina, log...) con su versión base. */
export function mergeRecord<T extends { id: string }>(base: T | undefined, mine: T, theirs: T | undefined): T {
  if (!theirs) return mine;
  return mergeValue(base, mine, theirs) as T;
}

/**
 * Fusiona una colección completa (lista con ids) tras bajar la del servidor:
 * añade lo nuevo de otros dispositivos, quita lo que borraron (si yo no lo
 * había tocado) y fusiona campo a campo lo que cambiaron los dos.
 * `base` es lo que este dispositivo vio por última vez del servidor.
 */
export function mergeCollection<T extends { id: string }>(base: T[], mine: T[], theirs: T[]): T[] {
  const b = new Map(base.map((x) => [x.id, x]));
  const t = new Map(theirs.map((x) => [x.id, x]));
  const out: T[] = [];
  const seen = new Set<string>();

  for (const item of mine) {
    seen.add(item.id);
    const bi = b.get(item.id);
    const ti = t.get(item.id);
    if (!ti) {
      if (bi && deepEqual(item, bi)) continue; // lo borraron en otro dispositivo
      out.push(item); // lo he creado yo, o lo cambié aunque lo borraran: se conserva
    } else {
      out.push(mergeRecord(bi, item, ti));
    }
  }
  for (const item of theirs) {
    if (seen.has(item.id)) continue;
    // Si yo lo borré y ellos no lo tocaron, sigue borrado; si no, es nuevo para mí.
    const bi = b.get(item.id);
    if (bi && deepEqual(item, bi)) continue;
    out.push(item); // creado (o cambiado) en otro dispositivo
  }
  return out;
}
