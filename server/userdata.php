<?php
require_once 'config.php';

global $pdo;
$currentUser = requireAuth();
$userId = $currentUser['id'];

// Almacén genérico de datos propios del usuario (peso corporal, objetivo,
// orden de la rotación, pilas de peso de las máquinas...). Cada entrada es un
// documento JSON identificado por una clave corta. La tabla se crea aquí (como
// en progression.php) para no tocar config.php.
$pdo->exec("
    CREATE TABLE IF NOT EXISTS user_data (
        user_id TEXT NOT NULL,
        data_key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, data_key)
    )
");

const USER_DATA_MAX_BYTES = 1048576; // 1 MB por documento

function validDataKey($key): bool {
    return is_string($key) && preg_match('/^[a-z][a-z0-9_-]{0,39}$/', $key) === 1;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Devuelve todos los documentos del usuario: { clave: valor }
    $stmt = $pdo->prepare("SELECT data_key, value FROM user_data WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $userId]);

    $out = new stdClass();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $decoded = json_decode($row['value'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $out->{$row['data_key']} = $decoded;
        }
    }

    sendJson($out);
}

elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Guarda (crea o reemplaza) el documento de una clave: { key, value }
    $data = getRequestData();

    if (!is_array($data) || !validDataKey($data['key'] ?? null) || !array_key_exists('value', $data)) {
        sendJson(['error' => 'Datos no válidos'], 400);
    }

    $json = json_encode($data['value'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen($json) > USER_DATA_MAX_BYTES) {
        sendJson(['error' => 'El documento es demasiado grande'], 413);
    }

    $stmt = $pdo->prepare("
        INSERT INTO user_data (user_id, data_key, value, updated_at)
        VALUES (:user_id, :data_key, :value, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, data_key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
    ");
    $stmt->execute([':user_id' => $userId, ':data_key' => $data['key'], ':value' => $json]);

    sendJson(['success' => true]);
}

elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $data = getRequestData();

    if (!is_array($data) || !validDataKey($data['key'] ?? null)) {
        sendJson(['error' => 'Datos no válidos'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM user_data WHERE user_id = :user_id AND data_key = :data_key");
    $stmt->execute([':user_id' => $userId, ':data_key' => $data['key']]);

    sendJson(['success' => true]);
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
