[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Política de seguridad

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

## Cómo reportar

No abra un issue público ante una vulnerabilidad sospechada o una credencial expuesta por accidente.
Use el [reporte privado de vulnerabilidades de
GitHub](https://github.com/VerhexIO/xerify/security/advisories/new). Incluya la versión afectada, el
impacto, los pasos de reproducción y cualquier mitigación sugerida; omita credenciales activas y
payloads sensibles de producción.

Antes del primer release firmado, ninguna versión cuenta con soporte público. Después del
lanzamiento, la línea de release menor más reciente recibirá parches de seguridad; la tabla de
soporte se actualizará aquí.

## Modelo de seguridad

Xerify trata tanto la evidencia suministrada como la salida del proveedor como datos no confiables.
Los prompts de verificación clasifican explícitamente la afirmación y el contexto como evidencia, no
como instrucciones, y exigen una falsación adversarial. Esto reduce el riesgo de confusión de
instrucciones, pero no vuelve a un LLM inmune a la inyección de prompt. Xerify nunca ejecuta la
salida del modelo ni evalúa ninguna cadena de shell configurada. Los adaptadores de proceso lanzan un
único ejecutable con un arreglo de argumentos y `shell: false`, reenvían un entorno de lista blanca,
envían el prompt/contexto por stdin, acotan stdout/stderr, y terminan el árbol de procesos ante un
tiempo de espera agotado o una cancelación.

El orden efectivo de instrucciones es: el contrato de verificación de Xerify, la operación elegida,
el alcance de evidencia aprobado por el propietario, y solo después la afirmación/contexto no
confiable. Ningún texto dentro de código, diffs, logs, comentarios, documentos o salida previa del
modelo puede cambiar legítimamente la tarea, las reglas del veredicto, o el esquema de respuesta. El
modelo puede, aun así, manejar mal ese límite, así que la validación de esquema en el núcleo y los
resultados fail-closed siguen siendo obligatorios.

Los adaptadores oficiales por CLI no corren desde el repositorio del usuario. Codex usa un sandbox
efímero de solo lectura, con las reglas/configuración del usuario ignoradas. Claude usa un directorio
temporal nuevo en modo `0700`, modo seguro, sin herramientas, sin comandos de barra y sin
persistencia de sesión. Cursor usa un espacio de trabajo nuevo en modo `0700`, el modo ask de solo
lectura, y su propio sandbox. Cursor Agent no expone actualmente ningún interruptor que desactive de
forma categórica todos los servidores MCP configurados a nivel de cuenta; esto es un límite residual,
no una garantía oculta. Los adaptadores de API directa no tienen acceso al sistema de archivos ni a
herramientas locales. Un adaptador `command` genérico es código configurado explícitamente por el
propietario, corre por defecto desde un directorio temporal nuevo, y aun así hereda la seguridad de
ese ejecutable y de su entorno permitido.

Los secretos de API directa deberían leerse de variables de entorno nombradas. Para instalaciones
básicas de un solo usuario, los adaptadores HTTP directos también aceptan un respaldo explícito
`apiKey` literal; la variable de entorno gana cuando existen ambas. Las URL de `endpoint` del
proveedor también son sensibles, porque pueden llevar credenciales embebidas en la información de
usuario, la ruta, los valores de query o el fragmento. La configuración queda excluida de Git por
defecto; una configuración con clave literal o con endpoint explícito se rechaza en POSIX salvo que
esté en modo `0600`; y al inspeccionar la configuración, tanto las claves literales como los valores
completos de endpoint se reemplazan por `[REDACTED]`. En Windows hay que aplicar una ACL exclusiva
del propietario. Prefiera variables de entorno de clave nombradas en lugar de credenciales incluidas
en la URL. Un endpoint compatible con información de usuario, parámetros de query o un fragmento —y
cualquier endpoint remoto sin una declaración explícita de clave— informa la autenticación como
desconocida (`unknown`), en vez de asumir que no hace falta ninguna. Los almacenes de credenciales de
las CLI oficiales solo se usan a través de la CLI oficial. El JSONL opcional de auditoría excluye los
prompts, el contexto, las respuestas, los findings, los payloads crudos del proveedor, los datos de
autorización y las rutas de credenciales. Los archivos de log nuevos en POSIX usan modo `0600` y
`O_NOFOLLOW`; en todas las plataformas se rechaza abrir un destino que no sea un archivo regular.
Windows no ofrece la misma garantía atómica de no seguir enlaces, así que los registros de auditoría
deben ubicarse en un directorio controlado por el propietario.

El estado del proyecto vive bajo `.xerify/`; un ciclo de vida protegido de instalación directa, o
`xerify init`, crea `.xerify/xverify-config.json`, directorios privados de log/ejecuciones/archivo, y
protección de exclusión en el `.gitignore`, `.npmignore` y `.dockerignore` de la raíz del proyecto.
Estas protecciones son defensa en profundidad, no control de acceso: forzar manualmente archivos
hacia Git, npm o el contexto de un contenedor todavía puede exponerlos.

El historial de ejecuciones es, a propósito, más detallado que el registro de auditoría (que sí es
seguro respecto a secretos). Con el valor por defecto `captureInput: "full"`, las afirmaciones, las
preguntas y el contexto suministrado se guardan localmente en `.xerify/runs`; los resultados
normalizados pueden contener findings redactados por el proveedor. Las respuestas crudas de
transporte, los datos de autenticación y las instantáneas de entorno nunca se escriben. Use los modos
de captura `metadata` o `none` para proyectos sensibles, restrinja el acceso al sistema de archivos,
y aplique una política de retención/eliminación. `runs show` exige `--include-evidence` antes de
imprimir el contenido de la evidencia. Cada ejecución también tiene un `head` acotado de
descubrimiento: con captura `full` contiene un adelanto corto de la afirmación o la pregunta, con
captura `metadata` contiene solo un hash, y con captura `none` no contiene ningún contenido derivado
de la entrada. Las ejecuciones archivadas se pueden descubrir a través de
`.xerify/archive/index.jsonl`; ese índice contiene el `head` acotado y metadatos operativos, nunca el
contexto, las respuestas, los findings, el cuerpo de la evidencia ni la salida cruda del proveedor.
Su hash de registro ayuda a ubicar y comparar una instantánea, pero el índice no es un registro
inalterable frente a procesos que corren como el mismo usuario. Prefiera `xerify runs search` o
el índice antes de abrir los registros completos que coincidan.
El ciclo de vida nunca sobrescribe, no hace ninguna llamada de red o de proveedor, y se salta las
instalaciones globales, transitivas anidadas, sin guardar dependencia, o por `npx`. La ambigüedad de
npm entre instalación directa y transitiva en la primera instalación queda documentada; quienes
integren Xerify pueden definir `XERIFY_SKIP_AUTO_INIT=1`. No fuerce la inclusión del estado del
proyecto en el control de versiones, ni debilite las reglas de exclusión generadas.

Streamable HTTP usa loopback por defecto, valida los encabezados Host y Origin, y exige confirmación
explícita más autenticación bearer para los enlaces fuera de loopback. Quien opera el servicio sigue
siendo responsable de TLS, la rotación de secretos, la política de red, la limitación de tasa, la
autorización multiusuario y la recolección segura de logs.

## Limitaciones

Un veredicto `confirmed` significa que el verificador no encontró ningún contraejemplo relevante
dentro de la evidencia suministrada, y que reportó sus limitaciones; no es una garantía de seguridad,
ni una verificación formal, ni un permiso para ejecutar un cambio. Una revisión entre proveedores
distintos todavía puede compartir linaje de modelo, datos de entrenamiento, puntos ciegos o contexto
comprometido. Las referencias de evidencia son punteros informados por el modelo, no citas validadas.
Mantenga acotadas las entradas sensibles, y revise todos los findings de forma independiente.

La separación de proveedores se basa en el servicio de invocación, facturación y control. Un modelo
al que se llega a través de Cursor es `cursor`, aunque su ID de catálogo mencione GPT, Claude o
Gemini. Por eso, una llamada directa al fabricante y una llamada a través de Cursor pueden satisfacer
la comprobación de proveedor y, aun así, usar un linaje de modelo upstream relacionado o idéntico.
Trate la diversidad de canal como defensa en profundidad, nunca como prueba de independencia de
modelo.

Ninguna técnica basada solo en el prompt puede prevenir la inyección por completo. Antes de una
llamada real, revise el alcance exacto y acotado que va por stdin; excluya credenciales, volcados de
entorno, datos de clientes, código fuente no relacionado y almacenes de autenticación. Prefiera diffs
generados o salida de pruebas antes que un repositorio entero. Mantenga confiables y actualizados la
CLI del proveedor, las extensiones, los plugins, la configuración MCP y la política de la cuenta.
Trate `unclear`, un truncamiento, una salida estructurada inválida, un tiempo de espera agotado o un
fallo del adaptador como casos sin éxito, y exija pruebas independientes antes de actuar sobre
cualquier veredicto.
