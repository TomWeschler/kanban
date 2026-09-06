// ── La mise à jour de l'application ───────────────────────────────────────
// Le défaut constaté en vrai : un poste est resté QUARANTE VERSIONS en arrière,
// en silence, alors que la sonde de version voyait la nouvelle et que le moyen
// de s'en sortir (vider le cache) était dans le menu depuis le début.
// La cause : la sonde n'ordonnait qu'un rechargement ORDINAIRE, qui repasse par
// le service worker et le cache HTTP. Si l'un des deux sert un vieux document,
// la version ne bouge pas, la sonde la redétecte, et ça recommence — sans que
// rien ne soit jamais dit à personne.
// Ce qu'on éprouve ici : les trois paliers (recharger, purger, DIRE), qu'on
// n'escalade pas sans raison, qu'on ne coupe jamais une saisie, qu'on ne
// s'entête pas hors ligne, et qu'on ne boucle jamais en silence.
// Playwright n'est pas une dépendance du projet : il s'installe à la demande
// (voir tests/LISEZMOI.md). Le navigateur est celui de l'environnement.
const {chromium}=require('playwright');
const NAVIGATEUR=process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[];const chk=(n,ok,d='')=>R.push([n,ok,d]);

(async()=>{
const b=await chromium.launch({executablePath:NAVIGATEUR});
const ctx=await b.newContext({viewport:{width:1200,height:900},locale:'fr-FR'});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
await p.goto('http://127.0.0.1:8899/index.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof swMettreAJour==='function');

// Le banc : on remplace ce qui quitte la page ou détruit le cache, et on note.
const BANC=`
  window.JOURNAL={recharge:0,remplace:0,purge:0,dits:[]};
  swRecharger=()=>{ JOURNAL.recharge++; swReloading=false; };
  swRemplacer=u=>{ JOURNAL.remplace++; JOURNAL.derniereUrl=u; swReloading=false; };
  window.hardReset=async()=>{ JOURNAL.purge++; swRemplacer(location.pathname+'?v='+Date.now()); };
  window.offerChoice=(msg,act)=>{ JOURNAL.dits.push(msg); return {}; };
  const raz=()=>{ sessionStorage.clear(); swReloading=false; swAttente=0; swDitFaite=false;
                  JOURNAL.recharge=0; JOURNAL.remplace=0; JOURNAL.purge=0; JOURNAL.dits=[]; };
  window.raz=raz;
`;
await p.evaluate(BANC);

console.log('=== 1. LES TROIS PALIERS ===');
const pal=await p.evaluate(async()=>{
  const out={};
  raz();
  // Palier 1 : une version plus récente existe → rechargement ordinaire.
  swMettreAJour('v9.9.9');
  out.un={recharge:JOURNAL.recharge,purge:JOURNAL.purge,dits:JOURNAL.dits.length};
  // Palier 2 : le rechargement n'a rien changé (la version est toujours la
  // nôtre au chargement suivant) → purge des caches et du service worker.
  swMettreAJour('v9.9.9');
  out.deux={recharge:JOURNAL.recharge,purge:JOURNAL.purge,dits:JOURNAL.dits.length};
  // Palier 3 : même la purge n'a rien changé → on le DIT, et on s'arrête.
  swMettreAJour('v9.9.9');
  out.trois={recharge:JOURNAL.recharge,purge:JOURNAL.purge,dits:JOURNAL.dits.slice()};
  // Et on ne recommence pas : c'est la boucle silencieuse qu'on veut éviter.
  swMettreAJour('v9.9.9'); swMettreAJour('v9.9.9');
  out.apres={recharge:JOURNAL.recharge,purge:JOURNAL.purge,dits:JOURNAL.dits.length};
  return out;
});
chk('1er essai : rechargement ordinaire, rien d\'autre',
    pal.un.recharge===1&&pal.un.purge===0&&pal.un.dits===0,JSON.stringify(pal.un));
chk('2e essai : le rechargement n\'a rien changé, on purge',
    pal.deux.recharge===1&&pal.deux.purge===1,JSON.stringify(pal.deux));
chk('3e essai : la purge n\'a pas suffi, on le DIT',
    pal.trois.purge===1&&pal.trois.dits.length===1,JSON.stringify(pal.trois));
chk('...et le message nomme la version attendue',
    /v9\.9\.9/.test(pal.trois.dits[0]||''),String(pal.trois.dits[0]));
chk('Ensuite on ne boucle plus : ni rechargement, ni purge, ni répétition',
    pal.apres.recharge===1&&pal.apres.purge===1&&pal.apres.dits===1,JSON.stringify(pal.apres));

console.log('=== 2. ON N\'ESCALADE PAS SANS RAISON ===');
const esc=await p.evaluate(async()=>{
  const out={};
  // Une version À JOUR efface la trace : sinon un incident ancien ferait
  // purger le cache dès le premier essai de la mise à jour suivante.
  raz();
  swMettreAJour('v9.9.9');                    // pose un essai
  out.avant=swEssais('v9.9.9');
  swEssaisRaz();                              // ce que fait swCheck quand tout va bien
  out.efface=swEssais('v9.9.9');
  // Une AUTRE version repart du premier palier : le compte est par cible.
  raz();
  swMettreAJour('v9.9.9');
  swReloading=false;
  swMettreAJour('v8.8.8');
  out.autreCible={recharge:JOURNAL.recharge,purge:JOURNAL.purge};
  return out;
});
chk('Un essai est mémorisé',esc.avant===1,String(esc.avant));
chk('Une version à jour efface la trace',esc.efface===0,String(esc.efface));
chk('Une autre version repart du premier palier',
    esc.autreCible.recharge===2&&esc.autreCible.purge===0,JSON.stringify(esc.autreCible));

console.log('=== 3. NE JAMAIS COUPER UNE SAISIE ===');
const oc=await p.evaluate(async()=>{
  const out={};
  raz();
  const m=document.createElement('div'); m.className='modal-bg open'; document.body.appendChild(m);
  swMettreAJour('v9.9.9');
  out.pendant={recharge:JOURNAL.recharge,purge:JOURNAL.purge,dits:JOURNAL.dits.length};
  // L'attente est BORNÉE : attendre sans fin, c'est ne jamais se mettre à jour.
  swAttente=99;
  swMettreAJour('v9.9.9');
  out.borne={recharge:JOURNAL.recharge,dits:JOURNAL.dits.length};
  m.remove();
  // Une fois le champ libre, la mise à jour reprend son cours.
  raz();
  swMettreAJour('v9.9.9');
  out.libre=JOURNAL.recharge;
  return out;
});
chk('Une saisie en cours n\'est jamais coupée',
    oc.pendant.recharge===0&&oc.pendant.purge===0,JSON.stringify(oc.pendant));
chk('...mais l\'attente est bornée : on finit par le dire',
    oc.borne.recharge===0&&oc.borne.dits===1,JSON.stringify(oc.borne));
chk('Le champ libre, la mise à jour reprend',oc.libre===1,String(oc.libre));

console.log('=== 4. HORS LIGNE ===');
// Purger le cache ET le service worker hors ligne rend l'app incapable de se
// charger : c'est le seul cas où l'on préfère rester en arrière.
const hl=await p.evaluate(async()=>{
  const out={};
  raz();
  const vrai=Object.getOwnPropertyDescriptor(Navigator.prototype,'onLine');
  Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});
  swMettreAJour('v9.9.9'); swReloading=false;   // palier 1
  swMettreAJour('v9.9.9');                      // palier 2 → purge refusée
  out.horsLigne={purge:JOURNAL.purge,dits:JOURNAL.dits.length};
  delete navigator.onLine; if(vrai)Object.defineProperty(Navigator.prototype,'onLine',vrai);
  out.enLigneApres=navigator.onLine;
  return out;
});
chk('Hors ligne, on ne purge pas le cache',hl.horsLigne.purge===0,JSON.stringify(hl.horsLigne));
chk('...on le dit à la place',hl.horsLigne.dits===1,JSON.stringify(hl.horsLigne));

console.log('=== 5. LA PURGE FAIT BIEN CE QU\'ELLE DIT ===');
const pu=await p.evaluate(async()=>{
  const out={};
  // hardReset (le vrai) : caches vidés, service worker désinscrit, URL neuve.
  const src=document.documentElement.outerHTML;
  const f=src.slice(src.indexOf('async function hardReset'),src.indexOf('async function hardReset')+700);
  out.caches=/caches\.delete/.test(f);
  out.sw=/unregister\(\)/.test(f);
  out.url=/swRemplacer\(location\.pathname\+'\?v='\+Date\.now\(\)\)/.test(f);
  // Et surtout : elle ne touche pas aux données.
  out.donnees=!/localStorage\.clear|localStorage\.removeItem/.test(f);
  return out;
});
chk('La purge vide les caches',pu.caches===true);
chk('...désinscrit le service worker',pu.sw===true);
chk('...et repart sur une URL neuve, hors cache du navigateur',pu.url===true);
chk('...sans jamais toucher aux données locales',pu.donnees===true);

console.log('=== 6. RIEN N\'EST CASSÉ ===');
const nr=await p.evaluate(async()=>{
  const out={};
  raz();
  // Le bouton du menu appelle toujours la purge, via sa confirmation.
  out.bouton=!!document.querySelector('.om-i[onclick*="forceUpdate"]');
  out.version=(document.getElementById('omVer')||{}).id==='omVer';
  // La prise de contrôle par un nouveau service worker recharge, simplement.
  swReload();
  out.controlchange=JOURNAL.recharge;
  // swCheck ne fait rien quand la version est la bonne.
  raz();
  const vf=window.fetch;
  window.fetch=async u=>String(u).includes('version.json')
    ? {ok:true,json:async()=>({v:APP_VERSION})} : vf(u);
  swLastCheck=0; await swCheck(true);
  out.ajour={recharge:JOURNAL.recharge,purge:JOURNAL.purge,dits:JOURNAL.dits.length};
  // ...et déclenche le premier palier quand elle ne l'est pas.
  window.fetch=async u=>String(u).includes('version.json')
    ? {ok:true,json:async()=>({v:'v9.9.9'})} : vf(u);
  swLastCheck=0; await swCheck(true);
  out.enRetard={recharge:JOURNAL.recharge,purge:JOURNAL.purge};
  window.fetch=vf;
  return out;
});
chk('Le bouton « Vider le cache et recharger » est toujours là',nr.bouton===true);
chk('La version est toujours affichée à côté',nr.version===true);
chk('Une prise de contrôle recharge, simplement',nr.controlchange===1,String(nr.controlchange));
chk('À jour, la sonde ne fait rien',
    nr.ajour.recharge===0&&nr.ajour.purge===0&&nr.ajour.dits===0,JSON.stringify(nr.ajour));
chk('En retard, la sonde déclenche le premier palier',
    nr.enRetard.recharge===1&&nr.enRetard.purge===0,JSON.stringify(nr.enRetard));

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));

await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
