[English](../../../examples/website-decision.md) · [Türkçe](../../tr/examples/website-decision.md) · [Deutsch](../../de/examples/website-decision.md) · [简体中文](../../zh-CN/examples/website-decision.md) · [Español](../../es/examples/website-decision.md) · **Français**

# Décision de site web : la matrice sélectionne l'autre option

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Une décision d'architecture affirme un gagnant. La matrice de notation approuvée dit le contraire, et
elle le dit deux fois — une fois sur les totaux, une fois sur un seuil bloquant.

- Déclaration de l'auteur : `openai:gpt-5.6-sol`
- Vérificateur : `anthropic:claude-fable-5` via l'adaptateur `claude`
- Preuve : [website-decision.md](../../../examples/evidence/website-decision.md)
- Observé le 2026-08-20 : `refuted`, code de sortie `10`

## Affirmation

> Selon la matrice de décision pondérée approuvée, l'application SSR personnalisée avec une base de
> données dédiée est l'architecture de site web sélectionnée.

## Reproduire

```sh
cat docs/examples/evidence/website-decision.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "Under the approved weighted decision matrix, the custom SSR application with a dedicated database is the selected website architecture." \
  --context-label docs/examples/evidence/website-decision.md
```

## Résultat normalisé observé

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Recomputing the approved weighted matrix confirms the stated totals: the managed static build + headless CMS scores 4.8 while the custom SSR app + database scores 3.3, so the matrix selects the static option by 1.5 points. The SSR option also scores 2 on operational burden, below the gate threshold of 3, with no documented exception.",
  "materialFindings": [
    "[high] Weighted totals directly contradict the claim: 4.8 versus 3.3 under the approved scoring rule.",
    "[medium] The SSR option is independently blocked by the operational-burden gate: it scores 2 against a threshold of 3, and the evidence states no documented exception exists.",
    "[info] The only criterion where SSR wins is editorial workflow (5 vs 4, weight 20), insufficient to offset security exposure, operational burden, and cost predictability."
  ]
}
```

## Pourquoi ce verdict

Le vérificateur n'a pas pris les totaux de la matrice pour argent comptant — il les a **recalculés**
à partir des scores et des pondérations par critère, et a confirmé l'arithmétique avant de contredire
l'affirmation. Cette distinction compte : une réfutation qui se contente de citer un chiffre
contradictoire est plus faible qu'une réfutation qui reproduit le calcul.

Il a ensuite trouvé une seconde raison, indépendante de la première. Même si les totaux avaient été
proches, l'option SSR échoue à elle seule au seuil bloquant sur la charge opérationnelle. Deux motifs
sans rapport aboutissant à la même conclusion rendent cette réfutation robuste face à une simple
erreur de notation.

## Ce qui le changerait

- **Vers `confirmed` :** un jeu de pondérations révisé où l'avantage de SSR sur le flux éditorial
  compenserait ses faiblesses, _et_ une exception documentée au seuil bloquant sur la charge
  opérationnelle. Les deux sont nécessaires — franchir les totaux seuls laisse le seuil bloquant
  intact.
- **Vers `unclear` :** une preuve que la matrice a été remplacée, ou que le statut d'approbation des
  pondérations est contesté.

## Décision

Bloquez. L'affirmation contredit l'enregistrement de décision approuvé. Choisissez soit l'option
statique, soit modifiez la matrice via le processus qui l'a approuvée à l'origine — mais ne livrez
pas une décision que l'enregistrement ne soutient pas.
