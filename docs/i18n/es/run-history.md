[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Historial de ejecuciones local

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Cada `ask`/`verify` de la CLI, la biblioteca o MCP puede crear un registro determinista, local al
proyecto. Esto hace que las llamadas al proveedor se puedan entender y revisar, sin convertir la
salida cruda de transporte en un artefacto.

```text
.xerify/
├── runs/
│   ├── HEAD.json           # one monotonic allocator/current-head record
│   └── 000001/
│       ├── process.json
│       ├── request.json
│       ├── events.jsonl
│       ├── result.json       # or error.json; omitted by capture policy
│       └── evidence/
│           ├── manifest.json
│           └── 001-<sha256>.txt
└── archive/
    ├── index.jsonl         # compact searchable archive lifecycle catalog
    └── 000002/             # same record layout after archive
```

Las secuencias aumentan a través de los registros activos y archivados, dentro de un único espacio
de numeración fijo. Un `runs/HEAD.json` privado guarda la última secuencia asignada, el directorio,
el ID estable de la ejecución y la hora de actualización. Un `.HEAD.lock` de vida corta existe solo
durante una asignación concurrente; no crece con la cantidad de ejecuciones. El directorio que se
muestra usa el relleno de ceros configurado (seis dígitos por defecto), mientras que el ID estable es
`xrun_000001`; los comandos aceptan tanto ese ID como `1`. Por eso, eliminar la ejecución `000001` no
hace que la siguiente operación vuelva a llamarse `000001`. Los formatos antiguos de `.sequences/` se
validan, se incorporan a `HEAD.json`, y se eliminan en la siguiente asignación.

## Archivos del registro

| Ruta                        | Significado                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process.json`              | ID estable de la ejecución, secuencia, `head` buscable, operación/superficie, estado del ciclo de vida, marcas de tiempo, adaptador/proveedor/modelo destino, y el código de salida/veredicto final o el fallo tipificado |
| `request.json`              | Metadatos normalizados de la solicitud ask/verify, procedencia de autor/destino, límites, etiqueta de contexto, política de captura, conteos de bytes y hashes                                                            |
| `events.jsonl`              | Eventos del ciclo de vida, solo de anexado: `started`, seguido de `completed` o `failed`; los eventos de archivado/restauración se agregan sin reescribir el historial                                                    |
| `result.json`               | El resultado normalizado de Xerify ya parseado, o un resumen de resultado solo con metadatos según `captureOutput`; ausente cuando es `none`                                                                              |
| `error.json`                | Error tipificado, sin secretos, cuando no se puede guardar ningún resultado normalizado final                                                                                                                             |
| `evidence/manifest.json`    | ID de evidencia, etiquetas/localizadores, conteos de bytes, hashes SHA-256 y, opcionalmente, los nombres de archivo guardados                                                                                             |
| `evidence/001-<sha256>.txt` | Contexto de entrada acotado, solo cuando `captureInput` es `full`; la numeración sigue el orden de la evidencia, no es un segundo contador de ejecuciones                                                                 |

Cada entrada de evidencia lleva un localizador, un conteo de bytes y un hash `sha256:`. Los archivos
se crean con modos POSIX privados donde el sistema lo permite, y se escriben de forma atómica. Una
caída puede dejar un registro `running` que sigue siendo veraz; Xerify no inventa un resultado final.
El directorio de la ejecución es la unidad de inspección para personas y agentes; los esquemas JSON
se mantienen deliberadamente más pequeños que los registros de tareas de orquestación de Deckent,
porque Xerify registra una sola solicitud al proveedor, no el plan de un worker ni el ciclo de vida
de mutaciones de un proyecto.

## Índice de archivo buscable

`xerify runs archive <run>` mueve el registro completo a `archive/<number>/` y agrega un objeto JSON
compacto a `archive/index.jsonl`. Restaurar y eliminar agregan nuevos objetos de ciclo de vida, en
lugar de reescribir el historial. Cada línea contiene:

- el evento, la ubicación y la hora, y si provino del comando o de una reconciliación tras una
  caída;
- el resumen `process` completo y compacto, incluyendo el `head` legible para personas y agentes, el
  proveedor/modelo, el veredicto, el código de salida, el estado y las marcas de tiempo;
- `recordSha256`, que cubre el proceso exacto, la solicitud, el resultado normalizado o el error
  tipificado, y el manifiesto de evidencia en ese punto del ciclo de vida.

La última línea de un `runId` es su estado indexado vigente. `xerify runs list --archived` lee solo
este índice más los nombres de directorio; no abre cada archivo de proceso archivado. Las entradas
heredadas faltantes o de un ciclo de vida interrumpido se reconcilian a partir únicamente del
directorio afectado, y se marcan como `source: "reconciled"`. Las personas pueden hacer grep del
JSONL directamente, mientras que las herramientas de IA deberían leer este índice antes de abrir el
directorio de una ejecución que coincida.

El `head` se calcula localmente, sin otra llamada al modelo. Con `captureInput: "full"`, es un
adelanto acotado de la afirmación o la pregunta, con los espacios normalizados. Con `metadata`, es
solo la operación más un hash del enunciado. Con `none`, no contiene ningún contenido del enunciado.
Esto evita que el índice sortee la política de persistencia configurada.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs show 1 --include-evidence
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archivar y restaurar son simples renombrados locales, más entradas de índice de solo anexado.
Eliminar es permanente, exige `--yes`, e informa
`recoverable: false`. Los registros en curso no se pueden archivar ni eliminar, para que los
comandos de ciclo de vida no invaliden una escritura final que todavía está en curso. Ninguno de
estos comandos llama a un proveedor.

`runs search <query>` compara con el último resumen archivado vigente, a través del ID de ejecución,
el `head`, la operación, el proveedor/modelo, el adaptador, el estado, el veredicto, el código de
salida/error y las marcas de tiempo. Lee el índice compacto y devuelve los resúmenes de proceso que
coinciden; la evidencia sigue siendo opt-in, a través de `runs show`.
El contrato hermético de historial ejercita el listado y la búsqueda dirigida sobre 1,000 resúmenes
de archivo indexados cuyos registros de ejecución quedan deliberadamente sin abrir.

`captureInput: "full"` guarda el enunciado y el contexto; `metadata` guarda solo conteos de bytes y
hashes; `none` no guarda ninguno de los dos. `captureOutput: "normalized"` guarda el resultado de
Xerify ya parseado, `metadata` guarda el resumen sin secretos, y `none` omite el archivo de
resultado. La salida cruda de transporte del proveedor, las credenciales, los almacenes de
autenticación y los volcados de entorno nunca son campos del historial.

Las reglas de exclusión generadas en la raíz mantienen `.xerify/` fuera de Git, de los paquetes npm
y del contexto de build de Docker. No reemplazan los permisos del sistema de archivos ni la
clasificación de datos. Revise la política de captura antes de enviar o persistir evidencia sensible.
Cambiar las raíces configuradas del historial abre un espacio de numeración distinto. Xerify no
garantiza integridad frente a un proceso del mismo usuario que, de forma concurrente, elimine,
renombre o modifique su árbol privado de historial.
