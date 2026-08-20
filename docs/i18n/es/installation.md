[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Instalación y actualizaciones

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Xerify necesita Node.js 20 o una versión posterior. Node.js 24 es el runtime principal sobre el que
se publica. El paquete público de npm es `xverify-cli`; el producto y el comando de la CLI instalada
siguen llamándose `xerify`.

## Elegir un modo de instalación

Instale Xerify de forma global cuando vaya a ser una herramienta de la máquina, compartida entre
varios proyectos:

```sh
npm install --global xverify-cli@latest
xerify --version
xerify init
```

Instálelo como dependencia de desarrollo del proyecto cuando el repositorio deba fijar la versión de
Xerify:

```sh
npm install --save-dev xverify-cli@latest
npx xerify --version
```

Ejecútelo sin conservar ninguna dependencia, para una verificación rápida de capacidades:

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

Use `xverify-cli@latest`, con el `@` incluido. `npm install xverify-cli latest` le pide a npm que
instale dos paquetes distintos, y no es lo mismo.

Para automatización reproducible, fije una versión exacta en lugar de `latest`:

```sh
npm install --save-dev --save-exact xverify-cli@0.1.0
```

## Inicialización del proyecto

Una instalación directa como dependencia local del proyecto ejecuta un inicializador protegido: crea
`.xerify/` solo en la raíz del proyecto consumidor, nunca sobrescribe una configuración existente,
nunca llama a ningún proveedor, y agrega protección de exclusión para Git, npm y Docker. Las
instalaciones globales, transitivas, sin guardar dependencia o hechas mediante `npx` no inicializan
el directorio actual; ejecute esto de forma explícita:

```sh
xerify init
```

Defina `XERIFY_SKIP_AUTO_INIT=1` antes de instalar cuando no quiera la inicialización automática por
el ciclo de vida de npm. npm no puede distinguir con certeza todos los casos de hoisting directo o
transitivo en una primera instalación, así que las bibliotecas que integran Xerify deberían definir
esa variable e inicializar mediante su propio flujo explícito.

Verifique la configuración resultante sin hacer ninguna llamada a un modelo:

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers probe --all --timeout 5000
```

De forma predeterminada, `providers probe` solo comprueba la disponibilidad local del ejecutable y
de la autenticación. Agregue `--network` cuando además quiera una comprobación acotada de alcance
del endpoint.

## Actualizaciones y desinstalación

Actualice usando el mismo modo de instalación:

```sh
npm update --global xverify-cli
# o, dentro de un proyecto con versión fijada
npm install --save-dev xverify-cli@latest
```

Eliminar el paquete de npm no borra el historial ni la configuración del proyecto. Revise y elimine
`.xerify/` por separado, y solo cuando ya no necesite su historial de ejecuciones, el archivo, la
configuración y los metadatos de auditoría.

## Instalación de MCP

El servidor MCP local por STDIO usa el mismo paquete; no existe una segunda descarga de servidor:

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

Fije la versión del paquete para que la configuración del host quede revisable en la cadena de
suministro. La entrada del MCP Registry es solo información de descubrimiento que apunta a este
mismo paquete de npm; no aloja otro servicio de Xerify ni reutiliza credenciales de proveedor de
forma remota. Consulte [MCP](mcp.md) para la configuración por STDIO y por HTTP.

## Contenido del paquete

El artefacto de npm contiene la salida compilada del runtime y las bibliotecas, los esquemas
públicos, la documentación de usuario, la skill de agente que lo acompaña, el inicializador
protegido y los avisos de licencia y seguridad. Deliberadamente deja fuera las pruebas del código
fuente, las herramientas de lanzamiento, el estado local de `.xerify/`, los archivos internos de
agentes y orquestación, los espacios de trabajo de diseño, los artefactos de lanzamiento generados y
el material de revisión de marca.

Xerify está creado y desarrollado por Verhex, y se distribuye bajo la licencia MIT. El repositorio
de origen y el rastreador de incidencias canónicos están enlazados desde los metadatos del paquete.
