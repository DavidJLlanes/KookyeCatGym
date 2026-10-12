<?php
// Router simple para la API
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api', '', $path);
$path = trim($path, '/');

// Rutas disponibles
$routes = [
    'routines' => 'routines.php',
    'logs' => 'logs.php',
    'exercises' => 'exercises.php',
    'active-workout' => 'active-workout.php',
    'auth/register' => 'auth.php',
    'auth/login' => 'auth.php',
    'auth/logout' => 'auth.php',
    'auth/me' => 'auth.php',
    'users' => 'users.php',
    'users/role' => 'users.php',
    'progression-rules' => 'progression.php',
    'push/key' => 'push.php',
    'push/subscribe' => 'push.php',
    'push/unsubscribe' => 'push.php',
    'push/test' => 'push.php',
    'push/rest' => 'push.php',
    'push/rest-cancel' => 'push.php',
    'media' => 'media.php',
    'coach/status' => 'coach.php',
    'coach/config' => 'coach.php',
    'coach/history' => 'coach.php',
    'coach/analyze' => 'coach.php',
    'coach/models' => 'coach.php',
    'coach/test' => 'coach.php',
    'coach/cancel' => 'coach.php',
    'auth/registration' => 'auth.php',
    'admin/stats' => 'admin.php',
    'admin/audit' => 'admin.php',
    'admin/settings' => 'admin.php',
    'passkey/register-options' => 'passkeys.php',
    'passkey/register' => 'passkeys.php',
    'passkey/login-options' => 'passkeys.php',
    'passkey/login' => 'passkeys.php',
    'passkey/list' => 'passkeys.php',
    'passkey/delete' => 'passkeys.php',
];

$endpoint = $path ?: 'routines';

if (isset($routes[$endpoint])) {
    // Varios archivos (auth.php, users.php) agrupan más de una ruta;
    // les indicamos aquí cuál se ha pedido exactamente.
    $_GET['_route'] = $endpoint;
    require_once $routes[$endpoint];
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint no encontrado']);
}
?>
