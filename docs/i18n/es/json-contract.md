[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Contrato de JSON y códigos de salida

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Pase la marca global `--json` antes o después del subcomando. Xerify escribe en stdout exactamente un objeto JSON compacto, seguido de un salto de línea, y nada de decoración de terminal.

Éxito:

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

Error previo a la invocación, o error de comando:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "command": "verify",
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Provider executable is unavailable",
    "retryable": false,
    "details": {}
  }
}
```

Los datos de `ask` y `verify` usan los mismos esquemas que sus herramientas MCP. Los artefactos publicados en Draft 2020-12 viven en `schemas/` y se generan a partir de los esquemas Zod del runtime.

`provider` designa el servicio de invocación, facturación y control. Cursor Agent es `cursor` para
cualquier ID exacto de modelo; el Codex/OpenAI directo es `openai`; el Claude/Anthropic directo es
`anthropic`. Esta base de identidad mide diversidad de canal, no independencia del modelo upstream.
`health` y las capacidades de MCP informan explícitamente `identityBasis: "invocation-provider"`.

Un payload exitoso del verificador puede sumar `evidence`, `assumptions`, `limitations` y `unverifiedClaims`. Estos campos son opcionales, por compatibilidad. Los adaptadores de proveedor estructurados piden los cuatro campos; los adaptadores `command` con payloads más antiguos se siguen aceptando. Las entradas de `evidence` son referencias acotadas, informadas por el verificador, dentro del contexto suministrado — no son citas validadas de forma independiente.

## Resultados de verificación

`confirmed`, `refuted`, y un `unclear` genuino son resultados de verificación completos. Una vez que arranca el ciclo de vida del proveedor, un tiempo de espera agotado, una cancelación, un fallo del proveedor, una salida estructurada inválida, o cualquier truncamiento de entrada/salida de la verificación, también devuelven un `VerifyResult` completo con `verdict: "unclear"` y una `failure` tipificada. La evidencia truncada nunca puede producir `confirmed`. El código de salida del proceso conserva la causa de más bajo nivel.

Esto significa que quien llama debe parsear stdout incluso cuando el código de salida no sea cero.

| Salida | Significado                                                                   |
| -----: | ----------------------------------------------------------------------------- |
|    `0` | El comando terminó bien; `ask` respondió, o la verificación se confirmó       |
|    `2` | Entrada/configuración inválida, mismo proveedor, o procedencia no demostrable |
|    `3` | Ejecutable, endpoint o autenticación del proveedor no disponibles             |
|    `4` | Tiempo de espera agotado o cancelación                                        |
|    `5` | Fallo de transporte del proveedor, del proceso o de la API                    |
|    `6` | Respuesta del proveedor inválida, incompleta, o que no cumple el esquema      |
|   `10` | La verificación fue refutada                                                  |
|   `11` | Verificación `unclear` sin un fallo de más bajo nivel                         |

Un descubrimiento con cero coincidencias es un caso exitoso. Los valores de uso ausentes quedan en `null`; Xerify no estima el conteo de tokens ni el costo. El truncamiento de entrada/salida queda explícito en los metadatos del resultado.

## Política de compatibilidad

- Cada sobre público y cada resultado llevan `schemaVersion: 1`.
- Eliminar o reinterpretar un campo existente es un cambio incompatible.
- Un campo opcional nuevo puede agregarse de forma aditiva.
- Los esquemas estrictos rechazan cualquier campo de entrada/configuración desconocido.
- Los esquemas públicos de solicitud aceptan procedencia de autor `declared` o `unknown`, y exigen un destino `declared`. Rechazan un `observed` provisto por quien llama; con autor `unknown`, la solicitud falla la regla de admisión de proveedores distintos.
- Los valores secretos, los encabezados de autorización crudos, los fragmentos de token, las rutas de credenciales, el prompt/contexto, el texto de la respuesta y los findings nunca entran en los errores tipificados ni en los registros de auditoría.
