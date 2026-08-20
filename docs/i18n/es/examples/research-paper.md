[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Artículo de investigación: el resultado que se afirma nunca se midió

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Un estudio ficticio reporta una diferencia de corto plazo en un examen. La afirmación es sobre la
retención después de seis meses. Esas dos cosas no son lo mismo, y esa brecha es, precisamente,
todo el ejemplo.

- Declaración de autor: `openai:gpt-5.6-sol`
- Verificador: `anthropic:claude-fable-5`, a través del adaptador `claude`
- Evidencia: [research-paper.md](../../../examples/evidence/research-paper.md)
- Observado el 2026-08-20: `unclear`, código de salida `11`, `failure: null`

## Afirmación

> Los estudiantes que usan el asistente de tutoría retienen al menos un 15 % más de material del
> curso después de seis meses, en comparación con los estudiantes que usan la guía de estudio
> existente.

## Reproducir

```sh
cat docs/examples/evidence/research-paper.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Students who use the tutoring assistant retain at least 15% more course material after six months than students who use the existing study guide." \
  --context-label docs/examples/evidence/research-paper.md
```

## Resultado normalizado observado

```json
{
  "verdict": "unclear",
  "exitCode": 11,
  "failure": null,
  "summary": "The claim asserts at least 15% greater retention after six months, but the supplied evidence contains no six-month measurement of any kind. The only observed outcome is a two-week quiz difference (78% vs 66%), which measures a different timeframe and construct and cannot substantiate the claim. The evidence also cannot refute the claim, since no six-month data contradicts it.",
  "materialFindings": [
    "[high] No six-month retention outcome exists in the supplied evidence, so the central quantity of the claim was never measured.",
    "[medium] The two-week quiz result is the only outcome data; extrapolating it to the claimed outcome is unjustified, with no confidence interval or adjusted analysis reported.",
    "[medium] Assignment was not randomized, so even the observed two-week difference may reflect selection effects.",
    "[medium] Differential attrition (8% vs 31%, 21 of 105 enrolled) plausibly biases the observed group difference."
  ]
}
```

## Por qué este veredicto

`unclear` es la respuesta correcta, y es la más difícil de manejar para una integración ingenua.

La evidencia no calla — contiene un resultado real, y llamativo desde el punto de vista estadístico
(78 % frente a 66 %, una diferencia relativa de aproximadamente 18,2 %, cómodamente por encima del 15 %
que se afirma). Un sistema ajustado para encontrar números que respalden la afirmación diría
`confirmed`. El verificador, en cambio, notó que ese número responde una **pregunta distinta** de la
que plantea la afirmación: el desempeño inmediato en un examen no es retención a seis meses.

Tampoco se fue para el otro lado. Nada en la evidencia contradice la afirmación de seis meses
tampoco; esos datos, sencillamente, no existen. `refuted` habría sido un error tan grande como
`confirmed`.

Observe que `failure` es `null`. Esto es un juicio sobre la evidencia, no un problema de transporte.
Vea [modos de fallo](failure-modes.md) para los casos de código de salida `11` que llevan una
`failure` no nula, y que significan algo completamente distinto.

## Qué lo cambiaría

- **Hacia `confirmed`:** una evaluación a seis meses con un tamaño de efecto e intervalo
  reportados, más una asignación aleatoria o un ajuste creíble por autoselección y por la brecha de
  deserción del 8 % frente al 31 %.
- **Hacia `refuted`:** una evaluación a seis meses que muestre una diferencia por debajo del 15 %.
- **Sigue en `unclear`:** agregar más datos de dos semanas. Ganar precisión en el punto de medición
  equivocado no mueve una afirmación sobre un punto de medición distinto.

## Decisión

No trate el puntaje inmediato como evidencia de largo plazo. Reúna el resultado a seis meses, o
derive la afirmación a revisión humana. Este es el comportamiento previsto: `UNKNOWN → review`,
nunca `UNKNOWN → pass`.
