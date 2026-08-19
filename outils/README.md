# `kanban.mjs` — le classeur en ligne de commande

Cet outil permet à **Claude Code**, tournant sur ta machine et sur ton
abonnement, de lire et d'écrire directement le classeur Google — sans
copier-coller, et **sans facture d'API**.

Il ne remplace pas l'application web : il travaille sur le même classeur.

---

## Ce qu'il faut savoir avant de commencer

- **Zéro dépendance.** Node seul, déjà présent puisque Claude Code tourne
  dessus. Pas de `npm install`.
- **Aucun secret n'entre dans ce dépôt**, qui est public. Tes identifiants
  vivent dans `~/.kanban/`, en `0600`.
- **Une écriture est définitive.** Il n'y a pas d'annulation ici. L'application
  web, elle, propose « annuler » ; pas la ligne de commande.

---

## Installation — une fois, environ dix minutes

### 1. Créer un identifiant OAuth « application de bureau »

Dans la [console Google Cloud](https://console.cloud.google.com/), sur le
**même projet** que celui de l'application web :

1. **API et services → Identifiants → Créer des identifiants → ID client OAuth**
2. Type d'application : **Application de bureau**
3. Nomme-le par exemple `kanban-cli`
4. Note l'**ID client** et le **code secret**

> Pourquoi un identifiant *de bureau* et pas celui de l'application web ?
> Celui du web n'autorise que ton domaine GitHub Pages comme destination. Le
> flux en ligne de commande revient sur `127.0.0.1`, que seul le type
> « application de bureau » accepte.

Vérifie aussi que l'API **Google Sheets** est activée sur le projet
(*API et services → Bibliothèque*). Elle l'est déjà si l'application web
fonctionne.

### 2. Trouver l'identifiant du classeur

C'est le morceau au milieu de son adresse :

```
https://docs.google.com/spreadsheets/d/CET_IDENTIFIANT_ICI/edit
```

### 3. Configurer, puis s'authentifier

Depuis la racine du dépôt :

```bash
node outils/kanban.mjs config \
  --client-id "…apps.googleusercontent.com" \
  --client-secret "…" \
  --classeur "…"

node outils/kanban.mjs auth
```

`auth` ouvre ton navigateur, te fait choisir ton compte Google, puis range un
jeton de rafraîchissement dans `~/.kanban/token.json`. C'est à faire **une
seule fois** : le jeton se renouvelle tout seul ensuite.

Google affichera un avertissement « application non validée » — c'est normal
pour un outil personnel, sur ton propre projet. Choisis *Paramètres avancés →
Accéder à kanban-cli*.

### 4. Vérifier

```bash
node outils/kanban.mjs verifier
```

Doit répondre quelque chose comme :

```
Classeur : 1W3S…
Lecture OK — 7 projets, 23 jalons, 41 tâches, 62 notes, 4 faits mémorisés.
```

---

## L'usage courant

```bash
node outils/kanban.mjs export
```

Dépose le classeur en markdown dans `./classeur/` : projets, jalons, tâches,
budget, procédures, gabarits, objectifs, mémoire, et une note par fichier —
plus un `CLAUDE.md` qui explique tout ça à Claude Code.

Ensuite, dans ce dossier :

```
claude
> lis classeur/ et dis-moi ce qui dérive et ce que je dois trancher cette semaine
```

Claude Code lit ces fichiers avec ses outils habituels, sans qu'on ait à lui
fabriquer quoi que ce soit. Et pour écrire, il dispose des commandes listées
dans `classeur/CLAUDE.md`.

### Écrire

```bash
node outils/kanban.mjs tache "Relancer DCB" --date 2026-09-01 --projet "Refonte paie" --imp 3
node outils/kanban.mjs note "Compte rendu du 3" --fichier cr.md --tags "#adp #comite"
node outils/kanban.mjs jalon "Refonte paie" "Comité de bascule" 2026-10-15
node outils/kanban.mjs projet "Refonte paie" --sante orange --action "Relancer la MOA"
node outils/kanban.mjs retenir adp comite.cadence "Comité mensuel, le jeudi"
node outils/kanban.mjs oublier adp comite.cadence
```

Après avoir écrit, refais un `export` pour que la photo soit à jour.

---

## Deux précautions qui ont dicté le code

**Les formats de ligne sont copiés à l'identique de `index.html`.** Une colonne
de décalage, et l'application relirait des données fausses sans rien signaler.
C'est le seul vrai danger de cet outil. La suite de tests compare donc les
dix en-têtes du CLI à ceux de l'application, un par un, et refuse de passer
s'ils divergent — c'est ce qui te protège le jour où le schéma bougera d'un
côté seulement.

**Si l'application web est ouverte pendant que le CLI crée une tâche**, elle
affichera « Modifié depuis un autre appareil » et proposera de recharger. C'est
voulu : le CLI change la cellule témoin `O1` pour forcer cette détection, plutôt
que de laisser l'app écraser silencieusement ce qui vient d'être écrit.

---

## En cas de problème

| Message | Ce qu'il faut faire |
|---|---|
| `Pas encore configuré` | refaire l'étape 3 |
| `Pas encore authentifié` | `node outils/kanban.mjs auth` |
| `Rafraîchissement refusé (400)` | l'accès a été révoqué côté Google : refaire `auth` |
| `Google n'a pas renvoyé de jeton de rafraîchissement` | retirer l'accès de l'app dans [ton compte Google](https://myaccount.google.com/permissions), puis refaire `auth` |
| `Sheets 403` | l'API Sheets n'est pas activée, ou le compte n'a pas accès au classeur |
| `Sheets 404` | l'identifiant du classeur est faux |

Tout effacer et repartir de zéro : `rm -rf ~/.kanban`.
