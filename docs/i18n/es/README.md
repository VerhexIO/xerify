# Guía de Xerify en español

[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) ·
[简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

Esta guía reúne instalación, CLI, configuración, proveedores, contrato JSON, historial, MCP,
compatibilidad y límites de seguridad. Los comandos, campos JSON, identificadores provider/model,
códigos de salida y claves de configuración no se traducen. La fuente normativa es el
[índice de documentación en inglés](../../README.md).

## 1. Modelo del producto

```text
artefacto del autor → núcleo Xerify → otro proveedor de invocación → resultado tipado
```

- `ask`: segunda opinión abierta; el proveedor de origen es opcional.
- `verify`: intenta refutar una afirmación concreta con provenance conocida; exige otro proveedor.
- `confirmed`: no se encontró un contraejemplo material dentro de la evidencia suministrada.
- `refuted`: la evidencia contradice materialmente la afirmación.
- `unclear`: evidencia o respuesta insuficiente para decidir con seguridad.

Xerify no sustituye tests, typecheck, linter, comprobaciones de ejecución ni revisión humana. Un
orden habitual es `tests → typecheck → lint → runtime checks → Xerify → política humana/merge`.

## 2. Instalación y actualización

```sh
# Global
npm install --global xverify-cli@latest
xerify --version
xerify init

# Fijado en el proyecto
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version

# Ejecución puntual
npx --yes --package=xverify-cli@latest xerify --json health
```

Se requiere Node.js 20+; Node.js 24 es la vía principal. Las instalaciones globales, transitivas,
`--no-save` y `npx` no inicializan el proyecto actual. Ejecuta `xerify init` explícitamente.
`XERIFY_SKIP_AUTO_INIT=1` desactiva la inicialización protegida de una dependencia local directa.
Desinstalar npm no elimina automáticamente `.xerify/`.

## 3. Preparación sin llamar al modelo

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

No realizan inferencia. `--network` añade únicamente accesibilidad acotada de endpoints. `health`
informa `ready`, `degraded` o `setup-required`, inicialización, identidad del adapter, preparación de
auth y política de historial sin mostrar tokens.

## 4. Referencia CLI

| Opción                     | Propósito                                           |
| -------------------------- | --------------------------------------------------- |
| `--json`                   | escribir un único envelope JSON estable en stdout   |
| `--timeout <milliseconds>` | sobrescribir el timeout acotado del proveedor       |
| `--log <path>`             | sobrescribir la ruta JSONL de auditoría secret-safe |
| `--version`                | imprimir la versión instalada                       |

| Comando                                                                  | Propósito                                       |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| `xerify ask --to provider:model --question <text>`                       | segunda opinión abierta                         |
| `xerify verify --from provider:model --to provider:model --claim <text>` | verificación orientada a falsificación          |
| `xerify request --to provider:model --input <file>`                      | depuración acotada sin garantías de verify      |
| `xerify init`                                                            | inicializar estado privado de forma idempotente |
| `xerify health` / `doctor`                                               | preparación y diagnóstico detallado             |
| `xerify providers list` / `probe`                                        | capacidades y preparación transport/auth        |
| `xerify config show` / `validate`                                        | mostrar o validar config redactada              |
| `xerify runs ...`                                                        | gestionar historial local                       |
| `xerify mcp stdio` / `mcp http`                                          | iniciar MCP                                     |

`request` no aplica provenance, separación de proveedores, análisis de verdict ni semántica de
salida de `verify`.

## 5. Identidad del proveedor y adapters

Provider significa servicio de invocación, facturación y control:

| Adapter             | Provider    | Autenticación                                          |
| ------------------- | ----------- | ------------------------------------------------------ |
| `codex`             | `openai`    | login de CLI o `CODEX_API_KEY`                         |
| `claude`            | `anthropic` | login, `ANTHROPIC_API_KEY` o `CLAUDE_CODE_OAUTH_TOKEN` |
| `cursor`            | `cursor`    | `agent login` o `CURSOR_API_KEY`                       |
| `openai-api`        | `openai`    | variable con nombre; literal opcional                  |
| `anthropic-api`     | `anthropic` | variable con nombre; literal opcional                  |
| `openai-compatible` | configurado | env/literal o endpoint local                           |
| `command`           | configurado | solo allowlist `authEnvironment`                       |

Los IDs de Cursor son identificadores opacos del catálogo. Elige un ID exacto de `agent models`;
`cursor:auto` se rechaza antes de la llamada. Gemini a través de Cursor sigue siendo provider
`cursor`; un futuro adapter directo de Google usaría `google`.

La separación de provider no demuestra independencia del linaje. OpenAI directo y GPT mediante
Cursor pueden compartir modelo y puntos ciegos upstream.

## 6. Configuración y secretos

Archivo del proyecto: `.xerify/xverify-config.json`.

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {
    "cursor": {
      "kind": "cursor",
      "provider": "cursor",
      "executable": "agent"
    },
    "openaiApi": {
      "kind": "openai-api",
      "apiKeyEnvironment": "OPENAI_API_KEY"
    }
  },
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "history": {
    "enabled": true,
    "directory": ".xerify/runs",
    "archiveDirectory": ".xerify/archive",
    "captureInput": "full",
    "captureOutput": "normalized",
    "sequencePadding": 6
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

Precedencia: flag CLI → override de entorno Xerify → config de proyecto → config de usuario →
valor predeterminado. Rutas de usuario: Linux `$XDG_CONFIG_HOME/xerify/xverify-config.json`, macOS
`~/Library/Application Support/Xerify/xverify-config.json`, Windows
`%APPDATA%\Xerify\xverify-config.json`. Para automatización hermética usa
`XERIFY_USER_CONFIG_PATH`.

Prefiere `apiKeyEnvironment`; un `apiKey` literal solo es un fallback local consciente.
`config show/validate` redacta la clave y el endpoint completo. En POSIX, un archivo con literal o
endpoint explícito debe tener modo `0600`. No confirmes config, logs, runs o salida del proveedor en
Git ni los envíes como evidencia sin revisar.

## 7. Prompt injection y límite de datos

```text
contrato de sistema Xerify
  > tarea de verificación
  > alcance aprobado por el usuario
  > evidencia no confiable suministrada
```

Las instrucciones dentro de código, diffs, logs, Markdown, comentarios o salida de otro agente son
evidencia, no autoridad. El verifier debe intentar falsificar e ignorar cambios de rol, verdict o
schema incrustados. Esto reduce el riesgo, pero no vuelve a un LLM inmune a injection. Revisa el
alcance y el proveedor antes de enviar; no envíes secrets, volcados de entorno, datos de clientes ni
material sin autorización.

Xerify nunca ejecuta la salida como shell, código, instrucción MCP o configuración. Los procesos
usan `shell: false`, stdin, límites de bytes/tiempo y un entorno permitido.

## 8. Contrato JSON y códigos de salida

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

| Exit | Significado                                          |
| ---: | ---------------------------------------------------- |
|  `0` | ask respondido o verify confirmed                    |
|  `2` | entrada/config, mismo provider o provenance inválida |
|  `3` | ejecutable, endpoint o auth no disponible            |
|  `4` | timeout o cancelación                                |
|  `5` | fallo de provider, proceso o transporte API          |
|  `6` | respuesta inválida, incompleta o fuera del schema    |
| `10` | refuted                                              |
| `11` | unclear sin fallo inferior                           |

Después de iniciar el ciclo del provider, los fallos devuelven un `VerifyResult` completo con
`verdict: "unclear"` y `failure` tipado. Debe analizarse stdout incluso con exit no cero. Evidencia
truncada nunca puede producir `confirmed`.

## 9. Historial y archivo

```text
.xerify/
├── runs/HEAD.json
├── runs/000001/
│   ├── process.json
│   ├── request.json
│   ├── events.jsonl
│   ├── result.json o error.json
│   └── evidence/manifest.json
└── archive/index.jsonl
```

`HEAD.json` asigna IDs monótonos que no se reutilizan. `captureInput` puede ser
`full|metadata|none`; `captureOutput`, `normalized|metadata|none`. La evidencia solo se imprime con
`--include-evidence` explícito.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archivar, restaurar y eliminar no llaman a un modelo. El borrado es permanente. El `index.jsonl`
append-only permite buscar el último resumen sin abrir todos los registros.

## 10. MCP

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.1.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

Herramientas: `xerify_ask`, `xerify_verify`, `xerify_capabilities`. Las dos primeras pueden generar
coste; capabilities no infiere. HTTP:

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

Fuera de loopback se necesitan `--allow-public`, bearer token desde una variable con nombre y un
límite TLS/reverse-proxy adecuado. Las credenciales de suscripción de CLI local no se transfieren a
un servicio remoto.

## 11. Compatibilidad y determinismo

- CI: Ubuntu, macOS y Windows con Node.js 20/24; WSL usa la ruta Linux.
- Biblioteca ESM con declaraciones TypeScript, CLI, MCP STDIO y Streamable HTTP.
- `schemaVersion: 1`; campos opcionales nuevos son aditivos, quitar o reinterpretar es breaking.
- Los tests normales no requieren credenciales ni ejecutan inferencia.
- El texto del LLM no es determinista byte a byte. Xerify garantiza schema, límites, fallos tipados
  y resultado fail-closed, no palabras idénticas.

## 12. Ejemplos observados

El [catálogo canónico](../../examples/README.md) incluye investigación, planificación de juego,
decisión web, análisis de datos, política outbound y dos casos dogfood. El
[índice JSONL](../../examples/index.jsonl) permite a las herramientas AI buscar primero resúmenes
pequeños. La evidencia histórica y los resultados observados no se traducen.

| Escenario                               | Resultado   | Exit |
| --------------------------------------- | ----------- | ---: |
| Retención a seis meses                  | `unclear`   |   11 |
| Capacidad de un juego para dos personas | `refuted`   |   10 |
| Elección de arquitectura web            | `refuted`   |   10 |
| Conversión A/B agregada                 | `refuted`   |   10 |
| Política outbound de datos restringidos | `refuted`   |   10 |
| Invariantes del adapter Cursor          | `confirmed` |    0 |
| Límite del paquete npm                  | `confirmed` |    0 |

## Referencias canónicas

[Instalación](../../installation.md) · [Configuración](../../configuration.md) ·
[CLI](../../cli-reference.md) · [Adapters](../../provider-adapters.md) ·
[Canales](../../channels.md) · [JSON/Exit](../../json-contract.md) ·
[Historial](../../run-history.md) · [MCP](../../mcp.md) ·
[Compatibilidad](../../compatibility.md) · [Arquitectura](../../architecture.md) ·
[Seguridad](../../../SECURITY.md)

En caso de conflicto, prevalece el contrato canónico probado en inglés.
