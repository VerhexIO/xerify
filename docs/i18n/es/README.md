[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · **Español** · [Français](../fr/README.md)

# Documentación de Xerify

> La documentación en inglés es la fuente canónica y normativa. Si una traducción discrepa de un contrato ya probado, prevalece el contrato en inglés probado.

El inglés es el idioma canónico de los esquemas públicos, las ADR, la política de seguridad y la evidencia de verificación inmutable. Los manuales traducidos cubren todo el flujo de trabajo del usuario sin tocar los nombres de comandos, los campos JSON, los identificadores de proveedor y modelo, los códigos de salida ni las claves de configuración: esos se conservan tal como están en inglés. Ante cualquier discrepancia con un contrato ya probado, gana el contrato en inglés; si encuentra una, repórtela.

## Guías del usuario

- [Instalación y actualizaciones](installation.md)
- [Configuración del proyecto](configuration.md)
- [Referencia de la CLI](cli-reference.md)
- [Adaptadores de proveedor](provider-adapters.md)
- [Proveedores y canales de acceso](channels.md)
- [Contrato de JSON y códigos de salida](json-contract.md)
- [Historial de ejecuciones local](run-history.md)
- [MCP](mcp.md)
- [Límites de compatibilidad y soporte](compatibility.md)
- [Arquitectura](architecture.md)
- [Ejemplos de verificación resueltos](examples/README.md)
- [Tutorial sin cuenta](examples/no-account-walkthrough.md) — todos los resultados posibles sin gastar cuota de ningún proveedor
- [Modos de fallo](examples/failure-modes.md) — cada fallo tipificado, su causa y cómo resolverlo
- [Dogfooding](examples/dogfooding.md) — 26 rondas de verificación contra dos canales, y qué se rechazó
- [Política de seguridad](security.md)

## Material normativo y legible por máquina

- [Decisiones de arquitectura aceptadas](../../decisions/)
- [Esquemas JSON publicados](../../../schemas/)
- [Índice de ejemplos legible por máquina](../../examples/index.jsonl)
- [Evidencia de ejemplo inmutable](../../examples/evidence/) — solo en inglés, anclada por hash
- [Proveedor simulado determinista](../../../tools/mock-provider.mjs)

El producto se llama **Xerify**, el paquete de npm es **`xverify-cli`**, y el ejecutable instalado es **`xerify`**.
