// ── Le curseur de l'éditeur de notes ──────────────────────────────────────
// Le défaut signalé : « quand je change d'onglet, le curseur me met souvent à
// la fin de la note ». Cause : chaque reconstruction de l'éditeur repose la
// valeur du <textarea>, et poser la valeur d'un textarea place le caret à la
// fin. Or l'éditeur était reconstruit au retour sur l'onglet du navigateur
// (relecture de fraîcheur → renderBrain), au retour sur la page Notes, et à
// chaque enregistrement distant.
// Ce qu'on éprouve ici : la position survit à ces reconstructions, le
// défilement aussi, et rien de ce qui marchait ne s'est perdu au passage —
// notamment le focus donné à l'ouverture, et le focus JAMAIS volé au titre.
// Playwright n'est pas une dépendance du projet : il s'installe à la demande
// (voir tests/LISEZMOI.md). Le navigateur est celui de l'environnement.
const {chromium}=require('playwright');
const NAVIGATEUR=process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[];const chk=(n,ok,d='')=>R.push([n,ok,d]);

(async()=>{
const b=await chromium.launch({executablePath:NAVIGATEUR});
const ctx=await b.newContext({viewport:{width:1500,height:1000},locale:'fr-FR'});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
await p.goto('http://127.0.0.1:8899/index.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof renderNoteBody==='function');

// Un jeu de notes local : aucun accès réseau, donc aucune relecture distante.
// renderBrain() suit alors exactement le chemin qui détruisait l'éditeur.
await p.evaluate(async()=>{
  window.toast=()=>{}; window.noteUpsert=async()=>true;
  accessToken=''; notesLoaded=true;
  const LONG=Array.from({length:60},(_,i)=>`Ligne ${i+1} du corps de la note.`).join('\n');
  notes=[
    {id:'n1',title:'Suivi ADP',content:LONG,tags:'',parent_id:'',icon:'📄',
     status:'active',created_at:'2026-01-01',updated_at:'2026-01-01'},
    {id:'n2',title:'Autre note',content:'Deux mots.',tags:'',parent_id:'',icon:'📄',
     status:'active',created_at:'2026-01-01',updated_at:'2026-01-01'}
  ];
  noteIndexInvalidate();
  switchPage('brain'); await new Promise(r=>setTimeout(r,200));
  openNote('n1'); await new Promise(r=>setTimeout(r,200));
  noteMode='edit'; renderNoteMain(); await new Promise(r=>setTimeout(r,200));
});

console.log('=== 1. LE DÉFAUT SIGNALÉ : REVENIR SUR L\'ONGLET ===');
const on=await p.evaluate(async()=>{
  const out={};
  const ta=document.getElementById('sbEdit');
  ta.focus(); ta.setSelectionRange(120,120);      // en plein milieu du texte
  out.avant=ta.selectionStart;
  out.longueur=ta.value.length;
  // C'est très exactement ce que fait le retour sur l'onglet du navigateur.
  await renderBrain();
  const t2=document.getElementById('sbEdit');
  out.apres=t2.selectionStart;
  out.focus=document.activeElement===t2;
  return out;
});
chk('Le texte d\'épreuve est bien plus long que la position testée',
    on.longueur>400,String(on.longueur));
chk('Revenir sur l\'onglet ne renvoie plus le curseur à la fin',
    on.apres===120&&on.apres!==on.longueur,JSON.stringify(on));
chk('...et l\'éditeur garde la main',on.focus===true,JSON.stringify(on));

console.log('=== 2. LA SÉLECTION ET LE DÉFILEMENT AUSSI ===');
const sd=await p.evaluate(async()=>{
  const out={};
  const ta=document.getElementById('sbEdit');
  ta.focus(); ta.setSelectionRange(40,95); ta.scrollTop=140;
  // Si la zone ne défilait pas, l'épreuve suivante passerait pour rien : on
  // vérifie donc que le défilement a bien pris.
  out.defilementPose=ta.scrollTop;
  await renderBrain();
  const t2=document.getElementById('sbEdit');
  out.a=t2.selectionStart; out.z=t2.selectionEnd; out.defilement=t2.scrollTop;
  return out;
});
chk('Une sélection n\'est pas réduite à un point',
    sd.a===40&&sd.z===95,JSON.stringify(sd));
chk('Le défilement est rendu tel quel',
    sd.defilementPose>0&&sd.defilement===sd.defilementPose,JSON.stringify(sd));

console.log('=== 3. NE PAS RECONSTRUIRE CE QUI N\'A PAS CHANGÉ ===');
// Reconstruire coûte aussi l'historique d'annulation du navigateur, qu'aucune
// restitution de curseur ne rattrape. Quand rien n'a bougé, on ne touche à rien.
const rc=await p.evaluate(async()=>{
  const out={};
  const ta=document.getElementById('sbEdit');
  ta.setSelectionRange(10,10);
  renderNoteBody();
  out.memeChamp=document.getElementById('sbEdit')===ta;
  out.pos=document.getElementById('sbEdit').selectionStart;
  // En revanche, si le contenu a changé ailleurs, il FAUT le montrer.
  noteById('n1').content='Texte remplacé par une autre machine.';
  renderNoteBody();
  const t2=document.getElementById('sbEdit');
  out.champNeuf=t2!==ta;
  out.valeurSuivie=t2.value==='Texte remplacé par une autre machine.';
  // Le curseur était à 10 : il tient dans le nouveau texte, il y reste.
  out.posSuivie=t2.selectionStart;
  return out;
});
chk('À contenu identique, le champ n\'est pas recréé',rc.memeChamp===true);
chk('...et le curseur n\'a évidemment pas bougé',rc.pos===10,String(rc.pos));
chk('Un contenu modifié ailleurs est bien réaffiché',
    rc.champNeuf===true&&rc.valeurSuivie===true,JSON.stringify(rc));
chk('...et le curseur y est reposé, pas jeté à la fin',rc.posSuivie===10,String(rc.posSuivie));

console.log('=== 4. UN TEXTE QUI RACCOURCIT ===');
// setSelectionRange au-delà de la fin est silencieusement ramené par le
// navigateur, mais on borne quand même : une position fantôme est un bogue.
const co=await p.evaluate(async()=>{
  const out={};
  const ta=document.getElementById('sbEdit');
  ta.setSelectionRange(30,30);
  noteById('n1').content='Court.';
  renderNoteBody();
  const t2=document.getElementById('sbEdit');
  out.pos=t2.selectionStart; out.max=t2.value.length;
  return out;
});
chk('Le curseur est borné à la fin du nouveau texte',
    co.pos===co.max&&co.max===6,JSON.stringify(co));

console.log('=== 5. CHANGER DE NOTE, PUIS REVENIR ===');
const cn=await p.evaluate(async()=>{
  const out={};
  const LONG=Array.from({length:60},(_,i)=>`Ligne ${i+1} du corps de la note.`).join('\n');
  noteById('n1').content=LONG;
  renderNoteBody();
  const ta=document.getElementById('sbEdit');
  ta.focus(); ta.setSelectionRange(200,200);
  openNote('n2'); await new Promise(r=>setTimeout(r,150));
  const t2=document.getElementById('sbEdit');
  out.autreNote={val:t2.value,pos:t2.selectionStart};
  openNote('n1'); await new Promise(r=>setTimeout(r,150));
  const t3=document.getElementById('sbEdit');
  out.retour=t3.selectionStart;
  out.longueur=t3.value.length;
  return out;
});
chk('Une autre note ne reçoit pas le curseur de la précédente',
    cn.autreNote.pos<=cn.autreNote.val.length,JSON.stringify(cn.autreNote));
chk('Revenir sur une note reprend là où on l\'avait laissée',
    cn.retour===200&&cn.retour!==cn.longueur,JSON.stringify(cn));

console.log('=== 6. LE TITRE SOUFFRAIT DU MÊME MAL ===');
const ti=await p.evaluate(async()=>{
  const out={};
  const t=document.getElementById('sbTitle');
  t.focus(); t.setSelectionRange(2,2);            // « Su|ivi ADP »
  await renderBrain();
  const t2=document.getElementById('sbTitle');
  out.pos=t2.selectionStart;
  out.garde=document.activeElement===t2;
  out.longueur=t2.value.length;
  return out;
});
chk('Le curseur du titre ne saute pas à la fin',
    ti.pos===2&&ti.pos!==ti.longueur,JSON.stringify(ti));
chk('L\'éditeur ne vole pas le focus au titre',ti.garde===true,JSON.stringify(ti));

console.log('=== 7. RIEN N\'EST CASSÉ ===');
const nr=await p.evaluate(async()=>{
  const out={};
  // a. Passer de lecture à écriture donne bien la main à l'éditeur.
  setNoteMode('read'); await new Promise(r=>setTimeout(r,120));
  out.lecture=!!document.getElementById('sbRead')&&!document.getElementById('sbEdit');
  setNoteMode('edit'); await new Promise(r=>setTimeout(r,120));
  const ta=document.getElementById('sbEdit');
  out.ecriture=!!ta&&document.activeElement===ta;
  // b. La barre d'outils agit toujours sur le bon champ (mdBind).
  ta.focus(); ta.value='mot'; ta.setSelectionRange(0,3);
  mdWrap('**','**','texte'); out.gras=ta.value==='**mot**';
  // c. La saisie continue de remonter au modèle.
  ta.value='Nouveau corps.'; onNoteContent(ta.value);
  out.modele=noteById('n1').content==='Nouveau corps.';
  // d. Un aller-retour par une autre page ne perd pas la note ouverte.
  switchPage('board'); await new Promise(r=>setTimeout(r,150));
  switchPage('brain'); await new Promise(r=>setTimeout(r,250));
  out.retourPage=noteCurId==='n1'&&!!document.getElementById('sbEdit');
  return out;
});
chk('Le mode lecture rend bien la note',nr.lecture===true);
chk('Passer en écriture donne la main à l\'éditeur',nr.ecriture===true);
chk('La barre d\'outils agit toujours sur l\'éditeur',nr.gras===true);
chk('La saisie remonte toujours au modèle',nr.modele===true);
chk('Un aller-retour par une autre page garde la note ouverte',nr.retourPage===true);

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));

await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
