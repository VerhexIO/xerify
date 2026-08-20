[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Decisión de sitio web: la matriz elige la otra opción

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Una decisión de arquitectura afirma tener un ganador. La matriz de puntuación aprobada dice lo
contrario, y lo dice dos veces — una en los totales, y otra en una condición de bloqueo.

- Declaración de autor: `openai:gpt-5.6-sol`
- Verificador: `anthropic:claude-fable-5`, a través del adaptador `claude`
- Evidencia: [website-decision.md](../../../examples/evidence/website-decision.md)
- Observado el 2026-08-20: `refuted`, código de salida `10`

## Afirmación

> Según la matriz ponderada de decisión aprobada, la aplicación SSR a medida con una base de datos
> dedicada es la arquitectura de sitio web seleccionada.

## Reproducir

```sh
cat docs/examples/evidence/website-decision.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Under the approved weighted decision matrix, the custom SSR application with a dedicated database is the selected website architecture." \
  --context-label docs/examples/evidence/website-decision.md
```

## Resultado normalizado observado

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Recomputing the approved weighted matrix confirms the stated totals: the managed static build + headless CMS scores 4.8 while the custom SSR app + database scores 3.3, so the matrix selects the static option by 1.5 points. The SSR option also scores 2 on operational burden, below the gate threshold of 3, with no documented exception.",
  "materialFindings": [
    "[high] Weighted totals directly contradict the claim: 4.8 versus 3.3 under the approved scoring rule.",
    "[medium] The SSR option is independently blocked by the operational-burden gate: it scores 2 against a threshold of 3, and the evidence states no documented exception exists.",
    "[info] The only criterion where SSR wins is editorial workflow (5 vs 4, weight 20), insufficient to offset security exposure, operational burden, and cost predictability."
  ]
}
```

## Por qué este veredicto

El verificador no se tomó los totales de la matriz por fe — los **volvió a calcular** a partir de
los puntajes y pesos por criterio, y confirmó la aritmética antes de contradecir la afirmación. Esa
distinción importa: una refutación que solo cita un número que contradice es más débil que una que
reproduce el cálculo.

Después encontró una segunda razón, independiente de la primera. Aunque los totales hubieran estado
cerca, la opción SSR de todos modos falla la condición de carga operativa por sí sola. Dos motivos
sin relación entre sí, que llevan a la misma conclusión, hacen que esta refutación resista un único
error de puntuación.

## Qué lo cambiaría

- **Hacia `confirmed`:** un nuevo conjunto de pesos bajo el cual la ventaja de SSR en flujo
  editorial supere sus déficits, _y_ una excepción documentada a la condición de carga operativa. Se
  necesitan las dos cosas — superar solo los totales todavía deja pendiente la condición de bloqueo.
- **Hacia `unclear`:** evidencia de que la matriz quedó reemplazada, o de que el estado de
  aprobación de los pesos está en disputa.

## Decisión

Bloquee. La afirmación contradice el registro de decisión aprobado. O bien seleccione la opción
estática, o enmiende la matriz a través del proceso que la aprobó — pero no lance una decisión que
el registro no respalda.
