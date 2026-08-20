[English](../../../examples/dogfood-package-boundary.md) · [Türkçe](../../tr/examples/dogfood-package-boundary.md) · [Deutsch](../../de/examples/dogfood-package-boundary.md) · [简体中文](../../zh-CN/examples/dogfood-package-boundary.md) · [Español](../../es/examples/dogfood-package-boundary.md) · **Français**

# Dogfooding : ce que contient réellement le paquet npm publié

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Xerify vérifie une affirmation sur son propre périmètre de distribution, à partir d'un reçu généré
plutôt que d'un résumé rédigé par un humain.

- Déclaration de l'auteur : `openai:gpt-5.6-sol`
- Vérificateur : `anthropic:claude-fable-5` via l'adaptateur `claude`
- Preuve : [dogfood-package-boundary.md](../../../examples/evidence/dogfood-package-boundary.md)
- Observé le 2026-08-20 : `confirmed`, code de sortie `0`

## Affirmation

> Le reçu d'essai à blanc npm fourni pour xverify-cli@0.1.0 indique que chaque chemin requis listé —
> runtime, exemples et localisation — est présent, et ne signale aucun chemin de paquet correspondant
> à ses règles interdites, qu'elles portent sur les fichiers internes ou sur l'état local.

## Reproduire

Régénérez d'abord le reçu — `entryCount` et `unpackedSize` changent à chaque modification de la
documentation :

```sh
npm pack --dry-run --json --ignore-scripts
```

```sh
cat docs/examples/evidence/dogfood-package-boundary.md | xerify --json --timeout 300000 verify \
  --adapter claude \
  --from openai:gpt-5.6-sol \
  --to anthropic:claude-fable-5 \
  --claim "The supplied npm dry-run receipt for xverify-cli@0.1.0 reports every listed required runtime, example, and localization path as present, and reports no package path matching its listed internal or local-state forbidden rules." \
  --context-label docs/examples/evidence/dogfood-package-boundary.md
```

## Résultat normalisé observé

```json
{
  "verdict": "confirmed",
  "exitCode": 0,
  "failure": null,
  "summary": "The dry-run receipt for xverify-cli@0.1.0 lists eight required paths under requiredPathsPresent and reports every one as true. Its forbiddenMatches array is empty against the fourteen listed forbidden rules, and none of the sixteen topLevelEntries matches any forbidden rule such as src/, tests/, .github/, .xerify/, AGENTS.md, or CONTRIBUTING.md.",
  "materialFindings": [
    "[info] All eight required paths are reported present, covering runtime, example, and localization categories.",
    "[info] forbiddenMatches is empty, and cross-checking topLevelEntries against the fourteen rules yields no match.",
    "[low] The receipt shows entryCount 229 but enumerates only 16 top-level entries, so forbiddenMatches cannot be independently recomputed from a full file manifest; it can only be read as the receipt's own report.",
    "[info] The name discrepancy between the pre-publication candidate name xerify and the published name xverify-cli is explained in the evidence prose and does not contradict the claim."
  ]
}
```

## Pourquoi ce verdict

Remarquez le soin avec lequel l'affirmation est délimitée : elle porte sur **ce que rapporte le
reçu**, pas sur ce que sert le registre. C'est précisément ce cadrage qui la rend vérifiable. Une
affirmation du type « le paquet publié ne contient aucun fichier source » serait invérifiable à
partir de cette preuve, puisque la preuve est un essai à blanc local.

Le résultat `low` montre le vérificateur qui surveille cette frontière depuis l'autre côté. Il a
observé que `forbiddenMatches: []` ne peut pas être recalculé de façon indépendante, car le reçu ne
liste que 16 entrées de premier niveau sur 229 fichiers au total. Il fait donc confiance à
l'assertion même du reçu — et il l'a dit, plutôt que de traiter silencieusement un champ
récapitulatif comme une vérité établie.

Le nom candidat `xerify` a été rejeté par npm en tant que nom non scopé ; la distribution publiée est
`xverify-cli`, et l'exécutable installé est `xerify`. Le vérificateur a vérifié que cet écart était
expliqué plutôt que contradictoire.

## Ce qui le changerait

- **Vers `refuted` :** toute entrée `requiredPathsPresent` rapportant `false`, ou un
  `forbiddenMatches` non vide. Remettre `src/` dans le tableau `files` de `package.json` reproduit ce
  cas.
- **Vers `unclear` :** un reçu dont les champs récapitulatifs auraient été retirés, ne laissant plus
  au vérificateur aucune base pour les assertions précises de l'affirmation.

## Décision

Poursuivez en le traitant comme un candidat pour une passerelle de publication. Associez-le à une
vérification qui recalcule `forbiddenMatches` à partir de la liste complète des fichiers, puisque le
vérificateur a correctement signalé qu'il ne pouvait pas le faire à partir de cette seule preuve.
