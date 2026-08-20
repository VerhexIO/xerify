[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Referencia de la CLI

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Todos los comandos usan la misma configuración validada y el mismo núcleo que la biblioteca y el
servidor MCP. Las opciones globales pueden ir antes o después del subcomando:

| Marca                      | Significado                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| `--json`                   | Escribe un único sobre JSON estable en stdout                             |
| `--timeout <milliseconds>` | Sobrescribe el tiempo de espera acotado del ciclo de vida del proveedor   |
| `--log <path>`             | Sobrescribe la ruta segura (sin secretos) del registro JSONL de auditoría |
| `--version`                | Imprime la versión instalada de Xerify                                    |

## Comandos de verificación y adaptador

| Comando                                                                      | Propósito                                                                                 |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `xerify ask [question]`                                                      | Segunda opinión abierta; stdin aporta el contexto acotado                                 |
| `xerify ask --question <text> --to <provider:model>`                         | Forma sin ambigüedad, cuando stdin aporta el contexto                                     |
| `xerify verify --from <provider:model> --to <provider:model> --claim <text>` | Verificación orientada a la falsación, con proveedores de invocación distintos            |
| `xerify request --to <provider:model> --input <file>`                        | Solicitud cruda de depuración del adaptador, acotada; no ofrece garantías de verificación |

`ask` y `verify` también aceptan `--adapter <id>` y `--context-label <label>`. `ask` acepta un
`--from` opcional; `verify` exige que la procedencia del origen sea conocida o declarada. Todo
destino real debe llevar un ID de modelo exacto. La verificación contra el mismo proveedor y el
`auto` de Cursor fallan antes de llegar a llamar al proveedor.

## Puesta en marcha, configuración y estado

| Comando                                    | Propósito                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `xerify init`                              | Inicializa de forma idempotente el estado privado de `.xerify/` local al proyecto   |
| `xerify health [--network]`                | Disponibilidad agregada del proyecto y de los adaptadores                           |
| `xerify doctor [--network]`                | Diagnóstico detallado de runtime, configuración, MCP y adaptadores                  |
| `xerify providers list`                    | Lista las capacidades configuradas sin hacer ninguna llamada de inferencia          |
| `xerify providers probe --provider <id>`   | Sondea la disponibilidad de ejecutable/autenticación de un adaptador                |
| `xerify providers probe --all [--network]` | Sondea todos los adaptadores; las comprobaciones de red siguen sin hacer inferencia |
| `xerify config show`                       | Muestra la configuración resuelta y sus fuentes, con los secretos redactados        |
| `xerify config validate`                   | Valida la configuración de proyecto/usuario e imprime la resolución redactada       |

`health`, `doctor`, los comandos de configuración, los comandos de ejecuciones, el descubrimiento de
capacidades y el sondeo de proveedor por defecto no llaman a ningún modelo. `--network` solo agrega
una comprobación acotada de alcance del endpoint.

## Historial de ejecuciones

| Comando                                           | Propósito                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `xerify runs list [--archived] [--limit <count>]` | Lista los registros activos o los resúmenes indexados del archivo           |
| `xerify runs search <query> [--limit <count>]`    | Busca en los metadatos de encabezado/proveedor/modelo/veredicto del archivo |
| `xerify runs show <run> [--archived]`             | Muestra un registro normalizado                                             |
| `xerify runs show <run> --include-evidence`       | Incluye explícitamente el contenido de evidencia capturado                  |
| `xerify runs archive <run>`                       | Mueve un registro activo al archivo                                         |
| `xerify runs restore <run>`                       | Restaura un registro archivado                                              |
| `xerify runs delete <run> --yes [--archived]`     | Elimina un registro de forma permanente                                     |

`<run>` acepta el número de secuencia decimal (`1`) o el ID estable (`xrun_000001`). Archivar,
restaurar y eliminar son operaciones locales sobre el sistema de archivos y nunca llaman a un
proveedor. Un registro en curso no se puede archivar ni eliminar.

El listado de archivados usa `.xerify/archive/index.jsonl` como catálogo compacto. Cada resumen de
proceso contiene un `head` seguro según la política de captura, para que tanto personas como agentes
puedan identificar coincidencias probables antes de abrir un registro completo. `runs search` hace
esta búsqueda sin necesidad de abrir cada ejecución archivada.

## Servidor MCP

| Comando                                                                      | Propósito                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| `xerify mcp stdio`                                                           | Sirve MCP local por STDIO                      |
| `xerify mcp http --host 127.0.0.1 --port 8787`                               | Sirve MCP por Streamable HTTP en loopback      |
| `xerify mcp http --host 0.0.0.0 --port 8787 --token-env NAME --allow-public` | Enlace público autenticado, de forma explícita |

STDIO reserva stdout para los frames del protocolo. El HTTP fuera de loopback exige tanto
`--allow-public` como un token bearer suministrado mediante una variable de entorno nombrada.
