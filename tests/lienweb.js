// ── Liens vers une page web ───────────────────────────────────────────────
// Le rendu savait déjà afficher « [texte](url) » ; c'est l'écrire qui manquait.
// Deux familles d'épreuves :
//   1. LA SÛRETÉ. Une URL est du texte venu d'un presse-papier, donc de
//      n'importe où. Elle ne doit ni exécuter, ni sortir de son attribut.
//   2. LE GESTE. Bouton et collage doivent poser le curseur là où il reste
//      quelque chose à taper — sinon on gagne une syntaxe et on perd du temps.
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

console.log('=== 1. UN LIEN NE PEUT PAS ÊTRE UN VECTEUR ===');
const sur=await p.evaluate(()=>{
  const out={};
  const rend=src=>{ const d=document.createElement('div'); d.innerHTML=mdRender(src); return d; };
  // Les protocoles exécutables ne doivent pas produire de lien du tout.
  out.protocoles=['javascript:alert(1)','data:text/html,<script>alert(1)</script>',
                  'vbscript:msgbox(1)','file:///etc/passwd']
    .map(u=>{ const d=rend(`[clic](${u})`);
              return {a:!!d.querySelector('a[href]'),texte:d.textContent.trim()}; });
  // Un guillemet dans l'adresse ne doit pas refermer l'attribut.
  const g=rend('[x](https://a.fr"onmouseover="alert(1))');
  out.attributIntact=!/onmouseover/i.test(g.innerHTML)||!g.querySelector('[onmouseover]');
  out.pasDeGestionnaire=!g.querySelector('a[onmouseover]');
  // Une URL nue est reconnue, et reste inoffensive.
  const n=rend('Voir https://exemple.fr/page?a=1&b=2 pour la suite.');
  out.nue=!!n.querySelector('a[href]');
  out.nueHref=(n.querySelector('a')||{}).getAttribute?n.querySelector('a').getAttribute('href'):'';
  // Tout lien externe s'ouvre ailleurs, sans donner la main à la page visée.
  const ok=rend('[doc](https://exemple.fr)');
  const a=ok.querySelector('a');
  out.cible=a&&a.getAttribute('target');
  out.rel=a&&a.getAttribute('rel');
  // Un lien dans un bloc de code reste du texte.
  out.codeInerte=!rend('```\n[x](https://exemple.fr)\n```').querySelector('a');
  return out;
});
chk('Aucun protocole exécutable ne devient un lien',
    sur.protocoles.every(x=>x.a===false),JSON.stringify(sur.protocoles));
chk('...et leur libellé reste lisible, il ne disparaît pas',
    sur.protocoles.every(x=>/^clic/.test(x.texte)),JSON.stringify(sur.protocoles.map(x=>x.texte)));
chk('Un guillemet dans l\'adresse ne fabrique pas de gestionnaire',
    sur.pasDeGestionnaire===true&&sur.attributIntact===true,JSON.stringify(sur));
chk('Une URL nue est reconnue',sur.nue===true&&/exemple\.fr/.test(sur.nueHref||''),sur.nueHref);
chk('Un lien externe s\'ouvre ailleurs, sans donner la main',
    sur.cible==='_blank'&&/noopener/.test(sur.rel||''),JSON.stringify([sur.cible,sur.rel]));
chk('Un lien dans un bloc de code reste du texte',sur.codeInerte===true);

console.log('=== 2. LE BOUTON ===');
const bt=await p.evaluate(async()=>{
  const out={};
  accessToken='T';cfg.spreadsheetId='S';window.toast=()=>{};window.noteUpsert=async()=>true;
  notesLoaded=true;
  notes=[{id:'n1',title:'Essai',content:'',tags:'',parent_id:'',status:'active',
    created_at:'2026-01-01',updated_at:'2026-01-01',gx:null,gy:null}];
  noteIndexInvalidate();
  switchPage('brain'); await new Promise(r=>setTimeout(r,200));
  openNote('n1'); await new Promise(r=>setTimeout(r,300));
  noteMode='edit'; renderNoteMain(); await new Promise(r=>setTimeout(r,300));
  out.bouton=!!document.querySelector('.md-t[title*="page web"]');
  const ta=document.getElementById('sbEdit');
  const pose=(v,a,z)=>{ ta.value=v; ta.setSelectionRange(a,z==null?a:z); };

  // a. Sans rien de sélectionné : le gabarit, libellé en surbrillance.
  pose('',0);
  mdLien();
  out.vide={t:ta.value,sel:ta.value.slice(ta.selectionStart,ta.selectionEnd)};

  // b. Avec du texte sélectionné : il devient le libellé, curseur sur l'adresse.
  pose('la doc ADP',0,10);
  mdLien();
  out.avecTexte={t:ta.value,pos:ta.selectionStart,
                 apres:ta.value.slice(ta.selectionStart)};

  // c. Avec une ADRESSE sélectionnée : elle devient la cible, curseur au libellé.
  pose('https://exemple.fr/doc',0,22);
  mdLien();
  out.avecUrl={t:ta.value,pos:ta.selectionStart};

  // d. Ce qu'on obtient se rend bien.
  ta.value='[la doc ADP](https://exemple.fr/doc)';
  const d=document.createElement('div'); d.innerHTML=mdRender(ta.value);
  const a2=d.querySelector('a');
  out.rendu={texte:a2&&a2.textContent,href:a2&&a2.getAttribute('href')};
  return out;
});
chk('Le bouton 🔗 est dans la barre d\'outils',bt.bouton===true);
chk('Sans sélection, il pose le gabarit et vise le libellé',
    bt.vide.t==='[texte du lien](https://)'&&bt.vide.sel==='texte du lien',
    JSON.stringify(bt.vide));
chk('Avec du texte, celui-ci devient le libellé',
    bt.avecTexte.t==='[la doc ADP](https://)',bt.avecTexte.t);
chk('...et le curseur attend juste après « https:// »',
    bt.avecTexte.apres===')',JSON.stringify(bt.avecTexte));
chk('Une adresse sélectionnée devient la cible',
    bt.avecUrl.t==='[](https://exemple.fr/doc)'&&bt.avecUrl.pos===1,
    JSON.stringify(bt.avecUrl));
chk('Le résultat se rend en vrai lien',
    bt.rendu.texte==='la doc ADP'&&bt.rendu.href==='https://exemple.fr/doc',
    JSON.stringify(bt.rendu));

console.log('=== 3. COLLER UNE ADRESSE SUR DU TEXTE ===');
const cp=await p.evaluate(async()=>{
  const out={};
  const ta=document.getElementById('sbEdit');
  const coller=(txt,valeur,a,z)=>{
    ta.value=valeur; ta.setSelectionRange(a,z);
    const dt=new DataTransfer(); dt.setData('text/plain',txt);
    const e=new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true});
    ta.dispatchEvent(e);
    return {t:ta.value,defaut:e.defaultPrevented};
  };
  // a. Le cas qui motive tout : du texte sélectionné, une adresse collée.
  out.lien=coller('https://exemple.fr/doc','Voir la doc ADP ici',5,15);
  // b. Sans sélection : collage ordinaire, on ne s'en mêle pas.
  out.sansSel=coller('https://exemple.fr','Voir ',5,5);
  // c. Du texte collé sur du texte : collage ordinaire.
  out.texte=coller('autre chose','Voir la doc',5,11);
  // d. Une adresse collée SUR une adresse : on remplace, on n'imbrique pas.
  out.surUrl=coller('https://b.fr','https://a.fr',0,12);
  // e. Une adresse avec des parenthèses ne casse pas la syntaxe au rendu.
  out.parenth=coller('https://fr.wikipedia.org/wiki/Kanban_(d%C3%A9veloppement)','le kanban',0,9);
  const d=document.createElement('div'); d.innerHTML=mdRender(out.parenth.t);
  out.parenthRendu=(d.querySelector('a')||{}).getAttribute
    ?d.querySelector('a').getAttribute('href'):null;
  return out;
});
chk('Coller une adresse sur du texte en fait un lien',
    cp.lien.t==='Voir [la doc ADP](https://exemple.fr/doc) ici'&&cp.lien.defaut===true,
    JSON.stringify(cp.lien));
chk('Sans sélection, le collage reste ordinaire',cp.sansSel.defaut===false,
    JSON.stringify(cp.sansSel));
chk('Du texte collé sur du texte aussi',cp.texte.defaut===false,JSON.stringify(cp.texte));
chk('Une adresse collée sur une adresse remplace, elle n\'imbrique pas',
    cp.surUrl.defaut===false,JSON.stringify(cp.surUrl));
chk('Une adresse à parenthèses est acceptée',
    /wikipedia/.test(cp.parenth.t)&&cp.parenth.defaut===true,cp.parenth.t);
// C'est au RENDU que la troncature se voyait : le lien pointait à côté.
chk('...et son adresse n\'est pas tronquée au rendu',
    cp.parenthRendu==='https://fr.wikipedia.org/wiki/Kanban_(d%C3%A9veloppement)',
    String(cp.parenthRendu));

console.log('=== 3 bis. LES PARENTHÈSES ===');
const par=await p.evaluate(()=>{
  const out={};
  const r=s2=>{ const d=document.createElement('div'); d.innerHTML=mdRender(s2);
                const a2=d.querySelector('a');
                return {href:a2?a2.getAttribute('href'):null,texte:d.textContent}; };
  out.wiki=r('[kanban](https://fr.wikipedia.org/wiki/Kanban_(d%C3%A9veloppement))');
  out.nueWiki=r('Voir https://fr.wikipedia.org/wiki/Kanban_(d%C3%A9veloppement) pour la suite.');
  // Une parenthèse de PONCTUATION ne fait pas partie de l'adresse.
  out.ponctuation=r('Un point (voir https://exemple.fr) et la suite.');
  // Un protocole refusé ne laisse plus de parenthèse orpheline.
  out.refuse=r('[clic](javascript:alert(1))');
  // La ponctuation de fin de phrase n'appartient pas à l'adresse.
  out.virgule=r('Voir https://exemple.fr/page, puis la suite.');
  out.point=r('Voir https://exemple.fr/page.');
  // Mais un point DANS l'adresse reste dedans.
  out.pointDedans=r('https://exemple.fr/a.b.html et la suite');
  return out;
});
chk('Une adresse Wikipédia à parenthèses est complète',
    par.wiki.href==='https://fr.wikipedia.org/wiki/Kanban_(d%C3%A9veloppement)',par.wiki.href);
chk('...même écrite nue',
    par.nueWiki.href==='https://fr.wikipedia.org/wiki/Kanban_(d%C3%A9veloppement)',par.nueWiki.href);
chk('Une parenthèse de ponctuation reste dehors',
    par.ponctuation.href==='https://exemple.fr'&&/\) et la suite/.test(par.ponctuation.texte),
    JSON.stringify(par.ponctuation));
chk('Un protocole refusé ne laisse pas de parenthèse orpheline',
    par.refuse.href===null&&par.refuse.texte.trim()==='clic',JSON.stringify(par.refuse));
chk('Une virgule de fin de phrase reste dehors',
    par.virgule.href==='https://exemple.fr/page'&&/page, puis/.test(par.virgule.texte),
    JSON.stringify(par.virgule));
chk('Un point final aussi',par.point.href==='https://exemple.fr/page',par.point.href);
chk('...mais un point DANS l\'adresse y reste',
    par.pointDedans.href==='https://exemple.fr/a.b.html',par.pointDedans.href);

console.log('=== 4. RIEN N\'EST CASSÉ ===');
const nr=await p.evaluate(()=>{
  const out={};
  // La palette reste accessible depuis l'éditeur : Ctrl+K n'a pas été détourné.
  const src=document.documentElement.outerHTML;
  out.paletteIntacte=!/k==='k'.*mdLien/.test(src);
  // Le reste du markdown est intact.
  const r=s=>{ const d=document.createElement('div'); d.innerHTML=mdRender(s); return d; };
  out.image=!!r('![x](https://exemple.fr/i.png)').querySelector('img');
  out.piece=!!r('[f](drive:abc)').querySelector('a.md-att');
  out.wiki=!!r('[[Une note]]').querySelector('.wl');
  out.mail=!!r('[moi](mailto:a@b.fr)').querySelector('a[href^="mailto:"]');
  out.tag=!!r('#adp').querySelector('.tg');
  out.gras=/<strong>/.test(r('**gras**').innerHTML);
  out.tableau=!!r('| a | b |\n|---|---|\n| 1 | 2 |').querySelector('table');
  return out;
});
chk('Ctrl+K n\'a pas été détourné : la palette reste accessible',nr.paletteIntacte===true);
chk('Images, pièces jointes et liens de note intacts',
    nr.image&&nr.piece&&nr.wiki,JSON.stringify(nr));
chk('mailto, tags, gras et tableaux intacts',
    nr.mail&&nr.tag&&nr.gras&&nr.tableau,JSON.stringify(nr));

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));

await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
