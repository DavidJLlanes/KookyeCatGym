<?php
require_once 'config.php';
require_once 'admin_lib.php';
require_once 'coach_providers.php';

global $pdo, $dataDir;
$currentUser = requireAuth();
$userId = $currentUser['id'];
$isAdmin = $currentUser['role'] === 'admin';
$route = $_GET['_route'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

const COACH_DAILY_LIMIT = 10;          // análisis por usuario y día
const COACH_MAX_SUMMARY_BYTES = 60000;
const COACH_MAX_CONNECTIONS = 10;
const COACH_DEFAULT_TIMEOUT = 45;      // segundos por intento
const COACH_DEFAULT_TOTAL_TIMEOUT = 120; // segundos para todo el análisis (todas las conexiones)

$pdo->exec("
    CREATE TABLE IF NOT EXISTS coach_runs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        model TEXT,
        result TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");

// --- Configuración (claves fuera del web root, nunca llegan al navegador) ---

function coachConfigPath(string $dataDir): string {
    return $dataDir . '/coach.json';
}

function clampInt($value, int $min, int $max, int $default): int {
    return is_numeric($value) ? max($min, min($max, (int) $value)) : $default;
}

function coachConfig(string $dataDir): array {
    $file = coachConfigPath($dataDir);
    $raw = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    $raw = is_array($raw) ? $raw : [];

    // Formato antiguo (una sola clave de Anthropic): se convierte a la lista de conexiones
    if (!isset($raw['connections']) && !empty($raw['apiKey'])) {
        $raw['connections'] = [[
            'id' => 'conn-anthropic',
            'provider' => 'anthropic',
            'apiKey' => $raw['apiKey'],
            'model' => $raw['model'] ?? COACH_PROVIDERS['anthropic']['defaultModel'],
            'enabled' => true,
        ]];
    }

    $connections = [];
    foreach ($raw['connections'] ?? [] as $c) {
        if (!is_array($c) || !isset(COACH_PROVIDERS[$c['provider'] ?? ''])) continue;
        $connections[] = [
            'id' => (string) ($c['id'] ?? ('conn-' . bin2hex(random_bytes(4)))),
            'provider' => $c['provider'],
            'apiKey' => (string) ($c['apiKey'] ?? ''),
            'model' => (string) ($c['model'] ?? COACH_PROVIDERS[$c['provider']]['defaultModel']),
            'enabled' => !empty($c['enabled']),
        ];
    }

    return [
        'connections' => $connections,
        'timeoutSeconds' => clampInt($raw['timeoutSeconds'] ?? null, 10, 300, COACH_DEFAULT_TIMEOUT),
        'totalTimeoutSeconds' => clampInt($raw['totalTimeoutSeconds'] ?? null, 15, 600, COACH_DEFAULT_TOTAL_TIMEOUT),
    ];
}

function saveCoachConfig(string $dataDir, array $config): void {
    $file = coachConfigPath($dataDir);
    file_put_contents($file, json_encode($config));
    @chmod($file, 0600);
}

function activeConnections(array $config): array {
    return array_values(array_filter($config['connections'], fn($c) => $c['enabled'] && $c['apiKey'] !== '' && $c['model'] !== ''));
}

function publicConnection(array $c): array {
    return [
        'id' => $c['id'],
        'provider' => $c['provider'],
        'providerName' => COACH_PROVIDERS[$c['provider']]['name'],
        'free' => COACH_PROVIDERS[$c['provider']]['free'],
        'model' => $c['model'],
        'enabled' => $c['enabled'],
        'hasKey' => $c['apiKey'] !== '',
        'keyHint' => $c['apiKey'] !== '' ? '…' . substr($c['apiKey'], -4) : '',
    ];
}

function validApiKey(string $provider, string $key): bool {
    if ($provider === 'anthropic') return (bool) preg_match('/^sk-ant-[A-Za-z0-9_\-]{20,}$/', $key);
    return (bool) preg_match('/^[A-Za-z0-9_\-\.:]{10,300}$/', $key);
}

/** Conexión a usar en "probar"/"cargar modelos": una guardada (por id) o una nueva aún sin guardar. */
function connectionFromRequest(array $config, array $data): array {
    if (!empty($data['connectionId'])) {
        foreach ($config['connections'] as $c) {
            if ($c['id'] === $data['connectionId']) {
                // Se permite probar un modelo distinto al guardado sin guardar antes
                if (!empty($data['model'])) $c['model'] = (string) $data['model'];
                if (!empty($data['apiKey'])) $c['apiKey'] = trim((string) $data['apiKey']);
                return $c;
            }
        }
    }
    $provider = (string) ($data['provider'] ?? '');
    if (!isset(COACH_PROVIDERS[$provider])) sendJson(['error' => 'Proveedor no válido'], 400);
    $key = trim((string) ($data['apiKey'] ?? ''));
    if ($key === '') sendJson(['error' => 'Escribe la clave de API para probarla'], 400);
    return [
        'id' => 'nueva',
        'provider' => $provider,
        'apiKey' => $key,
        'model' => (string) ($data['model'] ?? COACH_PROVIDERS[$provider]['defaultModel']),
        'enabled' => true,
    ];
}

function coachRunsToday(PDO $pdo, string $userId): int {
    // Los análisis fallidos o cancelados no cuentan
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM coach_runs WHERE user_id = :user_id AND status != 'error' AND created_at >= datetime('now', '-1 day')");
    $stmt->execute([':user_id' => $userId]);
    return (int) $stmt->fetchColumn();
}

// --- Prompt ---

const COACH_SYSTEM_PROMPT = <<<'PROMPT'
Eres un entrenador personal y preparador de fuerza con experiencia. Recibirás un resumen en JSON del historial de entrenamiento de un usuario de la app KookyeCatGym (sesiones, series por grupo muscular, evolución de sus ejercicios principales, RPE y reglas de progresión).

Analízalo y da recomendaciones concretas y aplicables en sus próximas semanas: volumen semanal por grupo, frecuencia, intensidad y RPE, progresión de cargas, equilibrio entre músculos antagonistas y recuperación. Basa cada recomendación en los datos que recibes y cita las cifras que la justifican (ejercicio, peso, series, semanas). Si faltan datos para valorar algo, dilo en vez de suponer. No des consejos médicos; si algo apunta a una lesión, recomienda consultar a un profesional.

Escribe en español de España, en tono cercano y directo, de tú. Entre 3 y 7 sugerencias, ordenadas de más a menos importante.

Responde únicamente con un objeto JSON válido, sin texto antes ni después, con esta forma exacta:
{"resumen": "valoración general en 2-4 frases", "sugerencias": [{"titulo": "...", "detalle": "...", "prioridad": "alta" | "media" | "baja", "categoria": "volumen" | "frecuencia" | "intensidad" | "progresion" | "equilibrio" | "recuperacion" | "tecnica"}]}
PROMPT;

function coachSchema(): array {
    return [
        'type' => 'object',
        'additionalProperties' => false,
        'required' => ['resumen', 'sugerencias'],
        'properties' => [
            'resumen' => ['type' => 'string'],
            'sugerencias' => [
                'type' => 'array',
                'items' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'required' => ['titulo', 'detalle', 'prioridad', 'categoria'],
                    'properties' => [
                        'titulo' => ['type' => 'string'],
                        'detalle' => ['type' => 'string'],
                        'prioridad' => ['type' => 'string', 'enum' => ['alta', 'media', 'baja']],
                        'categoria' => [
                            'type' => 'string',
                            'enum' => ['volumen', 'frecuencia', 'intensidad', 'progresion', 'equilibrio', 'recuperacion', 'tecnica'],
                        ],
                    ],
                ],
            ],
        ],
    ];
}

function runRow(array $r, int $staleSeconds): array {
    $status = $r['status'];
    // Un análisis "pendiente" que ha superado el tiempo máximo se da por perdido (proceso cortado)
    if ($status === 'pending' && strtotime($r['created_at'] . ' UTC') < time() - $staleSeconds) {
        $status = 'error';
        $r['error'] = 'El análisis superó el tiempo máximo de espera. Prueba de nuevo.';
    }
    return [
        'id' => $r['id'],
        'status' => $status,
        'createdAt' => $r['created_at'],
        'result' => $r['result'] ? json_decode($r['result'], true) : null,
        'error' => $r['error'],
    ];
}

$config = coachConfig($dataDir);

if ($route === 'coach/status' && $method === 'GET') {
    $active = activeConnections($config);
    sendJson([
        'configured' => count($active) > 0,
        'isAdmin' => $isAdmin,
        'remainingToday' => max(0, COACH_DAILY_LIMIT - coachRunsToday($pdo, $userId)),
        'totalTimeoutSeconds' => $config['totalTimeoutSeconds'],
        'connections' => array_map(fn($c) => [
            'providerName' => COACH_PROVIDERS[$c['provider']]['name'],
            'model' => $c['model'],
            'free' => COACH_PROVIDERS[$c['provider']]['free'],
        ], $active),
    ]);
}

elseif ($route === 'coach/config' && $method === 'GET') {
    if (!$isAdmin) sendJson(['error' => 'Requiere permisos de administrador'], 403);
    $providers = [];
    foreach (COACH_PROVIDERS as $id => $p) {
        $providers[] = ['id' => $id] + array_intersect_key($p, array_flip(['name', 'free', 'defaultModel', 'keyUrl', 'note']));
    }
    sendJson([
        'providers' => $providers,
        'connections' => array_map('publicConnection', $config['connections']),
        'timeoutSeconds' => $config['timeoutSeconds'],
        'totalTimeoutSeconds' => $config['totalTimeoutSeconds'],
    ]);
}

elseif ($route === 'coach/config' && $method === 'POST') {
    if (!$isAdmin) sendJson(['error' => 'Requiere permisos de administrador'], 403);
    $data = getRequestData();
    $incoming = $data['connections'] ?? null;
    if (!is_array($incoming) || count($incoming) > COACH_MAX_CONNECTIONS) {
        sendJson(['error' => 'Lista de conexiones no válida (máximo ' . COACH_MAX_CONNECTIONS . ')'], 400);
    }

    $storedById = [];
    foreach ($config['connections'] as $c) $storedById[$c['id']] = $c;

    $connections = [];
    foreach ($incoming as $i => $c) {
        $provider = (string) ($c['provider'] ?? '');
        if (!isset(COACH_PROVIDERS[$provider])) sendJson(['error' => 'Proveedor no válido en la conexión ' . ($i + 1)], 400);
        $model = trim((string) ($c['model'] ?? ''));
        if ($model === '' || strlen($model) > 200) sendJson(['error' => 'Falta el modelo en la conexión ' . ($i + 1)], 400);

        $id = (string) ($c['id'] ?? '');
        $stored = $storedById[$id] ?? null;
        $newKey = trim((string) ($c['apiKey'] ?? ''));
        // Sin clave nueva se conserva la guardada (si el proveedor no ha cambiado)
        $key = $newKey !== '' ? $newKey : ($stored && $stored['provider'] === $provider ? $stored['apiKey'] : '');
        if ($key === '') sendJson(['error' => 'Falta la clave de API en la conexión ' . ($i + 1) . ' (' . COACH_PROVIDERS[$provider]['name'] . ')'], 400);
        if (!validApiKey($provider, $key)) sendJson(['error' => 'La clave de la conexión ' . ($i + 1) . ' no parece válida para ' . COACH_PROVIDERS[$provider]['name']], 400);

        $connections[] = [
            'id' => $stored ? $id : 'conn-' . bin2hex(random_bytes(6)),
            'provider' => $provider,
            'apiKey' => $key,
            'model' => $model,
            'enabled' => !empty($c['enabled']),
        ];
    }

    $config = [
        'connections' => $connections,
        'timeoutSeconds' => clampInt($data['timeoutSeconds'] ?? null, 10, 300, $config['timeoutSeconds']),
        'totalTimeoutSeconds' => clampInt($data['totalTimeoutSeconds'] ?? null, 15, 600, $config['totalTimeoutSeconds']),
    ];
    saveCoachConfig($dataDir, $config);

    auditLog($pdo, 'coach_config', $userId, $currentUser['username'], implode(', ', array_map(
        fn($c) => COACH_PROVIDERS[$c['provider']]['name'] . ' (' . $c['model'] . ($c['enabled'] ? '' : ', desactivada') . ')',
        $connections
    )) ?: 'sin conexiones');

    sendJson([
        'connections' => array_map('publicConnection', $connections),
        'timeoutSeconds' => $config['timeoutSeconds'],
        'totalTimeoutSeconds' => $config['totalTimeoutSeconds'],
    ]);
}

elseif ($route === 'coach/models' && $method === 'POST') {
    if (!$isAdmin) sendJson(['error' => 'Requiere permisos de administrador'], 403);
    $connection = connectionFromRequest($config, getRequestData() ?? []);
    try {
        sendJson(providerModels($connection['provider'], $connection['apiKey'], 20));
    } catch (CoachProviderError $e) {
        sendJson(['error' => 'No se pudo cargar la lista: ' . $e->getMessage()], 502);
    }
}

elseif ($route === 'coach/test' && $method === 'POST') {
    if (!$isAdmin) sendJson(['error' => 'Requiere permisos de administrador'], 403);
    $connection = connectionFromRequest($config, getRequestData() ?? []);
    $start = microtime(true);
    try {
        $text = providerChat(
            $connection,
            'Responde únicamente con un objeto JSON válido.',
            'Devuelve exactamente {"ok": true}',
            null,
            $config['timeoutSeconds']
        );
        $ok = extractJsonObject($text);
        sendJson([
            'ok' => is_array($ok),
            'ms' => (int) round((microtime(true) - $start) * 1000),
            'message' => is_array($ok) ? 'Funciona' : 'Responde, pero no devuelve JSON: puede fallar en los análisis',
        ]);
    } catch (CoachProviderError $e) {
        sendJson(['ok' => false, 'message' => $e->getMessage()]);
    }
}

elseif ($route === 'coach/history' && $method === 'GET') {
    $stmt = $pdo->prepare("SELECT * FROM coach_runs WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 10");
    $stmt->execute([':user_id' => $userId]);
    $stale = $config['totalTimeoutSeconds'] + 60;
    sendJson(array_map(fn($r) => runRow($r, $stale), $stmt->fetchAll(PDO::FETCH_ASSOC)));
}

elseif ($route === 'coach/cancel' && $method === 'POST') {
    $data = getRequestData();
    $stmt = $pdo->prepare("UPDATE coach_runs SET status = 'error', error = 'Cancelado.' WHERE id = :id AND user_id = :user_id AND status = 'pending'");
    $stmt->execute([':id' => (string) ($data['id'] ?? ''), ':user_id' => $userId]);
    sendJson(['success' => true]);
}

elseif ($route === 'coach/analyze' && $method === 'POST') {
    $connections = activeConnections($config);
    if (count($connections) === 0) {
        sendJson(['error' => 'El Coach IA no funciona sin al menos una clave de API configurada.', 'code' => 'not_configured'], 409);
    }
    if (coachRunsToday($pdo, $userId) >= COACH_DAILY_LIMIT) {
        sendJson(['error' => 'Has llegado al máximo de ' . COACH_DAILY_LIMIT . ' análisis en 24 horas.'], 429);
    }

    $data = getRequestData();
    $summaryJson = json_encode($data['summary'] ?? null, JSON_UNESCAPED_UNICODE);
    if (!is_array($data['summary'] ?? null) || strlen($summaryJson) > COACH_MAX_SUMMARY_BYTES) {
        sendJson(['error' => 'Resumen de entrenamientos no válido'], 400);
    }

    $runId = 'coach-' . bin2hex(random_bytes(8));
    $pdo->prepare("INSERT INTO coach_runs (id, user_id, status, model) VALUES (:id, :user_id, 'pending', :model)")
        ->execute([':id' => $runId, ':user_id' => $userId, ':model' => $connections[0]['model']]);

    // Se responde ya: el análisis puede tardar más que el límite de espera de
    // Nginx. La app consulta coach/history hasta que esté listo.
    $json = json_encode(['id' => $runId, 'status' => 'pending']);
    ignore_user_abort(true);
    header('Content-Length: ' . strlen($json));
    header('Connection: close');
    echo $json;
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        flush();
    }
    set_time_limit(0);

    $stillPending = function () use ($pdo, $runId): bool {
        $stmt = $pdo->prepare("SELECT status FROM coach_runs WHERE id = :id");
        $stmt->execute([':id' => $runId]);
        return $stmt->fetchColumn() === 'pending';
    };
    $finish = function (string $status, ?array $result, ?string $error) use ($pdo, $runId): void {
        // Solo si sigue pendiente: si el usuario lo canceló, se respeta
        $pdo->prepare("UPDATE coach_runs SET status = :status, result = :result, error = :error WHERE id = :id AND status = 'pending'")
            ->execute([
                ':status' => $status,
                ':result' => $result ? json_encode($result, JSON_UNESCAPED_UNICODE) : null,
                ':error' => $error,
                ':id' => $runId,
            ]);
    };

    $user = "Este es el resumen de mis entrenamientos:\n\n<datos>\n" . $summaryJson . "\n</datos>";
    $deadline = microtime(true) + $config['totalTimeoutSeconds'];
    $failures = [];

    // Se prueban las conexiones en orden; si una falla, la siguiente
    foreach ($connections as $connection) {
        $label = COACH_PROVIDERS[$connection['provider']]['name'] . ' (' . $connection['model'] . ')';
        $left = (int) floor($deadline - microtime(true));
        if ($left < 5) {
            $failures[] = 'se agotó el tiempo máximo antes de probar ' . $label;
            break;
        }
        if (!$stillPending()) exit;

        try {
            $text = providerChat(
                $connection,
                COACH_SYSTEM_PROMPT,
                $user,
                $connection['provider'] === 'anthropic' ? coachSchema() : null,
                min($config['timeoutSeconds'], $left)
            );
            $result = normalizeCoachResult(extractJsonObject($text));
            $result['proveedor'] = COACH_PROVIDERS[$connection['provider']]['name'];
            $result['modelo'] = $connection['model'];
            $result['intentosFallidos'] = $failures;
            $finish('done', $result, null);
            exit;
        } catch (CoachProviderError $e) {
            $failures[] = "$label: " . $e->getMessage();
        } catch (Throwable $e) {
            error_log('[KookyeCatGym coach] ' . $e->getMessage());
            $failures[] = "$label: error inesperado";
        }
    }

    $finish('error', null, 'No se pudo completar el análisis. ' . implode(' · ', $failures));
    exit;
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
?>
