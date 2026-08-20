[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Proveedores y canales de acceso

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Xerify tiene dos dimensiones independientes: la superficie que recibe la solicitud y el adaptador
que llega hasta el verificador. La CLI, la biblioteca, el MCP por STDIO y el MCP por Streamable HTTP
llaman todos al mismo núcleo; elegir MCP no cambia la identidad del proveedor, la facturación, el
esquema, ni la semántica de código de salida/veredicto.

## Canales de adaptador

| Canal                         | Dueño de la autenticación                                   | Dónde corre                                 | Mejor uso                                                  | Limitación principal                                         |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| Suscripción por CLI de Codex  | login oficial de `codex` o `CODEX_API_KEY`                  | la máquina del usuario                      | destino OpenAI, sin copiar la credencial de la suscripción | exige tener la CLI instalada y autenticada                   |
| Suscripción por CLI de Claude | login oficial de `claude`, token OAuth, o clave de API      | la máquina del usuario                      | destino Anthropic, a través de `claude -p`                 | exige tener la CLI instalada y autenticada                   |
| Suscripción de Cursor         | `agent login` oficial o `CURSOR_API_KEY`                    | la máquina del usuario                      | cualquier ID exacto de modelo que exponga Cursor           | el proveedor es `cursor`; el linaje upstream puede solaparse |
| API directa de OpenAI         | variable de entorno nombrada; con respaldo literal opcional | cualquier entorno de ejecución de confianza | automatización o despliegue en servidor                    | facturación de la API y custodia de secretos                 |
| API directa de Anthropic      | variable de entorno nombrada; con respaldo literal opcional | cualquier entorno de ejecución de confianza | automatización o despliegue en servidor                    | facturación de la API y custodia de secretos                 |
| HTTP compatible con OpenAI    | variable de entorno nombrada opcional, o clave literal      | endpoint local o remoto                     | modelos locales y gateways compatibles                     | la etiqueta de proveedor la controla quien configura         |
| `command` genérico            | lista explícita de entorno permitido                        | la máquina del usuario                      | otro ejecutable verificador local                          | el ejecutable es código de confianza del propietario         |

La ejecución por suscripción se queda en la máquina del usuario. Xerify nunca lee el almacén de
tokens o cookies de una CLI; el ejecutable oficial se encarga de su propio login. Un servicio remoto
de Xerify no puede reutilizar por arte de magia la suscripción local de un usuario: instale el
servidor STDIO localmente, o use un adaptador de API directa con una política explícita de claves
del lado del servidor.

## Ejemplos de la CLI

De un artefacto de OpenAI a una suscripción de Claude:

```sh
git diff --cached | xerify --json verify \
  --from openai:EXACT_AUTHOR_MODEL \
  --to anthropic:EXACT_CLAUDE_MODEL \
  --adapter claude \
  --claim "The patch closes the reported race without regression"
```

De un artefacto de Anthropic a una suscripción de Codex:

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to openai:EXACT_CODEX_MODEL \
  --adapter codex \
  --claim "The patch closes the reported race without regression"
```

De un artefacto de Anthropic a un modelo exacto a través de Cursor:

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to cursor:EXACT_CURSOR_MODEL \
  --adapter cursor \
  --claim "The patch closes the reported race without regression"
```

Las llamadas por API directa usan el mismo comando y producen el mismo tipo de resultado. Lo único
que cambia es `--adapter`, por ejemplo `--adapter openaiApi` o `--adapter anthropicApi`. Los ID de
modelo siempre quedan explícitos.

En esta versión no hay adaptador de suscripción por CLI para Gemini. Un modelo con nombre Gemini
elegido a través de Cursor sigue siendo `cursor:EXACT_MODEL_ID`; un futuro adaptador directo de API
o CLI de Google usaría `google`.

## Superficies MCP

El STDIO local es el canal MCP recomendado, sin costo de hospedaje, y es la única superficie de
herramienta remota que conserva de forma natural las suscripciones locales por CLI:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@latest", "xerify", "mcp", "stdio"]
    }
  }
}
```

Para una instalación con versión fija y revisable en la cadena de suministro, instale una versión
concreta y use su binario resuelto en lugar de `npx -y ...@latest`. `xerify_capabilities` no consume
cuota; `xerify_ask` y `xerify_verify` sí pueden consumirla.

El Streamable HTTP en loopback también es gratuito de operar en la máquina del usuario. El HTTP
expuesto a internet necesita TLS, autenticación, autorización, limitación de tasa, custodia de
secretos y una política de proveedor limitada a API; nunca debe convertirse en un relé de las
credenciales de suscripción locales.

## Distribución gratuita de MCP y hospedaje futuro

La vía de distribución elegida, sin costo de hospedaje, es npm más el MCP Registry oficial. El
Registry guarda metadatos de descubrimiento y arranque, y apunta al paquete público de npm
`xverify-cli`; no aloja el código de Xerify. El `server.json` del repositorio fija la versión del
paquete, el transporte STDIO y los argumentos de arranque de `mcp stdio`. El `mcpName`
correspondiente en el paquete demuestra la asociación entre npm y el Registry. Como el Registry
todavía está en vista previa, una entrada de host fijada con `npx -y --package=xverify-cli@<version>
xerify mcp stdio` sigue siendo el respaldo determinista. Consulte la [guía rápida oficial del
Registry](https://modelcontextprotocol.io/registry/quickstart) y las [reglas de tipos de
paquete](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx).

Este canal de distribución es ejecución local: sin cuenta de hospedaje, sin entrada pública, y sin un
almacén central de credenciales. Si Verhex llegara a necesitar un MCP público respaldado por API,
Cloudflare Workers sigue siendo el destino de evaluación elegido, porque su Agents SDK oficial admite
MCP por Streamable HTTP y el plan gratuito de Workers ofrece un nivel gratuito acotado. Consulte la
[guía oficial de MCP remoto de
Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)
y los [precios de Workers](https://developers.cloudflare.com/workers/platform/pricing/). Esto es un
punto de la hoja de ruta de despliegue, no una afirmación de que el listener actual en Node se pueda
subir tal cual.

Un Worker no puede lanzar la CLI local de Codex, Claude o Cursor del usuario. Por eso, la variante
remota admitiría únicamente adaptadores de API directa, exigiría autorización OAuth con alcance
acotado, fallaría de forma cerrada al llegar a los límites de la plataforma, y mantendría separados
los cargos del proveedor y el costo de hospedaje. No se va a publicar ningún verificador público de
Xerify sin autenticación.
