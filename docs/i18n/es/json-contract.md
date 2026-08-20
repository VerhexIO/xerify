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

### `providerMessage`

Una `failure` tipificada puede llevar un `providerMessage` opcional. El propio `message` de Xerify
es una frase fija por cada código de fallo, y es el campo sobre el que debe bifurcar su lógica
quien llama; `providerMessage` son las propias palabras del proveedor sobre ese mismo fallo, y es
lo que debe leer una persona. Sin él, una CLI desactualizada, un inicio de sesión caducado y un
modelo rechazado informan todos `Provider process exited unsuccessfully`, que no nombra ninguna
causa.

El campo transporta la salida del proveedor, así que se trata como no confiable y pasa por un
pipeline fijo antes de llegar a un resultado:

- a lo sumo una línea de error indicada explícitamente, o las últimas cuatro líneas unidas con
  `|` cuando la salida no indica ninguna; cada línea se redacta por separado antes de unirse;
- se eliminan por completo las secuencias OSC y CSI, payload incluido, tanto en su forma de 7 bits
  (`ESC ]`, `ESC [`) como en la de 8 bits (U+009D, U+009B), ya que una terminal que acepta
  controles de 8 bits lee U+009B exactamente igual que lee `ESC [`. Todo carácter de control
  restante, salvo el tabulador y el salto de línea, se reemplaza por un espacio: por igual C0, DEL
  y el rango C1, incluido el retorno de carro. Cualquier otra secuencia de escape pierde su
  introductor del mismo modo y conserva solo una cola imprimible, que no lleva ninguna función de
  control;
- los encabezados `Authorization`, `Proxy-Authorization`, `Cookie` y `Set-Cookie` se reemplazan por
  completo —el nombre y el resto de la línea juntos—, porque ese tipo de encabezado puede llevar
  varios valores y quitar solo el primero dejaría el resto sin cubrir;
- los tokens `Bearer`, los JWT, la información de usuario en la URL, los prefijos conocidos de
  claves de proveedor y cualquier par `label: value` cuya etiqueta contenga `key`, `token`,
  `secret`, `password` o `credential` se reemplazan por `[REDACTED]`;
- cualquier secuencia ininterrumpida restante de 24 o más caracteres alfanuméricos que mezcle
  letras y dígitos se reemplaza por `[REDACTED]`, lo cual cubre una credencial cuyo emisor no esté
  en la lista de prefijos. Los identificadores que vale la pena leer sobreviven a esta regla porque
  se dividen en segmentos cortos: la secuencia ininterrumpida más larga en
  `claude-opus-4-5-20251101` es de ocho caracteres;
- nunca supera los 501 caracteres: un mensaje que excedería ese límite se recorta a 500 caracteres
  y se le añade un único `…` final;
- se omite por completo, en vez de enviarse vacío, cuando el proveedor no dijo nada aprovechable.

Lo que sobrevive es una cita acotada, no un campo interpretado: no tiene más esquema que `string`,
su redacción es la del proveedor y cambia cuando cambia el proveedor, y puede contener rutas del
sistema de archivos que el proveedor decidió imprimir. No bifurque su lógica en función de él.

La redacción es defensa en profundidad sobre el texto escrito por el proveedor, no una prueba. Las
reglas anteriores son las que se aplican; no puede demostrarse que ningún conjunto finito de reglas
cubra cualquier credencial que un proveedor llegue a inventar, y la última regla existe porque, de
forma demostrable, una lista de prefijos no bastaba. Trate `providerMessage` como la cadena menos
confiable del resultado, y no la reenvíe a ningún lugar donde un secreto resultaría inaceptable.

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
- Xerify nunca coloca valores secretos, encabezados de autorización crudos, fragmentos de token, rutas de credenciales, el prompt/contexto, el texto de la respuesta ni los findings en los errores tipificados ni en los registros de auditoría.
- El único campo que lleva texto escrito por el proveedor hacia un error tipificado es `providerMessage`, que se redacta y se acota tal como se describe en [Resultados de verificación](#providermessage). Ahí puede aparecer una ruta que el propio proveedor haya impreso; las credenciales se redactan según las reglas descritas allí, que son defensa en profundidad y no una garantía.
