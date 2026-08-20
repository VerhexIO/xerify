[English](../../run-history.md) · [Türkçe](../tr/run-history.md) · [Deutsch](../de/run-history.md) · [简体中文](../zh-CN/run-history.md) · [Español](../es/run-history.md) · **Français**

# Historique local des exécutions

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Chaque appel `ask`/`verify`, qu'il vienne de la CLI, de la bibliothèque ou de MCP, peut créer un
enregistrement déterministe, local au projet. Cela rend les appels au fournisseur compréhensibles et
vérifiables, sans pour autant transformer la sortie brute du transport en artefact.

```text
.xerify/
├── runs/
│   ├── HEAD.json           # one monotonic allocator/current-head record
│   └── 000001/
│       ├── process.json
│       ├── request.json
│       ├── events.jsonl
│       ├── result.json       # or error.json; omitted by capture policy
│       └── evidence/
│           ├── manifest.json
│           └── 001-<sha256>.txt
└── archive/
    ├── index.jsonl         # compact searchable archive lifecycle catalog
    └── 000002/             # same record layout after archive
```

Les séquences augmentent à travers les enregistrements actifs et archivés au sein d'un seul espace
de noms d'historique fixe. Un fichier privé unique, `runs/HEAD.json`, enregistre la dernière séquence
allouée, le répertoire, l'identifiant stable de l'exécution et l'heure de mise à jour. Un fichier
`.HEAD.lock` de courte durée n'existe que pendant une allocation concurrente ; il ne grossit pas avec
le nombre d'exécutions. Le répertoire affiché utilise le remplissage de zéros configuré (six chiffres
par défaut), tandis que l'identifiant stable est `xrun_000001` ; les commandes acceptent aussi bien
cet identifiant que `1`. Supprimer l'exécution `000001` ne fait donc pas que la prochaine opération
redevienne `000001`. Les anciennes structures `.sequences/` sont validées, repliées dans
`HEAD.json`, et supprimées lors de l'allocation suivante.

## Fichiers d'un enregistrement

| Chemin                      | Signification                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `process.json`              | Identifiant stable de l'exécution, séquence, `head` consultable, opération/surface, état du cycle de vie, horodatages, adaptateur/fournisseur/modèle cible, et code de sortie/verdict terminal ou échec typé |
| `request.json`              | Métadonnées normalisées de la requête `ask`/`verify`, provenance auteur/cible, limites, étiquette de contexte, politique de capture, comptages d'octets et empreintes                                        |
| `events.jsonl`              | Événements de cycle de vie en ajout seul : `started`, puis `completed` ou `failed` ; les événements d'archivage/restauration s'ajoutent sans réécrire l'historique                                           |
| `result.json`               | Résultat Xerify normalisé et analysé, ou résumé de résultat limité aux métadonnées selon `captureOutput` ; absent pour `none`                                                                                |
| `error.json`                | Erreur typée, sans secrets, quand aucun résultat normalisé terminal ne peut être stocké                                                                                                                      |
| `evidence/manifest.json`    | Identifiants de preuve, étiquettes/localisateurs, comptages d'octets, empreintes SHA-256, et noms de fichiers stockés optionnels                                                                             |
| `evidence/001-<sha256>.txt` | Contexte d'entrée borné, uniquement quand `captureInput` vaut `full` ; la numérotation suit l'ordre des preuves, ce n'est pas un second compteur d'exécution                                                 |

Chaque entrée de preuve porte un localisateur, un comptage d'octets et une empreinte `sha256:`. Les
fichiers sont créés avec des modes POSIX privés là où c'est possible, et écrits de façon atomique. Un
plantage peut laisser un enregistrement `running` qui reste véridique ; Xerify n'invente jamais un
résultat terminal. Le répertoire d'exécution est l'unité d'inspection pour les humains comme pour les
agents ; les schémas JSON restent volontairement plus petits que les enregistrements de tâches
d'orchestration de Deckent, car Xerify enregistre une seule requête au fournisseur, pas un plan de
worker ni un cycle de vie de mutation de projet.

## Index d'archive consultable

`xerify runs archive <run>` déplace l'enregistrement complet vers `archive/<number>/` et ajoute un
objet JSON compact à `archive/index.jsonl`. Restaurer et supprimer ajoutent chacun de nouveaux objets
de cycle de vie plutôt que de réécrire l'historique. Chaque ligne contient :

- l'événement, l'emplacement et l'heure, ainsi que son origine — la commande, ou une réconciliation
  après plantage ;
- le résumé `process` complet mais compact, incluant `head` lisible par un humain ou un agent, le
  fournisseur/modèle, le verdict, le code de sortie, le statut et les horodatages ;
- `recordSha256`, qui couvre exactement le processus, la requête, le résultat normalisé ou l'erreur
  typée, et le manifeste de preuves à ce point du cycle de vie.

La dernière ligne pour un `runId` donné constitue son état indexé actuel. `xerify runs list
--archived` lit uniquement cet index et les noms de répertoires ; elle n'ouvre pas chaque fichier de
processus archivé. Les entrées de cycle de vie héritées ou interrompues manquantes sont réconciliées
à partir du seul répertoire concerné, et marquées `source: "reconciled"`. Les humains peuvent grepper
le JSONL directement, tandis que les outils d'IA devraient lire cet index avant d'ouvrir un
répertoire d'exécution correspondant.

Le `head` est dérivé localement, sans aucun autre appel de modèle. Avec `captureInput: "full"`,
c'est un aperçu borné de l'affirmation ou de la question, normalisé au niveau des espaces. Avec
`metadata`, ce n'est qu'une empreinte de l'opération et de l'énoncé. Avec `none`, il ne contient
aucun contenu tiré de l'énoncé. Cela empêche l'index de contourner la politique de persistance
configurée.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs show 1 --include-evidence
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archiver et restaurer se résument à des renommages locaux, plus des entrées d'index ajoutées en fin
de fichier. Supprimer est permanent, exige `--yes`, et rapporte `recoverable: false`. Un
enregistrement en cours d'exécution ne peut être ni archivé ni supprimé, ce qui empêche les commandes
de cycle de vie d'invalider une écriture terminale en cours. Aucune de ces commandes n'appelle un
fournisseur.

`runs search <query>` recherche une correspondance dans le dernier résumé actuellement archivé, à
travers l'identifiant d'exécution, `head`, l'opération, le fournisseur/modèle, l'adaptateur, le
statut, le verdict, le code de sortie/l'erreur, et les horodatages. Elle lit l'index compact et
renvoie les résumés de processus correspondants ; les preuves restent optionnelles, via `runs show`.
Le contrat hermétique de l'historique exerce le listage et la recherche ciblée sur 1 000 résumés
d'archive indexés, dont les enregistrements d'exécution restent volontairement non ouverts.

`captureInput: "full"` stocke l'énoncé et le contexte ; `metadata` ne stocke que les comptages
d'octets et les empreintes ; `none` ne stocke ni l'un ni l'autre. `captureOutput: "normalized"`
stocke le résultat Xerify analysé, `metadata` stocke le résumé sans secrets, et `none` omet le
fichier de résultat. La sortie brute du transport fournisseur, les identifiants, les stockages
d'authentification et les copies d'environnement ne sont jamais des champs de l'historique.

Les règles d'exclusion générées à la racine tiennent `.xerify/` hors de Git, des paquets npm et du
contexte de build Docker. Elles ne remplacent ni les permissions du système de fichiers, ni la
classification des données. Revoyez la politique de capture avant d'envoyer ou de faire persister une
preuve sensible. Modifier les racines d'historique configurées démarre un espace de noms de séquence
différent. Xerify ne revendique aucune garantie d'intégrité face à un processus du même utilisateur
qui supprimerait, renommerait ou modifierait simultanément son arbre d'historique privé.
