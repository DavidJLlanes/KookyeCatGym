# 🚀 Gym API Backend

Backend PHP + SQLite para sincronización de datos de entrenamiento. Multiusuario: cada cuenta tiene sus propias rutinas, entrenamientos y entrenamiento activo; el catálogo de ejercicios es compartido, salvo los ejercicios personalizados de cada usuario.

## 📂 Estructura local

```
hevy-workout-tracker/
├── src/                    ← App React
├── public/                 ← Imágenes de ejercicios
├── server/                 ← BACKEND API (este directorio)
│   ├── config.php
│   ├── auth.php
│   ├── users.php
│   ├── routines.php
│   ├── logs.php
│   ├── exercises.php
│   ├── active-workout.php
│   ├── progression.php
│   ├── userdata.php
│   ├── index.php
│   ├── .htaccess
│   └── README.md
└── package.json
```

## 🌐 Despliegue en servidor

Estos archivos se suben a tu hosting en:

```
kookyecatgym.com/api/
├── config.php
├── auth.php
├── users.php
├── routines.php
├── logs.php
├── exercises.php
├── active-workout.php
├── index.php
└── .htaccess

kookyecatgym.com/data/
└── gym.db (se crea y migra automáticamente)
```

## 🔐 Autenticación

Cada petición (salvo registro/login) debe incluir la cabecera `X-Gym-Auth: <token>`,
donde `<token>` es el token de sesión devuelto por `auth/login` o `auth/register`.

- `POST /api/auth/register` - Crear cuenta (`username`, `email`, `password` ya hasheada en SHA-256 por el cliente) → `{ token, user }`
- `POST /api/auth/login` - Iniciar sesión (`identifier` = usuario o email, `password`) → `{ token, user }`
- `GET /api/auth/me` - Usuario autenticado actual
- `POST /api/auth/logout` - Cerrar sesión (invalida el token)

## 👑 Administración de usuarios (solo rol `admin`)

- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario (`username`, `email`, `password`, `role`)
- `DELETE /api/users` - Eliminar usuario (`id`)
- `POST /api/users/role` - Cambiar el rol de un usuario (`id`, `role`)

## 📡 Endpoints de datos (requieren sesión; cada usuario ve solo lo suyo)

- `GET /api/exercises` - Catálogo compartido + ejercicios personalizados propios
- `POST /api/exercises` - Guardar ejercicios (bulk o individual)
- `GET /api/routines` - Obtener tus rutinas
- `POST /api/routines` - Guardar rutina
- `DELETE /api/routines` - Eliminar rutina
- `GET /api/logs` - Obtener tu historial
- `POST /api/logs` - Guardar entrenamiento
- `DELETE /api/logs` - Eliminar entrenamiento del historial
- `GET /api/progression-rules` - Tus reglas de progresión (lineal, doble, Greyskull o triple)
- `POST /api/progression-rules` - Guardar la regla de un ejercicio
- `DELETE /api/progression-rules` - Borrar la regla de un ejercicio
- `GET /api/user-data` - Tus datos propios como `{ clave: valor }`: peso corporal y objetivo, favoritos,
  equipamiento, rotación, plan semanal, semanas de descarga y pilas de pesas
- `POST /api/user-data` - Guardar un documento (`key`, `value`; clave `a-z0-9_-`, máx. 1 MB)
- `GET /api/active-workout` - Obtener tu entrenamiento activo
- `POST /api/active-workout` - Guardar entrenamiento activo
- `DELETE /api/active-workout` - Limpiar entrenamiento activo

## 🔧 Instalación

1. Sube todos estos archivos a `kookyecatgym.com/api/`
2. Crea carpeta `kookyecatgym.com/data/` con permisos 755
3. Verifica que los archivos tengan permisos 644
4. Al desplegar por primera vez esta versión multiusuario, `config.php` migra
   automáticamente la base de datos existente sin perder datos: crea las
   tablas de usuarios/sesiones, añade las columnas necesarias, y asigna todo
   lo que hubiera antes (rutinas, entrenamientos, ejercicios personalizados)
   a una cuenta de administrador inicial creada con la misma contraseña que
   ya se usaba.
5. Prueba: `https://kookyecatgym.com/api/auth/login` (con usuario/contraseña debe devolver un token)

## ✅ Testing local

Para probar sin subir al servidor:

```bash
php -S localhost:8000 server/index.php
```

Luego:
```
http://localhost:8000/api/auth/login
```
