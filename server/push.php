<?php
require_once 'config.php';
require_once 'push_lib.php';

global $pdo, $dataDir;
$currentUser = requireAuth();
$userId = $currentUser['id'];
$route = $_GET['_route'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

const PUSH_SUBJECT = 'https://kookyecatgym.com';
const MAX_REST_SECONDS = 900; // un descanso de más de 15 min no se programa

$pdo->exec("
    CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");
$pdo->exec("
    CREATE TABLE IF NOT EXISTS rest_alerts (
        user_id TEXT PRIMARY KEY,
        alert_id TEXT NOT NULL,
        ends_at INTEGER NOT NULL -- milisegundos
    )
");

function userSubscriptions(PDO $pdo, string $userId): array {
    $stmt = $pdo->prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $userId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Envía a todos los dispositivos del usuario y borra las suscripciones caducadas
function notifyUser(PDO $pdo, string $userId, array $payload, array $keys): int {
    $sent = 0;
    foreach (userSubscriptions($pdo, $userId) as $sub) {
        try {
            $code = sendWebPush($sub, $payload, $keys, PUSH_SUBJECT);
        } catch (Throwable $e) {
            error_log('[KookyeCatGym push] ' . $e->getMessage());
            continue;
        }
        if ($code === 404 || $code === 410) {
            $del = $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint = :endpoint");
            $del->execute([':endpoint' => $sub['endpoint']]);
        } elseif ($code >= 200 && $code < 300) {
            $sent++;
        } else {
            error_log('[KookyeCatGym push] servicio push respondió ' . $code);
        }
    }
    return $sent;
}

if ($route === 'push/key' && $method === 'GET') {
    sendJson(['publicKey' => vapidKeys($dataDir)['public']]);
}

elseif ($route === 'push/subscribe' && $method === 'POST') {
    $data = getRequestData();
    $endpoint = (string) ($data['endpoint'] ?? '');
    $p256dh = (string) ($data['keys']['p256dh'] ?? '');
    $auth = (string) ($data['keys']['auth'] ?? '');

    if (!isAllowedPushEndpoint($endpoint) || strlen(b64urlDecode($p256dh)) !== 65 || strlen(b64urlDecode($auth)) !== 16) {
        sendJson(['error' => 'Suscripción no válida'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth)
        VALUES (:endpoint, :user_id, :p256dh, :auth)
        ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
    ");
    $stmt->execute([':endpoint' => $endpoint, ':user_id' => $userId, ':p256dh' => $p256dh, ':auth' => $auth]);
    sendJson(['success' => true]);
}

elseif ($route === 'push/unsubscribe' && $method === 'POST') {
    $data = getRequestData();
    $stmt = $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint = :endpoint AND user_id = :user_id");
    $stmt->execute([':endpoint' => (string) ($data['endpoint'] ?? ''), ':user_id' => $userId]);
    sendJson(['success' => true]);
}

elseif ($route === 'push/test' && $method === 'POST') {
    $sent = notifyUser($pdo, $userId, [
        'title' => 'KookyeCatGym',
        'body' => 'Los avisos de descanso funcionan en este dispositivo.',
        'tag' => 'kookyecatgym-test',
    ], vapidKeys($dataDir));
    sendJson(['success' => $sent > 0, 'sent' => $sent]);
}

elseif ($route === 'push/rest-cancel' && $method === 'POST') {
    $stmt = $pdo->prepare("DELETE FROM rest_alerts WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $userId]);
    sendJson(['success' => true]);
}

elseif ($route === 'push/rest' && $method === 'POST') {
    // Programa el aviso de fin de descanso. Solo hay uno por usuario: programar
    // otro (nuevo descanso, +15 s, reanudar tras pausa) sustituye al anterior.
    $data = getRequestData();
    $endsAt = ((float) ($data['endsAt'] ?? 0)) / 1000; // llega en ms, como Date.now()
    $now = microtime(true);
    if ($endsAt <= $now || $endsAt > $now + MAX_REST_SECONDS) {
        sendJson(['error' => 'Hora de fin de descanso no válida'], 400);
    }
    $exerciseName = mb_substr(trim((string) ($data['exerciseName'] ?? '')), 0, 80);

    $alertId = bin2hex(random_bytes(8));
    $stmt = $pdo->prepare("
        INSERT INTO rest_alerts (user_id, alert_id, ends_at) VALUES (:user_id, :alert_id, :ends_at)
        ON CONFLICT(user_id) DO UPDATE SET alert_id = excluded.alert_id, ends_at = excluded.ends_at
    ");
    $stmt->execute([':user_id' => $userId, ':alert_id' => $alertId, ':ends_at' => (int) round($endsAt * 1000)]);

    // Se responde ya y la petición sigue viva en segundo plano hasta la hora del
    // aviso (PHP-FPM libera al cliente con fastcgi_finish_request).
    $json = json_encode(['success' => true]);
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

    $stillPending = function () use ($pdo, $userId, $alertId): bool {
        $stmt = $pdo->prepare("SELECT 1 FROM rest_alerts WHERE user_id = :user_id AND alert_id = :alert_id");
        $stmt->execute([':user_id' => $userId, ':alert_id' => $alertId]);
        return (bool) $stmt->fetchColumn();
    };

    // Espera en tramos cortos para enterarse pronto si se cancela o se sustituye
    while (($left = $endsAt - microtime(true)) > 0) {
        usleep((int) (min($left, 5) * 1000000));
        if (!$stillPending()) {
            exit;
        }
    }

    // Se reclama el aviso borrándolo: si otra petición ya lo cambió, no se envía
    $claim = $pdo->prepare("DELETE FROM rest_alerts WHERE user_id = :user_id AND alert_id = :alert_id");
    $claim->execute([':user_id' => $userId, ':alert_id' => $alertId]);
    if ($claim->rowCount() === 0) {
        exit;
    }

    notifyUser($pdo, $userId, [
        'title' => '¡Descanso terminado!',
        'body' => $exerciseName !== '' ? "Siguiente serie: {$exerciseName}" : 'A por la siguiente serie.',
        'tag' => 'kookyecatgym-rest',
    ], vapidKeys($dataDir));
    exit;
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
?>
