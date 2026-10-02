// ── Cartes : la collection, vue et gérée depuis OMEGA ─────────────────────
// La note « Cartes » reste la source : la page lit ses tableaux et réécrit
// leurs lignes. Les risques ne sont pas de planter, mais :
//   1. de MAL LIRE — compter un total comme une carte, perdre un prix, ne pas
//      reconnaître une colonne ;
//   2. de MAL ÉCRIRE — toucher une autre ligne, une autre cellule, le texte
//      voisin, ou écraser une modification faite ailleurs ;
//   3. de MONTRER UNE MAUVAISE IMAGE, ou d'interroger le réseau sans fin.
// Les bases publiques (pokemontcg.io, TCGdex) sont SIMULÉES ici : l'environnement
// d'épreuve ne les joint pas. Ce qu'on éprouve, c'est ce que l'application
// demande et ce qu'elle fait des réponses — au format documenté de ces bases.
// Playwright n'est pas une dépendance du projet : il s'installe à la demande
// (voir tests/LISEZMOI.md). Le navigateur est celui de l'environnement.
const {chromium}=require('playwright');
const NAVIGATEUR=process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[];const chk=(n,ok,d='')=>R.push([n,ok,d]);

const CM='https://www.cardmarket.com/fr/Pokemon/Products/Singles';
const NOTE=`Ma collection, tenue à jour.

{vert:Cadeau Noé :}

| Cartes | Prix | Prix vente 2026-09 | Où |
|---|---|---|---|
| [Dracaufeu ex](${CM}/Obsidian-Flames/Charizard-ex-V1-OBF223) | 21€ |  | Noé |
| [[Flagadoss Shiny]] | 5€ |  | Noé |
| **Limonde** AR | 3€ | 4€ | Classeur |
| [Lien direct](https://images.pokemontcg.io/sv3/1_hires.png) | 6,50€ |  | Noé |
| **Total** | =SOMME(haut) | =SOMME(haut) |  |

Texte entre les deux tableaux, à ne pas toucher.

## À vendre

| Carte | Prix |
|---|---|
| Ramoloss TOPPS | 3€ |
| Insolourdo Yuka Mori | 7€ |
`;

(async()=>{
const b=await chromium.launch({executablePath:NAVIGATEUR});
const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'fr-FR'});
// Les images ne sont pas joignables d'ici : on sert une image d'un pixel à
// leur place, sinon le repli prévu en cas d'échec les retirerait de l'écran.
const PIXEL=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
await ctx.route(/^https:\/\/(images\.pokemontcg\.io|assets\.tcgdex\.net|exemple\.fr)\//,
  r=>r.fulfill({status:200,contentType:'image/png',body:PIXEL}));
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
await p.goto('http://127.0.0.1:8899/index.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof renderCartes==='function');

// Le banc : une note Cartes, des écritures neutralisées, des bases simulées.
await p.evaluate(src=>{
  window.toast=()=>{}; window.noteUpsert=async()=>true; window.noteSnapshot=async()=>{};
  window.ANNUL=[]; window.offerUndo=(m,fn)=>{ ANNUL.push({m,fn}); };
  accessToken=''; notesLoaded=true;
  try{ localStorage.removeItem('kanban_cartes_img2'); }catch(e){}
  CA_PAUSE=20;
  notes=[{id:'nc',title:'Cartes',content:src,tags:'',parent_id:'',icon:'🃏',status:'active',
          created_at:'2026-01-01',updated_at:'2026-01-01'}];
  noteIndexInvalidate();
  window.APPELS=[]; window.SATURE={};
  window.fetch=async u=>{
    u=String(u); APPELS.push(u);
    const rep=j=>({ok:true,json:async()=>j});
    if(u.startsWith('https://api.pokemontcg.io/v2/cards')){
      const q=decodeURIComponent(u.split('q=')[1]||'');
      if(/set\.ptcgoCode:OBF number:223/.test(q))return rep({data:[{id:'sv3-223',name:'Charizard ex',number:'223',
        set:{name:'Obsidian Flames',ptcgoCode:'OBF'},
        images:{small:'https://images.pokemontcg.io/sv3/223.png',large:'https://images.pokemontcg.io/sv3/223_hires.png'},
        cardmarket:{prices:{trendPrice:23.4}}}]});
      if(/name:"Pikachu" set\.name:"Base Set"/.test(q))return rep({data:[{id:'base1-58',name:'Pikachu',number:'58',
        set:{name:'Base Set'},images:{small:'https://images.pokemontcg.io/base1/58.png',large:'https://images.pokemontcg.io/base1/58_hires.png'}}]});
      if(/javascript/.test(q))return rep({data:[{images:{large:'javascript:alert(1)'}}]});
      if(/set\.id:svp number:121/.test(q))return rep({data:[{number:'121',set:{name:'SV Promos'},
        images:{small:'https://images.pokemontcg.io/svp/121.png',large:'https://images.pokemontcg.io/svp/121_hires.png'}}]});
      // Une base saturée : SATURE[code] refus avant de répondre.
      const m=/ptcgoCode:(SAT[A-Z])/.exec(q);
      if(m){ if(window.SATURE[m[1]]-->0)return {ok:false,status:429,json:async()=>null};
             return rep({data:[{number:'1',set:{name:'X'},images:{small:`https://images.pokemontcg.io/x/${m[1]}.png`,large:`https://images.pokemontcg.io/x/${m[1]}_hires.png`}}]}); }
      if(/ptcgoCode:NET /.test(q))throw new TypeError('Failed to fetch');
      return rep({data:[]});
    }
    if(u.startsWith('https://api.tcgdex.net/v2/fr/cards?name=')){
      const n=decodeURIComponent(u.split('name=')[1]);
      if(n==='Flagadoss')return rep([
        {id:'sv03.5-080',localId:'080',name:'Flagadoss',image:'https://assets.tcgdex.net/fr/sv/sv03.5/080'},
        {id:'swsh1-055',localId:'055',name:'Flagadoss',image:'https://assets.tcgdex.net/fr/swsh/swsh1/055'},
        {id:'x-1',localId:'1',name:'Flagadoss sans image'}]);
      return rep([]);
    }
    return {ok:false,json:async()=>null};
  };
},NOTE);

console.log('=== 1. LIRE LA NOTE ===');
const lu=await p.evaluate(()=>{
  const s=caLire(caNoteDe());
  return {n:s.length,titres:s.map(x=>x.titre),
    cartes:s.map(x=>x.cartes.map(c=>({nom:c.nom,prix:c.prix,vente:c.vente,ou:c.ou,url:c.url}))),
    cols:s[0].cols};
});
chk('Deux tableaux, deux sections',lu.n===2,String(lu.n));
chk('Le titre vient de la ligne au-dessus, nettoyée de sa couleur',lu.titres[0]==='Cadeau Noé',JSON.stringify(lu.titres));
chk('...ou de l\'intertitre',lu.titres[1]==='À vendre',JSON.stringify(lu.titres));
chk('La ligne de total n\'est pas une carte',lu.cartes[0].length===4&&!lu.cartes[0].some(c=>/total/i.test(c.nom)),
    JSON.stringify(lu.cartes[0].map(c=>c.nom)));
chk('Les colonnes sont reconnues par leur nom',
    lu.cols.nom===0&&lu.cols.prix===1&&lu.cols.vente===2&&lu.cols.ou===3&&lu.cols.url<0,JSON.stringify(lu.cols));
chk('Un lien donne son libellé comme nom et sa cible comme adresse',
    lu.cartes[0][0].nom==='Dracaufeu ex'&&/OBF223$/.test(lu.cartes[0][0].url),JSON.stringify(lu.cartes[0][0]));
chk('Un lien de note et le gras sont retirés du nom',
    lu.cartes[0][1].nom==='Flagadoss Shiny'&&lu.cartes[0][2].nom==='Limonde AR',JSON.stringify(lu.cartes[0].map(c=>c.nom)));
chk('Les prix se lisent à la française, euro compris',
    lu.cartes[0].map(c=>c.prix).join()==='21,5,3,6.5'&&lu.cartes[0][2].vente===4,JSON.stringify(lu.cartes[0].map(c=>[c.prix,c.vente])));
chk('Le lieu est lu',lu.cartes[0][2].ou==='Classeur'&&lu.cartes[0][0].ou==='Noé');
chk('Un tableau sans colonne de lieu reste lisible',lu.cartes[1].length===2&&lu.cartes[1][0].ou==='',JSON.stringify(lu.cartes[1]));

console.log('=== 2. L\'ADRESSE DIT LA CARTE ===');
const url=await p.evaluate(()=>({
  cm:caLireUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/Paldean-Fates/Charmander-PAF109'),
  cmV:caLireUrl('https://www.cardmarket.com/en/Pokemon/Products/Singles/Obsidian-Flames/Charizard-ex-V1-OBF223?language=2'),
  cmSans:caLireUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/Base-Set/Pikachu-V1'),
  lim:caLireUrl('https://limitlesstcg.com/cards/OBF/125'),
  limJp:caLireUrl('https://limitlesstcg.com/cards/jp/SV4a/123'),
  dex:caLireUrl('https://api.tcgdex.net/v2/fr/cards/swsh3-136'),
  autre:caLireUrl('https://www.pokecardex.com/series/SV3'),
  image:caEstImage('https://exemple.fr/carte.jpg?x=1'),
  pasImage:caEstImage('https://www.cardmarket.com/fr/Pokemon/Products/Singles/x/y-OBF1'),
}));
chk('Cardmarket : extension et numéro tirés de l\'adresse',url.cm.code==='PAF'&&url.cm.num==='109',JSON.stringify(url.cm));
chk('...variante « -V1 » et paramètres d\'adresse sans effet',
    url.cmV.code==='OBF'&&url.cmV.num==='223'&&url.cmV.nom==='Charizard ex',JSON.stringify(url.cmV));
chk('...sans code, le nom et l\'extension restent',
    url.cmSans.code===''&&url.cmSans.nom==='Pikachu'&&url.cmSans.ext==='Base Set',JSON.stringify(url.cmSans));
chk('Limitless : extension et numéro',url.lim.code==='OBF'&&url.lim.num==='125',JSON.stringify(url.lim));
chk('Limitless japonais : reconnu, mais pas illustrable',url.limJp.source==='limitless-jp',JSON.stringify(url.limJp));
chk('TCGdex : identifiant de carte',url.dex.id==='swsh3-136'&&url.dex.lang==='fr',JSON.stringify(url.dex));
chk('Un site inconnu ne fait rien deviner',url.autre===null);
chk('Une adresse d\'image est reconnue comme telle',url.image===true&&url.pasImage===false);

console.log('=== 3. LA PAGE ===');
const pg=await p.evaluate(async()=>{
  const out={};
  switchPage('cartes'); await new Promise(r=>setTimeout(r,500));
  out.onglet=[...document.querySelectorAll('#subTabs .subtab')].some(x=>x.textContent==='Cartes'&&x.classList.contains('active'));
  out.tuiles=document.querySelectorAll('.ca-tuile').length;
  out.sections=[...document.querySelectorAll('.ca-sec-t')].map(x=>x.textContent);
  out.kpis=[...document.querySelectorAll('.jp-kpi')].map(k=>k.textContent.replace(/\s+/g,' ').trim());
  out.lieux=[...document.querySelectorAll('.ca-lieux .sb-tag')].map(x=>x.textContent);
  // filtre par lieu
  [...document.querySelectorAll('.ca-lieux .sb-tag')].find(x=>x.textContent==='Classeur').click();
  await new Promise(r=>setTimeout(r,200));
  out.classeur=[...document.querySelectorAll('.ca-tuile .ca-nom')].map(x=>x.textContent);
  caOu=''; renderCartes(); await new Promise(r=>setTimeout(r,200));
  // recherche : la grille change, le champ garde la frappe
  const q=document.getElementById('caQ'); q.focus(); q.value='ramo'; q.dispatchEvent(new Event('input'));
  await new Promise(r=>setTimeout(r,150));
  out.recherche=[...document.querySelectorAll('.ca-tuile .ca-nom')].map(x=>x.textContent);
  out.focusGarde=document.activeElement===q;
  q.value=''; q.dispatchEvent(new Event('input'));
  // tri par prix
  caTri='prix-'; renderCartes(); await new Promise(r=>setTimeout(r,200));
  out.tri=[...document.querySelectorAll('.ca-sec')][0].querySelectorAll('.ca-prix')[0].textContent;
  caTri='ordre'; renderCartes(); await new Promise(r=>setTimeout(r,400));
  return out;
});
chk('L\'onglet Cartes est dans OMEGA, et actif',pg.onglet===true);
chk('Une tuile par carte, le total exclu',pg.tuiles===6,String(pg.tuiles));
chk('Les sections portent leur titre',pg.sections.join('|')==='Cadeau Noé|À vendre',pg.sections.join('|'));
chk('La valeur totale est juste',pg.kpis.some(k=>/Valeur.*45,50\s€/.test(k)),JSON.stringify(pg.kpis));
chk('Le prix de vente n\'additionne que ce qui est renseigné',pg.kpis.some(k=>/vente.*4\s€/i.test(k)),JSON.stringify(pg.kpis));
chk('Les lieux deviennent des filtres',pg.lieux.join('|')==='Tous|Classeur|Noé',pg.lieux.join('|'));
chk('Filtrer par lieu',pg.classeur.join('|')==='Limonde AR',pg.classeur.join('|'));
chk('La recherche ignore la casse',pg.recherche.join('|')==='Ramoloss TOPPS',pg.recherche.join('|'));
chk('...et ne fait pas perdre le champ',pg.focusGarde===true);
chk('Trier par prix décroissant',/21\s€/.test(pg.tri),pg.tri);

console.log('=== 4. LES IMAGES ===');
const im=await p.evaluate(async()=>{
  const out={};
  await new Promise(r=>setTimeout(r,400));
  const src=k=>{ const i=document.querySelector(`.ca-tuile[data-k="${k}"] img`); return i?i.getAttribute('src'):null; };
  out.cardmarket=src('0:0');
  out.direct=src('0:3');
  out.sansUrl=src('0:1');
  out.appels=APPELS.slice();
  // Deuxième ouverture : rien ne repart sur le réseau.
  APPELS.length=0; renderCartes(); await new Promise(r=>setTimeout(r,400));
  out.appels2=APPELS.slice();
  // Un échec est retenu : on ne réinterroge pas à chaque ouverture.
  APPELS.length=0;
  const r1=await caImage({url:'https://www.cardmarket.com/fr/Pokemon/Products/Singles/Inconnue/Truc-ZZZ9',img:''});
  const n1=APPELS.length;
  const r2=await caImage({url:'https://www.cardmarket.com/fr/Pokemon/Products/Singles/Inconnue/Truc-ZZZ9',img:''});
  out.echec={r1,r2,n1,n2:APPELS.length-n1};
  // Le code Cardmarket des promos n'est pas celui de la base : repli sur l'identifiant d'extension.
  out.promo=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/SV-Black-Star-Promos/Axolotto-SVP121');
  // Sans code, repli sur nom + extension.
  out.repli=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/Base-Set/Pikachu-V1');
  // Une réponse piégée n'entre pas dans une balise.
  out.piege=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/javascript/javascript-ZZ1');
  // La cote Cardmarket est retenue quand la base la fournit.
  out.cote=(caCache()[ caLire(caNoteDe())[0].cartes[0].url ]||{}).cote;
  return out;
});
chk('Adresse Cardmarket → image trouvée automatiquement',
    im.cardmarket==='https://images.pokemontcg.io/sv3/223.png',String(im.cardmarket));
chk('...en demandant la carte exacte, extension et numéro',
    im.appels.some(u=>/set\.ptcgoCode%3AOBF%20number%3A223/.test(u)),JSON.stringify(im.appels));
chk('Une adresse d\'image est montrée telle quelle, sans requête',
    im.direct==='https://images.pokemontcg.io/sv3/1_hires.png'&&!im.appels.some(u=>/sv3\/1_hires/.test(u)));
chk('Sans adresse, rien n\'est deviné',im.sansUrl===null);
chk('Pas plus d\'une requête par carte',im.appels.length===1,JSON.stringify(im.appels));
chk('Deuxième ouverture : aucune requête',im.appels2.length===0,JSON.stringify(im.appels2));
chk('Une vraie absence est retenue, pas réessayée à chaque fois',
    !!(im.echec.r1&&im.echec.r1.introuvable)&&!!(im.echec.r2&&im.echec.r2.introuvable)&&im.echec.n2===0,JSON.stringify(im.echec));
chk('...avec ce qui a été lu dans l\'adresse',/Inconnue · ZZZ 9 · Truc/.test(im.echec.r1&&im.echec.r1.introuvable||''),JSON.stringify(im.echec.r1));
chk('Promo : repli sur l\'identifiant d\'extension',im.promo&&/svp\/121/.test(im.promo.img||''),JSON.stringify(im.promo));
chk('Sans code dans l\'adresse, repli sur le nom et l\'extension',
    im.repli&&/base1\/58/.test(im.repli.img),JSON.stringify(im.repli));
chk('Une adresse d\'image piégée est refusée',!!im.piege&&!im.piege.img,JSON.stringify(im.piege));
chk('La cote Cardmarket est retenue',im.cote===23.4,String(im.cote));

console.log('=== 4 bis. UNE BASE SATURÉE N\'EST PAS UNE ABSENCE ===');
// C'est le défaut constaté en vrai sur la v1.67.0 : passé les premières
// cartes, la base refusait (429) ou tardait, et ces refus étaient gardés
// comme « introuvable » une semaine. La moitié de la collection restait vide.
const sat=await p.evaluate(async()=>{
  const out={};
  const U=c=>`https://www.cardmarket.com/fr/Pokemon/Products/Singles/X/Carte-${c}`;
  // a. Un refus 429 n'est pas gardé.
  SATURE.SATA=1;
  const r1=await caImage({url:U('SATA1'),img:''});
  out.refus=r1; out.garde=!!caCache()[U('SATA1')];
  // ...et la carte s'obtient dès que la base répond.
  const r2=await caImage({url:U('SATA1'),img:''});
  out.ensuite=r2&&r2.img;
  // b. Une coupure réseau non plus.
  const r3=await caImage({url:U('NET1'),img:''});
  out.reseau={r3,garde:!!caCache()[U('NET1')]};
  // c. Le chargeur remet en file et réessaie.
  const src='| Carte | Prix |\n|---|---|\n'+
    `| [A](${U('SATB1')}) | 1€ |\n| [B](${U('SATC1')}) | 1€ |\n| [C](${U('SATD1')}) | 1€ |\n| [D](${U('ZZZ7')}) | 1€ |\n| Sans adresse | 1€ |\n`;
  caNoteDe().content=src;
  SATURE.SATB=2; SATURE.SATC=1; SATURE.SATD=9;          // 2 refus, 1 refus, toujours refusé
  const vus=[]; const obs=new MutationObserver(()=>{ const e=document.getElementById('caEtat'); if(e)vus.push(e.textContent); });
  obs.observe(document.getElementById('caWrap'),{childList:true,subtree:true,characterData:true});
  renderCartes(); await new Promise(r=>setTimeout(r,250));
  out.etatPendant=vus.find(t=>/en recherche/.test(t))||vus.join(' / ');
  await new Promise(r=>setTimeout(r,1500));
  const img=k=>!!document.querySelector(`.ca-tuile[data-k="0:${k}"] img`);
  out.obtenues=[img(0),img(1),img(2),img(3)];
  out.etat=document.getElementById('caEtat').textContent; obs.disconnect();
  out.saturePasGardee=!caCache()[U('SATD1')];
  out.indiceIntrouvable=/choisir une image/.test(document.querySelector('.ca-tuile[data-k="0:3"]').textContent);
  out.indiceSansAdresse=/choisir une image/.test(document.querySelector('.ca-tuile[data-k="0:4"]').textContent);
  // d. « Réessayer » oublie les absences et relance.
  APPELS.length=0;
  caOublierIntrouvables(); await new Promise(r=>setTimeout(r,600));
  out.relance=APPELS.some(u=>/ZZZ/.test(decodeURIComponent(u)));
  // e. La fiche dit pourquoi il n'y a pas d'image.
  caOuvrir('0:3'); await new Promise(r=>setTimeout(r,300));
  out.raison=document.getElementById('caInfo').textContent;
  caFermer();
  // f. L'ancien cache, faussé, est jeté.
  out.ancienJete=localStorage.getItem('kanban_cartes_img')===null;
  return out;
});
chk('Un refus 429 est passager, pas une absence',!!(sat.refus&&sat.refus.passager)&&sat.garde===false,JSON.stringify(sat));
chk('...et la carte s\'obtient au passage suivant',/SATA_hires/.test(sat.ensuite||''),String(sat.ensuite));
chk('Une coupure réseau n\'est pas gardée non plus',!!(sat.reseau.r3&&sat.reseau.r3.passager)&&!sat.reseau.garde,JSON.stringify(sat.reseau));
chk('La ligne d\'état montre la recherche en cours',/en recherche/.test(sat.etatPendant),sat.etatPendant);
chk('Le chargeur réessaie : 2 refus puis réponse → image',sat.obtenues[0]===true&&sat.obtenues[1]===true,JSON.stringify(sat.obtenues));
chk('Toujours refusée : pas d\'image, et rien de gardé',sat.obtenues[2]===false&&sat.saturePasGardee===true,JSON.stringify(sat));
chk('...et la ligne d\'état le dit',/1 non obtenues.*saturée/.test(sat.etat)&&/1 sans correspondance/.test(sat.etat),sat.etat);
chk('Une carte sans correspondance invite à choisir l\'image',sat.indiceIntrouvable===true);
chk('...comme une carte sans adresse',sat.indiceSansAdresse===true);
chk('« Réessayer » relance les cartes sans correspondance',sat.relance===true);
chk('La fiche dit pourquoi',/Lu dans l'adresse.*aucune carte correspondante/.test(sat.raison),sat.raison);
chk('L\'ancien cache faussé est jeté',sat.ancienJete===true);

console.log('=== 5. ÉCRIRE DANS LA NOTE ===');
const ec=await p.evaluate(async src=>{
  const out={};
  const n=caNoteDe(); n.content=src;
  const L=()=>caNoteDe().content.split('\n');
  const avant=L();
  // a. Modifier un prix : UNE cellule change, rien d'autre.
  let c=caLire(n)[0].cartes[1];
  await caEcrire({type:'maj',rang:0,sig:c.sig,val:{nom:c.nom,url:c.url,prix:'7,5',vente:'',ou:c.ou}},'x');
  const apres=L();
  out.diff=apres.map((l,i)=>l!==avant[i]?[avant[i],l]:null).filter(Boolean);
  out.memeLongueur=apres.length===avant.length;
  // b. Ajouter : avant le total, et le total compte la nouvelle.
  await caEcrire({type:'ajout',rang:0,val:{nom:'Axoloto Shiny',url:'',prix:'4',vente:'',ou:'Noé'}},'x');
  const t=L(); const iTot=t.findIndex(l=>/\*\*Total\*\*/.test(l));
  out.ajoutAvantTotal=/Axoloto Shiny/.test(t[iTot-1]);
  out.ligneAjout=t[iTot-1];
  const d=document.createElement('div'); d.innerHTML=mdRender(caNoteDe().content);
  out.total=d.querySelector('tbody tr:last-child td:nth-child(2)').textContent;
  // c. Nom + adresse, sans colonne d'adresse : le nom devient un lien.
  c=caLire(caNoteDe())[1].cartes[0];
  await caEcrire({type:'maj',rang:1,sig:c.sig,val:{nom:'Ramoloss TOPPS',url:'https://www.cardmarket.com/fr/Pokemon/Products/Singles/X/Slowpoke-OBF1',prix:'3',vente:'',ou:''}},'x');
  out.lien=L().find(l=>/Ramoloss/.test(l));
  // d. Supprimer.
  c=caLire(caNoteDe())[1].cartes[1];
  await caEcrire({type:'suppr',rang:1,sig:c.sig},'x');
  out.suppr=!/Insolourdo/.test(caNoteDe().content);
  // e. Le texte autour n'a pas bougé.
  out.texte=/^Ma collection, tenue à jour\.$/m.test(caNoteDe().content)
    &&/^Texte entre les deux tableaux, à ne pas toucher\.$/m.test(caNoteDe().content)
    &&/^\{vert:Cadeau Noé :\}$/m.test(caNoteDe().content);
  // f. Une carte modifiée ailleurs n'est pas écrasée.
  c=caLire(caNoteDe())[0].cartes[0];
  const vrai=caNoteDe().content;
  caNoteDe().content=vrai.replace('| 21€ |','| 22€ |');    // un autre appareil est passé par là
  const garde=caNoteDe().content;
  const ok=await caEcrire({type:'maj',rang:0,sig:c.sig,val:{nom:c.nom,url:c.url,prix:'99',vente:'',ou:c.ou}},'x');
  out.conflit={ok,intact:caNoteDe().content===garde};
  caNoteDe().content=vrai;
  // g. Annuler rend la version d'avant.
  const av=caNoteDe().content; c=caLire(caNoteDe())[0].cartes[2];
  ANNUL.length=0;
  await caEcrire({type:'maj',rang:0,sig:c.sig,val:{nom:'Limonde AR',url:'',prix:'3',vente:'4',ou:'Tiroir'}},'x');
  out.changeOu=/Tiroir/.test(caNoteDe().content);
  await ANNUL[0].fn();
  out.annule=caNoteDe().content===av;
  // h. Rien changé = rien écrit.
  let ecrit=0; const nu=window.noteUpsert; window.noteUpsert=async()=>{ecrit++;return true;};
  c=caLire(caNoteDe())[0].cartes[2];
  await caEcrire({type:'maj',rang:0,sig:c.sig,val:{nom:c.nom,url:c.url,prix:'3',vente:'4',ou:c.ou}},'x');
  window.noteUpsert=nu; out.rienEcrit=ecrit===0;
  return out;
},NOTE);
chk('Modifier un prix ne touche qu\'une ligne',ec.diff.length===1&&ec.memeLongueur,JSON.stringify(ec.diff));
chk('...et dans cette ligne, que le prix, au format de la colonne',
    ec.diff[0]&&ec.diff[0][1]==='| [[Flagadoss Shiny]] | 7,50€ |  | Noé |',JSON.stringify(ec.diff));
chk('Une carte ajoutée entre AVANT le total',ec.ajoutAvantTotal===true,ec.ligneAjout);
// 21 + 7,5 (modifié) + 3 + 6,5 + 4 (ajouté)
chk('...et le total la compte',ec.total==='42',ec.total);
chk('Sans colonne d\'adresse, le nom devient un lien',
    /\| \[Ramoloss TOPPS\]\(https:\/\/www\.cardmarket\.com\/[^)]+\) \| 3€ \|/.test(ec.lien||''),String(ec.lien));
chk('Supprimer retire la ligne',ec.suppr===true);
chk('Le texte autour des tableaux n\'a pas bougé',ec.texte===true);
chk('Une carte modifiée ailleurs n\'est pas écrasée',ec.conflit.ok===false&&ec.conflit.intact===true,JSON.stringify(ec.conflit));
chk('Le lieu se modifie',ec.changeOu===true);
chk('Annuler rend exactement la version d\'avant',ec.annule===true);
chk('Rien de changé, rien d\'écrit',ec.rienEcrit===true);

console.log('=== 6. CHOISIR L\'IMAGE À LA MAIN ===');
const ch=await p.evaluate(async src=>{
  const out={};
  caNoteDe().content=src;
  // La recherche retire les qualificatifs et raccourcit jusqu'à trouver.
  APPELS.length=0;
  const l=await caChercher('Flagadoss Shiny AR');
  out.trouves=l.length; out.requetes=APPELS.map(u=>decodeURIComponent(u.split('name=')[1]));
  out.hd=l[0]&&l[0].img; out.bd=l[0]&&l[0].petite;
  // Le choix est écrit dans la note : colonne « Image », ajoutée une fois.
  const c=caLire(caNoteDe())[0].cartes[1];
  await caEcrire({type:'maj',rang:0,sig:c.sig,val:{nom:c.nom,url:c.url,prix:'5',vente:'',ou:c.ou,img:l[0].img}},'x');
  const t=caNoteDe().content.split('\n');
  out.entete=t.find(x=>/^\| Cartes/.test(x));
  out.sep=t.find(x=>/^\|---/.test(x));
  out.ligne=t.find(x=>/Flagadoss Shiny/.test(x));
  out.autre=t.find(x=>/Dracaufeu/.test(x));
  const s=caLire(caNoteDe())[0];
  out.colImg=s.cols.img; out.img=s.cartes[1].img; out.nb=s.cartes.length;
  // Le rendu dans Notes reste un tableau valide, total compris.
  const d=document.createElement('div'); d.innerHTML=mdRender(caNoteDe().content);
  out.rendu={tables:d.querySelectorAll('table').length,
    cols:d.querySelector('table thead tr').children.length,
    total:d.querySelector('table tbody tr:last-child td:nth-child(2)').textContent};
  // L'image choisie s'affiche sans aucune requête.
  APPELS.length=0; renderCartes(); await new Promise(r=>setTimeout(r,300));
  const i=document.querySelector('.ca-tuile[data-k="0:1"] img');
  out.tuile=i&&i.getAttribute('src'); out.req=APPELS.length;
  // Une seconde image ne rajoute pas de colonne.
  const c2=caLire(caNoteDe())[0].cartes[2];
  await caEcrire({type:'maj',rang:0,sig:c2.sig,val:{nom:c2.nom,url:'',prix:'3',vente:'4',ou:c2.ou,img:'https://exemple.fr/l.png'}},'x');
  out.unSeulImage=(caNoteDe().content.match(/\| Image/g)||[]).length===1;
  return out;
},NOTE);
chk('La recherche par nom trouve des cartes',ch.trouves===2,String(ch.trouves));
chk('...en retirant « Shiny », « AR » et en raccourcissant',
    ch.requetes[0]==='Flagadoss',JSON.stringify(ch.requetes));
chk('...sans garder les fiches sans image',ch.trouves===2);
chk('Images TCGdex en haute et basse définition',
    /080\/high\.webp$/.test(ch.hd||'')&&/080\/low\.webp$/.test(ch.bd||''),JSON.stringify([ch.hd,ch.bd]));
chk('Le choix ajoute une colonne « Image » au tableau',/\| Image \|$/.test(ch.entete||''),String(ch.entete));
chk('...la ligne de séparation suit',ch.sep==='|---|---|---|---|---|',String(ch.sep));
chk('...l\'adresse est dans la bonne ligne',/high\.webp \|$/.test(ch.ligne||''),String(ch.ligne));
chk('...les autres lignes reçoivent une cellule vide',/\| Noé \|  \|$/.test(ch.autre||''),String(ch.autre));
chk('La colonne est relue comme celle des images',ch.colImg===4&&/high\.webp$/.test(ch.img||'')&&ch.nb===4,JSON.stringify(ch));
chk('Le tableau reste valide dans Notes, total compris',
    ch.rendu.tables===2&&ch.rendu.cols===5&&ch.rendu.total==='35,5',JSON.stringify(ch.rendu));
chk('L\'image choisie s\'affiche sans requête',/080\/high\.webp$/.test(ch.tuile||'')&&ch.req===0,JSON.stringify([ch.tuile,ch.req]));
chk('Une seconde image ne rajoute pas de colonne',ch.unSeulImage===true);

console.log('=== 7. SÛRETÉ ===');
const su=await p.evaluate(async()=>{
  const out={};
  caNoteDe().content='| Carte | Prix |\n|---|---|\n| <img src=x onerror="window.PWN=1"> | 2€ |\n| [clic](javascript:alert(1)) | 1€ |\n';
  renderCartes(); await new Promise(r=>setTimeout(r,300));
  out.pwn=!!window.PWN;
  out.imgInjectee=!!document.querySelector('.ca-tuile img[onerror*="PWN"]');
  const s=caLire(caNoteDe())[0];
  out.urlJs=s.cartes[1].url;
  caOuvrir('0:1'); await new Promise(r=>setTimeout(r,100));
  out.lienFiche=document.getElementById('caLien').innerHTML;
  caFermer();
  return out;
});
chk('Un nom piégé ne s\'exécute pas',su.pwn===false&&su.imgInjectee===false);
chk('Une adresse javascript: n\'est pas retenue',su.urlJs==='',String(su.urlJs));
chk('...et ne devient pas un lien',!/javascript/i.test(su.lienFiche),su.lienFiche);

console.log('=== 8. LA FICHE ===');
const fi=await p.evaluate(async src=>{
  const out={};
  caNoteDe().content=src; renderCartes(); await new Promise(r=>setTimeout(r,300));
  document.querySelector('.ca-tuile[data-k="0:0"]').click(); await new Promise(r=>setTimeout(r,300));
  out.ouverte=document.getElementById('caModal').classList.contains('open');
  out.nom=document.getElementById('caNom').value; out.prix=document.getElementById('caPrix').value;
  out.apercu=(document.querySelector('#caApercu img')||{}).src||'';
  out.info=document.getElementById('caInfo').textContent;
  out.champsVente=document.getElementById('caVenteChamp').style.display!=='none';
  document.getElementById('caPrix').value='25';
  await caEnregistrer();
  out.ecrit=/\| 25€ \|/.test(caNoteDe().content);
  // Une section sans colonne de lieu ne propose pas de lieu.
  caOuvrir('1:0'); await new Promise(r=>setTimeout(r,100));
  out.pasDeLieu=document.getElementById('caOuChamp').style.display==='none';
  out.pasDeVente=document.getElementById('caVenteChamp').style.display==='none';
  caFermer();
  // Nouvelle carte : le choix de section est proposé.
  caOuvrir(null); await new Promise(r=>setTimeout(r,100));
  out.section=document.getElementById('caSecChamp').style.display!=='none'&&document.getElementById('caSec').options.length===2;
  caFermer();
  return out;
},NOTE);
chk('Un clic ouvre la fiche, remplie',fi.ouverte&&fi.nom==='Dracaufeu ex'&&fi.prix==='21',JSON.stringify(fi));
chk('...avec l\'image et la cote Cardmarket',/sv3\/223_hires/.test(fi.apercu)&&/Tendance Cardmarket : 23,40\s€/.test(fi.info),JSON.stringify([fi.apercu,fi.info]));
chk('Enregistrer depuis la fiche écrit dans la note',fi.ecrit===true);
chk('Seules les colonnes qui existent sont proposées',fi.champsVente&&fi.pasDeLieu&&fi.pasDeVente,JSON.stringify(fi));
chk('Une nouvelle carte demande sa section',fi.section===true);

console.log('=== 9. SANS NOTE ===');
const sn=await p.evaluate(async()=>{
  const sauve=notes; notes=[]; noteIndexInvalidate();
  renderCartes(); await new Promise(r=>setTimeout(r,200));
  const t=document.getElementById('caWrap').textContent;
  notes=sauve; noteIndexInvalidate();
  return /Aucune note « Cartes »/.test(t)&&/Créer la note Cartes/.test(t);
});
chk('Sans note Cartes, la page propose de la créer',sn===true);

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));
await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
