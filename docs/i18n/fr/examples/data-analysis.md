[English](../../../examples/data-analysis.md) · [Türkçe](../../tr/examples/data-analysis.md) · [Deutsch](../../de/examples/data-analysis.md) · [简体中文](../../zh-CN/examples/data-analysis.md) · [Español](../../es/examples/data-analysis.md) · **Français**

# Analyse de données : un agrégat qui s'inverse sous stratification

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Le chiffre affiché en tête dit que la variante B gagne haut la main. Une fois ventilé par appareil, B
perd sur ordinateur. C'est le paradoxe de Simpson, et c'est l'exemple qui a le plus de chances de
réapparaître dans vos propres tableaux de bord.

- Déclaration de l'auteur : `openai:gpt-5.6-sol`
- Vérificateur : `cursor:cursor-grok-4.6-high-fast` via l'adaptateur `cursor`
- Preuve : [data-analysis.md](../../../examples/evidence/data-analysis.md)
- Observé le 2026-08-20 : `refuted`, code de sortie `10`

## Affirmation

> La variante B améliore de façon causale la conversion des utilisateurs, et devrait être déployée
> sur l'ensemble du trafic mobile et ordinateur, sur la base du résultat agrégé.

## Reproduire

```sh
cat docs/examples/evidence/data-analysis.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "Variant B causally improves conversion for users and should be rolled out to all mobile and desktop traffic based on the aggregate result." \
  --context-label docs/examples/evidence/data-analysis.md
```

## Résultat normalisé observé

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "The aggregate B win is a mix-shift artifact, not a causal improvement. Device allocation is severely imbalanced; B is worse on desktop and only trivially higher on a small mobile sample. A universal rollout from the aggregate rate is contradicted by the stratified table.",
  "materialFindings": [
    "[critical] Simpson's paradox: B's aggregate conversion (64.92% vs 20.83%) is explained by B receiving most high-converting desktop traffic, not by a within-device treatment effect.",
    "[critical] Desktop counterexample: B converts at 76.0% versus A's 80.0%, so rolling B to all desktop traffic would be expected to reduce conversion in that segment.",
    "[high] Mobile does not support a rollout decision: B is 0.5pp higher on 200 visitors versus A's 1,000, with no uncertainty interval.",
    "[high] No identification evidence for a causal claim: no randomization receipt, sample-ratio-mismatch check, interval estimate, or mix adjustment. Device share is 83.3% mobile for A versus 16.7% for B."
  ]
}
```

## Pourquoi ce verdict

L'affirmation regroupe trois assertions — que B améliore la conversion, que cette amélioration est
_causale_, et qu'un déploiement universel en découle. Le vérificateur a attaqué chacune séparément,
et a trouvé l'objection la plus solide possible : un **contre-exemple direct dans les données
fournies**. B est moins bon sur ordinateur.

L'agrégat de 64,92 % contre 20,83 % n'est pas une erreur de calcul ; c'est un calcul correct
effectué sur une répartition confondue. Vérifier « ce chiffre est-il exact ? » aurait donné un
succès. Vérifier « ce chiffre soutient-il cette décision ? » ne le donne pas.

## Ce qui le changerait

- **Vers `confirmed` :** une preuve de randomisation, une vérification d'écart de ratio
  d'échantillonnage, des estimations d'intervalle par appareil, et un effet intra-appareil positif
  sur les deux segments. L'affirmation devrait aussi être resserrée — « améliore la conversion »
  n'est pas la même affirmation que « doit être déployé partout ».
- **Vers `unclear` :** une répartition équilibrée avec des intervalles larges. Les données ne
  soutiendraient ni ne contrediraient alors l'affirmation, plutôt que de la contredire comme c'est le
  cas ici.

## Décision

Bloquez le déploiement universel. Le tableau stratifié contient un contre-exemple à la
recommandation même de l'affirmation. Un déploiement limité au mobile est une affirmation
différente, qui nécessite sa propre vérification.
