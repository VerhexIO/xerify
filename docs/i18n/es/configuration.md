[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Puesta en marcha y configuración del proyecto

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Xerify mantiene el estado propio de cada proyecto fuera de la raíz del repositorio. Al instalar
Xerify como dependencia local directa, este se inicializa automáticamente sin sobrescribir archivos
existentes:

```sh
npm install --save-dev xverify-cli@latest
```

Las instalaciones globales, las transitivas anidadas, las que no guardan dependencia, las hechas con
`npx` y las que definen `XERIFY_SKIP_AUTO_INIT=1` no escriben nada en el proyecto actual. En esos
casos, inicialice de forma explícita:

```sh
npx --yes --package=xverify-cli@latest xerify init
```

El comando es idempotente y nunca sobrescribe una configuración o un `.gitignore` existentes:

```text
.xerify/
├── .gitignore
├── xverify-config.json
├── logs/
│   └── audit.jsonl   # created on the first logged command
├── runs/             # active records plus one monotonic HEAD.json
└── archive/          # archived records plus searchable index.jsonl
```

npm no expone una señal categórica de instalación directa o transitiva antes del primer ciclo de
vida de la dependencia. Por eso Xerify acepta una declaración existente en el manifiesto o el lock
de la raíz, o bien la combinación de una marca explícita de guardado junto con la ubicación exacta
`node_modules/xverify-cli` en la raíz. Un gestor de paquetes podría elevar (hoist) una dependencia
transitiva de Xerify hasta esa ubicación; el inicializador sigue sin sobrescribir nada y queda
ignorado por Git, pero los autores de bibliotecas que integren Xerify deberían definir
`XERIFY_SKIP_AUTO_INIT=1`.

El nombre canónico del archivo del proyecto es `.xerify/xverify-config.json`. El `.gitignore`
generado deja fuera de Git tanto los registros de tiempo de ejecución como el archivo de
configuración, que puede contener tokens. Quienes mantengan su configuración estrictamente libre de
secretos pueden forzar su inclusión de forma deliberada, pero deben revisarlo de nuevo antes de cada
commit. Un `logPath` relativo del proyecto se resuelve a partir de la raíz de proyecto detectada, no
desde la ubicación de instalación del paquete. Los comandos iniciados en un subdirectorio buscan en
los directorios superiores la configuración canónica de proyecto más cercana; una ruta de log
relativa configurada en el proyecto queda anclada a esa raíz de proyecto.

## Configuración básica

`xerify init` también agrega `.xerify/` de forma idempotente al `.gitignore`, al `.npmignore` y al
`.dockerignore` de la raíz. Añade una pequeña entrada marcada y nunca reemplaza reglas de exclusión
existentes.

`xerify init` genera un archivo inicial válido:

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {},
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

Las rutas del historial se resuelven a partir de la raíz de proyecto detectada. `captureInput`
acepta `full`, `metadata` o `none`; `captureOutput` acepta `normalized`, `metadata` o `none`. Los
valores predeterminados son transparentes a propósito, para que la operación local se entienda con
solo mirarla. Use los modos solo-metadatos antes de manejar datos de clientes, código fuente
propietario o cualquier otro material que no deba persistir. Las rutas activa y de archivo deben ser
disjuntas: no pueden ser iguales ni estar anidadas una dentro de la otra. Cambiar cualquiera de las
dos rutas abre un espacio de numeración distinto. Consulte [el historial de ejecuciones
local](run-history.md) para ver los archivos exactos y los comandos de su ciclo de vida.

Si `providers` queda vacío, se conservan los adaptadores integrados `codex` y `claude`. Agregue solo
los transportes que realmente use. Por ejemplo:

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
      "apiKeyEnvironment": "OPENAI_API_KEY",
      "apiKey": "optional-literal-fallback"
    },
    "anthropicApi": {
      "kind": "anthropic-api",
      "apiKeyEnvironment": "ANTHROPIC_API_KEY",
      "maxTokens": 4096
    }
  },
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

`$schema` es solo una pista para el editor; Xerify no la descarga ni la ejecuta. En una instalación
local del proyecto, puede reemplazarla por
`../node_modules/xverify-cli/schemas/config.schema.json` para tener autocompletado sin conexión.

La configuración es estricta. Se rechazan los campos genéricos `token`, `secret`, `defaultModel`
silencioso y cualquier campo de credenciales en los adaptadores `command` o de CLI. Los adaptadores
directos `openai-api`, `anthropic-api` y `openai-compatible` sí aceptan el campo opcional exacto
`apiKey`.

El orden recomendado es:

1. Use la variable de entorno nombrada (`apiKeyEnvironment`).
2. Use la autenticación gestionada por la propia CLI oficial para los adaptadores de suscripción.
3. Use `apiKey` literal solo en una instalación local de un único usuario, donde gestionar variables
   de entorno resulte poco práctico.

Cuando están presentes ambas, gana la variable de entorno. Las claves de API literales y los valores
completos de `endpoint` de proveedor se muestran como `[REDACTED]` en `config show` y en `config
validate`; el enmascarado parcial de URLs se evita a propósito, porque las credenciales pueden
aparecer en la información de usuario, en la ruta, en claves de query arbitrarias o en el fragmento.
`health`, `doctor`, los errores, los prompts y los registros de auditoría nunca exponen estos
valores. En POSIX, una configuración que contenga `apiKey` o un endpoint de proveedor configurado
explícitamente se rechaza a menos que sus permisos sean exclusivos del propietario (`chmod 600
.xerify/xverify-config.json`). El inicializador crea el archivo con ese modo. Que un adaptador tenga
un endpoint predeterminado incorporado no basta, por sí solo, para volver privado un archivo que por
lo demás está libre de secretos. En Windows, proteja el archivo con una ACL exclusiva del
propietario. Nunca haga commit de este archivo, ni lo pegue en un mensaje de soporte, ni lo envíe
como evidencia de verificación.

## Resolución y variables de entorno

El orden de precedencia es: marca de la CLI, variable de entorno de Xerify, configuración del
proyecto, configuración de usuario y, por último, el valor predeterminado del adaptador. La
configuración de usuario usa el mismo nombre de archivo, `xverify-config.json`:

| Sistema | Ruta de la configuración de usuario                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Linux   | `$XDG_CONFIG_HOME/xerify/xverify-config.json`; si no está definida, `~/.config/xerify/xverify-config.json` |
| macOS   | `~/Library/Application Support/Xerify/xverify-config.json`                                                 |
| Windows | `%APPDATA%\Xerify\xverify-config.json`                                                                     |

`XERIFY_USER_CONFIG_PATH` selecciona un archivo de configuración de usuario dedicado, para
automatización hermética. Los límites de runtime pueden sobrescribirse con `XERIFY_TIMEOUT_MS`,
`XERIFY_MAX_INPUT_BYTES` y `XERIFY_MAX_OUTPUT_BYTES`. Una marca `--timeout` o `--log` de la CLI
tiene la precedencia más alta.

Las variables de proveedor/autenticación se reenvían solo al adaptador correspondiente:

| Adaptador          | Entorno de autenticación/configuración aceptado                                             |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Codex CLI          | `CODEX_HOME`, `CODEX_API_KEY`; también se admite el login normal de la CLI                  |
| Claude CLI         | `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`; también se admite el login normal de la CLI |
| Cursor Agent       | `CURSOR_API_KEY`, `CURSOR_API_ENDPOINT`; también se admite el `agent login` normal          |
| OpenAI API         | primero la variable de entorno nombrada; con `apiKey` literal opcional como respaldo        |
| Anthropic API      | primero la variable de entorno nombrada; con `apiKey` literal opcional como respaldo        |
| `command` genérico | solo los nombres listados en `authEnvironment`                                              |

Se reenvían los elementos esenciales de la plataforma, como `PATH`, las ubicaciones de home/config,
las variables de directorio temporal y el locale, para que las CLI oficiales puedan encontrar sus
propios almacenes seguros de credenciales. El resto del entorno del proceso padre no se copia a
ciegas.

A propósito no existe ninguna variable de entorno para elegir el modelo. Toda solicitud real lleva
un `--to provider:model` exacto; la procedencia del origen usa un `--from provider:model` igual de
exacto. Para encontrar los ID de modelo, use el propio comando de descubrimiento del proveedor que
no consume cuota, como `agent models`, y nunca adivine un alias.

## Estado y descubrimiento de proveedores

Use primero la vista agregada de disponibilidad que no consume cuota:

```sh
xerify --json health
xerify --json health --network
```

`health` informa `ready`, `degraded` o `setup-required`, si el proyecto actual está inicializado, y
cada adaptador configurado o vinculado junto con la identidad del proveedor de invocación. También
informa las rutas resueltas del historial y la política de captura, sin leer el contenido de la
evidencia. Por defecto no llama a ningún modelo ni sondea endpoints de API. `--network` agrega
comprobaciones acotadas de alcance del endpoint; aun así, no hace ninguna solicitud de inferencia.
Use `doctor` para detalles de runtime/MCP y `providers probe` para revisar un adaptador puntual.

Para `openai-compatible`, solo se informa como `local` / `not-required` un endpoint de loopback
simple, sin configuración explícita de clave, sin información de usuario, sin parámetros de query y
sin fragmento. Cualquier material embebido en la URL se informa como autenticación `unknown` con
procedencia de configuración, incluso en loopback. Un endpoint remoto sin `apiKeyEnvironment` ni
`apiKey` también queda como `unknown`; Xerify no infiere a partir de una URL si un gateway es
público, si usa credenciales incluidas en la URL, o si aplica otro esquema de autenticación. Prefiera
una variable de entorno de clave nombrada antes que poner material de credenciales en la URL de un
endpoint.

## Contrato del registro de auditoría

El registro de auditoría en JSONL guarda la marca de tiempo, el comando, el código de salida, la
procedencia de proveedor/modelo, el veredicto, la duración, el uso informado por el proveedor, el
truncamiento y la categoría tipificada del fallo. Deliberadamente omite los prompts, las
afirmaciones, el contexto, las respuestas, los findings, las respuestas crudas del proveedor, los
datos de autorización y las rutas de credenciales. En POSIX, los archivos nuevos se crean en modo
`0600`; se rechazan symlinks y cualquier destino que no sea un archivo regular. Los registros son
metadatos operativos: no son una transcripción ni una prueba de que el veredicto sea correcto.
