<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.tr.md">Türkçe</a> ·
  <a href="README.de.md">Deutsch</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.es.md">Español</a> ·
  <strong>Français</strong>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/VerhexIO/xerify/main/assets/logos/full-horizontal/xerify-horizontal-light.svg" alt="Xerify" width="360">
</p>

<p align="center"><strong>Interrogez un autre fournisseur. Obtenez un second avis clair.</strong></p>

Xerify est un outil open source orienté shell pour des questions et vérifications inter-fournisseurs
à périmètre borné. Il peut utiliser les CLI officielles déjà authentifiées sur votre machine, des
API directes ou un exécutable explicitement configuré. La CLI, la bibliothèque
JavaScript/TypeScript, le MCP STDIO local et le MCP Streamable HTTP partagent le même cœur et les
mêmes schémas.

Xerify est créé et développé par **Verhex**, avec des contributions de la communauté, et distribué
sous licence MIT. Il constitue la couche de vérification inter-fournisseurs de **Deckent**, le
système d'exploitation agentique de Verhex, publiée ici comme outil autonome — Xerify fonctionne
seul et ne dépend en rien de Deckent.

Son résultat est un second avis, pas une preuve formelle, une certification de
sécurité ou une garantie de vérité. La sortie du fournisseur est une donnée non fiable et n'est
jamais exécutée.

> **État de publication :** `0.1.0` est une version candidate. Le paquet npm s'appelle
> `xverify-cli` ; le produit et la commande installée restent `xerify`.

## Installation

Après la première publication publique sur npm :

```sh
npm install --global xverify-cli@latest
xerify --version
xerify --json health
xerify init
```

Comme dépendance de développement épinglée :

```sh
npm install --save-dev --save-exact xverify-cli@0.1.0
npx xerify --version
```

Sans conserver de dépendance :

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

Node.js 20 ou ultérieur est requis ; Node.js 24 est la voie de publication principale. Consultez
le [guide complet en français](docs/i18n/fr/README.md) et la
[documentation d'installation canonique](docs/installation.md).

## Démarrage rapide

Demandez un second avis ouvert ; l'entrée pipée devient le contexte borné :

```sh
git diff --cached | xerify ask \
  --to anthropic:MODEL_ID \
  --question "Quel est le risque principal de cette modification ?"
```

Tentez de réfuter une affirmation concrète avec un autre fournisseur d'invocation :

```sh
git diff --cached | xerify --json verify \
  --from openai:AUTHOR_MODEL \
  --to anthropic:VERIFIER_MODEL \
  --claim "Cette modification corrige la condition de concurrence sans régression"
```

`--from` et `--to` identifient le service d'invocation, de facturation et de contrôle. Un modèle
choisi via Cursor Agent a toujours le provider `cursor`, même si son ID mentionne GPT, Claude,
Gemini ou Grok. Codex/OpenAI direct est `openai` ; Claude/Anthropic direct est `anthropic`. Une
vérification avec le même fournisseur est rejetée avant l'appel au modèle.

Cette séparation mesure la diversité des canaux, pas l'indépendance des poids, données
d'entraînement ou angles morts des modèles.

## Résultats

| Résultat    | Exit | Action                                                         |
| ----------- | ---: | -------------------------------------------------------------- |
| `confirmed` |    0 | candidat pour continuer ; aucun contre-exemple matériel trouvé |
| `refuted`   |   10 | bloquer l'affirmation                                          |
| `unclear`   |   11 | fournir des preuves, réessayer ou demander une revue humaine   |

Timeout, échec du fournisseur, schéma invalide et troncature restent fail-closed avec des codes non
nuls typés. `unclear` n'est jamais transformé en succès.

## Diagnostic sans inférence

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
xerify --json config validate
```

Ces commandes n'appellent aucun modèle. `--network` ajoute seulement des tests de connectivité
bornés. Les appels réels `ask` et `verify` peuvent consommer un quota ou entraîner des coûts API.

## État local et MCP

`xerify init` crée `.xerify/` sans écrasement et le protège dans les fichiers ignore de Git, npm et
Docker. Les exécutions actives sont sous `runs/`, les archives sous `archive/`, et
`archive/index.jsonl` sert de catalogue compact pour les humains et les outils AI.

MCP STDIO local avec version épinglée :

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.1.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

Le serveur expose `xerify_ask`, `xerify_verify` et `xerify_capabilities`. HTTP écoute par défaut sur
`127.0.0.1` ; un bind hors loopback exige `--allow-public` et un bearer token fourni par une variable
d'environnement nommée.

## Qui développe Xerify

Xerify est conçu, développé et maintenu par **[Verhex](https://github.com/VerhexIO)**.

Il trouve son origine dans **Deckent**, le système d'exploitation agentique de Verhex, où demander à
un second fournisseur de vérifier une affirmation fait partie des capacités dont dépend
l'orchestrateur. Xerify est cette même capacité, sous une forme autonome et open source : il
s'installe seul, ne nécessite pas Deckent, et n'en dépend en rien.

Seul Xerify est couvert par la [licence MIT](LICENSE) dans ce dépôt. Deckent est un produit Verhex
distinct, qui n'est pas concédé sous licence ici.

## Documentation

- [Guide complet en français](docs/i18n/fr/README.md)
- [Index de documentation en six langues](docs/README.md)
- [Exemples de vérification observés](docs/examples/README.md)
- [Politique de sécurité](SECURITY.md)
- [Licence MIT](LICENSE)

En cas de contradiction, les schémas et documents canoniques testés en anglais prévalent.
