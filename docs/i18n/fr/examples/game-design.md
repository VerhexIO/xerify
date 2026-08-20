[English](../../../examples/game-design.md) · [Türkçe](../../tr/examples/game-design.md) · [Deutsch](../../de/examples/game-design.md) · [简体中文](../../zh-CN/examples/game-design.md) · [Español](../../es/examples/game-design.md) · **Français**

# Plan de production d'un jeu : l'arithmétique ne tient pas dans les contraintes

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Une équipe de deux personnes, dix semaines, une liste de fonctionnalités fixe, et aucune permission
d'en retirer la moindre. L'affirmation est que cela fonctionne. L'arithmétique de capacité dit le
contraire.

Cet exemple documente aussi un **véritable échec de reproduction** — voir « Une remarque sur la
reproductibilité » ci-dessous.

- Déclaration de l'auteur : `openai:gpt-5.6-sol`
- Vérificateur : `cursor:cursor-grok-4.6-high-fast` via l'adaptateur `cursor`
- Preuve : [game-design.md](../../../examples/evidence/game-design.md)
- Observé le 2026-08-20 : `refuted`, code de sortie `10` (seconde tentative ; voir ci-dessous)

## Affirmation

> Le périmètre complet du lancement peut être livré par l'équipe de deux personnes en dix semaines,
> sans heures supplémentaires, sans prestataires externes, sans réduction de fonctionnalités, et sans
> extension du calendrier.

## Reproduire

```sh
cat docs/examples/evidence/game-design.md | xerify --json --timeout 300000 verify \
  --adapter cursor \
  --from openai:gpt-5.6-sol \
  --to cursor:cursor-grok-4.6-high-fast \
  --claim "The complete launch scope can be delivered by the two-person team within ten weeks, without overtime, contractors, feature cuts, or schedule extension." \
  --context-label docs/examples/evidence/game-design.md
```

## Résultat normalisé observé

```json
{
  "verdict": "refuted",
  "exitCode": 10,
  "failure": null,
  "summary": "Fixed two-person capacity is 800 person-hours over ten 40-hour weeks, while the required no-cut launch estimate is 1,120 hours before contingency and 1,344 hours with the studio's required 20% reserve. The same envelope forbids overtime, contractors, feature cuts, and schedule extension, so the gap cannot be closed under the stated constraints.",
  "materialFindings": [
    "[critical] Required launch work exceeds hard capacity even before contingency: 1,120 estimated person-hours versus 800 available, a 320-hour shortfall (40% over capacity).",
    "[critical] The studio-required 20% risk reserve raises the plan to 1,344 person-hours, a 544-hour shortfall.",
    "[high] Every lever that could close the gap is explicitly disallowed, and launch features cannot be removed or deferred.",
    "[medium] Inexperience on the riskiest scope makes beating the estimate an unsupported recovery path rather than a reason to treat the total as padding."
  ]
}
```

## Pourquoi ce verdict

C'est le type de réfutation le plus net qui soit : l'affirmation et ses propres contraintes sont
mutuellement incohérentes, et la contradiction relève de l'arithmétique, pas du jugement. 800 heures
disponibles ne peuvent pas absorber 1 120 heures requises quand le même document ferme toutes les
issues de secours.

Le vérificateur a aussi écarté l'échappatoire la plus tentante — « peut-être iront-ils simplement
plus vite que prévu » — au motif que la preuve indique une équipe inexpérimentée sur le périmètre le
plus risqué. L'optimisme n'est pas une preuve.

## Ce qui le changerait

- **Vers `confirmed` :** une réestimation sous les 800 heures, réserve de 20 % _incluse_, ou la levée
  de l'une des quatre contraintes. Ajouter un troisième ingénieur, étendre à quatorze semaines, ou
  retirer une fonctionnalité produisent chacun une affirmation différente et vérifiable.
- **Vers `unclear` :** une estimation donnée sous forme de fourchette sans niveau de confiance
  déclaré, dont la borne basse tiendrait dans la capacité disponible.

## Décision

Bloquez. Replanifiez avant de vous engager sur une date. La réfutation nomme quatre leviers précis,
dont chacun, pris isolément, produirait une affirmation capable de passer la vérification.

## Une remarque sur la reproductibilité

La commande ci-dessus a été lancée deux fois, sans aucun changement. La première tentative a renvoyé
le code de sortie `6` (`INVALID_PROVIDER_RESPONSE`) — le modèle n'a pas émis le JSON requis. La
seconde tentative a renvoyé le verdict en code `10` présenté ici. Les deux exécutions sont
enregistrées dans l'historique local des exécutions, avec des empreintes identiques pour l'énoncé et
la preuve.

L'adaptateur `cursor` n'impose aucun schéma côté fournisseur ; sa colonne de vérification structurée
dans la [matrice des adaptateurs intégrés](../provider-adapters.md) indique « contrat de prompt ;
validation par le cœur ». Traitez le code de sortie `6` des adaptateurs `cursor` ou `command` comme
réessayable, bornez le nombre de tentatives, et ne relancez jamais simplement parce qu'un verdict
vous a déplu. Voir [modes
d'échec](failure-modes.md#9-real-world-flakiness-the-same-command-two-different-outcomes).
