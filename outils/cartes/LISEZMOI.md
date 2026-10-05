# Les données des sets et des lignées

La vue « Par set » de la page Cartes s'appuie sur des tables écrites dans
`index.html` : `CA_SETS` (six sets complets), `CA_LIGNEES` (les familles
d'évolution) et `CA_RARETES` (la rareté de chaque case). Elles viennent des
données ouvertes de deux projets, qu'il faut d'abord récupérer :

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/PokemonTCG/pokemon-tcg-data.git ptcg
(cd ptcg && git sparse-checkout set --no-cone sets/ /cards/en/)
git clone --depth 1 --filter=blob:none --sparse https://github.com/tcgdex/cards-database.git tcgdex
(cd tcgdex && git sparse-checkout set --no-cone /data/ /data-asia/)
```

Puis, depuis la racine du dépôt :

```bash
python3 outils/cartes/lignees.py ptcg tcgdex   # réécrit CA_LIGNEES
python3 outils/cartes/raretes.py ptcg tcgdex   # réécrit CA_RARETES — toujours après
node tests/cartes.js                           # vérifier
```

**Ajouter une lignée** : une ligne dans `FAMILLES` de `lignees.py` (noms
anglais, noms japonais, titre affiché) et ses noms français dans `FR`.

## Pourquoi ces scripts sont ici

La première version de `lignees.py` vivait dans un répertoire temporaire. Un
redémarrage de l'environnement l'a effacée, et il a fallu la réécrire. Ce qui
n'est pas versionné n'existe pas.
