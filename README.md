<p align="center">
  <img src="docs/assets/cover-zgym.png" alt="KookyeCatGym — Entrena con constancia. Visualiza tu progreso." width="100%">
</p>

<h1 align="center">KookyeCatGym</h1>

<p align="center">
  <strong>Tu entrenamiento, tu progreso.</strong><br>
  Crea tus rutinas, registra cada serie y descubre cómo mejoras.<br>
  Una app web autoalojable y multiusuario para llevar tu gimnasio contigo.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/LICENCIA-MIT-2563eb?style=for-the-badge" alt="Licencia del código: MIT"></a>
  <a href="public/manifest.json"><img src="https://img.shields.io/badge/PWA-INSTALABLE-7c3aed?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA instalable"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5.8">
  <img src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white" alt="Vite 6">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/PHP-8%2B-777bb4?logo=php&logoColor=white" alt="PHP 8 o superior">
  <img src="https://img.shields.io/badge/SQLite-003b57?logo=sqlite&logoColor=white" alt="SQLite">
</p>

<p align="center">
  <a href="#requisitos">Instalación</a> ·
  <a href="server/README.md">Guía del backend</a> ·
  <a href="https://github.com/DavidJLlanes/kookyecatgym/issues">Reportar un problema</a> ·
  <a href="LICENSE">Licencia</a>
</p>

---

## Qué puedes hacer

| | |
| --- | --- |
| 🏋️ **Rutinas a tu medida** | Más de 5.600 ejercicios con vídeo, rutinas en carpetas, superseries y circuitos, pirámides, descansos por serie, ejercicios de repuesto y planes de iniciación (PPL, torso/pierna, cuerpo completo, 5×5). |
| 🔁 **Rotación y plan semanal** | Rotación de sesiones (A, B, C…) o días fijos; mueve una sesión de día solo esa semana y planifica semanas de descarga. |
| 📝 **Registro de entrenamientos** | Series, repeticiones, peso, RPE, cardio por tiempo y distancia, reps por lado, deslizar para borrar o copiar series, y editar o registrar entrenamientos pasados. |
| ⚖️ **Progresión** | Lineal, doble, Greyskull y triple (repeticiones → series → carga), con pila de pesas real de cada máquina. |
| 📈 **Progreso visible** | 1RM estimado, historial de cada ejercicio, mapa muscular (volumen, recuperación, sin entrenar), peso corporal frente a un objetivo y fuerza relativa. |
| 📅 **Constancia** | Calendario y mapa de actividad. |
| 🤖 **IA para tus consejos** | Coach IA integrado (con tu clave de API), resumen para pegar en cualquier IA y un [servidor MCP](mcp/README.md) de solo lectura. |
| 📤 **Tus datos, tuyos** | Exporta a CSV o JSON, importa desde Hevy, Strong o FitNotes, y comparte planes como archivo o PDF. |
| 🔠 **Accesible** | Tamaño de letra ajustable y diseño probado de 320 a 430 px de ancho. |
| 🖼️ **Tarjetas para compartir** | Genera tarjetas de tus entrenamientos y resultados para redes. |
| 🏠 **Tu propio servidor** | Aloja la app con React, PHP y SQLite, con soporte multiusuario. |

> El repositorio incluye el catálogo de ejercicios con sus vídeos e imágenes
> (`public/exercises/`, unos 190 MB). Las imágenes anatómicas y los iconos de
> marca se añaden aparte (ver [Imágenes](#imágenes)).

## Requisitos

- Node.js 18+ y npm
- PHP 8+ con la extensión PDO SQLite (para el backend)
- Node.js 22.5+ solo si vas a usar el servidor [MCP](mcp/README.md)

## Frontend

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:3000
npm run build      # genera dist/ para producción
npm run preview    # sirve el build de producción localmente
npm run lint       # comprobación de tipos (tsc --noEmit)
```

Configura la URL de la API copiando `.env.example` a `.env`:

```
VITE_API_BASE=/api          # o https://tu-dominio.com/api
```

Si no se define, por defecto usa `/api` (mismo origen).

## Backend (PHP + SQLite)

El backend está en [`server/`](server/). Súbelo a tu hosting y sírvelo bajo la
ruta que uses como `VITE_API_BASE` (p. ej. `https://tu-dominio.com/api`). La
base de datos SQLite se crea sola en el primer arranque.

Configúralo mediante variables de entorno del servidor (no son variables de
Vite):

| Variable | Descripción |
|---|---|
| `APP_ALLOWED_ORIGINS` | Dominios permitidos por CORS, separados por comas. |
| `APP_DB_PATH` | Ruta de la BD SQLite. **Debe estar fuera del web root** (contiene emails, hashes y tokens). Por defecto `../../app_data/gym.db`. |
| `ADMIN_USERNAME` | Usuario del administrador inicial (por defecto `admin`). |
| `ADMIN_EMAIL` | Email del administrador inicial. |
| `ADMIN_PASSWORD_SHA256` | Hash SHA-256 de la contraseña de admin. Si no se define, se usa `changeme`: **cámbialo de inmediato.** |

> Seguridad: nunca dejes el fichero `.db` dentro del directorio público, o
> cualquiera podría descargarlo.

## Imágenes

Los medios del catálogo **sí están incluidos**: el catálogo (`src/data/catalog.json`)
apunta a estos nombres, donde `<id>` es el número del ejercicio (p. ej. `0025`):

- `public/exercises/clip/<id>.mp4` — vídeo corto de cada ejercicio
- `public/exercises/still/<id>.webp` — fotograma estático (miniatura)
- `public/muscle-anatomy/<zona>.webp` — imágenes anatómicas por zona muscular (18 archivos)

Lo siguiente **no** se incluye y se añade aparte en `public/`:

- `public/user-photo.webp` — foto opcional del usuario para las tarjetas
  (si falta, la tarjeta se genera sin foto)

Las animaciones e imágenes de ejercicios pertenecen a sus creadores originales
(p. ej. ExerciseDB / GymVisual) y se rigen por sus propias licencias.

## Licencia

Código bajo licencia [MIT](LICENSE). Las imágenes/animaciones de ejercicios
quedan excluidas de dicha licencia (pertenecen a sus autores originales).
