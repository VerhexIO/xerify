[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Límites de compatibilidad y soporte

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Xerify admite Node.js 20 y 24 en Ubuntu, macOS y Windows, a través de la matriz pública de CI.
Node.js 24 es la línea principal de publicación. WSL usa la misma ruta de runtime que Linux, pero
la autenticación de proveedor y el comportamiento de procesos específicos del host deben comprobarse
con `xerify health` en la máquina real. La verificación completa, la prueba de humo de instalación
limpia y la auditoría de release también pasan en WSL2 con Node.js 24; esto se verificó en la
máquina de un mantenedor, y no mediante la matriz pública de CI.

## Superficies admitidas

| Superficie            | Contrato                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------- |
| CLI                   | Salida legible para personas, más sobres `--json` estables y códigos de salida documentados |
| JavaScript/TypeScript | Exportaciones ESM del paquete con declaraciones incluidas                                   |
| MCP STDIO             | Servidor local, con negociación de protocolo moderna y heredada                             |
| MCP Streamable HTTP   | Loopback por defecto; opt-in explícito y autenticado para un enlace fuera de loopback       |

La versión pública de JSON/esquema es `1`. En releases compatibles pueden aparecer campos opcionales
aditivos; eliminar o reinterpretar un campo público existente exige un release incompatible.

## Canales de proveedor

Los adaptadores integrados cubren Codex CLI, Claude CLI, Cursor Agent, OpenAI API, Anthropic API,
HTTP compatible con OpenAI, y un `command` configurado explícitamente. La disponibilidad depende del
canal elegido, el ejecutable instalado, la cuenta, el ID exacto de modelo, la autenticación, la
región y la política del proveedor. Xerify no promete que un modelo visible para una cuenta también
exista para otra.

Ejecute estas comprobaciones que no consumen cuota en el entorno de consumo:

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

Los sondeos de proveedor establecen disponibilidad de transporte local, no calidad ni veracidad del
modelo. Una llamada real exitosa solo demuestra la ruta exacta de adaptador/proveedor/modelo usada
en esa solicitud. El texto que devuelve el proveedor no es determinista byte a byte, así que lo que
Xerify garantiza es el esquema, los límites, los resultados fail-closed y los errores tipificados —
no una redacción idéntica.

## Límite del resultado

`confirmed` significa que no se encontró ningún contraejemplo relevante dentro de la evidencia
suministrada. No es una verificación formal, ni una certificación de seguridad, ni un permiso
automático para fusionar o ejecutar un cambio. `refuted` bloquea la afirmación; `unclear`, un tiempo
de espera agotado, un truncamiento, una salida inválida y un fallo del proveedor siguen sin ser un
caso de éxito, y exigen reintentar, aportar evidencia más sólida, o una revisión humana.

Las comprobaciones normales del paquete y de CI no requieren credenciales de proveedor ni llaman a
ningún modelo. Las pruebas reales contra el proveedor siempre son explícitas, y pueden consumir
cuota de la suscripción o generar cargos de API.

Para restricciones específicas de cada adaptador, consulte [adaptadores de
proveedor](provider-adapters.md). Para los límites de datos y de prompt, consulte
[SECURITY.md](security.md).
