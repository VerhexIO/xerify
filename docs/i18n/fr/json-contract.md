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
- Les valeurs secrètes, les en-têtes d'autorisation bruts, les fragments de jeton, les chemins d'identifiants, le prompt/contexte, le texte de réponse et les résultats détaillés n'entrent jamais dans les erreurs typées ni dans les journaux d'audit.
