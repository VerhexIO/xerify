[English](../../../examples/dogfooding.md) · [Türkçe](../../tr/examples/dogfooding.md) · [Deutsch](../../de/examples/dogfooding.md) · [简体中文](../../zh-CN/examples/dogfooding.md) · [Español](../../es/examples/dogfooding.md) · **Français**

# Dogfooding : ce qu'il faut pour faire confirmer une affirmation

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Cette page est un journal, pas un tutoriel. Cinq constats sur Xerify lui-même sont passés par
`xerify verify` face à deux canaux indépendants — `codex` (`openai`) et `cursor`. Il a fallu **26
tours**. Un seul constat est passé du premier coup, et un tour est revenu `refuted` parce que
l'affirmation était fausse.

Tout ce qui suit est ce qui s'est réellement passé, y compris les passages où c'est l'auteur des
affirmations lui-même qui s'est trompé. Si vous comptez utiliser Xerify pour vérifier votre propre
travail, voici à quoi ressemble l'expérience.

## Le relevé

|   # | Affirmation                   | Canal  | Verdict         | Sortie | Pourquoi                                                                       |
| --: | ----------------------------- | ------ | --------------- | -----: | ------------------------------------------------------------------------------ |
|   1 | source maps                   | codex  | `unclear`       |     11 | l'affirmation portait sur 86 fichiers, la preuve en montrait 1                 |
|   2 | source maps                   | cursor | `unclear`       |      6 | non-conformité au schéma, aucun verdict produit                                |
|   3 | source maps                   | codex  | `unclear`       |     11 | les comptages étaient un résumé, non inspectables                              |
|   4 | source maps                   | codex  | `unclear`       |     11 | `sourceRoot` jamais pris en compte ; 9 lignes sur 86 montrées                  |
|   5 | source maps                   | cursor | `unclear`       |     11 | mêmes deux objections, atteintes indépendamment                                |
|   6 | source maps                   | codex  | **`refuted`**   |     10 | l'affirmation était fausse : les cartes _définissent bel et bien_ `sourceRoot` |
|   7 | source maps                   | cursor | **`refuted`**   |     10 | même réfutation, atteinte indépendamment                                       |
|   8 | source maps                   | codex  | `unclear`       |     11 | artefact non lié cryptographiquement au registre                               |
|   9 | source maps                   | cursor | `unclear`       |      6 | non-conformité au schéma                                                       |
|  10 | source maps                   | codex  | **`confirmed`** |      0 | —                                                                              |
|  11 | source maps                   | cursor | **`confirmed`** |      0 | —                                                                              |
|  12 | précédence des adaptateurs    | codex  | `unclear`       |     11 | exécutions non liées à un commit ; commandes omises                            |
|  13 | précédence des adaptateurs    | cursor | `unclear`       |      6 | non-conformité au schéma                                                       |
|  14 | précédence des adaptateurs    | codex  | **`confirmed`** |      0 | —                                                                              |
|  15 | précédence des adaptateurs    | cursor | **`confirmed`** |      0 | —                                                                              |
|  16 | provenance npm                | codex  | **`confirmed`** |      0 | —                                                                              |
|  17 | provenance npm                | cursor | **`confirmed`** |      0 | —                                                                              |
|  18 | piège du chemin relatif       | codex  | `unclear`       |     11 | le test A/B changeait deux variables, pas une seule                            |
|  19 | piège du chemin relatif       | codex  | **`confirmed`** |      0 | —                                                                              |
|  20 | piège du chemin relatif       | cursor | **`confirmed`** |      0 | —                                                                              |
|  21 | lacune d'exclusion `.claude/` | codex  | `unclear`       |     11 | rien ne montrait que les 152 erreurs étaient toutes des erreurs d'analyse      |
|  22 | lacune d'exclusion `.claude/` | codex  | `unclear`       |     11 | reproduction résumée, un seul message brut fourni                              |
|  23 | lacune d'exclusion `.claude/` | codex  | `unclear`       |     11 | reproduction non rattachée au commit indiqué                                   |
|  24 | lacune d'exclusion `.claude/` | codex  | `unclear`       |     11 | les deux moitiés de l'affirmation vivaient à des commits différents            |
|  25 | lacune d'exclusion `.claude/` | codex  | `unclear`       |     11 | l'historique git ne peut pas être authentifié depuis le bac à sable            |
|  26 | lacune d'exclusion `.claude/` | cursor | **`confirmed`** |      0 | —                                                                              |

**Totaux : 9 `confirmed`, 2 `refuted`, 15 `unclear`.** Sur les 15 résultats `unclear`, 3 étaient des
échecs de transport (code de sortie `6`) et 12 étaient de véritables jugements du type « votre preuve
n'établit pas cela ».

Quatre constats ont atteint `confirmed` sur les deux canaux. Un constat a atteint `confirmed` sur un
canal et a heurté une limite dure sur l'autre — voir [ce que ce canal ne peut pas
vérifier](#ce-que-ce-canal-ne-peut-pas-vérifier).

## Pourquoi 12 tours sont revenus avec « votre preuve n'établit pas cela »

Chacune de ces douze objections relevait de l'une de quatre catégories. Elles valent la peine d'être
apprises, car ce sont les quatre mêmes que vous rencontrerez.

### 1. L'affirmation va plus loin que la preuve

Tour 1. L'affirmation disait que les 86 fichiers de carte étaient tous inutilisables. La preuve en
montrait un seul.

> La preuve fournie confirme qu'un `.js.map` publié référence un fichier `package/src` manquant sans
> `sourcesContent` intégré, mais elle n'établit pas l'affirmation pour les 86 fichiers de carte
> [...] La preuve distingue aussi 43 fichiers `.js.map` et 43 fichiers `.d.ts.map`, alors que les
> propriétés énoncées par l'affirmation ne portent que sur les fichiers `.js.map`.

La correction ne consiste pas à adoucir l'affirmation. Elle consiste à aller inspecter les 86
fichiers et à mettre le résultat dans l'enveloppe. Un vérificateur qui accepte « j'en ai vérifié un,
supposons le reste » ne fait rien pour vous.

Le tour 1 contenait aussi un second excès, qu'il a fallu plusieurs tours de plus pour remarquer :
l'affirmation disait que les cartes étaient inutilisables _par tout consommateur_. Un développeur
ayant le dépôt cloné à côté de son `node_modules` pouvait résoudre ces chemins. La preuve ne pouvait
jamais soutenir « tout consommateur », et l'affirmation a dû être resserrée à ce que l'artefact
montre réellement : les sources ne peuvent pas être résolues _depuis l'intérieur du paquet_.

### 2. La preuve est votre résumé, pas l'artefact

Tours 3, 4, 22 et 23. Un tableau que vous avez généré, c'est votre conclusion déguisée en donnée.

> La preuve fournie est cohérente en interne avec l'affirmation, mais il s'agit d'un résumé dérivé
> et non fiable plutôt que de données brutes de l'artefact ; sans extraits directs du JSON des
> cartes et un listing complet du tarball, des contre-exemples significatifs ne peuvent pas être
> écartés.

Ce qui a fonctionné : la réponse brute de l'API du registre, le listing complet de `tar -tzf`, et le
JSON de chaque fichier de carte, avec seulement le blob base64 `mappings` élidé. Pour le cas ESLint,
la sortie `--format json` pour les 152 messages plutôt que la fin du terminal.

Si votre preuve contient la phrase « le scan a trouvé N sur M », vous êtes encore dans cette
catégorie.

### 3. L'artefact n'est pas lié à ce que vous prétendez qu'il est

Tour 8. L'affirmation portait sur « le tarball que npm sert ». La preuve portait sur un fichier dans
`/tmp`.

> Le tarball analysé n'est identifié que par une empreinte SHA-256, alors que les métadonnées du
> registre fournissent des valeurs d'intégrité SHA-1 et SHA-512. Aucun calcul SHA-1 ou SHA-512
> correspondant n'est fourni, donc l'identité de l'artefact n'est pas établie.

La correction a consisté à calculer les empreintes que le registre publie réellement, et à montrer
qu'elles correspondent :

```text
local  sha1             : db56366636ab9d0f1b4778639d39bf040f65512e
registry dist.shasum    : db56366636ab9d0f1b4778639d39bf040f65512e
sha1 MATCHES registry   : True

local  sha512 (base64)  : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
registry dist.integrity : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
integrity MATCHES       : True
```

La même catégorie s'applique aux affirmations sur le code source : nommez le commit, montrez `git
rev-parse HEAD`, et montrez `git status --porcelain` pour que le lecteur sache que l'arbre n'était
pas sale.

### 4. Plus d'une chose a changé, ou les deux moitiés vivent à des endroits différents

Tour 18. Un test A/B censé isoler une variable ne l'a pas fait.

> L'affirmation selon laquelle les configurations ne diffèrent que par un chemin de script relatif
> contre absolu est littéralement fausse : leurs clés de map de fournisseur et leurs noms de
> fournisseur diffèrent aussi.

C'était vrai. Les deux configurations utilisaient `rel-test` et `abs-test` comme identités de
fournisseur. La correction a consisté à donner la même identité aux deux configurations et à inclure
la sortie de `diff`, afin que l'affirmation à variable unique soit vérifiable plutôt qu'affirmée.

Le tour 24 relève de la même catégorie, sous un autre habit. L'affirmation portait sur quelque chose
« au commit `1d65f17` », mais la reproduction retirait une ligne de la configuration à `HEAD` — là où
un commit ultérieur l'avait ajoutée. Les deux moitiés d'une seule phrase vivaient à deux commits
différents.

> [...] elles n'établissent pas de façon adéquate que la reproduction a été effectuée depuis le HEAD
> indiqué avec uniquement la modification montrée [...] La preuve contient aussi une contradiction
> interne sur les chemins de fichiers affectés.

La correction a consisté à cesser de prétendre qu'il s'agissait d'un seul fait, et à en énoncer deux,
chacun rattaché à son propre commit.

## Les deux tours qui ont réfuté l'auteur

Les tours 6 et 7 sont la chose la plus utile de cette page.

L'affirmation incluait la sous-assertion _« aucune des 86 cartes ne définit `sourceRoot` »_. Le scan
qui a produit ce chiffre était écrit en Python, et testait le champ ainsi :

```python
sr = d.get('sourceRoot')
if sr:                 # "" est falsy en Python
    haveroot += 1
```

Chacune des 86 cartes définit `sourceRoot` — à la chaîne vide. Le scan en a compté zéro. Les deux
canaux l'ont repéré, indépendamment, au même tour :

> **codex :** L'affirmation est matériellement fausse telle qu'elle est écrite : chaque JSON de
> carte fourni définit explicitement `"sourceRoot"` à la chaîne vide, ce qui contredit l'assertion
> selon laquelle aucune ne définit `sourceRoot`. La preuve soutient par ailleurs l'interprétation
> plus étroite [...]

> **cursor :** Une contradiction significative est présente dans la preuve fournie : les fichiers de
> carte incluent explicitement un champ `"sourceRoot"` (défini à une chaîne vide), donc la
> sous-affirmation « aucune des 86 cartes ne définit `sourceRoot` » est fausse telle qu'elle est
> écrite.

Un `sourceRoot` vide ne préfixe rien, donc la conclusion de fond a survécu. L'_affirmation telle
qu'énoncée_ n'y a pas survécu. Elle a été corrigée en « les 86 cartes définissent toutes `sourceRoot`
à la chaîne vide, donc cela n'ajoute aucun préfixe », et confirmée deux tours plus tard.

Notez ce qui devait être vrai pour que cela soit repéré. Le JSON brut des cartes était dans
l'enveloppe. Si la preuve était restée le tableau récapitulatif du tour 3 — celui qui disait `maps
with a sourceRoot set : 0 of 86` — les deux vérificateurs n'auraient rien eu à contester, et une
affirmation fausse aurait été rapportée comme vérifiée.

**Envoyez l'artefact, pas votre lecture de l'artefact. C'est tout le mécanisme.**

## La recette qui a fonctionné

Au moment du quatrième constat, deux tours ont suffi. Voici ce qui avait changé :

1. **Délimitez l'affirmation à exactement ce que la preuve montre.** Pas de « tout », « toujours » ou
   « chaque » à moins d'avoir tout inspecté. Pas de lien causal à moins d'avoir isolé la variable.
2. **Mettez la sortie brute dans l'enveloppe.** Transcriptions de commandes, réponses d'API, listings
   complets de fichiers, JSON avec seulement les blobs non pertinents élidés. Vos tableaux ont leur
   place dans l'affirmation, pas dans la preuve.
3. **Liez l'artefact.** Des empreintes qui correspondent à ce que le registre publie, ou un hachage
   de commit accompagné d'un `git status` propre.
4. **Une seule variable par comparaison,** avec la sortie de `diff` incluse pour que le lecteur
   puisse le vérifier lui-même.
5. **Scindez les affirmations composées.** Si deux moitiés renvoient à des états différents, ce sont
   deux affirmations.
6. **Incluez les commandes exactes.** Pas une description de ce que vous avez exécuté.

Un `confirmed` obtenu du premier coup signifie en général que l'affirmation était trop faible pour
valoir la peine d'être formulée. Attendez-vous à itérer.

## Une enveloppe qui est passée

Voici la forme du lot de preuves derrière les tours 10 et 11 :

```text
=== CRYPTOGRAPHIC BINDING: the analyzed file IS the tarball npm serves ===
  local sha1 / registry dist.shasum        -> match
  local sha512 / registry dist.integrity   -> match

=== RAW ARTIFACT DATA — no derived tables in this section ===
--- 1. Registry metadata, verbatim from the registry API ---
--- 2. sha256 of the tarball this evidence was produced from ---
--- 3. Complete tarball entry listing, verbatim from `tar -tzf` (all entries) ---
--- 4. Raw JSON of every .map file, with only the base64 `mappings` blob elided ---
```

Et l'affirmation qu'elle portait :

> Dans le tarball `xverify-cli@0.1.0` servi par le registre npm, aucun fichier `.map` ne peut
> résoudre sa source déclarée depuis l'intérieur du paquet lui-même : les 86 cartes définissent
> toutes `sourceRoot` à la chaîne vide, ce qui n'ajoute aucun préfixe, aucune n'intègre
> `sourcesContent`, chaque source déclarée se résout vers un chemin sous `src/`, et le tarball ne
> contient aucune entrée `src/`.

Remarquez la forme : l'affirmation énonce quatre faits vérifiables et une conclusion qui en découle
mécaniquement. Rien n'y oblige le vérificateur à faire confiance au jugement de l'auteur.

## Ce que ce canal ne peut pas vérifier

Le tour 25 est le mur, et c'est un choix de conception plutôt qu'un défaut.

> [...] l'état historique du dépôt n'a pas pu être vérifié de façon indépendante, car l'espace de
> travail disponible n'est pas un dépôt Git et ne contient ni les fichiers référencés ni les objets
> de commit.

Un vérificateur reçoit une preuve bornée sur l'entrée standard. Il ne peut pas exécuter `git log`, ne
peut pas ouvrir votre dépôt, et ne peut pas ré-exécuter vos commandes. Donc une affirmation dont la
vérité réside dans quelque chose que le vérificateur ne peut pas atteindre — l'historique git, un
registre privé, l'état de votre CI — peut être _soutenue_ par une transcription, mais jamais
_authentifiée_. Codex a dit que la transcription était cohérente en interne avec l'affirmation, et a
quand même renvoyé `unclear`, ce qui est la bonne réponse.

Cursor a renvoyé `confirmed` sur la même preuve. Ce désaccord est instructif en soi : les deux canaux
ont tracé des lignes différentes sur ce que vaut une transcription collée. Aucun des deux ne
dysfonctionne.

Prévoyez cette limite. Les affirmations sur des **artefacts que vous pouvez mettre dans
l'enveloppe** se vérifient bien. Les affirmations sur l'**historique, l'infrastructure ou le
processus** ne se vérifient pas bien, et vous devriez plutôt chercher un enregistrement signé ou un
journal de CI que le lecteur peut vérifier de façon indépendante.

## Fiabilité des canaux, mesurée

Sur ces 26 tours :

| Canal              | Tours | A produit un verdict | Échecs de schéma (code `6`) |
| ------------------ | ----: | -------------------: | --------------------------: |
| `codex` (`openai`) |    16 |                   16 |                           0 |
| `cursor`           |    10 |                    7 |                           3 |

L'adaptateur `cursor` n'impose aucun schéma côté fournisseur — sa ligne dans la [matrice des
adaptateurs intégrés](../provider-adapters.md) indique « contrat de prompt ; validation par le
cœur » — donc un modèle qui ignore l'instruction de sortie produit un code de sortie `6` et aucun
verdict. Traitez le code de sortie `6` des adaptateurs `cursor` ou `command` comme réessayable, et
bornez vos tentatives.

Ne réessayez jamais un `refuted` jusqu'à ce qu'il devienne `confirmed`. C'est du verdict shopping, et
cela transforme un second avis en une façon coûteuse de vous donner raison à vous-même.

## Ce que cela a coûté

26 tours facturables pour 5 constats. La répartition est déséquilibrée, et il vaut la peine de la
prévoir :

- Constat 1, en apprenant les règles à partir de zéro : **11 tours**
- Constat 5, en heurtant une limite de canal : **6 tours**
- Constat 2 : 4 tours · Constat 4 : 3 tours · Constat 3, recette appliquée : **2 tours**

Le premier constat que vous vérifierez sera le plus coûteux. Prévoyez un budget pour l'itération, et
utilisez [le fournisseur simulé](no-account-walkthrough.md) pour régler correctement votre enveloppe
et la gestion des codes de sortie, avant de dépenser du quota sur le jugement d'un modèle.

## Voir aussi

- [Modes d'échec](failure-modes.md) — chaque échec typé et ce qui le produit
- [Parcours sans compte fournisseur](no-account-walkthrough.md) — tous les résultats possibles, sans
  consommer de quota
- [Exemples de vérification commentés](README.md) — les scénarios métier
- [Adaptateurs de fournisseurs](../provider-adapters.md) — quels adaptateurs imposent le schéma de
  sortie
