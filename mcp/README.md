# Servidor MCP de ZGym (solo lectura)

Permite que un asistente de IA (Claude Desktop, Claude Code…) **consulte tu historial de entrenamiento** y te dé consejos con datos reales, en vez de pegarle un resumen a mano.

- Se ejecuta **en tu ordenador** y lee una **copia** de la base de datos (`gym.db`).
- **Solo lectura**: la base se abre en modo de solo lectura, no puede modificar nada.
- No abre puertos ni usa internet: se comunica con el asistente por la entrada y salida estándar.
- Requiere **Node 22.5 o superior** (usa `node:sqlite`, sin instalar nada más).

## Qué puede preguntarle el asistente

| Herramienta | Para qué |
|---|---|
| `resumen_general` | Visión de conjunto: entrenamientos, última sesión, sesiones por semana, series por músculo (últimas 4 semanas frente a las 4 anteriores) y racha |
| `entrenamientos_recientes` | Los últimos entrenamientos con sus ejercicios y series |
| `historial_ejercicio` | Evolución de un ejercicio: cada sesión, mejor serie y 1RM estimado |
| `records` | Mejores marcas (1RM estimado) por ejercicio |
| `peso_corporal` | Pesajes, ritmo semanal y objetivo (si has desplegado el servidor nuevo con `user_data`) |
| `rutinas` | Tus rutinas guardadas |
| `buscar_ejercicio` | Busca el nombre exacto de un ejercicio del catálogo |

Ejemplos de lo que puedes pedirle: «¿cómo voy?», «¿qué músculo estoy descuidando?», «¿cómo ha evolucionado mi press de banca?», «¿estoy entrenando demasiado piernas?».

## Puesta en marcha

1. **Consigue una copia de la base de datos.** En el VPS está en `/var/www/zgym_data/gym.db`. Descárgala a tu ordenador (por ejemplo a `F:\zgym_data\gym.db`). Trabaja siempre con la copia, nunca con el archivo del servidor. Cuando quieras datos al día, vuelve a descargarla.

2. **Conéctalo a tu asistente.**

   **Claude Code** (en una terminal):

   ```
   claude mcp add zgym -- node "F:\mi app\KookyeCatGym\mcp\zgym-mcp.mjs" --db "F:\zgym_data\gym.db" --user TuUsuario
   ```

   **Claude Desktop**: en su archivo de configuración (`claude_desktop_config.json`), dentro de `mcpServers`:

   ```json
   {
     "mcpServers": {
       "zgym": {
         "command": "node",
         "args": [
           "F:\\mi app\\KookyeCatGym\\mcp\\zgym-mcp.mjs",
           "--db", "F:\\zgym_data\\gym.db",
           "--user", "TuUsuario"
         ]
       }
     }
   }
   ```

   Reinicia Claude Desktop después de guardar.

3. `--user` es tu nombre de usuario en la app. Es obligatorio si la base tiene más de un usuario; si solo hay uno, se puede omitir.

También se pueden usar las variables de entorno `ZGYM_DB` y `ZGYM_USER` en lugar de los argumentos.

## Prueba rápida sin asistente

```
node mcp/zgym-mcp.mjs --db F:\zgym_data\gym.db --user TuUsuario
```

Debe imprimir en la consola de errores «zgym-mcp listo (solo lectura)» y quedarse esperando. Se cierra con Ctrl+C.

## Privacidad

Lo que el asistente consulte (tus entrenamientos y tu peso) se envía al servicio de IA que uses. El servidor solo lee tu copia local; no envía nada por su cuenta. No es consejo médico: ante dolor, lesiones o dieta, consulta a un profesional.
