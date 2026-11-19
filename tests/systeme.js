// ── Le Système : niveau, rang, stats, quête quotidienne ──────────────────
// Inspiré de Solo Leveling. On éprouve surtout ce qui fait tenir : une quête
// courte (3 à 5 habitudes), une expérience qui ne se perd jamais (recalculée
// sur tout l'historique), des rangs de G à S, des stats à répartir, et des
// annonces qui marquent les passages. Le classeur est simulé.
const {chromium}=require('playwright');
const NAVIGATEUR=process.env.PW_CHROME||['/opt/pw-browsers/chromium','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(x=>require('fs').existsSync(x));
const R=[];const chk=(n,ok,d='')=>R.push([n,ok,d]);

(async()=>{
const b=await chromium.launch({executablePath:NAVIGATEUR});
const ctx=await b.newContext({viewport:{width:1300,height:950},locale:'fr-FR',timezoneId:'Europe/Paris'});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
await p.goto('http://127.0.0.1:8899/index.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof renderSysteme==='function');

// ── Le banc ──
await p.evaluate(async()=>{
  window.S_TOASTS=[]; window.toast=m=>S_TOASTS.push(m); window.offerUndo=()=>{};
  ['kanban_systeme','kanban_sys_vu'].forEach(k=>localStorage.removeItem(k));
  sysQuete={versions:[],minimum:{}}; sysStats={alloc:{}}; sysCharge=false;
  // Une pente fixe pour les épreuves (k = 50) : le calibrage s'éprouve à part.
  sysCalib={k:50,xpJour:null,le:'banc'};
  accessToken='T'; cfg.spreadsheetId='S';
  window.S_ONGLETS={}; window.S_CREES=[];
  window.sheetTitres=async()=>Object.keys(S_ONGLETS);
  window.sheetTitresOublie=()=>{};
  window.authFetch=async(u,o={})=>{ u=String(u);
    if(/:batchUpdate$/.test(u)&&o.body&&/addSheet/.test(o.body)){ JSON.parse(o.body).requests.forEach(r=>{ S_ONGLETS[r.addSheet.properties.title]=[]; S_CREES.push(r.addSheet.properties.title); }); }
    return {ok:true,status:200,json:async()=>({values:[]})}; };
  window.sheetPut=async(range,values)=>{ const t=range.split('!')[0]; S_ONGLETS[t]=S_ONGLETS[t]||[]; S_ONGLETS[t][0]=values[0]; return {ok:true,json:async()=>({})}; };
  window.sheetBatchGet=async ranges=>ranges.map(r=>(S_ONGLETS[r.split('!')[0]]||[]).map(x=>x.slice()));
  window.sheetBatchUpsert=async(sheet,rows)=>{ const t=S_ONGLETS[sheet]=S_ONGLETS[sheet]||[[]];
    rows.forEach(r=>{ const i=t.findIndex((x,k)=>k&&x[0]===r[0]); if(i>0)t[i]=r.slice(); else t.push(r.slice()); }); return true; };
  window.appendHabitsLog=async()=>true; window.rewriteHabitsLog=async()=>true;
  window.loadSportData=async()=>{}; sportLoaded=true;
  const j=n=>{ const d=new Date(); d.setDate(d.getDate()-n); return ymd(d); };
  window.J=j;
  habits=[{id:1,title:'Pompes',frequency:'daily',reward_eur:0.5,category:'Santé',active:true},
    {id:2,title:'Lire',frequency:'daily',reward_eur:0.5,category:'Esprit',active:true},
    {id:3,title:'Budget',frequency:'daily',reward_eur:0.2,category:'Finance',active:true},
    {id:4,title:'Méditer',frequency:'daily',reward_eur:0.3,category:'Esprit',active:true},
    {id:5,title:'Ranger',frequency:'daily',reward_eur:0.1,category:'Productivité',active:true},
    {id:6,title:'Ancienne',frequency:'daily',reward_eur:1,category:'Autre',active:false}];
  habitsLog=[{id:'a',habit_id:1,date:j(2),reward_eur:0.5,category:'Santé'},{id:'b',habit_id:2,date:j(2),reward_eur:0.5,category:'Esprit'},
    {id:'c',habit_id:3,date:j(2),reward_eur:0.2,category:'Finance'},{id:'d',habit_id:1,date:j(1),reward_eur:0.5,category:'Santé'},
    {id:'e',habit_id:2,date:j(1),reward_eur:0.5,category:'Esprit'},{id:'f',habit_id:2,date:j(1),reward_eur:0.5,category:'Esprit'}];
  sportLogs=[{date:j(2),status:'done'},{date:j(1),status:'partial'},{date:j(3),status:'skipped'}];
  goals=[{id:'g1',title:'Épargner',category:'Finance',status:'done',progress:100,reward_eur:-20},{id:'g2',title:'En cours',category:'Santé',status:'active',progress:40,reward_eur:0}];
});

console.log('=== 0. SANS HABITUDE, PAS D\'ANNONCE ===');
const vide=await p.evaluate(()=>{
  const g={h:habits,l:habitsLog,s:sportLogs,o:goals};
  habits=[]; habitsLog=[]; sportLogs=[]; goals=[];
  const box=document.createElement('div'); box.id='sysBox'; if(!document.getElementById('sysBox'))document.body.appendChild(box);
  renderSysteme();
  const out={ouverte:document.getElementById('sysAnnModal').classList.contains('open'),vu:localStorage.getItem('kanban_sys_vu')};
  habits=g.h; habitsLog=g.l; sportLogs=g.s; goals=g.o;
  return out;
});
chk('Sans habitude ni historique, le Système ne s\'annonce pas (rien ne recouvre l\'écran)',vide.ouverte===false&&vide.vu===null,JSON.stringify(vide));

console.log('=== 1. LE NIVEAU, LE RANG, L\'EXPÉRIENCE ===');
const nv=await p.evaluate(()=>{
  const e=sysEtat();
  return {xp:e.xp,niveau:e.niveau,rang:e.rang,base:e.base,suivant:e.suivant,stats:JSON.stringify(e.stats),points:e.points,or:e.or,
    seuils:[sysSeuil(1),sysSeuil(2),sysSeuil(3),sysSeuil(5),sysSeuil(10)].join(','),
    rangs:[1,4,5,9,10,19,20,30,45,60,79,80,99,100,119,120,200].map(sysRangDe).join(','),
    niveaux:[0,99,100,299,300,999,1000].map(sysNiveauDe).join(',')};
});
chk('L\'expérience se calcule sur tout l\'historique : coches (une par jour), sport, objectifs',nv.xp===195,String(nv.xp));
chk('...niveau 2, rang G',nv.niveau===2&&nv.rang==='G'&&nv.base===100&&nv.suivant===300,JSON.stringify(nv));
chk('Les seuils de niveau : 50 × N × (N − 1)',nv.seuils==='0,100,300,1000,4500'&&nv.niveaux==='1,1,2,2,3,4,5',JSON.stringify([nv.seuils,nv.niveaux]));
chk('Les rangs, de G à SSS : G et F sous les rangs de chasseur, SS et SSS au-delà du S',nv.rangs==='G,G,F,F,E,E,D,C,B,A,A,S,S,SS,SS,SSS,SSS',nv.rangs);
chk('Les stats, nourries par le sport et les catégories',nv.stats==='{"force":10,"vitalite":10,"agilite":10,"intelligence":10,"perception":11}',nv.stats);
chk('...3 points à répartir par niveau gagné',nv.points===3,String(nv.points));
chk('L\'or, c\'est la cagnotte',Math.abs(nv.or-(-17.3))<0.001,String(nv.or));

console.log('=== 2. LA FENÊTRE DU SYSTÈME ET LA PREMIÈRE RENCONTRE ===');
const fe=await p.evaluate(async()=>{
  const out={};
  switchPage('today'); await new Promise(r=>setTimeout(r,250));
  const f=document.querySelector('#sysBox .sys-fen');
  out.fenetre=!!f;
  out.statut=(f&&f.querySelector('.sys-statut').textContent.replace(/\s+/g,' '))||'';
  out.rang=(document.querySelector('.sys-rang')||{}).textContent;
  out.accueil=document.getElementById('sysAnnModal').classList.contains('open');
  out.accueilTxt=document.getElementById('sysAnnTitre').textContent;
  modalFerme('sysAnnModal');
  out.invite=/Choisir ma quête quotidienne/.test(document.querySelector('.sys-quete').textContent);
  out.onglet=S_CREES.includes('systeme')&&(S_ONGLETS.systeme[0]||[]).join(',');
  out.vu=localStorage.getItem('kanban_sys_vu');
  return out;
});
chk('La fenêtre du Système en tête d\'Aujourd\'hui : niveau, rang, expérience, or, stats',fe.fenetre&&/Niveau 2/.test(fe.statut)&&fe.rang==='G'&&/95 \/ 200 XP/.test(fe.statut)&&/Force/.test(fe.statut)&&/Perception/.test(fe.statut)&&/3 points de stat à attribuer/.test(fe.statut),fe.statut);
chk('La première rencontre : « Vous êtes devenu un Joueur »',fe.accueil&&/devenu un Joueur/.test(fe.accueilTxt),fe.accueilTxt);
chk('...et l\'invitation à choisir la quête',fe.invite===true);
chk('L\'onglet « systeme » naît dans le classeur',fe.onglet==='id,valeur,updated_at',String(fe.onglet));

console.log('=== 3. CHOISIR LA QUÊTE QUOTIDIENNE ===');
const qc=await p.evaluate(async()=>{
  const out={};
  sysQueteOuvrir(); await new Promise(r=>setTimeout(r,50));
  const cases=()=>[...document.querySelectorAll('#sysQListe input[type=checkbox]')];
  out.proposees=cases().length;
  const coche=id=>{ const c=cases().find(x=>x.dataset.h===String(id)); c.checked=true; c.dispatchEvent(new Event('change')); };
  coche(1); coche(2);
  out.compteKo=document.getElementById('sysQCompte').className;
  await sysQueteEnregistrer(); out.refus=S_TOASTS.slice(-1)[0]; out.resteOuverte=document.getElementById('sysQueteModal').classList.contains('open');
  coche(4);
  document.querySelector('#sysQListe [data-m="1"]').value='5 pompes';
  await sysQueteEnregistrer(); await new Promise(r=>setTimeout(r,80));
  out.quete=sysQueteActuelle().join(',');
  out.version=JSON.stringify(sysQuete.versions.map(v=>v.depuis===td()));
  out.ligne=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='quete')||[])[1]||'{}');
  out.lignes=[...document.querySelectorAll('.sys-ligne')].map(x=>x.querySelector('.sys-lib').textContent.replace(/\s+/g,' ').trim()).join(' / ');
  out.secondaires=(document.querySelector('#tdHabits .td-fold')||{textContent:''}).textContent.replace(/\s+/g,' ').trim();
  out.temps=(document.getElementById('sysTemps')||{textContent:''}).textContent;
  // 6 coches au passé : la quête d'aujourd'hui ne réécrit pas leur valeur.
  out.xpInchange=sysEtat().xp;
  return out;
});
chk('La quête se choisit parmi les habitudes actives',qc.proposees===5,String(qc.proposees));
chk('...moins de 3 habitudes : refusé',qc.compteKo==='sys-qc ko'&&/3 à 5/.test(qc.refus||'')&&qc.resteOuverte,JSON.stringify(qc));
chk('...3 habitudes : enregistré, avec une version datée d\'aujourd\'hui',qc.quete==='1,2,4'&&qc.version==='[true]',JSON.stringify(qc));
chk('...écrit dans le classeur, version minimale comprise',qc.ligne.versions&&qc.ligne.versions[0].habits.join(',')==='1,2,4'&&qc.ligne.minimum['1']==='5 pompes',JSON.stringify(qc.ligne));
chk('La fenêtre montre la quête, avec la version minimale',qc.lignes.replace(/minimum/,' minimum')==='Pompes minimum : 5 pompes / Lire / Méditer',qc.lignes);
chk('...et le temps restant avant minuit',/^⏳ \d\d:\d\d:\d\d$/.test(qc.temps),qc.temps);
chk('Les autres habitudes deviennent des quêtes secondaires',qc.secondaires==='▸Quêtes secondaires 0/2'||/Quêtes secondaires\s*0\/2/.test(qc.secondaires),qc.secondaires);
chk('Changer de quête ne réécrit pas le passé',qc.xpInchange===195,String(qc.xpInchange));

console.log('=== 4. ACCOMPLIR LA QUÊTE, MONTER DE NIVEAU ===');
const ac=await p.evaluate(async()=>{
  const out={};
  const ligne=t=>[...document.querySelectorAll('.sys-ligne')].find(x=>x.textContent.includes(t));
  ligne('Pompes').click(); await new Promise(r=>setTimeout(r,80));
  out.unFait=(document.querySelector('.sys-pied')||{textContent:''}).textContent.replace(/\s+/g,' ');
  out.xp1=sysEtat().xp;
  ligne('Lire').click(); await new Promise(r=>setTimeout(r,80));
  ligne('Méditer').click(); await new Promise(r=>setTimeout(r,120));
  out.pied=(document.querySelector('.sys-pied')||{textContent:''}).textContent.replace(/\s+/g,' ');
  out.ok=[...document.querySelectorAll('.sys-ligne.ok')].length;
  const e=sysEtat(); out.xp=e.xp; out.niveau=e.niveau; out.points=e.points;
  out.levelUp=document.getElementById('sysAnnModal').classList.contains('open');
  out.levelUpT=document.getElementById('sysAnnT').textContent+' / '+document.getElementById('sysAnnTitre').textContent+' / '+document.getElementById('sysAnnTxt').textContent;
  modalFerme('sysAnnModal');
  out.toasts=S_TOASTS.join(' | ');
  // Une deuxième fois le même jour : pas de nouvelle annonce.
  S_TOASTS.length=0; renderSysteme(); out.repete=S_TOASTS.length;
  return out;
});
chk('Une habitude de quête rapporte 20 XP',ac.xp1===215&&/1\/3/.test(ac.unFait),JSON.stringify(ac));
chk('La quête accomplie : +50 XP de prime, et le Système l\'annonce',ac.ok===3&&/QUÊTE ACCOMPLIE/.test(ac.pied)&&ac.xp===305&&/Quête accomplie/.test(ac.toasts),JSON.stringify(ac));
chk('LEVEL UP ! : le niveau 3, et ses points de stat',ac.levelUp&&/LEVEL UP/.test(ac.levelUpT)&&/Niveau 3/.test(ac.levelUpT)&&/\+3 points/.test(ac.levelUpT)&&ac.niveau===3&&ac.points===6,ac.levelUpT);
chk('...une seule annonce par jour',ac.repete===0,String(ac.repete));

console.log('=== 5. ATTRIBUER LES POINTS ===');
const pt=await p.evaluate(async()=>{
  const out={};
  const plus=[...document.querySelectorAll('.sys-st')].find(x=>/Force/.test(x.textContent)).querySelector('.sys-plus');
  plus.click(); await new Promise(r=>setTimeout(r,80));
  const e=sysEtat(); out.force=e.stats.force; out.points=e.points;
  out.ligne=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='stats')||[])[1]||'{}');
  for(let i=0;i<5;i++)await sysAttribuer('intelligence');
  out.fin=sysEtat().points; out.boutons=document.querySelectorAll('.sys-plus').length;
  await sysAttribuer('force'); out.trop=sysEtat().stats.force;
  return out;
});
chk('Un point attribué : la stat monte, le compteur descend',pt.force===11&&pt.points===5,JSON.stringify(pt));
chk('...écrit dans le classeur',pt.ligne.alloc&&pt.ligne.alloc.force===1,JSON.stringify(pt.ligne));
chk('...plus de point, plus de bouton, et pas de point en trop',pt.fin===0&&pt.boutons===0&&pt.trop===11,JSON.stringify(pt));

console.log('=== 6. RELIRE, RANG F, SAUVEGARDE, SÛRETÉ ===');
const rl=await p.evaluate(async()=>{
  const out={};
  const q=JSON.stringify(sysQuete), st=JSON.stringify(sysStats);
  sysQuete={versions:[],minimum:{}}; sysStats={alloc:{}}; sysCharge=false;
  await sysCharger();
  out.relu=JSON.stringify(sysQuete)===q&&JSON.stringify(sysStats)===st;
  // Le rang F à partir du niveau 5 : 1 000 XP.
  const j=window.J;
  for(let i=3;i<40;i++)habitsLog.push({id:'x'+i,habit_id:5,date:j(i),reward_eur:0.1,category:'Productivité'});
  for(let i=3;i<30;i++)sportLogs.push({date:j(i),status:'done'});
  const e=sysEtat(); out.rangF=[e.niveau,e.rang].join('|');
  out.sauvegarde=BK_TABLES.some(t=>t[0]==='systeme');
  // Un titre d'habitude piégé ne s'exécute pas.
  habits[0].title='<img src=x onerror="window.PWN=1">';
  renderSysteme(); await new Promise(r=>setTimeout(r,50));
  out.pwn=!!window.PWN; out.inj=!!document.querySelector('.sys-ligne img');
  return out;
});
chk('Quête et points se relisent depuis le classeur',rl.relu===true);
chk('Le rang F à partir du niveau 5',rl.rangF.split('|')[1]==='F'&&Number(rl.rangF.split('|')[0])>=5,rl.rangF);
chk('Le Système fait partie de la sauvegarde',rl.sauvegarde===true);
chk('Un titre piégé ne s\'exécute pas',rl.pwn===false&&rl.inj===false,JSON.stringify(rl));

console.log('=== 7. LES PALIERS ===');
const pal=await p.evaluate(async()=>{
  const out={};
  habits[0].title='Pompes';
  sportPlans=[];
  const m=sysMaxJour(); out.max=[Math.round(m.xp),Math.round(m.eur*100)/100].join('|');
  // Deux séances par semaine programmées : 8 sur 4 semaines.
  for(let i=1;i<=28;i+=3.5){ const d=new Date(td()+'T12:00:00'); d.setDate(d.getDate()+Math.floor(i)); sportPlans.push({date:ymd(d),type:'Force',title:'x'}); }
  sportPlans.push({date:ymd(new Date()),type:'Repos'});
  out.sport=Math.round(sysMaxJour().xp*10)/10;
  sysPaliersOuvrir(); await new Promise(r=>setTimeout(r,50));
  out.ouvert=document.getElementById('sysPalModal').classList.contains('open');
  out.rythme=document.getElementById('sysPalRythme').textContent.replace(/\s+/g,' ');
  out.lignes=[...document.querySelectorAll('#sysPalTable tr')].slice(1).map(r=>[...r.children].slice(0,3).map(x=>x.textContent.trim().replace(/[\u00a0\u202f]/g,' ')).join(':')).join(' ');
  out.s=[...document.querySelectorAll('#sysPalTable tr')].find(r=>r.children[0].textContent.trim()==='S').textContent.replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ');
  modalFerme('sysPalModal');
  out.duree=[sysDuree(0.5),sysDuree(17),sysDuree(400),sysDuree(1200)].join(' / ');
  return out;
});
chk('« Si tu fais tout » : chaque habitude active, la quête et sa prime',pal.max==='130|1.6',pal.max);
chk('...et les séances de sport programmées',pal.sport===138.6,String(pal.sport));
chk('Les paliers : chaque rang, son niveau, l\'XP cumulée',pal.ouvert&&pal.lignes==='G:1:0 F:5:1 000 E:10:4 500 D:20:19 000 C:30:43 500 B:45:99 000 A:60:177 000 S:80:316 000 SS:100:495 000 SSS:120:714 000',pal.lignes);
chk('...le temps, la date et l\'or pour y arriver',/S\s*80\s*316 000/.test(pal.s)&&/ans/.test(pal.s)&&/€/.test(pal.s),pal.s);
chk('...au rythme annoncé',/Si tu fais tout : 139 XP et 1\.60€ d'or par jour/.test(pal.rythme),pal.rythme);
chk('Les durées se lisent : jours, mois, années',pal.duree==="aujourd'hui / 17 jours / 13 mois / 3,3 ans",pal.duree);

console.log('=== 8. REPARTIR DE ZÉRO ===');
const rz=await p.evaluate(async()=>{
  const out={};
  let ecrit=0; window.rewriteHabitsLog=async()=>{ ecrit++; return true; };
  let annul=null; window.offerUndo=(m,f)=>{ annul=f; out.message=m; };
  window.confirm=()=>false; await sysRepartir(); out.refuse=habitsLog.length>0;
  const avant={xp:sysEtat().xp,log:habitsLog.length,or:cagnotte()};
  out.avant=avant;
  window.confirm=()=>true;
  sysQueteOuvrir(); await new Promise(r=>setTimeout(r,30));
  out.bouton=!![...document.querySelectorAll('#sysQueteModal button')].find(b=>/Repartir de zéro/.test(b.textContent));
  await sysRepartir(); await new Promise(r=>setTimeout(r,80));
  const e=sysEtat();
  out.apres=[habitsLog.length,e.xp,e.niveau,e.rang,cagnotte(),e.points,JSON.stringify(sysStats.alloc)].join('|');
  out.habitudes=habits.length; out.quete=sysQueteActuelle().join(',');
  out.ecrit=ecrit;
  out.ligne=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='reset')||[])[1]||'{}');
  out.copie=!!JSON.parse(localStorage.getItem('kanban_sys_sauvegarde')||'null');
  // Le sport d'avant ne compte plus ; le sport d'après, si.
  sportLogs.push({date:td(),status:'done'});
  out.apresSport=sysEtat().xp;
  sportLogs.pop();
  // Annuler remet tout.
  await annul(); out.annule=[habitsLog.length,sysEtat().xp].join('|');
  await sysRepartir();
  return out;
});
chk('Repartir de zéro demande confirmation',rz.refuse===true,JSON.stringify(rz));
chk('...le bouton est dans la fenêtre de la quête',rz.bouton===true);
chk('...l\'historique des habitudes est effacé, l\'or et l\'XP à zéro, niveau 1, rang G',rz.apres==='0|0|1|G|0|0|{}',rz.apres);
chk('...les habitudes et la quête restent',rz.habitudes===6&&rz.quete==='1,2,4',JSON.stringify([rz.habitudes,rz.quete]));
chk('...écrit dans le classeur, une copie gardée sur l\'appareil',rz.ecrit>=1&&rz.ligne.depuis===rz.ligne.depuis&&Array.isArray(rz.ligne.objectifs)&&rz.ligne.objectifs.includes('g1')&&rz.copie,JSON.stringify(rz.ligne));
chk('...le sport d\'après compte',rz.apresSport===30,String(rz.apresSport));
chk('...et l\'on peut annuler',rz.annule===rz.avant.log+'|'+rz.avant.xp,JSON.stringify([rz.annule,rz.avant]));

console.log('=== 9. LE CALIBRAGE : LE RANG S EN DEUX ANS ===');
const cal=await p.evaluate(async()=>{
  const out={};
  const m=sysMaxJour(); out.xpJour=Math.round(m.xp*10)/10;
  await sysCalibrer();
  out.k=Math.round(sysCalib.k*1000)/1000;
  out.jours=Math.round(sysSeuil(80)/m.xp);
  out.ligne=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='calibrage')||[])[1]||'{}');
  sysPaliersOuvrir(); await new Promise(r=>setTimeout(r,50));
  const ligneDe=r=>[...document.querySelectorAll('#sysPalTable tr')].find(x=>x.children[0].textContent.trim()===r);
  out.s=ligneDe('S').textContent.replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ');
  out.ss=!!ligneDe('SS')&&!!ligneDe('SSS');
  out.texte=document.getElementById('sysPalCalib').textContent.replace(/\s+/g,' ');
  modalFerme('sysPalModal');
  // Sans calibrage encore fait, le premier se fait seul.
  sysCalib={k:30,xpJour:null,le:''}; sysCharge=true; renderSysteme(); await new Promise(r=>setTimeout(r,50));
  out.auto=sysCalib.le===td();
  return out;
});
chk('Le calibrage : la pente pour le niveau 80 en 730 jours au rythme « si je fais tout »',cal.jours===730&&Math.abs(cal.k-730*cal.xpJour/6320)<0.01,JSON.stringify(cal));
chk('...écrit dans le classeur',cal.ligne.k>0&&cal.ligne.le&&cal.ligne.xpJour===cal.xpJour,JSON.stringify(cal.ligne));
chk('...les paliers le disent : le rang S dans 2 ans, puis SS et SSS',/2,0 ans/.test(cal.s)&&cal.ss&&/Calibré pour le rang S en 2 ans/.test(cal.texte),cal.s+' / '+cal.texte);
chk('...le premier calibrage se fait seul',cal.auto===true);

console.log('=== 10. PHASE 2 : RETOUR, PÉNALITÉ, DONJONS, URGENCES, TITRES ===');
const p2=await p.evaluate(async()=>{
  const out={}, L=(h,d)=>({id:'x'+Math.random(),habit_id:h,date:d,reward_eur:0,category:'Santé'});
  sysReset={depuis:'',objectifs:[]}; sysCalib={k:50,xpJour:null,le:'banc'}; sysDonjons={}; sysUrgences={}; sysTitres={actif:''};
  sysQuete={versions:[{depuis:J(40),habits:['1','2','4']}],minimum:{}};
  goals=[];
  // Le retour : rien depuis 10 jours, deux habitudes sur trois suffisent.
  habitsLog=[L(1,J(10)),L(2,J(10)),L(4,J(10)),L(1,td()),L(2,td())];
  out.retour=[sysRetour(td()),sysQueteRequis(td(),3),sysQueteFaite(td())].join('|');
  out.retourJ2=sysRetour(J(-2))&&!sysRetour(J(-3));
  // Sans pause, il faut tout.
  habitsLog=[L(1,J(1)),L(2,J(1)),L(4,J(1)),L(1,td()),L(2,td())];
  out.normal=[sysRetour(td()),sysQueteFaite(td())].join('|');
  // La pénalité : hier ratée (1 sur 3), aujourd'hui accomplie → prime doublée.
  sysQuete={versions:[{depuis:J(3),habits:['1','2','4']}],minimum:{}};
  habitsLog=[L(1,J(3)),L(2,J(3)),L(4,J(3)),L(1,J(2)),L(2,J(2)),L(4,J(2)),L(1,J(1)),L(1,td()),L(2,td())];
  out.penalAvant=sysRachat(td());
  const x0=sysEtat().xp; habitsLog.push(L(4,td())); const e=sysEtat();
  out.penal=[e.rachats,e.quetes,e.xp-x0].join('|');
  renderSysteme(); await new Promise(r=>setTimeout(r,30));
  out.bandeau=!!document.querySelector('#sysBox .sys-penal');
  out.okTexte=(document.querySelector('#sysBox .sys-ok')||{}).textContent||'';
  // Les donjons.
  const cp=(n,f)=>JSON.stringify(Array.from({length:n},(_,i)=>({t:'É'+i,d:i<f})));
  goals=[{id:'g3',title:'Semi-marathon',category:'Santé',status:'active',progress:0,checkpoints:cp(4,2),reward_eur:0},
    {id:'g4',title:'Lire 10 livres',category:'Esprit',status:'active',progress:0,reward_eur:15,reward:'Une liseuse'},
    {id:'g5',title:'Libre',category:'Finance',status:'active',progress:20,reward_eur:0,target_date:J(-3)}];
  const xa=sysEtat().xp;
  sysDonjons={g3:{rang:'C',habits:[],cible:0,debut:J(20)},g4:{rang:'D',habits:['5'],cible:10,debut:J(20)}};
  habitsLog.push(L(5,J(12)),L(5,J(11)),L(5,J(10)),L(5,J(8)),L(5,J(6)));
  const xb=sysEtat().xp;
  out.etapes=xb-xa-5*10;
  out.cible=goalProgress(goals[1]);
  out.rangSug=[sysRangSuggere({id:'z',target_date:J(-10)}),sysRangSuggere({id:'z',target_date:J(-300)})].join(',');
  // Une quête urgente : le donjon g4 n'est plus entraîné depuis 6 jours.
  const u=sysUrgenceDuJour(); out.urg=u&&[u.type,u.habit,u.goal].join('|');
  renderSysteme(); await new Promise(r=>setTimeout(r,30));
  out.carteUrg=!!document.querySelector('#sysBox .sys-urg');
  out.portes=document.querySelectorAll('#sysBox .sys-porte').length;
  await sysUrgenceStatut('acceptee');
  out.ligneUrg=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='urgences')||[])[1]||'{}')[td()].statut;
  const xu=sysEtat().xp;
  habitsLog.push(L(5,td())); renderSysteme(); await new Promise(r=>setTimeout(r,80));
  out.urgFaite=[sysUrgences[td()].statut,sysEtat().xp-xu].join('|');
  // Le boss : toutes les étapes de g3 faites → donjon nettoyé, annonce.
  modalFerme('sysAnnModal');
  goals[0].checkpoints=cp(4,4);
  const e2=sysEtat(); out.nettoye=e2.donjonsFaits.join(',');
  renderSysteme(); await new Promise(r=>setTimeout(r,30));
  out.annonce=document.getElementById('sysAnnModal').classList.contains('open')&&/Donjon nettoyé/i.test(document.getElementById('sysAnnT').textContent);
  modalFerme('sysAnnModal');
  // Un objectif hors donjon compte toujours 100 XP.
  const xh=sysEtat().xp; goals[2].status='done'; out.horsDonjon=sysEtat().xp-xh; goals[2].status='active';
  // Ouvrir une porte par la fenêtre.
  sysDonjonOuvrir(null); await new Promise(r=>setTimeout(r,20));
  const sel=document.getElementById('sysDjGoal'); out.choix=[...sel.options].map(o=>o.value).join(',');
  sel.value='g5'; sysDonjonRang(null);
  document.querySelector('#sysDjHabits input[value="3"]').checked=true;
  document.getElementById('sysDjCible').value='30';
  await sysDonjonEnregistrer();
  out.g5=JSON.stringify(sysDonjons.g5&&[sysDonjons.g5.rang,sysDonjons.g5.habits,sysDonjons.g5.cible,sysDonjons.g5.debut===td()]);
  out.ligneDj=Object.keys(JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='donjons')||[])[1]||'{}')).sort().join(',');
  // Fermer la porte.
  sysDonjonOuvrir('g5'); await sysDonjonFermer(); out.ferme=!sysDonjons.g5;
  // Les titres.
  const g=sysTitresGagnes(sysEtat()); out.titres=g.join(',');
  sysTitresOuvrir(); await new Promise(r=>setTimeout(r,20));
  out.boutons=[document.querySelectorAll('#sysTitresListe .sys-titre:not(.verrou)').length,document.querySelectorAll('#sysTitresListe .sys-titre.verrou').length].join('|');
  await sysTitrePorter('pourfendeur');
  out.porte=(document.querySelector('#sysBox .sys-titre-p')||{}).textContent;
  out.ligneTitre=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='titres')||[])[1]||'{}').actif;
  // La sauvegarde emporte les nouvelles clés.
  const t=BK_TABLES.find(x=>x[0]==='systeme'); out.bk=t[2]().map(x=>x.id).join(',');
  return out;
});
chk('Mode retour : après 10 jours sans rien, 2 habitudes sur 3 suffisent pour la prime',p2.retour==='true|2|true',p2.retour);
chk('...pendant trois jours seulement',p2.retourJ2===true);
chk('...sans pause, il faut toute la quête',p2.normal==='false|false',p2.normal);
chk('Zone de pénalité : la quête ratée hier, la prime du jour double (+20 de coche, +100)',p2.penalAvant===true&&p2.penal==='1|3|120',JSON.stringify([p2.penalAvant,p2.penal]));
chk('...le bandeau rouge, la prime doublée affichée',p2.bandeau&&/\+100 XP/.test(p2.okTexte),p2.okTexte);
chk('Donjons : chaque étape faite rapporte selon le rang (C : 2 × 50)',p2.etapes===100,String(p2.etapes));
chk('...un donjon sans étapes avance par ses habitudes d\'entraînement (5 / 10)',p2.cible===50,String(p2.cible));
chk('...le rang proposé suit l\'échéance (10 j → E, 300 j → B)',p2.rangSug==='E,B',p2.rangSug);
chk('Quête urgente : le donjon à l\'arrêt depuis 6 jours',p2.urg==='habit|5|g4'&&p2.carteUrg,String(p2.urg));
chk('...les portes affichées',p2.portes===2,String(p2.portes));
chk('...acceptée, écrite dans le classeur',p2.ligneUrg==='acceptee',p2.ligneUrg);
chk('...accomplie en cochant l\'habitude : +40 XP (et la coche)',p2.urgFaite==='faite|50',p2.urgFaite);
chk('Le boss vaincu : donjon nettoyé et annoncé',p2.nettoye==='C'&&p2.annonce===true,JSON.stringify([p2.nettoye,p2.annonce]));
chk('...un objectif hors donjon vaut toujours 100 XP',p2.horsDonjon===100,String(p2.horsDonjon));
chk('Ouvrir une porte : seuls les objectifs libres en cours, rang proposé, habitudes et cible',p2.choix==='g5'&&p2.g5==='["E",["3"],30,true]',JSON.stringify([p2.choix,p2.g5]));
chk('...écrit dans le classeur, et l\'on peut fermer la porte',p2.ligneDj==='g3,g4,g5'&&p2.ferme===true,p2.ligneDj);
chk('Titres : gagnés par l\'historique',/eveil/.test(p2.titres)&&/rachat/.test(p2.titres)&&/chasseurPortes/.test(p2.titres)&&/pourfendeur/.test(p2.titres)&&!/monarque/.test(p2.titres),p2.titres);
chk('...la fenêtre montre gagnés et verrouillés',p2.boutons===p2.titres.split(',').length+'|'+(12-p2.titres.split(',').length),p2.boutons);
chk('...le titre porté s\'affiche sous le niveau, écrit dans le classeur',/Pourfendeur/.test(p2.porte)&&p2.ligneTitre==='pourfendeur',JSON.stringify([p2.porte,p2.ligneTitre]));
chk('...la sauvegarde emporte donjons, urgences et titres',p2.bk==='quete,stats,reset,calibrage,donjons,urgences,titres',p2.bk);

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));
await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
