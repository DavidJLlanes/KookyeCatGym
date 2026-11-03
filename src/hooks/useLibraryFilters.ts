import { useEffect, useMemo, useRef, useState } from 'react';
import { Exercise } from '../types';
import { bodyPartsOf } from '../utils/muscleStats';
import { detectMuscleZone, MuscleZone } from '../utils/muscleZone';
import { useUserData } from '../context/UserDataContext';
import { canDoWithEquipment } from '../utils/equipment';

/**
 * Filtros de la biblioteca de ejercicios (búsqueda, músculo, zona, equipamiento,
 * tipo, favoritos, mapa) y renderizado incremental de la lista resultante.
 */
export function useLibraryFilters(exercises: Exercise[]) {
  const { data: userData } = useUserData();
  const favorites = userData.favorites;
  const myEquipment = userData['my-equipment'];
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showMyEquipment, setShowMyEquipment] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Todos');
  // Tipo de ejercicio (fuerza, estiramiento, yoga...). Los ejercicios sin tipo solo salen en "Todos".
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  // Filtro de segundo nivel: sub-músculo concreto dentro del grupo elegido.
  const [selectedZone, setSelectedZone] = useState<MuscleZone | 'Todas'>('Todas');
  // Músculo tocado en el mapa: trabajo principal o secundario del ejercicio.
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Al cambiar de grupo muscular se reinicia el sub-filtro (las zonas de un
  // grupo no tienen sentido en otro).

  const handleSelectMuscle = (mg: string) => {
    setSelectedMuscle(mg);
    setSelectedZone('Todas');
  };

  // Zona (imagen muscular) de cada ejercicio, precalculada una sola vez para
  // no recorrer las reglas de detección en cada render/filtrado.
  const zoneByExerciseId = useMemo(() => {
    const map = new Map<string, MuscleZone>();
    exercises.forEach((ex) => map.set(ex.id, detectMuscleZone(ex)));
    return map;
  }, [exercises]);
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const filteredExercises = useMemo(() => {
    const list = exercises.filter((ex) => {
    const q = search.toLowerCase();
    const matchesSearch = ex.name.toLowerCase().includes(q);
    const matchesMuscle = selectedMuscle === 'Todos' || ex.muscleGroup === selectedMuscle;
    const matchesEquipment = selectedEquipment === 'Todos' || ex.equipment === selectedEquipment;
    const matchesCategory = selectedCategory === 'Todos' || ex.category === selectedCategory;
    const matchesZone = selectedZone === 'Todas' || zoneByExerciseId.get(ex.id) === selectedZone;
    const matchesFavorite = !onlyFavorites || favoriteSet.has(ex.id);
    const matchesOwned = canDoWithEquipment(ex, myEquipment);
    if (selectedPart) {
      const bp = bodyPartsOf(ex);
      if (!bp.primary.includes(selectedPart) && !bp.secondary.includes(selectedPart)) return false;
    }
    return matchesSearch && matchesMuscle && matchesEquipment && matchesCategory && matchesZone && matchesFavorite && matchesOwned;
    });
    // Los favoritos van primero (el orden del resto se mantiene)
    return favoriteSet.size > 0 ? [...list.filter((e) => favoriteSet.has(e.id)), ...list.filter((e) => !favoriteSet.has(e.id))] : list;
  }, [exercises, search, selectedMuscle, selectedEquipment, selectedCategory, selectedZone, selectedPart, onlyFavorites, favoriteSet, myEquipment, zoneByExerciseId]);

  // Renderizado incremental: con 873 ejercicios, montar todas las tarjetas de
  // golpe (imágenes incluidas) hacía la pestaña lenta al abrir y al hacer
  // scroll. Solo se renderiza un lote inicial, y se van añadiendo más lotes
  // a medida que el usuario se acerca al final de la lista.
  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedMuscle, selectedEquipment, selectedCategory, selectedZone, selectedPart, onlyFavorites, myEquipment]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredExercises.length));
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredExercises.length]);

  const visibleExercises = filteredExercises.slice(0, visibleCount);

  return {
    favorites, myEquipment, favoriteSet,
    onlyFavorites, setOnlyFavorites, showMyEquipment, setShowMyEquipment,
    search, setSearch, selectedMuscle, selectedEquipment, setSelectedEquipment,
    selectedCategory, setSelectedCategory, selectedZone, setSelectedZone,
    selectedPart, setSelectedPart, showMap, setShowMap,
    handleSelectMuscle, filteredExercises, visibleExercises, visibleCount, loadMoreRef,
  };
}

export type LibraryFilters = ReturnType<typeof useLibraryFilters>;
