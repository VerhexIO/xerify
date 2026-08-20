[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Dogfood: Xerify verifica su propio adaptador de Cursor

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Xerify revisando una afirmación sobre su propio código fuente. Lo interesante no es el veredicto —
es que los dos primeros intentos nunca llegaron a producir uno.

- Declaración de autor: `anthropic:claude-opus-5`
- Verificador: `openai:gpt-5.6-sol`, a través del adaptador `codex`
- Evidencia: [dogfood-cursor-adapter.md](../../../examples/evidence/dogfood-cursor-adapter.md)
- Observado el 2026-08-20: `confirmed`, código de salida `0`

## Afirmación

> CursorAdapter informa el proveedor cursor sin inferencia por prefijo de modelo, y rechaza el
> modelo auto antes de iniciar el proceso de Cursor.

## Reproducir

```sh
cat docs/examples/evidence/dogfood-cursor-adapter.md | xerify --json --timeout 300000 verify \
  --adapter codex \
  --from anthropic:claude-opus-5 \
  --to openai:gpt-5.6-sol \
  --claim "CursorAdapter reports provider cursor without model-prefix inference and rejects model auto before starting the Cursor process." \
  --context-label docs/examples/evidence/dogfood-cursor-adapter.md
```

## Resultado normalizado observado

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The supplied snippets adequately support the bounded claim: provider identity is returned explicitly as \"cursor\", and the exact \"auto\" model is rejected before temporary-workspace creation or the documented process-invocation point. No material counterexample appears within the supplied evidence.",
  "materialFindings": [
    "[low] The model normalization is narrower than it may appear: values such as \"auto [suffix]\" leave trailing whitespace before comparison and may bypass the gate. This does not contradict rejection of the exact tested value \"auto\", but it could be a regression path if annotated model strings are valid inputs.",
    "[info] The process-prevention test indirectly demonstrates non-execution because the configured executable cannot resolve, while the source ordering directly places validation before workspace and process creation."
  ]
}
```

## Por qué este veredicto

Aquí `confirmed` significa algo acotado, y vale la pena decirlo con precisión: _dentro de los
extractos suministrados_, no se encontró ningún contraejemplo a la afirmación acotada. No es una
auditoría del adaptador, ni es una prueba.

Lo valioso aquí es el finding `low`, que nadie pidió. El verificador notó que la normalización del
modelo separa por `[` y recorta espacios, así que un valor como `auto [something]` podría no
normalizarse a la cadena exacta contra la que compara la condición de bloqueo. Es una vía de
regresión hipotética, no un error presente — pero es exactamente el tipo de observación que una
segunda opinión existe para sacar a la luz.

Lea `confirmed` como _"no se encontró ningún contraejemplo en lo que usted envió"_, nunca como
_"correcto"_.

## Qué lo cambiaría

- **Hacia `refuted`:** una ruta en el código fuente donde `CursorAdapter` derive su identidad de
  proveedor a partir del ID de modelo, o donde el rechazo de `auto` corra después de lanzar el
  proceso.
- **Hacia `unclear`:** suministrar solo descripciones en texto libre del adaptador, en lugar de
  extractos del código fuente original. Durante la preparación, un intento de dogfood basado solo en
  texto libre devolvió `unclear` exactamente por esta razón — Xerify no convierte una descripción
  arquitectónica verosímil en una prueba.

## Una nota sobre la elección del verificador

Esta afirmación es sobre el adaptador de Cursor, así que verificarla _a través de_ Cursor era el
diseño original. Eso no funcionó. Dos intentos consecutivos contra
`cursor:cursor-grok-4.6-high-fast` devolvieron código de salida `6` (`INVALID_PROVIDER_RESPONSE`);
el modelo nunca emitió el JSON requerido. La afirmación se redirigió al adaptador `codex`, que
fuerza el esquema, y este produjo un veredicto en el primer intento.

El sujeto de una afirmación y el canal que la verifica son elecciones independientes. Cuando el
veredicto lo va a consumir una máquina, prefiera un adaptador que fije el esquema de salida en el
proveedor. Vea
[modos de fallo](failure-modes.md#5-the-provider-answers-in-prose-instead-of-json--exit-6).

## Decisión

Proceda como candidato. Registre el finding `low` como un posible ítem de endurecimiento, no como
un defecto.
