<?php
// IA de Nutrición: prompts, saneado de la entrada y validación de la salida.
// Todas las tareas devuelven JSON validado aquí; nada del modelo llega sin pasar por estas funciones.

const NUTRITION_TASKS = ['estimate', 'recipes', 'plan', 'analysis'];

const NUTRITION_COMMON_RULES = <<<'TXT'
Escribe en español de España, de tú. Las cifras nutricionales son estimaciones: sé realista, no inventes precisión y usa valores razonables para raciones habituales. No des consejo médico ni dietético personalizado; si algo apunta a un problema de salud o de conducta alimentaria, recomienda consultar a un profesional. Responde únicamente con un objeto JSON válido, sin texto antes ni después. Todos los números son números JSON (sin unidades en el valor).
TXT;

function nutritionSystemPrompt(string $task): string {
    $rules = NUTRITION_COMMON_RULES;
    switch ($task) {
        case 'estimate':
            return "Eres un nutricionista que estima calorías y macronutrientes de lo que una persona ha comido a partir de su descripción. Desglosa la descripción en alimentos individuales, estima los gramos de cada uno si no se indican y calcula calorías (kcal), proteína, hidratos y grasa de la cantidad total de cada alimento (no por 100 g).\n$rules\nForma exacta: {\"alimentos\": [{\"nombre\": \"...\", \"gramos\": 0, \"kcal\": 0, \"proteina\": 0, \"hidratos\": 0, \"grasa\": 0}], \"nota\": \"supuestos que has hecho, en 1-2 frases\"}";
        case 'recipes':
            return "Eres un cocinero con conocimientos de nutrición. Propón recetas sencillas y realistas usando principalmente los alimentos que indique el usuario (puedes añadir básicos de despensa como aceite, sal, especias, agua; indícalos como ingredientes). Si el usuario da los macros que le quedan, ajusta cada ración a ellos sin pasarte de calorías. Si no da alimentos, propón opciones habituales. Respeta restricciones y preferencias indicadas. Da las cantidades en gramos o unidades y los macros de UNA ración.\n$rules\nForma exacta: {\"recetas\": [{\"titulo\": \"...\", \"raciones\": 1, \"minutos\": 20, \"ingredientes\": [{\"nombre\": \"...\", \"cantidad\": \"150 g\"}], \"pasos\": [\"...\"], \"porRacion\": {\"kcal\": 0, \"proteina\": 0, \"hidratos\": 0, \"grasa\": 0}}]}. Entre 1 y 3 recetas.";
        case 'plan':
            return "Eres un nutricionista que organiza menús semanales sencillos, variados y fáciles de preparar, ajustados a las calorías y macros diarios que da el usuario y a sus preferencias o restricciones. Usa 4 comidas al día: desayuno, comida, merienda y cena. Incluye una lista de la compra agrupada y sin duplicados.\n$rules\nForma exacta: {\"dias\": [{\"dia\": \"Lunes\", \"comidas\": [{\"comida\": \"desayuno\" | \"comida\" | \"merienda\" | \"cena\", \"plato\": \"...\", \"kcal\": 0, \"proteina\": 0}]}], \"compra\": [\"...\"], \"nota\": \"...\"}";
        case 'analysis':
            return "Eres un nutricionista que revisa la última semana de registro de comidas de un usuario frente a sus objetivos. Señala patrones concretos citando cifras (días registrados, medias, días que se pasó o se quedó corto, proteína). Si hay pocos días registrados, dilo: no saques conclusiones fuertes. Entre 2 y 5 sugerencias, de más a menos importante.\n$rules\nForma exacta: {\"resumen\": \"2-4 frases\", \"sugerencias\": [{\"titulo\": \"...\", \"detalle\": \"...\"}]}";
    }
    throw new CoachProviderError('tarea no válida');
}

function nutritionClean($value, int $max = 200): string {
    $s = trim(preg_replace('/\s+/u', ' ', (string) $value));
    return mb_substr($s, 0, $max);
}

function nutritionNum($value, float $max = 20000): float {
    $n = is_numeric($value) ? (float) $value : 0.0;
    return round(max(0.0, min($max, $n)), 1);
}

function nutritionMacros($m): array {
    $m = is_array($m) ? $m : [];
    return [
        'kcal' => (int) round(nutritionNum($m['kcal'] ?? 0, 10000)),
        'protein' => nutritionNum($m['proteina'] ?? $m['protein'] ?? 0, 1000),
        'carbs' => nutritionNum($m['hidratos'] ?? $m['carbs'] ?? 0, 1500),
        'fat' => nutritionNum($m['grasa'] ?? $m['fat'] ?? 0, 800),
    ];
}

/** Construye el mensaje de usuario (datos entre etiquetas) a partir de la entrada ya saneada. */
function nutritionUserMessage(string $task, array $input): string {
    switch ($task) {
        case 'estimate':
            $text = nutritionClean($input['text'] ?? '', 600);
            if ($text === '') throw new InvalidArgumentException('Escribe qué has comido.');
            return "Estima esta comida:\n<comida>\n$text\n</comida>";
        case 'recipes':
            $foods = array_values(array_filter(array_map(fn($f) => nutritionClean($f, 60), (array) ($input['foods'] ?? []))));
            $foods = array_slice($foods, 0, 25);
            $payload = [
                'alimentos' => $foods,
                'comida' => nutritionClean($input['meal'] ?? '', 20),
                'raciones' => max(1, min(8, (int) ($input['servings'] ?? 1))),
                'macrosRestantes' => isset($input['remaining']) ? nutritionMacros($input['remaining']) : null,
                'preferencias' => nutritionClean($input['notes'] ?? '', 300),
            ];
            return "Datos para las recetas:\n<datos>\n" . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n</datos>";
        case 'plan':
            $payload = [
                'objetivoDiario' => nutritionMacros($input['targets'] ?? []),
                'dias' => max(1, min(7, (int) ($input['days'] ?? 7))),
                'preferencias' => nutritionClean($input['notes'] ?? '', 300),
            ];
            if ($payload['objetivoDiario']['kcal'] < 800) throw new InvalidArgumentException('Falta tu objetivo de calorías: configúralo en Objetivos.');
            return "Datos para el plan:\n<datos>\n" . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n</datos>";
        case 'analysis':
            $week = [];
            foreach (array_slice((array) ($input['week'] ?? []), 0, 7) as $d) {
                if (!is_array($d)) continue;
                $week[] = ['fecha' => nutritionClean($d['date'] ?? '', 10), 'registrado' => !empty($d['logged'])] + nutritionMacros($d);
            }
            $payload = ['objetivoDiario' => nutritionMacros($input['targets'] ?? []), 'semana' => $week];
            return "Datos de la semana:\n<datos>\n" . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n</datos>";
    }
    throw new InvalidArgumentException('Tarea no válida');
}

function normalizeNutritionResult(string $task, ?array $data): array {
    if (!$data) throw new CoachProviderError('la respuesta no tiene el formato esperado');
    switch ($task) {
        case 'estimate':
            $items = [];
            foreach ((array) ($data['alimentos'] ?? []) as $a) {
                if (!is_array($a) || empty($a['nombre'])) continue;
                $items[] = ['name' => nutritionClean($a['nombre'], 80), 'grams' => nutritionNum($a['gramos'] ?? 0, 5000)] + nutritionMacros($a);
            }
            if (!$items) throw new CoachProviderError('la respuesta no traía alimentos');
            return ['alimentos' => array_slice($items, 0, 20), 'nota' => nutritionClean($data['nota'] ?? '', 400)];
        case 'recipes':
            $recipes = [];
            foreach ((array) ($data['recetas'] ?? []) as $r) {
                if (!is_array($r) || empty($r['titulo'])) continue;
                $ingredients = [];
                foreach ((array) ($r['ingredientes'] ?? []) as $i) {
                    if (is_array($i) && !empty($i['nombre'])) $ingredients[] = ['nombre' => nutritionClean($i['nombre'], 80), 'cantidad' => nutritionClean($i['cantidad'] ?? '', 40)];
                }
                $steps = array_values(array_filter(array_map(fn($p) => nutritionClean($p, 400), (array) ($r['pasos'] ?? []))));
                if (!$ingredients || !$steps) continue;
                $recipes[] = [
                    'titulo' => nutritionClean($r['titulo'], 100),
                    'raciones' => max(1, min(12, (int) ($r['raciones'] ?? 1))),
                    'minutos' => max(0, min(600, (int) ($r['minutos'] ?? 0))),
                    'ingredientes' => array_slice($ingredients, 0, 30),
                    'pasos' => array_slice($steps, 0, 20),
                    'porRacion' => nutritionMacros($r['porRacion'] ?? []),
                ];
            }
            if (!$recipes) throw new CoachProviderError('la respuesta no traía recetas completas');
            return ['recetas' => array_slice($recipes, 0, 3)];
        case 'plan':
            $days = [];
            foreach ((array) ($data['dias'] ?? []) as $d) {
                if (!is_array($d) || empty($d['dia'])) continue;
                $meals = [];
                foreach ((array) ($d['comidas'] ?? []) as $m) {
                    if (!is_array($m) || empty($m['plato'])) continue;
                    $meals[] = ['comida' => nutritionClean($m['comida'] ?? '', 20), 'plato' => nutritionClean($m['plato'], 160), 'kcal' => (int) round(nutritionNum($m['kcal'] ?? 0, 5000)), 'proteina' => nutritionNum($m['proteina'] ?? 0, 500)];
                }
                if ($meals) $days[] = ['dia' => nutritionClean($d['dia'], 20), 'comidas' => array_slice($meals, 0, 8)];
            }
            if (!$days) throw new CoachProviderError('la respuesta no traía días');
            $shopping = array_values(array_filter(array_map(fn($s) => nutritionClean($s, 80), (array) ($data['compra'] ?? []))));
            return ['dias' => array_slice($days, 0, 7), 'compra' => array_slice($shopping, 0, 80), 'nota' => nutritionClean($data['nota'] ?? '', 400)];
        case 'analysis':
            $tips = [];
            foreach ((array) ($data['sugerencias'] ?? []) as $s) {
                if (is_array($s) && !empty($s['titulo']) && !empty($s['detalle'])) $tips[] = ['titulo' => nutritionClean($s['titulo'], 120), 'detalle' => nutritionClean($s['detalle'], 600)];
            }
            if (empty($data['resumen']) || !$tips) throw new CoachProviderError('la respuesta no tiene el formato esperado');
            return ['resumen' => nutritionClean($data['resumen'], 600), 'sugerencias' => array_slice($tips, 0, 6)];
    }
    throw new CoachProviderError('tarea no válida');
}
