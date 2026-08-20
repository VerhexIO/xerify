[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# MCP

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Xerify expone su núcleo compartido a través del MCP SDK v2. Los transportes STDIO y Streamable HTTP usan la misma fábrica de servidor, las mismas herramientas, los mismos esquemas de entrada y salida, el mismo registro de proveedores y la misma vía de cancelación.

## Herramientas

| Herramienta           | Efecto                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `xerify_ask`          | Llama a un proveedor configurado para pedir una segunda opinión abierta. Semántica de solo lectura sobre el proyecto, de mundo abierto, no idempotente.      |
| `xerify_verify`       | Llama a un proveedor de invocación distinto y devuelve un veredicto estricto. Semántica de solo lectura sobre el proyecto, de mundo abierto, no idempotente. |
| `xerify_capabilities` | Lista los adaptadores locales y los metadatos de capacidades del protocolo, sin llamar a ningún proveedor. De solo lectura e idempotente.                    |

Las llamadas al proveedor pueden consumir cuota o generar cargos. Los hosts MCP deberían obtener la aprobación del usuario antes de invocar `xerify_ask` o `xerify_verify`.

Quien llama por MCP puede declarar la procedencia del autor, pero no puede autoatestiguar `observed`. La afirmación y el contexto suministrados se tratan como evidencia no confiable; cualquier instrucción embebida en ellos no altera la tarea de verificación. Esto mitiga, pero no elimina, la inyección de prompt a nivel de modelo.

Las llamadas `ask` y `verify` por MCP pasan por el mismo envoltorio de historial local al proyecto
que usan la CLI y la biblioteca. El comportamiento de captura sale de `xverify-config.json`; no se
guarda ningún frame crudo de transporte MCP ni ningún token bearer. La gestión del historial sigue
siendo una superficie local de la CLI (`xerify runs ...`), no una herramienta MCP, así que quien
llama de forma remota no puede archivar ni eliminar los registros del host.

Quien use `createXerifyMcpServer` o `createXerifyMcpFactory` de forma programática debe suministrar
un `RunHistoryStore`. Use un store configurado explícitamente con `enabled: false` cuando la
persistencia esté deshabilitada a propósito; omitirlo no se interpreta silenciosamente como una
operación sin historial.

## STDIO local

Compile Xerify o instálelo globalmente, y luego configure un host con un ejecutable y un arreglo de argumentos:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "xerify",
      "args": ["mcp", "stdio"]
    }
  }
}
```

Sin una instalación global, un host MCP puede resolver directamente el paquete público de npm:

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

Fije una versión exacta y revisada en la configuración duradera del host; use `@latest` solo cuando
las actualizaciones automáticas sean una política deliberada.

No se escribe ningún banner ni diagnóstico en stdout. Los diagnósticos van a stderr, para que el framing de JSON-RPC quede intacto.

La prueba de humo fijada valida el servidor compilado con Inspector `2.2.0` en ambas eras del protocolo:

```sh
npm run smoke:mcp
```

La prueba fija `protocolEra` a `modern` y a `legacy` por separado, y exige que los tres esquemas de herramientas se puedan descubrir. Los clientes modernos negocian `server/discover` y `2026-07-28`; los clientes heredados usan la vía de la era de inicialización.

## Metadatos del Registry oficial

El repositorio de Xerify contiene `server.json`, y el manifiesto de npm contiene el
`mcpName: "io.github.verhexio/xerify"` correspondiente. La entrada del registro identifica a
`xverify-cli` como el paquete de npm, fija la versión de paquete/servidor, declara el transporte
STDIO y suministra los argumentos fijos de `mcp stdio`. Una prueba de contrato impide que esos campos
se desalineen.

El MCP Registry oficial es un canal gratuito de metadatos de descubrimiento, no un host de ejecución
ni un espejo de paquetes. npm debe contener primero la versión exacta de Xerify; solo entonces quien
mantiene el release puede autenticarse y publicar `server.json` con `mcp-publisher`. El Registry es,
por ahora, software en vista previa, así que los clientes deberían conservar una configuración npm
fijada de forma directa como respaldo estable. Consulte la [guía rápida oficial del
Registry](https://modelcontextprotocol.io/registry/quickstart) y las [reglas de paquetes
npm](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx).

## Streamable HTTP

La operación en loopback no necesita ningún token bearer:

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

El endpoint de MCP es `/mcp`. Para un enlace fuera de loopback, ponga un token de alta entropía en una variable de entorno y confirme explícitamente el enlace público:

```sh
XERIFY_MCP_TOKEN='replace-me' xerify mcp http \
  --host 0.0.0.0 \
  --port 8787 \
  --token-env XERIFY_MCP_TOKEN \
  --allow-public
```

El enlace público se rechaza si falta la confirmación o la autenticación. Este límite compara los tokens bearer en tiempo constante, valida los encabezados Host y Origin, traduce la autenticación al contexto tipificado de la solicitud MCP, y nunca incluye el token en la salida del comando ni en los registros de auditoría.

El modo bearer incorporado es adecuado para despliegues controlados. Un servicio multiusuario expuesto a internet, la terminación de TLS, la política de autorización, el ciclo de vida OAuth, la limitación de tasa y la multi-tenencia duradera pertenecen a un límite de despliegue delante de Xerify; el servidor local no los implica.

Para la elección de canal, el comportamiento por suscripción o API, la operación local sin costo, y
la vía remota evaluada de Cloudflare Workers, consulte [proveedores y canales de
acceso](channels.md). Que el hospedaje sea gratuito no hace gratuita la inferencia del proveedor, ni
autoriza la custodia centralizada de credenciales de suscripción locales.
