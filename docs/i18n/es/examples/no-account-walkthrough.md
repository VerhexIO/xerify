[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Tutorial sin cuenta: todos los resultados, cero cuota

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

No necesita ninguna cuenta de proveedor, ninguna clave de API, ni ninguna sesión iniciada para
aprender cómo se comporta Xerify. Esta página recorre **todos los veredictos y todos los fallos
tipificados**, usando un proveedor simulado determinista incluido en el paquete.

Nada de esto contacta ningún servicio de red. Nada de esto se factura. Cada salida de abajo se
observó ejecutando exactamente estos comandos.

## Por qué un proveedor simulado

El adaptador `command` de Xerify corre cualquier ejecutable, envía el prompt por stdin, y lee la
respuesta de stdout. No le importa si esa respuesta la produjo un modelo de lenguaje o no. Así que
un script fijo es un proveedor perfectamente válido — uno cuyas respuestas usted controla, lo que
hace que cada resultado sea reproducible.

El simulador vive en `docs/examples/tools/mock-provider.mjs`. Toma un argumento, el nombre del
escenario, ignora el prompt, e imprime una respuesta fija.

> **Disponibilidad:** el simulador se incluye en el paquete a partir del release posterior a
> `0.1.0`. En `0.1.0` no está en el tarball de npm — use un checkout del código fuente del
> repositorio, o copie el archivo del repositorio a su propio proyecto y apunte `args` a su copia.
> Todo lo demás en esta página funciona sin cambios.

## Configuración inicial

Primero encuentre la ruta de instalación. El simulador debe referenciarse por **ruta absoluta** —
un adaptador `command` corre en un directorio temporal nuevo, así que las rutas relativas nunca se
resuelven.

```sh
# Desde un checkout del código fuente
MOCK="$PWD/docs/examples/tools/mock-provider.mjs"

# Desde una instalación global de npm
MOCK="$(npm root -g)/xverify-cli/docs/examples/tools/mock-provider.mjs"

# Desde una instalación local del proyecto
MOCK="$PWD/node_modules/xverify-cli/docs/examples/tools/mock-provider.mjs"

echo "$MOCK"
```

Escriba una configuración desechable que registre un adaptador por cada escenario. Mantenerla en un
directorio temporal significa que su configuración real queda intacta.

```sh
WORK="$(mktemp -d)"
cat > "$WORK/config.json" <<EOF
{
  "providers": {
    "mockConfirmed": { "kind": "command", "provider": "mock-lab",       "executable": "node",
      "args": ["$MOCK", "confirmed"],  "authKind": "local", "structuredOutput": true },
    "mockRefuted":   { "kind": "command", "provider": "mock-rebuttal",  "executable": "node",
      "args": ["$MOCK", "refuted"],    "authKind": "local", "structuredOutput": true },
    "mockUnclear":   { "kind": "command", "provider": "mock-hedge",     "executable": "node",
      "args": ["$MOCK", "unclear"],    "authKind": "local", "structuredOutput": true },
    "mockProse":     { "kind": "command", "provider": "mock-prose",     "executable": "node",
      "args": ["$MOCK", "prose"],      "authKind": "local", "structuredOutput": true },
    "mockMalformed": { "kind": "command", "provider": "mock-malformed", "executable": "node",
      "args": ["$MOCK", "malformed"],  "authKind": "local", "structuredOutput": true },
    "mockOffSchema": { "kind": "command", "provider": "mock-offschema", "executable": "node",
      "args": ["$MOCK", "off-schema"], "authKind": "local", "structuredOutput": true },
    "mockCrash":     { "kind": "command", "provider": "mock-crash",     "executable": "node",
      "args": ["$MOCK", "crash"],      "authKind": "local", "structuredOutput": true },
    "mockSlow":      { "kind": "command", "provider": "mock-slow",      "executable": "node",
      "args": ["$MOCK", "slow"],       "authKind": "local", "structuredOutput": true },
    "mockFlood":     { "kind": "command", "provider": "mock-flood",     "executable": "node",
      "args": ["$MOCK", "flood"],      "authKind": "local", "structuredOutput": true },
    "notInstalled":  { "kind": "command", "provider": "absent-vendor",
      "executable": "definitely-not-installed-cli", "args": [], "authKind": "subscription" }
  },
  "history": { "enabled": false },
  "logPath": null
}
EOF
chmod 600 "$WORK/config.json"
export XERIFY_USER_CONFIG_PATH="$WORK/config.json"
```

`XERIFY_USER_CONFIG_PATH` apunta Xerify a este archivo sin tocar su directorio home ni el
`.xerify/` de su proyecto. `history.enabled: false` evita que el tutorial escriba registros de
ejecución.

Dos variables de shell mantienen los comandos cortos:

```sh
EVIDENCE="Evidence E-1: the deployment log shows the migration completed at 04:12 UTC with zero failed rows."
CLAIM="The database migration completed cleanly."
```

Compruebe que todo esté bien conectado antes de continuar:

```sh
xerify --json providers list
```

Verá los diez adaptadores simulados de arriba, **más** los adaptadores integrados `codex`
(`openai`) y `claude` (`anthropic`), y cualquier adaptador que defina la configuración de su propio
proyecto. La configuración se combina con los valores por defecto, nunca los sustituye, así que la
cantidad exacta depende de su instalación.

Cada simulador tiene su propia identidad de `provider` a propósito. La verificación contra el mismo
proveedor se rechaza, así que una única identidad compartida bloquearía todos los comandos de abajo.
Esa identidad por adaptador también evita que los simuladores choquen con los integrados — cuando
dos adaptadores responden a una misma identidad, gana el que se registró primero, y los integrados
se registran primero. Vea
[modos de fallo](failure-modes.md#6b-the-wrong-adapter-answered--exit-5-where-you-expected-exit-3).

## Los tres veredictos

### `confirmed` — código de salida `0`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-lab:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "confirmed",
  "summary": "The supplied evidence supports the claim and no counterexample appears.",
  "findings": [],
  "evidence": [
    {
      "reference": "supplied evidence envelope",
      "observation": "Deterministic mock response; no model judgement was involved."
    }
  ],
  "truncation": { "input": false, "output": false },
  "failure": null
}
```

Código de salida `0`. Observe `failure: null` — es un veredicto genuino, no un resultado operativo de
respaldo.

### `refuted` — código de salida `10`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-rebuttal:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "refuted",
  "summary": "The supplied evidence contains a direct counterexample to the claim.",
  "findings": [
    {
      "severity": "high",
      "message": "The evidence states the opposite of the claim.",
      "evidence": "supplied evidence envelope"
    }
  ],
  "failure": null
}
```

Código de salida `10`. En una ejecución real, el arreglo `findings` es donde está la sustancia; vea
los [ejemplos resueltos](README.md) para veredictos con cuatro o cinco findings concretos.

### `unclear` — código de salida `11`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-hedge:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "unclear",
  "summary": "The supplied evidence is insufficient to decide the claim either way.",
  "failure": null
}
```

Código de salida `11` con `failure: null`. Esto es el verificador diciendo _"la evidencia no
resuelve esto"_ — un resultado epistémico, no un mal funcionamiento. Compárelo con los fallos
parecidos al código de salida `11` de más abajo, que todos llevan una `failure` no nula.

## Los fallos tipificados

Cada comando de abajo es de una sola línea. La explicación completa de cada resultado, y cómo
resolverlo en un despliegue real, está en [modos de fallo](failure-modes.md).

```sh
# 1. Falta el ejecutable por completo -> exit 3, ok:false, PROVIDER_UNAVAILABLE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to absent-vendor:any --claim "$CLAIM"; echo "exit=$?"

# 2. El mismo proveedor de invocación en los dos lados -> exit 2, no se contactó a ningún proveedor
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to openai:gpt-5.6-sol --claim "$CLAIM"; echo "exit=$?"

# 3. El proveedor responde en texto libre -> exit 6, INVALID_PROVIDER_RESPONSE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-prose:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 4. El proveedor devuelve un JSON truncado -> exit 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-malformed:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 5. JSON válido, valor de veredicto inválido -> exit 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-offschema:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 6. El proceso del proveedor termina con código distinto de cero -> exit 5, PROVIDER_FAILURE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-crash:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 7. El proveedor tarda más que --timeout -> exit 4, TIMEOUT
echo "$EVIDENCE" | xerify --json --timeout 1500 verify \
  --from openai:gpt-5.6-sol --to mock-slow:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 8. La respuesta supera el límite de salida -> exit 6, truncation.output true
echo "$EVIDENCE" | XERIFY_MAX_OUTPUT_BYTES=4096 xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-flood:mock-1 --claim "$CLAIM"; echo "exit=$?"
```

Códigos de salida esperados, en orden: `3`, `2`, `6`, `6`, `6`, `5`, `4`, `6`.

El escenario que merece un momento de atención es el número 3. El simulador responde `Yes, that
looks right to me. I would ship it.` — un acuerdo inequívoco, en inglés llano. Aun así, Xerify
devuelve `unclear` con código de salida `6`, porque estar de acuerdo en texto libre no es un
veredicto según el contrato. Esa negativa es, precisamente, el producto.

## Comprobar toda la superficie de una vez

Un único bucle comprueba todos los códigos de salida. Es una prueba de humo razonable para una
integración:

```sh
check() {
  echo "$EVIDENCE" | xerify --json ${3:-} verify \
    --from openai:gpt-5.6-sol --to "$1:mock-1" --claim "$CLAIM" >/dev/null 2>&1
  actual=$?
  [ "$actual" = "$2" ] && echo "ok   $1 -> $actual" || echo "FAIL $1 -> $actual (want $2)"
}

check mock-lab       0
check mock-rebuttal  10
check mock-hedge     11
check mock-prose     6
check mock-malformed 6
check mock-offschema 6
check mock-crash     5
check mock-slow      4 "--timeout 1500"
check absent-vendor  3
```

## Limpieza

```sh
unset XERIFY_USER_CONFIG_PATH
rm -rf "$WORK"
```

No se escribió nada en su proyecto. Si habilitó el historial quitando `"history": { "enabled":
false }`, elimine también `.xerify/runs/`.

## Hacia dónde ir después

- [Modos de fallo](failure-modes.md) — por qué ocurre cada fallo y cómo resolverlo en producción
- [Ejemplos de verificación resueltos](README.md) — las mismas formas contra proveedores reales, con
  desacuerdo real
- [Configuración del proyecto](../configuration.md) — precedencia, permisos, y el esquema completo
  de configuración
- [Referencia de la CLI](../cli-reference.md) — todos los comandos y todas las marcas
