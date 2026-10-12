<?php
require_once 'config.php';
require_once 'admin_lib.php';

global $pdo, $dataDir;
$currentUser = requireAdmin();
$route = $_GET['_route'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$mediaDir = $dataDir . '/media';

if ($route === 'admin/stats' && $method === 'GET') {
    $since30 = gmdate('Y-m-d', time() - 30 * 86400);
    $since7 = gmdate('Y-m-d', time() - 7 * 86400);

    $users = $pdo->query("SELECT id, username, email, role, created_at FROM users ORDER BY created_at")->fetchAll(PDO::FETCH_ASSOC);

    // Último inicio de sesión: cada login crea una sesión nueva
    $lastLogin = $pdo->query("SELECT user_id, MAX(created_at) FROM sessions GROUP BY user_id")->fetchAll(PDO::FETCH_KEY_PAIR);

    $workouts = [];
    $stmt = $pdo->prepare("
        SELECT user_id, COUNT(*) AS total, MAX(date) AS last_date,
               SUM(CASE WHEN date >= :since THEN 1 ELSE 0 END) AS last30
        FROM logs GROUP BY user_id
    ");
    $stmt->execute([':since' => $since30]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $workouts[$row['user_id']] = $row;
    }

    $media = [];
    if (tableExists($pdo, 'exercise_media')) {
        foreach ($pdo->query("SELECT user_id, COUNT(*) AS n, SUM(size) AS bytes FROM exercise_media GROUP BY user_id")->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $media[$row['user_id']] = $row;
        }
    }

    $perUser = [];
    $active7 = 0;
    $active30 = 0;
    foreach ($users as $u) {
        $w = $workouts[$u['id']] ?? null;
        $login = $lastLogin[$u['id']] ?? null;
        $lastActivity = max((string) $login, (string) ($w['last_date'] ?? ''));
        if ($lastActivity !== '' && $lastActivity >= $since7) $active7++;
        if ($lastActivity !== '' && $lastActivity >= $since30) $active30++;
        $perUser[] = [
            'id' => $u['id'],
            'username' => $u['username'],
            'role' => $u['role'],
            'createdAt' => $u['created_at'],
            'lastLogin' => $login,
            'workouts' => (int) ($w['total'] ?? 0),
            'workoutsLast30' => (int) ($w['last30'] ?? 0),
            'lastWorkout' => $w['last_date'] ?? null,
            'mediaCount' => (int) ($media[$u['id']]['n'] ?? 0),
            'mediaBytes' => (int) ($media[$u['id']]['bytes'] ?? 0),
        ];
    }

    $diskBytes = 0;
    if (is_dir($mediaDir)) {
        foreach (new DirectoryIterator($mediaDir) as $file) {
            if ($file->isFile()) $diskBytes += $file->getSize();
        }
    }

    sendJson([
        'users' => count($users),
        'admins' => count(array_filter($users, fn($u) => $u['role'] === 'admin')),
        'activeLast7' => $active7,
        'activeLast30' => $active30,
        'workouts' => array_sum(array_column($perUser, 'workouts')),
        'workoutsLast30' => array_sum(array_column($perUser, 'workoutsLast30')),
        'mediaCount' => array_sum(array_column($perUser, 'mediaCount')),
        'mediaDiskBytes' => $diskBytes,
        'pushDevices' => tableExists($pdo, 'push_subscriptions') ? (int) $pdo->query("SELECT COUNT(*) FROM push_subscriptions")->fetchColumn() : 0,
        'coachRunsLast30' => tableExists($pdo, 'coach_runs')
            ? (int) $pdo->query("SELECT COUNT(*) FROM coach_runs WHERE status = 'done' AND created_at >= datetime('now', '-30 days')")->fetchColumn()
            : 0,
        'perUser' => $perUser,
    ]);
}

elseif ($route === 'admin/audit' && $method === 'GET') {
    ensureAuditTable($pdo);
    $limit = max(1, min(500, (int) ($_GET['limit'] ?? 200)));
    $stmt = $pdo->prepare("SELECT id, created_at, action, user_id, username, ip, detail FROM audit_log ORDER BY id DESC LIMIT :limit");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Por privacidad no hay ruta para ver ni borrar fotos de otros usuarios:
// cada usuario solo ve y borra las suyas (media.php). El panel solo muestra
// cuántas hay y cuánto ocupan (admin/stats).

elseif ($route === 'admin/settings' && $method === 'GET') {
    sendJson(['registrationEnabled' => isRegistrationEnabled($dataDir)]);
}

elseif ($route === 'admin/settings' && $method === 'POST') {
    $data = getRequestData();
    $settings = appSettings($dataDir);
    if (array_key_exists('registrationEnabled', $data ?? [])) {
        $settings['registrationEnabled'] = (bool) $data['registrationEnabled'];
        auditLog($pdo, 'registration_toggled', $currentUser['id'], $currentUser['username'], $settings['registrationEnabled'] ? 'abierto' : 'cerrado');
    }
    saveAppSettings($dataDir, $settings);
    sendJson(['registrationEnabled' => isRegistrationEnabled($dataDir)]);
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
?>
