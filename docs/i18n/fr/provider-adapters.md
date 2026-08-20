[English](../../provider-adapters.md) · [Türkçe](../tr/provider-adapters.md) · [Deutsch](../de/provider-adapters.md) · [简体中文](../zh-CN/provider-adapters.md) · [Español](../es/provider-adapters.md) · **Français**

# Adaptateurs de fournisseurs

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Xerify identifie un fournisseur par son service d'invocation, de facturation et de contrôle. Cursor
Agent est toujours `cursor`, quel que soit le modèle amont désigné par son identifiant exact. L'accès
direct à Codex/OpenAI est `openai`, et l'accès direct à Claude/Anthropic est `anthropic`.

Cette frontière mesure la diversité des canaux, pas l'indépendance vis-à-vis de l'éditeur du modèle
ou de sa lignée. OpenAI en direct et GPT via Cursor sont admis comme deux fournisseurs distincts,
mais peuvent partager les mêmes angles morts en amont.

Chaque adaptateur intégré renvoie le même `InvokeResult` borné. Les valeurs d'usage proviennent
uniquement de la réponse du fournisseur. Les champs de jetons ou de coût absents restent `null` ;
Xerify ne les estime jamais.

Les adaptateurs officiels figent l'identité de fournisseur d'invocation dans le code. Pour les
adaptateurs `command` et `openai-compatible`, cette identité relève d'une configuration contrôlée par
le propriétaire plutôt que d'une attestation distante ; pour eux, la garantie de séparation entre
fournisseurs ne vaut donc que ce que vaut cette configuration.

## Matrice des adaptateurs intégrés

| Type d'adaptateur   | Identité de fournisseur | Transport                         | Authentification                                                           | Vérification structurée                                  |
| ------------------- | ----------------------- | --------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `codex`             | `openai`                | CLI `codex` officielle            | connexion CLI existante ou `CODEX_API_KEY`                                 | `codex exec --output-schema`                             |
| `claude`            | `anthropic`             | CLI `claude` officielle           | connexion CLI existante, `ANTHROPIC_API_KEY`, ou `CLAUDE_CODE_OAUTH_TOKEN` | `claude -p --json-schema`                                |
| `cursor`            | `cursor`                | CLI `agent` Cursor officielle     | connexion Cursor existante ou `CURSOR_API_KEY`                             | contrat de prompt ; validation par le cœur               |
| `openai-api`        | `openai`                | API Responses                     | variable d'environnement en priorité ; repli littéral optionnel            | `text.format.type=json_schema`, strict                   |
| `anthropic-api`     | `anthropic`             | API Messages                      | variable d'environnement en priorité ; repli littéral optionnel            | `output_config.format.type=json_schema`                  |
| `openai-compatible` | configurée              | HTTP compatible chat-completions  | variable d'environnement ou clé littérale, optionnelles                    | `response_format.type=json_schema`                       |
| `command`           | configurée              | exécutable et tableau d'arguments | liste blanche d'environnement configurée                                   | contrat de prompt ; la réponse reste validée par le cœur |

Les références officielles utilisées par ces adaptateurs sont le [guide non interactif de
Codex](https://learn.chatgpt.com/docs/non-interactive-mode), la [référence CLI de Claude
Code](https://code.claude.com/docs/en/cli-reference), le [guide de sortie structurée
d'OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs), et le [guide de sortie
structurée d'Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
Le comportement de Cursor suit la [présentation officielle de la CLI
Agent](https://cursor.com/docs/cli/overview) et la [référence des paramètres
CLI](https://cursor.com/docs/cli/reference/parameters).

## CLI Codex

Exécutable : `codex`. Xerify envoie le prompt sur l'entrée standard et invoque `codex exec` avec une
session éphémère, un bac à sable en lecture seule, les règles et la configuration utilisateur
ignorées, des événements JSONL, et un fichier de schéma de sortie exact pour la vérification. Ce
fichier de schéma réside dans un répertoire temporaire en mode `0600` et est supprimé dans un bloc
`finally`.

Le dernier message d'agent `item.completed` devient la sortie du fournisseur. `turn.completed.usage`
fournit `input_tokens` et `output_tokens` ; le coût reste `null`. Un événement d'erreur, un tour
échoué, un code de sortie non nul, un timeout ou une annulation ne sont jamais rapportés comme une
réponse réussie.

`xerify providers probe --provider codex` résout l'exécutable et exécute `codex login status`. Elle
n'effectue aucune requête de modèle.

## CLI Claude

Exécutable : `claude`. Xerify utilise le mode d'impression avec sortie JSON, la persistance de
session désactivée, aucun outil, les commandes slash désactivées, une gestion des permissions non
interactive, et le mode sûr. Chaque appel s'exécute depuis un nouveau répertoire temporaire en mode
`0700`, plutôt que depuis le projet de l'utilisateur. La vérification fournit le schéma JSON
canonique via `--json-schema` ; le résultat du fournisseur provient de `structured_output`.

`usage.input_tokens`, `usage.output_tokens` et `total_cost_usd` sont récupérés lorsqu'ils sont
présents. Un sous-type autre que succès, ou un code de sortie non nul, constitue un échec du
fournisseur. `xerify providers probe --provider claude` exécute `claude auth status --json` sans
appeler de modèle.

Le schéma strict de génération est dérivé des définitions de champs Zod canoniques, dépouillé des
contraintes de validation que le fournisseur ne prend pas en charge. La validation Zod du cœur
réapplique toutes les bornes une fois la réponse reçue.

## CLI Cursor Agent

Exécutable : `agent`. Cursor est l'identité de fournisseur d'invocation pour tout modèle atteint via
Cursor Agent :

```json
{
  "providers": {
    "cursor": { "kind": "cursor", "provider": "cursor", "executable": "agent" }
  }
}
```

Exécutez `agent models` et passez l'un des identifiants exacts listés sous la forme
`cursor:MODEL_ID`. Xerify traite cet identifiant de modèle comme un identifiant opaque du catalogue
Cursor, et n'infère jamais l'identité du fournisseur à partir de préfixes tels que `gpt-`, `claude-`
ou `gemini-`. `auto` est rejeté avant tout appel, car il ne peut pas préserver dans la provenance le
modèle exact utilisé ; les identifiants explicites Composer, Kimi, GLM, GPT, Claude, Gemini et Grok
sont admissibles dès lors que le compte Cursor installé les expose.

Cette version ne propose aucun adaptateur direct par abonnement pour une CLI Gemini. Un modèle
Gemini hébergé par Cursor reste une invocation Cursor. Un futur adaptateur direct pour l'API ou la
CLI Google porterait l'identité `google`.

L'adaptateur envoie le prompt sur l'entrée standard et utilise `agent -p --mode ask --sandbox
enabled` avec sortie JSON. Il n'accorde sa confiance qu'à un nouvel espace de travail temporaire
vide, en mode `0700`, fourni explicitement, puis supprimé dans un `finally`. Cursor n'expose aucun
indicateur de sortie en JSON Schema : c'est donc le prompt de vérification qui porte le contrat
canonique, et Xerify valide le `result` renvoyé avec le même schéma Zod du cœur. Une réponse en prose
invalide, ou un bloc JSON mal formé, devient un `unclear` fail-closed ; elle n'est jamais convertie
en `confirmed`.

La CLI Cursor actuelle ne propose aucun indicateur désactivant catégoriquement tous les serveurs MCP
configurés par l'utilisateur. Le mode ask est en lecture seule et l'espace de travail est vide, mais
le comportement de Cursor au niveau du compte reste une frontière de confiance résiduelle. N'envoyez
pas de secrets et n'exécutez pas cet adaptateur sous un compte Cursor dont les extensions ou la
configuration MCP globales ne sont pas fiables. `xerify providers probe --provider
<cursor-adapter-id>` exécute `agent status` sans appeler de modèle, et n'analyse ni n'affiche
l'identité du compte.

Le respect de la sortie structurée dépend du modèle et de la version, car Cursor n'expose aucun
indicateur imposant le schéma. Sur Linux x64 avec Cursor Agent `2026.08.11-e8db854`, les modèles
exacts `cursor-grok-4.6-high-fast` et `gpt-5.6-sol-high` ont réussi le contrat fixe
d'injection/réfutation ; `gpt-5.6-sol-high` a également mené à bien une vérification bornée sur du
code du cœur. Sur cette même fenêtre de preuves, `claude-sonnet-5-high` et
`claude-sonnet-5-thinking-high` ont renvoyé une sortie qui a échoué au schéma strict de Xerify, et
sont donc restés en `unclear` typé, code de sortie `6`. Il s'agit d'une matrice honnêtement observée,
pas d'une promesse universelle valable pour toute une famille de modèles ou une future version de
Cursor.

## API directes

L'adaptateur OpenAI envoie une requête POST vers `/v1/responses` avec `store: false`. L'adaptateur
Anthropic envoie une requête POST vers `/v1/messages` avec `anthropic-version: 2023-06-01`. Les
prompts sont bornés en octets avant l'envoi, les réponses sont bornées en flux, et
l'annulation/le timeout utilisent `AbortSignal`.

Chez Anthropic, atteindre `max_tokens` constitue une réponse invalide/incomplète, et `refusal` est un
échec du fournisseur non réessayable. Côté OpenAI, une réponse dont le statut n'est pas `completed`,
une réponse sans le bloc de sortie attendu, un JSON mal formé, et une sortie structurée tronquée,
sont tous des échecs typés.

Les clés API se résolvent d'abord via la variable d'environnement configurée. Les adaptateurs d'API
directe n'acceptent une valeur littérale `apiKey` qu'en repli, pour une installation locale
mono-utilisateur simple. Une telle configuration est ignorée par Git par défaut, doit être en mode
`0600` sous POSIX, et est masquée dans `config show`/`validate` ; les clés ne sont jamais renvoyées
par `health`/`doctor`, jamais placées dans les prompts envoyés au fournisseur, et jamais écrites dans
les journaux d'audit.

Les valeurs complètes d'`endpoint` configurées sont elles aussi masquées dans la sortie de
configuration, et rendent le mode du fichier sensible sous POSIX. Cela évite un masquage partiel
dangereux d'identifiants pouvant être intégrés n'importe où dans une URL. Pour les adaptateurs
OpenAI-compatible, seul un endpoint loopback simple est `local` / `not-required` ; des informations
utilisateur, des paramètres de requête ou des fragments font passer l'authentification à `unknown`,
avec une provenance de configuration. Un endpoint distant sans déclaration de clé explicite signale
lui aussi une authentification `unknown`.

## Commande générique

L'adaptateur générique n'évalue jamais une chaîne shell. La configuration fournit un exécutable et un
tableau d'arguments ; seuls les paramètres `{model}` et `{operation}` sont substitués. Le prompt et
le contexte sont envoyés sur l'entrée standard. Par défaut, les commandes génériques configurées
s'exécutent depuis un nouveau répertoire temporaire en mode `0700` ; seul le SDK programmatique peut
fournir un `cwd` explicite. La transmission de l'environnement au processus enfant se limite aux
variables essentielles à la plateforme, plus la liste `authEnvironment` explicite de l'adaptateur.

```json
{
  "providers": {
    "fixture": {
      "kind": "command",
      "provider": "independent-lab",
      "executable": "/absolute/path/to/provider",
      "args": ["verify", "--model", "{model}"],
      "authKind": "local",
      "structuredOutput": true
    }
  }
}
```

## Preuves d'admission

Les tests de contrat hermétiques couvrent l'analyse des événements CLI, les charges utiles
structurées, la correspondance des usages, l'authentification manquante, la forme des requêtes HTTP,
le timeout et l'annulation, la sortie invalide, les bornes de sortie, le CRLF, l'Unicode et les
chemins comportant des espaces. Le test d'intégration des processus vérifie aussi la transmission des
signaux aux processus descendants sous POSIX.

| Environnement       | Preuve hermétique du paquet | Sonde du binaire officiel  | Test réel facturable |
| ------------------- | --------------------------- | -------------------------- | -------------------- |
| Linux, Node 20/24   | CI publique                 | dépend de l'hôte/du compte | opt-in uniquement    |
| macOS, Node 20/24   | CI publique                 | dépend de l'hôte/du compte | opt-in uniquement    |
| Windows, Node 20/24 | CI publique                 | dépend de l'hôte/du compte | opt-in uniquement    |
| WSL, Node 20/24     | à vérifier sur l'hôte cible | dépend de l'hôte/du compte | opt-in uniquement    |

Les tests normaux n'utilisent jamais de compte fournisseur. Un test réel doit être explicitement
activé et clairement considéré comme potentiellement facturable. Voir [limites de compatibilité et de
support](compatibility.md) pour l'interprétation de ces vérifications côté utilisateur.
