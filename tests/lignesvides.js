// ── Les lignes vides ──────────────────────────────────────────────────────
// Le défaut signalé : « quand je fais 5 sauts de lignes, tu n'en fais qu'un ».
// Le markdown d'origine réduit toute suite de lignes vides à une seule coupure
// de paragraphe. Règle d'imprimeur : dans un carnet, on aère un compte rendu
// exprès, et le blanc voulu doit se retrouver à la relecture.
// Ce qu'on éprouve ici : le compte est respecté, le blanc occupe vraiment de
// la place à l'écran, et rien de ce qui marchait ne s'est perdu — la première
// ligne vide reste la coupure de paragraphe habituelle, les blocs de code
// gardent leurs blancs littéralement, et un blanc de fin de note n'ajoute pas
// de vide au bas de l'écran.
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
await p.waitForFunction(()=>typeof mdRender==='function');

console.log('=== 1. LE COMPTE Y EST ===');
const cp=await p.evaluate(()=>{
  const out={};
  const r=s=>{ const d=document.createElement('div'); d.className='md'; d.innerHTML=mdRender(s); return d; };
  const vides=s=>[...r(s).querySelectorAll('.md-vide')]
    .map(e=>parseFloat(e.style.height)||0);
  // Une seule ligne vide : la coupure de paragraphe habituelle, rien de plus.
  // Toutes les notes déjà écrites doivent garder exactement la même allure.
  out.une={p:r('A\n\nB').querySelectorAll('p').length,v:vides('A\n\nB')};
  // Deux lignes vides : une ligne de blanc en plus.
  out.deux=vides('A\n\n\nB');
  // Cinq touches Entrée : quatre lignes vides, donc trois lignes de blanc
  // en plus de la coupure de paragraphe.
  out.cinq=vides('A\n\n\n\n\nB');
  // Le blanc grandit avec ce qu'on a tapé, il ne sature pas.
  out.dix=vides('A\n\n\n\n\n\n\n\n\n\n\nB');
  // Une ligne « vide » faite d'espaces compte comme vide : on ne va pas
  // demander à quelqu'un d'inspecter ses espaces.
  out.espaces=vides('A\n   \n\t\nB');
  return out;
});
chk('Une ligne vide reste une simple coupure de paragraphe',
    cp.une.p===2&&cp.une.v.length===0,JSON.stringify(cp.une));
chk('Deux lignes vides donnent une ligne de blanc',
    cp.deux.length===1&&Math.abs(cp.deux[0]-1.7)<0.01,JSON.stringify(cp.deux));
chk('Cinq sauts de ligne donnent bien trois lignes de blanc',
    cp.cinq.length===1&&Math.abs(cp.cinq[0]-5.1)<0.01,JSON.stringify(cp.cinq));
chk('Le blanc suit ce qu\'on a tapé, il ne sature pas',
    cp.dix.length===1&&Math.abs(cp.dix[0]-15.3)<0.01,JSON.stringify(cp.dix));
chk('Une ligne d\'espaces compte comme une ligne vide',
    cp.espaces.length===1&&Math.abs(cp.espaces[0]-1.7)<0.01,JSON.stringify(cp.espaces));

console.log('=== 2. LE BLANC OCCUPE VRAIMENT LA PLACE ===');
// Une hauteur écrite dans un attribut ne prouve rien : c'est à l'écran que
// cela doit se voir. On mesure l'écart réel entre les deux paragraphes.
const ms=await p.evaluate(async()=>{
  const out={};
  window.toast=()=>{}; window.noteUpsert=async()=>true;
  accessToken=''; notesLoaded=true;
  const mesure=src=>{
    const d=document.createElement('div'); d.className='md';
    d.style.cssText='position:absolute;left:-9999px;top:0;width:600px';
    d.innerHTML=mdRender(src); document.body.appendChild(d);
    const ps=d.querySelectorAll('p');
    const ecart=ps.length>1?ps[1].getBoundingClientRect().top-ps[0].getBoundingClientRect().bottom:0;
    const h=d.getBoundingClientRect().height;
    d.remove(); return {ecart,h};
  };
  out.simple=mesure('A\n\nB');
  out.cinq=mesure('A\n\n\n\n\nB');
  // La hauteur d'une ligne de lecture, pour comparer à ce qu'on a demandé.
  const l=document.createElement('div'); l.className='md';
  l.style.cssText='position:absolute;left:-9999px;width:600px';
  l.innerHTML='<p>x</p>'; document.body.appendChild(l);
  out.ligne=l.querySelector('p').getBoundingClientRect().height; l.remove();
  return out;
});
chk('Cinq sauts de ligne creusent un écart bien plus grand qu\'un seul',
    ms.cinq.ecart>ms.simple.ecart+3*ms.ligne*0.9,
    JSON.stringify({...ms}));
// Le bloc de blanc empêche les marges des deux paragraphes de fusionner : on
// obtient donc TOUJOURS AU MOINS le blanc demandé, et jamais une ligne de plus.
chk('...et cet écart vaut les trois lignes demandées, à moins d\'une ligne près',
    (ms.cinq.ecart-ms.simple.ecart)>=3*ms.ligne
    &&(ms.cinq.ecart-ms.simple.ecart)<4*ms.ligne,
    JSON.stringify({...ms}));

console.log('=== 3. LÀ OÙ IL NE FAUT PAS DE BLANC ===');
const nb=await p.evaluate(()=>{
  const out={};
  const r=s=>{ const d=document.createElement('div'); d.className='md'; d.innerHTML=mdRender(s); return d; };
  // Un blanc en fin de note n'ajoute pas de vide au bas de l'écran.
  out.fin=r('A\n\n\n\n\n').querySelectorAll('.md-vide').length;
  // Un bloc de code garde ses lignes vides telles quelles, sans div parasite.
  const code=r('```\nun\n\n\n\ndeux\n```');
  out.codeDiv=code.querySelectorAll('.md-vide').length;
  out.codeTexte=code.querySelector('pre code').textContent;
  // Un blanc au début de la note est du blanc voulu comme un autre.
  out.debut=r('\n\n\nA').querySelectorAll('.md-vide').length;
  return out;
});
chk('Un blanc en fin de note n\'ajoute rien au bas de l\'écran',nb.fin===0,String(nb.fin));
chk('Un bloc de code garde ses lignes vides littéralement',
    nb.codeDiv===0&&nb.codeTexte==='un\n\n\n\ndeux',JSON.stringify(nb.codeTexte));
chk('Un blanc en début de note est rendu comme les autres',nb.debut===1,String(nb.debut));

console.log('=== 4. RIEN N\'EST CASSÉ ===');
const nr=await p.evaluate(()=>{
  const out={};
  const r=s=>{ const d=document.createElement('div'); d.className='md'; d.innerHTML=mdRender(s); return d; };
  // Le retour simple reste un <br> dans le paragraphe : l'acquis d'avant.
  out.br=r('un\ndeux').querySelectorAll('br').length;
  // Les blancs ne s'immiscent pas dans les structures.
  out.liste=r('- un\n\n\n\n- deux').querySelectorAll('li').length;
  out.tableau=r('| a | b |\n|---|---|\n| 1 | 2 |\n\n\n\n| c |\n|---|\n| 3 |')
    .querySelectorAll('table').length;
  out.titre=!!r('# Titre\n\n\n\nsuite').querySelector('h1');
  out.citation=!!r('> dit\n\n\n\nsuite').querySelector('blockquote');
  // Une hauteur n'est jamais reprise de la source : elle est calculée.
  const inj=r('A\n\n\n"><img src=x onerror=alert(1)>');
  out.injection=!inj.querySelector('img')&&!inj.querySelector('[onerror]');
  const hs=[...inj.querySelectorAll('.md-vide')].map(e=>e.getAttribute('style'));
  out.styleSain=hs.length>0&&hs.every(s=>/^height:[0-9.]+em;?$/.test(s));
  // Le blanc ne se met pas en travers d'un clic sur ce qu'il y a dessous.
  const v=document.createElement('div'); v.className='md';
  v.style.cssText='position:absolute;left:-9999px;width:600px';
  v.innerHTML=mdRender('A\n\n\nB'); document.body.appendChild(v);
  const bl=v.querySelector('.md-vide');
  out.inerte=!!bl&&getComputedStyle(bl).pointerEvents==='none';
  v.remove();
  return out;
});
chk('Le retour simple reste un saut dans le paragraphe',nr.br===1,String(nr.br));
chk('Une liste coupée par du blanc garde ses éléments',nr.liste===2,String(nr.liste));
chk('Deux tableaux séparés par du blanc restent deux tableaux',nr.tableau===2,String(nr.tableau));
chk('Titres et citations intacts',nr.titre&&nr.citation,JSON.stringify(nr));
chk('La hauteur du blanc est calculée, jamais reprise de la source',
    nr.injection===true&&nr.styleSain===true,JSON.stringify(nr));
chk('Le blanc ne capte pas les clics',nr.inerte===true);

console.log('=== 5. CE QUI EST ÉCRIT EST CE QUI EST GARDÉ ===');
// Le rendu ne sert à rien si la source perd les sauts au passage en feuille.
const gd=await p.evaluate(async()=>{
  const out={};
  const src='Compte rendu.\n\n\n\n\nSuite du compte rendu.';
  notes=[{id:'n1',title:'Essai',content:'',tags:'',parent_id:'',icon:'📄',
    status:'active',created_at:'2026-01-01',updated_at:'2026-01-01'}];
  noteIndexInvalidate();
  switchPage('brain'); await new Promise(r=>setTimeout(r,200));
  openNote('n1'); await new Promise(r=>setTimeout(r,200));
  noteMode='edit'; renderNoteMain(); await new Promise(r=>setTimeout(r,200));
  const ta=document.getElementById('sbEdit');
  ta.value=src; onNoteContent(ta.value);
  out.modele=noteById('n1').content===src;
  // Aller-retour par la feuille : découpage en colonnes puis recollage.
  const l=noteToRow(noteById('n1'));
  out.feuille=noteJoin(l[2],l[12],l[13],l[14])===src;
  // Et la lecture montre bien le blanc.
  noteMode='read'; renderNoteMain(); await new Promise(r=>setTimeout(r,200));
  out.lecture=document.querySelectorAll('#sbRead .md-vide').length;
  return out;
});
chk('La saisie garde ses cinq sauts',gd.modele===true);
chk('...l\'aller-retour par la feuille aussi',gd.feuille===true);
chk('...et la lecture les montre',gd.lecture===1,String(gd.lecture));

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));

await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
