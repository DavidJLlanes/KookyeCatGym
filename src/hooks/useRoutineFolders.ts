import { useState } from 'react';
import { Routine } from '../types';

// Las carpetas se derivan de la propiedad `folder` de cada rutina, así que una
// carpeta recién creada (todavía sin rutinas) no existiría en ningún sitio.
// Se guarda aparte la lista de carpetas creadas por el usuario para que las
// vacías persistan hasta que se les añada una rutina o se borren.
const CUSTOM_FOLDERS_KEY = 'hevy_custom_folders';

function loadCustomFolders(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_FOLDERS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Carpetas de rutinas: lista ordenada, carpetas vacías persistidas, orden de
 * rutinas dentro de cada grupo, carpetas desplegadas y borrado de carpeta.
 */
export function useRoutineFolders(
  routines: Routine[],
  onReorderRoutines: (updated: Routine[]) => void,
  onDeleteRoutines: (routineIds: string[]) => void
) {
  // Carpetas creadas por el usuario que aún no tienen ninguna rutina dentro.
  const [customFolders, setCustomFolders] = useState<string[]>(loadCustomFolders);
  const persistCustomFolders = (list: string[]) => {
    setCustomFolders(list);
    localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(list));
  };

  // Carpeta pendiente de confirmación de borrado
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);


  // Carpetas existentes, derivadas de las rutinas ya creadas. Si el usuario
  // ya reordenó alguna carpeta se respeta ese orden (folderOrder); las que
  // aún no tienen orden explícito se colocan después, por orden alfabético.
  const existingFolders = (() => {
    // Carpetas con rutinas dentro (derivadas) + carpetas vacías creadas por el
    // usuario (persistidas aparte), sin duplicados.
    const names = [
      ...new Set([
        ...routines.map((r) => r.folder).filter((f): f is string => !!f),
        ...customFolders,
      ]),
    ];
    const meta = names.map((folder) => {
      const orders = routines
        .filter((r) => r.folder === folder)
        .map((r) => r.folderOrder)
        .filter((v): v is number => v !== undefined && v !== null);
      return { folder, order: orders.length > 0 ? Math.min(...orders) : null };
    });
    meta.sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1;
      if (b.order !== null) return 1;
      return a.folder.localeCompare(b.folder, 'es');
    });
    return meta.map((m) => m.folder);
  })();

  // Rutinas de un grupo (carpeta concreta, o sin carpeta si groupFolder es
  // null) ordenadas por sortOrder; sin valor explícito se conserva el orden
  // en que llegan del servidor (más recientes primero).
  const getGroupRoutines = (groupFolder: string | null) => {
    const group = routines.filter((r) => (groupFolder === null ? !r.folder : r.folder === groupFolder));
    return [...group].sort((a, b) => {
      const ao = a.sortOrder ?? null;
      const bo = b.sortOrder ?? null;
      if (ao !== null && bo !== null) return ao - bo;
      if (ao !== null) return -1;
      if (bo !== null) return 1;
      return 0;
    });
  };

  const moveFolder = (folder: string, direction: 'up' | 'down') => {
    const order = [...existingFolders];
    const idx = order.indexOf(folder);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || targetIdx < 0 || targetIdx >= order.length) return;
    [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];

    const updated: Routine[] = [];
    order.forEach((f, i) => {
      routines.filter((r) => r.folder === f).forEach((r) => updated.push({ ...r, folderOrder: i }));
    });
    onReorderRoutines(updated);
  };

  const moveRoutineInGroup = (groupFolder: string | null, routineId: string, direction: 'up' | 'down') => {
    const group = getGroupRoutines(groupFolder);
    const idx = group.findIndex((r) => r.id === routineId);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || targetIdx < 0 || targetIdx >= group.length) return;
    const reordered = [...group];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    onReorderRoutines(reordered.map((r, i) => ({ ...r, sortOrder: i })));
  };

  // Carpetas expandidas en la vista de listado (por defecto todas cerradas)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  // Crear carpeta = crear la carpeta y punto (aparece aunque no llegue a tener rutinas).
  const createFolder = (name: string) => {
    const alreadyExists = existingFolders.some((f) => f.toLowerCase() === name.toLowerCase());
    if (!alreadyExists) {
      persistCustomFolders([...customFolders, name]);
    }
    setExpandedFolders((prev) => new Set(prev).add(name));
  };

  // Borrar carpeta: elimina la carpeta y TODAS las rutinas que contenga.
  const confirmDeleteFolder = () => {
    if (!folderToDelete) return;
    const idsToDelete = routines.filter((r) => r.folder === folderToDelete).map((r) => r.id);
    if (idsToDelete.length > 0) onDeleteRoutines(idsToDelete);
    persistCustomFolders(customFolders.filter((f) => f !== folderToDelete));
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderToDelete);
      return next;
    });
    setFolderToDelete(null);
  };

  return {
    existingFolders, getGroupRoutines, moveFolder, moveRoutineInGroup,
    expandedFolders, toggleFolder, createFolder,
    folderToDelete, setFolderToDelete, confirmDeleteFolder,
  };
}
