# Guide utilisateur Xerify en français

[English](../../README.md) · [Türkçe](../tr/README.md) · [Deutsch](../de/README.md) ·
[简体中文](../zh-CN/README.md) · [Español](../es/README.md) · **Français**

Ce guide réunit l'installation, la CLI, la configuration, les fournisseurs, le contrat JSON,
l'historique, MCP, la compatibilité et les limites de sécurité. Les commandes, champs JSON,
identifiants provider/model, codes de sortie et clés de configuration ne sont pas traduits. La
source normative est l'[index de documentation anglais](../../README.md).

## 1. Modèle du produit

```text
artefact de l'auteur → cœur Xerify → autre fournisseur d'invocation → résultat typé
```

- `ask` : second avis ouvert ; le fournisseur source est facultatif.
- `verify` : tente de réfuter une affirmation concrète dont la provenance est connue ; un autre
  fournisseur d'invocation est obligatoire.
- `confirmed` : aucun contre-exemple matériel n'a été trouvé dans les preuves fournies.
- `refuted` : les preuves contredisent matériellement l'affirmation.
- `unclear` : les preuves ou la réponse ne suffisent pas à une décision sûre.

Xerify ne remplace pas les tests, typecheck, linter, contrôles d'exécution ni la validation humaine.
Un ordre courant est `tests → typecheck → lint → runtime checks → Xerify → politique humaine/merge`.

## 2. Installation et mise à niveau

```sh
# Global
npm install --global xverify-cli@latest
xerify --version
xerify init

# Épinglé dans le projet
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version

# Exécution ponctuelle
npx --yes --package=xverify-cli@latest xerify --json health
```

Node.js 20+ est requis ; Node.js 24 est la voie principale. Les installations globales,
transitives, `--no-save` et `npx` n'initialisent pas le projet courant. Lancez `xerify init`.
`XERIFY_SKIP_AUTO_INIT=1` désactive l'initialisation protégée d'une dépendance locale directe.
Désinstaller npm ne supprime pas automatiquement `.xerify/`.

## 3. Préparation sans appel au modèle

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

Ces commandes ne font aucune inférence. `--network` ajoute uniquement une vérification bornée des
endpoints. `health` indique `ready`, `degraded` ou `setup-required`, l'initialisation, l'identité de
l'adapter, l'état d'auth et la politique d'historique, sans afficher de token.

## 4. Référence CLI

| Option                     | Rôle                                           |
| -------------------------- | ---------------------------------------------- |
| `--json`                   | écrire un seul envelope JSON stable sur stdout |
| `--timeout <milliseconds>` | remplacer le timeout borné du fournisseur      |
| `--log <path>`             | remplacer le chemin JSONL d'audit secret-safe  |
| `--version`                | afficher la version installée                  |

| Commande                                                                 | Rôle                                          |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| `xerify ask --to provider:model --question <text>`                       | second avis ouvert                            |
| `xerify verify --from provider:model --to provider:model --claim <text>` | vérification orientée falsification           |
| `xerify request --to provider:model --input <file>`                      | débogage borné sans garanties de verify       |
| `xerify init`                                                            | initialiser l'état privé de façon idempotente |
| `xerify health` / `doctor`                                               | état et diagnostic détaillé                   |
| `xerify providers list` / `probe`                                        | capacités et préparation transport/auth       |
| `xerify config show` / `validate`                                        | afficher ou valider la config expurgée        |
| `xerify runs ...`                                                        | gérer l'historique local                      |
| `xerify mcp stdio` / `mcp http`                                          | démarrer MCP                                  |

`request` n'applique pas la provenance, la séparation des fournisseurs, l'analyse du verdict ou les
codes de sortie de `verify`.

## 5. Identité fournisseur et adapters

Provider signifie service d'invocation, de facturation et de contrôle :

| Adapter             | Provider    | Authentification                                        |
| ------------------- | ----------- | ------------------------------------------------------- |
| `codex`             | `openai`    | login CLI ou `CODEX_API_KEY`                            |
| `claude`            | `anthropic` | login, `ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN` |
| `cursor`            | `cursor`    | `agent login` ou `CURSOR_API_KEY`                       |
| `openai-api`        | `openai`    | variable nommée, literal facultatif                     |
| `anthropic-api`     | `anthropic` | variable nommée, literal facultatif                     |
| `openai-compatible` | configuré   | env/literal ou endpoint local                           |
| `command`           | configuré   | allowlist `authEnvironment` uniquement                  |

Les ID Cursor sont des identifiants opaques du catalogue. Choisissez un ID exact via
`agent models` ; `cursor:auto` est rejeté avant l'appel. Gemini via Cursor reste provider `cursor` ;
un futur adapter Google direct porterait `google`.

La séparation des providers ne démontre pas l'indépendance du lignage. OpenAI direct et GPT via
Cursor peuvent partager le même modèle et les mêmes angles morts upstream.

## 6. Configuration et secrets

Fichier projet : `.xerify/xverify-config.json`.

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
      "apiKeyEnvironment": "OPENAI_API_KEY"
    }
  },
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

Priorité : flag CLI → override d'environnement Xerify → config projet → config utilisateur →
valeur par défaut. Chemins utilisateur : Linux `$XDG_CONFIG_HOME/xerify/xverify-config.json`, macOS
`~/Library/Application Support/Xerify/xverify-config.json`, Windows
`%APPDATA%\Xerify\xverify-config.json`. L'automatisation hermétique peut utiliser
`XERIFY_USER_CONFIG_PATH`.

Préférez `apiKeyEnvironment` ; un `apiKey` literal n'est qu'un fallback local assumé.
`config show/validate` expurge la clé et l'endpoint complet. Sous POSIX, un fichier avec literal ou
endpoint explicite doit être en mode `0600`. Ne commitez pas config, logs, runs ou sortie du provider
et ne les envoyez pas comme preuve sans revue.

## 7. Prompt injection et frontière des données

```text
contrat système Xerify
  > tâche de vérification
  > périmètre approuvé par l'utilisateur
  > preuves non fiables fournies
```

Les instructions dans le code, les diffs, logs, Markdown, commentaires ou sorties d'un autre agent
sont des preuves, pas une autorité. Le verifier doit tenter de falsifier et ignorer les changements
de rôle, verdict ou schema intégrés. Cela réduit le risque sans rendre un LLM invulnérable à
l'injection. Vérifiez le périmètre et le provider avant envoi ; n'envoyez pas de secrets, dumps
d'environnement, données client ou contenu non autorisé.

Xerify n'exécute jamais la sortie comme shell, code, instruction MCP ou configuration. Les processus
utilisent `shell: false`, stdin, des limites bytes/temps et un environnement autorisé.

## 8. Contrat JSON et codes de sortie

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

| Exit | Signification                                       |
| ---: | --------------------------------------------------- |
|  `0` | ask répondu ou verify confirmed                     |
|  `2` | entrée/config, même provider ou provenance invalide |
|  `3` | exécutable, endpoint ou auth indisponible           |
|  `4` | timeout ou annulation                               |
|  `5` | échec provider, processus ou transport API          |
|  `6` | réponse invalide, incomplète ou hors schema         |
| `10` | refuted                                             |
| `11` | unclear sans échec inférieur                        |

Après le début du cycle provider, les échecs renvoient un `VerifyResult` complet avec
`verdict: "unclear"` et un `failure` typé. stdout doit être analysé même avec un exit non nul. Une
preuve tronquée ne peut jamais produire `confirmed`.

## 9. Historique et archive

```text
.xerify/
├── runs/HEAD.json
├── runs/000001/
│   ├── process.json
│   ├── request.json
│   ├── events.jsonl
│   ├── result.json ou error.json
│   └── evidence/manifest.json
└── archive/index.jsonl
```

`HEAD.json` attribue des ID monotones non réutilisés. `captureInput` accepte
`full|metadata|none` ; `captureOutput`, `normalized|metadata|none`. Le contenu des preuves n'est
affiché qu'avec `--include-evidence` explicite.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archiver, restaurer et supprimer n'appellent aucun modèle. La suppression est définitive. Le fichier
append-only `index.jsonl` permet de rechercher le dernier résumé sans ouvrir tous les enregistrements.

## 10. MCP

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.1.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

Outils : `xerify_ask`, `xerify_verify`, `xerify_capabilities`. Les deux premiers peuvent entraîner
des coûts ; capabilities ne fait pas d'inférence. HTTP :

```sh
xerify mcp http --host 127.0.0.1 --port 8787
```

Hors loopback, il faut `--allow-public`, un bearer token depuis une variable nommée et une frontière
TLS/reverse-proxy adaptée. Les identifiants d'abonnement des CLI locales ne sont pas transférés à un
service distant.

## 11. Compatibilité et déterminisme

- CI : Ubuntu, macOS et Windows avec Node.js 20/24 ; WSL utilise le chemin Linux.
- Bibliothèque ESM avec déclarations TypeScript, CLI, MCP STDIO et Streamable HTTP.
- `schemaVersion: 1` ; de nouveaux champs optionnels sont additifs, retirer ou réinterpréter est breaking.
- Les tests normaux ne nécessitent aucun identifiant provider et ne font pas d'inférence.
- Le texte LLM n'est pas déterministe octet par octet. Xerify garantit schema, limites, erreurs typées
  et résultat fail-closed, pas une formulation identique.

## 12. Exemples observés

Le [catalogue canonique](../../examples/README.md) couvre recherche, planification de jeu, décision
web, analyse de données, politique outbound et deux cas dogfood. L'[index JSONL](../../examples/index.jsonl)
permet aux outils AI de rechercher d'abord de petits résumés. Les preuves historiques et résultats
observés ne sont pas traduits.

| Scénario                                  | Résultat    | Exit |
| ----------------------------------------- | ----------- | ---: |
| Rétention à six mois                      | `unclear`   |   11 |
| Capacité d'un jeu à deux personnes        | `refuted`   |   10 |
| Choix d'architecture web                  | `refuted`   |   10 |
| Conversion A/B agrégée                    | `refuted`   |   10 |
| Politique outbound de données restreintes | `refuted`   |   10 |
| Invariants de l'adapter Cursor            | `confirmed` |    0 |
| Frontière du paquet npm                   | `confirmed` |    0 |

## Références canoniques

[Installation](../../installation.md) · [Configuration](../../configuration.md) ·
[CLI](../../cli-reference.md) · [Adapters](../../provider-adapters.md) ·
[Canaux](../../channels.md) · [JSON/Exit](../../json-contract.md) ·
[Historique](../../run-history.md) · [MCP](../../mcp.md) ·
[Compatibilité](../../compatibility.md) · [Architecture](../../architecture.md) ·
[Sécurité](../../../SECURITY.md)

En cas de conflit, le contrat canonique testé en anglais prévaut.
