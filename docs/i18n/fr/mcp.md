[English](../../mcp.md) · [Türkçe](../tr/mcp.md) · [Deutsch](../de/mcp.md) · [简体中文](../zh-CN/mcp.md) · [Español](../es/mcp.md) · **Français**

# MCP

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Xerify expose son cœur partagé via le MCP SDK v2. Les transports STDIO et Streamable HTTP utilisent la même fabrique de serveur, les mêmes outils, les mêmes schémas d'entrée et de sortie, le même registre de fournisseurs, et le même chemin d'annulation.

## Outils

| Outil                 | Effet                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `xerify_ask`          | Appelle un fournisseur configuré pour un second avis ouvert. Sémantique de projet en lecture seule, monde ouvert, non idempotent.                |
| `xerify_verify`       | Appelle un fournisseur d'invocation différent et renvoie un verdict strict. Sémantique de projet en lecture seule, monde ouvert, non idempotent. |
| `xerify_capabilities` | Liste les adaptateurs locaux et les métadonnées de capacité du protocole, sans appeler de fournisseur. Lecture seule et idempotent.              |

Les appels au fournisseur peuvent consommer du quota ou entraîner des frais. Les hôtes MCP devraient obtenir l'approbation de l'utilisateur avant d'invoquer `xerify_ask` ou `xerify_verify`.

Un appelant MCP peut déclarer la provenance de l'auteur, mais ne peut pas s'auto-attester `observed`. L'affirmation et le contexte fournis sont traités comme des preuves non fiables ; des instructions intégrées n'altèrent pas la tâche de vérification. Cela atténue, sans pouvoir l'éliminer, le risque d'injection de prompt au niveau du modèle.

Les appels MCP `ask` et `verify` passent par la même enveloppe d'historique locale au projet que la
CLI et la bibliothèque. Le comportement de capture provient de `xverify-config.json` ; aucune trame
de transport MCP brute ni aucun jeton porteur n'est stocké. La gestion de l'historique reste une
surface CLI locale (`xerify runs ...`), pas un outil MCP, si bien qu'un appelant distant ne peut ni
archiver ni supprimer les enregistrements de l'hôte.

Les appelants programmatiques de `createXerifyMcpServer` et `createXerifyMcpFactory` doivent fournir
un `RunHistoryStore`. Utilisez un store explicitement configuré avec `enabled: false` lorsque la
persistance est volontairement désactivée ; une omission n'est jamais interprétée silencieusement
comme une absence d'historique.

## STDIO local

Compilez Xerify ou installez-le globalement, puis configurez un hôte avec un exécutable et un
tableau d'arguments :

```json
{
  "mcpServers": {
    "xerify": {
      "command": "xerify",
      "args": ["mcp", "stdio"]
    }
  }
}
```

Sans installation globale, un hôte MCP peut résoudre directement le paquet npm public :

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.2.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

Figez une version exacte et revue dans une configuration hôte durable ; n'utilisez `@latest` que
lorsque les mises à niveau automatiques constituent une politique délibérée.

Aucune bannière ni aucun diagnostic n'est écrit sur stdout. Les diagnostics vont vers stderr, afin
que le cadrage JSON-RPC reste intact.

Le test de fumée figé valide le serveur compilé avec Inspector `2.2.0`, dans les deux générations de
protocole :

```sh
npm run smoke:mcp
```

Le test fixe `protocolEra` séparément à `modern` puis à `legacy`, et exige que les trois schémas
d'outils soient tous découvrables. Les clients modernes négocient `server/discover` et
`2026-07-28` ; les clients hérités utilisent le chemin de l'ère `initialize`.

## Métadonnées officielles du Registry

Le dépôt de Xerify contient un fichier `server.json`, et le manifeste npm contient le
`mcpName: "io.github.verhexio/xerify"` correspondant. L'entrée du registre identifie `xverify-cli`
comme paquet npm, fige la version du paquet/serveur, déclare le transport STDIO, et fournit les
arguments fixes de `mcp stdio`. Un test de contrat empêche ces champs de diverger.

Le MCP Registry officiel est un canal gratuit de métadonnées de découverte, pas un hôte d'exécution
ni un miroir de paquets. npm doit d'abord contenir la version exacte de Xerify ; c'est seulement
ensuite que le responsable de la publication peut s'authentifier et publier `server.json` avec
`mcp-publisher`. Le Registry étant actuellement un logiciel en préversion, les clients devraient
conserver une configuration npm figée et directe comme repli stable. Voir le [guide de démarrage
officiel du Registry](https://modelcontextprotocol.io/registry/quickstart) et les [règles pour les
paquets
npm](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/package-types.mdx).

## Streamable HTTP

Un fonctionnement en loopback ne nécessite aucun jeton porteur :

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

L'endpoint MCP est `/mcp`. Pour une liaison non loopback, placez un jeton à forte entropie dans une
variable d'environnement et confirmez explicitement la liaison publique :

```sh
XERIFY_MCP_TOKEN='replace-me' xerify mcp http \
  --host 0.0.0.0 \
  --port 8787 \
  --token-env XERIFY_MCP_TOKEN \
  --allow-public
```

Une liaison publique sans à la fois confirmation et authentification est rejetée. Cette frontière
compare les jetons porteurs en temps constant, valide les en-têtes Host et Origin, place
l'authentification dans un contexte de requête MCP typé, et n'inclut jamais le jeton dans la sortie
des commandes ni dans les journaux d'audit.

Le mode à jeton porteur intégré convient à des déploiements maîtrisés. Un service multi-utilisateur
exposé sur Internet, la terminaison TLS, la politique d'autorisation, le cycle de vie OAuth, la
limitation de débit et la gestion durable de locataires relèvent d'une frontière de déploiement en
amont de Xerify ; le serveur local ne les implique en rien.

Pour le choix du canal, le comportement des abonnements/API, le fonctionnement local sans coût, et
la voie distante évaluée sur Cloudflare Workers, voir [fournisseurs et canaux d'accès](channels.md).
Un hébergement gratuit ne rend pas l'inférence fournisseur gratuite pour autant, et n'autorise pas
une garde centrale des identifiants d'abonnement locaux.
