#!/usr/bin/env python3
"""Les lignées de la page Cartes : toutes les cartes d'une famille d'évolution,
une case par carte, toutes langues confondues.

    python3 outils/cartes/lignees.py <pokemon-tcg-data> <tcgdex-cards-database>

<pokemon-tcg-data>       clone de github.com/PokemonTCG/pokemon-tcg-data
                         (sets/ et cards/en/) : les impressions internationales
<tcgdex-cards-database>  clone de github.com/tcgdex/cards-database
                         (data/ pour les noms français, data-asia/ pour le japonais)

Réécrit la table CA_LIGNEES de index.html. Relancer ensuite raretes.py, qui
calcule la rareté des cases.

Ajouter une lignée : une ligne dans FAMILLES (noms anglais, noms japonais,
titre affiché), et, si besoin, ses noms français dans FR.

DEUX IMPRESSIONS SONT LA MÊME CARTE quand elles ont le même Pokémon, la même
variante (ex, V, GX, obscur, de Morgane…), les mêmes PV et le même
illustrateur — des champs présents dans les deux bases, contrairement aux
noms, qui ne se comparent pas d'une langue à l'autre. Départages :
  - deux cartes internationales de même signature : celle sortie juste APRÈS
    l'extension japonaise (un mois de tolérance) ;
  - extension japonaise sans date : la PREMIÈRE impression internationale ;
  - une carte internationale peut absorber plusieurs japonaises (une même
    illustration réimprimée au Japon).
Ce qui ne trouve pas d'équivalent reste une case japonaise à part.
"""
import json, os, re, sys
from collections import defaultdict
from datetime import date

FAMILLES = {
    'alakazam':   (['Abra', 'Kadabra', 'Alakazam'], ['ケーシィ', 'ユンゲラー', 'フーディン'], 'Abra · Kadabra · Alakazam'),
    'dracolosse': (['Dratini', 'Dragonair', 'Dragonite'], ['ミニリュウ', 'ハクリュー', 'カイリュー'], 'Minidraco · Draco · Dracolosse'),
    # Seuls les Magicarpe : les Léviator ne sont pas collectionnés.
    'magicarpe':  (['Magikarp'], ['コイキング'], 'Magicarpe'),
    'metamorph':  (['Ditto'], ['メタモン'], 'Métamorph'),
}
FR = {'Abra': 'Abra', 'Kadabra': 'Kadabra', 'Alakazam': 'Alakazam', 'Dratini': 'Minidraco', 'Dragonair': 'Draco',
      'Dragonite': 'Dracolosse', 'Magikarp': 'Magicarpe', 'Gyarados': 'Léviator', 'Ditto': 'Métamorph', 'Wailord': 'Wailord'}
EN_PRE = {'Dark': 'dark', 'Light': 'light', 'Radiant': 'radiant', 'Shining': 'shining', 'Mega': 'mega', 'M': 'mega'}
JA_PRE = {'わるい': 'dark', 'かがやく': 'radiant', '輝く': 'shining', 'メガ': 'mega', 'ナツメの': 'sabrina', 'エリカの': 'erika',
          'カスミの': 'misty', 'サカキの': 'giovanni', 'キョウの': 'koga', 'ロケット団の': 'rocket', 'クレアの': 'clair',
          'ランスの': 'lance', 'ひかる': 'shining'}
FR_PRE = {'dark': '{} obscur', 'light': '{} lumineux', 'radiant': '{} radieux', 'shining': '{} brillant', 'mega': 'Méga-{}',
          'sabrina': '{} de Morgane', 'erika': "{} d'Érika", 'misty': "{} d'Ondine", 'giovanni': '{} de Giovanni',
          'koga': '{} de Koga', 'rocket': '{} de la Team Rocket', 'clair': '{} de Sandra', 'lance': '{} de Peter'}
SUF = ['VSTAR', 'VMAX', 'LV.X', 'BREAK', 'GX', 'EX', 'ex', 'V', 'δ', '★', 'E4', 'FB', 'G', '4']
GRANDS = ('EX', 'GX', 'V', 'VMAX', 'VSTAR')
RARETES_SANS_ILL = {'Hyper rare': 'Rare Rainbow'}
# Extensions que les noms ne suffisent pas à relier d'une base à l'autre.
LIENS_FORCES = {'base1': 'base1', 'hgss2': 'hgss2', 'hgss3': 'hgss3', 'hgss4': 'hgss4', 'svp': 'svp'}

Q = r"""(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')"""
def champ(bloc, cle):
    m = re.search(r"\b" + cle + r":\s*" + Q, bloc)
    if not m: return None
    v = m.group(1) if m.group(1) is not None else m.group(2)
    return v.replace("\\'", "'").replace('\\"', '"')
def id_de(texte):
    m = re.search(r"\n\tid:\s*['\"]([^'\"]+)", texte)
    return m.group(1) if m else None
norm = lambda x: re.sub(r'[^a-z0-9]+', ' ', x.lower().replace('&', ' and ').replace('é', 'e')).strip()
ill = lambda s: re.sub(r'[^a-z]', '', (s or '').lower())

def var_en(n, mots):
    pre = ''
    m = re.match(r"^(\w+)'s ", n)
    if m: pre = m.group(1).lower(); n = n[len(m.group(0)):]
    for k, v in EN_PRE.items():
        if n.startswith(k + ' '): pre = pre or v; n = n[len(k) + 1:]
    mem = next((i for i, w in enumerate(mots) if re.search(r'\b' + w + r'\b', n)), None)
    suf = sorted(t.upper() for t in re.split(r'[\s\-]+', n) if t in SUF or t.upper() in GRANDS)
    return mem, pre, '+'.join(suf)
def var_ja(n, mots):
    pre = ''
    for k, v in JA_PRE.items():
        if n.startswith(k): pre = v; n = n[len(k):]; break
    n = n.replace('（デルタ種）', ' δ').replace('スター', ' ★')
    mem = next((i for i, w in enumerate(mots) if w in n), None)
    reste = n
    for w in mots: reste = reste.replace(w, ' ')
    suf = sorted(t.upper() for t in re.split(r'[\s&]+', reste) if t and (t in SUF or t.upper() in GRANDS))
    # « コイキング&ホエルオーGX » : le suffixe colle au DERNIER nom du duo.
    fin = re.search(r'(VSTAR|VMAX|GX|EX|ex|V)$', n)
    if fin and fin.group(1).upper() not in suf: suf = sorted(suf + [fin.group(1).upper()])
    return mem, pre, '+'.join(suf)
def nom_fr(mem, pre, suf, mots):
    n = FR_PRE.get(pre, '{}').format(FR[mots[mem]])
    return (n + (' ' + suf.replace('+', ' ') if suf else '')).strip()
def jours(a, b):
    try: return (date.fromisoformat(a) - date.fromisoformat(b)).days
    except Exception: return None

def main(ptcg, dex, page='index.html'):
    pt = {s['id']: s for s in json.load(open(os.path.join(ptcg, 'sets', 'en.json'), encoding='utf-8'))}
    # 1. Les extensions TCGdex internationales, et leur lien avec pokemontcg.io
    dx = {}
    for serie in os.listdir(os.path.join(dex, 'data')):
        p = os.path.join(dex, 'data', serie)
        if not os.path.isdir(p): continue
        for f in os.listdir(p):
            if not f.endswith('.ts'): continue
            t = open(os.path.join(p, f), encoding='utf-8').read()
            sid = id_de(t)
            if not sid: continue
            nm = re.search(r"name:\s*\{([^}]*)\}", t, re.S)
            d = re.search(r"releaseDate:\s*['\"]([^'\"]+)", t)
            dx[sid] = {'en': champ(nm.group(1), 'en') or '' if nm else '', 'fr': champ(nm.group(1), 'fr') or '' if nm else '',
                       'date': d.group(1) if d else '', 'dir': os.path.join(p, f[:-3])}
    par_nom = defaultdict(list)
    for k, v in dx.items(): par_nom[norm(v['en'])].append(k)
    lien = {}
    for pid, s in pt.items():
        d = s['releaseDate'].replace('/', '-')
        c = par_nom.get(norm(s['name']), [])
        if len(c) > 1: c = [x for x in c if dx[x]['date'] == d] or c
        if not c: c = [k for k, v in dx.items() if v['date'] == d and norm(v['en'])[:6] == norm(s['name'])[:6]]
        if c: lien[pid] = c[0]
    for a, b in LIENS_FORCES.items():
        if b in dx: lien[a] = b
    # La fiche TCGdex d'une impression internationale : son nom français, et son
    # illustrateur — pokemontcg.io ne le donne plus pour les extensions récentes
    # (Mascarade Crépusculaire, Rivalités Destinées, Méga-Évolution…), et sans
    # lui la carte japonaise ne retrouvait pas sa jumelle.
    def dex_carte(pid, num):
        d = lien.get(pid)
        if not d or d not in dx: return None, None
        for cand in (num, num.zfill(3), num.zfill(2)):
            f = os.path.join(dx[d]['dir'], cand + '.ts')
            if os.path.exists(f):
                t = open(f, encoding='utf-8').read()
                m = re.search(r"name:\s*\{([^}]*)\}", t, re.S)
                il = re.search(r"illustrator:\s*" + Q, t)
                return (champ(m.group(1), 'fr') if m else None), ((il.group(1) or il.group(2)) if il else None)
        return None, None
    def ext_fr(pid):
        d = lien.get(pid)
        return dx[d]['fr'] if d and d in dx and dx[d]['fr'] else pt[pid]['name']
    # 2. Les impressions internationales et japonaises de chaque famille
    EN = defaultdict(list); JA = defaultdict(list)
    for f in os.listdir(os.path.join(ptcg, 'cards', 'en')):
        sid = f[:-5]
        for c in json.load(open(os.path.join(ptcg, 'cards', 'en', f), encoding='utf-8')):
            if c.get('supertype') != 'Pokémon': continue
            for fid, (mots, _, _) in FAMILLES.items():
                if not any(re.search(r'(^|[^A-Za-z])' + w + r'($|[^A-Za-z])', c['name']) for w in mots): continue
                mem, pre, suf = var_en(c['name'], mots)
                if mem is None: continue
                # Garde-fou : un nom français n'est retenu que s'il nomme bien le
                # Pokémon. Une extension mal reliée donnerait sinon le nom d'une
                # autre carte (« Trempette Épique » pour un Magicarpe).
                nd, ild = dex_carte(sid, c['number'])
                sans = lambda x: re.sub(r'[^a-z]', '', x.lower().replace('é', 'e').replace('è', 'e'))
                if nd and sans(FR[mots[mem]]) not in sans(nd): nd = None
                EN[fid].append({'k': sid + '/' + c['number'], 'cle': (mem, pre, suf, str(c.get('hp') or ''), ill(c.get('artist') or ild)),
                                'n': nd or nom_fr(mem, pre, suf, mots), 's': ext_fr(sid),
                                'num': c['number'], 'd': pt[sid]['releaseDate'].replace('/', '-'), 'set': sid,
                                'rar': c.get('rarity') or ''})
    base = os.path.join(dex, 'data-asia')
    for serie in os.listdir(base):
        p = os.path.join(base, serie)
        if not os.path.isdir(p): continue
        for setdir in os.listdir(p):
            d = os.path.join(p, setdir)
            if not os.path.isdir(d): continue
            st = open(d + '.ts', encoding='utf-8').read() if os.path.exists(d + '.ts') else ''
            setid = id_de(st) or setdir
            # La date de sortie japonaise : « releaseDate: { ja: '…' } », ou une
            # date seule, sans langue, pour beaucoup d'extensions.
            dt = re.search(r"ja:\s*['\"](\d{4}-\d\d-\d\d)", st) or re.search(r"releaseDate:\s*['\"](\d{4}-\d\d-\d\d)", st)
            dt = dt.group(1) if dt else '9999'
            for f in os.listdir(d):
                if not f.endswith('.ts'): continue
                t = open(os.path.join(d, f), encoding='utf-8').read()
                if 'category: "Pokemon"' not in t and "category: 'Pokemon'" not in t: continue
                m = re.search(r"name:\s*\{([^}]*)\}", t, re.S)
                nja = champ(m.group(1), 'ja') if m else None
                if not nja: continue
                hp = re.search(r"\bhp:\s*(\d+)", t)
                il = re.search(r"illustrator:\s*" + Q, t)
                ilv = (il.group(1) or il.group(2)) if il else ''
                rj = re.search(r"rarity:\s*" + Q, t)
                rjv = (rj.group(1) or rj.group(2)) if rj else ''
                for fid, (mots, jmots, _) in FAMILLES.items():
                    if not any(w in nja for w in jmots): continue
                    mem, pre, suf = var_ja(nja, jmots)
                    if mem is None: continue
                    JA[fid].append({'k': 'ja:' + setid + '/' + f[:-3], 'cle': (mem, pre, suf, hp.group(1) if hp else '', ill(ilv)),
                                    'n': nom_fr(mem, pre, suf, mots), 's': setid, 'num': f[:-3], 'd': dt, 'set': setid, 'rar': rjv})
    # 3. La fusion, famille par famille
    out = []
    for fid, (mots, _, titre) in FAMILLES.items():
        idx = defaultdict(list); sans_ill = defaultdict(list)
        for e in EN[fid]: idx[e['cle']].append(e); sans_ill[e['cle'][:4]].append(e)
        alias = {}
        for j in JA[fid]:
            cands = idx.get(j['cle'], [])
            # TCGdex ne nomme pas l'illustrateur des « Hyper rare » japonaises de
            # l'ère Soleil et Lune : ce sont les arc-en-ciel internationales.
            if not cands and not j['cle'][4] and j['rar'] in RARETES_SANS_ILL:
                # Sans illustrateur pour départager, la date le fait : l'équivalent
                # sort dans l'année qui suit, pas une autre GX deux ans après.
                cands = [e for e in sans_ill.get(j['cle'][:4], []) if e['rar'] == RARETES_SANS_ILL[j['rar']]
                         and (jours(e['d'], j['d']) is not None and -30 <= jours(e['d'], j['d']) <= 365)]
            if not cands: continue
            if j['d'] != '9999':
                sc = []
                for e in cands:
                    x = jours(e['d'], j['d'])
                    sc.append((x if x is not None and x >= -30 else 100000 + abs(x or 0), e))
                sc.sort(key=lambda t: t[0]); c = sc[0][1]
            else:
                c = sorted(cands, key=lambda e: e['d'])[0]
            alias[j['k']] = c['k']
        alt = defaultdict(list)
        for jk, ek in alias.items(): alt[ek].append(jk)
        cases = [(e['d'], e['s'], e['num'], [e['k'], e['n'], e['s'], e['num']] + ([sorted(alt[e['k']])] if alt[e['k']] else []))
                 for e in EN[fid]]
        cases += [(j['d'], j['s'], j['num'], [j['k'], j['n'], j['s'], j['num']]) for j in JA[fid] if j['k'] not in alias]
        cases.sort(key=lambda x: (x[0], x[1], int(re.sub(r'\D', '', x[2]) or 0)))
        out.append([fid, titre, [c[3] for c in cases]])
        print('%-11s %3d internationales, %3d japonaises dont %3d fusionnées → %3d cases'
              % (fid, len(EN[fid]), len(JA[fid]), len(alias), len(cases)))
    html = open(page, encoding='utf-8').read()
    i = html.index('const CA_LIGNEES=') + len('const CA_LIGNEES='); j = html.index(';\n', i)
    html = html[:i] + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + html[j:]
    open(page, 'w', encoding='utf-8').write(html)

if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'index.html')
