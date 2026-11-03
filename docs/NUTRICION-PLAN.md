# Nutrición — plan por fases y pendientes

Pestaña **Nutrición** entre Progreso y Fotos. Todo lo que no usa IA funciona sin claves ni conexión
al coach; lo que usa IA reutiliza el coach ya configurado (`server/coach.php`).

## Fase 1 — Sin IA  *(hecha)*
- [x] Cálculo: metabolismo basal (Mifflin-St Jeor), gasto diario, objetivo de calorías y macros
- [x] Datos en `userdata`: `nutrition-profile`, `nutrition-foods`, `nutrition-log`
- [x] Base de ~120 alimentos básicos (por 100 g) + alimentos propios
- [x] Diario por comidas con totales frente al objetivo, copiar de ayer
- [x] Hidratación
- [x] Semana: calorías y proteína frente al objetivo, peso corporal
- [x] Exportar a CSV
- [x] Tests de las funciones puras, README, prueba E2E (`nutrition.mjs`)

## Fase 2 — Con IA
- [ ] Modo `nutrition` en el coach (prompts propios, salida JSON validada)
- [ ] Estimar calorías y macros de una comida escrita (el usuario revisa antes de guardar)
- [ ] Estimar desde una foto (solo proveedores con visión)
- [ ] **Recetas con los alimentos que el usuario indique** (y respetando sus macros restantes)
- [ ] Plan semanal y lista de la compra
- [ ] «Qué cenar hoy» con los macros que faltan
- [ ] Análisis de la semana

## Pendientes / ideas aparcadas
- [ ] Si el diario crece mucho (años), partir `nutrition-log` por meses (hoy es un solo documento)
- [ ] Búsqueda en Open Food Facts y código de barras (opcional, requiere internet)
- [ ] Recordatorios de agua / de registrar comidas (push)
- [ ] Micronutrientes y fibra
