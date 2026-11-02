<?php
require_once 'config.php';

global $pdo;
$currentUser = requireAuth();
$userId = $currentUser['id'];
$isAdmin = $currentUser['role'] === 'admin';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // GET catálogo compartido (user_id = '', valor centinela) + ejercicios
    // personalizados propios.
    $stmt = $pdo->prepare("SELECT * FROM exercises WHERE user_id = '' OR user_id = :user_id ORDER BY name");
    $stmt->execute([':user_id' => $userId]);
    $exercises = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($exercises as &$e) {
        $e['instructions'] = json_decode($e['instructions'], true);
        // PDO_SQLite puede devolver columnas INTEGER como string según la
        // versión de PHP; se fuerza el tipo para que el frontend (que
        // compara con verdad/falsedad de JS) no reciba "0"/"1" como texto.
        $e['isCustom'] = (bool) $e['isCustom'];
        $e['defaultRestTime'] = (int) $e['defaultRestTime'];
        unset($e['user_id']);
        // zone/category son opcionales: si están vacíos no se envían.
        if (($e['zone'] ?? null) === null) unset($e['zone']);
        if (($e['category'] ?? null) === null) unset($e['category']);
    }

    sendJson($exercises);
}

elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // POST guardar ejercicios (bulk o individual). Los personalizados
    // (isCustom=true) siempre quedan asociados al usuario autenticado que
    // los crea, y la clave primaria compuesta (id, user_id) impide que
    // pisen el ejercicio de otro usuario aunque reutilicen su id. Los del
    // catálogo compartido (isCustom=false) solo puede guardarlos un
    // administrador: antes cualquier usuario autenticado podía reenviar el
    // id de un ejercicio del catálogo y el INSERT OR REPLACE lo
    // sobrescribía/borraba para todo el mundo.
    $data = getRequestData();

    if (!is_array($data)) {
        $data = [$data];
    }

    // ON CONFLICT DO UPDATE en vez de INSERT OR REPLACE: preserva created_at
    // en vez de reiniciarlo cada vez que se resube el mismo ejercicio.
    $stmt = $pdo->prepare("
        INSERT INTO exercises (id, user_id, name, muscleGroup, equipment, imageUrl, defaultRestTime, instructions, isCustom, zone, category)
        VALUES (:id, :user_id, :name, :muscleGroup, :equipment, :imageUrl, :defaultRestTime, :instructions, :isCustom, :zone, :category)
        ON CONFLICT(id, user_id) DO UPDATE SET
            name = excluded.name,
            muscleGroup = excluded.muscleGroup,
            equipment = excluded.equipment,
            imageUrl = excluded.imageUrl,
            defaultRestTime = excluded.defaultRestTime,
            instructions = excluded.instructions,
            isCustom = excluded.isCustom,
            zone = excluded.zone,
            category = excluded.category
    ");

    $saved = 0;
    foreach ($data as $ex) {
        if (!is_array($ex) || !isset($ex['id']) || !isset($ex['name'])) {
            continue;
        }

        $isCustom = !empty($ex['isCustom']);

        if (!$isCustom && !$isAdmin) {
            // Un usuario normal no puede escribir en el catálogo compartido
            continue;
        }

        $stmt->execute([
            ':id' => $ex['id'],
            ':user_id' => $isCustom ? $userId : '',
            ':name' => $ex['name'],
            ':muscleGroup' => $ex['muscleGroup'] ?? '',
            ':equipment' => $ex['equipment'] ?? '',
            ':imageUrl' => $ex['imageUrl'] ?? '',
            ':defaultRestTime' => $ex['defaultRestTime'] ?? 60,
            ':instructions' => json_encode($ex['instructions'] ?? []),
            ':isCustom' => $isCustom ? 1 : 0,
            ':zone' => $ex['zone'] ?? null,
            ':category' => $ex['category'] ?? null
        ]);
        $saved++;
    }

    sendJson(['success' => true, 'saved' => $saved]);
}

else {
    sendJson(['error' => 'Método no permitido'], 405);
}
?>
