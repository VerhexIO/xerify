[English](../../../examples/dogfood-cursor-adapter.md) · [Türkçe](../../tr/examples/dogfood-cursor-adapter.md) · [Deutsch](../../de/examples/dogfood-cursor-adapter.md) · [简体中文](../../zh-CN/examples/dogfood-cursor-adapter.md) · [Español](../../es/examples/dogfood-cursor-adapter.md) · **Français**

# Dogfooding : Xerify vérifie son propre adaptateur Cursor

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Xerify vérifie une affirmation portant sur son propre code source. Ce qui est intéressant n'est pas
le verdict — c'est que les deux premières tentatives n'en ont produit aucun.

- Déclaration de l'auteur : `anthropic:claude-opus-5`
- Vérificateur : `openai:gpt-5.6-sol` via l'adaptateur `codex`
- Preuve : [dogfood-cursor-adapter.md](../../../examples/evidence/dogfood-cursor-adapter.md)
- Observé le 2026-08-20 : `confirmed`, code de sortie `0`

## Affirmation

> CursorAdapter rapporte le fournisseur cursor sans inférence par préfixe de modèle, et rejette le
> modèle auto avant de démarrer le processus Cursor.

## Reproduire

```sh
cat docs/examples/evidence/dogfood-cursor-adapter.md | xerify --json --timeout 300000 verify \
  --adapter codex \
  --from anthropic:claude-opus-5 \
  --to openai:gpt-5.6-sol \
  --claim "CursorAdapter reports provider cursor without model-prefix inference and rejects model auto before starting the Cursor process." \
  --context-label docs/examples/evidence/dogfood-cursor-adapter.md
```

## Résultat normalisé observé

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The supplied snippets adequately support the bounded claim: provider identity is returned explicitly as \"cursor\", and the exact \"auto\" model is rejected before temporary-workspace creation or the documented process-invocation point. No material counterexample appears within the supplied evidence.",
  "materialFindings": [
    "[low] The model normalization is narrower than it may appear: values such as \"auto [suffix]\" leave trailing whitespace before comparison and may bypass the gate. This does not contradict rejection of the exact tested value \"auto\", but it could be a regression path if annotated model strings are valid inputs.",
    "[info] The process-prevention test indirectly demonstrates non-execution because the configured executable cannot resolve, while the source ordering directly places validation before workspace and process creation."
  ]
}
```

## Pourquoi ce verdict

`confirmed` a ici un sens étroit, qu'il vaut la peine de préciser : _dans les extraits fournis_,
aucun contre-exemple à l'affirmation bornée n'a été trouvé. Ce n'est ni un audit de l'adaptateur, ni
une preuve.

Le résultat le plus précieux est le résultat `low`, que personne n'avait demandé. Le vérificateur a
remarqué que la normalisation du modèle découpe sur `[` puis coupe les espaces, si bien qu'une valeur
comme `auto [something]` pourrait ne pas se normaliser vers la chaîne exacte comparée par la garde.
C'est un chemin de régression hypothétique, pas un bug actuel — mais c'est précisément le genre
d'observation qu'un second avis existe pour faire remonter.

Lisez `confirmed` comme _« aucun contre-exemple trouvé dans ce que vous avez envoyé »_, jamais comme
_« correct »_.

## Ce qui le changerait

- **Vers `refuted` :** un chemin de code où `CursorAdapter` déduirait son identité de fournisseur à
  partir de l'identifiant du modèle, ou où le rejet de `auto` s'exécuterait après le démarrage du
  processus.
- **Vers `unclear` :** ne fournir que des descriptions en prose de l'adaptateur, plutôt que des
  extraits de code source primaire. Pendant la préparation, une tentative de dogfooding reposant
  uniquement sur de la prose a renvoyé `unclear`, exactement pour cette raison — Xerify ne transforme
  jamais une description architecturale plausible en preuve.

## Une remarque sur le choix du vérificateur

Cette affirmation porte sur l'adaptateur Cursor, donc la vérifier _via_ Cursor était le choix de
conception initial. Cela n'a pas fonctionné. Deux tentatives consécutives contre
`cursor:cursor-grok-4.6-high-fast` ont renvoyé le code de sortie `6` (`INVALID_PROVIDER_RESPONSE`) ;
le modèle n'a jamais émis le JSON requis. L'affirmation a été retargetée vers l'adaptateur `codex`,
qui impose le schéma, et qui a produit un verdict dès la première tentative.

Le sujet d'une affirmation et le canal qui la vérifie sont deux choix indépendants. Quand un verdict
doit être consommé par une machine, préférez un adaptateur qui fixe le schéma de sortie chez le
fournisseur. Voir [modes
d'échec](failure-modes.md#5-the-provider-answers-in-prose-instead-of-json--exit-6).

## Décision

Poursuivez en le traitant comme un candidat. Suivez le résultat `low` comme un point de durcissement
potentiel plutôt que comme un défaut.
