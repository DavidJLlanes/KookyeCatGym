<?php
// Configuración de conexión a SQLite
header('Content-Type: application/json; charset=utf-8');

// CORS: solo se permite el propio dominio (más los puertos de desarrollo
// local). Antes se enviaba '*', que dejaba a cualquier web del mundo hacer
// peticiones a la API. El riesgo real era bajo porque la autenticación va por
// cabecera (X-Gym-Auth) y no por cookies, pero acotar el origen es lo correcto.
// Configura los origenes permitidos en la variable de entorno
// APP_ALLOWED_ORIGINS (dominios separados por comas). Si no se define, solo
// se permiten los puertos habituales de desarrollo local.
$envOrigins = getenv('APP_ALLOWED_ORIGINS');
$allowedOrigins = $envOrigins
    ? array_map('trim', explode(',', $envOrigins))
    : [
        'http://localhost:3000',
        'http://localhost:3099',
        'http://localhost:5173',
    ];
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($requestOrigin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Gym-Auth');

// Si es preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Ruta a la base de datos SQLite.
// SEGURIDAD: la base de datos NO debe vivir dentro del web root, o cualquiera
// podría descargarla con un simple GET (contiene emails, hashes de contraseña
// y tokens de sesión activos). __DIR__ es la carpeta /api dentro del web root;
// con '/../../app_data/gym.db' la BD queda UN nivel POR ENCIMA del web root,
// donde Apache no la sirve. Si tu estructura de hosting es distinta, ajusta
// solo esta ruta (o la variable de entorno APP_DB_PATH) para que apunte a una
// carpeta fuera del directorio público.
$dbPath = getenv('APP_DB_PATH') ?: (__DIR__ . '/../../app_data/gym.db');
$dataDir = dirname($dbPath);

// Crear carpeta data si no existe
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Red de seguridad para cualquier endpoint: ninguno de routines/logs/
// exercises/active-workout/users envuelve sus queries en try/catch, así que
// una PDOException inesperada (ERRMODE_EXCEPTION está activado más abajo)
// terminaría como un fatal error sin JSON válido. Con esto siempre se
// responde 500 con un mensaje genérico; el detalle real solo va al log del
// servidor, nunca al cliente.
set_exception_handler(function (Throwable $e) {
    error_log('[KookyeCatGym] ' . get_class($e) . ': ' . $e->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => 'Error interno del servidor']);
    exit;
});

function tableExists(PDO $pdo, string $table): bool {
    $stmt = $pdo->prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = :t");
    $stmt->execute([':t' => $table]);
    return (bool) $stmt->fetch();
}

function columnExists(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->query("PRAGMA table_info(\"$table\")");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $col) {
        if ($col['name'] === $column) {
            return true;
        }
    }
    return false;
}

function columnIsPrimaryKey(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->query("PRAGMA table_info(\"$table\")");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $col) {
        if ($col['name'] === $column) {
            return ((int) $col['pk']) > 0;
        }
    }
    return false;
}

try {
    // Conectar a SQLite
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // --- Tablas de usuarios y sesiones (nuevas, multiusuario) ---
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");

    // --- Registro de intentos de autenticación (para el rate limiting) ---
    // Frena la fuerza bruta de contraseñas y la enumeración masiva de cuentas.
    // created_at es un timestamp UNIX (entero) para poder comparar ventanas de
    // tiempo con aritmética simple.
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS auth_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            identifier TEXT,
            action TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON auth_attempts (ip, action, created_at)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_auth_attempts_id ON auth_attempts (identifier, created_at)");

    // --- Migración: exercises pasaba de tener PK = id (a secas). Con eso,
    // cualquier usuario autenticado podía reenviar el id de un ejercicio del
    // catálogo compartido o de otro usuario y el INSERT OR REPLACE lo
    // sobrescribía/borraba para todo el mundo. Se pasa a PK compuesta
    // (id, user_id), igual que routines/logs/active_workout. El catálogo
    // compartido usa '' como valor centinela de user_id en vez de NULL,
    // porque SQLite no aplica unicidad entre columnas NULL en una PK
    // compuesta (dos filas con user_id NULL no chocarían nunca, dejando el
    // mismo agujero abierto).
    $legacyExercises = [];
    if (tableExists($pdo, 'exercises') && !columnIsPrimaryKey($pdo, 'exercises', 'user_id')) {
        $legacyExercises = $pdo->query("SELECT * FROM exercises")->fetchAll(PDO::FETCH_ASSOC);
        $pdo->exec("DROP TABLE exercises");
    }
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS exercises (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL,
            muscleGroup TEXT NOT NULL,
            equipment TEXT NOT NULL,
            imageUrl TEXT,
            defaultRestTime INTEGER,
            instructions TEXT,
            isCustom INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, user_id)
        )
    ");
    // Zona muscular y tipo de ejercicio (los ejercicios personalizados los
    // guardan para que el mapa muscular y los filtros funcionen con ellos).
    foreach (['zone', 'category'] as $extraCol) {
        if (!columnExists($pdo, 'exercises', $extraCol)) {
            $pdo->exec("ALTER TABLE exercises ADD COLUMN $extraCol TEXT");
        }
    }
    if ($legacyExercises) {
        $stmt = $pdo->prepare("
            INSERT OR IGNORE INTO exercises (id, user_id, name, muscleGroup, equipment, imageUrl, defaultRestTime, instructions, isCustom, created_at)
            VALUES (:id, :user_id, :name, :muscleGroup, :equipment, :imageUrl, :defaultRestTime, :instructions, :isCustom, :created_at)
        ");
        foreach ($legacyExercises as $e) {
            $stmt->execute([
                ':id' => $e['id'],
                ':user_id' => $e['user_id'] ?? '',
                ':name' => $e['name'],
                ':muscleGroup' => $e['muscleGroup'],
                ':equipment' => $e['equipment'],
                ':imageUrl' => $e['imageUrl'],
                ':defaultRestTime' => $e['defaultRestTime'],
                ':instructions' => $e['instructions'],
                ':isCustom' => $e['isCustom'],
                ':created_at' => $e['created_at'] ?? null,
            ]);
        }
    }

    // --- Migración: routines/logs/active_workout pasan de "un solo usuario
    // compartido" a datos privados por cuenta (clave primaria compuesta con
    // user_id). Si las tablas ya existían con el esquema antiguo, se
    // recogen sus filas para reasignarlas más abajo al usuario administrador. ---
    $legacyRoutines = [];
    if (tableExists($pdo, 'routines') && !columnExists($pdo, 'routines', 'user_id')) {
        $legacyRoutines = $pdo->query("SELECT * FROM routines")->fetchAll(PDO::FETCH_ASSOC);
        $pdo->exec("DROP TABLE routines");
    }
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS routines (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            exercises TEXT NOT NULL,
            dayOfWeek TEXT,
            folder TEXT,
            folderOrder INTEGER,
            sortOrder INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, user_id)
        )
    ");
    if (!columnExists($pdo, 'routines', 'folder')) {
        $pdo->exec("ALTER TABLE routines ADD COLUMN folder TEXT");
    }
    if (!columnExists($pdo, 'routines', 'folderOrder')) {
        $pdo->exec("ALTER TABLE routines ADD COLUMN folderOrder INTEGER");
    }
    if (!columnExists($pdo, 'routines', 'sortOrder')) {
        $pdo->exec("ALTER TABLE routines ADD COLUMN sortOrder INTEGER");
    }

    $legacyLogs = [];
    if (tableExists($pdo, 'logs') && !columnExists($pdo, 'logs', 'user_id')) {
        $legacyLogs = $pdo->query("SELECT * FROM logs")->fetchAll(PDO::FETCH_ASSOC);
        $pdo->exec("DROP TABLE logs");
    }
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS logs (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            routineId TEXT,
            routineName TEXT NOT NULL,
            date TEXT NOT NULL,
            duration INTEGER,
            exercises TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, user_id)
        )
    ");

    $legacyActiveWorkout = null;
    if (tableExists($pdo, 'active_workout') && !columnExists($pdo, 'active_workout', 'user_id')) {
        $legacyActiveWorkout = $pdo->query("SELECT * FROM active_workout WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
        $pdo->exec("DROP TABLE active_workout");
    }
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS active_workout (
            user_id TEXT PRIMARY KEY,
            routineId TEXT,
            routineName TEXT NOT NULL,
            startTime TEXT NOT NULL,
            exercises TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // --- Sembrar la cuenta de administrador inicial (solo la primera vez) ---
    // Reutiliza el mismo hash SHA-256 que ya protegía la app de un único
    // usuario, así la contraseña de acceso no cambia para quien ya la usaba.
    // Además, reclama para esa cuenta todo lo que hubiera antes de habilitar
    // el multiusuario (rutinas, entrenamientos, ejercicios personalizados).
    $userCount = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($userCount === 0) {
        // Credenciales del administrador inicial. Definelas con las variables
        // de entorno ADMIN_USERNAME, ADMIN_EMAIL y ADMIN_PASSWORD_SHA256 (el
        // hash SHA-256 de la contraseña, tal como la envia el cliente). Si no
        // se definen, se crea un admin por defecto: CAMBIALO de inmediato.
        $adminUser = getenv('ADMIN_USERNAME') ?: 'admin';
        $adminEmail = getenv('ADMIN_EMAIL') ?: 'admin@example.com';
        $adminPassSha256 = getenv('ADMIN_PASSWORD_SHA256') ?: hash('sha256', 'changeme');
        $adminId = 'user-' . bin2hex(random_bytes(8));

        $stmt = $pdo->prepare("
            INSERT INTO users (id, username, email, password_hash, role)
            VALUES (:id, :username, :email, :password_hash, 'admin')
        ");
        $stmt->execute([
            ':id' => $adminId,
            ':username' => $adminUser,
            ':email' => $adminEmail,
            ':password_hash' => password_hash($adminPassSha256, PASSWORD_BCRYPT),
        ]);

        foreach ($legacyRoutines as $r) {
            $stmt = $pdo->prepare("
                INSERT INTO routines (id, user_id, name, description, exercises, dayOfWeek, folder, created_at, updated_at)
                VALUES (:id, :user_id, :name, :description, :exercises, :dayOfWeek, :folder, :created_at, :updated_at)
            ");
            $stmt->execute([
                ':id' => $r['id'],
                ':user_id' => $adminId,
                ':name' => $r['name'],
                ':description' => $r['description'] ?? '',
                ':exercises' => $r['exercises'],
                ':dayOfWeek' => $r['dayOfWeek'] ?? null,
                ':folder' => $r['folder'] ?? null,
                ':created_at' => $r['created_at'] ?? null,
                ':updated_at' => $r['updated_at'] ?? null,
            ]);
        }

        foreach ($legacyLogs as $l) {
            $stmt = $pdo->prepare("
                INSERT INTO logs (id, user_id, routineId, routineName, date, duration, exercises, created_at)
                VALUES (:id, :user_id, :routineId, :routineName, :date, :duration, :exercises, :created_at)
            ");
            $stmt->execute([
                ':id' => $l['id'],
                ':user_id' => $adminId,
                ':routineId' => $l['routineId'] ?? null,
                ':routineName' => $l['routineName'],
                ':date' => $l['date'],
                ':duration' => $l['duration'] ?? 0,
                ':exercises' => $l['exercises'],
                ':created_at' => $l['created_at'] ?? null,
            ]);
        }

        if ($legacyActiveWorkout) {
            $stmt = $pdo->prepare("
                INSERT INTO active_workout (user_id, routineId, routineName, startTime, exercises, updated_at)
                VALUES (:user_id, :routineId, :routineName, :startTime, :exercises, :updated_at)
            ");
            $stmt->execute([
                ':user_id' => $adminId,
                ':routineId' => $legacyActiveWorkout['routineId'] ?? null,
                ':routineName' => $legacyActiveWorkout['routineName'],
                ':startTime' => $legacyActiveWorkout['startTime'],
                ':exercises' => $legacyActiveWorkout['exercises'],
                ':updated_at' => $legacyActiveWorkout['updated_at'] ?? null,
            ]);
        }

        $stmt = $pdo->prepare("UPDATE exercises SET user_id = :uid WHERE user_id = '' AND isCustom = 1");
        $stmt->execute([':uid' => $adminId]);
    }

} catch (Exception $e) {
    // El detalle técnico (mensaje de la excepción, que puede incluir texto
    // de SQLite) se registra solo en el log del servidor; al cliente nunca
    // se le devuelve más que un mensaje genérico.
    error_log('[KookyeCatGym bootstrap] ' . $e->getMessage());
    http_response_code(500);
    die(json_encode(['error' => 'Error interno del servidor']));
}

// Duración máxima de una sesión antes de exigir volver a iniciar sesión.
// Con localStorage + sin "recuérdame" explícito, un valor generoso evita
// desconectar a un usuario habitual, pero limita cuánto vive un token
// filtrado o de un dispositivo perdido.
const SESSION_MAX_AGE_DAYS = 180;

// Registro público de nuevos usuarios. Deshabilitado TEMPORALMENTE: la ruta
// /auth/register rechaza cualquier alta mientras esté en false. Ponlo a true
// para reactivarlo (y también REGISTRATION_ENABLED en src/components/AuthGate.tsx
// para volver a mostrar el formulario). El alta de usuarios desde el panel de
// administración (users.php) NO se ve afectada.
const REGISTRATION_ENABLED = false;

function sendJson($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getRequestData() {
    return json_decode(file_get_contents('php://input'), true);
}

// Devuelve el usuario autenticado a partir del token de sesión (cabecera
// X-Gym-Auth) o corta la petición con 401 si no hay sesión válida.
function requireAuth(): array {
    global $pdo;
    $token = $_SERVER['HTTP_X_GYM_AUTH'] ?? '';

    if ($token === '') {
        http_response_code(401);
        die(json_encode(['error' => 'No autorizado']));
    }

    $stmt = $pdo->prepare("
        SELECT users.id, users.username, users.email, users.role, sessions.created_at AS session_created_at
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = :token
    ");
    $stmt->execute([':token' => $token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $sessionAgeDays = (time() - strtotime($user['session_created_at'] . ' UTC')) / 86400;
        if ($sessionAgeDays > SESSION_MAX_AGE_DAYS) {
            $del = $pdo->prepare("DELETE FROM sessions WHERE token = :token");
            $del->execute([':token' => $token]);
            $user = false;
        } else {
            unset($user['session_created_at']);
        }
    }

    if (!$user) {
        http_response_code(401);
        die(json_encode(['error' => 'Sesión no válida, inicia sesión de nuevo']));
    }

    return $user;
}

// Igual que requireAuth() pero exige además rol de administrador.
function requireAdmin(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        die(json_encode(['error' => 'Requiere permisos de administrador']));
    }
    return $user;
}

// --- Rate limiting para los endpoints de autenticación ---
// Frena la fuerza bruta de contraseñas y la enumeración masiva de cuentas.
// Se apoya en la tabla auth_attempts y limita por IP y, en el login, también
// por identificador (para que no se pueda machacar una cuenta concreta).
const RATE_LIMIT_WINDOW = 900;         // ventana de 15 minutos (en segundos)
const RATE_LIMIT_MAX_LOGIN_IP = 10;    // fallos de login por IP en la ventana
const RATE_LIMIT_MAX_LOGIN_ID = 5;     // fallos de login por cuenta en la ventana
const RATE_LIMIT_MAX_REGISTER_IP = 5;  // registros por IP en la ventana

function clientIp(): string {
    // En un VPS directo REMOTE_ADDR es la IP real del cliente. Si algún día se
    // pone detrás de un proxy/CDN de confianza, habría que leer (con cuidado)
    // la cabecera X-Forwarded-For; no se hace aquí porque esa cabecera es
    // falsificable si no hay un proxy de confianza por delante.
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function enforceAuthRateLimit(string $action, ?string $identifier = null): void {
    global $pdo;
    $now = time();
    $since = $now - RATE_LIMIT_WINDOW;

    // Limpieza: descarta intentos antiguos para que la tabla no crezca sin fin.
    $pdo->prepare("DELETE FROM auth_attempts WHERE created_at < :since")->execute([':since' => $since]);

    $ip = clientIp();
    $maxIp = $action === 'register' ? RATE_LIMIT_MAX_REGISTER_IP : RATE_LIMIT_MAX_LOGIN_IP;

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM auth_attempts WHERE ip = :ip AND action = :action AND created_at >= :since");
    $stmt->execute([':ip' => $ip, ':action' => $action, ':since' => $since]);
    if ((int) $stmt->fetchColumn() >= $maxIp) {
        rejectRateLimited();
    }

    if ($action === 'login' && $identifier !== null && $identifier !== '') {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM auth_attempts WHERE identifier = :id AND action = 'login' AND created_at >= :since");
        $stmt->execute([':id' => $identifier, ':since' => $since]);
        if ((int) $stmt->fetchColumn() >= RATE_LIMIT_MAX_LOGIN_ID) {
            rejectRateLimited();
        }
    }
}

function recordAuthAttempt(string $action, ?string $identifier = null): void {
    global $pdo;
    $stmt = $pdo->prepare("INSERT INTO auth_attempts (ip, identifier, action, created_at) VALUES (:ip, :id, :action, :now)");
    $stmt->execute([':ip' => clientIp(), ':id' => $identifier, ':action' => $action, ':now' => time()]);
}

function clearLoginAttempts(string $identifier): void {
    global $pdo;
    // Tras un login correcto se limpian los fallos de ESA cuenta (no de toda la
    // IP, para que un atacante con una credencial válida no pueda resetear el
    // contador y seguir probando otras cuentas desde la misma IP).
    $stmt = $pdo->prepare("DELETE FROM auth_attempts WHERE identifier = :id AND action = 'login'");
    $stmt->execute([':id' => $identifier]);
}

function rejectRateLimited(): void {
    header('Retry-After: ' . RATE_LIMIT_WINDOW);
    sendJson(['error' => 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'], 429);
}

// Comprueba que la contraseña recibida tiene forma de hash SHA-256 (64 hex).
// El cliente SIEMPRE envía SHA-256; rechazar cualquier otra cosa evita crear
// cuentas saltándose el pipeline (p. ej. pegando a la API con una contraseña
// en claro trivial). La fuerza real de la contraseña se valida en el cliente
// antes de hashear, porque el servidor ya solo ve el hash.
function isValidClientHash($value): bool {
    return is_string($value) && preg_match('/^[a-f0-9]{64}$/', $value) === 1;
}
