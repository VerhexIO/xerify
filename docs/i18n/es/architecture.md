[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Arquitectura

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Esta guía, los registros aceptados en `docs/decisions/`, los esquemas públicos y sus contratos ya
probados son la autoridad viva de Xerify sobre producto y arquitectura. Que un comportamiento
aparezca en una nota interna no lo vuelve público; la documentación debe coincidir con la ruta
implementada y probada.

Xerify es un único paquete ESM con cuatro superficies públicas —CLI, biblioteca, MCP por STDIO y MCP
por Streamable HTTP— sobre una sola ruta de ejecución central.

```text
CLI ─┐
MCP ─┼──> core contracts + execution ──> provider SPI ──> adapters
SDK ─┘                    │                    │
                         └── typed results    └── process/platform or bounded HTTP
```

## Límites de los módulos

- `src/core` es dueño de las solicitudes/resultados públicos, los prompts, la exigencia de proveedores distintos, el parseo del veredicto, los tipos de error, los límites y la proyección de auditoría.
- `src/providers` implementa un contrato de adaptador neutral y los adaptadores integrados de CLI/API/`command`. No importa nada del renderizado de la CLI.
- `src/process` y `src/platform` son dueños de la resolución de ejecutables, la lista blanca de entorno, los flujos acotados, el tiempo de espera/cancelación y la terminación del árbol de procesos.
- `src/config` parsea el JSON estricto de `.xerify/xverify-config.json`, registra la fuente de cada
  campo resuelto, redacta las claves de API literales opcionales, e inicializa el estado privado del
  proyecto y los metadatos de log sin sobrescribir archivos existentes.
- `src/history` registra las ejecuciones activas directamente, asigna identidades monótonas a través
  de un único `HEAD.json` atómico, y mantiene un índice de archivo de solo anexado, seguro según la
  política de captura, para que personas y agentes lo busquen.
- `src/cli` traduce los comandos hacia el núcleo y renderiza salida legible para personas, o un único sobre JSON estable.
- `src/mcp` registra los mismos esquemas Zod y las mismas funciones del núcleo con el MCP SDK v2. La autenticación de HTTP se queda en el límite del transporte.

La raíz del paquete exporta el núcleo, la configuración, los adaptadores y las fábricas MCP para uso programático. El código de producción nunca importa fixtures de prueba.

## Flujo de una solicitud

1. La validación estricta de entrada, ya sea por CLI, biblioteca o MCP, establece la identidad de proveedor/modelo y los límites de bytes/tiempo. Quien llama públicamente no puede autoatestiguar `observed`; la identidad del destino debe ser `declared`.
2. La verificación rechaza la procedencia `unknown` y las identidades iguales de proveedor de invocación, antes de resolver el adaptador.
3. El registro elige el ID de adaptador explícito cuando se suministra, y si no, un adaptador configurado para la identidad de proveedor del destino.
4. El adaptador invoca un ejecutable con `shell: false`, o hace una solicitud HTTP acotada. El prompt y el contexto nunca entran como argumentos de shell.
5. La salida del proveedor se acota en bytes y se normaliza. Un esquema estructurado compatible con el proveedor se deriva de las definiciones canónicas de campos en Zod; la validación del núcleo aplica después todos los límites completos.
6. El núcleo devuelve un `AskResult`, o un `VerifyResult` completo; los fallos posteriores a la admisión del proveedor se convierten en un resultado `unclear` honesto, con una `failure` tipificada y un código de salida específico de la causa.
7. El registro opcional de auditoría en JSONL proyecta solo metadatos. El prompt, el contexto, la respuesta, los findings, la respuesta cruda, los encabezados y los valores secretos quedan excluidos.

## Límites de confianza

La afirmación, el contexto y la salida del proveedor son no confiables. Al verificador se le indica
que trate el material suministrado como evidencia, que intente refutarlo, y que ignore cualquier
comando embebido, cambio de rol, instrucción de veredicto o cambio de esquema. Esto mitiga la
integridad de la evaluación; no es una garantía contra la inyección de prompt. Xerify nunca evalúa la
salida del proveedor como un comando, un archivo fuente, una instrucción MCP o una configuración. Las
claves de API directas se resuelven primero desde una variable de entorno nombrada, y en segundo
lugar desde un respaldo literal configurado explícitamente; los diagnósticos nunca exponen ninguna de
las dos. Los almacenes de autenticación de las CLI oficiales solo se acceden a través del ejecutable
oficial; Xerify no los parsea ni los copia.

Los adaptadores de Codex y Claude fijan en el código las identidades de proveedor de invocación
`openai` y `anthropic`. Cursor fija `cursor`, sin importar qué modelo upstream indique su ID exacto
de modelo; `auto` se rechaza porque no puede preservar la procedencia del modelo. Las etiquetas
`command` y `openai-compatible` son declaraciones controladas por quien las configura, no una
atestación remota; su garantía de proveedores distintos es tan sólida como lo sea esa configuración.

La separación de proveedores mide diversidad del plano de invocación, facturación y control. No
demuestra que dos canales usen distintos fabricantes de modelo, pesos, datos de entrenamiento o
puntos ciegos. OpenAI directo y un modelo GPT servido a través de Cursor son proveedores de
invocación distintos, pero pueden compartir el mismo linaje de modelo.

Los adaptadores oficiales por comando se ejecutan desde espacios de trabajo temporales nuevos y
restrictivos, en lugar del repositorio del usuario. Codex ignora las reglas/configuración de usuario
y es de solo lectura; Claude desactiva las personalizaciones, las herramientas, los comandos de barra
y la persistencia; Cursor usa el modo ask de solo lectura, más su sandbox. Que Cursor carezca de una
marca categórica para desactivar MCP a nivel de cuenta queda documentado como un riesgo residual.

En STDIO, stdout queda reservado para los frames de MCP. Streamable HTTP usa loopback por defecto y
valida los encabezados Host y Origin. El enlace público exige una marca explícita y autenticación
bearer.

## Compatibilidad

- Runtime mínimo: Node.js 20; runtime principal de desarrollo: Node.js 24.
- Versión del esquema público: `1`.
- Versión mayor del MCP SDK: `2`; revisión moderna del protocolo: `2026-07-28`; los clientes heredados se siguen atendiendo.
- Los campos públicos existentes no se pueden eliminar ni reinterpretar sin un release incompatible. Se permiten campos opcionales aditivos.

La decisión sobre los resultados de comando, y su justificación, están registradas en
[ADR 0001](../../decisions/0001-command-outcomes.md). La identidad de proveedor de invocación queda fijada
por [ADR 0002](../../decisions/0002-invocation-provider-identity.md).
