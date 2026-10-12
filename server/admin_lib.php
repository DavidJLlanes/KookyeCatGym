<?php
// Utilidades del panel de administración compartidas por varios endpoints:
// registro de auditoría, ajustes de la app y borrado de fotos/vídeos.

const AUDIT_RETENTION_DAYS = 180;

function ensureAuditTable(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            action TEXT NOT NULL,
            user_id TEXT,
            username TEXT,
            ip TEXT,
            detail TEXT
        )
    ");
}

/**
 * Apunta un evento en el registro de auditoría. Nunca debe romper la petición
 * que lo llama: si falla, solo se anota en el log del servidor.
 */
function auditLog(PDO $pdo, string $action, ?string $userId, ?string $username, string $detail = ''): void {
    try {
        ensureAuditTable($pdo);
        $stmt = $pdo->prepare("
            INSERT INTO audit_log (action, user_id, username, ip, detail)
            VALUES (:action, :user_id, :username, :ip, :detail)
        ");
        $stmt->execute([
            ':action' => $action,
            ':user_id' => $userId,
            ':username' => $username !== null ? mb_substr($username, 0, 100) : null,
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ':detail' => mb_substr($detail, 0, 500),
        ]);
        // Limpieza ocasional de entradas antiguas
        if (random_int(1, 100) === 1) {
            $pdo->exec("DELETE FROM audit_log WHERE created_at < datetime('now', '-" . AUDIT_RETENTION_DAYS . " days')");
        }
    } catch (Throwable $e) {
        error_log('[KookyeCatGym audit] ' . $e->getMessage());
    }
}

// --- Ajustes de la app editables desde el panel (fuera del web root) ---

function appSettings(string $dataDir): array {
    $file = $dataDir . '/settings.json';
    $settings = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    return is_array($settings) ? $settings : [];
}

function saveAppSettings(string $dataDir, array $settings): void {
    $file = $dataDir . '/settings.json';
    file_put_contents($file, json_encode($settings));
    @chmod($file, 0600);
}

// El valor del panel manda; si nunca se ha tocado, vale REGISTRATION_ENABLED de config.php
function isRegistrationEnabled(string $dataDir): bool {
    $settings = appSettings($dataDir);
    return array_key_exists('registrationEnabled', $settings) ? (bool) $settings['registrationEnabled'] : REGISTRATION_ENABLED;
}

// --- Fotos y vídeos ---

// Grupos musculares de las fotos de progreso físico (los mismos que los ejercicios)
const PROGRESS_MUSCLES = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Abdomen', 'Piernas'];

/**
 * Tabla de fotos y vídeos. Una misma tabla para los tres tipos:
 *   exercise -> foto de un ejercicio (exercise_id)
 *   workout  -> foto de un entrenamiento (log_id; "active:<inicio>" mientras está en curso)
 *   progress -> foto de progreso físico (muscle, measure_mm opcional)
 * taken_at es el día de la foto (AAAA-MM-DD), editable; created_at, cuándo se subió.
 */
function ensureMediaSchema(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS exercise_media (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            exercise_id TEXT NOT NULL,
            hash TEXT NOT NULL,
            mime TEXT NOT NULL,
            size INTEGER NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");
    $columns = [
        'kind' => "TEXT NOT NULL DEFAULT 'exercise'",
        'log_id' => 'TEXT',
        'muscle' => 'TEXT',
        'measure_mm' => 'INTEGER',
        'taken_at' => 'TEXT',
    ];
    foreach ($columns as $name => $type) {
        if (!columnExists($pdo, 'exercise_media', $name)) {
            $pdo->exec("ALTER TABLE exercise_media ADD COLUMN $name $type");
        }
    }
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_media_user ON exercise_media (user_id, kind)");
}

/**
 * Borra una foto/vídeo (fila de exercise_media). El archivo solo se elimina del
 * disco si ya no lo usa nadie; si era la foto principal, otra pasa a serlo.
 */
function deleteMediaItem(PDO $pdo, string $mediaDir, array $media): void {
    $pdo->prepare("DELETE FROM exercise_media WHERE id = :id")->execute([':id' => $media['id']]);

    $stillUsed = $pdo->prepare("SELECT 1 FROM exercise_media WHERE hash = :hash LIMIT 1");
    $stillUsed->execute([':hash' => $media['hash']]);
    if (!$stillUsed->fetchColumn()) {
        @unlink($mediaDir . '/' . $media['hash']);
    }

    if ($media['is_primary']) {
        $next = $pdo->prepare("
            SELECT id FROM exercise_media
            WHERE user_id = :user_id AND kind = 'exercise' AND exercise_id = :exercise_id AND mime LIKE 'image/%'
            ORDER BY created_at LIMIT 1
        ");
        $next->execute([':user_id' => $media['user_id'], ':exercise_id' => $media['exercise_id']]);
        if ($nextId = $next->fetchColumn()) {
            $pdo->prepare("UPDATE exercise_media SET is_primary = 1 WHERE id = :id")->execute([':id' => $nextId]);
        }
    }
}
?>
