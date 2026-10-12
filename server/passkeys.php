<?php
// Inicio de sesión con passkeys (WebAuthn): Face ID / Touch ID en iPhone,
// huella o cara en Android, Windows Hello en PC. Sin librerías externas.
//
// La cara o la huella nunca salen del dispositivo: el navegador firma un reto
// aleatorio con una clave privada que guarda el móvil, y aquí solo se guarda la
// clave pública para comprobar esa firma.
//
// Rutas:
//   passkey/register-options  POST (sesión)  reto para dar de alta una passkey
//   passkey/register          POST (sesión)  guarda la passkey creada
//   passkey/login-options     POST (público) reto para iniciar sesión
//   passkey/login             POST (público) comprueba la firma y abre sesión
//   passkey/list              GET  (sesión)  passkeys del usuario
//   passkey/delete            POST (sesión)  quita una passkey
require_once 'config.php';
require_once 'admin_lib.php';

global $pdo, $allowedOrigins;

$route = $_GET['_route'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

const PASSKEY_CHALLENGE_TTL = 300; // segundos que vale un reto

$pdo->exec("
    CREATE TABLE IF NOT EXISTS passkeys (
        credential_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        public_key TEXT NOT NULL,
        algorithm INTEGER NOT NULL,
        sign_count INTEGER NOT NULL DEFAULT 0,
        name TEXT NOT NULL DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS passkey_challenges (
        challenge TEXT PRIMARY KEY,
        user_id TEXT,
        kind TEXT NOT NULL,
        expires_at INTEGER NOT NULL
    );
");
$pdo->exec("CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys (user_id)");
$pdo->prepare("DELETE FROM passkey_challenges WHERE expires_at < :now")->execute([':now' => time()]);

function b64urlEncode(string $bin): string {
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function b64urlDecode($text): string {
    if (!is_string($text) || $text === '' || preg_match('/^[A-Za-z0-9_-]+$/', $text) !== 1) {
        sendJson(['error' => 'Datos de la passkey no válidos'], 400);
    }
    return base64_decode(strtr($text, '-_', '+/') . str_repeat('=', (4 - strlen($text) % 4) % 4));
}

// Origen desde el que llama la app, solo si es uno de los permitidos (config.php)
function passkeyOrigin(?string $origin): ?string {
    global $allowedOrigins;
    return ($origin !== null && in_array($origin, $allowedOrigins, true)) ? $origin : null;
}

// El "rp id" es el dominio al que quedan ligadas las passkeys. Se usa el
// dominio sin "www." para que valgan en kookyecatgym.com y en www.kookyecatgym.com.
function rpIdFor(string $origin): string {
    $host = parse_url($origin, PHP_URL_HOST) ?: 'kookyecatgym.com';
    return preg_replace('/^www\./', '', $host);
}

function requestRpId(): string {
    $origin = passkeyOrigin($_SERVER['HTTP_ORIGIN'] ?? null);
    return $origin ? rpIdFor($origin) : 'kookyecatgym.com';
}

function newChallenge(string $kind, ?string $userId): string {
    global $pdo;
    $challenge = b64urlEncode(random_bytes(32));
    $stmt = $pdo->prepare("INSERT INTO passkey_challenges (challenge, user_id, kind, expires_at) VALUES (:c, :u, :k, :e)");
    $stmt->execute([':c' => $challenge, ':u' => $userId, ':k' => $kind, ':e' => time() + PASSKEY_CHALLENGE_TTL]);
    return $challenge;
}

// Comprueba clientDataJSON (tipo, reto y origen) y consume el reto: cada reto
// vale para un solo intento. Devuelve [rpId, user_id del reto].
function verifyClientData(string $clientDataJSON, string $type, string $kind): array {
    global $pdo;
    $clientData = json_decode($clientDataJSON, true);
    if (!is_array($clientData) || ($clientData['type'] ?? '') !== $type) {
        sendJson(['error' => 'Respuesta de la passkey no válida'], 400);
    }
    $origin = passkeyOrigin($clientData['origin'] ?? null);
    if (!$origin) {
        sendJson(['error' => 'Origen no permitido'], 400);
    }
    $challenge = (string) ($clientData['challenge'] ?? '');
    $stmt = $pdo->prepare("SELECT * FROM passkey_challenges WHERE challenge = :c AND kind = :k AND expires_at >= :now");
    $stmt->execute([':c' => $challenge, ':k' => $kind, ':now' => time()]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $pdo->prepare("DELETE FROM passkey_challenges WHERE challenge = :c")->execute([':c' => $challenge]);
    if (!$row) {
        sendJson(['error' => 'La solicitud ha caducado. Inténtalo de nuevo.'], 400);
    }
    return [rpIdFor($origin), $row['user_id']];
}

// authenticatorData: hash del rp id (32) + flags (1) + contador (4) + ...
// Exige que el usuario haya estado presente (UP) y verificado con cara,
// huella o PIN (UV).
function parseAuthData(string $authData, string $rpId): array {
    if (strlen($authData) < 37 || !hash_equals(hash('sha256', $rpId, true), substr($authData, 0, 32))) {
        sendJson(['error' => 'La passkey no es de este sitio'], 400);
    }
    $flags = ord($authData[32]);
    if (($flags & 0x01) === 0 || ($flags & 0x04) === 0) {
        sendJson(['error' => 'Falta la verificación con cara, huella o PIN'], 400);
    }
    return ['flags' => $flags, 'signCount' => unpack('N', substr($authData, 33, 4))[1]];
}

function spkiToPem(string $der): string {
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

function passkeyName($name): string {
    $name = trim(is_string($name) ? $name : '');
    return $name === '' ? 'Dispositivo' : mb_substr($name, 0, 60);
}

if ($route === 'passkey/register-options' && $method === 'POST') {
    $user = requireAuth();
    $stmt = $pdo->prepare("SELECT credential_id FROM passkeys WHERE user_id = :u");
    $stmt->execute([':u' => $user['id']]);
    sendJson([
        'challenge' => newChallenge('register', $user['id']),
        'rp' => ['id' => requestRpId(), 'name' => 'KookyeCatGym'],
        'user' => ['id' => b64urlEncode($user['id']), 'name' => $user['email'], 'displayName' => $user['username']],
        'excludeCredentials' => $stmt->fetchAll(PDO::FETCH_COLUMN),
        'timeout' => PASSKEY_CHALLENGE_TTL * 1000,
    ]);
}

elseif ($route === 'passkey/register' && $method === 'POST') {
    $user = requireAuth();
    $data = getRequestData() ?? [];
    $credentialId = (string) ($data['id'] ?? '');
    $credentialBin = b64urlDecode($credentialId);
    [$rpId, $challengeUser] = verifyClientData(b64urlDecode($data['clientDataJSON'] ?? ''), 'webauthn.create', 'register');
    if ($challengeUser !== $user['id']) {
        sendJson(['error' => 'La solicitud no es de esta sesión'], 400);
    }

    $authData = b64urlDecode($data['authenticatorData'] ?? '');
    $parsed = parseAuthData($authData, $rpId);
    // Datos de la credencial: aaguid (16) + longitud del id (2) + id
    if (($parsed['flags'] & 0x40) === 0 || strlen($authData) < 55) {
        sendJson(['error' => 'Respuesta de la passkey incompleta'], 400);
    }
    $idLength = unpack('n', substr($authData, 53, 2))[1];
    if (!hash_equals(substr($authData, 55, $idLength), $credentialBin)) {
        sendJson(['error' => 'Respuesta de la passkey no válida'], 400);
    }

    $algorithm = (int) ($data['publicKeyAlgorithm'] ?? 0);
    $pem = spkiToPem(b64urlDecode($data['publicKey'] ?? ''));
    $key = openssl_pkey_get_public($pem);
    $details = $key ? openssl_pkey_get_details($key) : null;
    $okType = ($algorithm === -7 && ($details['type'] ?? null) === OPENSSL_KEYTYPE_EC)
        || ($algorithm === -257 && ($details['type'] ?? null) === OPENSSL_KEYTYPE_RSA);
    if (!$okType) {
        sendJson(['error' => 'Tipo de passkey no compatible'], 400);
    }

    $stmt = $pdo->prepare("SELECT 1 FROM passkeys WHERE credential_id = :id");
    $stmt->execute([':id' => $credentialId]);
    if ($stmt->fetch()) {
        sendJson(['error' => 'Esta passkey ya está registrada'], 409);
    }
    $stmt = $pdo->prepare("
        INSERT INTO passkeys (credential_id, user_id, public_key, algorithm, sign_count, name)
        VALUES (:id, :u, :pk, :alg, :count, :name)
    ");
    $stmt->execute([
        ':id' => $credentialId,
        ':u' => $user['id'],
        ':pk' => $pem,
        ':alg' => $algorithm,
        ':count' => $parsed['signCount'],
        ':name' => passkeyName($data['name'] ?? ''),
    ]);
    auditLog($pdo, 'passkey_added', $user['id'], $user['username'], passkeyName($data['name'] ?? ''));
    sendJson(['success' => true]);
}

elseif ($route === 'passkey/login-options' && $method === 'POST') {
    enforceAuthRateLimit('login');
    sendJson([
        'challenge' => newChallenge('login', null),
        'rpId' => requestRpId(),
        'timeout' => PASSKEY_CHALLENGE_TTL * 1000,
    ]);
}

elseif ($route === 'passkey/login' && $method === 'POST') {
    enforceAuthRateLimit('login');
    $data = getRequestData() ?? [];
    $credentialId = (string) ($data['id'] ?? '');
    b64urlDecode($credentialId);
    $clientDataJSON = b64urlDecode($data['clientDataJSON'] ?? '');
    $authData = b64urlDecode($data['authenticatorData'] ?? '');
    $signature = b64urlDecode($data['signature'] ?? '');
    [$rpId] = verifyClientData($clientDataJSON, 'webauthn.get', 'login');
    $parsed = parseAuthData($authData, $rpId);

    $stmt = $pdo->prepare("
        SELECT passkeys.*, users.username, users.email, users.role
        FROM passkeys JOIN users ON users.id = passkeys.user_id
        WHERE passkeys.credential_id = :id
    ");
    $stmt->execute([':id' => $credentialId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $userHandle = $data['userHandle'] ?? null;
    $valid = $row
        && ($userHandle === null || $userHandle === '' || hash_equals(b64urlEncode($row['user_id']), (string) $userHandle))
        && openssl_verify($authData . hash('sha256', $clientDataJSON, true), $signature, $row['public_key'], OPENSSL_ALGO_SHA256) === 1;

    if (!$valid) {
        recordAuthAttempt('login');
        auditLog($pdo, 'login_failed', $row['user_id'] ?? null, $row['username'] ?? '', 'passkey no válida');
        sendJson(['error' => $row ? 'No se pudo verificar la passkey' : 'Esta passkey ya no está registrada en KookyeCatGym. Entra con tu contraseña y vuelve a activarla.'], 401);
    }

    // Contador de firmas: si el dispositivo lo usa y no avanza, la passkey
    // podría estar clonada. iPhone y Android con passkeys sincronizadas lo dejan
    // siempre a 0, y entonces no se comprueba.
    if ($parsed['signCount'] > 0 || (int) $row['sign_count'] > 0) {
        if ($parsed['signCount'] <= (int) $row['sign_count']) {
            auditLog($pdo, 'login_failed', $row['user_id'], $row['username'], 'contador de passkey no válido');
            sendJson(['error' => 'No se pudo verificar la passkey'], 401);
        }
    }
    $stmt = $pdo->prepare("UPDATE passkeys SET sign_count = :count, last_used_at = CURRENT_TIMESTAMP WHERE credential_id = :id");
    $stmt->execute([':count' => $parsed['signCount'], ':id' => $credentialId]);

    $token = bin2hex(random_bytes(32));
    $stmt = $pdo->prepare("INSERT INTO sessions (token, user_id) VALUES (:token, :user_id)");
    $stmt->execute([':token' => $token, ':user_id' => $row['user_id']]);
    auditLog($pdo, 'login', $row['user_id'], $row['username'], 'passkey: ' . $row['name']);
    sendJson([
        'token' => $token,
        'user' => ['id' => $row['user_id'], 'username' => $row['username'], 'email' => $row['email'], 'role' => $row['role']],
    ]);
}

elseif ($route === 'passkey/list' && $method === 'GET') {
    $user = requireAuth();
    $stmt = $pdo->prepare("SELECT credential_id AS id, name, created_at, last_used_at FROM passkeys WHERE user_id = :u ORDER BY created_at");
    $stmt->execute([':u' => $user['id']]);
    sendJson($stmt->fetchAll(PDO::FETCH_ASSOC));
}

elseif ($route === 'passkey/delete' && $method === 'POST') {
    $user = requireAuth();
    $data = getRequestData() ?? [];
    $stmt = $pdo->prepare("DELETE FROM passkeys WHERE credential_id = :id AND user_id = :u");
    $stmt->execute([':id' => (string) ($data['id'] ?? ''), ':u' => $user['id']]);
    if ($stmt->rowCount() > 0) {
        auditLog($pdo, 'passkey_removed', $user['id'], $user['username']);
    }
    sendJson(['success' => true]);
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
?>
