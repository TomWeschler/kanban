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
  CA_PAUSE=20; CA_DELAI_ECR=30;
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
  window.APPELS=[]; window.IMAGES=[]; window.SATURE={};
  window.fetch=async u=>{
    u=String(u);
    const rep=j=>({ok:true,status:200,json:async()=>j});
    if(u.startsWith('https://api.pokemontcg.io/v2/cards')){
      APPELS.push(u);
      const q=decodeURIComponent(u.split('q=')[1]||'');
      const m=/ptcgoCode:(SAT[A-Z])/.exec(q);
      if(m&&SATURE[m[1]]-->0)return {ok:false,status:429,json:async()=>null};
      if(m)return rep({data:[{number:'1',set:{name:'X'},images:{small:`https://images.pokemontcg.io/x/${m[1]}.png`,large:`https://images.pokemontcg.io/x/${m[1]}_hires.png`}}]});
      if(/set\.ptcgoCode:OBF number:223/.test(q))return rep({data:[{number:'223',set:{name:'Obsidian Flames'},
        images:{small:'https://images.pokemontcg.io/sv3/223.png',large:'https://images.pokemontcg.io/sv3/223_hires.png'},
        cardmarket:{prices:{trendPrice:23.4}}}]});
      if(/set\.id:svp number:121/.test(q))return rep({data:[{number:'121',set:{name:'SV Promos'},
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
  out.ongletCree=!!FEUILLE&&FEUILLE[0].join()==='id,section,nom,url,prix,vente,ou,image,drive_id,ref,cote,ordre,etat,raison,created_at,updated_at';
  out.propose=document.getElementById('caWrap').textContent.replace(/\s+/g,' ');
  const avantNote=caNoteDe().content;
  APPELS.length=0;
  await caImporter();
  out.lignes=FEUILLE.length-1;
  out.uneEcriture=ECRITURES.length===1;
  out.noteIntacte=caNoteDe().content===avantNote;
  const l=FEUILLE.slice(1).map(caDeLigne);
  out.cartes=l.map(c=>({nom:c.nom,section:c.section,prix:c.prix,vente:c.vente,ou:c.ou,image:c.image,ordre:c.ordre}));
  out.dejaTrouvee=l.find(c=>c.nom==='Déjà trouvée');
  return out;
});
chk('L\'onglet « cartes » est créé, avec son en-tête',im.ongletCree===true);
chk('La page propose d\'importer les 6 cartes de la note',/contient 6 cartes/.test(im.propose)&&/Importer 6 cartes/.test(im.propose),im.propose);
chk('L\'import écrit une ligne par carte, en une seule écriture',im.lignes===6&&im.uneEcriture,JSON.stringify(im.lignes));
chk('La note n\'est pas modifiée',im.noteIntacte===true);
chk('Chaque carte garde sa section',im.cartes.map(c=>c.section).join('|')==='Cadeau Noé|Cadeau Noé|Cadeau Noé|Cadeau Noé|À vendre|À vendre',im.cartes.map(c=>c.section).join('|'));
chk('...son nom, ses prix et son lieu',
    im.cartes[2].nom==='Limonde AR'&&im.cartes[2].prix===3&&im.cartes[2].vente===4&&im.cartes[2].ou==='Classeur'&&im.cartes[3].prix===6.5,JSON.stringify(im.cartes[2]));
chk('...et l\'ordre de la note',im.cartes.map(c=>c.ordre).join()==='1,2,3,4,5,6');
chk('La ligne Total n\'est pas importée comme une carte',!im.cartes.some(c=>/total/i.test(c.nom)));
chk('Ce que la v1.67 avait trouvé est repris : aucune recherche à refaire',
    /sv4pt5\/109_hires/.test(im.dejaTrouvee.image)&&im.dejaTrouvee.cote===2.5,JSON.stringify(im.dejaTrouvee));
chk('Une adresse qui est une image devient l\'image',/sv3\/1_hires/.test(im.cartes[3].image),im.cartes[3].image);

console.log('=== 2. PREMIÈRE OUVERTURE : CHERCHER, AFFICHER, ARCHIVER ===');
await attendre(1500);
const pr=await p.evaluate(async()=>{
  const out={};
  await caVider();
  const l=()=>FEUILLE.slice(1).map(caDeLigne);
  const par=n=>l().find(c=>c.nom===n);
  out.recherches=APPELS.slice();
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
chk('Une seule recherche, pour la seule carte qui en avait besoin',
    pr.recherches.length===1&&/OBF%20number%3A223/.test(pr.recherches[0]),JSON.stringify(pr.recherches));
chk('Le résultat est écrit dans la table : image, extension, cote',
    /sv3\/223_hires/.test(pr.dracau.image)&&pr.dracau.ref==='Obsidian Flames 223'&&pr.dracau.cote===23.4,JSON.stringify(pr.dracau));
chk('L\'image est archivée dans Drive, et la table le sait',/^d\d+$/.test(pr.dracau.drive_id),pr.dracau.drive_id);
chk('...dans le dossier « Kanban — Cartes », créé une fois',
    pr.fichier&&pr.fichier.parent==='dossier1'&&pr.dossier.filter(x=>x==='dossier+').length===1,JSON.stringify([pr.fichier,pr.dossier]));
chk('...sous un nom lisible',/^Dracaufeu ex — ca/.test(pr.fichier&&pr.fichier.nom||''),pr.fichier&&pr.fichier.nom);
chk('...réduite à 500 pixels de large, en WebP',pr.largeur===500&&pr.fichier.type==='image/webp',JSON.stringify([pr.largeur,pr.fichier&&pr.fichier.type]));
chk('...et bien plus légère que l\'original',pr.fichier.taille<pr.tailleOrigine,JSON.stringify([pr.fichier.taille,pr.tailleOrigine]));
chk('...et gardée dans le navigateur',pr.idb===true);
chk('L\'image reprise de la v1.67 est archivée sans recherche',/^d\d+$/.test(pr.deja.drive_id));
chk('Une adresse d\'image directe est archivée aussi',/^d\d+$/.test(pr.direct.drive_id));
chk('Un site qui refuse la lecture : affichée depuis son site, sans réessai',
    pr.hostile.drive_id==='-'&&/hostile\.example/.test(pr.tuileHostile),JSON.stringify([pr.hostile.drive_id,pr.tuileHostile]));
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
  out.drive=DRIVE_APPELS.length; out.ecritures=ECRITURES.length;
  out.blobs=[...document.querySelectorAll('.ca-tuile img')].filter(i=>/^blob:/.test(i.src)).length;
  return out;
});
chk('Aucune recherche',su.recherches===0,String(su.recherches));
chk('Aucun téléchargement d\'image',su.images===0,String(su.images));
chk('Aucun appel à Drive',su.drive===0,JSON.stringify(su.drive));
chk('Aucune écriture dans le classeur',su.ecritures===0,String(su.ecritures));
chk('Les trois images archivées viennent de l\'appareil',su.blobs===3,String(su.blobs));

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
  const mk=(nom,url)=>({id:caId(),section:'Saturée',nom,url,prix:1,vente:null,ou:'',image:'',drive_id:'',ref:'',cote:null,
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
chk('Une vraie absence est écrite, avec sa raison',sat.d.etat==='introuvable'&&/aucune carte correspondante/.test(sat.d.raison),JSON.stringify(sat.d));
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
    sec:document.getElementById('caSec').value,ou:document.getElementById('caOuIn').value};
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
  const svp=()=>APPELS.filter(u=>/SVP|svp/.test(decodeURIComponent(u))).length;
  out.requetesFiche=svp();
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
chk('La fiche est remplie',ge.fiche.nom==='Limonde AR'&&ge.fiche.prix==='3'&&ge.fiche.sec==='Cadeau Noé'&&ge.fiche.ou==='Classeur',JSON.stringify(ge.fiche));
chk('Modifier un prix écrit UNE ligne, la sienne',ge.maj.length===1&&ge.maj[0].length===1&&ge.maj[0][0][2]==='7.5',JSON.stringify(ge.maj));
chk('Annuler rend le prix d\'avant',ge.annule===3,String(ge.annule));
chk('Une adresse collée dans la fiche est résolue sur-le-champ',/Trouvée depuis l'adresse/.test(ge.apercuInfo),ge.apercuInfo);
chk('...et ce résultat est enregistré, sans seconde recherche',
    /svp\/121_hires/.test(ge.ajout.image)&&ge.requetesFiche>0&&ge.recherchesApres===0,JSON.stringify(ge));
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
  const mk=(nom,prix,vente)=>({id:caId(),section:'Prix',nom,url:'',prix,vente,ou:'Noé',image:'',drive_id:'',ref:'',cote:null,
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
  const c={id:caId(),section:'<b>s</b>',nom:'<img src=x onerror="window.PWN=1">',url:'javascript:alert(1)',prix:1,vente:null,ou:'',
    image:'',drive_id:'',ref:'',cote:null,ordre:5000,etat:'',raison:'',created_at:td(),updated_at:td()};
  await caSauver([c]);
  const relue=caDeLigne(FEUILLE.find(x=>x[0]===c.id));
  out.urlJs=relue.url;
  renderCartes(); await new Promise(r=>setTimeout(r,300));
  out.pwn=!!window.PWN; out.injection=!!document.querySelector('.ca-tuile img[onerror*="PWN"]')||!!document.querySelector('.ca-sec-t b');
  out.piege=await caResoudreUrl('https://www.cardmarket.com/fr/Pokemon/Products/Singles/javascript/javascript-ZZ1');
  out.sauvegarde=BK_TABLES.some(t=>t[0]==='cartes'&&t[2]()===cartes);
  return out;
});
chk('Une adresse javascript: n\'est pas retenue',su2.urlJs==='',su2.urlJs);
chk('Un nom ou une section piégés ne s\'exécutent pas',su2.pwn===false&&su2.injection===false);
chk('Une image piégée renvoyée par une base est refusée',!!su2.piege&&!su2.piege.img,JSON.stringify(su2.piege));
chk('Les cartes font partie de la sauvegarde',su2.sauvegarde===true);

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));
await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
