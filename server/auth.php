<?php
require_once 'config.php';
require_once 'admin_lib.php';

global $pdo, $dataDir;

$route = $_GET['_route'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function issueSession(string $userId): string {
    global $pdo;
    $token = bin2hex(random_bytes(32));
    $stmt = $pdo->prepare("INSERT INTO sessions (token, user_id) VALUES (:token, :user_id)");
    $stmt->execute([':token' => $token, ':user_id' => $userId]);
    return $token;
}

function publicUser(array $user): array {
    return [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['role'],
    ];
}

if ($route === 'auth/register' && $method === 'POST') {
    // Registro deshabilitado temporalmente (ver config.php). El bloqueo va aquí,
    // en el servidor, para que no baste con reactivar la interfaz ni pegar
    // directamente a la API.
    if (!isRegistrationEnabled($dataDir)) {
        sendJson(['error' => 'El registro de nuevos usuarios está deshabilitado temporalmente.'], 403);
    }

    // Rate limit por IP (y se registra el intento antes de procesar, para que
    // cuente incluso si acaba en 409 "ya existe" — así no se puede automatizar
    // la enumeración de cuentas a base de registros).
    enforceAuthRateLimit('register');
    recordAuthAttempt('register');

    $data = getRequestData();
    $username = trim($data['username'] ?? '');
    $email = trim(strtolower($data['email'] ?? ''));
    $password = $data['password'] ?? ''; // ya llega hasheado (SHA-256) desde el cliente

    if ($username === '' || $email === '' || $password === '') {
        sendJson(['error' => 'Faltan campos requeridos'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJson(['error' => 'El correo electrónico no es válido'], 400);
    }
    if (!isValidClientHash($password)) {
        sendJson(['error' => 'Contraseña no válida'], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username COLLATE NOCASE OR email = :email COLLATE NOCASE");
    $stmt->execute([':username' => $username, ':email' => $email]);
    if ($stmt->fetch()) {
        sendJson(['error' => 'Ya existe una cuenta con ese usuario o correo electrónico'], 409);
    }

    $id = 'user-' . bin2hex(random_bytes(8));
    $stmt = $pdo->prepare("
        INSERT INTO users (id, username, email, password_hash, role)
        VALUES (:id, :username, :email, :password_hash, 'user')
    ");
    $stmt->execute([
        ':id' => $id,
        ':username' => $username,
        ':email' => $email,
        ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
    ]);

    $token = issueSession($id);
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    auditLog($pdo, 'register', $id, $username, $email);

    sendJson(['token' => $token, 'user' => publicUser($user)]);
}

elseif ($route === 'auth/login' && $method === 'POST') {
    $data = getRequestData();
    $identifier = trim($data['identifier'] ?? '');
    $password = $data['password'] ?? '';

    if ($identifier === '' || $password === '') {
        sendJson(['error' => 'Faltan campos requeridos'], 400);
    }

    // Rate limit por IP y por identificador (normalizado a minúsculas para que
    // "User" y "user" cuenten como la misma cuenta). Se comprueba ANTES de
    // tocar la base de datos de usuarios.
    $identifierKey = strtolower($identifier);
    enforceAuthRateLimit('login', $identifierKey);

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :identifier COLLATE NOCASE OR email = :identifier COLLATE NOCASE");
    $stmt->execute([':identifier' => $identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        // Solo los intentos FALLIDOS cuentan para el límite; así un usuario
        // legítimo que acierta no se penaliza.
        recordAuthAttempt('login', $identifierKey);
        auditLog($pdo, 'login_failed', $user ? $user['id'] : null, $identifier, $user ? 'contraseña incorrecta' : 'usuario inexistente');
        sendJson(['error' => 'Usuario o contraseña incorrectos'], 401);
    }

    // Login correcto: se limpian los fallos de esa cuenta.
    clearLoginAttempts($identifierKey);
    $token = issueSession($user['id']);
    auditLog($pdo, 'login', $user['id'], $user['username']);
    sendJson(['token' => $token, 'user' => publicUser($user)]);
}

elseif ($route === 'auth/registration' && $method === 'GET') {
    // Público: la pantalla de acceso lo usa para mostrar u ocultar el registro
    sendJson(['enabled' => isRegistrationEnabled($dataDir)]);
}

elseif ($route === 'auth/me' && $method === 'GET') {
    $user = requireAuth();
    sendJson(['user' => publicUser($user)]);
}

elseif ($route === 'auth/logout' && $method === 'POST') {
    $token = $_SERVER['HTTP_X_GYM_AUTH'] ?? '';
    if ($token !== '') {
        $stmt = $pdo->prepare("DELETE FROM sessions WHERE token = :token");
        $stmt->execute([':token' => $token]);
    }
    sendJson(['success' => true]);
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
?>
