# Spec — Boucle Sport (projet stratégie ↔ Google Sheet ↔ app Kanban)

Ce document est le **contrat** à donner comme connaissance au projet Claude
« stratégie sport ». Il décrit exactement ce que le projet doit **lire** et
**écrire** dans le Google Sheet pour piloter l'entraînement.

## Vue d'ensemble

```
Projet Claude stratégie ──écrit──▶  onglet sport_plan  ──affiché par──▶  App Kanban (page SPORT)
        ▲                                                                        │
        └──────────────lit──── onglet sport_log  ◀──────coché par l'user────────┘
```

- **Toi (projet stratégie)** : chaque soir, tu lis `sport_log` (les retours
  réels), et tu **écris une ligne** dans `sport_plan` pour la prochaine séance.
- **L'utilisateur** : le jour J, il coche son retour dans l'app → ça écrit dans
  `sport_log`.
- **L'app** : lit `sport_plan` pour afficher le programme, écrit `sport_log`.

## Le fichier

- Google Sheet : **`kanban_data`**
- ID : `1W3S_g5SjFo9Dx2rpVgx35mD_fWq1bC3NEG6DF3lbdJA`
- Deux onglets : `sport_plan` (tu écris) et `sport_log` (tu lis seulement).
- La ligne 1 de chaque onglet est l'en-tête. **Ajoute toujours en dessous**
  (append). Ne réécris pas tout l'onglet.

## Onglet `sport_plan` — TU ÉCRIS ICI

| Col | Champ          | Format / valeurs                                              |
|-----|----------------|--------------------------------------------------------------|
| A   | `date`         | `YYYY-MM-DD` — le jour où la séance doit être faite          |
| B   | `type`         | un de : `Muscu` · `Cardio` · `Marche` · `Mobilité` · `Mixte` · `Repos` |
| C   | `duration_min` | entier, minutes cibles (ex : `50`). Vide pour `Repos`.       |
| D   | `title`        | titre court (ex : `Push + Squat`)                            |
| E   | `content`      | le détail de la séance en **Markdown** (voir ci-dessous)    |

### Format de la colonne `content` (Markdown rendu par l'app)
Supporté : titres `#` / `##` / `###`, listes `-`, gras `**texte**`, lignes vides.
Garde-le concis et actionnable. Exemple :

```
# Échauffement
- 5 min vélo + mobilité épaules
# Bloc principal
- Développé couché **4×8** @ RPE 8
- Squat **4×6** @ RPE 8
- Tirage horizontal **3×10**
# Retour au calme
- Étirements 5 min
```

### Règles d'écriture
- **Une ligne = une date.** Pour corriger un programme déjà écrit, **ajoute une
  nouvelle ligne** avec la même date : l'app prend toujours la **dernière**
  ligne pour une date donnée (les doublons sont tolérés, le plus récent gagne).
- Écris normalement **la veille pour le lendemain** (ou plusieurs jours d'un
  coup si tu planifies la semaine).
- Pour un jour de repos : `type=Repos`, un `title` du genre `Repos / récup`,
  et un `content` court (ex : marche légère, sommeil).

## Onglet `sport_log` — TU LIS SEULEMENT (ne pas modifier)

C'est l'utilisateur qui le remplit via l'app. Tu t'en sers pour adapter.

| Col | Champ        | Format / valeurs                                          |
|-----|--------------|-----------------------------------------------------------|
| A   | `date`       | `YYYY-MM-DD`                                              |
| B   | `status`     | `done` · `partial` · `skipped`                            |
| C   | `amount`     | texte libre de ce qui a été fait (ex : `45 min`, `5 km`) |
| D   | `feeling`    | `1`–`5` (1 = vidé / 5 = en forme)                        |
| E   | `weight_kg`  | nombre ou vide (pesée du jour)                            |
| F   | `note`       | texte libre                                              |

Là aussi : **la dernière ligne pour une date donnée fait foi.**

## Protocole de planification (chaque soir)

1. Lis les ~14 derniers jours de `sport_log`.
2. Croise avec la stratégie (ton `.md` de connaissance) : progression,
   volume, récupération, contraintes.
3. Tiens compte des signaux :
   - `status=skipped` répétés → réduire l'ambition / proposer un format plus court.
   - `feeling` bas (1–2) ou plusieurs séances dures d'affilée → allonger la récup,
     baisser l'intensité, ou planifier `Repos`.
   - tendance `weight_kg` → ajuster selon l'objectif (sèche / prise / maintien).
4. Écris **une ligne** dans `sport_plan` pour la (prochaine) date d'entraînement.

## Notes
- Dates au format ISO `YYYY-MM-DD` impérativement (tri + correspondance app).
- N'écris jamais dans `sport_log`. N'efface jamais de lignes.
- Si le connecteur Sheets est en **lecture seule** chez toi : sors le même bloc
  (A=date … E=content) en texte, l'utilisateur le colle dans l'app
  (bouton « Définir le programme »).
