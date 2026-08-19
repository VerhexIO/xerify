<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.tr.md">Türkçe</a> ·
  <a href="README.de.md">Deutsch</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <strong>Español</strong> ·
  <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/VerhexIO/xerify/main/assets/logos/full-horizontal/xerify-horizontal-light.svg" alt="Xerify" width="360">
</p>

<p align="center"><strong>Pregunta a otro proveedor. Obtén una segunda opinión clara.</strong></p>

Xerify es una herramienta de código abierto, orientada al shell, para preguntas y verificaciones
acotadas entre proveedores. Puede usar las CLI oficiales ya autenticadas en tu equipo, APIs directas
o un ejecutable configurado explícitamente. La CLI, la biblioteca JavaScript/TypeScript, el MCP STDIO
local y el MCP Streamable HTTP comparten el mismo núcleo y los mismos esquemas.

Xerify es creado y desarrollado por **Verhex**, con contribuciones de la comunidad, y se distribuye
bajo la licencia MIT. El resultado es una segunda opinión, no una prueba formal, una certificación de
seguridad ni una garantía de verdad. La salida del proveedor es un dato no confiable y nunca se
ejecuta.

> **Estado de publicación:** `0.1.0` es un candidato de lanzamiento. El paquete npm es
> `xverify-cli`; el producto y el comando instalado siguen llamándose `xerify`.

## Instalación

Después de la primera publicación pública en npm:

```sh
npm install --global xverify-cli@latest
xerify --version
xerify --json health
xerify init
```

Como dependencia de desarrollo fijada:

```sh
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version
```

Sin conservar una dependencia:

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

Se requiere Node.js 20 o posterior; Node.js 24 es la vía principal de publicación. Consulta la
[guía completa en español](docs/i18n/es/README.md) y la
[instalación canónica](docs/installation.md).

## Inicio rápido

Solicita una segunda opinión abierta; la entrada por pipe se convierte en contexto acotado:

```sh
git diff --cached | xerify ask \
  --to anthropic:MODEL_ID \
  --question "¿Cuál es el riesgo más importante de este cambio?"
```

Intenta refutar una afirmación concreta mediante otro proveedor de invocación:

```sh
git diff --cached | xerify --json verify \
  --from openai:AUTHOR_MODEL \
  --to anthropic:VERIFIER_MODEL \
  --claim "Este cambio corrige la condición de carrera sin introducir una regresión"
```

`--from` y `--to` identifican el servicio de invocación, facturación y control. Un modelo elegido a
través de Cursor Agent siempre es `cursor`, aunque su ID mencione GPT, Claude, Gemini o Grok. Codex o
OpenAI directos son `openai`; Claude o Anthropic directos son `anthropic`. La verificación con el
mismo proveedor se rechaza antes de llamar al modelo.

Esta separación mide diversidad de canales, no independencia de pesos, datos de entrenamiento o
puntos ciegos del modelo.

## Resultados

| Resultado   | Exit | Acción del consumidor                                        |
| ----------- | ---: | ------------------------------------------------------------ |
| `confirmed` |    0 | candidato para continuar; no se halló contraejemplo material |
| `refuted`   |   10 | bloquear la afirmación                                       |
| `unclear`   |   11 | aportar evidencia, reintentar o revisar manualmente          |

Timeouts, fallos del proveedor, esquemas inválidos y truncamiento permanecen fail-closed con códigos
no cero tipados. `unclear` nunca se convierte en éxito.

## Diagnóstico sin inferencia

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
xerify --json config validate
```

Estos comandos no llaman a un modelo. `--network` solo añade comprobaciones acotadas de
conectividad. Las llamadas reales `ask` y `verify` pueden consumir cuota o generar costes de API.

## Estado local y MCP

`xerify init` crea `.xerify/` sin sobrescribir y lo protege en los archivos ignore de Git, npm y
Docker. Los registros activos están en `runs/`, los archivados en `archive/`, y
`archive/index.jsonl` es el catálogo compacto para humanos y herramientas de AI.

MCP STDIO local con versión fija:

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

El servidor expone `xerify_ask`, `xerify_verify` y `xerify_capabilities`. HTTP escucha por defecto
en `127.0.0.1`; un bind fuera de loopback exige `--allow-public` y un bearer token desde una variable
de entorno con nombre.

## Documentación

- [Guía completa en español](docs/i18n/es/README.md)
- [Índice en seis idiomas](docs/README.md)
- [Ejemplos de verificación observados](docs/examples/README.md)
- [Política de seguridad](SECURITY.md)
- [Licencia MIT](LICENSE)

Si una traducción contradice el contrato, prevalecen los esquemas y documentos canónicos en inglés.
