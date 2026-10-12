<?php
// Web Push sin librerías externas: cifrado del mensaje (RFC 8291, aes128gcm)
// y autenticación del servidor con VAPID (RFC 8292), solo con openssl y hash.

function b64url(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64urlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

function newEcKey() {
    $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if ($key === false) {
        throw new RuntimeException('No se pudo generar una clave EC: ' . openssl_error_string());
    }
    return $key;
}

// Punto público sin comprimir (0x04 || X || Y), el formato que usan los navegadores
function ecPublicPoint($key): string {
    $d = openssl_pkey_get_details($key);
    return "\x04" . str_pad($d['ec']['x'], 32, "\0", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\0", STR_PAD_LEFT);
}

// SubjectPublicKeyInfo DER de una clave P-256 a partir de su punto sin comprimir
function ecPublicPem(string $point): string {
    $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $point;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

// Firma ECDSA en DER (SEQUENCE { INTEGER r, INTEGER s }) → r || s de 32 bytes cada uno (JWS ES256)
function derSignatureToRaw(string $der): string {
    $offset = 2;
    $parts = [];
    for ($i = 0; $i < 2; $i++) {
        $len = ord($der[$offset + 1]);
        $int = ltrim(substr($der, $offset + 2, $len), "\0");
        $parts[] = str_pad($int, 32, "\0", STR_PAD_LEFT);
        $offset += 2 + $len;
    }
    return $parts[0] . $parts[1];
}

/** Claves VAPID del servidor: se generan una vez y se guardan fuera del web root. */
function vapidKeys(string $dataDir): array {
    $file = $dataDir . '/vapid.json';
    if (is_file($file)) {
        $keys = json_decode((string) file_get_contents($file), true);
        if (!empty($keys['private']) && !empty($keys['public'])) {
            return $keys;
        }
    }
    $key = newEcKey();
    openssl_pkey_export($key, $pem);
    $keys = ['private' => $pem, 'public' => b64url(ecPublicPoint($key))];
    file_put_contents($file, json_encode($keys));
    @chmod($file, 0600);
    return $keys;
}

function vapidAuthorization(string $endpoint, array $keys, string $subject): string {
    $url = parse_url($endpoint);
    $header = b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $claims = b64url(json_encode([
        'aud' => $url['scheme'] . '://' . $url['host'],
        'exp' => time() + 12 * 3600,
        'sub' => $subject,
    ], JSON_UNESCAPED_SLASHES));
    $signingInput = $header . '.' . $claims;
    if (!openssl_sign($signingInput, $der, $keys['private'], OPENSSL_ALGO_SHA256)) {
        throw new RuntimeException('No se pudo firmar el token VAPID');
    }
    return 'vapid t=' . $signingInput . '.' . b64url(derSignatureToRaw($der)) . ', k=' . $keys['public'];
}

/** Cuerpo cifrado aes128gcm para una suscripción (claves p256dh y auth del navegador). */
function encryptPushPayload(string $payload, string $p256dh, string $auth): string {
    $uaPublic = b64urlDecode($p256dh);
    $authSecret = b64urlDecode($auth);
    if (strlen($uaPublic) !== 65 || strlen($authSecret) !== 16) {
        throw new InvalidArgumentException('Suscripción push no válida');
    }

    $local = newEcKey();
    $asPublic = ecPublicPoint($local);
    $shared = openssl_pkey_derive(openssl_pkey_get_public(ecPublicPem($uaPublic)), $local, 32);
    if ($shared === false) {
        throw new RuntimeException('No se pudo calcular el secreto compartido');
    }

    $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0" . $uaPublic . $asPublic, $authSecret);
    $salt = random_bytes(16);
    $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);

    // Un único registro: el contenido termina con el delimitador 0x02
    $cipher = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);

    return $salt . pack('N', 4096) . chr(strlen($asPublic)) . $asPublic . $cipher . $tag;
}

// Solo se envía a servicios push conocidos: evita que alguien registre una URL
// cualquiera y use el servidor para hacer peticiones a otros sitios (SSRF).
function isAllowedPushEndpoint(string $endpoint): bool {
    $url = parse_url($endpoint);
    if (($url['scheme'] ?? '') !== 'https' || empty($url['host'])) {
        return false;
    }
    $host = strtolower($url['host']);
    $allowed = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
    if (in_array($host, $allowed, true)) {
        return true;
    }
    return (bool) preg_match('/(\.notify\.windows\.com|\.push\.apple\.com)$/', $host);
}

/** Envía una notificación. Devuelve el código HTTP del servicio push (0 si no hubo respuesta). */
function sendWebPush(array $subscription, array $payload, array $keys, string $subject): int {
    $body = encryptPushPayload(
        json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        $subscription['p256dh'],
        $subscription['auth']
    );

    $ch = curl_init($subscription['endpoint']);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'TTL: 120',
            'Urgency: high',
            'Authorization: ' . vapidAuthorization($subscription['endpoint'], $keys, $subject),
        ],
    ]);
    curl_exec($ch);
    return (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
}
?>
