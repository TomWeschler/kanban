# Les épreuves

Une suite par sujet. Chacune ouvre `index.html` dans un vrai navigateur et
vérifie ce que le code **doit** faire, pas ce qu'il fait.

## Lancer

```bash
python3 -m http.server 8899 --bind 127.0.0.1 &   # depuis la racine du dépôt
npm install playwright --no-audit --no-fund       # une fois
node tests/lienweb.js
node tests/curseur.js
node tests/lignesvides.js
node tests/maj.js
```

## Les suites

| Fichier | Sujet |
|---|---|
| `lienweb.js` | Poser et rendre un lien vers une page web. |
| `curseur.js` | La position du curseur dans l'éditeur de notes, à travers les reconstructions de l'interface. |
| `lignesvides.js` | Les lignes vides voulues, rendues à la lecture. |
| `maj.js` | La mise à jour de l'application : les trois paliers, et le refus de boucler en silence. |

Le navigateur est cherché dans `/opt/pw-browsers/chromium-1194/…` ; sur une
autre machine, indiquer le sien : `PW_CHROME=/chemin/vers/chrome node tests/…`.

## Pourquoi elles sont ici

Elles ont vécu des mois dans un répertoire temporaire, et un redémarrage
d'environnement les a effacées d'un coup — trente-huit suites, deux mille
assertions. Ce qui n'est pas versionné n'existe pas.
