[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Plan de producción de un juego: la aritmética no encaja con las restricciones

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Un equipo de dos personas, diez semanas, una lista fija de funciones, y sin permiso para recortar
nada. La afirmación es que esto funciona. La aritmética de capacidad dice que no.

Este ejemplo también documenta un **fallo real de reproducción** — vea "Una nota sobre la
reproducibilidad" más abajo.

- Declaración de autor: `openai:gpt-5.6-sol`
- Verificador: `cursor:cursor-grok-4.6-high-fast`, a través del adaptador `cursor`
- Evidencia: [game-design.md](../../../examples/evidence/game-design.md)
- Observado el 2026-08-20: `refuted`, código de salida `10` (segundo intento; vea más abajo)

## Afirmación

> El alcance completo del lanzamiento se puede entregar con el equipo de dos personas en diez
> semanas, sin horas extra, sin contratistas, sin recortar funciones, y sin extender el cronograma.

## Reproducir

```sh
cat docs/examples/evidence/game-design.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "The complete launch scope can be delivered by the two-person team within ten weeks, without overtime, contractors, feature cuts, or schedule extension." \
  --context-label docs/examples/evidence/game-design.md
```

## Resultado normalizado observado

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Fixed two-person capacity is 800 person-hours over ten 40-hour weeks, while the required no-cut launch estimate is 1,120 hours before contingency and 1,344 hours with the studio's required 20% reserve. The same envelope forbids overtime, contractors, feature cuts, and schedule extension, so the gap cannot be closed under the stated constraints.",
  "materialFindings": [
    "[critical] Required launch work exceeds hard capacity even before contingency: 1,120 estimated person-hours versus 800 available, a 320-hour shortfall (40% over capacity).",
    "[critical] The studio-required 20% risk reserve raises the plan to 1,344 person-hours, a 544-hour shortfall.",
    "[high] Every lever that could close the gap is explicitly disallowed, and launch features cannot be removed or deferred.",
    "[medium] Inexperience on the riskiest scope makes beating the estimate an unsupported recovery path rather than a reason to treat the total as padding."
  ]
}
```

## Por qué este veredicto

Este es el tipo de refutación más limpio: la afirmación y sus propias restricciones son
internamente inconsistentes, y la contradicción es aritmética, no una cuestión de criterio. 800
horas disponibles no pueden absorber 1,120 horas requeridas cuando el mismo documento cierra todas
las vías de escape.

El verificador también rechazó el rescate más tentador — "tal vez sean más rápidos de lo estimado"
— porque la evidencia dice que el equipo no tiene experiencia en la parte más riesgosa del alcance.
El optimismo no es evidencia.

## Qué lo cambiaría

- **Hacia `confirmed`:** una nueva estimación por debajo de 800 horas, _incluyendo_ la reserva del
  20 %, o eliminar una de las cuatro restricciones. Sumar un tercer ingeniero, extender a catorce
  semanas, o recortar una función, cada una produce una afirmación distinta y verificable.
- **Hacia `unclear`:** una estimación dada como un rango sin confianza declarada, donde el límite
  inferior sí entra en la capacidad disponible.

## Decisión

Bloquee. Vuelva a planificar antes de comprometerse con una fecha. La refutación nombra cuatro
palancas específicas; cualquiera de ellas produce una afirmación que sí puede pasar.

## Una nota sobre la reproducibilidad

El comando de arriba se ejecutó dos veces, sin cambios. El primer intento devolvió código de salida
`6` (`INVALID_PROVIDER_RESPONSE`) — el modelo no emitió el JSON requerido. El segundo intento
devolvió el veredicto con código de salida `10` que se muestra aquí. Ambas ejecuciones quedaron
registradas en el historial de ejecuciones local con hashes idénticos de enunciado y evidencia.

El adaptador `cursor` no tiene ninguna exigencia de esquema del lado del proveedor; su columna de
verificación estructurada en la [matriz de adaptadores integrados](../provider-adapters.md) dice
"contrato en el prompt; validación en el núcleo". Trate el código de salida `6` de los adaptadores
`cursor` o `command` como reintentable, limite sus reintentos, y nunca reintente solo porque el
veredicto no le gustó. Vea
[modos de fallo](failure-modes.md#9-real-world-flakiness-the-same-command-two-different-outcomes).
