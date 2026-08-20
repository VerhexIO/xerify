[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · **Español** · [Français](../../fr/examples/README.md)

# Ejemplos de verificación resueltos

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

Estas páginas muestran la forma completa de Xerify: una afirmación acotada, la evidencia que puede
salir de la máquina, un modelo destino exacto, un resultado normalizado, y la decisión de salida que
debería tomar quien llama.

Son **ejecuciones observadas**, no veredictos preparados de antemano. Cada resultado en estas
páginas se produjo ejecutando el comando que se muestra, en la fecha indicada. Repetir el comando es
una verificación nueva, no una garantía de repetir el resultado — vea [modos de fallo](failure-modes.md)
para un caso documentado donde el mismo comando produjo dos resultados distintos.

## Empiece aquí si no tiene cuenta de proveedor

El [tutorial sin cuenta](no-account-walkthrough.md) reproduce **todos los veredictos y todos los
fallos tipificados** sin gastar ninguna cuota de proveedor, usando un proveedor simulado
determinista incluido en el paquete. Es la forma más rápida de entender el contrato de códigos de
salida antes de gastar una llamada real.

## El catálogo de fallos

[Modos de fallo](failure-modes.md) documenta cada resultado que no es `confirmed`: qué lo produce,
la salida exacta, por qué ocurre, y qué habría que cambiar para obtener un resultado utilizable.
Cubre la CLI del proveedor sin instalar, la CLI del proveedor sin **sesión iniciada**, el rechazo por
mismo proveedor, el modelo `auto` de Cursor, texto libre en lugar de JSON, respuestas truncadas o
fuera de esquema, códigos de salida de proveedor distintos de cero, tiempos de espera agotados,
truncamiento de salida, e inestabilidad observada de una ejecución a otra.

Léalo antes de integrar. El error de integración más común es tratar el código de salida `11` como
si fuera una sola cosa, cuando en realidad son dos: un `unclear` genuino, o un fallo operativo
disfrazado bajo el mismo texto de veredicto.

## Cómo se siente verificar en la práctica

[Dogfooding](dogfooding.md) es un registro de 26 rondas dedicadas a pasar cinco hallazgos sobre
Xerify por `xerify verify`, contra los canales `codex` y `cursor`. Nueve volvieron `confirmed`,
dos volvieron `refuted` porque una afirmación estaba equivocada, y doce volvieron `unclear`
porque la evidencia no establecía lo que la afirmación aseveraba. Nombra las cuatro categorías
de rechazo, cita las objeciones textualmente, y muestra la forma del sobre que finalmente pasó.

Léalo antes de escribir su primera afirmación. Es la diferencia entre dos rondas y once.

## Ejemplos en vivo

Los cinco escenarios de dominio son sintéticos. No contienen datos reales de participantes,
clientes, analítica ni proyectos. Los dos escenarios dogfood usan evidencia pública del paquete y
del código fuente de Xerify. Las afirmaciones usan procedencia declarada por la CLI; Xerify no
pretende que esa declaración sea una atestación remota.

| Ejemplo                                                                                                | Proveedor de invocación / modelo destino | Observado   | Salida |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------- | -----: |
| [Artículo de investigación](research-paper.md) — el resultado que se afirma nunca se midió             | Anthropic / `claude-fable-5`             | `unclear`   |     11 |
| [Plan de producción de un juego](game-design.md) — la aritmética de capacidad no cierra                | Cursor / `cursor-grok-4.6-high-fast`     | `refuted`   |     10 |
| [Decisión de sitio web](website-decision.md) — la matriz elige la otra opción                          | Anthropic / `claude-fable-5`             | `refuted`   |     10 |
| [Análisis de datos](data-analysis.md) — un agregado que se revierte al estratificar                    | Cursor / `cursor-grok-4.6-high-fast`     | `refuted`   |     10 |
| [Revisión de datos salientes](outbound-data-policy.md) — la seudonimización no es autorización         | Anthropic / `claude-fable-5`             | `refuted`   |     10 |
| [Dogfood: adaptador de Cursor](dogfood-cursor-adapter.md) — Xerify revisa su propio código fuente      | OpenAI / `gpt-5.6-sol`                   | `confirmed` |      0 |
| [Dogfood: límites del paquete de npm](dogfood-package-boundary.md) — qué contiene el paquete publicado | Anthropic / `claude-fable-5`             | `confirmed` |      0 |

Cinco de siete no pasaron. Esa proporción es justamente el punto: un verificador que casi siempre
está de acuerdo no está aportando información.

## Cómo leer un ejemplo

Cada página separa seis partes:

1. **Afirmación** — la proposición que hay que refutar, no una petición de acuerdo.
2. **Reproducir** — el comando exacto, ejecutable tal como está escrito.
3. **Evidencia** — el único material acotado que se envía al proveedor destino.
4. **Resultado normalizado observado** — campos seleccionados después del parser estricto de
   Xerify, nunca la salida cruda del proveedor.
5. **Por qué este veredicto** — qué atacó realmente el verificador, y qué se le habría escapado a
   una comprobación más débil.
6. **Qué lo cambiaría** — la evidencia concreta que movería el resultado, en ambas direcciones.

Los comandos de reproducción consumen cuota. Revise primero el archivo de evidencia, y reemplace
los ID de modelo por los ID exactos disponibles en su cuenta.

## Catálogo legible por máquina

[index.jsonl](../../../examples/index.jsonl) guarda un registro normalizado y compacto por cada ejemplo de
verificación, un objeto JSON por línea. Un agente puede buscar en él antes de abrir cualquier página
en Markdown.

Deliberadamente excluye el transporte crudo del proveedor, los ID de resultado, las duraciones, los
datos de cuenta y sesión, y los campos de costo/uso.

```sh
# Cada ejemplo que no pasó
grep -v '"exitCode":0' docs/examples/index.jsonl

# Todo lo relacionado con datos salientes
grep -i 'outbound' docs/examples/index.jsonl
```

## Archivos de evidencia

[evidence/](../../../examples/evidence/) contiene el material acotado exacto que recibió cada verificación. Estos
archivos son **artefactos de verificación anclados por hash**: el historial de ejecuciones local
guarda un SHA-256 de la evidencia en el momento de la llamada, así que editar un archivo rompe la
correspondencia entre el registro y el documento.

Por eso los archivos de evidencia están **solo en inglés y no se traducen**. Las páginas de texto en
este directorio sí están localizadas; la evidencia a la que hacen referencia, no.

## Lo que estos ejemplos no afirman

- No son una prueba. Un veredicto `confirmed` significa que no se encontró ningún contraejemplo en
  la evidencia suministrada.
- No son reproducibles al pie de la letra. Las versiones de los modelos cambian; dos de las
  ejecuciones aquí necesitaron un segundo intento.
- No son un respaldo a ningún modelo. El nombre de un proveedor nunca es garantía de calidad — vea
  los dos resultados consecutivos con código de salida `6` en el dogfood del adaptador de Cursor.

## Relacionado

- [Índice de documentación](../README.md)
- [Contrato de JSON y códigos de salida](../json-contract.md)
- [Adaptadores de proveedor](../provider-adapters.md)
- [Política de seguridad](../security.md)
