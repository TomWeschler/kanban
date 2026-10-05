#!/usr/bin/env python3
"""La rareté de chaque case des sets et des lignées de la page Cartes.

Lit les clés des cases dans index.html (CA_SETS, CA_LIGNEES), cherche la
rareté de chaque impression dans les données ouvertes, et réécrit la table
CA_RARETES de index.html.

    python3 outils/cartes/raretes.py <pokemon-tcg-data> <tcgdex-cards-database>

<pokemon-tcg-data>       clone de github.com/PokemonTCG/pokemon-tcg-data
                         (dossiers sets/ et cards/en/)
<tcgdex-cards-database>  clone de github.com/tcgdex/cards-database
                         (dossier data-asia/, pour les cartes japonaises)
"""
import json, os, re, sys

# Les dizaines de libellés des deux bases, ramenés à quelques catégories.
#   C commune · U peu commune · R rare · H holo · X ultra (ex, V, GX…)
#   I illustration rare · S illustration spéciale · G secrète / hyper
#   B brillante (shiny, radieuse, chromatique…) · P promo · N deck (sans rareté)
CATEGORIES = [
    (r'^(none)$', 'N'),
    (r'promo', 'P'),
    (r'special illustration|character super', 'S'),
    (r'illustration|character rare', 'I'),
    (r'secret|rainbow|hyper|gold', 'G'),
    (r'shin|radiant|amazing|prism|star|trainer gallery|futuristic|black white|rgb|pikachu|classic', 'B'),
    (r'ultra|double|triple|ex\b|gx|v\b|vmax|vstar|lv\.x|break|prime|legend|ace|mega', 'X'),
    (r'holo', 'H'),
    (r'^rare$', 'R'),
    (r'uncommon', 'U'),
    (r'common', 'C'),
]
def categorie(r):
    if not r: return ''
    t = r.strip().lower()
    for motif, c in CATEGORIES:
        if re.search(motif, t): return c
    return ''

def cles(html):
    out = set()
    for nom in ('CA_SETS', 'CA_LIGNEES'):
        i = html.index('const %s=' % nom) + len('const %s=' % nom)
        j = html.index(';\n', i)
        data = json.loads(html[i:j])
        for x in data:
            if nom == 'CA_SETS':
                out.update('%s/%s' % (x[0], e[0]) for e in x[2])
            else:
                out.update(e[0] for e in x[2])
    return out

def main(ptcg, dex, page='index.html'):
    html = open(page, encoding='utf-8').read()
    besoin = cles(html)
    rar = {}
    # International : pokemontcg.io
    for k in [k for k in besoin if not k.startswith('ja:')]:
        sid, num = k.split('/', 1)
        f = os.path.join(ptcg, 'cards', 'en', sid + '.json')
        if not os.path.exists(f): continue
        for c in json.load(open(f, encoding='utf-8')):
            if c['number'] == num:
                rar[k] = categorie(c.get('rarity')); break
    # Japonais : TCGdex
    dossiers = {}
    base = os.path.join(dex, 'data-asia')
    for serie in os.listdir(base):
        p = os.path.join(base, serie)
        if not os.path.isdir(p): continue
        for s in os.listdir(p):
            d = os.path.join(p, s)
            if not os.path.isdir(d): continue
            t = open(d + '.ts', encoding='utf-8').read() if os.path.exists(d + '.ts') else ''
            m = re.search(r"\n\tid:\s*['\"]([^'\"]+)", t)
            dossiers[m.group(1) if m else s] = d
    for k in [k for k in besoin if k.startswith('ja:')]:
        sid, local = k[3:].split('/', 1)
        f = os.path.join(dossiers.get(sid, ''), local + '.ts')
        if not os.path.exists(f): continue
        m = re.search(r"rarity:\s*['\"]([^'\"]+)['\"]", open(f, encoding='utf-8').read())
        if m: rar[k] = categorie(m.group(1))
    rar = {k: v for k, v in sorted(rar.items()) if v}
    bloc = 'const CA_RARETES=' + json.dumps(rar, separators=(',', ':')) + ';'
    if 'const CA_RARETES=' in html:
        i = html.index('const CA_RARETES='); j = html.index(';\n', i) + 1
        html = html[:i] + bloc + html[j:]
    else:
        i = html.index(';\n', html.index('const CA_LIGNEES=')) + 2
        html = html[:i] + bloc + '\n' + html[i:]
    open(page, 'w', encoding='utf-8').write(html)
    from collections import Counter
    print('%d cases, %d raretés connues' % (len(besoin), len(rar)), dict(Counter(rar.values())))

if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'index.html')
