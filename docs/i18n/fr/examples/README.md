[English](../../../examples/README.md) · [Türkçe](../../tr/examples/README.md) · [Deutsch](../../de/examples/README.md) · [简体中文](../../zh-CN/examples/README.md) · [Español](../../es/examples/README.md) · **Français**

# Exemples de vérification commentés

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Ces pages montrent la forme complète d'un usage de Xerify : une affirmation bornée, les preuves
susceptibles de quitter la machine, un modèle cible exact, un résultat normalisé, et la décision que
l'appelant doit prendre à la sortie.

Ce sont des **exécutions réellement observées**, pas des verdicts préfabriqués. Chaque résultat de
ces pages a été produit en exécutant la commande indiquée, à la date indiquée. Relancer la même
commande déclenche une nouvelle vérification, sans garantie de rejouer le même résultat — voir
[modes d'échec](failure-modes.md) pour un cas documenté où une commande identique a produit deux
résultats différents.

## Commencez ici si vous n'avez aucun compte fournisseur

Le [parcours sans compte fournisseur](no-account-walkthrough.md) reproduit **chaque verdict et
chaque échec typé** sans consommer le moindre quota fournisseur, grâce à un fournisseur simulé
déterministe fourni avec le paquet. C'est le moyen le plus rapide de comprendre le contrat des codes
de sortie avant de dépenser un appel réel.

## Le catalogue des échecs

[Modes d'échec](failure-modes.md) documente chaque résultat autre que `confirmed` : ce qui le
produit, la sortie exacte, pourquoi cela arrive, et ce qu'il faudrait changer pour obtenir un
résultat exploitable. Cette page couvre la CLI du fournisseur non installée, la CLI du fournisseur
non **connectée**, le rejet pour fournisseur identique, le modèle `auto` de Cursor, une réponse en
prose au lieu de JSON, des réponses tronquées ou hors schéma, des codes de sortie non nuls côté
fournisseur, des timeouts, une troncature de sortie, et une instabilité observée d'une exécution à
l'autre.

Lisez-le avant toute intégration. Le bug d'intégration le plus fréquent consiste à traiter le code de
sortie `11` comme une seule chose alors qu'il en recouvre deux — un véritable verdict `unclear`, ou
un échec opérationnel qui porte simplement la même étiquette de verdict.

## Ce à quoi ressemble vraiment une vérification

[Dogfooding](dogfooding.md) est un journal de 26 tours passés à faire passer cinq constats sur
Xerify par `xerify verify`, face aux canaux `codex` et `cursor`. Neuf sont revenus `confirmed`, deux
sont revenus `refuted` parce qu'une affirmation était fausse, et douze sont revenus `unclear` parce
que la preuve n'établissait pas ce que l'affirmation avançait. La page nomme les quatre catégories de
rejet, cite les objections mot pour mot, et montre la forme d'enveloppe qui a fini par passer.

Lisez-la avant d'écrire votre première affirmation. C'est la différence entre deux tours et onze.

## Exemples en conditions réelles

Les cinq scénarios métier sont synthétiques. Ils ne contiennent aucune donnée réelle de participant,
de client, d'analytique ou de projet. Les deux scénarios « dogfood » utilisent des preuves publiques
tirées du paquet et du code source de Xerify. Les affirmations utilisent une provenance déclarée via
la CLI ; Xerify ne prétend jamais que cette déclaration vaut attestation distante.

| Exemple                                                                                                   | Fournisseur d'invocation / modèle cible | Observé     | Sortie |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- | -----: |
| [Article de recherche](research-paper.md) — le résultat affirmé n'a jamais été mesuré                     | Anthropic / `claude-fable-5`            | `unclear`   |     11 |
| [Plan de production d'un jeu](game-design.md) — l'arithmétique de capacité ne tient pas                   | Cursor / `cursor-grok-4.6-high-fast`    | `refuted`   |     10 |
| [Décision de site web](website-decision.md) — la matrice sélectionne l'autre option                       | Anthropic / `claude-fable-5`            | `refuted`   |     10 |
| [Analyse de données](data-analysis.md) — un agrégat qui s'inverse sous stratification                     | Cursor / `cursor-grok-4.6-high-fast`    | `refuted`   |     10 |
| [Revue de sortie de données](outbound-data-policy.md) — la pseudonymisation n'est pas une autorisation    | Anthropic / `claude-fable-5`            | `refuted`   |     10 |
| [Dogfooding : l'adaptateur Cursor](dogfood-cursor-adapter.md) — Xerify vérifie son propre code source     | OpenAI / `gpt-5.6-sol`                  | `confirmed` |      0 |
| [Dogfooding : le périmètre du paquet npm](dogfood-package-boundary.md) — ce que contient le paquet publié | Anthropic / `claude-fable-5`            | `confirmed` |      0 |

Cinq scénarios sur sept n'ont pas passé la vérification. Ce ratio est précisément ce qu'il faut
retenir : un vérificateur qui approuve la plupart du temps n'apporte aucune information.

## Comment lire un exemple

Chaque page distingue six éléments :

1. **Affirmation** — la proposition à falsifier, pas une demande d'accord.
2. **Reproduire** — la commande exacte, exécutable telle quelle.
3. **Preuve** — le seul matériel borné envoyé au fournisseur cible.
4. **Résultat normalisé observé** — des champs choisis après passage par l'analyseur strict de
   Xerify, jamais la sortie brute du fournisseur.
5. **Pourquoi ce verdict** — ce que le vérificateur a réellement attaqué, et ce qu'une vérification
   plus faible aurait manqué.
6. **Ce qui le changerait** — les preuves concrètes qui feraient bouger le résultat, dans les deux
   sens.

Les commandes de reproduction consomment du quota. Relisez d'abord le fichier de preuves, et
remplacez les identifiants de modèle par des identifiants exacts disponibles sur votre compte.

## Catalogue lisible par machine

[index.jsonl](../../../examples/index.jsonl) contient un enregistrement normalisé et compact par exemple de
vérification, à raison d'un objet JSON par ligne. Un agent peut le parcourir avant d'ouvrir la
moindre page Markdown.

Il exclut volontairement le transport brut du fournisseur, les identifiants de résultat, les durées,
les données de compte et de session, ainsi que les champs de coût et d'usage.

```sh
# Every example that did not pass
grep -v '"exitCode":0' docs/examples/index.jsonl

# Everything about outbound data
grep -i 'outbound' docs/examples/index.jsonl
```

## Fichiers de preuves

[evidence/](../../../examples/evidence/) contient le matériel exact et borné reçu par chaque vérification. Ce sont des
**artefacts de vérification ancrés par hachage** : l'historique local des exécutions enregistre un
SHA-256 de la preuve au moment de l'appel, si bien que modifier un fichier romprait la correspondance
entre l'enregistrement et le document.

C'est pourquoi les fichiers de preuves restent **exclusivement en anglais et ne sont jamais
traduits**. Les pages de prose de ce répertoire sont localisées ; les preuves qu'elles référencent
ne le sont pas.

## Ce que ces exemples ne prétendent pas

- Pas une preuve. Un verdict `confirmed` signifie qu'aucun contre-exemple n'a été trouvé dans les
  preuves fournies.
- Pas reproductible à l'identique. Les versions des modèles changent ; deux des exécutions
  présentées ici ont nécessité une seconde tentative.
- Pas une caution accordée à un modèle. Le nom d'un fournisseur n'est jamais une garantie de
  qualité — voir les deux résultats consécutifs en code de sortie `6` dans le dogfooding de
  l'adaptateur Cursor.

## Voir aussi

- [Index de la documentation](../README.md)
- [Contrat JSON et codes de sortie](../json-contract.md)
- [Adaptateurs de fournisseurs](../provider-adapters.md)
- [Politique de sécurité](../security.md)
