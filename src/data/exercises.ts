import type { Exercise } from '../types';
import catalog from './catalog.json';

// Catálogo de ejercicios. Los datos viven en catalog.json, que se genera con
// scripts/import-catalog.mjs (ejercicios de siempre + catálogo importado de
// F:\ejercicios). Este módulo se carga bajo demanda (ver AppContent) para no
// engordar el bundle inicial.
export const INITIAL_EXERCISES: Exercise[] = catalog as unknown as Exercise[];
