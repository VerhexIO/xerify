[English](../../channels.md) · [Türkçe](../tr/channels.md) · [Deutsch](../de/channels.md) · [简体中文](../zh-CN/channels.md) · [Español](../es/channels.md) · **Français**

# Fournisseurs et canaux d'accès

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Xerify distingue deux dimensions indépendantes : la surface qui reçoit une requête, et l'adaptateur
qui atteint un vérificateur. La CLI, la bibliothèque, le MCP en STDIO et le MCP Streamable HTTP
appellent tous le même cœur ; choisir MCP ne change ni l'identité du fournisseur, ni la facturation,
ni le schéma, ni la sémantique des codes de sortie ou des verdicts.

## Canaux d'adaptateur

| Canal                  | Propriétaire de l'authentification                         | Lieu d'exécution          | Meilleur usage                                        | Limite principale                                              |
| ---------------------- | ---------------------------------------------------------- | ------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| Abonnement Codex CLI   | connexion `codex` officielle ou `CODEX_API_KEY`            | machine de l'utilisateur  | cibler OpenAI sans copier un identifiant d'abonnement | nécessite une CLI installée et authentifiée                    |
| Abonnement Claude CLI  | connexion `claude` officielle, jeton OAuth, ou clé API     | machine de l'utilisateur  | cibler Anthropic via `claude -p`                      | nécessite une CLI installée et authentifiée                    |
| Abonnement Cursor      | `agent login` officiel ou `CURSOR_API_KEY`                 | machine de l'utilisateur  | tout identifiant de modèle exact exposé par Cursor    | le fournisseur est `cursor` ; la lignée amont peut se recouper |
| API OpenAI directe     | variable d'environnement nommée ; repli littéral optionnel | tout runtime de confiance | automatisation/déploiement serveur                    | facturation API et garde des secrets                           |
| API Anthropic directe  | variable d'environnement nommée ; repli littéral optionnel | tout runtime de confiance | automatisation/déploiement serveur                    | facturation API et garde des secrets                           |
| HTTP OpenAI-compatible | variable d'environnement ou clé littérale, optionnelles    | endpoint local ou distant | modèles locaux et passerelles compatibles             | l'étiquette de fournisseur est contrôlée par le propriétaire   |
| Commande générique     | liste blanche d'environnement explicite                    | machine de l'utilisateur  | un autre exécutable de vérification local             | l'exécutable est un code de confiance du propriétaire          |

L'exécution par abonnement reste sur la machine de l'utilisateur. Xerify ne lit jamais le stockage de
jetons ou de cookies d'une CLI ; c'est l'exécutable officiel qui gère sa propre connexion. Un service
Xerify distant ne peut pas réutiliser comme par magie l'abonnement local d'un utilisateur : installez
le serveur STDIO localement, ou utilisez un adaptateur d'API directe avec une politique de clé
explicite côté serveur.

## Exemples CLI

D'un artefact OpenAI vers un abonnement Claude :

```sh
git diff --cached | xerify --json verify \
  --from openai:EXACT_AUTHOR_MODEL \
  --to anthropic:EXACT_CLAUDE_MODEL \
  --adapter claude \
  --claim "The patch closes the reported race without regression"
```

D'un artefact Anthropic vers un abonnement Codex :

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to openai:EXACT_CODEX_MODEL \
  --adapter codex \
  --claim "The patch closes the reported race without regression"
```

D'un artefact Anthropic vers un modèle exact via Cursor :

```sh
git diff --cached | xerify --json verify \
  --from anthropic:EXACT_AUTHOR_MODEL \
  --to cursor:EXACT_CURSOR_MODEL \
  --adapter cursor \
  --claim "The patch closes the reported race without regression"
```

Les appels d'API directe utilisent la même commande et produisent le même résultat. Seul `--adapter`
change, par exemple `--adapter openaiApi` ou `--adapter anthropicApi`. Les identifiants de modèle
restent toujours explicites.

Cette version ne propose aucun adaptateur d'abonnement pour une CLI Gemini. Un modèle nommé Gemini
sélectionné via Cursor reste `cursor:EXACT_MODEL_ID` ; un futur adaptateur direct pour l'API ou la
CLI Google utiliserait `google`.

## Surfaces MCP

Le STDIO local est le canal MCP recommandé à coût d'hébergement nul, et c'est la seule surface
d'outil distant qui préserve naturellement les abonnements CLI locaux :

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@latest", "xerify", "mcp", "stdio"]
    }
  }
}
```

Pour une configuration figée et dont la chaîne d'approvisionnement reste vérifiable, installez une
version fixe et utilisez son binaire résolu plutôt que `npx -y ...@latest`. `xerify_capabilities`
n'est jamais facturable ; `xerify_ask` et `xerify_verify` peuvent consommer du quota fournisseur.

Le MCP Streamable HTTP en loopback est lui aussi gratuit à exploiter sur la machine de l'utilisateur.
Une exposition HTTP sur Internet exige TLS, authentification, autorisation, limitation de débit,
garde des secrets et une politique de fournisseur limitée à l'API ; il ne doit jamais devenir un
relais pour des identifiants d'abonnement locaux.

## Distribution MCP gratuite et hébergement futur

La voie de distribution retenue, à coût d'hébergement nul, combine npm et le MCP Registry officiel.
Le Registry stocke des métadonnées de découverte et de lancement, et pointe vers le paquet npm public
`xverify-cli` ; il n'héberge pas le code de Xerify. Le fichier `server.json` du dépôt fixe la version
du paquet, le transport STDIO, et les arguments de lancement `mcp stdio`. Le `mcpName` correspondant
dans le paquet prouve l'association entre npm et le Registry. Le Registry étant encore en préversion,
une entrée hôte figée `npx -y --package=xverify-cli@<version> xerify mcp stdio` reste le repli
déterministe. Voir le [guide de démarrage officiel du
Registry](https://modelcontextprotocol.io/registry/quickstart) et les [règles de type de
paquet](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx).

Ce canal de distribution correspond à une exécution locale : pas de compte d'hébergement, pas
d'accès public entrant, et pas de stockage central d'identifiants. Si Verhex a un jour besoin d'un
MCP public adossé à une API, Cloudflare Workers reste la cible d'évaluation retenue, car son Agents
SDK officiel prend en charge le MCP Streamable HTTP et le plan gratuit de Workers offre un palier
gratuit borné. Voir le [guide officiel du MCP
distant](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)
de Cloudflare et la [tarification de
Workers](https://developers.cloudflare.com/workers/platform/pricing/). Il s'agit d'un élément de
feuille de route de déploiement, pas d'une affirmation selon laquelle l'écouteur Node actuel pourrait
être téléversé tel quel.

Un Worker ne peut pas démarrer la CLI locale Codex/Claude/Cursor d'un utilisateur. La variante
distante n'admettrait donc que des adaptateurs d'API directe, exigerait une autorisation OAuth à
portée limitée, appliquerait un principe de fail-closed aux limites de la plateforme, et garderait
les frais de fournisseur séparés du coût d'hébergement. Aucun vérificateur Xerify public sans
authentification ne sera jamais publié.
