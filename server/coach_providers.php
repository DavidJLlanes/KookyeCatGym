<?php
// Proveedores de IA del Coach. Las direcciones de cada API están fijas aquí (no
// se aceptan URLs del cliente) para que nadie pueda usar el servidor para
// llamar a otros sitios. Todos salvo Anthropic usan el formato de OpenAI
// (/chat/completions), que comparten la mayoría de proveedores.

const COACH_PROVIDERS = [
    'openrouter' => [
        'name' => 'OpenRouter',
        'free' => true,
        'base' => 'https://openrouter.ai/api/v1',
        // "openrouter/free" reparte entre los modelos gratuitos disponibles en cada momento
        'defaultModel' => 'openrouter/free',
        'keyUrl' => 'https://openrouter.ai/keys',
        'note' => 'Modelos gratuitos: "openrouter/free" o cualquiera que acabe en :free.',
    ],
    'gemini' => [
        'name' => 'Google Gemini',
        'free' => true,
        'base' => 'https://generativelanguage.googleapis.com/v1beta/openai',
        'defaultModel' => 'gemini-2.5-flash',
        'keyUrl' => 'https://aistudio.google.com/apikey',
        'note' => 'Plan gratuito con límite de peticiones por minuto y por día.',
    ],
    'groq' => [
        'name' => 'Groq',
        'free' => true,
        'base' => 'https://api.groq.com/openai/v1',
        'defaultModel' => 'llama-3.3-70b-versatile',
        'keyUrl' => 'https://console.groq.com/keys',
        'note' => 'Plan gratuito y muy rápido.',
    ],
    'cerebras' => [
        'name' => 'Cerebras',
        'free' => true,
        'base' => 'https://api.cerebras.ai/v1',
        'defaultModel' => 'llama-3.3-70b',
        'keyUrl' => 'https://cloud.cerebras.ai',
        'note' => 'Plan gratuito con límite diario.',
    ],
    'mistral' => [
        'name' => 'Mistral',
        'free' => true,
        'base' => 'https://api.mistral.ai/v1',
        'defaultModel' => 'mistral-small-latest',
        'keyUrl' => 'https://console.mistral.ai/api-keys',
        'note' => 'Plan gratuito "Experiment" con límites.',
    ],
    'anthropic' => [
        'name' => 'Claude (Anthropic)',
        'free' => false,
        'base' => 'https://api.anthropic.com/v1',
        'defaultModel' => 'claude-opus-5-5',
        'keyUrl' => 'https://console.anthropic.com/settings/keys',
        'note' => 'De pago. El de mejor calidad.',
    ],
    'openai' => [
        'name' => 'OpenAI',
        'free' => false,
        'base' => 'https://api.openai.com/v1',
        'defaultModel' => 'gpt-4.1-mini',
        'keyUrl' => 'https://platform.openai.com/api-keys',
        'note' => 'De pago.',
    ],
    'deepseek' => [
        'name' => 'DeepSeek',
        'free' => false,
        'base' => 'https://api.deepseek.com',
        'defaultModel' => 'deepseek-chat',
        'keyUrl' => 'https://platform.deepseek.com/api_keys',
        'note' => 'De pago, muy barato.',
    ],
];

class CoachProviderError extends RuntimeException {}

function providerHeaders(string $provider, string $apiKey): array {
    if ($provider === 'anthropic') {
        return ['Content-Type: application/json', 'x-api-key: ' . $apiKey, 'anthropic-version: 2023-06-01'];
    }
    $headers = ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey];
    if ($provider === 'openrouter') {
        // OpenRouter identifica la app que hace la llamada (opcional, recomendado)
        $headers[] = 'HTTP-Referer: https://kookyecatgym.com';
        $headers[] = 'X-Title: KookyeCatGym';
    }
    return $headers;
}

/** Petición HTTP con tiempo máximo. Devuelve [código, cuerpo decodificado]. */
function providerRequest(string $method, string $url, array $headers, ?array $body, int $timeoutSeconds): array {
    $ch = curl_init($url);
    $options = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => min(10, $timeoutSeconds),
        CURLOPT_TIMEOUT => max(1, $timeoutSeconds),
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($method === 'POST') {
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $options);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);

    if ($raw === false) {
        if ($errno === CURLE_OPERATION_TIMEDOUT) {
            throw new CoachProviderError("tardó más de {$timeoutSeconds} s en responder");
        }
        throw new CoachProviderError('no se pudo conectar (' . curl_error($ch) . ')');
    }
    return [$status, json_decode((string) $raw, true)];
}

function providerErrorMessage(int $status, ?array $body): string {
    // Google devuelve el error dentro de una lista: [{"error": {...}}]
    if (is_array($body) && array_is_list($body) && isset($body[0]) && is_array($body[0])) $body = $body[0];
    $detail = $body['error']['message'] ?? ($body['error'] ?? '');
    if (is_array($detail)) $detail = json_encode($detail, JSON_UNESCAPED_UNICODE);
    $detail = mb_substr((string) $detail, 0, 160);
    // Algunos proveedores (Google) responden 400 en vez de 401 a una clave mala
    if ($status === 400 && preg_match('/api[ _-]?key/i', $detail)) {
        return 'la clave de API no es válida';
    }
    $map = [
        400 => 'petición rechazada',
        401 => 'la clave de API no es válida',
        402 => 'la cuenta no tiene saldo',
        403 => 'la clave no tiene permiso para este modelo',
        404 => 'el modelo no existe o no está disponible',
        429 => 'límite de uso alcanzado (habitual en planes gratuitos)',
        529 => 'el servicio está saturado',
    ];
    $text = $map[$status] ?? ($status >= 500 ? 'el servicio ha fallado temporalmente' : "error $status");
    return $detail !== '' && $status === 400 ? "$text: $detail" : $text;
}

// Los modelos a veces envuelven el JSON en ```json … ``` o añaden texto alrededor
function extractJsonObject(string $text): ?array {
    $text = trim($text);
    $text = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', $text);
    $data = json_decode($text, true);
    if (is_array($data)) return $data;
    $start = strpos($text, '{');
    $end = strrpos($text, '}');
    if ($start === false || $end === false || $end <= $start) return null;
    $data = json_decode(substr($text, $start, $end - $start + 1), true);
    return is_array($data) ? $data : null;
}

/** Asegura la forma {resumen, sugerencias[]} venga del modelo que venga. */
function normalizeCoachResult(?array $data): array {
    if (!$data || !isset($data['resumen']) || !isset($data['sugerencias']) || !is_array($data['sugerencias'])) {
        throw new CoachProviderError('la respuesta no tiene el formato esperado');
    }
    $suggestions = [];
    foreach ($data['sugerencias'] as $s) {
        if (!is_array($s) || empty($s['titulo']) || empty($s['detalle'])) continue;
        $priority = strtolower((string) ($s['prioridad'] ?? 'media'));
        $suggestions[] = [
            'titulo' => (string) $s['titulo'],
            'detalle' => (string) $s['detalle'],
            'prioridad' => in_array($priority, ['alta', 'media', 'baja'], true) ? $priority : 'media',
            'categoria' => strtolower((string) ($s['categoria'] ?? 'general')),
        ];
    }
    if (count($suggestions) === 0) {
        throw new CoachProviderError('la respuesta no traía sugerencias');
    }
    return ['resumen' => (string) $data['resumen'], 'sugerencias' => array_slice($suggestions, 0, 10)];
}

/**
 * Llama a un proveedor y devuelve el texto de la respuesta del modelo.
 * $schema solo lo usa Anthropic (salida JSON garantizada); al resto se le pide JSON en el prompt.
 */
function providerChat(array $connection, string $system, string $user, ?array $schema, int $timeoutSeconds): string {
    $provider = $connection['provider'];
    $config = COACH_PROVIDERS[$provider];
    $headers = providerHeaders($provider, $connection['apiKey']);

    if ($provider === 'anthropic') {
        $body = [
            'model' => $connection['model'],
            'max_tokens' => 16000,
            'system' => $system,
            'messages' => [['role' => 'user', 'content' => $user]],
        ];
        if ($schema) {
            // Si los filtros de seguridad rechazan la petición, la API la reintenta con otro modelo
            $body['fallbacks'] = 'default';
            $body['output_config'] = ['effort' => 'medium', 'format' => ['type' => 'json_schema', 'schema' => $schema]];
            $headers[] = 'anthropic-beta: server-side-fallback-2026-07-01';
        }
        [$status, $response] = providerRequest('POST', $config['base'] . '/messages', $headers, $body, $timeoutSeconds);
        if ($status !== 200) throw new CoachProviderError(providerErrorMessage($status, $response));
        $stop = $response['stop_reason'] ?? '';
        if ($stop === 'refusal') throw new CoachProviderError('el modelo se negó a responder');
        if ($stop === 'max_tokens') throw new CoachProviderError('la respuesta salió incompleta');
        $text = '';
        foreach ($response['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') $text .= $block['text'];
        }
        return $text;
    }

    $body = [
        'model' => $connection['model'],
        'messages' => [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $user],
        ],
        'response_format' => ['type' => 'json_object'],
    ];
    $url = $config['base'] . '/chat/completions';
    [$status, $response] = providerRequest('POST', $url, $headers, $body, $timeoutSeconds);

    // No todos los modelos admiten response_format: se reintenta sin él
    if ($status === 400 && stripos(json_encode($response), 'response_format') !== false) {
        unset($body['response_format']);
        [$status, $response] = providerRequest('POST', $url, $headers, $body, $timeoutSeconds);
    }
    if ($status !== 200) throw new CoachProviderError(providerErrorMessage($status, $response));

    $choice = $response['choices'][0] ?? null;
    if (!$choice) throw new CoachProviderError('respuesta vacía');
    if (($choice['finish_reason'] ?? '') === 'length') throw new CoachProviderError('la respuesta salió incompleta');
    $content = $choice['message']['content'] ?? '';
    if (is_array($content)) {
        $content = implode('', array_map(fn($part) => $part['text'] ?? '', $content));
    }
    return (string) $content;
}

/** Lista de modelos del proveedor; en OpenRouter se marcan los gratuitos. */
function providerModels(string $provider, string $apiKey, int $timeoutSeconds): array {
    $config = COACH_PROVIDERS[$provider];
    [$status, $response] = providerRequest('GET', $config['base'] . '/models', providerHeaders($provider, $apiKey), null, $timeoutSeconds);
    if ($status !== 200) throw new CoachProviderError(providerErrorMessage($status, $response));

    $models = [];
    foreach ($response['data'] ?? [] as $m) {
        $id = (string) ($m['id'] ?? '');
        if ($id === '') continue;
        if ($provider === 'gemini') $id = preg_replace('#^models/#', '', $id);
        $free = $config['free'];
        if ($provider === 'openrouter') {
            $free = ((string) ($m['pricing']['prompt'] ?? '1')) === '0' && ((string) ($m['pricing']['completion'] ?? '1')) === '0';
        }
        $models[] = ['id' => $id, 'name' => (string) ($m['name'] ?? $m['display_name'] ?? $id), 'free' => $free];
    }
    // En OpenRouter, los gratuitos primero
    usort($models, fn($a, $b) => [$b['free'], $a['id']] <=> [$a['free'], $b['id']]);
    return $models;
}
?>
