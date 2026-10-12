<?php
require_once 'config.php';

global $pdo;
$currentUser = requireAuth();
$userId = $currentUser['id'];

// La tabla se crea aquí (y no en config.php) para que añadir las reglas de
// progresión no obligue a tocar ni re-subir config.php.
$pdo->exec("
    CREATE TABLE IF NOT EXISTS progression_rules (
        user_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        rule TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, exercise_id)
    )
");

const PROGRESSION_TYPES = ['linear', 'greyskull', 'double_progression'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // GET reglas del usuario autenticado
    $stmt = $pdo->prepare("SELECT rule FROM progression_rules WHERE user_id = :user_id");
    $stmt->execute([':user_id' => $userId]);

    $rules = [];
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $json) {
        $rule = json_decode($json, true);
        if (is_array($rule)) {
            $rules[] = $rule;
        }
    }

    sendJson($rules);
}

elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // POST guardar (crear o actualizar) la regla de un ejercicio
    $data = getRequestData();

    if (!is_array($data) || empty($data['exerciseId']) || !in_array($data['type'] ?? '', PROGRESSION_TYPES, true)) {
        sendJson(['error' => 'Regla de progresión no válida'], 400);
    }

    // Solo se guardan los campos conocidos, con su tipo, para no almacenar
    // lo que el cliente quiera mandar.
    $rule = [
        'exerciseId' => (string) $data['exerciseId'],
        'type' => $data['type'],
        'enabled' => !empty($data['enabled']),
    ];
    if (isset($data['weightIncrement'])) $rule['weightIncrement'] = (float) $data['weightIncrement'];
    if (isset($data['targetReps'])) $rule['targetReps'] = (int) $data['targetReps'];
    if (isset($data['repIncrement'])) $rule['repIncrement'] = (int) $data['repIncrement'];

    $stmt = $pdo->prepare("
        INSERT INTO progression_rules (user_id, exercise_id, rule, updated_at)
        VALUES (:user_id, :exercise_id, :rule, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, exercise_id) DO UPDATE SET
            rule = excluded.rule,
            updated_at = excluded.updated_at
    ");
    $stmt->execute([
        ':user_id' => $userId,
        ':exercise_id' => $rule['exerciseId'],
        ':rule' => json_encode($rule),
    ]);

    sendJson(['success' => true, 'rule' => $rule]);
}

elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // DELETE regla de un ejercicio (solo del usuario autenticado)
    $data = getRequestData();

    if (empty($data['exerciseId'])) {
        sendJson(['error' => 'Falta el ejercicio'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM progression_rules WHERE user_id = :user_id AND exercise_id = :exercise_id");
    $stmt->execute([':user_id' => $userId, ':exercise_id' => $data['exerciseId']]);

    sendJson(['success' => true]);
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
?>
