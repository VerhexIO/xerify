[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) · [简体中文](../zh-CN/README.md) · [Español](../es/README.md) · **Français**

# Documentation Xerify

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

L'anglais reste la langue de référence pour les schémas publics, les ADR, la politique de sécurité
et les preuves de vérification immuables. Les manuels traduits couvrent l'ensemble du flux de
travail utilisateur, mais conservent tels quels les noms de commandes, les champs JSON, les
identifiants de fournisseur et de modèle, les codes de sortie et les clés de configuration. Si une
traduction s'écarte d'un contrat testé, c'est ce dernier, en anglais, qui fait foi ; merci de
signaler l'écart constaté.

## Guides utilisateur

- [Installation et mises à niveau](installation.md)
- [Configuration du projet](configuration.md)
- [Référence CLI](cli-reference.md)
- [Adaptateurs de fournisseurs](provider-adapters.md)
- [Fournisseurs et canaux d'accès](channels.md)
- [Contrat JSON et codes de sortie](json-contract.md)
- [Historique local des exécutions](run-history.md)
- [MCP](mcp.md)
- [Limites de compatibilité et de support](compatibility.md)
- [Architecture](architecture.md)
- [Exemples de vérification commentés](examples/README.md)
- [Parcours sans compte fournisseur](examples/no-account-walkthrough.md) — tous les résultats possibles, sans consommer le moindre quota
- [Modes d'échec](examples/failure-modes.md) — chaque échec typé, sa cause et sa correction
- [Politique de sécurité](security.md)

## Ressources normatives et lisibles par machine

- [Décisions d'architecture acceptées](../../decisions/)
- [Schémas JSON publiés](../../../schemas/)
- [Index des exemples lisible par machine](../../examples/index.jsonl)
- [Preuves immuables des exemples](../../examples/evidence/) — en anglais uniquement, ancrées par hachage
- [Fournisseur simulé déterministe](../../../tools/mock-provider.mjs)

Le produit s'appelle **Xerify**, le paquet distribué sur npm est **`xverify-cli`**, et l'exécutable
installé est **`xerify`**.
