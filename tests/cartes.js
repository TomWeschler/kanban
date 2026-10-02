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
  window.CAPRICE={}; window.EN_VOL=0; window.EN_VOL_MAX=0;
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
    if(u.startsWith('https://api.tcgdex.net/v2/fr/cards?name=')){
      APPELS.push(u);
      const n=decodeURIComponent(u.split('name=')[1]);
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
  out.ongletCree=!!FEUILLE&&FEUILLE[0].join()==='id,section,nom,url,prix,vente,etiquettes,image,drive_id,ref,cote,ordre,etat,raison,created_at,updated_at,langue';
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
    sec:document.getElementById('caSec').value,tags:document.getElementById('caTagsListe').textContent};
  document.getElementById('caPrix').value='7,5';
  await caEnregistrer();
  out.maj=ECRITURES.map(e=>e.map(r=>[r[0],r[2],r[4]]));
  // b. Annuler.
  await ANNUL[ANNUL.length-1].fn();
  out.annule=caDeLigne(FEUILLE.find(x=>x[0]===c.id)).prix;
  // c. Ajouter, dans une section nouvelle, avec une adresse : l'image est
  //    trouvée dans la fiche même, et pas cherchée une seconde fois.
  caOuvrir(null); await new Promise(r=>setTimeout(r,100));
  document.getElementById('caSec').value='Nouvelle section';
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
  out.ajout={section:n.section,image:n.image,drive:n.drive_id,ordre:n.ordre,max:Math.max(...cartes.map(x=>x.ordre))};
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
chk('La fiche est remplie',ge.fiche.nom==='Limonde AR'&&ge.fiche.prix==='3'&&ge.fiche.sec==='Cadeau Noé'&&/Classeur/.test(ge.fiche.tags),JSON.stringify(ge.fiche));
chk('Modifier un prix écrit UNE ligne, la sienne',ge.maj.length===1&&ge.maj[0].length===1&&ge.maj[0][0][2]==='7.5',JSON.stringify(ge.maj));
chk('Annuler rend le prix d\'avant',ge.annule===3,String(ge.annule));
chk('Une adresse collée dans la fiche est résolue sur-le-champ',/Trouvée depuis l'adresse · Scarlet & Violet Black Star Promos 121/.test(ge.apercuInfo),ge.apercuInfo);
chk('...et ce résultat est enregistré, sans seconde recherche',
    /svp\/121_hires/.test(ge.ajout.image)&&ge.requetesFiche===1&&ge.recherchesApres===0&&ge.baseFiche===0,JSON.stringify(ge));
chk('...puis archivé',/^d/.test(ge.ajout.drive),ge.ajout.drive);
chk('Une nouvelle carte se range en dernier',ge.ajout.ordre===ge.ajout.max);
chk('Une section nouvelle apparaît',ge.sections.includes('Nouvelle section'),ge.sections.join('|'));
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
  out.requetes=APPELS.map(u=>decodeURIComponent(u.split('name=')[1]));
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
chk('Prix de vente à droite de l\'étiquette',bp.gagne.map(e=>e.c.split(' ')[0]).join()==='ca-prix,ca-ou,ca-vente'&&bp.gagne[2].x>bp.gagne[1].x);
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
  const mk=(nom,url)=>({id:caId(),section:'File',nom,url,prix:1,vente:null,tags:[],langue:'',image:'',drive_id:'',ref:'',cote:null,
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
  caRecherche=''; caGroupe='section'; renderCartes(); await new Promise(r=>setTimeout(r,300));
  const t=document.querySelector(`.ca-tuile[data-k="${c.id}"]`);
  const pas=t.querySelector('.ca-lg');
  out.pastille=pas&&{texte:pas.textContent,fond:getComputedStyle(pas).backgroundColor,
    haut:pas.getBoundingClientRect().top-t.getBoundingClientRect().top,
    droite:t.getBoundingClientRect().right-pas.getBoundingClientRect().right};
  out.etiquettesTuile=[...t.querySelectorAll('.ca-ou')].map(e=>e.textContent);
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
  out.memorise=localStorage.getItem('kanban_cartes_groupe');
  caGrouper('section');
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
chk('Toutes les étiquettes s\'affichent sur la carte',lg.etiquettesTuile.join('|')==='Alakazam|Classeur|Gradée|PSA 9',lg.etiquettesTuile.join('|'));
chk('Filtrer par une étiquette qui n\'est pas la première',lg.filtre.join('|')==='Limonde AR',lg.filtre.join('|'));
chk('Grouper par première étiquette',lg.groupes.includes('Alakazam')&&lg.groupes.includes('Noé')&&lg.groupes[lg.groupes.length-1]==='Sans étiquette',lg.groupes.join('|'));
chk('...une carte n\'apparaît que dans le groupe de sa PREMIÈRE étiquette',!lg.groupes.includes('Gradée')&&lg.dansGradee.length===0,lg.groupes.join('|'));
chk('...groupes par ordre alphabétique',(()=>{ const g=lg.groupes.slice(0,-1); return g.join()===g.slice().sort((a,b)=>a.localeCompare(b,'fr')).join(); })(),lg.groupes.join('|'));
chk('Le choix du regroupement est mémorisé',lg.memorise==='etiquette');

console.log('=== 9 quater. UN ONGLET DE LA VERSION PRÉCÉDENTE ===');
const ancien=await p.evaluate(async()=>{
  // L'onglet tel que la v1.68.0 l'a créé : colonne « ou », pas de langue.
  FEUILLE=[['id','section','nom','url','prix','vente','ou','image','drive_id','ref','cote','ordre','etat','raison','created_at','updated_at'],
           ['caV1','S','Ancienne','', '2','','Noé','','','','','1','','','x','x']];
  cartesLoaded=false; await loadCartes();
  const c=cartes.find(x=>x.id==='caV1');
  return {entete:FEUILLE[0].join(),tags:c&&c.tags,langue:c&&c.langue};
});
chk('L\'en-tête d\'un ancien onglet est mis à jour',/,etiquettes,.*,langue$/.test(ancien.entete),ancien.entete);
chk('...et son « ou » devient la première étiquette',(ancien.tags||[]).join()==='Noé'&&ancien.langue==='',JSON.stringify(ancien));

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
