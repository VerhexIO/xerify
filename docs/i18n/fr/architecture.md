[English](../../architecture.md) · [Türkçe](../tr/architecture.md) · [Deutsch](../de/architecture.md) · [简体中文](../zh-CN/architecture.md) · [Español](../es/architecture.md) · **Français**

# Architecture

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Ce guide, les décisions acceptées sous `docs/decisions/`, les schémas publics et leurs contrats
testés constituent, ensemble, l'autorité vivante de Xerify en matière de produit et d'architecture.
Un comportement n'est pas public au seul motif qu'il figure dans une note interne ; la documentation
doit correspondre au chemin réellement implémenté et testé.

Xerify est un unique paquet ESM offrant quatre surfaces publiques — la CLI, la bibliothèque, le MCP
en STDIO et le MCP Streamable HTTP — au-dessus d'un seul chemin d'exécution central.

```text
CLI ─┐
MCP ─┼──> core contracts + execution ──> provider SPI ──> adapters
SDK ─┘                    │                    │
                         └── typed results    └── process/platform or bounded HTTP
```

## Frontières entre modules

- `src/core` possède les requêtes/résultats publics, les prompts, l'application de la règle des
  fournisseurs différents, l'analyse du verdict, les types d'erreur, les limites, et la projection
  d'audit.
- `src/providers` implémente un contrat d'adaptateur neutre ainsi que les adaptateurs CLI/API/commande
  intégrés. Il n'importe jamais le rendu de la CLI.
- `src/process` et `src/platform` possèdent la résolution des exécutables, la liste blanche
  d'environnement, les flux bornés, le timeout/l'annulation, et la terminaison de l'arbre de
  processus.
- `src/config` analyse un JSON strict depuis `.xerify/xverify-config.json`, enregistre la source de
  chaque champ résolu, masque les clés API littérales optionnelles, et initialise l'état privé du
  projet ainsi que les métadonnées de journal, sans jamais écraser les fichiers existants.
- `src/history` enregistre directement les exécutions actives, alloue des identités monotones via un
  unique `HEAD.json` atomique, et maintient un index d'archive en ajout seul, conforme à la
  politique de capture, pour la recherche par un humain ou un agent.
- `src/cli` fait correspondre les commandes au cœur, et affiche soit une sortie destinée à un
  humain, soit une unique enveloppe JSON stable.
- `src/mcp` enregistre les mêmes schémas Zod et les mêmes fonctions du cœur auprès du MCP SDK v2.
  L'authentification HTTP reste à la frontière du transport.

La racine du paquet exporte le cœur, la configuration, les adaptateurs et les fabriques MCP pour un
usage programmatique. Les fixtures de test ne sont jamais importées par le code de production.

## Flux d'une requête

1. Une validation stricte de l'entrée, que ce soit via la CLI, la bibliothèque ou MCP, établit
   l'identité fournisseur/modèle ainsi que les limites d'octets et de temps. Un appelant public ne
   peut pas s'auto-attester `observed` ; l'identité de la cible doit être `declared`.
2. La vérification rejette une provenance inconnue et des identités de fournisseur d'invocation
   identiques, avant même la résolution de l'adaptateur.
3. Le registre choisit un identifiant d'adaptateur explicite lorsqu'il est fourni, ou sinon un
   adaptateur configuré pour l'identité de fournisseur cible.
4. L'adaptateur invoque soit un exécutable avec `shell: false`, soit une requête HTTP bornée. Le
   prompt et le contexte n'entrent jamais dans des arguments shell.
5. La sortie du fournisseur est bornée en octets et normalisée. Un schéma structuré compatible avec
   le fournisseur est dérivé des définitions de champs Zod canoniques ; la validation du cœur
   applique ensuite toutes les bornes.
6. Le cœur renvoie un `AskResult` ou un `VerifyResult` complet ; tout échec survenant après
   l'admission du fournisseur devient un résultat `unclear` honnête, avec un `failure` typé et un
   code de sortie propre à la cause.
7. La journalisation d'audit JSONL, optionnelle, ne projette que des métadonnées. Le prompt, le
   contexte, la réponse, les résultats détaillés, la réponse brute, les en-têtes et les valeurs
   secrètes en sont exclus.

## Frontières de confiance

L'affirmation, le contexte et la sortie du fournisseur sont tous non fiables. Le vérificateur reçoit
pour instruction de traiter le matériel fourni comme une preuve, de tenter de la falsifier, et
d'ignorer toute commande intégrée, tout changement de rôle, toute directive de verdict, et tout
changement de schéma. Il s'agit d'une atténuation pour l'intégrité de l'évaluation, pas d'une
garantie contre l'injection de prompt. Xerify n'évalue jamais la sortie d'un fournisseur comme une
commande, un fichier source, une instruction MCP ou une configuration. Les clés API directes se
résolvent d'abord via une variable d'environnement nommée, puis via un repli littéral explicitement
configuré ; les diagnostics n'exposent jamais ni l'une ni l'autre. Les stockages d'authentification
des CLI officielles ne sont accédés qu'à travers l'exécutable officiel ; Xerify ne les analyse ni ne
les copie jamais.

Les adaptateurs Codex et Claude figent dans le code les identités de fournisseur d'invocation
`openai` et `anthropic`. Cursor fige `cursor`, quel que soit le modèle amont désigné par son
identifiant exact ; `auto` est rejeté parce qu'il ne peut pas préserver la provenance du modèle. Les
étiquettes `command` et `openai-compatible` sont des déclarations contrôlées par le propriétaire, pas
des attestations distantes ; leur garantie de séparation entre fournisseurs ne vaut donc que ce que
vaut cette configuration.

La séparation des fournisseurs mesure la diversité du plan d'invocation, de facturation et de
contrôle. Elle ne prouve pas que deux canaux utilisent des éditeurs de modèle, des poids, des données
d'entraînement ou des angles morts différents. OpenAI en direct et un modèle GPT via Cursor sont deux
fournisseurs d'invocation distincts, mais peuvent partager la même lignée de modèle.

Les adaptateurs de commande officiels s'exécutent depuis de nouveaux espaces de travail temporaires
et restrictifs, plutôt que depuis le dépôt de l'utilisateur. Codex ignore les règles et la
configuration utilisateur, et reste en lecture seule ; Claude désactive les personnalisations, les
outils, les commandes slash et la persistance ; Cursor utilise son mode ask en lecture seule, ainsi
que son bac à sable. L'absence, chez Cursor, d'un indicateur désactivant catégoriquement le MCP au
niveau du compte reste un risque résiduel documenté.

Le stdout de STDIO est réservé aux trames MCP. Streamable HTTP fonctionne en loopback par défaut, et
valide les en-têtes Host et Origin. Une liaison publique exige un indicateur explicite et une
authentification par jeton porteur.

## Compatibilité

- Plancher de runtime : Node.js 20 ; runtime de développement principal : Node.js 24.
- Version du schéma public : `1`.
- Version majeure du MCP SDK : `2` ; révision moderne du protocole : `2026-07-28` ; les clients
  hérités restent servis.
- Les champs publics existants ne peuvent être supprimés ni réinterprétés sans une version avec
  rupture de compatibilité. Les champs optionnels additifs sont autorisés.

La décision sur les résultats de commande, et sa justification, sont consignées dans l'[ADR
0001](../../decisions/0001-command-outcomes.md). L'identité de fournisseur d'invocation est fixée par
l'[ADR 0002](../../decisions/0002-invocation-provider-identity.md).
