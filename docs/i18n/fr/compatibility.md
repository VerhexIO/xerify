[English](../../compatibility.md) · [Türkçe](../tr/compatibility.md) · [Deutsch](../de/compatibility.md) · [简体中文](../zh-CN/compatibility.md) · [Español](../es/compatibility.md) · **Français**

# Limites de compatibilité et de support

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

Xerify prend en charge Node.js 20 et 24 sur Ubuntu, macOS et Windows, via la matrice de CI publique.
Node.js 24 constitue la filière principale des versions publiées. WSL emprunte le chemin d'exécution
Linux, mais l'authentification des fournisseurs et le comportement des processus, spécifiques à
l'hôte, doivent être vérifiés avec `xerify health` sur la machine réelle. La vérification complète,
le test de fumée d'installation propre et l'audit de publication du candidat `0.1.0` passent aussi
sous WSL2 avec Node.js 24.

## Surfaces prises en charge

| Surface               | Contrat                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| CLI                   | Sortie destinée à un humain, plus des enveloppes `--json` stables et des codes de sortie documentés |
| JavaScript/TypeScript | Exports de paquet ESM avec déclarations de types intégrées                                          |
| MCP STDIO             | Serveur local, négociation de protocole moderne et hérité                                           |
| MCP Streamable HTTP   | Loopback par défaut ; activation explicite et authentifiée pour une liaison non loopback            |

La version publique du JSON/schéma est `1`. Des champs optionnels additifs peuvent apparaître dans
des versions compatibles ; la suppression ou la réinterprétation d'un champ public existant exige
une version avec rupture de compatibilité.

## Canaux de fournisseurs

Les adaptateurs intégrés couvrent Codex CLI, Claude CLI, Cursor Agent, l'API OpenAI, l'API
Anthropic, HTTP OpenAI-compatible, et une commande explicitement configurée. La disponibilité dépend
du canal choisi, de l'exécutable installé, du compte, de l'identifiant de modèle exact, de
l'authentification, de la région et de la politique du fournisseur. Xerify ne promet pas qu'un
modèle visible pour un compte existe aussi pour un autre.

Exécutez ces vérifications non facturables dans l'environnement consommateur :

```sh
xerify --json health
xerify --json doctor
xerify --json providers list
xerify --json providers probe --all --timeout 5000
```

Les sondes de fournisseur établissent la disponibilité locale du transport, pas la qualité ou la
véracité du modèle. Un appel réel réussi ne prouve que le chemin exact adaptateur/fournisseur/modèle
utilisé pour cette requête. La prose d'un fournisseur n'est pas déterministe au niveau des octets ;
Xerify garantit donc le schéma, les bornes, les résultats fail-closed et les erreurs typées — pas un
texte identique d'un appel à l'autre.

## Limites d'interprétation du résultat

`confirmed` signifie qu'aucun contre-exemple significatif n'a été trouvé dans les preuves fournies.
Ce n'est ni une vérification formelle, ni une certification de sécurité, ni une autorisation
automatique de fusionner ou d'exécuter un changement. `refuted` bloque l'affirmation ; `unclear`, un
timeout, une troncature, une sortie invalide et un échec du fournisseur restent tous des non-succès,
et exigent une nouvelle tentative, des preuves plus solides, ou une revue humaine.

Les vérifications normales du paquet et de la CI n'exigent aucun identifiant de fournisseur et
n'appellent aucun modèle. Un test réel contre un fournisseur est toujours explicite, et peut
consommer du quota d'abonnement ou entraîner des frais d'API.

Pour les restrictions propres à chaque adaptateur, voir [adaptateurs de
fournisseurs](provider-adapters.md). Pour les limites relatives aux données et aux prompts, voir
[SECURITY.md](security.md).
