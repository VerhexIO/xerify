[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Dogfood: qué contiene realmente el paquete de npm publicado

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Xerify verificando una afirmación sobre su propio límite de distribución, usando un comprobante
generado en lugar de un resumen humano.

- Declaración de autor: `openai:gpt-5.6-sol`
- Verificador: `anthropic:claude-fable-5`, a través del adaptador `claude`
- Evidencia: [dogfood-package-boundary.md](../../../examples/evidence/dogfood-package-boundary.md)
- Observado el 2026-08-20: `confirmed`, código de salida `0`

## Afirmación

> El comprobante de npm dry-run suministrado para xverify-cli@0.1.1 informa que todas las rutas
> requeridas listadas de runtime y de herramientas están presentes, no informa ninguna ruta del
> paquete que coincida con sus reglas prohibidas de archivos internos, de documentación o de
> estado local, y informa cero archivos source map.

## Reproducir

Primero vuelva a generar el comprobante — `entryCount` y `unpackedSize` cambian cada vez que cambia
la documentación:

```sh
npm pack --dry-run --json --ignore-scripts
```

```sh
cat docs/examples/evidence/dogfood-package-boundary.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.1 reports every listed required runtime and tool path as present, reports no package path matching its listed internal, documentation or local-state forbidden rules, and reports zero source map files." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## Resultado normalizado observado

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The dry-run receipt for xverify-cli@0.1.1 reports exactly what the bounded claim states: all six paths in requiredPathsPresent are true; forbiddenMatches is an empty array against the 16 listed internal/documentation/local-state rules; and sourceMapCount is 0. An independent cross-check of the 16 topLevelEntries against the forbiddenPathRules yields no match, so the receipt is internally consistent.",
  "materialFindings": [
    "[info] All six requiredPathsPresent entries are reported true, covering the runtime entry, schema, skill, postinstall script, mock-provider tool, and README.",
    "[info] forbiddenMatches is empty, and cross-checking topLevelEntries against the 16 forbiddenPathRules yields no match.",
    "[info] sourceMapCount is 0, matching the claim of zero source map files.",
    "[low] The receipt enumerates only the 16 top-level entries of 109 total, so forbiddenMatches is accepted as the receipt's own computed report rather than independently recomputed."
  ]
}
```

## Por qué este veredicto

Observe con cuánto cuidado está acotada la afirmación: es sobre **lo que informa el comprobante**, no
sobre lo que sirve el registro. Ese acotamiento es justamente lo que la vuelve verificable. Una
afirmación como "el paquete publicado no contiene archivos fuente" sería imposible de verificar a
partir de esta evidencia, porque la evidencia es un dry run local.

El finding `low` es el verificador vigilando ese mismo límite desde el otro lado. Observó que
`forbiddenMatches: []` no se puede volver a calcular de forma independiente, porque el comprobante
lista 16 entradas de nivel superior, pero 109 archivos en total. Así que está confiando en la propia
aseveración del comprobante — y lo dijo, en lugar de tratar en silencio un campo de resumen como
verdad absoluta.

El nombre candidato `xerify` fue rechazado por npm por ser un nombre sin scope; la distribución
publicada es `xverify-cli`, y el ejecutable instalado es `xerify`. El verificador comprobó que esta
discrepancia estuviera explicada, y no fuera contradictoria.

## Qué lo cambiaría

- **Hacia `refuted`:** cualquier entrada de `requiredPathsPresent` que informe `false`, o un
  `forbiddenMatches` no vacío. Volver a agregar `src/` al arreglo `files` de `package.json`
  reproduce esto.
- **Hacia `unclear`:** un comprobante sin los campos de resumen, que no le deje al verificador
  ninguna base para las aseveraciones específicas de la afirmación.

## Decisión

Proceda como candidato para una condición de bloqueo de publicación. Combínelo con una comprobación
que vuelva a calcular `forbiddenMatches` a partir de la lista completa de archivos, ya que el
verificador señaló correctamente que no podía hacerlo a partir de esta evidencia.
