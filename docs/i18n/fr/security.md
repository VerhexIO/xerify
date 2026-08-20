[English](../../../SECURITY.md) · [Türkçe](../tr/security.md) · [Deutsch](../de/security.md) · [简体中文](../zh-CN/security.md) · [Español](../es/security.md) · **Français**

# Politique de sécurité

> La documentation anglaise constitue la source normative de référence. En cas de désaccord entre une traduction et un contrat testé, c'est le contrat anglais testé qui prévaut.

## Signalement

N'ouvrez pas de ticket public pour une vulnérabilité suspectée ou un identifiant exposé par accident.
Utilisez le [signalement privé de vulnérabilités de
GitHub](https://github.com/VerhexIO/xerify/security/advisories/new). Indiquez la version concernée,
l'impact, les étapes de reproduction et toute mesure d'atténuation suggérée ; omettez les identifiants
actifs et les charges utiles sensibles issues de production.

Aucune version n'est officiellement prise en charge avant la première publication signée. Après le
lancement, la dernière ligne de version mineure recevra les correctifs de sécurité ; le tableau de
support sera alors mis à jour ici.

## Modèle de sécurité

Xerify traite à la fois les preuves fournies et la sortie du fournisseur comme des données non
fiables. Les prompts de vérification classent explicitement l'affirmation et le contexte comme des
preuves, et non comme des instructions, et exigent une tentative de falsification adverse. Cela
réduit le risque de confusion d'instructions, mais ne rend pas un LLM totalement à l'abri d'une
injection de prompt. Xerify n'exécute jamais la sortie d'un modèle, et n'évalue jamais une chaîne
shell configurée. Les adaptateurs de processus démarrent un exécutable et un tableau d'arguments avec
`shell: false`, transmettent un environnement en liste blanche, envoient le prompt et le contexte sur
l'entrée standard, bornent stdout/stderr, et terminent l'arbre de processus en cas de timeout ou
d'annulation.

L'ordre effectif des instructions est le suivant : le contrat de vérification de Xerify, l'opération
sélectionnée, le périmètre de preuves approuvé par le propriétaire, puis l'affirmation et le contexte
non fiables. Un texte présent dans du code, un diff, un journal, un commentaire, un document ou une
sortie de modèle précédente ne peut légitimement changer la tâche, les règles de verdict, ou le
schéma de réponse. Le modèle peut malgré tout mal gérer cette frontière, ce qui rend obligatoires la
validation stricte du schéma par le cœur et les résultats fail-closed.

Les adaptateurs de CLI officiels ne s'exécutent jamais depuis le dépôt de l'utilisateur. Codex
utilise un bac à sable éphémère en lecture seule, avec la configuration et les règles utilisateur
ignorées. Claude utilise un nouveau répertoire temporaire en mode `0700`, le mode sûr, aucun outil,
aucune commande slash, et aucune persistance de session. Cursor utilise un nouvel espace de travail
en mode `0700`, son mode ask en lecture seule, et son bac à sable. Cursor Agent n'expose actuellement
aucun commutateur désactivant catégoriquement tous les serveurs MCP configurés au niveau du compte ;
il s'agit d'une frontière résiduelle, pas d'une garantie cachée. Les adaptateurs d'API directe n'ont
aucun accès au système de fichiers ou aux outils locaux. Un adaptateur de commande générique est un
code explicitement configuré par le propriétaire ; il s'exécute par défaut depuis un nouveau
répertoire temporaire, mais hérite malgré tout de la sécurité de cet exécutable et de son
environnement autorisé.

Les secrets d'API directe devraient être lus depuis des variables d'environnement nommées. Pour les
installations mono-utilisateur simples, les adaptateurs HTTP directs acceptent aussi un repli
littéral explicite `apiKey` ; la variable d'environnement l'emporte quand les deux existent. Les URL
d'endpoint de fournisseur sont elles aussi sensibles, car des identifiants peuvent être intégrés dans
les informations utilisateur, les chemins, les valeurs de requête ou les fragments. La configuration
est ignorée par Git par défaut ; une configuration avec clé littérale ou endpoint explicite est
rejetée sous POSIX sauf en mode `0600` ; et l'inspection de la configuration remplace à la fois les
clés littérales et les valeurs complètes d'endpoint par `[REDACTED]`. Les utilisateurs de Windows
doivent appliquer une ACL réservée au propriétaire. Préférez des variables d'environnement nommées
plutôt que des identifiants portés par l'URL. Un endpoint compatible avec des informations
utilisateur, des paramètres de requête ou un fragment — et tout endpoint distant sans déclaration de
clé explicite — signale une authentification `unknown`, plutôt que de prétendre qu'aucune
authentification n'est requise. Les stockages d'identifiants des CLI officielles ne sont utilisés
qu'à travers la CLI officielle. Le journal d'audit JSONL, optionnel, exclut les prompts, le contexte,
les réponses, les résultats détaillés, les charges utiles brutes du fournisseur, les données
d'autorisation et les chemins d'identifiants. Sous POSIX, les nouveaux fichiers de journal utilisent
le mode `0600` et `O_NOFOLLOW` ; toute plateforme rejette les cibles ouvertes non régulières. Windows
n'offre pas la même garantie atomique de non-suivi des liens ; placez donc les journaux d'audit dans
un répertoire contrôlé par le propriétaire.

L'état du projet réside sous `.xerify/` ; un cycle de vie d'installation directe protégé, ou la
commande `xerify init`, crée `.xerify/xverify-config.json`, des répertoires privés de journal,
d'exécutions et d'archive, ainsi qu'une protection d'exclusion dans les `.gitignore`, `.npmignore` et
`.dockerignore` racines du projet. Ces protections relèvent de la défense en profondeur, pas du
contrôle d'accès : forcer manuellement des fichiers dans Git, npm, ou un contexte de conteneur peut
toujours les divulguer.

L'historique des exécutions est volontairement plus détaillé que le journal d'audit, lui dépourvu de
secrets. Avec le réglage par défaut `captureInput: "full"`, les affirmations, les questions et le
contexte fourni sont stockés localement dans `.xerify/runs` ; les résultats normalisés peuvent
contenir des résultats détaillés rédigés par le fournisseur. Les réponses brutes de transport, les
données d'authentification et les instantanés d'environnement ne sont jamais écrits. Utilisez les
modes de capture `metadata` ou `none` pour les projets sensibles, restreignez l'accès au système de
fichiers, et appliquez une politique de rétention/suppression. `runs show` exige `--include-evidence`
avant d'afficher le contenu des preuves. Chaque exécution possède aussi un `head` de découverte
borné : une capture `full` contient un court aperçu de l'affirmation ou de la question, une capture
`metadata` ne contient qu'une empreinte, et une capture `none` ne contient aucun contenu tiré de
l'entrée. Les exécutions archivées se retrouvent via `.xerify/archive/index.jsonl` ; cet index
contient le head borné et des métadonnées opérationnelles, jamais le contexte, les réponses, les
résultats détaillés, le corps des preuves, ou la sortie brute du fournisseur. Son empreinte
d'enregistrement aide à localiser et comparer un instantané, mais l'index n'est pas un registre
inviolable face à des processus tournant sous le même utilisateur. Préférez `xerify runs search`, ou
l'index lui-même, avant d'ouvrir les enregistrements complets correspondants. Ce cycle de vie ne
remplace jamais rien, n'effectue aucun appel réseau ou fournisseur, et ignore les installations
globales, transitives imbriquées, sans sauvegarde, ou via `npx`. L'ambiguïté de npm sur le hoisting
direct/transitif lors de la première installation reste documentée ; les intégrateurs peuvent définir
`XERIFY_SKIP_AUTO_INIT=1`. Ne forcez jamais l'ajout de l'état du projet, et n'affaiblissez jamais les
règles d'exclusion générées.

Streamable HTTP fonctionne en loopback par défaut, valide les en-têtes Host et Origin, et exige une
confirmation explicite ainsi qu'une authentification par jeton porteur pour toute liaison non
loopback. Les opérateurs restent responsables du TLS, de la rotation des secrets, de la politique
réseau, de la limitation de débit, de l'autorisation multi-utilisateur et de la collecte sûre des
journaux.

## Limites

Un verdict `confirmed` signifie que le vérificateur n'a trouvé aucun contre-exemple significatif au
regard des preuves fournies, et a rapporté ses propres limites ; ce n'est ni une garantie de
sécurité, ni une vérification formelle, ni une autorisation d'exécuter un changement. Une revue
croisée entre fournisseurs peut malgré tout partager la même lignée de modèle, les mêmes données
d'entraînement, les mêmes angles morts, ou un contexte compromis. Les références de preuve sont des
pointeurs rapportés par le modèle, pas des citations validées. Limitez le périmètre des entrées
sensibles, et revoyez tous les résultats de façon indépendante.

La séparation des fournisseurs repose sur le service d'invocation, de facturation et de contrôle. Un
modèle atteint via Cursor est `cursor`, même quand son identifiant de catalogue nomme GPT, Claude ou
Gemini. Un appel direct à l'éditeur et un appel via Cursor peuvent donc satisfaire la vérification de
fournisseur tout en utilisant une lignée de modèle amont apparentée, voire identique. Traitez la
diversité des canaux comme de la défense en profondeur, jamais comme une preuve d'indépendance des
modèles.

Aucune technique reposant uniquement sur le prompt ne peut empêcher totalement une injection. Avant
un appel réel, inspectez le périmètre exact et borné envoyé sur l'entrée standard ; excluez les
identifiants, les copies d'environnement, les données client, le code source hors sujet et les
stockages d'authentification. Préférez des diffs générés ou une sortie de test à un dépôt entier.
Gardez la CLI du fournisseur, ses extensions, ses plugins, sa configuration MCP et sa politique de
compte fiables et à jour. Traitez `unclear`, une troncature, une sortie structurée invalide, un
timeout ou un échec d'adaptateur comme des non-succès, et exigez des tests indépendants avant d'agir
sur la base d'un verdict quelconque.
