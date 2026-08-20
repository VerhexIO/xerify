[English](../../configuration.md) · [Türkçe](../tr/configuration.md) · [Deutsch](../de/configuration.md) · [简体中文](../zh-CN/configuration.md) · [Español](../es/configuration.md) · **Français**

# Mise en place et configuration du projet

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Xerify garde l'état propre à chaque projet hors de la racine du dépôt. Installer Xerify comme
dépendance locale directe l'initialise automatiquement, sans écraser les fichiers existants :

```sh
npm install --save-dev xverify-cli@latest
```

Les installations globales, les installations transitives imbriquées, les installations sans
sauvegarde, `npx`, et les installations effectuées avec `XERIFY_SKIP_AUTO_INIT=1` n'écrivent rien
dans le projet courant. Dans ces cas, lancez l'initialisation explicitement :

```sh
npx --yes --package=xverify-cli@latest xerify init
```

La commande est idempotente et ne remplace jamais une configuration ou un `.gitignore` existants :

```text
.xerify/
├── .gitignore
├── xverify-config.json
├── logs/
│   └── audit.jsonl   # created on the first logged command
├── runs/             # active records plus one monotonic HEAD.json
└── archive/          # archived records plus searchable index.jsonl
```

Avant le premier cycle de vie de dépendance, npm n'expose aucun indicateur permettant de distinguer
catégoriquement une installation directe d'une installation transitive. Xerify accepte donc soit une
déclaration existante dans le manifeste ou le lockfile racine, soit la combinaison d'un indicateur
de sauvegarde explicite et de l'emplacement exact `node_modules/xverify-cli` à la racine. Un
gestionnaire de paquets peut hisser une dépendance Xerify transitive vers cet emplacement ;
l'initialiseur reste non destructif et ignoré par Git, mais les auteurs de bibliothèques doivent
définir `XERIFY_SKIP_AUTO_INIT=1` lorsqu'ils intègrent Xerify.

Le nom de fichier canonique du projet est `.xerify/xverify-config.json`. Le `.gitignore` généré
tient à la fois les journaux d'exécution et la configuration susceptible de contenir des
identifiants hors de Git. Les personnes qui maintiennent une configuration strictement dépourvue de
secrets peuvent délibérément forcer son ajout avec Git, mais doivent alors la relire avant chaque
commit. Un `logPath` de projet relatif se résout depuis la racine du projet détectée, et non depuis
l'emplacement d'installation du paquet. Les commandes lancées depuis un sous-répertoire recherchent
dans les répertoires parents la configuration de projet canonique la plus proche ; un chemin de
journal relatif défini dans le projet reste ancré à cette racine.

## Configuration de base

La commande `xerify init` ajoute aussi `.xerify/` de façon idempotente au `.gitignore`, au
`.npmignore` et au `.dockerignore` racines. Elle y ajoute une courte entrée balisée et ne remplace
jamais les règles d'exclusion existantes.

La commande `xerify init` génère un fichier de départ valide :

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {},
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "history": {
    "enabled": true,
    "directory": ".xerify/runs",
    "archiveDirectory": ".xerify/archive",
    "captureInput": "full",
    "captureOutput": "normalized",
    "sequencePadding": 6
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

Les chemins d'historique se résolvent depuis la racine du projet détectée. `captureInput` accepte
`full`, `metadata` ou `none` ; `captureOutput` accepte `normalized`, `metadata` ou `none`. Les
valeurs par défaut, transparentes, visent un fonctionnement local facile à comprendre. Passez aux
modes « métadonnées uniquement » avant de traiter des données client, du code source propriétaire,
ou tout autre contenu qui ne doit pas persister. Les chemins actif et archive doivent être
disjoints : ils ne peuvent ni être identiques ni être imbriqués l'un dans l'autre. Modifier l'un ou
l'autre chemin démarre un nouvel espace de séquence. Voir [l'historique local des
exécutions](run-history.md) pour le détail des fichiers et des commandes de cycle de vie.

Un objet `providers` vide conserve les adaptateurs intégrés `codex` et `claude`. N'ajoutez que les
transports que vous utilisez réellement. Par exemple :

```json
{
  "$schema": "https://raw.githubusercontent.com/VerhexIO/xerify/main/schemas/config.schema.json",
  "providers": {
    "cursor": {
      "kind": "cursor",
      "provider": "cursor",
      "executable": "agent"
    },
    "openaiApi": {
      "kind": "openai-api",
      "apiKeyEnvironment": "OPENAI_API_KEY",
      "apiKey": "optional-literal-fallback"
    },
    "anthropicApi": {
      "kind": "anthropic-api",
      "apiKeyEnvironment": "ANTHROPIC_API_KEY",
      "maxTokens": 4096
    }
  },
  "limits": {
    "timeoutMs": 120000,
    "maxInputBytes": 1048576,
    "maxOutputBytes": 1048576
  },
  "logPath": ".xerify/logs/audit.jsonl"
}
```

`$schema` n'est qu'une indication pour l'éditeur ; Xerify ne le récupère ni ne l'exécute jamais. Une
installation locale au projet peut le remplacer par
`../node_modules/xverify-cli/schemas/config.schema.json` pour bénéficier de l'autocomplétion hors
ligne.

La configuration est stricte. Les champs génériques `token`, `secret`, `defaultModel` silencieux,
ainsi que tout champ d'identifiant sur les adaptateurs de commande ou de CLI, sont rejetés. Seuls
les adaptateurs directs `openai-api`, `anthropic-api` et `openai-compatible` acceptent le champ
optionnel exact `apiKey`.

L'ordre recommandé est le suivant :

1. Utiliser la variable d'environnement nommée (`apiKeyEnvironment`).
2. Utiliser l'authentification gérée par la CLI officielle pour les adaptateurs par abonnement.
3. N'utiliser une valeur littérale `apiKey` que pour une installation locale mono-utilisateur, quand
   la gestion par variable d'environnement n'est pas pratique.

Quand les deux sont présents, la variable d'environnement l'emporte. Les clés API littérales et les
valeurs complètes du champ `endpoint` d'un fournisseur sont remplacées par `[REDACTED]` dans la
sortie de `config show` et de `config validate` ; le masquage partiel d'URL est volontairement évité,
car des identifiants peuvent apparaître dans les informations utilisateur, les chemins, n'importe
quel paramètre de requête ou un fragment. `health`, `doctor`, les erreurs, les prompts et les
journaux d'audit n'exposent jamais ces valeurs. Sous POSIX, une configuration contenant `apiKey` ou
un `endpoint` de fournisseur explicitement configuré est rejetée si ses permissions ne sont pas
réservées au propriétaire (`chmod 600 .xerify/xverify-config.json`). L'initialiseur crée déjà ce
mode. Le seul endpoint par défaut intégré d'un adaptateur ne rend pas privé, à lui seul, un fichier
par ailleurs dépourvu de secrets. Sous Windows, protégez le fichier avec une ACL réservée au
propriétaire. Ne commitez jamais ce fichier, ne le collez jamais dans une sortie de support, et ne
l'envoyez jamais comme preuve de vérification.

## Résolution et variables d'environnement

L'ordre de priorité est : indicateur CLI, variable d'environnement de substitution Xerify,
configuration du projet, configuration utilisateur, puis valeur par défaut de l'adaptateur. La
configuration utilisateur utilise le même nom de fichier, `xverify-config.json` :

| Environnement | Chemin de la configuration utilisateur                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| Linux         | `$XDG_CONFIG_HOME/xerify/xverify-config.json`, sinon `~/.config/xerify/xverify-config.json` |
| macOS         | `~/Library/Application Support/Xerify/xverify-config.json`                                  |
| Windows       | `%APPDATA%\Xerify\xverify-config.json`                                                      |

`XERIFY_USER_CONFIG_PATH` désigne un fichier de configuration utilisateur dédié, pour une
automatisation hermétique. Les limites d'exécution peuvent être surchargées avec `XERIFY_TIMEOUT_MS`,
`XERIFY_MAX_INPUT_BYTES` et `XERIFY_MAX_OUTPUT_BYTES`. Un indicateur CLI `--timeout` ou `--log` a
toujours la priorité la plus élevée.

Les variables de fournisseur et d'authentification ne sont transmises qu'à l'adaptateur concerné :

| Adaptateur         | Environnement d'authentification/configuration accepté                                              |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Codex CLI          | `CODEX_HOME`, `CODEX_API_KEY` ; la connexion CLI classique reste prise en charge                    |
| Claude CLI         | `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` ; la connexion CLI classique reste prise en charge   |
| Cursor Agent       | `CURSOR_API_KEY`, `CURSOR_API_ENDPOINT` ; la commande `agent login` classique reste prise en charge |
| OpenAI API         | variable d'environnement nommée en priorité ; repli optionnel sur une valeur littérale `apiKey`     |
| Anthropic API      | variable d'environnement nommée en priorité ; repli optionnel sur une valeur littérale `apiKey`     |
| Commande générique | seuls les noms listés dans `authEnvironment`                                                        |

Les variables essentielles à la plateforme, comme `PATH`, les emplacements du répertoire personnel
et de configuration, les variables de répertoire temporaire et la locale, sont transmises afin que
les CLI officielles puissent retrouver leur propre stockage sécurisé d'identifiants. Le reste de
l'environnement parent n'est pas recopié aveuglément.

Un adaptateur de commande générique démarre dans un répertoire privé et vide plutôt que dans le
projet, si bien qu'il ne peut pas lire des fichiers du projet qui ne lui ont pas été explicitement
fournis. Une des conséquences est un piège fréquent : **tout chemin dans `executable` et dans
`args` doit être absolu.** `"args": ["tools/verifier.mjs"]` se résout par rapport au répertoire
privé, pas au projet, et le processus échoue avant même de lire la moindre entrée. L'échec typé
cite l'interpréteur, qui nomme le répertoire dans lequel il a cherché :

```json
{
  "code": "PROVIDER_FAILURE",
  "message": "Provider process exited unsuccessfully",
  "providerMessage": "Error: Cannot find module '/tmp/xerify-command-rBJrxX/tools/verifier.mjs'"
}
```

Il n'existe volontairement aucune variable d'environnement de sélection de modèle. Chaque requête
réelle porte un `--to provider:model` exact ; la provenance de la source utilise de même un
`--from provider:model` exact. Trouvez les identifiants de modèle grâce à la commande de découverte
non facturable propre au fournisseur, par exemple `agent models`, et ne devinez jamais un alias.

## État de santé et découverte des fournisseurs

Commencez par la vue agrégée et non facturable de l'état de préparation :

```sh
xerify --json health
xerify --json health --network
```

La commande `health` indique `ready`, `degraded` ou `setup-required`, précise si le projet courant
est initialisé, et liste chaque adaptateur configuré ou lié ainsi que son identité de fournisseur
d'invocation. Elle indique aussi les chemins d'historique résolus et la politique de capture, sans
jamais lire le contenu des preuves. Par défaut, elle n'appelle aucun modèle et ne sonde aucun
endpoint d'API. `--network` ajoute des vérifications bornées d'accessibilité de l'endpoint, sans pour
autant émettre de requête d'inférence. Utilisez `doctor` pour les détails de runtime et de MCP, et
`providers probe` pour un adaptateur donné.

Pour `openai-compatible`, seul un endpoint loopback simple, sans configuration de clé explicite, sans
informations utilisateur, sans paramètre de requête ni fragment, est signalé comme `local` /
`not-required`. Tout contenu intégré dans l'URL est signalé avec une authentification `unknown` de
provenance configuration, même en loopback. Un endpoint distant sans `apiKeyEnvironment` ni `apiKey`
reste lui aussi `unknown` ; Xerify ne déduit jamais d'une URL si une passerelle est publique, si elle
transporte des identifiants dans l'URL, ou si elle applique un autre mécanisme d'authentification.
Préférez toujours une variable d'environnement nommée plutôt que d'inclure des identifiants dans
l'URL d'un endpoint.

## Contrat du journal d'audit

Le journal d'audit au format JSONL enregistre l'horodatage, la commande, le code de sortie, la
provenance fournisseur/modèle, le verdict, la durée, l'usage rapporté par le fournisseur, la
troncature et la catégorie de l'échec typé. Il omet volontairement les prompts, les affirmations, le
contexte, les réponses, les résultats détaillés, les réponses brutes du fournisseur, les données
d'autorisation et les chemins d'identifiants. Sous POSIX, les nouveaux fichiers sont créés en mode
`0600` ; les liens symboliques et toute cible non régulière sont rejetés. Ce journal reste une
métadonnée opérationnelle : ni une transcription, ni une preuve qu'un verdict est correct.
