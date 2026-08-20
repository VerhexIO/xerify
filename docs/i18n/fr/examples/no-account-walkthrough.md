[English](../../../examples/no-account-walkthrough.md) · [Türkçe](../../tr/examples/no-account-walkthrough.md) · [Deutsch](../../de/examples/no-account-walkthrough.md) · [简体中文](../../zh-CN/examples/no-account-walkthrough.md) · [Español](../../es/examples/no-account-walkthrough.md) · **Français**

# Parcours sans compte fournisseur : tous les résultats possibles, sans consommer de quota

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Vous n'avez besoin d'aucun compte fournisseur, d'aucune clé API, ni d'aucune connexion pour découvrir
comment Xerify se comporte. Cette page parcourt **chaque verdict et chaque échec typé**, grâce à un
fournisseur simulé déterministe fourni avec le paquet.

Rien ici ne contacte un service réseau. Rien ici n'est facturé. Chaque sortie ci-dessous a été
observée en exécutant exactement ces commandes.

## Pourquoi un fournisseur simulé

L'adaptateur `command` de Xerify exécute n'importe quel exécutable, envoie le prompt sur l'entrée
standard, et lit la réponse depuis stdout. Peu lui importe qu'un modèle de langage ait produit cette
réponse ou non. Un script fixe est donc un fournisseur parfaitement valide — un fournisseur dont vous
contrôlez les réponses, ce qui rend chaque résultat reproductible.

Le simulateur se trouve dans `tools/mock-provider.mjs`. Il prend un seul argument, le
nom du scénario, ignore le prompt, et affiche une réponse fixe.

> **Disponibilité :** le simulateur est fourni à partir de `0.1.1`. Il ne figure pas dans
> l'archive `0.1.0` — sur cette version, utilisez un clone source du dépôt, ou copiez le fichier
> depuis le dépôt vers votre propre projet et faites pointer `args` vers votre copie. Tout le
> reste de cette page fonctionne sans changement.

## Mise en place

Commencez par trouver le chemin installé. Le simulateur doit être référencé par un **chemin
absolu** — un adaptateur `command` s'exécute dans un nouveau répertoire temporaire, si bien que les
chemins relatifs ne se résolvent jamais.

```sh
# From a source checkout
MOCK="$PWD/tools/mock-provider.mjs"

# From a global npm install
MOCK="$(npm root -g)/xverify-cli/tools/mock-provider.mjs"

# From a project-local install
MOCK="$PWD/node_modules/xverify-cli/tools/mock-provider.mjs"

echo "$MOCK"
```

Écrivez une configuration jetable qui enregistre un adaptateur par scénario. La garder dans un
répertoire temporaire signifie que votre configuration réelle reste intacte.

```sh
WORK="$(mktemp -d)"
cat > "$WORK/config.json" <<EOF
{
  "providers": {
    "mockConfirmed": { "kind": "command", "provider": "mock-lab",       "executable": "node",
      "args": ["$MOCK", "confirmed"],  "authKind": "local", "structuredOutput": true },
    "mockRefuted":   { "kind": "command", "provider": "mock-rebuttal",  "executable": "node",
      "args": ["$MOCK", "refuted"],    "authKind": "local", "structuredOutput": true },
    "mockUnclear":   { "kind": "command", "provider": "mock-hedge",     "executable": "node",
      "args": ["$MOCK", "unclear"],    "authKind": "local", "structuredOutput": true },
    "mockProse":     { "kind": "command", "provider": "mock-prose",     "executable": "node",
      "args": ["$MOCK", "prose"],      "authKind": "local", "structuredOutput": true },
    "mockMalformed": { "kind": "command", "provider": "mock-malformed", "executable": "node",
      "args": ["$MOCK", "malformed"],  "authKind": "local", "structuredOutput": true },
    "mockOffSchema": { "kind": "command", "provider": "mock-offschema", "executable": "node",
      "args": ["$MOCK", "off-schema"], "authKind": "local", "structuredOutput": true },
    "mockCrash":     { "kind": "command", "provider": "mock-crash",     "executable": "node",
      "args": ["$MOCK", "crash"],      "authKind": "local", "structuredOutput": true },
    "mockSlow":      { "kind": "command", "provider": "mock-slow",      "executable": "node",
      "args": ["$MOCK", "slow"],       "authKind": "local", "structuredOutput": true },
    "mockFlood":     { "kind": "command", "provider": "mock-flood",     "executable": "node",
      "args": ["$MOCK", "flood"],      "authKind": "local", "structuredOutput": true },
    "notInstalled":  { "kind": "command", "provider": "absent-vendor",
      "executable": "definitely-not-installed-cli", "args": [], "authKind": "subscription" }
  },
  "history": { "enabled": false },
  "logPath": null
}
EOF
chmod 600 "$WORK/config.json"
export XERIFY_USER_CONFIG_PATH="$WORK/config.json"
```

`XERIFY_USER_CONFIG_PATH` fait pointer Xerify vers ce fichier, sans toucher à votre répertoire
personnel ni au `.xerify/` de votre projet. `history.enabled: false` empêche ce parcours d'écrire des
enregistrements d'exécution.

Deux variables shell permettent de garder des commandes courtes :

```sh
EVIDENCE="Evidence E-1: the deployment log shows the migration completed at 04:12 UTC with zero failed rows."
CLAIM="The database migration completed cleanly."
```

Vérifiez le câblage avant d'aller plus loin :

```sh
xerify --json providers list
```

Vous verrez les dix adaptateurs simulés ci-dessus, **plus** les adaptateurs intégrés `codex`
(`openai`) et `claude` (`anthropic`), ainsi que tout adaptateur défini par la configuration de votre
propre projet. La configuration se fusionne avec les valeurs par défaut, elle ne les remplace
jamais ; le nombre exact dépend donc de votre installation.

Chaque simulateur possède volontairement sa propre identité `provider`. La vérification entre un
même fournisseur est rejetée, donc une identité partagée bloquerait chaque commande ci-dessous. Cette
identité propre à chaque adaptateur évite aussi que les simulateurs n'entrent en collision avec les
adaptateurs intégrés — quand deux adaptateurs répondent à une même identité, c'est le premier
enregistré qui l'emporte, et les adaptateurs intégrés s'enregistrent en premier. Voir [modes
d'échec](failure-modes.md#6b-the-wrong-adapter-answered--exit-5-where-you-expected-exit-3).

## Les trois verdicts

### `confirmed` — code de sortie `0`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-lab:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "confirmed",
  "summary": "The supplied evidence supports the claim and no counterexample appears.",
  "findings": [],
  "evidence": [
    {
      "reference": "supplied evidence envelope",
      "observation": "Deterministic mock response; no model judgement was involved."
    }
  ],
  "truncation": { "input": false, "output": false },
  "failure": null
}
```

Code de sortie `0`. Notez `failure: null` — c'est un véritable verdict, pas un repli opérationnel.

### `refuted` — code de sortie `10`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-rebuttal:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "refuted",
  "summary": "The supplied evidence contains a direct counterexample to the claim.",
  "findings": [
    {
      "severity": "high",
      "message": "The evidence states the opposite of the claim.",
      "evidence": "supplied evidence envelope"
    }
  ],
  "failure": null
}
```

Code de sortie `10`. Dans une exécution réelle, c'est le tableau `findings` qui porte la substance ;
voir les [exemples commentés](README.md) pour des verdicts avec quatre ou cinq résultats concrets.

### `unclear` — code de sortie `11`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-hedge:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "unclear",
  "summary": "The supplied evidence is insufficient to decide the claim either way.",
  "failure": null
}
```

Code de sortie `11` avec `failure: null`. C'est le vérificateur qui dit, en substance, _« les preuves
ne permettent pas de trancher »_ — un résultat épistémique, pas un dysfonctionnement. Comparez-le aux
échecs voisins du code `11` ci-dessous, qui portent tous un `failure` non nul.

## Les échecs typés

Chaque commande ci-dessous tient sur une ligne. L'explication complète de chaque résultat, et la
façon de le corriger dans un déploiement réel, se trouve dans [modes d'échec](failure-modes.md).

```sh
# 1. L'exécutable est totalement absent -> code de sortie 3, ok:false, PROVIDER_UNAVAILABLE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to absent-vendor:any --claim "$CLAIM"; echo "exit=$?"

# 2. Même fournisseur d'invocation des deux côtés -> code de sortie 2, aucun fournisseur contacté
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to openai:gpt-5.6-sol --claim "$CLAIM"; echo "exit=$?"

# 3. Le fournisseur répond en prose -> code de sortie 6, INVALID_PROVIDER_RESPONSE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-prose:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 4. Le fournisseur renvoie un JSON tronqué -> code de sortie 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-malformed:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 5. JSON valide, mais valeur de verdict invalide -> code de sortie 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-offschema:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 6. Le processus du fournisseur se termine avec un code non nul -> code de sortie 5, PROVIDER_FAILURE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-crash:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 7. Le fournisseur est plus lent que --timeout -> code de sortie 4, TIMEOUT
echo "$EVIDENCE" | xerify --json --timeout 1500 verify \
  --from openai:gpt-5.6-sol --to mock-slow:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 8. La réponse dépasse la limite de sortie -> code de sortie 6, truncation.output true
echo "$EVIDENCE" | XERIFY_MAX_OUTPUT_BYTES=4096 xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-flood:mock-1 --claim "$CLAIM"; echo "exit=$?"
```

Codes de sortie attendus, dans l'ordre : `3`, `2`, `6`, `6`, `6`, `5`, `4`, `6`.

Le scénario numéro 3 mérite qu'on s'y arrête. Le simulateur répond `Yes, that looks right to me. I
would ship it.` — un accord sans ambiguïté, en anglais courant. Xerify renvoie pourtant `unclear`
avec le code de sortie `6`, parce qu'un accord exprimé en prose n'est pas un verdict au sens du
contrat. Ce refus, c'est le produit.

## Vérifier toute la surface d'un coup

Une seule boucle permet de vérifier chaque code de sortie. C'est un test de fumée raisonnable pour
une intégration :

```sh
check() {
  echo "$EVIDENCE" | xerify --json ${3:-} verify \
    --from openai:gpt-5.6-sol --to "$1:mock-1" --claim "$CLAIM" >/dev/null 2>&1
  actual=$?
  [ "$actual" = "$2" ] && echo "ok   $1 -> $actual" || echo "FAIL $1 -> $actual (want $2)"
}

check mock-lab       0
check mock-rebuttal  10
check mock-hedge     11
check mock-prose     6
check mock-malformed 6
check mock-offschema 6
check mock-crash     5
check mock-slow      4 "--timeout 1500"
check absent-vendor  3
```

## Nettoyage

```sh
unset XERIFY_USER_CONFIG_PATH
rm -rf "$WORK"
```

Rien n'a été écrit dans votre projet. Si vous avez activé l'historique en retirant `"history" : {
"enabled" : false }`, supprimez aussi `.xerify/runs/`.

## Pour aller plus loin

- [Modes d'échec](failure-modes.md) — pourquoi chaque échec se produit, et comment le corriger en
  production
- [Exemples de vérification commentés](README.md) — les mêmes cas contre de vrais fournisseurs, avec
  de vrais désaccords
- [Configuration du projet](../configuration.md) — priorité, permissions, et le schéma de
  configuration complet
- [Référence CLI](../cli-reference.md) — chaque commande et chaque indicateur
