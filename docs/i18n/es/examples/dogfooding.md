[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Dogfooding: lo que hace falta para que una afirmación resulte confirmed

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Esta página es un registro, no un tutorial. Cinco hallazgos sobre el propio Xerify pasaron por
`xerify verify` contra dos canales independientes — `codex` (`openai`) y `cursor`. Costó **26
rondas**. Solo un hallazgo pasó al primer intento, y una ronda volvió `refuted` porque la afirmación
estaba equivocada.

Todo lo que sigue es lo que realmente pasó, incluidas las partes donde el propio autor de las
afirmaciones resultó ser quien estaba equivocado. Si piensa usar Xerify para revisar su propio
trabajo, esta es la forma que tiene la experiencia.

## El registro

|   # | Afirmación                          | Canal  | Veredicto       | Salida | Por qué                                                      |
| --: | ----------------------------------- | ------ | --------------- | -----: | ------------------------------------------------------------ |
|   1 | source maps                         | codex  | `unclear`       |     11 | la afirmación cubría 86 archivos, la evidencia mostró 1      |
|   2 | source maps                         | cursor | `unclear`       |      6 | incumplimiento de esquema, no se produjo veredicto           |
|   3 | source maps                         | codex  | `unclear`       |     11 | los conteos eran un resumen, no inspeccionable               |
|   4 | source maps                         | codex  | `unclear`       |     11 | nunca se consideró `sourceRoot`; se mostraron 9 de 86 filas  |
|   5 | source maps                         | cursor | `unclear`       |     11 | las mismas dos objeciones, alcanzadas de forma independiente |
|   6 | source maps                         | codex  | **`refuted`**   |     10 | la afirmación era falsa: los mapas _sí_ fijan `sourceRoot`   |
|   7 | source maps                         | cursor | **`refuted`**   |     10 | la misma refutación, alcanzada de forma independiente        |
|   8 | source maps                         | codex  | `unclear`       |     11 | artefacto no vinculado criptográficamente al registro        |
|   9 | source maps                         | cursor | `unclear`       |      6 | incumplimiento de esquema                                    |
|  10 | source maps                         | codex  | **`confirmed`** |      0 | —                                                            |
|  11 | source maps                         | cursor | **`confirmed`** |      0 | —                                                            |
|  12 | precedencia de adaptador            | codex  | `unclear`       |     11 | ejecuciones no vinculadas a un commit; comandos omitidos     |
|  13 | precedencia de adaptador            | cursor | `unclear`       |      6 | incumplimiento de esquema                                    |
|  14 | precedencia de adaptador            | codex  | **`confirmed`** |      0 | —                                                            |
|  15 | precedencia de adaptador            | cursor | **`confirmed`** |      0 | —                                                            |
|  16 | procedencia de npm                  | codex  | **`confirmed`** |      0 | —                                                            |
|  17 | procedencia de npm                  | cursor | **`confirmed`** |      0 | —                                                            |
|  18 | la trampa de la ruta relativa       | codex  | `unclear`       |     11 | el A/B cambió dos variables, no una                          |
|  19 | la trampa de la ruta relativa       | codex  | **`confirmed`** |      0 | —                                                            |
|  20 | la trampa de la ruta relativa       | cursor | **`confirmed`** |      0 | —                                                            |
|  21 | hueco en la exclusión de `.claude/` | codex  | `unclear`       |     11 | no se mostró que los 152 errores fueran todos de parseo      |
|  22 | hueco en la exclusión de `.claude/` | codex  | `unclear`       |     11 | reproducción resumida, solo un mensaje crudo                 |
|  23 | hueco en la exclusión de `.claude/` | codex  | `unclear`       |     11 | reproducción no vinculada al commit indicado                 |
|  24 | hueco en la exclusión de `.claude/` | codex  | `unclear`       |     11 | las dos mitades de la afirmación vivían en commits distintos |
|  25 | hueco en la exclusión de `.claude/` | codex  | `unclear`       |     11 | el historial de git no se puede autenticar desde el sandbox  |
|  26 | hueco en la exclusión de `.claude/` | cursor | **`confirmed`** |      0 | —                                                            |

**Totales: 9 `confirmed`, 2 `refuted`, 15 `unclear`.** De los 15 resultados `unclear`, 3 fueron
fallos de transporte (código de salida `6`) y 12 fueron juicios genuinos de "su evidencia no
establece esto".

Cuatro hallazgos llegaron a `confirmed` en los dos canales. Uno llegó a `confirmed` en un canal y
chocó con un límite duro en el otro — vea [lo que este canal no puede
verificar](#lo-que-este-canal-no-puede-verificar).

## Por qué 12 rondas volvieron con "su evidencia no establece esto"

Cada una de esas doce objeciones cayó en una de cuatro categorías. Vale la pena aprenderlas, porque
son las mismas cuatro con las que usted se va a topar.

### 1. La afirmación llega más lejos que la evidencia

Ronda 1. La afirmación decía que los 86 archivos de mapas eran inservibles. La evidencia mostró uno.

> La evidencia suministrada respalda que un `.js.map` publicado hace referencia a un archivo
> `package/src` que falta, sin `sourcesContent` embebido, pero no establece la afirmación para los
> 86 archivos de mapas [...] La evidencia también distingue 43 archivos `.js.map` y 43 archivos
> `.d.ts.map`, mientras que las propiedades que declara la afirmación solo hablan de archivos
> `.js.map`.

La solución no es suavizar la afirmación. Es ir e inspeccionar los 86 y poner el resultado en el
sobre. Un verificador que acepta "revisé uno, asuma el resto" no le está sirviendo de nada.

La ronda 1 también contenía un segundo sobre-alcance que tardó varias rondas más en notarse: la
afirmación decía que los mapas eran inservibles _para todo consumidor_. Un desarrollador con el
repositorio clonado junto a su `node_modules` sí podría resolver esas rutas. La evidencia nunca
podría respaldar "todo consumidor", y la afirmación tuvo que acotarse a lo que el propio artefacto
muestra: las fuentes no se pueden resolver _desde dentro del paquete_.

### 2. La evidencia es su resumen, no el artefacto

Rondas 3, 4, 22 y 23. Una tabla que usted generó es su conclusión disfrazada de datos.

> La evidencia suministrada es internamente consistente con la afirmación, pero es un resumen
> derivado y no confiable, en lugar de datos crudos del artefacto; sin extractos directos del JSON
> de los mapas y un listado completo de archivos del tarball, no se pueden descartar contraejemplos
> relevantes.

Lo que funcionó: la respuesta cruda de la API del registro, el listado completo de `tar -tzf`, y el
JSON de cada archivo de mapa, con solo el blob base64 de `mappings` omitido. Para el caso de ESLint,
la salida de `--format json` con los 152 mensajes completos, en lugar de la cola de la terminal.

Si su evidencia contiene la frase "el escaneo encontró N de M", todavía está en esta categoría.

### 3. El artefacto no está vinculado a lo que usted dice que es

Ronda 8. La afirmación era sobre "el tarball que sirve npm". La evidencia era sobre un archivo en
`/tmp`.

> El tarball analizado se identifica solo mediante un hash SHA-256, mientras que los metadatos del
> registro suministran valores de integridad SHA-1 y SHA-512. No se suministra ningún cálculo de
> SHA-1 o SHA-512 que coincida, así que la identidad del artefacto no queda establecida.

La solución fue calcular los hashes que el registro realmente publica, y mostrar que coinciden:

```text
local  sha1             : db56366636ab9d0f1b4778639d39bf040f65512e
registry dist.shasum    : db56366636ab9d0f1b4778639d39bf040f65512e
sha1 MATCHES registry   : True

local  sha512 (base64)  : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
registry dist.integrity : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
integrity MATCHES       : True
```

La misma categoría aplica a las afirmaciones sobre el código fuente: nombre el commit, muestre `git
rev-parse HEAD`, y muestre `git status --porcelain` para que el lector sepa que el árbol no estaba
sucio.

### 4. Cambió más de una cosa, o las mitades viven en lugares distintos

Ronda 18. Un A/B pensado para aislar una variable no lo logró.

> La afirmación de que las configuraciones difieren solo en la ruta del script, relativa contra
> absoluta, es literalmente falsa: sus claves del mapa de proveedores y sus nombres de proveedor
> también difieren.

Eso era cierto. Las dos configuraciones usaban `rel-test` y `abs-test` como identidades de
proveedor. La solución fue darles a ambas configuraciones la misma identidad, e incluir la salida de
`diff` para que la afirmación de una sola variable se pudiera comprobar, en lugar de solo asumirse.

La ronda 24 es la misma categoría con otro disfraz. La afirmación aseveraba algo "en el commit
`1d65f17`", pero la reproducción quitó una línea de la configuración en `HEAD` — donde un commit
posterior la había agregado. Las dos mitades de una misma frase vivían en dos commits distintos.

> [...] no establecen adecuadamente que la reproducción se haya hecho desde el HEAD indicado, con
> solo la modificación mostrada [...] La evidencia también contiene una contradicción interna sobre
> las rutas de archivo afectadas.

La solución fue dejar de fingir que era un solo hecho, y plantear dos, cada uno vinculado a su
propio commit.

## Las dos rondas que refutaron al autor

Las rondas 6 y 7 son lo más útil de esta página.

La afirmación incluía la subaseveración _"ninguno de los 86 mapas fija `sourceRoot`"_. El escaneo
que produjo ese número estaba escrito en Python, y comprobaba el campo así:

```python
sr = d.get('sourceRoot')
if sr:                 # "" es falsy en Python
    haveroot += 1
```

Cada uno de los 86 mapas fija `sourceRoot` — a la cadena vacía. El escaneo contó cero. Los dos
canales lo detectaron, de forma independiente, en la misma ronda:

> **codex:** La afirmación es materialmente falsa tal como está escrita: cada JSON de mapa
> suministrado fija explícitamente `"sourceRoot"` a la cadena vacía, lo que contradice la
> aseveración de que ninguno fija `sourceRoot`. Por lo demás, la evidencia respalda la
> interpretación más acotada [...]

> **cursor:** Hay una contradicción relevante en la evidencia suministrada: los archivos de mapa
> incluyen explícitamente un campo `"sourceRoot"` (fijado a una cadena vacía), así que la
> subafirmación "none of the 86 maps sets `sourceRoot`" es falsa tal como está escrita.

Un `sourceRoot` vacío no antepone nada, así que la conclusión sustantiva sobrevivió. La _afirmación
tal como estaba planteada_ no. Se corrigió a "los 86 mapas fijan `sourceRoot` a la cadena vacía, así
que no agrega ningún prefijo", y se confirmó dos rondas después.

Observe qué tuvo que ser cierto para que esto se detectara. El JSON crudo de los mapas estaba en el
sobre. Si la evidencia hubiera seguido siendo la tabla resumen de la ronda 3 — la que decía `maps
with a sourceRoot set: 0 of 86` — ningún verificador habría tenido nada que objetar, y un enunciado
falso se habría reportado como verificado.

**Envíe el artefacto, no su lectura de él. Ese es todo el mecanismo.**

## La receta que funcionó

Para el hallazgo cuatro, bastaron dos rondas. Esto es lo que cambió:

1. **Acote la afirmación exactamente a lo que muestra la evidencia.** Nada de "todo", "siempre" ni
   "cada uno" a menos que los haya inspeccionado todos. Ningún puente causal a menos que haya
   aislado la variable.
2. **Ponga la salida cruda en el sobre.** Transcripciones de comandos, respuestas de API, listados
   completos de archivos, JSON con solo los blobs irrelevantes omitidos. Sus tablas van en la
   afirmación, no en la evidencia.
3. **Vincule el artefacto.** Hashes que coincidan con lo que publica el registro, o un hash de
   commit más un `git status` limpio.
4. **Una variable por comparación,** con el `diff` incluido para que el lector lo pueda comprobar
   por sí mismo.
5. **Divida las afirmaciones compuestas.** Si dos mitades se refieren a estados distintos, son dos
   afirmaciones.
6. **Incluya los comandos exactos.** No una descripción de lo que ejecutó.

Un `confirmed` que llega al primer intento normalmente significa que la afirmación era demasiado
débil como para valer la pena plantearla. Espere iterar.

## Un sobre que pasó

Esta es la forma del paquete de evidencia detrás de las rondas 10 y 11:

```text
=== CRYPTOGRAPHIC BINDING: the analyzed file IS the tarball npm serves ===
  local sha1 / registry dist.shasum        -> match
  local sha512 / registry dist.integrity   -> match

=== RAW ARTIFACT DATA — no derived tables in this section ===
--- 1. Registry metadata, verbatim from the registry API ---
--- 2. sha256 of the tarball this evidence was produced from ---
--- 3. Complete tarball entry listing, verbatim from `tar -tzf` (all entries) ---
--- 4. Raw JSON of every .map file, with only the base64 `mappings` blob elided ---
```

Y la afirmación que llevaba:

> En el tarball de `xverify-cli@0.1.0` que sirve el registro de npm, ningún archivo `.map` puede
> resolver su fuente declarada desde dentro del propio paquete: los 86 mapas fijan `sourceRoot` a la
> cadena vacía, así que no agrega ningún prefijo, ninguno embebe `sourcesContent`, cada fuente
> declarada resuelve a una ruta bajo `src/`, y el tarball contiene cero entradas `src/`.

Observe la forma: la afirmación plantea cuatro hechos comprobables y una conclusión que se sigue de
ellos mecánicamente. Nada en ella exige que el verificador confíe en el criterio del autor.

## Lo que este canal no puede verificar

Ronda 25 es el muro, y es una decisión de diseño, no un defecto.

> [...] el estado histórico del repositorio no se pudo verificar de forma independiente, porque el
> espacio de trabajo disponible no es un repositorio Git y no contiene los archivos ni los objetos
> de commit referenciados.

Un verificador recibe evidencia acotada por stdin. No puede ejecutar `git log`, no puede abrir su
repositorio, y no puede volver a ejecutar sus comandos. Así que una afirmación cuya verdad vive en
algo que el verificador no puede alcanzar — el historial de git, un registro privado, el estado de
su CI — puede quedar _respaldada_ por una transcripción, pero nunca _autenticada_. Codex dijo que la
transcripción era internamente consistente con la afirmación, y aun así devolvió `unclear`, que es
la respuesta correcta.

Cursor devolvió `confirmed` con la misma evidencia. Ese desacuerdo ya es informativo por sí solo:
los dos canales trazaron líneas distintas sobre cuánto vale una transcripción pegada. Ninguno de los
dos está fallando.

Planifique en función de esto. Las afirmaciones sobre **artefactos que puede meter en el sobre**
verifican bien. Las afirmaciones sobre **historial, infraestructura o proceso** no, y en su lugar
debería recurrir a un registro firmado o a un log de CI que el lector pueda comprobar de forma
independiente.

## Confiabilidad de canal, medida

A lo largo de estas 26 rondas:

| Canal              | Rondas | Produjo un veredicto | Fallos de esquema, código de salida `6` |
| ------------------ | -----: | -------------------: | --------------------------------------: |
| `codex` (`openai`) |     16 |                   16 |                                       0 |
| `cursor`           |     10 |                    7 |                                       3 |

El adaptador `cursor` no tiene ninguna exigencia de esquema del lado del proveedor — su fila en la
[matriz de adaptadores integrados](../provider-adapters.md) dice "contrato en el prompt; validación
en el núcleo" — así que un modelo que ignora la instrucción de salida produce código de salida `6` y
ningún veredicto. Trate el código de salida `6` de los adaptadores `cursor` o `command` como
reintentable, y limite sus reintentos.

Nunca reintente un `refuted` hasta que se vuelva `confirmed`. Eso es ir de compras por el veredicto
que le convenga, y convierte una segunda opinión en una forma cara de darse la razón a usted mismo.

## Lo que costó

26 rondas facturables para 5 hallazgos. La distribución es despareja, y vale la pena planificar en
función de ella:

- Hallazgo 1, aprendiendo las reglas desde cero: **11 rondas**
- Hallazgo 5, chocando con un límite de canal: **6 rondas**
- Hallazgo 2: 4 rondas · Hallazgo 4: 3 rondas · Hallazgo 3, con la receta aplicada: **2 rondas**

El primer hallazgo que verifique va a ser el caro. Presupueste para iterar, y use [el proveedor
simulado](no-account-walkthrough.md) para dejar bien resueltos el sobre y el manejo de códigos de
salida, antes de gastar cuota en el juicio de un modelo.

## Relacionado

- [Modos de fallo](failure-modes.md) — cada fallo tipificado y qué lo produce
- [Tutorial sin cuenta](no-account-walkthrough.md) — todos los resultados posibles sin gastar cuota
- [Ejemplos de verificación resueltos](README.md) — los escenarios de dominio
- [Adaptadores de proveedor](../provider-adapters.md) — qué adaptadores exigen el esquema de salida
