[English](../../json-contract.md) · [Türkçe](../tr/json-contract.md) · [Deutsch](../de/json-contract.md) · [简体中文](../zh-CN/json-contract.md) · [Español](../es/json-contract.md) · **Français**

# Contrat JSON et codes de sortie

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Passez l'option globale `--json` avant ou après une sous-commande. Xerify écrit sur stdout exactement un objet JSON compact suivi d'un saut de ligne final, sans aucune décoration de terminal.

Succès :

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

Erreur avant invocation, ou erreur de commande :

```json
{
  "ok": false,
  "schemaVersion": 1,
  "command": "verify",
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Provider executable is unavailable",
    "retryable": false,
    "details": {}
  }
}
```

Les données de `ask` et `verify` utilisent les mêmes schémas que leurs outils MCP respectifs. Les artefacts Draft 2020-12 publiés se trouvent dans `schemas/` et sont générés à partir des schémas Zod du runtime.

`provider` désigne le service d'invocation, de facturation et de contrôle. Cursor Agent est `cursor`
pour tout identifiant de modèle exact ; l'accès direct à Codex/OpenAI est `openai` ; l'accès direct à
Claude/Anthropic est `anthropic`. Cette base d'identité mesure la diversité des canaux, pas
l'indépendance du modèle en amont. `health` et les capacités MCP indiquent explicitement
`identityBasis: "invocation-provider"`.

Une charge utile de vérificateur réussie peut ajouter `evidence`, `assumptions`, `limitations` et `unverifiedClaims`. Ces champs sont optionnels, pour rester compatibles. Les adaptateurs de fournisseur structurés demandent ces quatre champs ; les adaptateurs de commande avec des charges utiles plus anciennes restent acceptés. Les entrées de `evidence` sont des références bornées, rapportées par le vérificateur dans le contexte fourni, et non des citations validées de façon indépendante.

## Résultats de vérification

`confirmed`, `refuted`, et un `unclear` authentique sont des résultats de vérification complets. Une fois le cycle de vie du fournisseur démarré, un timeout, une annulation, un échec du fournisseur, une sortie structurée invalide, ou toute troncature d'entrée/sortie de vérification renvoient eux aussi un `VerifyResult` complet, avec `verdict: "unclear"` et un `failure` typé. Une preuve tronquée ne peut jamais produire `confirmed`. Le code de sortie du processus préserve la cause de plus bas niveau.

Cela signifie que l'appelant doit analyser stdout même lorsque le code de sortie est non nul.

### `providerMessage`

Un `failure` typé peut porter un `providerMessage` optionnel. Le `message` propre à Xerify est une
phrase fixe par code d'échec, et c'est sur lui que l'appelant doit fonder sa décision ;
`providerMessage` reprend les mots du fournisseur lui-même à propos du même échec, et c'est lui
qu'une personne doit lire. Sans lui, une CLI obsolète, une connexion expirée et un modèle rejeté
rapportent tous `Provider process exited unsuccessfully`, ce qui ne nomme aucune cause.

Le champ transporte la sortie du fournisseur : il est donc considéré comme non fiable et traverse
un pipeline fixe avant d'aboutir dans un résultat :

- au plus une ligne d'erreur déclarée, ou les quatre dernières lignes jointes avec `|` lorsque
  la sortie n'en déclare aucune ; chaque ligne est masquée individuellement avant d'être jointe ;
- les séquences OSC et CSI supprimées entièrement — charge utile comprise —, sous leurs deux
  formes, 7 bits (`ESC ]`, `ESC [`) et 8 bits (U+009D, U+009B), car un terminal qui accepte les
  contrôles 8 bits lit U+009B exactement comme il lit `ESC [`. Tout caractère de contrôle restant,
  à l'exception de la tabulation et du saut de ligne, est remplacé par un espace : C0, DEL et la
  plage C1 y compris, retour chariot inclus. Toute autre séquence d'échappement perd de la même
  façon son introducteur et ne conserve qu'une queue imprimable, dépourvue de toute fonction de
  contrôle ;
- les en-têtes `Authorization`, `Proxy-Authorization`, `Cookie` et `Set-Cookie` remplacés en
  entier — le nom et le reste de la ligne ensemble —, car un tel en-tête peut porter plusieurs
  valeurs, et n'en retirer que la première laisserait les autres en place ;
- les jetons `Bearer`, les JWT, les informations utilisateur d'URL, les préfixes de clé de
  fournisseur connus, et toute paire `label: value` dont le label contient `key`, `token`,
  `secret`, `password` ou `credential`, remplacés par `[REDACTED]` ;
- remplacement par `[REDACTED]` de toute suite ininterrompue restante de 24 caractères
  alphanumériques ou plus mélangeant lettres et chiffres, ce qui couvre un identifiant dont
  l'émetteur ne figure pas dans la liste de préfixes. Les identifiants qu'il vaut la peine de lire
  y survivent parce qu'ils se décomposent en segments courts : la plus longue suite ininterrompue
  dans `claude-opus-4-5-20251101` est de huit ;
- jamais plus long que 501 caractères : un message qui dépasserait cette limite est coupé à 500
  caractères et reçoit une unique ellipse `…` finale ;
- omission complète, plutôt qu'envoi d'une valeur vide, lorsque le fournisseur n'a rien dit
  d'exploitable.

Ce qui subsiste est une citation bornée, pas un champ analysé : elle n'a pas d'autre schéma que
`string`, son libellé appartient au fournisseur et change quand le fournisseur change, et elle peut
contenir des chemins du système de fichiers que le fournisseur a choisi d'imprimer. N'y fondez
aucune décision.

Le masquage relève de la défense en profondeur appliquée à du texte rédigé par le fournisseur, pas
d'une preuve. Les règles ci-dessus sont celles qui s'appliquent ; aucun ensemble fini de règles ne
peut être démontré comme couvrant tout identifiant qu'un fournisseur pourrait inventer, et la
dernière règle existe précisément parce qu'une liste de préfixes n'y est manifestement pas
parvenue. Traitez `providerMessage` comme la chaîne la moins fiable du résultat, et ne la
transmettez jamais à un endroit où un secret serait inacceptable.

| Sortie | Signification                                                                      |
| -----: | ---------------------------------------------------------------------------------- |
|    `0` | Commande réussie ; réponse de `ask` ou vérification confirmée                      |
|    `2` | Entrée/config invalide, même fournisseur des deux côtés, ou provenance improuvable |
|    `3` | Exécutable, endpoint ou authentification du fournisseur indisponible               |
|    `4` | Timeout ou annulation                                                              |
|    `5` | Échec de transport du fournisseur, du processus ou de l'API                        |
|    `6` | Réponse du fournisseur invalide, incomplète ou non conforme au schéma              |
|   `10` | Vérification réfutée                                                               |
|   `11` | Vérification indécise, sans échec de plus bas niveau                               |

Une découverte sans aucun résultat reste un succès. Les valeurs d'usage absentes restent `null` ; Xerify n'estime jamais le nombre de jetons ni le coût. La troncature d'entrée/sortie est explicite dans les métadonnées du résultat.

## Politique de compatibilité

- Chaque enveloppe et chaque résultat publics portent `schemaVersion: 1`.
- Supprimer ou réinterpréter un champ existant constitue une rupture de compatibilité.
- Un nouveau champ optionnel peut être ajouté de façon additive.
- Les schémas stricts rejettent tout champ d'entrée ou de configuration inconnu.
- Les schémas de requête publics acceptent une provenance d'auteur `declared` ou `unknown`, et exigent une cible `declared`. Ils rejettent tout `observed` fourni par l'appelant ; une provenance d'auteur `unknown` échoue alors la règle d'admission « fournisseurs différents ».
- Les valeurs secrètes, les en-têtes d'autorisation bruts, les fragments de jeton, les chemins d'identifiants, le prompt/contexte, le texte de réponse et les résultats détaillés ne sont jamais placés par Xerify dans les erreurs typées ni dans les journaux d'audit.
- Le seul champ qui fait entrer du texte rédigé par le fournisseur dans une erreur typée est `providerMessage`, qui est masqué et borné comme décrit dans [Résultats de vérification](#providermessage). Un chemin que le fournisseur a lui-même imprimé peut y apparaître ; les identifiants y sont masqués par les règles qui y sont énumérées, lesquelles relèvent de la défense en profondeur plutôt que d'une garantie.
