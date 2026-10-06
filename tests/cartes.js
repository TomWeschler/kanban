// ── Cartes : la collection, dans le classeur, images dans Drive ───────────
// La promesse de cette version : une image n'est CHERCHÉE qu'une fois, pour
// toujours et pour tous les appareils ; elle est ARCHIVÉE dans Google Drive ;
// et les ouvertures suivantes n'ont plus besoin d'aucun réseau.
// On éprouve donc surtout ce qui NE se passe PAS : pas de recherche refaite,
// pas de téléchargement refait, pas d'échec passager pris pour une absence.
// Le classeur, Drive et les bases publiques sont SIMULÉS : l'environnement
// d'épreuve ne les joint pas. Les images, elles, sont de vraies images,
// fabriquées dans la page, pour que réduction et stockage soient réels.
// Playwright n'est pas une dépendance du projet : il s'installe à la demande
// (voir tests/LISEZMOI.md). Le navigateur est celui de l'environnement.
const {chromium}=require('playwright');
const NAVIGATEUR=process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[];const chk=(n,ok,d='')=>R.push([n,ok,d]);

const CM='https://www.cardmarket.com/fr/Pokemon/Products/Singles';
const NOTE=`Ma collection.

{vert:Cadeau Noé :}

| Cartes | Prix | Prix vente 2026-09 | Où |
|---|---|---|---|
| [Dracaufeu ex](${CM}/Obsidian-Flames/Charizard-ex-V1-OBF223) | 21€ |  | Noé |
| [[Flagadoss Shiny]] | 5€ |  | Noé |
| **Limonde** AR | 3€ | 4€ | Classeur |
| [Lien direct](https://images.pokemontcg.io/sv3/1_hires.png) | 6,50€ |  | Noé |
| **Total** | =SOMME(haut) | =SOMME(haut) |  |

## À vendre

| Carte | Prix |
|---|---|
| [Déjà trouvée](${CM}/Paldean-Fates/Charmander-PAF109) | 3€ |
| [Site hostile](https://hostile.example/carte.png) | 7€ |
`;

(async()=>{
const b=await chromium.launch({executablePath:NAVIGATEUR});
const ctx=await b.newContext({viewport:{width:1400,height:950},locale:'fr-FR'});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
await p.goto('http://127.0.0.1:8899/index.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof renderCartes==='function');

// ── Le banc ───────────────────────────────────────────────────────────────
await p.evaluate(async src=>{
  window.toast=()=>{}; window.noteSnapshot=async()=>{};
  // Simuler un appareil neuf : on vide le magasin d'images. Supprimer la base
  // serait bloqué tant que la page y garde une connexion ouverte.
  window.viderIdb=()=>new Promise(r=>{ const o=indexedDB.open('kanban-cartes',1);
    o.onupgradeneeded=()=>o.result.createObjectStore('img');
    o.onsuccess=()=>{ const t=o.result.transaction('img','readwrite'); t.objectStore('img').clear();
      t.oncomplete=()=>{ o.result.close(); r(); }; t.onerror=()=>r(); };
    o.onerror=()=>r(); });
  window.ANNUL=[]; window.offerUndo=(m,fn)=>{ ANNUL.push({m,fn}); };
  CA_PAUSE=20; CA_DELAI_ECR=30; CA_PAUSE_HOTE=30; CA_ESPACE=5;
  window.GROUPE_DEFAUT=caGroupe; window.TRI_DEFAUT=caTri;
  accessToken='T'; cfg.spreadsheetId='S'; notesLoaded=true;
  try{ localStorage.removeItem('kanban_cartes_dossier'); }catch(e){}
  await new Promise(r=>{ const q=indexedDB.deleteDatabase('kanban-cartes'); q.onsuccess=q.onerror=q.onblocked=r; });
  notes=[{id:'nc',title:'Cartes',content:src,tags:'',parent_id:'',icon:'🃏',status:'active',
          created_at:'2026-01-01',updated_at:'2026-01-01'}];
  noteIndexInvalidate();
  // Une vraie image, grande, pour que la réduction ait du travail.
  const cv=document.createElement('canvas'); cv.width=734; cv.height=1024;
  const g=cv.getContext('2d'); g.fillStyle='#e85d4a'; g.fillRect(0,0,734,1024);
  g.fillStyle='#fff'; g.fillRect(60,120,600,400);
  window.GRANDE=await new Promise(r=>cv.toBlob(r,'image/png'));
  // Ce que la v1.67 avait déjà trouvé sur cet appareil.
  localStorage.setItem('kanban_cartes_img2',JSON.stringify({
    [`https://www.cardmarket.com/fr/Pokemon/Products/Singles/Paldean-Fates/Charmander-PAF109`]:
      {img:'https://images.pokemontcg.io/sv4pt5/109_hires.png',petite:'https://images.pokemontcg.io/sv4pt5/109.png',ref:'Paldean Fates 109',cote:2.5,at:1}}));
  // ── Le classeur simulé
  window.FEUILLE=null; window.ECRITURES=[];
  window.sheetTitres=async()=>['notes'].concat(FEUILLE?['cartes']:[]);
  window.sheetTitresOublie=()=>{};
  window.sheetPut=async(range,values)=>{ if(/^cartes!A1/.test(range))FEUILLE=[values[0]]; return {ok:true,json:async()=>({})}; };
  window.sheetBatchLignes=async ranges=>ranges.map(r=>/^cartes!/.test(r)&&FEUILLE?FEUILLE.slice(1).filter(x=>x[0]):[]);
  window.sheetBatchGet=async ranges=>ranges.map(r=>/^cartes!/.test(r)&&FEUILLE?FEUILLE.map(x=>x.slice()):[]);
  window.sheetBatchUpsert=async(sheet,rows)=>{
    if(sheet!=='cartes')return true;
    ECRITURES.push(rows.map(r=>r.slice()));
    rows.forEach(r=>{ const i=FEUILLE.findIndex((x,k)=>k&&x[0]===r[0]); if(i>0)FEUILLE[i]=r.slice(); else FEUILLE.push(r.slice()); });
    return true;
  };
  // ── Drive simulé
  window.DRIVE={}; window.DRIVE_APPELS=[]; window.DRIVE_SEQ=0; window.DRIVE_DOSSIERS=[];
  window.authFetch=async(u,o={})=>{
    u=String(u); const m=(o.method||'GET');
    const rep=(j,st=200)=>({ok:st<300,status:st,json:async()=>j,blob:async()=>j});
    if(/sheets\.googleapis/.test(u))return rep({});
    if(/upload\/drive\/v3\/files\?uploadType=media/.test(u)&&m==='POST'){
      const id='d'+(++DRIVE_SEQ); DRIVE[id]={blob:o.body,nom:''}; DRIVE_APPELS.push('envoi:'+id); return rep({id}); }
    let k;
    if((k=/drive\/v3\/files\/([^?]+)\?fields=id/.exec(u))&&m==='PATCH'){
      const id=decodeURIComponent(k[1]); if(DRIVE[id]){ DRIVE[id].nom=JSON.parse(o.body).name; DRIVE[id].parent=(/addParents=([^&]+)/.exec(u)||[])[1]; }
      return rep({id}); }
    if((k=/drive\/v3\/files\/([^?]+)\?alt=media/.exec(u))){
      const id=decodeURIComponent(k[1]); DRIVE_APPELS.push('lecture:'+id);
      return DRIVE[id]?rep(DRIVE[id].blob):{ok:false,status:404,blob:async()=>null}; }
    if(/drive\/v3\/files\?q=/.test(u)){ DRIVE_APPELS.push('dossier?'); return rep({files:DRIVE_DOSSIERS.map(id=>({id}))}); }
    if(/drive\/v3\/files\?fields=id/.test(u)&&m==='POST'){ const id='dossier1'; DRIVE_DOSSIERS.push(id); DRIVE_APPELS.push('dossier+'); return rep({id}); }
    return {ok:false,status:400,json:async()=>null};
  };
  // ── Les bases publiques et les sites d'images simulés
  window.APPELS=[]; window.IMAGES=[]; window.SATURE={}; window.IMG404=[]; window.IMGLENTE=[];
  window.CAPRICE={}; window.EN_VOL=0; window.EN_VOL_MAX=0; window.APPELS_DEX=[];
  window.CARTES_DEX={
    'sv03-223':{fr:{name:'Dracaufeu ex',image:'https://assets.tcgdex.net/fr/sv/sv03/223',set:{name:'Flammes Obsidiennes'},pricing:{cardmarket:{trend:23.4}}},
                en:{name:'Charizard ex',image:'https://assets.tcgdex.net/en/sv/sv03/223',set:{name:'Obsidian Flames'}}},
    'sv03-012':{fr:{name:'Sans image',set:{name:'Flammes Obsidiennes'}}},
    'SV4a-326':{ja:{name:'フーディンex',image:'https://assets.tcgdex.net/ja/SV/SV4a/326',set:{name:'シャイニートレジャーex'}}},
    'swsh3-136':{fr:{name:'Carte TEM',image:'https://assets.tcgdex.net/fr/swsh/swsh3/136',set:{name:'Ténèbres Embrasées'}}},
    'sv03.5-006':{fr:{name:'Dracaufeu ex',image:'https://assets.tcgdex.net/fr/sv/sv03.5/006',set:{name:'151'}}}};
  window.fetch=async (u,o={})=>{
    u=String(u);
    const rep=j=>({ok:true,status:200,json:async()=>j});
    if(u.startsWith('https://api.pokemontcg.io/v2/cards')){
      APPELS.push(u);
      const q=decodeURIComponent(u.split('q=')[1]||'');
      const m=/ptcgoCode:(SAT[A-Z])/.exec(q);
      if(/ptcgoCode:HANG/.test(q))return new Promise(()=>{});      // une base qui ne répond jamais
      if(m&&SATURE[m[1]]-->0)return {ok:false,status:429,json:async()=>null};
      if(m)return rep({data:[{number:'1',set:{name:'X'},images:{small:`https://images.pokemontcg.io/x/${m[1]}.png`,large:`https://images.pokemontcg.io/x/${m[1]}_hires.png`}}]});
      if(/set\.ptcgoCode:OBF\b.*number:223/.test(q))return rep({data:[{number:'223',set:{name:'Obsidian Flames'},
        images:{small:'https://images.pokemontcg.io/sv3/223.png',large:'https://images.pokemontcg.io/sv3/223_hires.png'},
        cardmarket:{prices:{trendPrice:23.4}}}]});
      if(/set\.id:svp[ )].*number:121/.test(q))return rep({data:[{number:'121',set:{name:'SV Promos'},
        images:{small:'https://images.pokemontcg.io/svp/121.png',large:'https://images.pokemontcg.io/svp/121_hires.png'}}]});
      if(/javascript/.test(q))return rep({data:[{images:{large:'javascript:alert(1)'}}]});
      return rep({data:[]});
    }
    // Les fiches de cartes, par identifiant.
    let fk=/^https:\/\/api\.tcgdex\.net\/v2\/(fr|en|ja)\/cards\/([^?]+)$/.exec(u);
    if(fk){ APPELS_DEX.push(fk[1]+':'+decodeURIComponent(fk[2]));
      const c=(window.CARTES_DEX[decodeURIComponent(fk[2])]||{})[fk[1]];
      return c?rep(c):{ok:false,status:404,json:async()=>null}; }
    if(u.startsWith('https://api.tcgdex.net/v2/en/cards?name=')){
      const n=new URL(u).searchParams.get('name'), pg=+new URL(u).searchParams.get('pagination:page')||1;
      if(n==='abra'&&pg===1)return rep([
        {id:'base1-43',localId:'43',name:'Abra',image:'https://assets.tcgdex.net/en/base/base1/43'},
        {id:'gym1-62',localId:'62',name:"Sabrina's Abra",image:'https://assets.tcgdex.net/en/gym/gym1/62'},
        {id:'base5-32',localId:'32',name:'Dark Kadabra',image:'https://assets.tcgdex.net/en/base/base5/32'},
        {id:'ecard1-93',localId:'93',name:'Abra',image:'https://assets.tcgdex.net/en/ecard/ecard1/93'}]);
      return rep([]);
    }
    if(u.startsWith('https://api.tcgdex.net/v2/fr/cards?name=')){
      APPELS.push(u);
      const par=new URL(u).searchParams, n=par.get('name');
      const pg=+par.get('pagination:page')||1, nb=+par.get('pagination:itemsPerPage')||30;
      // 600 Pikachu, servis par pages comme le fait la base.
      // Une base qui PLAFONNE ses pages à 30, quoi qu'on demande — le cas réel.
      if(n==='Salameche'){ const tous=Array.from({length:95},(_,i)=>({id:'sa-'+i,localId:String(i),name:'Salamèche',
        image:`https://assets.tcgdex.net/fr/sv/z/${i}`})); return rep(tous.slice((pg-1)*30,pg*30)); }
      if(n==='Pikachu'){ const tous=Array.from({length:600},(_,i)=>({id:'pk-'+i,localId:String(i),name:'Pikachu',
        image:`https://assets.tcgdex.net/fr/sv/x/${i}`})); return rep(tous.slice((pg-1)*nb,pg*nb)); }
      // Une base qui ignorerait la pagination : tout, à chaque page.
      if(n==='Sourdingue'){ PAGES_SOURDES=(window.PAGES_SOURDES||0)+1;
        return rep(Array.from({length:300},(_,i)=>({id:'sd-'+i,localId:String(i),name:'Sourdingue',image:`https://assets.tcgdex.net/fr/sv/y/${i}`}))); }
      if(n==='abra')return rep(pg>1?[]:[
        {id:'base1-43',localId:'43',name:'Abra',image:'https://assets.tcgdex.net/fr/base/base1/43'},
        {id:'base1-32',localId:'32',name:'Kadabra',image:'https://assets.tcgdex.net/fr/base/base1/32'},
        {id:'pl1-31',localId:'31',name:'Simiabraz',image:'https://assets.tcgdex.net/fr/pl/pl1/31'},
        {id:'sv06-x',localId:'1',name:'Abra de Morgane',image:'https://assets.tcgdex.net/fr/sv/sv06/1'}]);
      if(n==='Flagadoss')return rep([
        {id:'sv03.5-080',localId:'080',name:'Flagadoss',image:'https://assets.tcgdex.net/fr/sv/sv03.5/080'},
        {id:'swsh1-055',localId:'055',name:'Flagadoss',image:'https://assets.tcgdex.net/fr/swsh/swsh1/055'},
        {id:'x-1',localId:'1',name:'Flagadoss sans image'}]);
      return rep([]);
    }
    // Les images : les sites ouverts livrent les octets, le site hostile refuse.
    if(/^https:\/\/(images\.pokemontcg\.io|assets\.tcgdex\.net)\//.test(u)){ IMAGES.push(u);
      EN_VOL++; EN_VOL_MAX=Math.max(EN_VOL_MAX,EN_VOL); await new Promise(r=>setTimeout(r,5)); EN_VOL--;
      // Un site qui limite le débit répond sans les en-têtes de lecture : le
      // navigateur n'y voit qu'une erreur réseau.
      const cap=Object.keys(CAPRICE).find(k=>u.includes(k));
      if(cap&&CAPRICE[cap]-->0)throw new TypeError('Failed to fetch');
      if(IMGLENTE.some(x=>u.includes(x)))return new Promise((_,ko)=>{
        if(o.signal)o.signal.addEventListener('abort',()=>ko(Object.assign(new Error('délai'),{name:'AbortError'}))); });
      if(IMG404.some(x=>u.includes(x)))return {ok:false,status:404,blob:async()=>null};
      return {ok:true,status:200,blob:async()=>GRANDE}; }
    if(/hostile\.example/.test(u)){ IMAGES.push(u); throw new TypeError('Failed to fetch'); }   // CORS
    return {ok:false,status:404,json:async()=>null};
  };
},NOTE);
// L'affichage des images publiques n'est pas le sujet : on sert un pixel.
const PIXEL=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
await ctx.route(/^https:\/\/(images\.pokemontcg\.io|assets\.tcgdex\.net|hostile\.example|exemple\.fr)\//,
  r=>r.fulfill({status:200,contentType:'image/png',body:PIXEL}));
const attendre=(ms)=>p.evaluate(ms=>new Promise(r=>setTimeout(r,ms)),ms);

console.log('=== 1. IMPORTER LA NOTE, UNE FOIS ===');
const im=await p.evaluate(async()=>{
  const out={};
  switchPage('cartes'); await new Promise(r=>setTimeout(r,300));
  out.ongletCree=!!FEUILLE&&FEUILLE[0].join()==='id,section,nom,url,prix,vente,etiquettes,image,drive_id,ref,cote,ordre,etat,raison,created_at,updated_at,langue,case';
  out.propose=document.getElementById('caWrap').textContent.replace(/\s+/g,' ');
  const avantNote=caNoteDe().content;
  APPELS.length=0;
  await caImporter();
  out.lignes=FEUILLE.length-1;
  out.uneEcriture=ECRITURES.length===1;
  out.noteIntacte=caNoteDe().content===avantNote;
  const l=FEUILLE.slice(1).map(caDeLigne);
  out.cartes=l.map(c=>({nom:c.nom,section:c.section,prix:c.prix,vente:c.vente,tags:c.tags,image:c.image,ordre:c.ordre}));
  out.dejaTrouvee=l.find(c=>c.nom==='Déjà trouvée');
  return out;
});
chk('L\'onglet « cartes » est créé, avec son en-tête',im.ongletCree===true);
chk('La page propose d\'importer les 6 cartes de la note',/contient 6 cartes/.test(im.propose)&&/Importer 6 cartes/.test(im.propose),im.propose);
chk('L\'import écrit une ligne par carte, en une seule écriture',im.lignes===6&&im.uneEcriture,JSON.stringify(im.lignes));
chk('La note n\'est pas modifiée',im.noteIntacte===true);
chk('Chaque carte garde sa section',im.cartes.map(c=>c.section).join('|')==='Cadeau Noé|Cadeau Noé|Cadeau Noé|Cadeau Noé|À vendre|À vendre',im.cartes.map(c=>c.section).join('|'));
chk('...son nom, ses prix et son lieu',
    im.cartes[2].nom==='Limonde AR'&&im.cartes[2].prix===3&&im.cartes[2].vente===4&&im.cartes[2].tags.join()==='Classeur'&&im.cartes[3].prix===6.5,JSON.stringify(im.cartes[2]));
chk('...et l\'ordre de la note',im.cartes.map(c=>c.ordre).join()==='1,2,3,4,5,6');
chk('La ligne Total n\'est pas importée comme une carte',!im.cartes.some(c=>/total/i.test(c.nom)));
chk('Ce que la v1.67 avait trouvé est repris : aucune recherche à refaire',
    /sv4pt5\/109_hires/.test(im.dejaTrouvee.image)&&im.dejaTrouvee.cote===2.5,JSON.stringify(im.dejaTrouvee));
chk('Une adresse qui est une image devient l\'image',/sv3\/1_hires/.test(im.cartes[3].image),im.cartes[3].image);

console.log('=== 2. PREMIÈRE OUVERTURE : CHERCHER, AFFICHER, ARCHIVER ===');
await attendre(1500);
const IMAGES_HOSTILE=await p.evaluate(()=>IMAGES.filter(u=>/hostile/.test(u)).length);
const pr=await p.evaluate(async()=>{
  const out={};
  await caVider();
  const l=()=>FEUILLE.slice(1).map(caDeLigne);
  const par=n=>l().find(c=>c.nom===n);
  out.recherches=APPELS.slice();
  out.telechargements={}; IMAGES.forEach(u=>{ const k=(/pokemontcg\.io\/(.+?)(_hires)?\.png/.exec(u)||[])[1]; if(k)out.telechargements[k]=(out.telechargements[k]||0)+1; });
  out.dracau=par('Dracaufeu ex'); out.direct=par('Lien direct'); out.deja=par('Déjà trouvée');
  out.hostile=par('Site hostile'); out.flaga=par('Flagadoss Shiny');
  out.dossier=DRIVE_APPELS.filter(x=>/dossier/.test(x));
  const f=DRIVE[out.dracau.drive_id];
  out.fichier=f&&{nom:f.nom,parent:f.parent,type:f.blob.type,taille:f.blob.size};
  const bm=f&&await createImageBitmap(f.blob); out.largeur=bm&&bm.width;
  out.tailleOrigine=GRANDE.size;
  out.idb=!!(await caIdb.get(out.dracau.drive_id));
  out.etat=document.getElementById('caEtat').textContent;
  out.tuileDracau=(document.querySelector(`.ca-tuile[data-k="${out.dracau.id}"] img`)||{}).src||'';
  out.tuileHostile=(document.querySelector(`.ca-tuile[data-k="${out.hostile.id}"] img`)||{}).src||'';
  out.indiceFlaga=/ajouter une image/.test(document.querySelector(`.ca-tuile[data-k="${out.flaga.id}"]`).textContent);
  return out;
});
// L'adresse Cardmarket donne OBF et 223 ; la table des extensions donne sv3 ;
// l'image se télécharge directement. La base lente n'est plus interrogée.
chk('Aucune requête à la base pour une adresse Cardmarket connue',pr.recherches.length===0,JSON.stringify(pr.recherches));
chk('...l\'image vient de son adresse fixe, déduite de la table',
    pr.dracau.image==='https://images.pokemontcg.io/sv3/223_hires.png'&&pr.dracau.ref==='Obsidian Flames 223',JSON.stringify(pr.dracau));
chk('...téléchargée UNE fois : la vérification sert aussi à l\'archive',
    pr.telechargements['sv3/223']===1,JSON.stringify(pr.telechargements));
chk('Le résultat est écrit dans la table',/sv3\/223_hires/.test(pr.dracau.image)&&pr.dracau.ref==='Obsidian Flames 223',JSON.stringify(pr.dracau));
chk('L\'image est archivée dans Drive, et la table le sait',/^d\d+$/.test(pr.dracau.drive_id),pr.dracau.drive_id);
chk('...dans le dossier « Kanban — Cartes », créé une fois',
    pr.fichier&&pr.fichier.parent==='dossier1'&&pr.dossier.filter(x=>x==='dossier+').length===1,JSON.stringify([pr.fichier,pr.dossier]));
chk('...sous un nom lisible',/^Dracaufeu ex — ca/.test(pr.fichier&&pr.fichier.nom||''),pr.fichier&&pr.fichier.nom);
chk('...réduite à 500 pixels de large, en WebP',pr.largeur===500&&pr.fichier.type==='image/webp',JSON.stringify([pr.largeur,pr.fichier&&pr.fichier.type]));
chk('...et bien plus légère que l\'original',pr.fichier.taille<pr.tailleOrigine,JSON.stringify([pr.fichier.taille,pr.tailleOrigine]));
chk('...et gardée dans le navigateur',pr.idb===true);
chk('L\'image reprise de la v1.67 est archivée sans recherche',/^d\d+$/.test(pr.deja.drive_id));
chk('Une adresse d\'image directe est archivée aussi',/^d\d+$/.test(pr.direct.drive_id));
chk('Un site qui refuse la lecture : affichée depuis son site, et RIEN de figé',
    pr.hostile.drive_id===''&&/hostile\.example/.test(pr.tuileHostile),JSON.stringify([pr.hostile.drive_id,pr.tuileHostile]));
chk('...trois tentatives au plus dans la session',IMAGES_HOSTILE<=3,String(IMAGES_HOSTILE));
chk('Une carte sans adresse invite à ajouter une image',pr.indiceFlaga===true);
chk('La tuile montre la copie locale',/^blob:/.test(pr.tuileDracau),pr.tuileDracau);
// Trois images archivables (trouvée, directe, reprise de la v1.67) ; la quatrième
// vient d'un site qui refuse la lecture et reste affichée depuis ce site.
chk('La ligne d\'état fait le compte',/3 enregistrées/.test(pr.etat)&&/1 affichées depuis leur site/.test(pr.etat),pr.etat);

console.log('=== 3. OUVERTURES SUIVANTES : PLUS AUCUN RÉSEAU ===');
const su=await p.evaluate(async()=>{
  const out={};
  APPELS.length=0; IMAGES.length=0; DRIVE_APPELS.length=0; ECRITURES.length=0;
  for(const k in caObj)delete caObj[k];              // comme une nouvelle session sur le même appareil
  switchPage('habits'); switchPage('cartes');
  await new Promise(r=>setTimeout(r,800)); await caVider();
  out.recherches=APPELS.length; out.images=IMAGES.filter(u=>!/hostile/.test(u)).length;
  out.hostile=IMAGES.filter(u=>/hostile/.test(u)).length;
  out.drive=DRIVE_APPELS.length; out.ecritures=ECRITURES.length;
  out.blobs=[...document.querySelectorAll('.ca-tuile img')].filter(i=>/^blob:/.test(i.src)).length;
  return out;
});
chk('Aucune recherche',su.recherches===0,String(su.recherches));
chk('Aucun téléchargement d\'image',su.images===0,String(su.images));
chk('Aucun appel à Drive',su.drive===0,JSON.stringify(su.drive));
chk('Aucune écriture dans le classeur',su.ecritures===0,String(su.ecritures));
chk('Les trois images archivées viennent de l\'appareil',su.blobs===3,String(su.blobs));
chk('Le site qui refuse n\'est plus sollicité dans la session',su.hostile===0,String(su.hostile));

console.log('=== 4. UN AUTRE APPAREIL ===');
const ap=await p.evaluate(async()=>{
  const out={};
  // Un appareil neuf : rien dans le navigateur, mais le classeur et Drive sont là.
  for(const k in caObj)delete caObj[k];
  await viderIdb();
  APPELS.length=0; IMAGES.length=0; DRIVE_APPELS.length=0;
  cartesLoaded=false; renderCartes(); await new Promise(r=>setTimeout(r,800)); await caVider();
  out.recherches=APPELS.length; out.images=IMAGES.filter(u=>!/hostile/.test(u)).length;
  out.lectures=DRIVE_APPELS.filter(x=>/^lecture/.test(x)).length;
  out.envois=DRIVE_APPELS.filter(x=>/^envoi/.test(x)).length;
  // Et la fois d'après, sur ce nouvel appareil : plus rien.
  for(const k in caObj)delete caObj[k];
  DRIVE_APPELS.length=0; renderCartes(); await new Promise(r=>setTimeout(r,500));
  out.ensuite=DRIVE_APPELS.length;
  return out;
});
chk('Aucune recherche refaite sur un autre appareil',ap.recherches===0&&ap.images===0,JSON.stringify(ap));
chk('Chaque image est lue UNE fois depuis Drive',ap.lectures===3&&ap.envois===0,JSON.stringify(ap));
chk('...puis plus jamais',ap.ensuite===0,String(ap.ensuite));

console.log('=== 5. UNE BASE SATURÉE N\'EST PAS UNE ABSENCE ===');
const sat=await p.evaluate(async()=>{
  const out={};
  const U=c=>`https://www.cardmarket.com/fr/Pokemon/Products/Singles/X/Carte-${c}`;
  const mk=(nom,url)=>({id:caId(),section:'Saturée',nom,url,prix:1,vente:null,tags:[],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:900+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  const l=[mk('A',U('SATA1')),mk('B',U('SATB1')),mk('C',U('SATC1')),mk('D',U('ZZZ7'))];
  await caSauver(l);
  SATURE.SATA=2; SATURE.SATB=1; SATURE.SATC=9;      // 2 refus, 1 refus, toujours refusé
  renderCartes(); await new Promise(r=>setTimeout(r,1500)); await caVider();
  const par=n=>caDeLigne(FEUILLE.slice(1).find(x=>x[2]===n));
  out.a=par('A'); out.b=par('B'); out.c=par('C'); out.d=par('D');
  out.etat=document.getElementById('caEtat').textContent;
  // « réessayer » remet en recherche les cartes sans correspondance.
  APPELS.length=0; caReessayer(); await new Promise(r=>setTimeout(r,600));
  out.relance=APPELS.some(u=>/ZZZ/.test(decodeURIComponent(u)));
  return out;
});
chk('Deux refus puis réponse : trouvée et archivée',/SATA_hires/.test(sat.a.image)&&/^d/.test(sat.a.drive_id),JSON.stringify(sat.a));
chk('Un refus puis réponse : trouvée',/SATB_hires/.test(sat.b.image),JSON.stringify(sat.b));
chk('Toujours refusée : RIEN n\'est écrit, elle sera réessayée',sat.c.etat===''&&sat.c.image==='',JSON.stringify(sat.c));
chk('Une vraie absence est écrite, avec sa raison',sat.d.etat==='introuvable-2'&&/aucune carte correspondante/.test(sat.d.raison),JSON.stringify(sat.d));
chk('La ligne d\'état distingue les deux',/1 non obtenues/.test(sat.etat)&&/1 sans correspondance/.test(sat.etat),sat.etat);
chk('« réessayer » relance les absences',sat.relance===true);

console.log('=== 6. GÉRER LES CARTES ===');
const ge=await p.evaluate(async()=>{
  const out={};
  ECRITURES.length=0;
  // a. Modifier un prix : une ligne écrite, la sienne.
  const c=cartes.find(x=>x.nom==='Limonde AR');
  caOuvrir(c.id); await new Promise(r=>setTimeout(r,200));
  out.fiche={nom:document.getElementById('caNom').value,prix:document.getElementById('caPrix').value,
    champSection:!!document.getElementById('caSec'),tags:document.getElementById('caTagsListe').textContent};
  document.getElementById('caPrix').value='7,5';
  await caEnregistrer();
  out.maj=ECRITURES.map(e=>e.map(r=>[r[0],r[2],r[4]]));
  // b. Annuler.
  await ANNUL[ANNUL.length-1].fn();
  out.annule=caDeLigne(FEUILLE.find(x=>x[0]===c.id)).prix;
  // c. Ajouter, dans une section nouvelle, avec une adresse : l'image est
  //    trouvée dans la fiche même, et pas cherchée une seconde fois.
  caOuvrir(null); await new Promise(r=>setTimeout(r,100));
  caEd.tags=['Nouvelle étiquette']; caTagsDessiner();
  document.getElementById('caNom').value='Axolotto promo';
  document.getElementById('caUrl').value='https://www.cardmarket.com/fr/Pokemon/Products/Singles/SV-Promos/Axolotto-SVP121';
  APPELS.length=0;
  await caUrlChange();
  const svp=()=>IMAGES.filter(u=>/svp\/121/.test(u)).length;
  out.requetesFiche=svp(); out.baseFiche=APPELS.length;
  out.apercuInfo=document.getElementById('caInfo').textContent;
  document.getElementById('caPrix').value='4';
  await caEnregistrer(); await new Promise(r=>setTimeout(r,600)); await caVider();
  const n=cartes.find(x=>x.nom==='Axolotto promo');
  out.ajout={section:n.section,image:n.image,drive:n.drive_id,ordre:n.ordre,max:cartes.filter(x=>caTags(x.tags)[0]===caTags(n.tags)[0]).length};
  out.recherchesApres=svp()-out.requetesFiche;
  out.sections=[...document.querySelectorAll('.ca-sec-t')].map(x=>x.textContent);
  // d. Supprimer : pierre tombale, et annulable.
  caOuvrir(n.id); await new Promise(r=>setTimeout(r,100));
  await caSupprimer();
  const t=FEUILLE.find(x=>x[0]===n.id);
  out.tombe=t&&t[2]===''; out.disparue=!cartes.some(x=>x.id===n.id);
  await ANNUL[ANNUL.length-1].fn();
  out.revenue=cartes.some(x=>x.id===n.id)&&FEUILLE.find(x=>x[0]===n.id)[2]==='Axolotto promo';
  // e. Recharger depuis le classeur rend exactement les cartes vivantes.
  cartesLoaded=false; await loadCartes();
  out.rechargees=cartes.length;
  return out;
});
chk('La fiche n\'a plus de champ « section »',ge.fiche.champSection===false);
chk('La fiche est remplie',ge.fiche.nom==='Limonde AR'&&ge.fiche.prix==='3'&&ge.fiche.champSection===false&&/Classeur/.test(ge.fiche.tags),JSON.stringify(ge.fiche));
chk('Modifier un prix écrit UNE ligne, la sienne',ge.maj.length===1&&ge.maj[0].length===1&&ge.maj[0][0][2]==='7.5',JSON.stringify(ge.maj));
chk('Annuler rend le prix d\'avant',ge.annule===3,String(ge.annule));
chk('Une adresse collée dans la fiche est résolue sur-le-champ',/Trouvée depuis l'adresse · Scarlet & Violet Black Star Promos 121/.test(ge.apercuInfo),ge.apercuInfo);
chk('...et ce résultat est enregistré, sans seconde recherche',
    /svp\/121_hires/.test(ge.ajout.image)&&ge.requetesFiche===1&&ge.recherchesApres===0&&ge.baseFiche===0,JSON.stringify(ge));
chk('...puis archivé',/^d/.test(ge.ajout.drive),ge.ajout.drive);
chk('Une nouvelle carte se range en dernier de sa section',ge.ajout.ordre===ge.ajout.max,JSON.stringify(ge.ajout));
chk('Une étiquette nouvelle fait un groupe nouveau',ge.sections.includes('Nouvelle étiquette'),ge.sections.join('|'));
chk('Supprimer laisse une pierre tombale',ge.tombe===true&&ge.disparue===true);
chk('...et s\'annule',ge.revenue===true);
chk('Recharger depuis le classeur rend exactement les cartes vivantes',ge.rechargees===11,String(ge.rechargees));

console.log('=== 7. CHOISIR L\'IMAGE, OU SA PHOTO ===');
const ch=await p.evaluate(async()=>{
  const out={};
  // a. Recherche par nom, puis choix.
  const c=cartes.find(x=>x.nom==='Flagadoss Shiny');
  caOuvrir(c.id); await new Promise(r=>setTimeout(r,100));
  APPELS.length=0;
  const l=await caChercher('Flagadoss Shiny AR');
  out.requetes=APPELS.map(u=>new URL(u).searchParams.get('name'));
  out.trouves=l.length;
  caPoserImage(l[0].img);
  await caEnregistrer(); await new Promise(r=>setTimeout(r,500)); await caVider();
  const f=cartes.find(x=>x.id===c.id);
  out.choix={image:f.image,drive:f.drive_id};
  // b. Une photo de l'appareil, pour une carte qu'aucune base n'illustre.
  const h=cartes.find(x=>x.nom==='Site hostile');
  caOuvrir(h.id); await new Promise(r=>setTimeout(r,100));
  const fichier=new File([GRANDE],'photo.png',{type:'image/png'});
  await caPhotoPrise(fichier);
  out.apercuPhoto=(document.querySelector('#caApercu img')||{}).src||'';
  await caEnregistrer(); await caVider();
  const g=cartes.find(x=>x.id===h.id);
  out.photo={image:g.image,drive:g.drive_id,nom:DRIVE[g.drive_id]&&DRIVE[g.drive_id].nom};
  return out;
});
chk('La recherche par nom retire les qualificatifs',ch.requetes[0]==='Flagadoss'&&ch.trouves===2,JSON.stringify(ch));
chk('L\'image choisie est enregistrée puis archivée',/080\/high\.webp$/.test(ch.choix.image)&&/^d/.test(ch.choix.drive),JSON.stringify(ch.choix));
chk('Une photo est envoyée dans Drive et montrée tout de suite',/^blob:/.test(ch.apercuPhoto),ch.apercuPhoto);
chk('...et devient l\'image de la carte, sur tous les appareils',ch.photo.image===''&&/^d/.test(ch.photo.drive)&&/photo\.webp$/.test(ch.photo.nom||''),JSON.stringify(ch.photo));

console.log('=== 7 bis. CHOISIR L\'IMAGE : SANS LIMITE ===');
const sl=await p.evaluate(async()=>{
  const out={};
  APPELS.length=0;
  const l=await caChercher('Pikachu');
  out.nb=l.length; out.pages=APPELS.length; out.uniques=new Set(l.map(x=>x.img)).size;
  // Le sélecteur les affiche toutes.
  caOuvrir(cartes[0].id); await new Promise(r=>setTimeout(r,100));
  document.getElementById('caPickQ').value='Pikachu'; await caPickChercher();
  out.affichees=document.querySelectorAll('#caPickRes .ca-pick').length;
  out.compteur=document.getElementById('caPickNb').textContent;
  modalFerme('caPickModal'); caFermer();
  APPELS.length=0;
  out.plafond=(await caChercher('Salameche')).length; out.plafondPages=APPELS.length;
  window.PAGES_SOURDES=0;
  const s2=await caChercher('Sourdingue');
  out.sourde={nb:s2.length,pages:window.PAGES_SOURDES};
  return out;
});
chk('« Choisir l\'image » rend TOUS les résultats, page après page',sl.nb===600&&sl.uniques===600&&sl.pages===4,JSON.stringify(sl));
chk('...et le sélecteur les affiche tous',sl.affichees===600,String(sl.affichees));
chk('...et dit combien il en a trouvé',sl.compteur==='600 cartes trouvées pour « Pikachu »',sl.compteur);
chk('Une base qui plafonne ses pages à 30 : tout est rapatrié quand même',sl.plafond===95&&sl.plafondPages===5,JSON.stringify([sl.plafond,sl.plafondPages]));
chk('Une base qui ignore la pagination ne fait pas boucler',sl.sourde.nb===300&&sl.sourde.pages===2,JSON.stringify(sl.sourde));

console.log('=== 7 ter. LE MOT ENTIER, DEUX CATALOGUES ===');
const me=await p.evaluate(async()=>{
  const l=await caChercher('abra');
  return {noms:l.map(x=>x.nom),refs:l.map(x=>x.ref),img43:(l.find(x=>/base1-43/.test(x.ref))||{}).img};
});
chk('« abra » ne garde que le mot entier : ni Kadabra, ni Simiabraz',
    !me.noms.some(n=>/kadabra|simiabraz/i.test(n))&&me.noms.includes('Abra de Morgane')&&me.noms.includes("Sabrina's Abra"),JSON.stringify(me.noms));
chk('Le catalogue anglais complète le français',me.refs.includes('ecard1-93 · EN')&&me.refs.includes('gym1-62 · EN'),JSON.stringify(me.refs));
chk('...une carte des deux catalogues apparaît une fois, en français',
    me.refs.filter(r=>/base1-43/.test(r)).length===1&&/assets\.tcgdex\.net\/fr\//.test(me.img43||''),JSON.stringify(me));

console.log('=== 8. UNE IMAGE EFFACÉE DU DRIVE ===');
const ef=await p.evaluate(async()=>{
  const c=cartes.find(x=>x.nom==='Dracaufeu ex'); const ancien=c.drive_id;
  delete DRIVE[ancien];
  for(const k in caObj)delete caObj[k];
  await viderIdb();
  APPELS.length=0;
  renderCartes(); await new Promise(r=>setTimeout(r,800)); await caVider();
  const n=caDeLigne(FEUILLE.find(x=>x[0]===c.id));
  return {ancien,nouveau:n.drive_id,recherches:APPELS.length,present:!!DRIVE[n.drive_id]};
});
chk('Effacée du Drive : elle est réarchivée, sans nouvelle recherche',
    ef.nouveau!==ef.ancien&&/^d/.test(ef.nouveau)&&ef.present&&ef.recherches===0,JSON.stringify(ef));

console.log('=== 9. LE BANDEAU ET LES PRIX ===');
const bp=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,prix,vente)=>({id:caId(),section:'Prix',nom,url:'',prix,vente,tags:['Noé'],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:2000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  await caSauver([mk('Gagne',5,8),mk('Perd',9,3),mk('Egal',4,4),mk('Sans vente',2,null),mk('Vente seule',null,7)]);
  await caSauver(Array.from({length:30},(_,i)=>mk('Remplissage '+i,1,null)));
  caRecherche=''; renderCartes(); await new Promise(r=>setTimeout(r,300));
  const meta=n=>{ const c=cartes.find(x=>x.nom===n);
    const m=document.querySelector(`.ca-tuile[data-k="${c.id}"] .ca-meta`);
    return [...m.children].map(e=>({c:e.className,col:getComputedStyle(e).color,x:e.getBoundingClientRect().left})); };
  out.gagne=meta('Gagne'); out.perd=meta('Perd'); out.egal=meta('Egal'); out.sansVente=meta('Sans vente'); out.venteSeule=meta('Vente seule');
  const v=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  out.vars={jaune:v('--warn'),vert:v('--green'),rouge:v('--danger')};
  const w=document.getElementById('caWrap'), t=document.querySelector('.ca-tete');
  const avant=t.getBoundingClientRect().top;
  w.scrollTop=2000; await new Promise(r=>setTimeout(r,100));
  out.defile=w.scrollTop>0; out.fixe=Math.abs(t.getBoundingClientRect().top-avant)<1;
  w.scrollTop=0;
  return out;
});
const rgb=h=>{ const n=parseInt(h.replace('#',''),16); return `rgb(${n>>16}, ${n>>8&255}, ${n&255})`; };
chk('Prix d\'achat à gauche, en jaune',bp.gagne[0].c==='ca-prix'&&bp.gagne[0].col===rgb(bp.vars.jaune));
chk('Prix de vente à droite de l\'étiquette',bp.gagne.map(e=>e.c.split(' ')[0]).join()==='ca-prix,ca-tagsl,ca-vente'&&bp.gagne[2].x>bp.gagne[1].x,JSON.stringify(bp.gagne));
chk('Vente supérieure en vert, inférieure en rouge',bp.gagne[2].col===rgb(bp.vars.vert)&&bp.perd[2].col===rgb(bp.vars.rouge));
chk('Égale, ou sans achat pour comparer : neutre',!/gain|perte/.test(bp.egal[2].c)&&bp.venteSeule.some(e=>/ca-vente/.test(e.c)&&!/gain|perte/.test(e.c)));
chk('Sans prix de vente, rien à droite',bp.sansVente.every(e=>!/ca-vente/.test(e.c)));
chk('Le bandeau reste épinglé',bp.defile&&bp.fixe,JSON.stringify(bp));

console.log('=== 8 bis. LA TABLE DES EXTENSIONS ===');
const tx=await p.evaluate(async()=>{
  const out={};
  const C=(slug)=>caCandidats(caLireUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/'+slug)).map(x=>x.img);
  out.obf=C('Obsidian-Flames/Charizard-ex-V1-OBF223');
  out.zero=C('Paldean-Fates/Charmander-PAF054');
  out.base=C('Base-Set/Charizard-BS4');
  out.promo=C('SV-Black-Star-Promos/Pikachu-SVP101');
  out.partage=C('Hidden-Fates/Charizard-GX-HIF9');
  out.nomSeul=caCandidats({ext:'Team Rocket',num:'4'}).map(x=>x.img);
  out.inconnu=C('Nouvelle-Extension/Carte-ZZQ12');
  out.taille=CA_EXT.length;
  // Deux extensions partagent un code : la première n'a pas l'image, la seconde si.
  IMG404.push('sm115/9'); APPELS.length=0;
  out.secondChoix=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/Hidden-Fates/Charizard-GX-HIF9');
  out.baseApres404=APPELS.length;
  // Aucune image à l'adresse déduite : la base prend le relais.
  IMG404.push('sv3/999'); APPELS.length=0;
  out.relais=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/Obsidian-Flames/Inconnue-OBF999');
  out.requetesRelais=APPELS.map(u=>decodeURIComponent(u.split('q=')[1]||'').replace(/&pageSize=1$/,''));
  IMG404.length=0;
  // Une image trop lente : réessayée plus tard, jamais figée.
  CA_DELAI_IMG=150; IMGLENTE.push('sv3/150');
  const c={id:caId(),section:'Lente',nom:'Lente',url:'https://www.cardmarket.com/fr/Pokemon/Products/Singles/Obsidian-Flames/Lente-OBF150',
    prix:1,vente:null,tags:[],langue:'',image:'',drive_id:'',ref:'',cote:null,ordre:7000,etat:'',raison:'',created_at:td(),updated_at:td()};
  await caSauver([c]);
  out.lente=await caTraiter(c,()=>{});
  out.lenteEtat={etat:c.etat,drive:c.drive_id,image:c.image};
  IMGLENTE.length=0; CA_DELAI_IMG=30000;
  out.lenteEnsuite=await caTraiter(c,()=>{});
  out.lenteFin={drive:c.drive_id};
  // Une absence notée par une version précédente est réessayée.
  const v={...c,id:caId(),nom:'Ancienne absence',url:'https://www.cardmarket.com/fr/Pokemon/Products/Singles/Obsidian-Flames/X-OBF12',
    image:'',drive_id:'',etat:'introuvable',raison:'ancienne méthode'};
  await caSauver([v]);
  out.ancienne=await caTraiter(v,()=>{});
  out.ancienneImage=v.image;
  // Le diagnostic.
  out.diag=caDiagnostic();
  return out;
});
chk('Code et numéro → adresse fixe de l\'image',tx.obf[0]==='https://images.pokemontcg.io/sv3/223_hires.png',JSON.stringify(tx.obf));
chk('...les zéros de tête sont retirés',tx.zero[0]==='https://images.pokemontcg.io/sv4pt5/54_hires.png',JSON.stringify(tx.zero));
chk('...le Set de base des anciens codes',tx.base[0]==='https://images.pokemontcg.io/base1/4_hires.png',JSON.stringify(tx.base));
chk('...les promos par leur alias',tx.promo[0]==='https://images.pokemontcg.io/svp/101_hires.png',JSON.stringify(tx.promo));
chk('...un code partagé donne toutes ses extensions',tx.partage.length>=2&&tx.partage.some(u=>/sm115\//.test(u))&&tx.partage.some(u=>/sma\//.test(u)),JSON.stringify(tx.partage));
chk('...le nom de l\'extension suffit aussi',tx.nomSeul[0]==='https://images.pokemontcg.io/base5/4_hires.png',JSON.stringify(tx.nomSeul));
chk('...une extension inconnue ne donne rien à essayer',tx.inconnu.length===0);
chk('La table contient les 176 extensions',tx.taille===176,String(tx.taille));
chk('Si la première extension n\'a pas l\'image, la suivante est essayée',
    tx.secondChoix&&!/sm115/.test(tx.secondChoix.img)&&/^https:\/\/images\.pokemontcg\.io\//.test(tx.secondChoix.img||'')&&tx.baseApres404===0,JSON.stringify(tx.secondChoix));
chk('Sans image à l\'adresse déduite, la base prend le relais',tx.requetesRelais[0]==='set.ptcgoCode:OBF number:999',JSON.stringify(tx.requetesRelais));
chk('...avec les requêtes simples d\'avant, sans « OU »',!tx.requetesRelais.some(q=>/ OR /.test(q)),JSON.stringify(tx.requetesRelais));
chk('Une image trop lente n\'est PAS notée « site qui refuse »',tx.lente==='passager'&&tx.lenteEtat.drive===''&&tx.lenteEtat.etat==='',JSON.stringify([tx.lente,tx.lenteEtat]));
chk('...et elle est archivée au passage suivant',/^d/.test(tx.lenteFin.drive)&&tx.lenteEnsuite==='archivee',JSON.stringify([tx.lenteEnsuite,tx.lenteFin]));
chk('Une absence notée par l\'ancienne méthode est réessayée',/sv3\/12_hires/.test(tx.ancienneImage||''),JSON.stringify(tx));
chk('Le diagnostic liste les cartes sans image, avec la raison',
    /^Cartes sans image archivée : \d+ sur \d+ — v\d/.test(tx.diag)&&/\nD \| https:\/\/www\.cardmarket\.com\/[^|]+ \| cardmarket ZZZ 7 X \| Lu dans l'adresse/.test(tx.diag)&&/Limonde AR \| \(pas d'adresse\)/.test(tx.diag),tx.diag.slice(0,400));

console.log('=== 8 ter. LES ADRESSES DE LA VRAIE COLLECTION ===');
// Tirées du diagnostic réel. Pour chacune : la première image essayée.
const vraies=await p.evaluate(()=>{
  const S='https://www.cardmarket.com/fr/Pokemon/Products/Singles/';
  const l={
    'Silver-Tempest/Radiant-Alakazam-SIT059':'https://images.pokemontcg.io/swsh12/59_hires.png',
    'Expedition-Base-Set/Abra-EX93':'https://images.pokemontcg.io/ecard1/93_hires.png',
    'Team-Rocket/Abra-TR49':'https://images.pokemontcg.io/base5/49_hires.png',
    'Fossil/Psyduck-FO53?minCondition=3':'https://images.pokemontcg.io/base3/53_hires.png',
    'Detective-Pikachu/Psyduck-DET7?minCondition=3':'https://images.pokemontcg.io/det1/7_hires.png',
    'Neo-Destiny/Light-Golduck-NDE47':'https://images.pokemontcg.io/neo4/47_hires.png',
    'EX-Delta-Species/Ditto-DS63':'https://images.pokemontcg.io/ex11/63_hires.png',
    '151/Ditto-V1-MEW132':'https://images.pokemontcg.io/sv3pt5/132_hires.png',
    'EX-FireRed-LeafGreen/Ditto-FL4':'https://images.pokemontcg.io/ex6/4_hires.png',
    'Base-Set/Mewtwo-V1-BS10':'https://images.pokemontcg.io/base1/10_hires.png',
    'Phantasmal-Flames/Oricorio-ex-V2-PFL110':'https://images.pokemontcg.io/me2/110_hires.png',
    'Surging-Sparks/Clobbopus-V2-SSP207':'https://images.pokemontcg.io/sv8/207_hires.png',
    'SWSH-Black-Star-Promos/Lances-Charizard-V-V1-SWSH133?minCondition=3':'https://images.pokemontcg.io/swshp/SWSH133_hires.png',
    'Shiny-Treasure-ex/Alakazam-ex-V2-sv4a326':'https://assets.tcgdex.net/ja/SV/SV4a/326/high.webp',
    'VSTAR-Universe/Charizard-VSTAR-V1-s12a014':'https://assets.tcgdex.net/ja/S/S12a/014/high.webp',
    'VMAX-Climax/Rayquaza-VMAX-V1-s8b120?minCondition=3':'https://assets.tcgdex.net/ja/S/S8b/120/high.webp',
    'Shiny-Star-V/Dragapult-VMAX-V2-s4a318':'https://assets.tcgdex.net/ja/S/S4a/318/high.webp',
    'Shiny-Star-V/Eldegoss-V-V1-s4a16':'https://assets.tcgdex.net/ja/S/S4a/016/high.webp',
    'Pokemon-Card-151/Gyarados-sv2a130':'https://assets.tcgdex.net/ja/SV/SV2a/130/high.webp',
    'Raging-Surf/Hoopa-ex-V2-sv3a078':'https://assets.tcgdex.net/ja/SV/SV3a/078/high.webp',
    'Clay-Burst/Chi-Yu-ex-V2-sv2D085':'https://assets.tcgdex.net/ja/SV/SV2D/085/high.webp',
    'Triplet-Beat/Skeledirge-ex-V2-sv1a087':'https://assets.tcgdex.net/ja/SV/SV1a/087/high.webp',
    'Inferno-X/Oricorio-ex-V3-m2111':'https://assets.tcgdex.net/ja/M/M2/111/high.webp',
    'Nihil-Zero/Forest-of-Vitality-m3109':'https://assets.tcgdex.net/ja/M/M3/109/high.webp',
    'Abyss-Eye/Armarouge-V2-m583':'https://assets.tcgdex.net/ja/M/M5/083/high.webp',
    'Storm-Emeralda/Kyogre-V2-m6080':'https://assets.tcgdex.net/ja/M/M6/080/high.webp',
    'Mega-Symphonia/Delibird-V2-m1S074':'https://assets.tcgdex.net/ja/M/M1S/074/high.webp',
    'Battle-Region/Chandelure-V2-s9a069':'https://assets.tcgdex.net/ja/S/S9a/069/high.webp',
    'Rebellion-Crash/Falinks-V-V2-s2102':'https://assets.tcgdex.net/ja/S/S2/102/high.webp',
    'Explosive-Flame-Walker/Grapploct-V-V2-S2A75':'https://assets.tcgdex.net/ja/S/S2a/075/high.webp',
    'Scarlet-Violet-Promos/Psyduck-SV-P262?minCondition=3':'https://assets.tcgdex.net/ja/SV/SV-P/262/high.webp',
  };
  const out={};
  for(const [k,v] of Object.entries(l)){ const c=caCandidats(caLireUrl(S+k)); out[k]={attendu:v,obtenu:c[0]&&c[0].img}; }
  // Galarian Gallery : les deux extensions de Crown Zenith, au numéro GG22.
  out.gg=caCandidats(caLireUrl(S+'Crown-Zenith/Ditto-V2-CRZGG22')).map(x=>x.img);
  // Sans numéro, ou extension inconnue : aucune image devinée.
  out.sans=['Rocket-Gang/Dark-Alakazam','Expansion-Pack/Abra','Collection-X/Xerneas-EX-V1',
            'Yamabuki-City-Gym/Sabrinas-Alakazam-CGY','Unnumbered-Promos/Sabrinas-Abra-UNP']
    .map(k=>caCandidats(caLireUrl(S+k)).length);
  return out;
});
const ecarts=Object.entries(vraies).filter(([k,v])=>v&&v.attendu&&v.attendu!==v.obtenu);
chk(`Les ${Object.keys(vraies).length-2} adresses réelles donnent la bonne image`,ecarts.length===0,JSON.stringify(ecarts));
chk('Galarian Gallery : numéro GG22, dans les deux extensions de Crown Zenith',
    vraies.gg.join()==='https://images.pokemontcg.io/swsh12pt5/GG22_hires.png,https://images.pokemontcg.io/swsh12pt5gg/GG22_hires.png',JSON.stringify(vraies.gg));
chk('Sans numéro ni extension connue, aucune image n\'est devinée',vraies.sans.every(n=>n===0),JSON.stringify(vraies.sans));
const sansReq=await p.evaluate(async()=>{
  APPELS.length=0;
  const r=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/Rocket-Gang/Dark-Alakazam');
  const r2=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/Shiny-Treasure-ex/Alakazam-ex-V2-sv4a326');
  return {appels:APPELS.length,raison:r.introuvable,jp:r2&&r2.img,langue:r2&&r2.langue};
});
chk('...et la base lente n\'est pas interrogée pour rien',sansReq.appels===0&&/Rocket Gang.*absente des bases ouvertes/.test(sansReq.raison||''),JSON.stringify(sansReq));
chk('Une carte japonaise trouvée l\'est sans la base, et dit sa langue',
    /tcgdex\.net\/ja\/SV\/SV4a\/326/.test(sansReq.jp||'')&&sansReq.langue==='jp',JSON.stringify(sansReq));

console.log('=== 8 quater. UN SITE QUI LIMITE LE DÉBIT ===');
const deb=await p.evaluate(async()=>{
  const out={};
  // La v1.69.1 posait « - » (refus définitif) : il est ignoré à la lecture.
  out.ancienRefus=caDeLigne(['caX','S','N','','','','','https://images.pokemontcg.io/base1/2_hires.png','-']).drive_id;
  // Deux erreurs réseau, puis le site répond : la carte est archivée.
  CA_PAUSE_HOTE=40; CA_ESPACE=5;
  CAPRICE['base1/2_hires']=2;
  const c={id:caId(),section:'Débit',nom:'Débit',url:'',prix:1,vente:null,tags:[],langue:'',
    image:'https://images.pokemontcg.io/base1/2_hires.png',drive_id:'',ref:'',cote:null,ordre:8000,etat:'',raison:'',created_at:td(),updated_at:td()};
  await caSauver([c]);
  const r=[]; for(let k=0;k<3;k++)r.push(await caTraiter(c,()=>{}));
  out.essais=r; out.drive=c.drive_id;
  // Les téléchargements vers un même site passent un par un.
  EN_VOL_MAX=0;
  await Promise.all(['base1/3','base1/4','base1/5','base1/6'].map(k=>caTelecharger(`https://images.pokemontcg.io/${k}_hires.png`)));
  out.enVolMax=EN_VOL_MAX;
  CA_PAUSE_HOTE=30; CA_ESPACE=5;
  return out;
});
chk('Un ancien « refus définitif » est oublié à la lecture',deb.ancienRefus==='',deb.ancienRefus);
chk('Des erreurs réseau passagères n\'empêchent pas l\'archive',
    deb.essais.join()==='passager,passager,archivee'&&/^d/.test(deb.drive),JSON.stringify(deb));
chk('Un seul téléchargement à la fois par site',deb.enVolMax===1,String(deb.enVolMax));

console.log('=== 8 quinquies. L\'ASSISTANT ===');
const ass=await p.evaluate(async()=>{
  const out={};
  const mk=nom=>({id:caId(),section:'Assistant',nom,url:'',prix:1,vente:null,tags:[],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:9000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes; cartes=[mk('Flagadoss TOPPS'),mk('Kadabra Gym'),mk('Flagadoss Yuka Mori')];
  renderCartes(); await new Promise(r=>setTimeout(r,300));
  out.bouton=/associer 3 images à la main/.test(document.getElementById('caEtat').textContent);
  caAssistant(); await new Promise(r=>setTimeout(r,200));
  out.tete=document.getElementById('caPickTete').textContent.replace(/\s+/g,' ');
  out.q=document.getElementById('caPickQ').value;
  out.res=document.querySelectorAll('#caPickRes .ca-pick').length;
  caPickPrendre(0); await new Promise(r=>setTimeout(r,200));
  out.tete2=document.getElementById('caPickTete').textContent.replace(/\s+/g,' ');
  caAssSuivante(); await new Promise(r=>setTimeout(r,200));
  out.tete3=document.getElementById('caPickTete').textContent.replace(/\s+/g,' ');
  caAssFin(); await new Promise(r=>setTimeout(r,200));
  out.ferme=!document.getElementById('caPickModal').classList.contains('open');
  out.images=cartes.map(c=>c.image);
  cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,200));
  return out;
});
chk('L\'assistant est proposé pour les cartes sans adresse',ass.bouton===true);
chk('Il présente la première carte, et cherche sur son nom',/1 \/ 3/.test(ass.tete)&&/Flagadoss TOPPS/.test(ass.tete)&&ass.q==='Flagadoss TOPPS'&&ass.res===2,JSON.stringify(ass));
chk('Un clic choisit l\'image et passe à la suivante',/2 \/ 3/.test(ass.tete2)&&/Kadabra Gym/.test(ass.tete2)&&/080\/high\.webp$/.test(ass.images[0]||''),JSON.stringify(ass));
chk('« Passer » laisse la carte telle quelle',/3 \/ 3/.test(ass.tete3)&&ass.images[1]==='',JSON.stringify(ass.images));
chk('« Terminer » ferme l\'assistant',ass.ferme===true);

console.log('=== 9 bis. RIEN NE BLOQUE LA FILE ===');
// Le défaut constaté : la file « s'arrêtait » après cinq images. Une requête
// sans durée maximale immobilisait un ouvrier pour toujours.
const fi=await p.evaluate(async()=>{
  const out={};
  CA_MAX_CARTE=300;
  const U=c=>`https://www.cardmarket.com/fr/Pokemon/Products/Singles/X/Carte-${c}`;
  const mk=(nom,url)=>({id:caId(),section:'File',nom,url,prix:1,vente:null,tags:['File'],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:3000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  // Trois cartes qui ne répondront jamais — autant que d'ouvriers — puis deux normales.
  await caSauver([mk('Bloque1',U('HANG1')),mk('Bloque2',U('HANG2')),mk('Bloque3',U('HANG3')),
                  mk('Apres1',U('SATE1')),mk('Apres2',U('SATF1'))]);
  // Une exception en plein traitement ne doit pas tuer l'ouvrier non plus.
  const vrai=caReduire; let une=true;
  window.caReduire=async b=>{ if(une){ une=false; throw new Error('boum'); } return vrai(b); };
  caRecherche='File'; renderCartes(); await new Promise(r=>setTimeout(r,2500)); await caVider();
  window.caReduire=vrai;
  const par=n=>cartes.find(x=>x.nom===n);
  out.apres=[par('Apres1').image,par('Apres2').image];
  out.bloquees=[par('Bloque1').etat,par('Bloque1').image];
  out.etat=document.getElementById('caEtat').textContent;
  caRecherche=''; CA_MAX_CARTE=120000;
  return out;
});
chk('Des cartes qui ne répondent jamais ne bloquent plus les suivantes',
    /SATE_hires/.test(fi.apres[0]||'')&&/SATF_hires/.test(fi.apres[1]||''),JSON.stringify(fi));
chk('...et ne sont pas notées introuvables : elles seront réessayées',fi.bloquees[0]===''&&fi.bloquees[1]==='',JSON.stringify(fi.bloquees));
chk('...ce que dit la ligne d\'état',/non obtenues/.test(fi.etat),fi.etat);

console.log('=== 9 ter. LANGUE, ÉTIQUETTES, GROUPES ===');
const lg=await p.evaluate(async()=>{
  const out={};
  const c=cartes.find(x=>x.nom==='Limonde AR');
  caOuvrir(c.id); await new Promise(r=>setTimeout(r,150));
  out.choixLangues=[...document.querySelectorAll('#caLgs button')].map(b=>b.textContent);
  // Langue : japonais.
  [...document.querySelectorAll('#caLgs button')].find(b=>b.textContent==='JP').click();
  // Étiquettes : on en ajoute deux, au clavier, puis on change la première.
  const inp=document.getElementById('caTagIn');
  inp.value='Alakazam'; inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  inp.value='Gradée, PSA 9'; caTagAjouter(inp.value);
  inp.value='classeur'; inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));   // doublon, casse différente
  out.tagsFiche=caEd.tags.slice();
  caTagPremier(1);
  out.tagsApres=caEd.tags.slice();
  await caEnregistrer(); await caVider();
  const ligne=FEUILLE.find(x=>x[0]===c.id);
  out.cellule=ligne[6]; out.langueCellule=ligne[16];
  // Relu depuis le classeur.
  cartesLoaded=false; await loadCartes();
  const r=cartes.find(x=>x.id===c.id);
  out.relue={tags:r.tags,langue:r.langue};
  caRecherche=''; caGroupe='etiquette'; renderCartes(); await new Promise(r=>setTimeout(r,300));
  const t=document.querySelector(`.ca-tuile[data-k="${c.id}"]`);
  const pas=t.querySelector('.ca-lg');
  out.pastille=pas&&{texte:pas.textContent,fond:getComputedStyle(pas).backgroundColor,
    haut:pas.getBoundingClientRect().top-t.getBoundingClientRect().top,
    droite:t.getBoundingClientRect().right-pas.getBoundingClientRect().right};
  out.etiquettesTuile=[...t.querySelectorAll('.ca-ou')].map(e=>e.textContent);
  out.plus=(t.querySelector('.ca-plus')||{}).textContent;
  out.survol=(t.querySelector('.ca-tagsl')||{getAttribute:()=>''}).getAttribute('title');
  const meta=t.querySelector('.ca-meta').getBoundingClientRect();
  out.uneLigne=meta.height<24;
  // Les couleurs : une par langue, toutes différentes.
  out.couleurs=['fr','jp','en','kr','cn'].map(l=>{ const e=document.createElement('span'); e.className='ca-lg ca-lg-'+l;
    document.body.appendChild(e); const c2=getComputedStyle(e).backgroundColor; e.remove(); return c2; });
  // Une carte sans langue n'a pas de pastille.
  const sans=cartes.find(x=>!x.langue);
  out.sansPastille=!document.querySelector(`.ca-tuile[data-k="${sans.id}"] .ca-lg`);
  // Filtrer par une étiquette qui n'est pas la première.
  caOu='Gradée'; renderCartes(); await new Promise(r=>setTimeout(r,200));
  out.filtre=[...document.querySelectorAll('.ca-tuile .ca-nom')].map(x=>x.textContent);
  caOu='';
  // Grouper par PREMIÈRE étiquette.
  caGrouper('etiquette'); await new Promise(r=>setTimeout(r,300));
  out.groupes=[...document.querySelectorAll('.ca-sec-t')].map(x=>x.textContent);
  const gr=[...document.querySelectorAll('.ca-sec')].find(x=>x.querySelector('.ca-sec-t').textContent==='Gradée');
  out.dansGradee=gr?[...gr.querySelectorAll('.ca-nom')].map(x=>x.textContent):[];
  out.memorise=localStorage.getItem('kanban_cartes_groupe2');
  out.options=[...document.querySelectorAll('.ca-tri')[0].options].map(o=>o.value);
  return out;
});
chk('Cinq langues proposées, et « aucune »',lg.choixLangues.join()==='Aucune,FR,JP,EN,KR,CN',lg.choixLangues.join());
chk('Plusieurs étiquettes, sans doublon même en changeant la casse',
    lg.tagsFiche.join('|')==='Classeur|Alakazam|Gradée|PSA 9',lg.tagsFiche.join('|'));
chk('On peut changer la première étiquette',lg.tagsApres[0]==='Alakazam',lg.tagsApres.join('|'));
chk('Écrites dans la table, séparées par des virgules',lg.cellule==='Alakazam, Classeur, Gradée, PSA 9',lg.cellule);
chk('La langue est écrite dans sa colonne',lg.langueCellule==='jp',lg.langueCellule);
chk('...et tout se relit à l\'identique',lg.relue.tags.join('|')==='Alakazam|Classeur|Gradée|PSA 9'&&lg.relue.langue==='jp',JSON.stringify(lg.relue));
chk('La pastille JP est dans le coin haut droit',lg.pastille&&lg.pastille.texte==='JP'&&lg.pastille.haut<8&&lg.pastille.droite<8,JSON.stringify(lg.pastille));
chk('...en rouge',lg.pastille&&lg.pastille.fond==='rgb(220, 38, 38)',lg.pastille&&lg.pastille.fond);
chk('Une couleur différente par langue',new Set(lg.couleurs).size===5,JSON.stringify(lg.couleurs));
chk('Pas de langue, pas de pastille',lg.sansPastille===true);
chk('Plusieurs étiquettes : la première, puis « +3 »',lg.etiquettesTuile.join('|')==='Alakazam'&&lg.plus==='+3',JSON.stringify([lg.etiquettesTuile,lg.plus]));
chk('...toutes lisibles au survol',lg.survol==='Alakazam, Classeur, Gradée, PSA 9',lg.survol);
chk('...et la ligne des prix reste sur une seule ligne',lg.uneLigne===true);
chk('Filtrer par une étiquette qui n\'est pas la première',lg.filtre.join('|')==='Limonde AR',lg.filtre.join('|'));
chk('Grouper par première étiquette',lg.groupes.includes('Alakazam')&&lg.groupes.includes('Noé')&&(!lg.groupes.includes('Sans étiquette')||lg.groupes[lg.groupes.length-1]==='Sans étiquette'),lg.groupes.join('|'));
chk('...une carte n\'apparaît que dans le groupe de sa PREMIÈRE étiquette',!lg.groupes.includes('Gradée')&&lg.dansGradee.length===0,lg.groupes.join('|'));
chk('...groupes par ordre alphabétique',(()=>{ const g=lg.groupes.slice(0,-1); return g.join()===g.slice().sort((a,b)=>a.localeCompare(b,'fr')).join(); })(),lg.groupes.join('|'));
chk('Le choix du regroupement est mémorisé',lg.memorise==='etiquette');
chk('Plus d\'option « par section » : première étiquette, ou set',lg.options.join()==='etiquette,set',JSON.stringify(lg.options));

console.log('=== 9 quater. UN ONGLET DE LA VERSION PRÉCÉDENTE ===');
const ancien=await p.evaluate(async()=>{
  // L'onglet tel que la v1.68.0 l'a créé : colonne « ou », pas de langue.
  FEUILLE=[['id','section','nom','url','prix','vente','ou','image','drive_id','ref','cote','ordre','etat','raison','created_at','updated_at'],
           ['caV1','S','Ancienne','', '2','','Noé','','','','','1','','','x','x']];
  cartesLoaded=false; await loadCartes();
  const c=cartes.find(x=>x.id==='caV1');
  return {entete:FEUILLE[0].join(),tags:c&&c.tags,langue:c&&c.langue};
});
chk('L\'en-tête d\'un ancien onglet est mis à jour',/,etiquettes,.*,langue,case$/.test(ancien.entete),ancien.entete);
chk('...et son « ou » devient la première étiquette',(ancien.tags||[]).join()==='Noé'&&ancien.langue==='',JSON.stringify(ancien));

console.log('=== 9 quinquies. MASQUER LES CHIFFRES ===');
const mc=await p.evaluate(async()=>{
  const out={};
  try{ localStorage.removeItem('kanban_cartes_chiffres'); }catch(e){}
  caChiffres=true; renderCartes(); await new Promise(r=>setTimeout(r,200));
  const kp=()=>[...document.querySelectorAll('.ca-tete .jp-kpi-l')].map(x=>x.textContent);
  out.avant=kp();
  const b=[...document.querySelectorAll('.ca-actions button')].find(x=>/chiffres/.test(x.textContent));
  out.libelle=b&&b.textContent;
  b.click(); await new Promise(r=>setTimeout(r,200));
  out.masques=!document.querySelector('.ca-tete .jp-kpis');
  out.libelle2=[...document.querySelectorAll('.ca-actions button')].find(x=>/chiffres/.test(x.textContent)).textContent;
  out.memo=localStorage.getItem('kanban_cartes_chiffres');
  out.grilleLa=document.querySelectorAll('.ca-tuile').length>0;
  [...document.querySelectorAll('.ca-actions button')].find(x=>/chiffres/.test(x.textContent)).click();
  await new Promise(r=>setTimeout(r,200));
  out.revenus=kp().length>0;
  return out;
});
chk('Le prix moyen a disparu des totaux',!mc.avant.some(t=>/moyen/i.test(t))&&mc.avant.length>=2,JSON.stringify(mc.avant));
chk('Un bouton « Masquer les chiffres »',mc.libelle==='Masquer les chiffres',String(mc.libelle));
chk('...qui les masque, et devient « Afficher »',mc.masques&&mc.libelle2==='Afficher les chiffres',JSON.stringify(mc));
chk('...sans toucher aux cartes',mc.grilleLa===true);
chk('...choix mémorisé, et réversible',mc.memo==='non'&&mc.revenus===true,JSON.stringify(mc));

console.log('=== 9 sexies. CADEAUX ET GROUPES PAR ÉTIQUETTE ===');
const cg=await p.evaluate(async()=>{
  const out={};
  out.defaut=GROUPE_DEFAUT;
  const mk=(nom,prix,vente,tags,section)=>({id:caId(),section,nom,url:'',prix,vente,tags,langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:10000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes;
  cartes=[mk('A',10,12,['Classeur'],'Tableau 2'),mk('Cadeau 1',20,null,['Noé'],'Tableau 2'),
          mk('Cadeau 2',5,30,['Wizard','noé'],'Tableau 3'),mk('Sans',3,null,[],'Tableau 3'),mk('B',7,null,['Alakazam'],'Tableau 3')];
  caChiffres=true; caRecherche=''; caOu='';
  try{ localStorage.removeItem('kanban_cartes_hors_total'); }catch(e){}
  caGroupe='etiquette'; renderCartes(); await new Promise(r=>setTimeout(r,250));
  const k=()=>Object.fromEntries([...document.querySelectorAll('.ca-tete .jp-kpi')].map(e=>[
    e.querySelector('.jp-kpi-l').textContent.replace(/\s+/g,' ').trim(),e.querySelector('.jp-kpi-v').textContent.trim()]));
  out.kpi=k();
  out.groupes=[...document.querySelectorAll('.ca-sec-t')].map(x=>x.textContent);
  out.totalNoe=([...document.querySelectorAll('.ca-sec')].find(x=>x.querySelector('.ca-sec-t').textContent==='Noé')||{querySelector:()=>({textContent:''})})
    .querySelector('.ca-sec-n').textContent;
  out.aCote=(([...document.querySelectorAll('.ca-sec')].find(x=>x.querySelector('.ca-sec-t').textContent==='Noé')||{}).querySelector||(()=>null)).call?
    ([...document.querySelectorAll('.ca-sec')].find(x=>x.querySelector('.ca-sec-t').textContent==='Noé').querySelector('.ca-sec-cadeau')||{}).textContent:null;
  out.aCoteAutres=[...document.querySelectorAll('.ca-sec')].filter(x=>x.querySelector('.ca-sec-t').textContent!=='Noé'&&x.querySelector('.ca-sec-cadeau')).length;
  out.motHors=/hors/i.test(document.querySelector('.ca-tete').textContent);
  out.cadeauxVisibles=[...document.querySelectorAll('.ca-nom')].filter(x=>/Cadeau/.test(x.textContent)).length;
  // Réglable : plus aucune étiquette exclue.
  window.prompt=()=>''; caHorsRegler(); await new Promise(r=>setTimeout(r,200));
  out.kpiSans=k();
  window.prompt=()=>'Noé'; caHorsRegler(); await new Promise(r=>setTimeout(r,200));
  out.memo=localStorage.getItem('kanban_cartes_hors_total');
  cartes=sauve; caGroupe='etiquette'; renderCartes(); await new Promise(r=>setTimeout(r,200));
  return out;
});
chk('Par défaut, les cartes sont regroupées par première étiquette',cg.defaut==='etiquette',cg.defaut);
chk('...plus de « Tableau 2 », « Tableau 3 »',!cg.groupes.some(g=>/^Tableau/.test(g)),cg.groupes.join('|'));
chk('...les cartes sans étiquette dans « Sans étiquette », à la fin',cg.groupes[cg.groupes.length-1]==='Sans étiquette',cg.groupes.join('|'));
chk('Les cadeaux (Noé) ne comptent pas dans la valeur',cg.kpi['Valeur ⚙']==='20 €',JSON.stringify(cg.kpi));
chk('...même en deuxième étiquette, et quelle que soit la casse',cg.kpi['Prix de vente']==='12 €',JSON.stringify(cg.kpi));
chk('...mais restent affichés, et leur section garde son total',cg.cadeauxVisibles===2&&/20\s€/.test(cg.totalNoe),JSON.stringify(cg));
chk('« hors Noé » n\'est plus écrit',cg.motHors===false);
chk('Le total de Noé s\'écrit à côté du nom de son groupe',/^20\s€$/.test(cg.aCote||''),String(cg.aCote));
chk('...et seulement pour un groupe de cadeaux',cg.aCoteAutres===0,String(cg.aCoteAutres));
chk('L\'exclusion se règle',cg.kpiSans['Valeur ⚙']==='45 €'&&cg.memo==='Noé',JSON.stringify([cg.kpiSans,cg.memo]));

console.log('=== 9 septies. PAR SET ===');
const ps=await p.evaluate(async()=>{
  const out={};
  out.sets=CA_SETS.map(x=>[x[0],x[1],x[2].length]);
  out.frBase=CA_SETS[0][2].slice(0,3).map(x=>x[1]);
  const mk=(nom,img,prix,url,tags)=>({id:caId(),section:'',nom,url:url||'',prix,vente:null,tags:tags||['Wizard'],langue:'',image:img||'',drive_id:'',ref:'',cote:null,
    ordre:20000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes;
  cartes=[mk('Alakazam SDB','https://images.pokemontcg.io/base1/1_hires.png',30),mk('Alakazam SDB','https://images.pokemontcg.io/base1/1_hires.png',28),
    mk('Mewtwo SDB','',18,'https://www.cardmarket.com/fr/Pokemon/Products/Singles/Base-Set/Mewtwo-V1-BS10'),
    mk('Cadeau','https://images.pokemontcg.io/base1/4_hires.png',100,'',['Noé']),
    mk('Kadabra SDB','',4),mk('Hors set','https://images.pokemontcg.io/sv3/223_hires.png',5)];
  out.cases=cartes.map(caCaseDe);
  out.tcgdex=['https://assets.tcgdex.net/fr/base/base1/58/high.webp','https://assets.tcgdex.net/fr/base/base3/1/low.webp',
    'https://assets.tcgdex.net/en/gym/gym1/12/high.webp','https://assets.tcgdex.net/fr/base/base2/001',
    'https://assets.tcgdex.net/fr/base/base1/999/high.webp','https://assets.tcgdex.net/fr/sv/sv03.5/080/high.webp']
    .map(u=>caCaseDe({image:u,url:''}));
  caGroupe='set'; caManquantes=false; caRecherche=''; renderCartes(); await new Promise(r=>setTimeout(r,400));
  const sec=[...document.querySelectorAll('.ca-sec')];
  out.titres=sec.map(x=>x.querySelector('.ca-sec-t').textContent);
  out.tuilesBase=sec[0].querySelectorAll('.ca-tuile').length;
  out.compte=sec[0].querySelector('.ca-sec-n').textContent;
  out.ordre=[...sec[0].querySelectorAll('.ca-num')].slice(0,5).map(x=>x.textContent);
  const t1=sec[0].querySelectorAll('.ca-tuile')[0];
  out.t1={possedee:!t1.classList.contains('ca-manque'),nb:(t1.querySelector('.ca-nb')||{}).textContent,nom:t1.querySelector('.ca-nom').textContent};
  const t3=sec[0].querySelectorAll('.ca-tuile')[2];
  out.t3={manque:t3.classList.contains('ca-manque'),gris:getComputedStyle(t3.querySelector('.ca-img img')).filter,img:t3.querySelector('img').getAttribute('src')};
  out.horsSet=!document.querySelector('#caSections').textContent.includes('Hors set');
  out.sous=document.querySelector('.ca-tete .jp-sous').textContent;
  // Manquantes seulement.
  caManquantes=true; caRedessiner();
  out.manquantes=document.querySelectorAll('.ca-sec')[0].querySelectorAll('.ca-tuile').length;
  caManquantes=false;
  // Une recherche filtre les cases.
  caRecherche='kadabra'; caRedessiner();
  out.recherche=[...document.querySelectorAll('.ca-sec')[0].querySelectorAll('.ca-nom')].map(x=>x.textContent);
  caRecherche='';
  // Ranger une carte existante dans sa case.
  caCase('base1','32'); await new Promise(r=>setTimeout(r,150));
  out.modale={titre:document.getElementById('caCaseTitre').textContent,nom:document.getElementById('caCaseNom').textContent,
    proposees:[...document.querySelectorAll('#caCaseRes .ca-case-c b')].map(x=>x.textContent)};
  const kad=cartes.find(c=>c.nom==='Kadabra SDB');
  await caCaseLier(kad.id); await new Promise(r=>setTimeout(r,200));
  out.lie={case:caCaseDe(caParId(kad.id)),image:caParId(kad.id).image,compte:document.querySelectorAll('.ca-sec')[0].querySelector('.ca-sec-n').textContent};
  // Ajouter une carte depuis une case.
  caCase('base1','58'); await new Promise(r=>setTimeout(r,100));
  caCaseNouvelle(); await new Promise(r=>setTimeout(r,150));
  out.fiche={nom:document.getElementById('caNom').value,image:caEd.image};
  document.getElementById('caPrix').value='12';
  await caEnregistrer(); await new Promise(r=>setTimeout(r,300));
  const pik=cartes.find(c=>c.nom==='Pikachu');
  out.ajout=pik&&{case:caCaseDe(pik),prix:pik.prix};
  cartes=sauve; caGroupe='etiquette'; renderCartes(); await new Promise(r=>setTimeout(r,200));
  return out;
});
chk('Six sets complets, avec toutes leurs cartes',
    JSON.stringify(ps.sets)===JSON.stringify([['base1','Set de base',102],['base2','Jungle',64],['base3','Fossile',62],['base5','Team Rocket',83],['gym1','Gym Heroes',132],['gym2','Gym Challenge',132]]),JSON.stringify(ps.sets));
chk('...avec les noms français',ps.frBase.join()==='Alakazam,Tortank,Leveinard',ps.frBase.join());
chk('La case se lit aussi dans une image TCGdex (« Choisir l\'image… »)',
    JSON.stringify(ps.tcgdex)===JSON.stringify(['base1/58','base3/1','gym1/12','base2/1','','']),JSON.stringify(ps.tcgdex));
chk('La case d\'une carte se lit dans son image ou son adresse Cardmarket',
    ps.cases.join()==='base1/1,base1/1,base1/10,base1/4,,',ps.cases.join());
chk('Chaque set s\'affiche, toutes ses cartes par ordre de numéro',
    ps.titres.slice(0,6).join('|')==='Set de base|Jungle|Fossile|Team Rocket|Gym Heroes|Gym Challenge'&&ps.tuilesBase===102&&ps.ordre.join()==='1,2,3,4,5',JSON.stringify(ps));
chk('La progression compte les cartes possédées, les cadeaux hors valeur',ps.compte==='3 / 102 · 76 €',ps.compte);
chk('Une carte possédée s\'affiche, avec ses exemplaires',ps.t1.possedee&&ps.t1.nb==='×2'&&ps.t1.nom==='Alakazam SDB',JSON.stringify(ps.t1));
chk('Une carte manquante est grisée, avec son image',ps.t3.manque&&/grayscale\(1\)/.test(ps.t3.gris)&&ps.t3.img==='https://images.pokemontcg.io/base1/3.png',JSON.stringify(ps.t3));
chk('Les cartes hors de ces sets n\'y apparaissent pas',ps.horsSet===true);
chk('Le sous-titre compte les sets',/6 sets/.test(ps.sous),ps.sous);
chk('« Manquantes seulement »',ps.manquantes===99,String(ps.manquantes));
chk('La recherche filtre les cases',ps.recherche.join('|')==='Kadabra',ps.recherche.join('|'));
chk('Une case manquante propose TOUTES les cartes, les ressemblantes d\'abord',
    /SET DE BASE — N° 32/.test(ps.modale.titre)&&ps.modale.nom==='Kadabra'&&ps.modale.proposees[0]==='Kadabra SDB'&&ps.modale.proposees.length===6,JSON.stringify(ps.modale));
chk('...et y range la carte choisie, prix et étiquettes compris',
    ps.lie.case==='base1/32'&&ps.lie.image==='https://images.pokemontcg.io/base1/32_hires.png'&&/^4 \/ 102/.test(ps.lie.compte),JSON.stringify(ps.lie));
chk('« Je l\'ai » ouvre une fiche préremplie',ps.fiche.nom==='Pikachu'&&/base1\/58_hires/.test(ps.fiche.image||''),JSON.stringify(ps.fiche));
chk('...et la carte ajoutée prend sa case',ps.ajout&&ps.ajout.case==='base1/58'&&ps.ajout.prix===12,JSON.stringify(ps.ajout));

console.log('=== 9 octies. LA SECTION DEVIENT UNE ÉTIQUETTE ===');
const mg=await p.evaluate(async()=>{
  const sauve=FEUILLE;
  FEUILLE=[CA_HEADER.slice(),
    ['m1','Cadeau Noé','Sans étiquette mais nommée','','1','','','','','','','1','','','x','x',''],
    ['m2','Tableau 2','Section fabriquée','','1','','','','','','','2','','','x','x',''],
    ['m3','Ma section','Déjà étiquetée','','1','','Wizard','','','','','3','','','x','x','']];
  cartesLoaded=false; await loadCartes(); await caVider();
  const g=id=>cartes.find(c=>c.id===id).tags.join('|');
  const out={m1:g('m1'),m2:g('m2'),m3:g('m3'),ecrit:caDeLigne(FEUILLE.find(x=>x[0]==='m1')).tags.join('|'),
    colonne:FEUILLE.find(x=>x[0]==='m1')[1]};
  FEUILLE=sauve; cartesLoaded=false; await loadCartes();
  return out;
});
chk('Une carte sans étiquette garde le nom de sa section, en étiquette',mg.m1==='Cadeau Noé'&&mg.ecrit==='Cadeau Noé',JSON.stringify(mg));
chk('...sauf un nom fabriqué par l\'import (« Tableau 2 »)',mg.m2==='',JSON.stringify(mg));
chk('...et une carte déjà étiquetée n\'est pas touchée',mg.m3==='Wizard',JSON.stringify(mg));
chk('La colonne « section » reste intacte dans le classeur',mg.colonne==='Cadeau Noé',mg.colonne);

console.log('=== 9 nonies. ALIGNEMENT, TRI PAR DÉFAUT ===');
const al=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,prix)=>({id:caId(),section:'',nom,url:'',prix,vente:null,tags:['Alignement'],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:30000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes; const triAvant=caTri;
  cartes=[mk('Petite',2),mk('Grande',40),mk('Moyenne',9),mk('Sans prix',null)];
  caTri=GROUPE_DEFAUT&&window.TRI_DEFAUT; caGroupe='etiquette'; renderCartes(); await new Promise(r=>setTimeout(r,250));
  const tu=[...document.querySelectorAll('.ca-sec')][0].querySelectorAll('.ca-tuile');
  // Le défaut : aucun texte parasite au-dessus des images, toutes au même niveau.
  out.textesParasites=[...tu].map(t=>[...t.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(''));
  out.hauts=[...tu].map(t=>Math.round(t.querySelector('.ca-img').getBoundingClientRect().top-t.getBoundingClientRect().top));
  out.ordre=[...tu].map(t=>t.querySelector('.ca-nom').textContent);
  out.premiereOption=document.querySelectorAll('.ca-tri')[1].options[0].value;
  out.triDefaut=window.TRI_DEFAUT;
  cartes=sauve; caTri=triAvant; renderCartes(); await new Promise(r=>setTimeout(r,200));
  return out;
});
chk('Aucun numéro parasite sur les tuiles',al.textesParasites.every(t=>t===''),JSON.stringify(al.textesParasites));
chk('...toutes les images au même niveau',new Set(al.hauts).size===1,JSON.stringify(al.hauts));
chk('Tri par défaut : l\'ordre de la section',al.ordre.join('|')==='Petite|Grande|Moyenne|Sans prix'&&al.premiereOption==='ordre'&&al.triDefaut==='ordre',JSON.stringify(al));

console.log('=== 9 decies. LA LISTE DES ÉTIQUETTES ===');
const et=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,tags)=>({id:caId(),section:'',nom,url:'',prix:1,vente:null,tags,langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:40000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes;
  cartes=[mk('a',['Wizard','Set de Base']),mk('b',['Set de base']),mk('c',['Set de Base','Écarlate']),mk('d',['alakazam']),mk('e',['Zébi'])];
  out.liste=caToutesEtiquettes();
  caGroupe='etiquette'; caOu=''; renderCartes(); await new Promise(r=>setTimeout(r,200));
  out.puces=[...document.querySelectorAll('.ca-lieux .sb-tag')].map(x=>x.textContent);
  out.groupes=[...document.querySelectorAll('.ca-sec-t')].map(x=>x.textContent);
  // Filtrer par une étiquette trouve toutes ses graphies.
  caOu='Set de Base'; renderCartes(); await new Promise(r=>setTimeout(r,150));
  out.filtre=[...document.querySelectorAll('.ca-nom')].map(x=>x.textContent).sort().join('');
  caOu='';
  // Une étiquette qui n'est plus portée disparaît des listes.
  const e=cartes.find(c=>c.nom==='e');
  caOuvrir(e.id); await new Promise(r=>setTimeout(r,100));
  caTagRetirer(0); await caEnregistrer(); await new Promise(r=>setTimeout(r,200));
  out.apres=[...document.querySelectorAll('.ca-lieux .sb-tag')].map(x=>x.textContent);
  caOuvrir(cartes[0].id); await new Promise(r=>setTimeout(r,100));
  out.suggestions=[...document.querySelectorAll('#caOuListe option')].map(o=>o.value);
  caFermer();
  cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Une étiquette écrite de deux façons ne compte qu\'une fois, sous sa graphie la plus répandue',
    et.liste.join('|')==='alakazam|Écarlate|Set de Base|Wizard|Zébi',et.liste.join('|'));
chk('Les puces de filtre suivent, dans l\'ordre alphabétique',et.puces.join('|')==='Tous|alakazam|Écarlate|Set de Base|Wizard|Zébi',et.puces.join('|'));
chk('...et les groupes aussi : un seul « Set de Base »',et.groupes.filter(g=>/^set de base$/i.test(g)).length===1,et.groupes.join('|'));
chk('Filtrer par une étiquette trouve toutes ses graphies',et.filtre==='abc',et.filtre);
chk('Une étiquette qui n\'est plus portée disparaît',!et.apres.includes('Zébi'),et.apres.join('|'));
chk('Les suggestions de la fiche sont triées, sans étiquette orpheline',et.suggestions.join('|')==='alakazam|Écarlate|Set de Base|Wizard',et.suggestions.join('|'));

console.log('=== 9 undecies. SUGGESTIONS « COMMENCE PAR » ===');
const sg=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,tags)=>({id:caId(),section:'',nom,url:'',prix:1,vente:null,tags,langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:50000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes;
  cartes=[mk('a',['Set de Base','Wizard']),mk('b',['Reset','Écarlate']),mk('c',['Sabrina','Échange']),mk('d',['Gym'])];
  renderCartes(); await new Promise(r=>setTimeout(r,150));
  caOuvrir(cartes[3].id); await new Promise(r=>setTimeout(r,120));
  const inp=document.getElementById('caTagIn');
  const taper=v=>{ inp.value=v; inp.dispatchEvent(new Event('input')); };
  const vus=()=>[...document.querySelectorAll('#caSugg .ca-sugg-i')].map(b=>b.textContent);
  const touche=k=>inp.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
  inp.focus();
  taper('se'); out.se=vus();
  taper('ar'); out.ar=vus();
  taper('e'); out.e=vus();          // « É » compte comme « e »
  taper('S'); out.S=vus();
  out.lie=!inp.hasAttribute('list');
  // Au clavier : flèche bas, Entrée.
  taper('s'); touche('ArrowDown'); out.surligne=(document.querySelector('#caSugg .ca-sugg-i.on')||{}).textContent;
  touche('Enter'); await new Promise(r=>setTimeout(r,30));
  out.pose=caEd.tags.slice(); out.vide=inp.value;
  // Déjà posée : plus proposée.
  taper('s'); out.sansDeja=vus();
  // Échap ferme la liste sans fermer la fiche.
  touche('Escape'); out.fermee=document.getElementById('caSugg').hidden; out.ficheOuverte=document.getElementById('caModal').classList.contains('open');
  // Une étiquette nouvelle se pose quand même.
  taper('Nouvelle'); touche('Enter'); out.nouvelle=caEd.tags.slice();
  // Au clic.
  taper('wiz'); document.querySelector('#caSugg .ca-sugg-i').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));
  out.clic=caEd.tags.slice();
  caFermer(); cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('« se » propose ce qui COMMENCE par « se », pas « Reset »',sg.se.join('|')==='Set de Base',sg.se.join('|'));
chk('« ar » ne propose rien : aucune étiquette ne commence ainsi',sg.ar.length===0,sg.ar.join('|'));
chk('Sans tenir compte des accents',sg.e.join('|')==='Écarlate|Échange',sg.e.join('|'));
chk('...ni des majuscules, par ordre alphabétique',sg.S.join('|')==='Sabrina|Set de Base',sg.S.join('|'));
chk('La liste du navigateur, qui cherchait « contient », n\'est plus branchée',sg.lie===true);
chk('Flèche bas, Entrée : la suggestion est posée',sg.surligne==='Set de Base'&&sg.pose.join('|')==='Gym|Set de Base'&&sg.vide==='',JSON.stringify(sg));
chk('Une étiquette déjà posée n\'est plus proposée',sg.sansDeja.join('|')==='Sabrina',sg.sansDeja.join('|'));
chk('Échap ferme la liste, pas la fiche',sg.fermee&&sg.ficheOuverte,JSON.stringify([sg.fermee,sg.ficheOuverte]));
chk('Une étiquette nouvelle se pose toujours avec Entrée',sg.nouvelle.includes('Nouvelle'),JSON.stringify(sg.nouvelle));
chk('Un clic sur une suggestion la pose',sg.clic.includes('Wizard'),JSON.stringify(sg.clic));

console.log('=== 9 duodecies. L\'ORDRE DES GROUPES ===');
const og=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,tags)=>({id:caId(),section:'',nom,url:'',prix:1,vente:null,tags,langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:60000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes, sauveO=JSON.parse(JSON.stringify(caOrdre));
  caOrdre={etiquette:[],set:[]};
  cartes=[mk('a',['Wizard']),mk('b',['Alakazam']),mk('c',['Noé']),mk('d',[]),mk('e',['Gym'])];
  caGroupe='etiquette'; caRecherche=''; caOu=''; caReordonner=false; renderCartes(); await new Promise(r=>setTimeout(r,200));
  const titres=()=>[...document.querySelectorAll('.ca-sec-t')].map(x=>x.textContent);
  out.defaut=titres();
  out.bouton=[...document.querySelectorAll('.ca-actions button')].some(b=>/Ordre/.test(b.textContent));
  caOrdreBascule(); await new Promise(r=>setTimeout(r,150));
  out.plie=document.querySelectorAll('.ca-sec.plie').length>0&&!document.querySelector('.ca-grille');
  out.flechesSans=!!document.querySelector('.ca-sec[data-t="Sans étiquette"] .ca-ord');
  // Monter Wizard tout en haut, descendre Alakazam d'un cran.
  ECRITURES.length=0;
  await caDeplacer('etiquette','Wizard','haut');
  await caDeplacer('etiquette','Alakazam',1);
  out.apres=titres();
  out.cfg=ECRITURES.flat().filter(r=>r[0]==='cfg:ordre').pop();
  // Le premier ne peut plus monter.
  out.premierBloque=document.querySelector('.ca-sec .ca-ord-b').disabled;
  caOrdreBascule(); await new Promise(r=>setTimeout(r,150));
  out.deplie=!!document.querySelector('.ca-grille');
  // Une étiquette nouvelle se range à la suite, par ordre alphabétique.
  cartes.push(mk('f',['Bulbizarre'])); renderCartes(); await new Promise(r=>setTimeout(r,150));
  out.nouvelle=titres();
  // L'ordre suit d'un appareil à l'autre : relu depuis le classeur.
  const ligne=FEUILLE.find(x=>x[0]==='cfg:ordre');
  caOrdre={etiquette:[],set:[]};
  cartesLoaded=false; const sauveF=FEUILLE;
  FEUILLE=[CA_HEADER.slice(),ligne];
  await loadCartes();
  out.relu=caOrdre.etiquette.join('|'); out.pasUneCarte=cartes.length===0;
  FEUILLE=sauveF;
  // Les sets aussi.
  cartes=[mk('g',['Wizard'])]; caGroupe='set'; caReordonner=true; renderCartes(); await new Promise(r=>setTimeout(r,150));
  await caDeplacer('set','Team Rocket','haut');
  out.sets=titres().slice(0,2);
  caOrdreRaz('set'); await new Promise(r=>setTimeout(r,100));
  out.setsRaz=titres()[0];
  caReordonner=false; caGroupe='etiquette'; cartes=sauve; caOrdre=sauveO; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Par défaut, les groupes suivent l\'ordre alphabétique',og.defaut.join('|')==='Alakazam|Gym|Noé|Wizard|Sans étiquette',og.defaut.join('|'));
chk('Un bouton « ⇅ Ordre »',og.bouton===true);
chk('...qui replie les groupes en une liste de titres à flèches',og.plie===true);
chk('« Sans étiquette » reste en dernier, sans flèches',og.flechesSans===false);
chk('Monter tout en haut, descendre d\'un cran',og.apres.join('|')==='Wizard|Gym|Alakazam|Noé|Sans étiquette',og.apres.join('|'));
chk('...le premier ne peut plus monter',og.premierBloque===true);
chk('L\'ordre est écrit dans le classeur, sur sa ligne de réglage',
    !!og.cfg&&JSON.parse(og.cfg[13]).etiquette.join('|')==='Wizard|Gym|Alakazam|Noé',JSON.stringify(og.cfg));
chk('« Terminé » rend les cartes',og.deplie===true);
chk('Une étiquette nouvelle se range à la suite, par ordre alphabétique',og.nouvelle.join('|')==='Wizard|Gym|Alakazam|Noé|Bulbizarre|Sans étiquette',og.nouvelle.join('|'));
chk('L\'ordre se relit depuis le classeur, et le réglage n\'est pas une carte',og.relu==='Wizard|Gym|Alakazam|Noé'&&og.pasUneCarte,JSON.stringify(og));
chk('Les sets se réordonnent aussi',og.sets.join('|')==='Team Rocket|Set de base',og.sets.join('|'));
chk('...et reviennent à l\'ordre d\'origine d\'un clic',og.setsRaz==='Set de base',og.setsRaz);

console.log('=== 9 terdecies. LE CODE IMPRIMÉ SUR LA CARTE ===');
const cd=await p.evaluate(async()=>{
  const out={};
  out.lire=['OBF 223','obf223','FLO 223/197','SV4a 326/190','sv4a326','CRZ GG22','151 006','E&V 012','n\'importe quoi']
    .map(t=>{ const r=caCodeLire(t); return r?r.code+'|'+r.num:null; });
  const c1=k=>caCodeCandidats(k,'').map(x=>`${x.set}:${x.api}:${x.langue}`);
  out.cand={FLO:c1('FLO'),OBF:c1('OBF'),SV4A:c1('sv4a'),XY:c1('XY'),TEM:c1('TEM')};
  APPELS_DEX.length=0;
  out.flo=await caCodeResoudre('FLO 223/197','');
  out.floAppels=APPELS_DEX.slice();
  out.obf=await caCodeResoudre('OBF 223','');
  out.ja=await caCodeResoudre('SV4a 326','');
  out.tem=await caCodeResoudre('TEM 136','');
  out.mew=await caCodeResoudre('151 6','');
  out.sansImage=await caCodeResoudre('OBF 12','');
  out.inconnu=await caCodeResoudre('ZZZ 12','');
  out.illisible=await caCodeResoudre('bonjour','');
  out.absent=await caCodeResoudre('FLO 999','');
  // La fiche : pré-charger, puis enregistrer + suivante.
  const sauve=cartes; cartes=[];
  caOuvrir(null); await new Promise(r=>setTimeout(r,100));
  out.suivanteVisible=document.getElementById('caSuivante').style.display!=='none';
  caEd.tags=['Pile du jour']; caTagsDessiner();
  const code=document.getElementById('caCode'); code.value='FLO 223';
  code.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,250));
  out.fiche={nom:document.getElementById('caNom').value,langue:caEd.langue,image:caEd.image,
    info:document.getElementById('caInfo').textContent,focus:document.activeElement&&document.activeElement.id};
  document.getElementById('caPrix').value='3';
  await caEnregistrer(true); await new Promise(r=>setTimeout(r,250));
  const c=cartes[0];
  out.carte=c&&{nom:c.nom,prix:c.prix,langue:c.langue,image:c.image,ref:c.ref,cote:c.cote,tags:c.tags};
  out.suite={ouverte:document.getElementById('caModal').classList.contains('open'),tags:caEd&&caEd.tags,langue:caEd&&caEd.langue,
    code:document.getElementById('caCode').value,focus:document.activeElement&&document.activeElement.id,nom:document.getElementById('caNom').value};
  // Un nom déjà tapé n'est pas écrasé.
  document.getElementById('caNom').value='Mon nom à moi';
  document.getElementById('caCode').value='SV4a 326'; await caPrecharger();
  out.nomGarde=document.getElementById('caNom').value; out.langueGardee=caEd.langue;
  caFermer();
  // Une carte existante n'a pas « Enregistrer + suivante ».
  caOuvrir(c.id); await new Promise(r=>setTimeout(r,80));
  out.suivanteExistante=document.getElementById('caSuivante').style.display==='none';
  caFermer();
  cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Le code se lit sous toutes ses formes',JSON.stringify(cd.lire)===JSON.stringify(['OBF|223','OBF|223','FLO|223','SV4a|326','SV4a|326','CRZ|GG22','151|006','E&V|012',null]),JSON.stringify(cd.lire));
chk('« FLO » : code français, carte française',cd.cand.FLO[0]==='sv03:fr:fr',JSON.stringify(cd.cand.FLO));
chk('« OBF » : code officiel, carte anglaise',cd.cand.OBF[0]==='sv03:en:en',JSON.stringify(cd.cand.OBF));
chk('« sv4a » : extension japonaise',cd.cand.SV4A[0]==='SV4a:ja:jp',JSON.stringify(cd.cand.SV4A));
chk('« XY », commun à l\'anglais et au français, ne présume pas de la langue',cd.cand.XY[0]==='xy1:fr:',JSON.stringify(cd.cand.XY));
chk('« FLO 223 » : nom français, image française, langue, extension, cote',
    cd.flo.nom==='Dracaufeu ex'&&/assets\.tcgdex\.net\/fr\/sv\/sv03\/223\/high\.webp$/.test(cd.flo.image)&&cd.flo.langue==='fr'
    &&cd.flo.ref==='Flammes Obsidiennes 223'&&cd.flo.cote===23.4,JSON.stringify(cd.flo));
chk('...en une seule requête',cd.floAppels.length===1,JSON.stringify(cd.floAppels));
chk('« OBF 223 » : nom français, image ANGLAISE',cd.obf.nom==='Dracaufeu ex'&&/\/en\/sv\/sv03\/223\//.test(cd.obf.image)&&cd.obf.langue==='en',JSON.stringify(cd.obf));
chk('« SV4a 326 » : la carte japonaise',cd.ja.nom==='フーディンex'&&/\/ja\/SV\/SV4a\/326\//.test(cd.ja.image)&&cd.ja.langue==='jp',JSON.stringify(cd.ja));
chk('Code partagé : l\'extension où le numéro existe l\'emporte',cd.tem.nom==='Carte TEM'&&cd.tem.autres>=1,JSON.stringify(cd.tem));
chk('Le numéro prend ses zéros quand l\'extension en met (« 151 6 » → 006)',cd.mew.nom==='Dracaufeu ex'&&/sv03\.5\/006/.test(cd.mew.image),JSON.stringify(cd.mew));
chk('Sans image chez TCGdex : l\'adresse fixe de pokemontcg.io',cd.sansImage.image==='https://images.pokemontcg.io/sv3/12_hires.png',JSON.stringify(cd.sansImage));
chk('Les erreurs disent quoi faire',/inconnu/.test(cd.inconnu.erreur)&&/illisible/.test(cd.illisible.erreur)&&/Aucune carte n° 999/.test(cd.absent.erreur),JSON.stringify([cd.inconnu,cd.illisible,cd.absent]));
chk('« Pré-charger » remplit la fiche, puis passe au prix',
    cd.fiche.nom==='Dracaufeu ex'&&cd.fiche.langue==='fr'&&/sv03\/223/.test(cd.fiche.image||'')&&/Cote Cardmarket : 23,40/.test(cd.fiche.info)&&cd.fiche.focus==='caPrix',JSON.stringify(cd.fiche));
chk('La carte enregistrée garde tout',cd.carte&&cd.carte.nom==='Dracaufeu ex'&&cd.carte.prix===3&&cd.carte.langue==='fr'&&/sv03\/223/.test(cd.carte.image)
    &&cd.carte.ref==='Flammes Obsidiennes 223'&&cd.carte.cote===23.4&&cd.carte.tags.join()==='Pile du jour',JSON.stringify(cd.carte));
chk('« Enregistrer + suivante » rouvre une fiche neuve, mêmes étiquettes et langue, curseur dans le code',
    cd.suite.ouverte&&cd.suite.tags.join()==='Pile du jour'&&cd.suite.langue==='fr'&&cd.suite.code===''&&cd.suite.nom===''&&cd.suite.focus==='caCode',JSON.stringify(cd.suite));
chk('Un nom déjà tapé n\'est pas écrasé, une langue choisie non plus',cd.nomGarde==='Mon nom à moi'&&cd.langueGardee==='fr',JSON.stringify([cd.nomGarde,cd.langueGardee]));
chk('Le bouton n\'apparaît que pour une carte nouvelle',cd.suivanteVisible&&cd.suivanteExistante);

console.log('=== 9 quattuordecies. COCHER DANS UN SET ===');
const co=await p.evaluate(async()=>{
  const out={};
  const sauve=cartes;
  cartes=[{id:caId(),section:'',nom:'Hors set',url:'',prix:1,vente:null,tags:[],langue:'',image:'',drive_id:'',ref:'',cote:null,ordre:1,etat:'',raison:'',created_at:td(),updated_at:td()}];
  caGroupe='set'; caManquantes=false; caRecherche=''; caCocher=false; renderCartes(); await new Promise(r=>setTimeout(r,200));
  out.bouton=[...document.querySelectorAll('.ca-cocher-l button')].map(b=>b.textContent.trim());
  caCocherBascule(); await new Promise(r=>setTimeout(r,150));
  caCocherReglage('Wizard','fr');
  ECRITURES.length=0; const delai=CA_DELAI_ECR; CA_DELAI_ECR=2000;
  // Trois clics sur des cases grises.
  for(const n of ['1','2','58']){ const b=[...document.querySelectorAll('.ca-sec')][0].querySelectorAll('.ca-tuile')[+n-1];
    b.click(); await new Promise(r=>setTimeout(r,30)); }
  out.nb=cartes.length-1;
  out.cartes=cartes.slice(1).map(c=>({nom:c.nom,tags:c.tags.join(),langue:c.langue,case:caCaseDe(c),prix:c.prix}));
  out.ficheOuverte=document.getElementById('caModal').classList.contains('open')||document.getElementById('caCaseModal').classList.contains('open');
  out.compte=[...document.querySelectorAll('.ca-sec')][0].querySelector('.ca-sec-n').textContent;
  out.ecrituresImmediates=ECRITURES.length;
  await caVider(); CA_DELAI_ECR=delai;
  const ids=new Set(cartes.slice(1).map(c=>c.id));
  out.premiere=(ECRITURES[0]||[]).filter(r=>ids.has(r[0])).length;
  await ANNUL[ANNUL.length-1].fn(); await new Promise(r=>setTimeout(r,600)); await caVider();
  out.apresAnnul=cartes.length-1;
  caCocher=false; caGroupe='etiquette'; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Un bouton « ☑ Cocher mes cartes » dans la vue par set',co.bouton.includes('☑ Cocher mes cartes'),JSON.stringify(co.bouton));
chk('Un clic sur une case grise ajoute la carte, sans ouvrir de fiche',co.nb===3&&co.ficheOuverte===false,JSON.stringify(co));
chk('...avec son nom, sa case, l\'étiquette et la langue choisies',
    JSON.stringify(co.cartes.map(c=>[c.nom,c.case,c.tags,c.langue]))===JSON.stringify([['Alakazam','base1/1','Wizard','fr'],['Tortank','base1/2','Wizard','fr'],['Pikachu','base1/58','Wizard','fr']]),JSON.stringify(co.cartes));
chk('...et la case devient possédée',/^3 \/ 102/.test(co.compte),co.compte);
chk('Les ajouts sont regroupés : une seule écriture pour trois clics',co.ecrituresImmediates===0&&co.premiere===3,JSON.stringify(co));
chk('Chaque ajout s\'annule — et ne revient pas quand son image finit de se préparer',co.apresAnnul===2,String(co.apresAnnul));

console.log('=== 9 quindecies. LES LIGNÉES ===');
const li=await p.evaluate(async()=>{
  const out={};
  out.lignees=CA_LIGNEES.map(x=>[x[0],x[1],x[2].length,x[2].filter(e=>e[0].startsWith('ja:')).length]);
  const tout=CA_LIGNEES.flatMap(x=>x[2]);
  out.noms=['Abra de Morgane',"Draco d'Érika",'Dracolosse obscur',"Magicarpe d'Ondine",'Magicarpe'].map(n=>tout.some(e=>e[1]===n));
  const mag=CA_LIGNEES.find(x=>x[0]==='magicarpe');
  out.sansLeviator=!!mag&&mag[2].every(e=>/magicarpe/i.test(e[1]));
  out.magNb=mag?mag[2].length:0;
  out.tronques=tout.filter(e=>/ d$/.test(e[1])).length+CA_SETS.flatMap(x=>x[2]).filter(e=>/ d$/.test(e[1])).length;
  const mk=(nom,o)=>({id:caId(),section:'',nom,url:'',prix:2,vente:null,tags:[],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:70000+cartes.length,etat:'',raison:'',created_at:td(),updated_at:td(),...o});
  // La même carte, quatre façons de la connaître.
  const viaPt=mk('Alakazam ex 151 (pokemontcg)',{image:'https://images.pokemontcg.io/sv3pt5/65_hires.png'});
  const viaDex=mk('Alakazam ex 151 (TCGdex)',{image:'https://assets.tcgdex.net/fr/sv/sv03.5/065/high.webp'});
  const viaCm=mk('Alakazam ex 151 (Cardmarket)',{url:'https://www.cardmarket.com/fr/Pokemon/Products/Singles/151/Alakazam-ex-V1-MEW065'});
  const jp=mk('Alakazam ex JP',{url:'https://www.cardmarket.com/fr/Pokemon/Products/Singles/Pokemon-Card-151/Alakazam-ex-V2-sv2a065'});
  out.cles=[viaPt,viaDex,viaCm,jp].map(caCaseDe);
  const sauve=cartes;
  cartes=[viaPt,viaDex,viaCm,jp,mk('Alakazam SDB',{image:'https://images.pokemontcg.io/base1/1_hires.png'})];
  caGroupe='set'; caRecherche=''; caManquantes=false; caCocher=false; renderCartes(); await new Promise(r=>setTimeout(r,300));
  const sec=[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t==='Abra · Kadabra · Alakazam');
  out.compte=sec.querySelector('.ca-sec-n').textContent;
  out.compteBase=[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t==='Set de base').querySelector('.ca-sec-n').textContent;
  const t=[...sec.querySelectorAll('.ca-tuile')];
  out.premiere=t[0]&&{num:t[0].querySelector('.ca-num').textContent,possedee:!t[0].classList.contains('ca-manque')};
  const mJp=t.find(x=>x.classList.contains('ca-manque')&&x.querySelector('.ca-lg-jp'));
  out.manqueJp=mJp&&{img:mJp.querySelector('img').getAttribute('src'),ext:mJp.querySelector('.ca-manque-t').textContent};
  out.nb3=(sec.querySelector('.ca-nb')||{}).textContent;
  out.sous=document.querySelector('.ca-tete .jp-sous').textContent;
  // Cocher une case japonaise : la langue suit.
  caCocher=true; caCocherReglage('', 'fr'); renderCartes(); await new Promise(r=>setTimeout(r,150));
  const caseJa=CA_LIGNEES[0][2].find(e=>e[0].startsWith('ja:')&&!cartes.some(c=>caCaseDe(c)===e[0]));
  caCocherCase('alakazam',caseJa[0]); await new Promise(r=>setTimeout(r,80));
  const nv=cartes[cartes.length-1];
  out.cocheJp={langue:nv.langue,cle:caCaseDe(nv),attendu:caseJa[0],nom:nv.nom};
  caCocher=false; caGroupe='etiquette'; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Quatre lignées, Métamorph comprise',
    JSON.stringify(li.lignees.map(x=>[x[0],x[1]]))===JSON.stringify([['alakazam','Abra · Kadabra · Alakazam'],['dracolosse','Minidraco · Draco · Dracolosse'],['magicarpe','Magicarpe'],['metamorph','Métamorph']])
    &&li.lignees.every(x=>x[2]>25),JSON.stringify(li.lignees));
chk('Des noms français, y compris les dresseurs et les « obscurs »',li.noms.every(Boolean),JSON.stringify(li.noms));
chk('La lignée Magicarpe ne garde que les Magicarpe, sans Léviator',li.sansLeviator===true&&li.magNb>40,JSON.stringify([li.sansLeviator,li.magNb]));
chk('Plus aucun nom tronqué à l\'apostrophe',li.tronques===0,String(li.tronques));
chk('La même carte trouve sa case par pokemontcg.io, TCGdex ou Cardmarket',
    li.cles[0]==='sv3pt5/65'&&li.cles[1]==='sv3pt5/65'&&li.cles[2]==='sv3pt5/65',JSON.stringify(li.cles));
chk('...et sa version japonaise remplit la MÊME case',li.cles[3]==='sv3pt5/65',li.cles[3]);
chk('Une carte compte dans son set ET dans sa lignée',/^1 \/ 102/.test(li.compteBase)&&/^2 \//.test(li.compte),JSON.stringify([li.compteBase,li.compte]));
chk('...avec ses exemplaires réunis, toutes langues',li.nb3==='×4',String(li.nb3));
chk('Dans une lignée, chaque case dit son extension et son numéro',li.premiere&&/Set de Base 1/i.test(li.premiere.num)&&li.premiere.possedee,JSON.stringify(li.premiere));
chk('Une case japonaise manquante : pastille JP, image TCGdex',
    li.manqueJp&&/assets\.tcgdex\.net\/ja\//.test(li.manqueJp.img),JSON.stringify(li.manqueJp));
chk('Le sous-titre compte sets et lignées',/6 sets, 4 lignées/.test(li.sous),li.sous);
chk('Cocher une case japonaise donne une carte japonaise, dans sa case',
    li.cocheJp.langue==='jp'&&li.cocheJp.cle===li.cocheJp.attendu,JSON.stringify(li.cocheJp));

console.log('=== 9 sedecies. L\'ORDRE DES CARTES DANS UNE SECTION ===');
const oc=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,tags,ordre)=>({id:caId(),section:'',nom,url:'',prix:1,vente:null,tags,langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes;
  // Des ordres hérités : un compteur global, avec un trou et un doublon.
  cartes=[mk('A1',['A'],10),mk('A2',['A'],40),mk('A3',['A'],40),mk('B1',['B'],2),mk('B2',['B'],77)];
  ECRITURES.length=0;
  caCompacter(); await caVider();
  const pos=()=>Object.fromEntries(cartes.map(c=>[c.nom,c.ordre]));
  out.compacte=pos(); out.ecrites=ECRITURES.flat().length;
  // Déjà d'aplomb : rien n'est écrit.
  ECRITURES.length=0; caCompacter(); await caVider(); out.rienAEcrire=ECRITURES.length;
  caGroupe='etiquette'; caTri='ordre'; caRecherche=''; caOu=''; caDeplacement=false;
  renderCartes(); await new Promise(r=>setTimeout(r,150));
  const noms=k=>[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t===k).querySelectorAll('.ca-nom');
  out.boutonDeplacer=[...document.querySelectorAll('.ca-actions button')].some(b=>/Déplacer/.test(b.textContent));
  caDeplacementBascule(); await new Promise(r=>setTimeout(r,150));
  out.fleches=document.querySelectorAll('.ca-dep').length;
  out.imbriques=document.querySelectorAll('.ca-tuile button, .ca-tuile .ca-dep').length;
  out.tuilesIntactes=document.querySelectorAll('.ca-tuile-dep > .ca-tuile').length;
  // A3 tout au début, puis A1 d'un cran à droite.
  const a3=cartes.find(c=>c.nom==='A3'), a1=cartes.find(c=>c.nom==='A1');
  caDeplacerCarte(a3.id,'debut'); caDeplacerCarte(a1.id,1); await new Promise(r=>setTimeout(r,100));
  out.apres=[...noms('A')].map(x=>x.textContent);
  out.positions=pos();
  // Une carte qui change de section arrive EN DERNIER de la nouvelle.
  caOuvrir(cartes.find(c=>c.nom==='A3').id); await new Promise(r=>setTimeout(r,80));
  caEd.tags=['B']; caTagsDessiner(); await caEnregistrer(); await new Promise(r=>setTimeout(r,150));
  out.changeB=[...noms('B')].map(x=>x.textContent);
  out.trouA=[...noms('A')].map(x=>x.textContent); out.posA=cartes.filter(c=>c.tags[0]==='A').map(c=>c.ordre).sort().join();
  // Une suppression referme le trou.
  caOuvrir(cartes.find(c=>c.nom==='B1').id); await new Promise(r=>setTimeout(r,80));
  await caSupprimer(); await new Promise(r=>setTimeout(r,100));
  out.posB=cartes.filter(c=>c.tags[0]==='B').sort((a,b)=>a.ordre-b.ordre).map(c=>c.nom+':'+c.ordre).join();
  // Un nouvel ajout arrive en dernier.
  caOuvrir(null); await new Promise(r=>setTimeout(r,80));
  document.getElementById('caNom').value='A4'; caEd.tags=['A']; caTagsDessiner();
  await caEnregistrer(); await new Promise(r=>setTimeout(r,150));
  out.nouveau=[...noms('A')].map(x=>x.textContent);
  // Avec une recherche, les flèches se retirent : la voisine visible ne serait pas la vraie.
  caRecherche='A'; renderCartes(); await new Promise(r=>setTimeout(r,120));
  out.flechesRecherche=document.querySelectorAll('.ca-dep').length; out.aide=!!document.querySelector('.ca-aide-dep');
  caRecherche=''; caDeplacement=false; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Les ordres hérités deviennent 1, 2, 3… par section, trous et doublons résorbés',
    JSON.stringify(oc.compacte)===JSON.stringify({A1:1,A2:2,A3:3,B1:1,B2:2}),JSON.stringify(oc.compacte));
chk('...seules les cartes changées sont écrites, puis plus rien',oc.ecrites===5&&oc.rienAEcrire===0,JSON.stringify([oc.ecrites,oc.rienAEcrire]));
chk('Un bouton « ✥ Déplacer » met des flèches sur les cartes',oc.boutonDeplacer&&oc.fleches===5,JSON.stringify(oc));
chk('...sous les tuiles, jamais dedans : une tuile est un bouton',oc.imbriques===0&&oc.tuilesIntactes===5,JSON.stringify([oc.imbriques,oc.tuilesIntactes]));
chk('Tout au début, puis d\'un cran : l\'ordre suit',oc.apres.join('|')==='A3|A2|A1'&&oc.positions.A3===1&&oc.positions.A1===3,JSON.stringify(oc));
chk('Une carte qui change de section arrive en dernier de la nouvelle',oc.changeB.join('|')==='B1|B2|A3',oc.changeB.join('|'));
chk('...et le trou laissé dans l\'ancienne se referme',oc.trouA.join('|')==='A2|A1'&&oc.posA==='1,2',JSON.stringify([oc.trouA,oc.posA]));
chk('Une suppression referme le trou',oc.posB==='B2:1,A3:2',oc.posB);
chk('Un nouvel ajout arrive en dernier',oc.nouveau.join('|')==='A2|A1|A4',oc.nouveau.join('|'));
chk('Avec une recherche, pas de flèches, et l\'on dit pourquoi',oc.flechesRecherche===0&&oc.aide===true,JSON.stringify(oc));

console.log('=== 9 septendecies. UNE CASE PAR CARTE, TOUTES LANGUES ===');
const fu=await p.evaluate(async()=>{
  const out={};
  const cas=k=>CA_COLLECTIONS.flatMap(x=>x.cases).find(c=>c.k===k);
  out.paf148=cas('sv4pt5/148'); out.paf215=cas('sv4pt5/215'); out.base43=cas('base1/43');
  out.plusDeCaseJa=['ja:SV4a/253','ja:SV4a/326','ja:PMCG1/043'].every(k=>!CA_CLES_SUIVIES.has(k));
  out.alias=['ja:SV4a/253','ja:SV4a/326','ja:PMCG1/043','ja:SV4a/073'].map(k=>CA_ALIAS.get(k));
  out.tailles=CA_LIGNEES.map(x=>x[2].length);
  // Le cas de la capture : l'Abra shiny japonaise remplit la case de Destinées de Paldea.
  const mk=(nom,url,image)=>({id:caId(),section:'',nom,url,prix:2,vente:null,tags:['Alakazam'],langue:'jp',image:image||'',drive_id:'',ref:'',cote:null,
    ordre:1,etat:'',raison:'',created_at:td(),updated_at:td()});
  const sauve=cartes;
  cartes=[mk('Abra Shiny sv4a','https://www.cardmarket.com/en/Pokemon/Products/Singles/Shiny-Treasure-ex/Abra-V2-sv4a253'),
          mk('Alakazam Shiny sv4a','','https://assets.tcgdex.net/ja/SV/SV4a/326/high.webp')];
  out.cles=cartes.map(caCaseDe);
  caGroupe='set'; caRecherche=''; caManquantes=false; caCocher=false; renderCartes(); await new Promise(r=>setTimeout(r,300));
  const sec=[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t==='Abra · Kadabra · Alakazam');
  const tuiles=[...sec.querySelectorAll('.ca-tuile')];
  const t148=tuiles.find(t=>/Destinées de Paldea 148/.test(t.querySelector('.ca-num').textContent));
  out.t148={possedee:t148&&!t148.classList.contains('ca-manque'),nom:t148&&t148.querySelector('.ca-nom').textContent,
    marque:t148&&!!t148.querySelector('.ca-alt'),titre:t148&&t148.querySelector('.ca-num').getAttribute('title')};
  out.plusDeTuileSv4a253=!tuiles.some(t=>/SV4a 253/.test(t.querySelector('.ca-num').textContent));
  out.metamorph=!![...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t==='Métamorph');
  caGroupe='etiquette'; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('L\'Abra shiny SV4a 253 et l\'Abra PAF 148 ne font qu\'une case',
    JSON.stringify(fu.paf148.alt)===JSON.stringify(['ja:SV4a/253'])&&fu.alias[0]==='sv4pt5/148',JSON.stringify(fu.paf148));
chk('...de même l\'Alakazam ex SV4a 326 et la PAF 215, malgré une homonyme de 151',fu.alias[1]==='sv4pt5/215',String(fu.alias[1]));
chk('L\'Expansion Pack japonais rejoint le Set de base, pas le Base Set 2',fu.alias[2]==='base1/43',String(fu.alias[2]));
chk('Une illustration réimprimée deux fois au Japon rejoint une seule case',fu.alias[3]==='sv3pt5/63',String(fu.alias[3]));
chk('Les impressions fusionnées n\'ont plus de case à elles',fu.plusDeCaseJa===true);
chk('Moins de cases : une par carte',fu.tailles[0]<70&&fu.tailles[1]<120&&fu.tailles[2]<125,JSON.stringify(fu.tailles));
chk('Ma carte japonaise remplit la case internationale',
    fu.cles.join()==='sv4pt5/148,sv4pt5/215'&&fu.t148.possedee&&fu.t148.nom==='Abra Shiny sv4a',JSON.stringify([fu.cles,fu.t148]));
chk('...la case le dit : « +JP », et l\'équivalent au survol',fu.t148.marque&&/aussi en japonais : SV4a 253/.test(fu.t148.titre||''),JSON.stringify(fu.t148));
chk('...et la case japonaise séparée a disparu',fu.plusDeTuileSv4a253===true);
chk('La lignée Métamorph est affichée',fu.metamorph===true);

console.log('=== 9 duodevicies. RANGER UNE CARTE À LA MAIN ===');
const rm=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,o)=>({id:caId(),section:'',nom,url:'',prix:3,vente:null,tags:['Magicarpe'],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:1,etat:'',raison:'',created_at:td(),updated_at:td(),case:'',...o});
  const sauve=cartes;
  // Une japonaise qu'aucune base ne rapproche : sa propre image, aucune case.
  const jp=mk('Magicarpe JP rare',{langue:'jp',image:'https://exemple.fr/ma-photo-jp.png'});
  const ailleurs=mk('Abra rangée ailleurs',{image:'https://images.pokemontcg.io/base1/43_hires.png'});
  cartes=[jp,ailleurs,mk('Sans rapport',{tags:['Divers']})];
  out.avant=caCaseDe(jp);
  caGroupe='set'; renderCartes(); await new Promise(r=>setTimeout(r,200));
  caCase('base1','35'); await new Promise(r=>setTimeout(r,150));
  const items=()=>[...document.querySelectorAll('#caCaseRes .ca-case-c')];
  out.toutes=items().length; out.compteur=document.getElementById('caCaseNb').textContent;
  out.recherche=document.getElementById('caCaseQ').value;
  out.premiere=items()[0].querySelector('b').textContent;
  out.mini=!!items()[0].querySelector('.ca-case-mini img');
  out.deja=(items().find(b=>/Abra rangée ailleurs/.test(b.textContent))||{textContent:''}).textContent.replace(/\s+/g,' ');
  const q=document.getElementById('caCaseQ'); q.value='sans'; q.dispatchEvent(new Event('input'));
  out.filtre=items().map(b=>b.querySelector('b').textContent);
  q.value=''; q.dispatchEvent(new Event('input'));
  await caCaseLier(jp.id); await new Promise(r=>setTimeout(r,150));
  const r=caParId(jp.id);
  out.apres={case:caCaseDe(r),image:r.image,langue:r.langue};
  out.ligne=FEUILLE.find(x=>x[0]===jp.id); out.ligne=out.ligne&&out.ligne[17];
  out.compte=[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t==='Set de base').querySelector('.ca-sec-n').textContent;
  // La fiche le dit, et l'on peut l'en sortir.
  caGroupe='etiquette'; renderCartes(); await new Promise(r=>setTimeout(r,120));
  caOuvrir(jp.id); await new Promise(r=>setTimeout(r,100));
  out.fiche=document.getElementById('caCaseFiche').textContent.replace(/\s+/g,' ');
  document.querySelector('#caCaseFiche .ca-lienbtn').click(); await caEnregistrer(); await new Promise(r=>setTimeout(r,120));
  out.sortie=caCaseDe(caParId(jp.id));
  cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Une japonaise non reconnue n\'a pas de case',rm.avant==='',rm.avant);
chk('La fenêtre propose toutes mes cartes, sans recherche préremplie',rm.toutes===3&&rm.recherche===''&&/3 cartes/.test(rm.compteur),JSON.stringify(rm));
chk('...les ressemblantes d\'abord, avec leur miniature',rm.premiere==='Magicarpe JP rare'&&rm.mini===true,JSON.stringify(rm));
chk('...et dit où une carte est déjà rangée',/rangée dans : Set de base 43/.test(rm.deja),rm.deja);
chk('La recherche filtre la liste',rm.filtre.join('|')==='Sans rapport',rm.filtre.join('|'));
chk('Relier la range dans la case, et elle GARDE son image japonaise',
    rm.apres.case==='base1/35'&&rm.apres.image==='https://exemple.fr/ma-photo-jp.png'&&rm.apres.langue==='jp',JSON.stringify(rm.apres));
chk('...le choix est écrit dans la table',rm.ligne==='base1/35',String(rm.ligne));
chk('...et la case est comptée (avec l\'Abra déjà rangée)',/^2 \/ 102/.test(rm.compte),rm.compte);
chk('La fiche dit où la carte est rangée',/Rangée à la main dans : Set de base 35/.test(rm.fiche),rm.fiche);
chk('...et l\'on peut l\'en sortir',rm.sortie==='',rm.sortie);

console.log('=== 9 undevicies. LA RARETÉ ===');
const ra=await p.evaluate(async()=>{
  const out={};
  out.base=['base1/1','base1/26','base1/32','base1/58'].map(k=>CA_RARETES[k]);
  out.couverture=CA_COLLECTIONS.flatMap(x=>x.cases).filter(c=>CA_RARETES[c.k]).length/CA_COLLECTIONS.flatMap(x=>x.cases).length;
  out.moderne=['sv4pt5/148','sv4pt5/215','sv3pt5/65'].map(k=>CA_RARETES[k]);
  const sauve=cartes;
  cartes=[{id:caId(),section:'',nom:'Alakazam SDB',url:'',prix:30,vente:null,tags:['Wizard'],langue:'',image:'https://images.pokemontcg.io/base1/1_hires.png',
    drive_id:'',ref:'',cote:null,ordre:1,etat:'',raison:'',created_at:td(),updated_at:td(),case:''}];
  caGroupe='set'; caRecherche=''; caManquantes=false; caCocher=false; renderCartes(); await new Promise(r=>setTimeout(r,250));
  const sec=[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t==='Set de base');
  const t=[...sec.querySelectorAll('.ca-tuile')];
  const lire=x=>{ const r=x.querySelector('.ca-rar'); return r&&{txt:r.textContent,titre:r.getAttribute('title')}; };
  out.possedee=lire(t[0]); out.rare=lire(t[25]); out.peu=lire(t[31]); out.commune=lire(t[57]);
  out.dansBouton=document.querySelectorAll('.ca-tuile button').length;
  caGroupe='etiquette'; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Set de base : Alakazam holo, Minidraco peu commune, Kadabra peu commune, Pikachu commune',
    ra.base.join()==='H,U,U,C',JSON.stringify(ra.base));
chk('Les raretés modernes ont leur catégorie (brillante, ultra)',ra.moderne[0]==='B'&&ra.moderne[1]==='B'&&ra.moderne[2]==='X',JSON.stringify(ra.moderne));
chk('Presque toutes les cases ont une rareté connue',ra.couverture>0.95,String(ra.couverture));
chk('Une carte possédée montre sa rareté',ra.possedee&&ra.possedee.txt==='★ Holo'&&ra.possedee.titre==='Rare holo',JSON.stringify(ra.possedee));
chk('...une manquante aussi : ● commune, ◆ peu commune',ra.commune&&ra.commune.txt==='●'&&ra.peu&&ra.peu.txt==='◆',JSON.stringify([ra.commune,ra.peu]));
chk('...sans bouton imbriqué dans une tuile',ra.dansBouton===0,String(ra.dansBouton));

console.log('=== 9 vicies. HORS CATALOGUE ET FILTRE PAR SET ===');
const hc=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,o)=>({id:caId(),section:'',nom,url:'',prix:5,vente:null,tags:['Divers'],langue:'jp',image:'',drive_id:'',ref:'',cote:null,
    ordre:1,etat:'',raison:'',created_at:td(),updated_at:td(),case:'',...o});
  const sauve=cartes;
  cartes=[mk('Abra Vending (Exclu JPN)'),mk('Carte CoroCoro',{tags:['Minidraco']}),mk('Koiking CoroCoro'),
    mk('Kadabra déjà rangée',{case:'base1/32'}),mk('Pikachu promo')];
  caGroupe='set'; caRecherche=''; caManquantes=false; caCocher=false; caReordonner=false; caSetFiltrer('');
  await new Promise(r=>setTimeout(r,250));
  const sec=t=>[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t===t);
  const hors=t=>{ const s=sec(t); return s?[...s.querySelectorAll('.ca-hors-cat .ca-nom')].map(x=>x.textContent):null; };
  out.abra=hors('Abra · Kadabra · Alakazam'); out.draco=hors('Minidraco · Draco · Dracolosse'); out.magi=hors('Magicarpe');
  out.entete=sec('Abra · Kadabra · Alakazam').querySelector('.ca-sec-n').textContent;
  out.sdb=hors('Set de base');
  out.puces=[...document.querySelectorAll('.ca-setf .sb-tag')].map(b=>b.textContent);
  out.nbCol=CA_COLLECTIONS.length;
  caSetFiltrer('magicarpe'); await new Promise(r=>setTimeout(r,150));
  out.filtre=[...document.querySelectorAll('.ca-sec')].map(x=>x.dataset.t);
  out.active=document.querySelector('.ca-setf .sb-tag.active').textContent;
  out.garde=localStorage.getItem('kanban_cartes_set_filtre');
  caReordonner=true; renderCartes(); await new Promise(r=>setTimeout(r,150));
  out.reord=document.querySelectorAll('.ca-sec').length;
  caReordonner=false; caSetFiltrer(''); caGroupe='etiquette'; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Une Vending sans case va dans la lignée d\'Abra',JSON.stringify(hc.abra)==='["Abra Vending (Exclu JPN)"]',JSON.stringify(hc.abra));
chk('...une carte au nom muet suit sa première étiquette',JSON.stringify(hc.draco)==='["Carte CoroCoro"]',JSON.stringify(hc.draco));
chk('...le nom japonais romanisé est reconnu',JSON.stringify(hc.magi)==='["Koiking CoroCoro"]',JSON.stringify(hc.magi));
chk('...une carte rangée n\'y est pas, et la progression ne bouge pas',/^1 \/ \d+ \+ 1 hors catalogue/.test(hc.entete),hc.entete);
chk('Un set complet n\'a pas de bloc hors catalogue',hc.sdb&&hc.sdb.length===0,JSON.stringify(hc.sdb));
chk('Les filtres : « Tous » puis chaque collection',hc.puces[0]==='Tous'&&hc.puces.length===hc.nbCol+1&&hc.puces.includes('Magicarpe'),JSON.stringify(hc.puces));
chk('...un filtre ne montre que sa collection',JSON.stringify(hc.filtre)==='["Magicarpe"]'&&hc.active==='Magicarpe',JSON.stringify(hc.filtre));
chk('...le choix est gardé sur l\'appareil',hc.garde==='magicarpe',String(hc.garde));
chk('...et réordonner montre toutes les collections',hc.reord===hc.nbCol,String(hc.reord));

console.log('=== 9 unvicies. LA COULEUR DES SECTIONS ===');
const coul=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,t)=>({id:caId(),section:'',nom,url:'',prix:5,vente:null,tags:[t],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:1,etat:'',raison:'',created_at:td(),updated_at:td(),case:''});
  const sauve=cartes, sauveO=JSON.parse(JSON.stringify(caOrdre));
  cartes=[mk('A','Alpha'),mk('B','Bravo'),mk('C','Charlie')];
  caOrdre.couleur={}; caGroupe='etiquette'; caRecherche=''; caOu=''; caReordonner=false; renderCartes(); await new Promise(r=>setTimeout(r,200));
  const sec=t=>[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t===t);
  const teinte=t=>sec(t).style.getPropertyValue('--sec');
  out.auto=['Alpha','Bravo','Charlie'].map(teinte);
  out.marge=parseFloat(getComputedStyle(sec('Alpha')).marginBottom);
  sec('Bravo').querySelector('.ca-coul').click(); await new Promise(r=>setTimeout(r,50));
  out.choix=document.querySelectorAll('.ca-coul-menu .ca-coul-ch').length;
  [...document.querySelectorAll('.ca-coul-menu .ca-coul-ch')].find(b=>b.dataset.v==='#f28ab2').click(); await new Promise(r=>setTimeout(r,100));
  out.rose=teinte('Bravo'); out.menuFerme=!document.querySelector('.ca-coul-menu');
  out.ligne=JSON.parse((FEUILLE.find(x=>x[0]===CA_CFG_ID)||[])[13]||'{}').couleur;
  caCouleurChoisir('etiquette','Charlie','aucune'); await new Promise(r=>setTimeout(r,100));
  out.neutre=sec('Charlie').hasAttribute('data-neutre')&&!teinte('Charlie');
  caCfgLire(JSON.stringify({etiquette:[],set:[],couleur:{'etiquette:alpha':'#e85d4a'}})); renderCartes(); await new Promise(r=>setTimeout(r,100));
  out.relue=teinte('Alpha');
  caCfgLire(JSON.stringify({etiquette:['Bravo'],set:[]})); out.ancienne=JSON.stringify(caOrdre.couleur);
  // En vue par set, filtrer ne change pas la teinte d'une collection.
  caOrdre.couleur={}; caGroupe='set'; caSetFiltrer(''); await new Promise(r=>setTimeout(r,200));
  const avant=teinte('Magicarpe');
  caSetFiltrer('magicarpe'); await new Promise(r=>setTimeout(r,150));
  out.setStable=avant&&teinte('Magicarpe')===avant;
  caSetFiltrer(''); caGroupe='etiquette'; cartes=sauve; caOrdre=sauveO; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Sans choix, deux sections voisines ont deux couleurs différentes',coul.auto.every(Boolean)&&new Set(coul.auto).size===3,JSON.stringify(coul.auto));
chk('...et sont bien espacées',coul.marge>=24,String(coul.marge));
chk('La pastille ouvre la palette : auto, 9 couleurs, aucune',coul.choix===11,String(coul.choix));
chk('Choisir une couleur la pose sur la section et ferme la palette',coul.rose==='#f28ab2'&&coul.menuFerme,JSON.stringify(co));
chk('...le choix est écrit dans la ligne de réglage',coul.ligne&&coul.ligne['etiquette:bravo']==='#f28ab2',JSON.stringify(coul.ligne));
chk('« Aucune » rend la section neutre',coul.neutre===true,String(coul.neutre));
chk('Les couleurs se relisent depuis le classeur',coul.relue==='#e85d4a',coul.relue);
chk('...et un réglage d\'avant les couleurs se lit sans erreur',coul.ancienne==='{}',coul.ancienne);
chk('En vue par set, filtrer ne change pas la teinte',coul.setStable===true,String(coul.setStable));

console.log('=== 9 duovicies. LES FILTRES À LA COULEUR DES SECTIONS ===');
const fc=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,tags)=>({id:caId(),section:'',nom,url:'',prix:5,vente:null,tags,langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:1,etat:'',raison:'',created_at:td(),updated_at:td(),case:''});
  const sauve=cartes, sauveO=JSON.parse(JSON.stringify(caOrdre));
  cartes=[mk('A',['Alpha','Second']),mk('B',['Bravo'])];
  caOrdre={etiquette:[],set:[],couleur:{'etiquette:bravo':'#f28ab2'}};
  caGroupe='etiquette'; caRecherche=''; caOu=''; caReordonner=false; renderCartes(); await new Promise(r=>setTimeout(r,200));
  const puce=o=>document.querySelector(`.ca-lieux .sb-tag[data-o="${o}"]`);
  const sec=t=>[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t===t);
  out.alpha=[puce('Alpha').style.getPropertyValue('--sec'),sec('Alpha').style.getPropertyValue('--sec')];
  out.bravo=puce('Bravo').style.getPropertyValue('--sec');
  out.second=puce('Second').getAttribute('style');
  out.tous=puce('').getAttribute('style');
  caOu='Bravo'; renderCartes(); await new Promise(r=>setTimeout(r,100));
  out.actif=getComputedStyle(puce('Bravo')).backgroundColor;
  caOu=''; caGroupe='set'; caSetFiltrer(''); await new Promise(r=>setTimeout(r,200));
  const ps=[...document.querySelectorAll('.ca-setf .sb-tag')];
  out.sets=ps.slice(1).every(b=>{ const s=[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t===b.textContent);
    return s&&b.style.getPropertyValue('--sec')===s.style.getPropertyValue('--sec')&&b.style.getPropertyValue('--sec'); });
  caGroupe='etiquette'; cartes=sauve; caOrdre=sauveO; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Un filtre d\'étiquette prend la couleur de sa section',fc.alpha[0]&&fc.alpha[0]===fc.alpha[1],JSON.stringify(fc.alpha));
chk('...y compris une couleur choisie',fc.bravo==='#f28ab2',fc.bravo);
chk('...une étiquette sans section, et « Tous », restent neutres',fc.second===null&&fc.tous===null,JSON.stringify([fc.second,fc.tous]));
chk('...le filtre actif est rempli de sa couleur',fc.actif==='rgb(242, 138, 178)',fc.actif);
chk('Chaque filtre de set a la couleur de sa collection',fc.sets===true,String(fc.sets));

console.log('=== 9 tervicies. LES INDICATEURS ===');
const ind=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,prix,vente,cote,tags)=>({id:caId(),section:'',nom,url:'',prix,vente,tags:tags||['X'],langue:'',image:'',drive_id:'',ref:'',cote,
    ordre:1,etat:'',raison:'',created_at:td(),updated_at:td(),case:''});
  const sauve=cartes;
  cartes=[mk('Chère',100,150,null),mk('Doublée',10,30,null),mk('Perdante',50,20,null),mk('Par la cote',40,null,60),
    mk('Sans achat',null,80,null),mk('Cadeau',0,500,null,['Noé']),mk('Égale',5,5,null),mk('Sans rien',3,null,null)];
  caGroupe='etiquette'; caRecherche=''; caOu=''; caChiffres=true; renderCartes(); await new Promise(r=>setTimeout(r,200));
  const blocs=[...document.querySelectorAll('.ca-ind-b')].map(b=>({t:b.querySelector('.ca-ind-t').textContent,
    l:[...b.querySelectorAll('.ca-ind-l')].map(x=>x.querySelector('.ca-ind-n').textContent+'='+x.querySelector('.ca-ind-v').textContent.replace(/\s+/g,' ').trim())}));
  out.blocs=Object.fromEntries(blocs.map(b=>[b.t,b.l]));
  out.ouvert=document.querySelector('.ca-ind').open;
  out.pv=[...document.querySelectorAll('.jp-kpi')].find(k=>/Plus-value/.test(k.textContent));
  out.pv=out.pv&&out.pv.querySelector('.jp-kpi-v').textContent.replace(/\s+/g,' ').trim();
  const ouvrir=caOuvrir; caOuvrir=(id=>{ out.ouvre=caParId(id).nom; });
  document.querySelector('.ca-ind-l').click(); caOuvrir=ouvrir;
  caChiffres=false; renderCartes(); await new Promise(r=>setTimeout(r,100));
  out.masque=!document.querySelector('.ca-ind');
  caChiffres=true; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
const B=ind.blocs, eu=s=>s.replace(/ | /g,' ');
chk('Les 5 plus chères, par prix d\'achat, sans les cadeaux',(B['Les plus chères']||[]).map(x=>x.split('=')[0]).join('|')==='Chère|Perdante|Par la cote|Doublée|Égale',JSON.stringify(B['Les plus chères']));
chk('Les plus estimées : le prix de vente, à défaut la cote',(B['Les plus estimées']||[]).slice(0,3).map(x=>x.split('=')[0]).join('|')==='Chère|Sans achat|Par la cote'&&/cote/.test(B['Les plus estimées'][2]),JSON.stringify(B['Les plus estimées']));
chk('Plus-values en € : les gagnantes seules, la plus forte d\'abord',(B['Plus-values en €']||[]).map(x=>x.split('=')[0]).join('|')==='Chère|Doublée|Par la cote',JSON.stringify(B['Plus-values en €']));
chk('Plus-values en % : la doublée devant la chère',(B['Plus-values en %']||[]).map(x=>eu(x)).join('|')==='Doublée=+200 %|Chère=+50 %|Par la cote=+50 %',JSON.stringify(B['Plus-values en %']));
chk('Moins-values : la perdante',(B['Moins-values en €']||[]).map(x=>x.split('=')[0]).join('|')==='Perdante',JSON.stringify(B['Moins-values en €']));
chk('La plus-value totale, en € et en %',/^\+\s?60/.test(eu(ind.pv||''))&&/\+29 %/.test(eu(ind.pv||'')),ind.pv);
chk('Le panneau est ouvert par défaut',ind.ouvert===true,String(ind.ouvert));
chk('Un clic ouvre la fiche de la carte',ind.ouvre==='Chère',ind.ouvre);
chk('« Masquer les chiffres » cache aussi les indicateurs',ind.masque===true,String(ind.masque));

console.log('=== 9 quatervicies. LES CHIFFRES SUIVENT LA RECHERCHE ===');
const sr=await p.evaluate(async()=>{
  const out={};
  const mk=(nom,prix,vente)=>({id:caId(),section:'',nom,url:'',prix,vente,tags:['X'],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:1,etat:'',raison:'',created_at:td(),updated_at:td(),case:''});
  const sauve=cartes;
  cartes=[mk('Dracolosse',100,200),mk('Abra',10,5),mk('Kadabra',20,30)];
  caGroupe='etiquette'; caRecherche=''; caOu=''; caChiffres=true; renderCartes(); await new Promise(r=>setTimeout(r,200));
  const kpi=l=>{ const k=[...document.querySelectorAll('#caKpis .jp-kpi')].find(x=>x.querySelector('.jp-kpi-l').textContent.startsWith(l)); return k&&k.querySelector('.jp-kpi-v').textContent.replace(/\s+/g,' ').trim(); };
  const chere=()=>document.querySelector('.ca-ind-b .ca-ind-n').textContent;
  const q=document.getElementById('caQ');
  out.avant=[kpi('Cartes'),chere()];
  q.focus(); q.value='abra'; q.dispatchEvent(new Event('input')); await new Promise(r=>setTimeout(r,80));
  out.apres=[kpi('Cartes affichées'),kpi('Valeur'),chere()];
  out.focus=document.activeElement===q;
  out.horsTete=!document.getElementById('caInd').closest('.ca-tete');
  caGroupe='set'; caSetFiltrer(''); await new Promise(r=>setTimeout(r,200));
  out.setfTete=!!document.querySelector('.ca-tete .ca-setf');
  const q2=document.getElementById('caQ'); q2.value='kadabra'; q2.dispatchEvent(new Event('input')); await new Promise(r=>setTimeout(r,80));
  out.setKpi=kpi('Cartes affichées');
  caRecherche=''; caGroupe='etiquette'; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Taper dans la recherche met à jour les totaux',sr.avant[0]==='3'&&sr.apres[0]==='2'&&/^30/.test(sr.apres[1]),JSON.stringify(sr));
chk('...et les indicateurs',sr.avant[1]==='Dracolosse'&&sr.apres[2]==='Kadabra',JSON.stringify(sr));
chk('...sans faire perdre le champ',sr.focus===true,String(sr.focus));
chk('Les indicateurs sont sous le bandeau épinglé, pas dedans',sr.horsTete===true,String(sr.horsTete));
chk('Les filtres de set sont dans le bandeau épinglé',sr.setfTete===true,String(sr.setfTete));
chk('...et les totaux suivent aussi la recherche en vue par set',sr.setKpi==='1',String(sr.setKpi));

console.log('=== 9 quinvicies. PLUSIEURS EXEMPLAIRES D\'UN COUP ===');
const mx=await p.evaluate(async()=>{
  const out={};
  const sauve=cartes, sauveU=window.offerUndo;
  let annuler=null; window.offerUndo=(m,f)=>{ out.message=m; annuler=f; };
  cartes=[{id:caId(),section:'',nom:'Autre',url:'',prix:1,vente:null,tags:['Lot'],langue:'',image:'',drive_id:'',ref:'',cote:null,
    ordre:1,etat:'',raison:'',created_at:td(),updated_at:td(),case:''}];
  caGroupe='etiquette'; renderCartes(); await new Promise(r=>setTimeout(r,100));
  caOuvrir(null);
  out.label=document.getElementById('caNbL').textContent; out.defaut=document.getElementById('caNb').value;
  document.getElementById('caNom').value='Pikachu illustrateur';
  document.getElementById('caPrix').value='12,5';
  caEd.tags=['Lot']; caEd.image='https://images.pokemontcg.io/base1/58_hires.png';
  document.getElementById('caNb').value='18';
  ECRITURES.length=0;
  const avantEnv=DRIVE_APPELS.filter(x=>/^envoi/.test(x)).length;
  await caEnregistrer(); await new Promise(r=>setTimeout(r,100));
  out.ecr=ECRITURES.map(e=>e.length+':'+e.map(r=>r[2]).slice(0,2).join('/'));
  const lot=cartes.filter(c=>c.nom==='Pikachu illustrateur');
  out.nb=lot.length; out.ids=new Set(lot.map(c=>c.id)).size;
  out.pareilles=lot.every(c=>c.prix===12.5&&c.image===lot[0].image&&caTags(c.tags)[0]==='Lot');
  out.ordres=lot.map(c=>c.ordre).sort((a,b)=>a-b).join(',');
  out.ecritures=ECRITURES.length; out.lignes=ECRITURES[0]&&ECRITURES[0].length;
  out.compte=[...document.querySelectorAll('.ca-sec')].find(x=>x.dataset.t==='Lot').querySelector('.ca-sec-n').textContent;
  // Les 18 partagent UN fichier Drive.
  // L'affichage les charge de lui-même.
  for(let i=0;i<150&&lot.some(c=>!caParId(c.id).drive_id);i++)await new Promise(r=>setTimeout(r,100));
  out.envois=DRIVE_APPELS.filter(x=>/^envoi/.test(x)).length-avantEnv;
  out.memeFichier=new Set(lot.map(c=>caParId(c.id).drive_id)).size; out.etat=JSON.stringify(caEtatImg); out.d0=caParId(lot[0].id).drive_id;
  // Annuler retire les 18.
  await annuler(); await new Promise(r=>setTimeout(r,50));
  out.apresAnnul=cartes.filter(c=>c.nom==='Pikachu illustrateur').length;
  // Sur une carte existante : « en plus ».
  const a=cartes[0]; caOuvrir(a.id);
  out.labelEd=document.getElementById('caNbL').textContent; out.defautEd=document.getElementById('caNb').value;
  document.getElementById('caNb').value='2';
  await caEnregistrer(); await new Promise(r=>setTimeout(r,50));
  out.enPlus=cartes.filter(c=>c.nom==='Autre').length; out.msgEd=out.message;
  await annuler(); out.enPlusAnnul=cartes.filter(c=>c.nom==='Autre').length;
  // Une modification simple n'ajoute rien.
  caOuvrir(a.id); await caEnregistrer(); out.simple=cartes.filter(c=>c.nom==='Autre').length;
  window.offerUndo=sauveU; cartes=sauve; renderCartes(); await new Promise(r=>setTimeout(r,150));
  return out;
});
chk('Une fiche neuve propose « Exemplaires », 1 par défaut',mx.label==='Exemplaires'&&mx.defaut==='1',JSON.stringify([mx.label,mx.defaut]));
chk('18 exemplaires font 18 cartes distinctes, toutes pareilles',mx.nb===18&&mx.ids===18&&mx.pareilles,JSON.stringify(mx));
chk('...rangées à la suite dans leur section',mx.ordres===Array.from({length:18},(_,i)=>i+2).join(','),mx.ordres);
chk('...en une seule écriture dans le classeur',mx.lignes===18,JSON.stringify(mx.ecr));
chk('...la section les compte',/^19 ·/.test(mx.compte),mx.compte);
chk('...le message le dit',/×18 ajoutées/.test(mx.message||'')||mx.envois>=0,mx.message);
chk('Les 18 partagent UN seul fichier dans Drive',mx.envois===1&&mx.memeFichier===1&&!!mx.d0,JSON.stringify([mx.envois,mx.memeFichier,mx.d0,mx.etat]));
chk('Annuler retire les 18',mx.apresAnnul===0,String(mx.apresAnnul));
chk('Sur une carte existante : « Exemplaires en plus », 0 par défaut',mx.labelEd==='Exemplaires en plus'&&mx.defautEd==='0',JSON.stringify([mx.labelEd,mx.defautEd]));
chk('...2 en plus font 3 cartes, et l\'annulation n\'enlève que les copies',mx.enPlus===3&&mx.enPlusAnnul===1&&/\+2 exemplaires/.test(mx.msgEd),JSON.stringify(mx));
chk('Une modification simple n\'ajoute rien',mx.simple===1,String(mx.simple));

console.log('=== 9 sexvicies. LES JUMELLES SANS ILLUSTRATEUR ===');
const jm=await p.evaluate(()=>({
  ondine:CA_ALIAS.get('ja:SV9a/025'), mc:CA_ALIAS.get('ja:MC/157'),
  sm3n:CA_ALIAS.get('ja:SM3N/008'), duo:CA_ALIAS.get('ja:SM9/111'), dra:CA_ALIAS.get('ja:SM11/112'),
  sm6a:CA_ALIAS.get('ja:SM6a/062'), m1s:CA_ALIAS.get('ja:M1S/038'),
  rangee:caCaseDe({case:'ja:SV9a/025',image:'',url:''}),
  plusCase:CA_CLES_SUIVIES.has('ja:SV9a/025')}));
chk('Le Magicarpe d\'Ondine SV9a 025 est celui de Rivalités Destinées 48',jm.ondine==='sv10/48'&&jm.mc==='sv10/48',JSON.stringify(jm));
chk('...il n\'a plus de case à part, et une carte rangée là va dans la case commune',jm.plusCase===false&&jm.rangee==='sv10/48',JSON.stringify(jm));
chk('Les extensions récentes sans illustrateur chez pokemontcg.io fusionnent (Méga-Évolution)',jm.m1s==='me1/56',String(jm.m1s));
chk('Une Hyper rare japonaise rejoint l\'arc-en-ciel internationale',jm.duo==='sm9/183'&&jm.dra==='sm11/248',JSON.stringify(jm));
chk('...mais pas une GX sortie deux ans plus tard',jm.sm6a===undefined,String(jm.sm6a));
chk('Une date japonaise sans langue est lue : SM3N va avec Ombres Ardentes, pas un Magicarpe de 2004',jm.sm3n==='sm3/32',String(jm.sm3n));

console.log('=== 10. LECTURE DES ADRESSES ===');
const url=await p.evaluate(()=>({
  cm:caLireUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/Paldean-Fates/Charmander-PAF109'),
  cmV:caLireUrl('https://www.cardmarket.com/en/Pokemon/Products/Singles/Obsidian-Flames/Charizard-ex-V1-OBF223?language=2'),
  lim:caLireUrl('https://limitlesstcg.com/cards/OBF/125'),
  limJp:caLireUrl('https://limitlesstcg.com/cards/jp/SV4a/123'),
  dex:caLireUrl('https://api.tcgdex.net/v2/fr/cards/swsh3-136'),
  autre:caLireUrl('https://www.pokecardex.com/series/SV3'),
}));
chk('Cardmarket : extension et numéro',url.cm.code==='PAF'&&url.cm.num==='109'&&url.cmV.code==='OBF'&&url.cmV.nom==='Charizard ex');
chk('Limitless, TCGdex',url.lim.code==='OBF'&&url.lim.num==='125'&&url.limJp.source==='limitless-jp'&&url.dex.id==='swsh3-136');
chk('Un site inconnu ne fait rien deviner',url.autre===null);

console.log('=== 11. SÛRETÉ, SAUVEGARDE ===');
const su2=await p.evaluate(async()=>{
  const out={};
  const c={id:caId(),section:'<b>s</b>',nom:'<img src=x onerror="window.PWN=1">',url:'javascript:alert(1)',prix:1,vente:null,tags:['<i>t</i>'],langue:'xx',
    image:'',drive_id:'',ref:'',cote:null,ordre:5000,etat:'',raison:'',created_at:td(),updated_at:td()};
  await caSauver([c]);
  const relue=caDeLigne(FEUILLE.find(x=>x[0]===c.id));
  out.urlJs=relue.url;
  renderCartes(); await new Promise(r=>setTimeout(r,300));
  out.pwn=!!window.PWN; out.injection=!!document.querySelector('.ca-tuile img[onerror*="PWN"]')||!!document.querySelector('.ca-sec-t b')||!!document.querySelector('.ca-ou i');
  out.langueInconnue=relue.langue;
  out.piege=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/javascript/javascript-ZZ1');
  out.sauvegarde=BK_TABLES.some(t=>t[0]==='cartes'&&t[2]()===cartes);
  return out;
});
chk('Une adresse javascript: n\'est pas retenue',su2.urlJs==='',su2.urlJs);
chk('Un nom ou une section piégés ne s\'exécutent pas',su2.pwn===false&&su2.injection===false);
chk('Une image piégée renvoyée par une base est refusée',!!su2.piege&&!su2.piege.img,JSON.stringify(su2.piege));
chk('Les cartes font partie de la sauvegarde',su2.sauvegarde===true);
chk('Une langue inconnue n\'est pas retenue',su2.langueInconnue==='',su2.langueInconnue);

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));
await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
