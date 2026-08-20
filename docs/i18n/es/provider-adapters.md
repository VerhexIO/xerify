[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Adaptadores de proveedor

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Xerify identifica a un proveedor por su servicio de invocación, facturación y control. Cursor Agent
es `cursor`, sin importar qué modelo upstream indique su ID exacto de modelo. El Codex/OpenAI
directo es `openai`, y el Claude/Anthropic directo es `anthropic`.

Este límite mide diversidad de canal, no independencia de proveedor de modelo ni de linaje. OpenAI
directo y un GPT servido a través de Cursor cuentan como proveedores distintos, pero pueden compartir
los mismos puntos ciegos del modelo upstream.

Todos los adaptadores integrados devuelven el mismo `InvokeResult` acotado. Los valores de uso
provienen únicamente de la respuesta del proveedor. Si faltan los campos de tokens o costo, quedan
en `null`; Xerify no los estima.

Los adaptadores oficiales fijan la identidad del proveedor de invocación en el código. En los
adaptadores `command` y `openai-compatible`, esa identidad es configuración controlada por quien la
define, no una atestación remota; para esos adaptadores, la exigencia de proveedores distintos es
tan sólida como lo sea esa configuración.

## Matriz de adaptadores integrados

| Tipo de adaptador   | Identidad de proveedor | Transporte                           | Autenticación                                                               | Verificación estructurada                                        |
| ------------------- | ---------------------- | ------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `codex`             | `openai`               | CLI oficial `codex`                  | login existente de la CLI o `CODEX_API_KEY`                                 | `codex exec --output-schema`                                     |
| `claude`            | `anthropic`            | CLI oficial `claude`                 | login existente de la CLI, `ANTHROPIC_API_KEY`, o `CLAUDE_CODE_OAUTH_TOKEN` | `claude -p --json-schema`                                        |
| `cursor`            | `cursor`               | CLI oficial `agent` de Cursor        | login existente de Cursor o `CURSOR_API_KEY`                                | contrato en el prompt; validación en el núcleo                   |
| `openai-api`        | `openai`               | Responses API                        | primero el entorno; con respaldo literal opcional                           | `text.format.type=json_schema`, estricto                         |
| `anthropic-api`     | `anthropic`            | Messages API                         | primero el entorno; con respaldo literal opcional                           | `output_config.format.type=json_schema`                          |
| `openai-compatible` | configurada            | HTTP compatible con chat-completions | entorno opcional o clave literal                                            | `response_format.type=json_schema`                               |
| `command`           | configurada            | ejecutable más arreglo de argumentos | lista de entorno permitido configurada                                      | contrato en el prompt; la respuesta igual se valida en el núcleo |

Las referencias oficiales que usan estos adaptadores son la [guía de modo no interactivo de
Codex](https://learn.chatgpt.com/docs/non-interactive-mode), la [referencia de la CLI de Claude
Code](https://code.claude.com/docs/en/cli-reference), la [guía de salida estructurada de
OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs), y la [guía de salida
estructurada de Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
El comportamiento de Cursor sigue la [descripción general de la CLI de
Agent](https://cursor.com/docs/cli/overview) oficial y la [referencia de parámetros de la
CLI](https://cursor.com/docs/cli/reference/parameters).

## CLI de Codex

Ejecutable: `codex`. Xerify envía el prompt por stdin e invoca `codex exec` con una sesión efímera,
sandbox de solo lectura, reglas/configuración de usuario ignoradas, eventos JSONL y un archivo exacto
de esquema de salida para la verificación. Ese archivo de esquema vive en un directorio temporal en
modo `0600` y se elimina en un bloque `finally`.

El último mensaje de agente `item.completed` pasa a ser la salida del proveedor. `turn.completed.usage`
se mapea a `input_tokens` y `output_tokens`; el costo queda en `null`. Un evento de error, un turno
fallido, un código de salida distinto de cero, un tiempo de espera agotado o una cancelación nunca se
informan como respuesta exitosa.

`xerify providers probe --provider codex` resuelve el ejecutable y ejecuta `codex login status`. No
hace ninguna solicitud al modelo.

## CLI de Claude

Ejecutable: `claude`. Xerify usa el modo de impresión con salida JSON, persistencia de sesión
desactivada, sin herramientas, comandos de barra desactivados, gestión de permisos no interactiva y
modo seguro. Cada llamada corre desde un directorio temporal nuevo en modo `0700`, en vez del
proyecto del usuario. La verificación entrega el JSON Schema canónico mediante `--json-schema`; el
resultado del proveedor viene de `structured_output`.

`usage.input_tokens`, `usage.output_tokens` y `total_cost_usd` se mapean cuando están presentes. Un
subtipo que no sea de éxito, o un código de salida distinto de cero, se trata como fallo del
proveedor. `xerify providers probe --provider claude` ejecuta `claude auth status --json` sin llamar
al modelo.

El esquema estricto de generación se deriva de las definiciones canónicas de campos en Zod,
despojado de las restricciones de validación que el proveedor no admite. La validación Zod del
núcleo vuelve a aplicar todos los límites al recibir la respuesta.

## CLI de Cursor Agent

Ejecutable: `agent`. Cursor es la identidad de proveedor de invocación para cualquier modelo al que
se llegue a través de Cursor Agent:

```json
{
  "providers": {
    "cursor": { "kind": "cursor", "provider": "cursor", "executable": "agent" }
  }
}
```

Ejecute `agent models` y pase exactamente uno de los ID listados como `cursor:MODEL_ID`. Xerify trata
el ID de modelo como un identificador opaco del catálogo de Cursor y no infiere la identidad de
proveedor a partir de prefijos como `gpt-`, `claude-` o `gemini-`. `auto` se rechaza antes de la
llamada porque no puede preservar en la procedencia el modelo exacto usado; los ID explícitos de
Composer, Kimi, GLM, GPT, Claude, Gemini y Grok son admisibles si la cuenta de Cursor instalada los
expone.

En esta versión no existe un adaptador directo de suscripción por CLI para Gemini. El Gemini servido
a través de Cursor sigue siendo, a todos los efectos, una invocación de Cursor. Un futuro adaptador
directo de API o CLI de Google llevaría la identidad `google`.

El adaptador envía el prompt por stdin y usa `agent -p --mode ask --sandbox enabled` con salida
JSON. Solo otorga confianza a un espacio de trabajo temporal nuevo y vacío, en modo `0700`; lo
entrega de forma explícita y lo elimina en `finally`. Cursor no expone una marca de salida por
JSON-Schema, así que el contrato canónico va dentro del propio prompt de verificación, y Xerify
valida el `result` devuelto con el mismo esquema Zod del núcleo. Un texto libre inválido o un JSON en
bloque de código inválido se convierten, por diseño fail-closed, en `unclear`; nunca se transforman
en `confirmed`.

La CLI actual de Cursor no tiene ninguna marca que desactive de forma categórica todos los servidores
MCP configurados por el usuario. El modo ask es de solo lectura y el espacio de trabajo está vacío,
pero el comportamiento de Cursor a nivel de cuenta sigue siendo un límite de confianza residual. No
envíe secretos ni ejecute este adaptador bajo una cuenta de Cursor con extensiones o configuración
MCP global que no sean de confianza. `xerify providers probe --provider <cursor-adapter-id>` ejecuta
`agent status` sin llamar al modelo, y no interpreta ni imprime la identidad de la cuenta.

El cumplimiento de la salida estructurada depende del modelo y de la versión concreta, porque Cursor
no expone ninguna marca que fuerce el esquema. En Linux x64, con Cursor Agent `2026.08.11-e8db854`,
los modelos exactos `cursor-grok-4.6-high-fast` y `gpt-5.6-sol-high` superaron el contrato fijo de
inyección/refutación; `gpt-5.6-sol-high` también completó una verificación acotada sobre código del
núcleo. En esa misma ventana de evidencia, `claude-sonnet-5-high` y `claude-sonnet-5-thinking-high`
devolvieron una salida que no pasó el esquema estricto de Xerify, y por eso quedaron tipificados como
`unclear` con código de salida `6`. Esto es una matriz honesta de lo observado, no una promesa
universal sobre una familia de modelos ni sobre futuras versiones de Cursor.

## APIs directas

El adaptador de OpenAI envía el POST a `/v1/responses` con `store: false`. El adaptador de Anthropic
envía el POST a `/v1/messages` con `anthropic-version: 2023-06-01`. Los prompts se acotan en bytes
antes de la solicitud, las respuestas se acotan como flujo, y la cancelación/tiempo de espera usan
`AbortSignal`.

En Anthropic, agotar `max_tokens` cuenta como respuesta inválida/incompleta, y `refusal` es un fallo
del proveedor que no admite reintento. En OpenAI, se tratan como fallos tipificados: una respuesta
cuyo estado no sea `completed`, una respuesta sin el bloque de salida esperado, un JSON malformado, o
una salida estructurada truncada.

Las claves de API se resuelven primero desde la variable de entorno configurada. Los adaptadores de
API directa aceptan un `apiKey` literal solo como respaldo, para instalaciones locales de un usuario
básico. Esa configuración queda excluida de Git por defecto, debe estar en modo `0600` en POSIX, y
se redacta en `config show/validate`; las claves nunca vuelven en la respuesta de `health`/`doctor`,
nunca se colocan en los prompts al proveedor, ni se escriben en los registros de auditoría.

Los valores completos de `endpoint` configurado también se redactan en la salida de configuración, y
hacen que el modo del archivo importe en POSIX. Esto evita el enmascarado parcial, inseguro, de
credenciales que puedan estar en cualquier parte de una URL. En los adaptadores compatibles con
OpenAI, solo un endpoint de loopback simple es `local` / `not-required`; la información de usuario,
los parámetros de query o los fragmentos hacen que la autenticación sea `unknown` con procedencia de
configuración. Un endpoint remoto sin una declaración explícita de clave también informa la
autenticación como `unknown`.

## `command` genérico

El adaptador genérico nunca evalúa una cadena de shell. La configuración provee un ejecutable y un
arreglo de argumentos; solo se expanden los marcadores `{model}` y `{operation}`. El prompt y el
contexto se envían por stdin. Por defecto, los comandos genéricos configurados corren desde un
directorio temporal nuevo en modo `0700`; solo el SDK programático puede indicar un `cwd` explícito.
El reenvío de entorno al proceso hijo se limita a lo esencial de la plataforma más la lista explícita
`authEnvironment` del adaptador.

```json
{
  "providers": {
    "fixture": {
      "kind": "command",
      "provider": "independent-lab",
      "executable": "/absolute/path/to/provider",
      "args": ["verify", "--model", "{model}"],
      "authKind": "local",
      "structuredOutput": true
    }
  }
}
```

## Evidencia de admisión

Las pruebas herméticas de contrato cubren el parseo de eventos de la CLI, los payloads
estructurados, el mapeo de uso, la autenticación ausente, la forma de la solicitud HTTP, el tiempo
de espera/cancelación, la salida inválida, los límites de salida, CRLF, Unicode y rutas con espacios.
La prueba de integración de procesos también verifica el envío de señales a los procesos
descendientes en POSIX.

| Entorno             | Evidencia hermética del paquete | Sondeo del binario oficial | Prueba en vivo, facturable |
| ------------------- | ------------------------------- | -------------------------- | -------------------------- |
| Linux, Node 20/24   | CI pública                      | específico de host/cuenta  | solo opt-in                |
| macOS, Node 20/24   | CI pública                      | específico de host/cuenta  | solo opt-in                |
| Windows, Node 20/24 | CI pública                      | específico de host/cuenta  | solo opt-in                |
| WSL, Node 20/24     | se verifica en el host destino  | específico de host/cuenta  | solo opt-in                |

Las pruebas normales nunca usan una cuenta de proveedor. Una prueba en vivo debe habilitarse de
forma explícita, y tratarse con claridad como potencialmente facturable. Consulte [los límites de
compatibilidad y soporte](compatibility.md) para la interpretación de estas comprobaciones de cara
al usuario.
