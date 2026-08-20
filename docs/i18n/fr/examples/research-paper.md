[English](../../../examples/research-paper.md) · [Türkçe](../../tr/examples/research-paper.md) · [Deutsch](../../de/examples/research-paper.md) · [简体中文](../../zh-CN/examples/research-paper.md) · [Español](../../es/examples/research-paper.md) · **Français**

# Article de recherche : le résultat affirmé n'a jamais été mesuré

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Une étude fictive rapporte un écart de résultat à un quiz à court terme. L'affirmation, elle, porte
sur la rétention à six mois. Ce n'est pas la même chose, et tout l'exemple tient dans cet écart.

- Déclaration de l'auteur : `openai:gpt-5.6-sol`
- Vérificateur : `anthropic:claude-fable-5` via l'adaptateur `claude`
- Preuve : [research-paper.md](../../../examples/evidence/research-paper.md)
- Observé le 2026-08-20 : `unclear`, code de sortie `11`, `failure: null`

## Affirmation

> Les étudiants qui utilisent l'assistant de tutorat retiennent au moins 15 % de matière en plus après
> six mois que les étudiants qui utilisent le guide d'étude existant.

## Reproduire

```sh
cat docs/examples/evidence/research-paper.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Students who use the tutoring assistant retain at least 15% more course material after six months than students who use the existing study guide." \
  --context-label docs/examples/evidence/research-paper.md
```

## Résultat normalisé observé

```json
{
  "verdict": "unclear",
  "exitCode": 11,
  "failure": null,
  "summary": "The claim asserts at least 15% greater retention after six months, but the supplied evidence contains no six-month measurement of any kind. The only observed outcome is a two-week quiz difference (78% vs 66%), which measures a different timeframe and construct and cannot substantiate the claim. The evidence also cannot refute the claim, since no six-month data contradicts it.",
  "materialFindings": [
    "[high] No six-month retention outcome exists in the supplied evidence, so the central quantity of the claim was never measured.",
    "[medium] The two-week quiz result is the only outcome data; extrapolating it to the claimed outcome is unjustified, with no confidence interval or adjusted analysis reported.",
    "[medium] Assignment was not randomized, so even the observed two-week difference may reflect selection effects.",
    "[medium] Differential attrition (8% vs 31%, 21 of 105 enrolled) plausibly biases the observed group difference."
  ]
}
```

## Pourquoi ce verdict

`unclear` est la bonne réponse, et c'est la plus difficile à gérer pour une intégration naïve.

La preuve n'est pas muette — elle contient un résultat bien réel, statistiquement frappant (78 %
contre 66 %, soit une différence relative d'environ 18,2 %, largement au-dessus des 15 % affirmés).
Un système réglé pour repérer des chiffres favorables aurait qualifié cela de `confirmed`. Le
vérificateur a plutôt remarqué que ce chiffre répond à une **question différente** de celle posée par
l'affirmation : la performance immédiate à un quiz n'est pas la rétention à six mois.

Il a aussi refusé de basculer dans l'autre sens. Rien dans la preuve ne contredit non plus
l'affirmation à six mois ; la donnée n'existe tout simplement pas. `refuted` aurait été tout aussi
erroné que `confirmed`.

Notez que `failure` vaut `null`. C'est un jugement sur la preuve, pas un problème de transport. Voir
[modes d'échec](failure-modes.md) pour les cas de code de sortie `11` qui portent un `failure` non
nul, et qui signifient tout autre chose.

## Ce qui le changerait

- **Vers `confirmed` :** une évaluation à six mois rapportant une taille d'effet et un intervalle,
  accompagnée soit d'une assignation randomisée, soit d'un ajustement crédible pour l'auto-sélection
  et l'écart d'attrition de 8 % contre 31 %.
- **Vers `refuted` :** une évaluation à six mois montrant un écart inférieur à 15 %.
- **Toujours `unclear` :** ajouter davantage de données à deux semaines. Gagner en précision sur le
  mauvais indicateur ne fait pas avancer une affirmation portant sur un indicateur différent.

## Décision

Ne traitez pas le score immédiat comme une preuve à long terme. Recueillez le résultat à six mois, ou
faites passer l'affirmation en revue humaine. C'est exactement le comportement voulu,
`UNKNOWN → review`, jamais `UNKNOWN → pass`.
