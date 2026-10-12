<?php
require_once 'config.php';
require_once 'admin_lib.php';

global $pdo, $dataDir;
$method = $_SERVER['REQUEST_METHOD'];

const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
const MEDIA_MAX_PER_USER = 1000;
const MEDIA_TYPES = [
    'image/jpeg' => 'image',
    'image/png' => 'image',
    'image/webp' => 'image',
    'image/gif' => 'image',
    'video/mp4' => 'video',
    'video/quicktime' => 'video',
    'video/webm' => 'video',
];

// Los archivos se guardan fuera del web root, con su hash SHA-256 como nombre
// (el mismo archivo subido dos veces ocupa una sola vez).
$mediaDir = $dataDir . '/media';
if (!is_dir($mediaDir)) {
    mkdir($mediaDir, 0755, true);
}

// Fotos de ejercicios, de entrenamientos y de progreso físico (ver admin_lib.php)
ensureMediaSchema($pdo);

function mediaRow(array $r): array {
    return [
        'id' => $r['id'],
        'exerciseId' => $r['exercise_id'],
        'hash' => $r['hash'],
        'mime' => $r['mime'],
        'size' => (int) $r['size'],
        'isPrimary' => (bool) $r['is_primary'],
        'url' => '/api/media?h=' . $r['hash'],
        'createdAt' => $r['created_at'],
        'kind' => $r['kind'] ?? 'exercise',
        'logId' => $r['log_id'] ?? null,
        'muscle' => $r['muscle'] ?? null,
        'measureMm' => isset($r['measure_mm']) ? (int) $r['measure_mm'] : null,
        'takenAt' => $r['taken_at'] ?: substr((string) $r['created_at'], 0, 10),
    ];
}

// Día de la foto (AAAA-MM-DD); vacío o no válido -> null
function validDay($value): ?string {
    $value = is_string($value) ? trim($value) : '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) return null;
    [$y, $m, $d] = array_map('intval', explode('-', $value));
    return checkdate($m, $d, $y) ? $value : null;
}

// Medida en milímetros (1 mm .. 3 m); vacío -> null
function validMeasure($value): ?int {
    if ($value === null || $value === '') return null;
    if (!is_numeric($value)) {
        sendJson(['error' => 'La medida no es válida'], 400);
    }
    $mm = (int) round((float) $value);
    if ($mm < 1 || $mm > 3000) {
        sendJson(['error' => 'La medida no es válida'], 400);
    }
    return $mm;
}

function validLogId($value): string {
    $logId = trim((string) $value);
    if ($logId === '' || strlen($logId) > 120) {
        sendJson(['error' => 'Falta el entrenamiento'], 400);
    }
    return $logId;
}

// --- Servir un archivo (público: las etiquetas <img>/<video> no pueden mandar
// la cabecera de sesión; el hash de 64 caracteres no se puede adivinar) ---
if ($method === 'GET' && isset($_GET['h'])) {
    $hash = (string) $_GET['h'];
    $stmt = $pdo->prepare("SELECT mime FROM exercise_media WHERE hash = :hash LIMIT 1");
    $stmt->execute([':hash' => $hash]);
    $mime = $stmt->fetchColumn();
    $path = $mediaDir . '/' . $hash;

    if (!preg_match('/^[a-f0-9]{64}$/', $hash) || !$mime || !is_file($path)) {
        http_response_code(404);
        exit;
    }

    $size = filesize($path);
    $start = 0;
    $end = $size - 1;

    // Peticiones por rangos: Safari no reproduce vídeo sin ellas
    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
        if ($m[1] === '' && $m[2] !== '') {
            $start = max(0, $size - (int) $m[2]);
        } else {
            $start = (int) $m[1];
            if ($m[2] !== '') $end = min((int) $m[2], $size - 1);
        }
        if ($start > $end || $start >= $size) {
            http_response_code(416);
            header("Content-Range: bytes */$size");
            exit;
        }
        http_response_code(206);
        header("Content-Range: bytes $start-$end/$size");
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . ($end - $start + 1));
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=31536000, immutable');
    header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: inline');

    $fp = fopen($path, 'rb');
    fseek($fp, $start);
    $left = $end - $start + 1;
    while ($left > 0 && !feof($fp)) {
        $chunk = fread($fp, (int) min(65536, $left));
        echo $chunk;
        $left -= strlen($chunk);
        flush();
    }
    fclose($fp);
    exit;
}

$currentUser = requireAuth();
$userId = $currentUser['id'];
$action = $method === 'POST' && !isset($_FILES['file']) ? ((getRequestData() ?? [])['action'] ?? '') : '';

if ($method === 'GET') {
    // GET fotos y vídeos del usuario (de ejercicios, entrenamientos y progreso)
    $stmt = $pdo->prepare("SELECT * FROM exercise_media WHERE user_id = :user_id ORDER BY created_at");
    $stmt->execute([':user_id' => $userId]);
    sendJson(array_map('mediaRow', $stmt->fetchAll(PDO::FETCH_ASSOC)));
}

elseif ($method === 'POST' && isset($_FILES['file'])) {
    // POST subida (multipart/form-data): file + kind y, según el tipo,
    //   exercise: exerciseId
    //   workout:  logId
    //   progress: muscle, measureMm (opcional)
    // y takenAt (opcional, AAAA-MM-DD; por defecto hoy)
    $file = $_FILES['file'];
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE || $file['size'] > MEDIA_MAX_BYTES) {
        sendJson(['error' => 'El archivo es demasiado grande (máximo 50 MB).'], 413);
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        sendJson(['error' => 'No se pudo subir el archivo.'], 400);
    }

    $kind = (string) ($_POST['kind'] ?? 'exercise');
    $exerciseId = '';
    $logId = null;
    $muscle = null;
    $measureMm = null;
    $takenAt = validDay($_POST['takenAt'] ?? '') ?? date('Y-m-d');
    if ($kind === 'exercise') {
        $exerciseId = trim((string) ($_POST['exerciseId'] ?? ''));
        if ($exerciseId === '' || strlen($exerciseId) > 100) {
            sendJson(['error' => 'Falta el ejercicio'], 400);
        }
    } elseif ($kind === 'workout') {
        $logId = validLogId($_POST['logId'] ?? '');
    } elseif ($kind === 'progress') {
        $muscle = (string) ($_POST['muscle'] ?? '');
        if (!in_array($muscle, PROGRESS_MUSCLES, true)) {
            sendJson(['error' => 'Elige el grupo muscular'], 400);
        }
        $measureMm = validMeasure($_POST['measureMm'] ?? null);
    } else {
        sendJson(['error' => 'Tipo de foto no válido'], 400);
    }

    // El tipo se comprueba por el contenido, no por lo que diga el navegador
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!isset(MEDIA_TYPES[$mime])) {
        sendJson(['error' => 'Formato no admitido. Usa JPG, PNG, WebP, GIF, MP4, MOV o WebM.'], 415);
    }
    if ($kind === 'progress' && MEDIA_TYPES[$mime] !== 'image') {
        sendJson(['error' => 'Las fotos de progreso físico tienen que ser fotos, no vídeos.'], 415);
    }

    $count = $pdo->prepare("SELECT COUNT(*) FROM exercise_media WHERE user_id = :user_id");
    $count->execute([':user_id' => $userId]);
    if ((int) $count->fetchColumn() >= MEDIA_MAX_PER_USER) {
        sendJson(['error' => 'Has alcanzado el máximo de ' . MEDIA_MAX_PER_USER . ' fotos y vídeos.'], 409);
    }

    $hash = hash_file('sha256', $file['tmp_name']);
    // La misma foto subida dos veces al mismo sitio no se duplica
    $existing = $pdo->prepare("
        SELECT * FROM exercise_media
        WHERE user_id = :user_id AND hash = :hash AND kind = :kind
          AND exercise_id = :exercise_id AND IFNULL(log_id, '') = :log_id AND IFNULL(muscle, '') = :muscle
    ");
    $existing->execute([
        ':user_id' => $userId,
        ':hash' => $hash,
        ':kind' => $kind,
        ':exercise_id' => $exerciseId,
        ':log_id' => $logId ?? '',
        ':muscle' => $muscle ?? '',
    ]);
    if ($row = $existing->fetch(PDO::FETCH_ASSOC)) {
        sendJson(mediaRow($row));
    }

    $dest = $mediaDir . '/' . $hash;
    if (!is_file($dest) && !move_uploaded_file($file['tmp_name'], $dest)) {
        sendJson(['error' => 'No se pudo guardar el archivo en el servidor.'], 500);
    }

    // La primera foto de un ejercicio pasa a ser su imagen principal
    $isPrimary = 0;
    if ($kind === 'exercise' && MEDIA_TYPES[$mime] === 'image') {
        $hasPrimary = $pdo->prepare("SELECT 1 FROM exercise_media WHERE user_id = :user_id AND kind = 'exercise' AND exercise_id = :exercise_id AND is_primary = 1");
        $hasPrimary->execute([':user_id' => $userId, ':exercise_id' => $exerciseId]);
        $isPrimary = $hasPrimary->fetchColumn() ? 0 : 1;
    }

    $id = 'media-' . bin2hex(random_bytes(8));
    $stmt = $pdo->prepare("
        INSERT INTO exercise_media (id, user_id, exercise_id, hash, mime, size, is_primary, kind, log_id, muscle, measure_mm, taken_at)
        VALUES (:id, :user_id, :exercise_id, :hash, :mime, :size, :is_primary, :kind, :log_id, :muscle, :measure_mm, :taken_at)
    ");
    $stmt->execute([
        ':id' => $id,
        ':user_id' => $userId,
        ':exercise_id' => $exerciseId,
        ':hash' => $hash,
        ':mime' => $mime,
        ':size' => (int) $file['size'],
        ':is_primary' => $isPrimary,
        ':kind' => $kind,
        ':log_id' => $logId,
        ':muscle' => $muscle,
        ':measure_mm' => $measureMm,
        ':taken_at' => $takenAt,
    ]);

    $what = MEDIA_TYPES[$mime] === 'video' ? 'vídeo' : 'foto';
    $where = ['exercise' => 'de ejercicio', 'workout' => 'de entrenamiento', 'progress' => "de progreso ($muscle)"][$kind];
    auditLog($pdo, 'media_uploaded', $userId, $currentUser['username'], "$what $where");

    $row = $pdo->prepare("SELECT * FROM exercise_media WHERE id = :id");
    $row->execute([':id' => $id]);
    sendJson(mediaRow($row->fetch(PDO::FETCH_ASSOC)));
}

elseif ($action === 'update') {
    // POST {action: 'update', id, takenAt?, muscle?, measureMm?}: corrige la
    // fecha de una foto de entrenamiento o de progreso, o su músculo y medida
    $data = getRequestData();
    $stmt = $pdo->prepare("SELECT * FROM exercise_media WHERE id = :id AND user_id = :user_id AND kind IN ('workout', 'progress')");
    $stmt->execute([':id' => (string) ($data['id'] ?? ''), ':user_id' => $userId]);
    $media = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$media) {
        sendJson(['error' => 'No encontrado'], 404);
    }

    $takenAt = array_key_exists('takenAt', $data) ? validDay($data['takenAt']) : ($media['taken_at'] ?: substr($media['created_at'], 0, 10));
    if ($takenAt === null) {
        sendJson(['error' => 'La fecha no es válida'], 400);
    }
    $muscle = $media['muscle'];
    $measureMm = $media['measure_mm'];
    if ($media['kind'] === 'progress') {
        if (array_key_exists('muscle', $data)) {
            if (!in_array($data['muscle'], PROGRESS_MUSCLES, true)) {
                sendJson(['error' => 'Elige el grupo muscular'], 400);
            }
            $muscle = $data['muscle'];
        }
        if (array_key_exists('measureMm', $data)) {
            $measureMm = validMeasure($data['measureMm']);
        }
    }
    $pdo->prepare("UPDATE exercise_media SET taken_at = :t, muscle = :m, measure_mm = :mm WHERE id = :id")
        ->execute([':t' => $takenAt, ':m' => $muscle, ':mm' => $measureMm, ':id' => $media['id']]);

    $stmt = $pdo->prepare("SELECT * FROM exercise_media WHERE id = :id");
    $stmt->execute([':id' => $media['id']]);
    sendJson(mediaRow($stmt->fetch(PDO::FETCH_ASSOC)));
}

elseif ($action === 'relink') {
    // POST {action: 'relink', from, to}: al terminar el entrenamiento activo, sus
    // fotos ("active:<inicio>") pasan al entrenamiento ya guardado en el historial
    $data = getRequestData();
    $from = validLogId($data['from'] ?? '');
    $to = validLogId($data['to'] ?? '');
    $stmt = $pdo->prepare("UPDATE exercise_media SET log_id = :to WHERE user_id = :user_id AND kind = 'workout' AND log_id = :from");
    $stmt->execute([':to' => $to, ':from' => $from, ':user_id' => $userId]);
    sendJson(['success' => true, 'moved' => $stmt->rowCount()]);
}

elseif ($action === 'primary') {
    // POST {action: 'primary', id}: usar esta foto como imagen del ejercicio
    $data = getRequestData();
    $stmt = $pdo->prepare("SELECT * FROM exercise_media WHERE id = :id AND user_id = :user_id");
    $stmt->execute([':id' => (string) ($data['id'] ?? ''), ':user_id' => $userId]);
    $media = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$media || ($media['kind'] ?? 'exercise') !== 'exercise' || MEDIA_TYPES[$media['mime']] !== 'image') {
        sendJson(['error' => 'Solo una foto puede ser la imagen principal'], 400);
    }

    $pdo->beginTransaction();
    $pdo->prepare("UPDATE exercise_media SET is_primary = 0 WHERE user_id = :user_id AND kind = 'exercise' AND exercise_id = :exercise_id")
        ->execute([':user_id' => $userId, ':exercise_id' => $media['exercise_id']]);
    $pdo->prepare("UPDATE exercise_media SET is_primary = 1 WHERE id = :id")->execute([':id' => $media['id']]);
    $pdo->commit();

    sendJson(['success' => true]);
}

elseif ($method === 'POST') {
    sendJson(['error' => 'Acción no válida'], 400);
}

elseif ($method === 'DELETE') {
    // DELETE {id}: borra la foto/vídeo; el archivo solo se elimina si nadie más lo usa
    $data = getRequestData();
    $stmt = $pdo->prepare("SELECT * FROM exercise_media WHERE id = :id AND user_id = :user_id");
    $stmt->execute([':id' => (string) ($data['id'] ?? ''), ':user_id' => $userId]);
    $media = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$media) {
        sendJson(['error' => 'No encontrado'], 404);
    }

    deleteMediaItem($pdo, $mediaDir, $media);
    sendJson(['success' => true]);
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
?>
