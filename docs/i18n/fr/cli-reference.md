[English](../../cli-reference.md) · [Türkçe](../tr/cli-reference.md) · [Deutsch](../de/cli-reference.md) · [简体中文](../zh-CN/cli-reference.md) · [Español](../es/cli-reference.md) · **Français**

# Référence CLI

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Toutes les commandes s'appuient sur la même configuration validée et le même cœur que la
bibliothèque et le serveur MCP. Les options globales peuvent être placées avant ou après une
sous-commande :

| Option                     | Signification                                             |
| -------------------------- | --------------------------------------------------------- |
| `--json`                   | Écrit une seule enveloppe JSON stable sur stdout          |
| `--timeout <milliseconds>` | Remplace le délai borné du cycle de vie du fournisseur    |
| `--log <path>`             | Remplace le chemin du journal JSONL d'audit, sans secrets |
| `--version`                | Affiche la version installée de Xerify                    |

## Commandes de vérification et d'adaptateur

| Commande                                                                     | Utilité                                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `xerify ask [question]`                                                      | Second avis ouvert ; l'entrée standard sert de contexte borné                            |
| `xerify ask --question <text> --to <provider:model>`                         | Forme sans ambiguïté quand l'entrée standard fournit le contexte                         |
| `xerify verify --from <provider:model> --to <provider:model> --claim <text>` | Vérification orientée falsification, avec des fournisseurs d'invocation distincts        |
| `xerify request --to <provider:model> --input <file>`                        | Requête brute de débogage d'adaptateur, bornée ; n'offre aucune garantie de vérification |

`ask` et `verify` acceptent aussi `--adapter <id>` et `--context-label <label>`. `ask` accepte un
`--from` optionnel ; `verify` exige une provenance source connue ou déclarée. Chaque cible réelle
doit contenir un identifiant de modèle exact. La vérification entre un même fournisseur des deux
côtés, ainsi que le modèle `auto` de Cursor, échouent avant tout appel au fournisseur.

## Mise en place, configuration et état de santé

| Commande                                   | Utilité                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `xerify init`                              | Initialise de façon idempotente l'état privé `.xerify/` local au projet      |
| `xerify health [--network]`                | Vue agrégée de l'état de préparation du projet et des adaptateurs            |
| `xerify doctor [--network]`                | Diagnostics détaillés de runtime, de configuration, de MCP et d'adaptateur   |
| `xerify providers list`                    | Liste les capacités configurées, sans appel d'inférence                      |
| `xerify providers probe --provider <id>`   | Sonde la disponibilité exécutable/authentification d'un adaptateur           |
| `xerify providers probe --all [--network]` | Sonde tous les adaptateurs ; les vérifications réseau restent sans inférence |
| `xerify config show`                       | Affiche la configuration résolue et ses sources, secrets masqués             |
| `xerify config validate`                   | Valide la configuration projet/utilisateur et affiche la résolution masquée  |

`health`, `doctor`, les commandes de configuration, les commandes d'historique, la découverte de
capacités et la sonde de fournisseur par défaut n'appellent aucun modèle. `--network` ne fait
qu'ajouter des vérifications bornées d'accessibilité de l'endpoint.

## Historique des exécutions

| Commande                                          | Utilité                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `xerify runs list [--archived] [--limit <count>]` | Liste les enregistrements actifs ou les résumés d'archive indexés           |
| `xerify runs search <query> [--limit <count>]`    | Recherche dans les métadonnées archivées de tête/fournisseur/modèle/verdict |
| `xerify runs show <run> [--archived]`             | Affiche un enregistrement normalisé                                         |
| `xerify runs show <run> --include-evidence`       | Inclut explicitement le contenu des preuves capturées                       |
| `xerify runs archive <run>`                       | Déplace un enregistrement actif vers l'archive                              |
| `xerify runs restore <run>`                       | Restaure un enregistrement archivé                                          |
| `xerify runs delete <run> --yes [--archived]`     | Supprime définitivement un enregistrement                                   |

`<run>` accepte la séquence décimale (`1`) ou l'identifiant stable (`xrun_000001`). Archiver,
restaurer et supprimer sont des opérations sur le système de fichiers local, et n'appellent jamais un
fournisseur. Un enregistrement en cours d'exécution ne peut être ni archivé ni supprimé.

La liste des archives utilise `.xerify/archive/index.jsonl` comme catalogue compact. Chaque résumé
de processus contient un `head` conforme à la politique de capture, ce qui permet aux humains comme
aux agents d'identifier une correspondance probable avant d'ouvrir un enregistrement complet.
`runs search` effectue cette recherche sans ouvrir chaque exécution archivée.

## Serveur MCP

| Commande                                                                     | Utilité                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------- |
| `xerify mcp stdio`                                                           | Sert le MCP local en STDIO                  |
| `xerify mcp http --host 127.0.0.1 --port 8787`                               | Sert le MCP Streamable HTTP en loopback     |
| `xerify mcp http --host 0.0.0.0 --port 8787 --token-env NAME --allow-public` | Liaison publique explicitement authentifiée |

STDIO réserve stdout aux trames du protocole. Une liaison HTTP non loopback exige à la fois
`--allow-public` et un jeton porteur fourni via une variable d'environnement nommée.
