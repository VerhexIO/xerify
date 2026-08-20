[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Análisis de datos: un agregado que se revierte al estratificar

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

El número principal dice que la variante B gana por mucho. Al desglosar por dispositivo, B pierde
en escritorio. Esto es la paradoja de Simpson, y es el ejemplo con más probabilidades de aparecer en
sus propios paneles.

- Declaración de autor: `openai:gpt-5.6-sol`
- Verificador: `cursor:cursor-grok-4.6-high-fast`, a través del adaptador `cursor`
- Evidencia: [data-analysis.md](../../../examples/evidence/data-analysis.md)
- Observado el 2026-08-20: `refuted`, código de salida `10`

## Afirmación

> La variante B mejora causalmente la conversión de los usuarios, y debería implementarse en todo
> el tráfico móvil y de escritorio, basándose en el resultado agregado.

## Reproducir

```sh
cat docs/examples/evidence/data-analysis.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "Variant B causally improves conversion for users and should be rolled out to all mobile and desktop traffic based on the aggregate result." \
  --context-label docs/examples/evidence/data-analysis.md
```

## Resultado normalizado observado

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "The aggregate B win is a mix-shift artifact, not a causal improvement. Device allocation is severely imbalanced; B is worse on desktop and only trivially higher on a small mobile sample. A universal rollout from the aggregate rate is contradicted by the stratified table.",
  "materialFindings": [
    "[critical] Simpson's paradox: B's aggregate conversion (64.92% vs 20.83%) is explained by B receiving most high-converting desktop traffic, not by a within-device treatment effect.",
    "[critical] Desktop counterexample: B converts at 76.0% versus A's 80.0%, so rolling B to all desktop traffic would be expected to reduce conversion in that segment.",
    "[high] Mobile does not support a rollout decision: B is 0.5pp higher on 200 visitors versus A's 1,000, with no uncertainty interval.",
    "[high] No identification evidence for a causal claim: no randomization receipt, sample-ratio-mismatch check, interval estimate, or mix adjustment. Device share is 83.3% mobile for A versus 16.7% for B."
  ]
}
```

## Por qué este veredicto

La afirmación agrupa tres aseveraciones: que B mejora la conversión, que la mejora es _causal_, y
que de ahí se sigue un despliegue universal. El verificador atacó cada una por separado y encontró
la objeción más fuerte posible: un **contraejemplo directo dentro de los propios datos
suministrados**. B es peor en escritorio.

El agregado de 64,92 % frente a 20,83 % no es una aritmética errónea; es un cálculo correcto sobre
una asignación confundida. Verificar "¿es correcto este número?" habría pasado. Verificar "¿este
número respalda esta decisión?" no pasa.

## Qué lo cambiaría

- **Hacia `confirmed`:** un comprobante de aleatorización, una comprobación de desajuste en la
  proporción de la muestra, estimaciones de intervalo por dispositivo, y un efecto dentro de cada
  dispositivo que sea positivo en ambos segmentos. La afirmación también necesitaría acotarse —
  "mejora la conversión" no es la misma afirmación que "debería implementarse en todas partes".
- **Hacia `unclear`:** una asignación equilibrada con intervalos amplios. Entonces los datos ni
  respaldarían ni contradirían la afirmación, en lugar de contradecirla como lo hacen ahora.

## Decisión

Bloquee el despliegue universal. La tabla estratificada contiene un contraejemplo a la propia
recomendación de la afirmación. Un despliegue exclusivo para móvil es una afirmación distinta, y
necesita su propia verificación.
