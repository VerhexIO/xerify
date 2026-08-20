[English](../../installation.md) · [Türkçe](../tr/installation.md) · [Deutsch](../de/installation.md) · [简体中文](../zh-CN/installation.md) · [Español](../es/installation.md) · **Français**

# Installation et mises à niveau

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Xerify nécessite Node.js 20 ou une version plus récente, Node.js 24 étant le runtime principal des
versions publiées. Le paquet npm public est `xverify-cli` ; le produit et la commande CLI installée
conservent le nom `xerify`.

## Choisir un mode d'installation

Installez Xerify de façon globale lorsqu'il s'agit d'un outil de poste de travail partagé entre
plusieurs projets :

```sh
npm install --global xverify-cli@latest
xerify --version
xerify init
```

Installez-le comme dépendance de développement du projet lorsque le dépôt doit figer sa propre
version de Xerify :

```sh
npm install --save-dev xverify-cli@latest
npx xerify --version
```

Exécutez-le sans conserver de dépendance, pour une vérification rapide des capacités :

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

Utilisez bien `xverify-cli@latest`, avec le `@`. La commande `npm install xverify-cli latest`
demande à npm d'installer deux paquets distincts, ce qui n'a rien d'équivalent.

Pour une automatisation reproductible, figez une version exacte plutôt que `latest` :

```sh
npm install --save-dev --save-exact xverify-cli@0.1.0
```

## Initialisation du projet

Une installation directe en tant que dépendance locale du projet déclenche un initialiseur protégé.
Celui-ci crée `.xerify/` uniquement à la racine du projet consommateur, ne remplace jamais une
configuration existante, n'appelle jamais de fournisseur, et ajoute une protection d'exclusion pour
Git, npm et Docker. Les installations globales, transitives, sans sauvegarde, ou via `npx`
n'initialisent pas le répertoire courant ; il faut alors le faire explicitement :

```sh
xerify init
```

Définissez `XERIFY_SKIP_AUTO_INIT=1` avant l'installation lorsque l'initialisation liée au cycle de
vie npm n'est pas souhaitée. npm ne peut pas identifier de façon catégorique chaque cas de hoisting
direct ou transitif lors d'une première installation ; les bibliothèques qui intègrent Xerify
doivent donc définir cette variable et gérer elles-mêmes l'initialisation via leur propre flux
explicite.

Vérifiez la configuration obtenue sans effectuer d'appel à un modèle :

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers probe --all --timeout 5000
```

Par défaut, `providers probe` vérifie la disponibilité locale de l'exécutable et de
l'authentification. N'ajoutez `--network` que si vous souhaitez aussi tester, de façon bornée,
l'accessibilité de l'endpoint.

## Mises à niveau et désinstallation

Effectuez la mise à niveau selon le même mode d'installation :

```sh
npm update --global xverify-cli
# or, inside a pinned project
npm install --save-dev xverify-cli@latest
```

Supprimer le paquet npm ne supprime ni l'historique ni la configuration du projet. Examinez puis
supprimez `.xerify/` séparément, et seulement lorsque son historique des exécutions, ses archives,
sa configuration et ses métadonnées d'audit ne sont plus nécessaires.

## Installation MCP

Le MCP local en STDIO utilise le même paquet ; il n'y a pas de second serveur à télécharger :

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

Figez la version du paquet pour obtenir une configuration hôte dont la chaîne d'approvisionnement
reste vérifiable. L'entrée du MCP Registry n'est qu'une métadonnée de découverte qui pointe vers ce
paquet npm ; elle n'héberge aucun autre service Xerify et ne réutilise pas à distance les
identifiants fournisseur locaux. Voir [MCP](mcp.md) pour la configuration STDIO et HTTP.

## Contenu du paquet

L'artefact npm contient la sortie compilée du runtime et de la bibliothèque, les schémas publics, la
documentation destinée aux utilisateurs, la compétence d'agent associée, l'initialiseur protégé,
ainsi que les mentions de licence et de sécurité. Il exclut délibérément les tests source,
l'outillage de publication, l'état local `.xerify/`, les fichiers internes d'agent ou
d'orchestration, les espaces de travail de conception, les artefacts de publication générés et les
documents de revue de marque.

Xerify est créé et développé par Verhex, et distribué sous licence MIT. Le dépôt source canonique et
le suivi des tickets sont accessibles depuis les métadonnées du paquet.
