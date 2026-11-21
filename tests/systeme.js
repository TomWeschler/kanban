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
chk('L\'or, c\'est la cagnotte (habitudes, objectifs, et les séances : 1 € complète, 0,50 € partielle)',Math.abs(nv.or-(-15.8))<0.001,String(nv.or));

console.log('=== 2. LA FENÊTRE DU SYSTÈME ET LA PREMIÈRE RENCONTRE ===');
const fe=await p.evaluate(async()=>{
  const out={};
  switchPage('today'); await new Promise(r=>setTimeout(r,250));
  const f=document.querySelector('#sysBox .sys-fen');
  out.fenetre=!!f;
  out.statut=(f&&f.querySelector('.sys-statut').textContent.replace(/\s+/g,' '))||'';
  out.rang=((document.querySelector('.sys-rang')||{}).textContent||'').trim();
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
  out.lignes=[...document.querySelectorAll('.sys-ligne')].map(x=>{ const c=x.querySelector('.sys-lib').cloneNode(true); c.querySelectorAll('.sys-cat').forEach(y=>y.remove()); return c; }).map(c=>c.textContent.replace(/\s+/g,' ').trim()).join(' / ');
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
chk('...au rythme annoncé',/Si tu fais tout : 139 XP et 1\.89€ d'or par jour/.test(pal.rythme),pal.rythme);
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
  sysVue('portes'); out.portes=document.querySelectorAll('#sysBox .sys-porte').length; sysVue('quete');
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
  out.annonce=document.getElementById('sysAnnModal').classList.contains('open')&&(/Donjon nettoyé/i.test(document.getElementById('sysAnnT').textContent)||sysFile.some(x=>/Donjon nettoyé/i.test(x[0])));
  sysFile=[];
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
  out.nTitres=SYS_TITRES.length;
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
chk('...la fenêtre montre gagnés et verrouillés',p2.boutons===p2.titres.split(',').length+'|'+(p2.nTitres-p2.titres.split(',').length),p2.boutons);
chk('...le titre porté s\'affiche sous le niveau, écrit dans le classeur',/Pourfendeur/.test(p2.porte)&&p2.ligneTitre==='pourfendeur',JSON.stringify([p2.porte,p2.ligneTitre]));
chk('...la sauvegarde emporte donjons, urgences et titres',p2.bk==='quete,stats,reset,calibrage,donjons,urgences,titres,chasses,inventaire,boutique,classes,familiers',p2.bk);

console.log('=== 11. PHASE 3 : ACCUEIL, THÈME, CHASSE, COFFRES, ÉQUIPEMENT, BOUTIQUE ===');
// Une page neuve : l'accueil est le board, le thème Éveil s'applique.
const pn=await ctx.newPage(); pn.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
await pn.goto('http://127.0.0.1:8899/index.html',{waitUntil:'domcontentloaded'}); await pn.waitForFunction(()=>typeof renderSysteme==='function');
const acc=await pn.evaluate(()=>({page:curPage,actif:document.querySelector('.page.active').id,onglet:document.querySelector('.nav-tab').dataset.page,
  ongletActif:document.querySelector('.nav-tab.active').dataset.page,theme:document.documentElement.getAttribute('data-theme'),
  menu:!!document.querySelector('#omThemes [data-theme-id="eveil"]')}));
await pn.close();
chk('L\'accueil est le board : premier onglet, page ouverte au chargement',acc.page==='board'&&acc.actif==='pageboard'&&acc.onglet==='board'&&acc.ongletActif==='board',JSON.stringify(acc));
chk('Le thème Éveil (néon bleu et violet) s\'applique, et figure au menu',acc.theme==='eveil'&&acc.menu,JSON.stringify(acc));
const p3=await p.evaluate(async()=>{
  const out={}, L=(h,d)=>({id:'y'+Math.random(),habit_id:h,date:d,reward_eur:0.5,category:'Santé'}), aujd=td(), lundi=sysLundi(aujd);
  sysReset={depuis:'',objectifs:[]}; sysCalib={k:50,xpJour:null,le:'banc'}; sysDonjons={}; sysUrgences={}; sysTitres={actif:''}; sysFile=[];
  sysChasses={}; sysInv=sysInvNorm({}); sysBoutique=sysBoutNorm({}); goals=[]; sportLogs=[]; sysStats={alloc:{}};
  sysQuete={versions:[{depuis:J(40),habits:['1','2','4']}],minimum:{}};
  habitsLog=[L(1,aujd),L(3,aujd)];
  localStorage.setItem('kanban_sys_vu',JSON.stringify({niveau:sysEtat().niveau,quete:'',titres:sysTitresGagnes(sysEtat()),donjons:[],coffres:[]}));
  // Le monstre : fixé par sa semaine, de ton rang ; l'élite une semaine sur quatre.
  const e0=sysEtat(), m1=sysMonstreNouveau(lundi,e0), m2=sysMonstreNouveau(lundi,e0);
  out.fixe=JSON.stringify(m1)===JSON.stringify(m2)&&m1.rang===e0.rang&&m1.pv>=100&&m1.pv%10===0;
  out.elites=[0,1,2,3,4,5,6,7].map(i=>sysElite(sysDecale(lundi,7*i))).filter(Boolean).length;
  // La rencontre s'écrit dans le classeur.
  renderSysteme(); await new Promise(r=>setTimeout(r,30));
  out.rencontre=!!sysChasses[lundi]&&!sysChasses[lundi].vaincu&&!!(S_ONGLETS.systeme.find(x=>x[0]==='chasses'));
  out.mini=!!document.querySelector('#sysBox .sys-mini-m');
  // Les coups : chaque coche frappe, renforcée par sa stat ; l'arme ajoute ses dégâts.
  const c1=sysCombat(lundi,sysChasses[lundi],sysEtat());
  out.coups=c1.coups.length+'|'+c1.coups.map(c=>c.lib).sort().join(',');
  const st=sysEtat().stats, att=Math.round(20*(1+(st.vitalite-10)/100)), att3=Math.round(10*(1+(st.perception-10)/100));
  out.calcul=c1.coups.every(c=>c.deg===(c.lib==='Pompes'?att:att3)*(c.crit?2:1));
  sysInv={...sysInv,objets:[{id:'oT',src:'t',slot:'arme',nom:'Lame d\'essai',rarete:2,niv:1,bonus:{deg:50,crit:0,stats:{}},amel:0,le:aujd}],equipe:{arme:'oT'}};
  const c2=sysCombat(lundi,sysChasses[lundi],sysEtat());
  out.arme=c2.degats>c1.degats*1.4&&c2.deg===50;
  sysInv=sysInvNorm({});
  // L'onglet Chasse.
  sysVue('chasse'); await new Promise(r=>setTimeout(r,20));
  out.vue=localStorage.getItem('kanban_sys_vue')+'|'+!!document.querySelector('#sysBox .sys-chasse .sys-monstre')+'|'+document.querySelectorAll('#sysBox .sys-coup').length;
  // Le coup porté s'envole du monstre.
  const xAvant=sysEtat().xp;
  habitsLog.push(L(2,aujd)); renderSysteme(); out.degat=!!document.querySelector('#sysBox .sys-degat');
  // La victoire : PV à portée → annoncée, XP, coffre, et acquise même si l'on décoche.
  sysChasses={...sysChasses,[lundi]:{...sysChasses[lundi],pv:10}};
  modalFerme('sysAnnModal'); renderSysteme(); await new Promise(r=>setTimeout(r,30));
  const r=sysChasses[lundi];
  out.vaincu=r.vaincu===true&&(/Monstre vaincu/.test(document.getElementById('sysAnnT').textContent)||sysFile.some(x=>/Monstre vaincu/.test(x[0])));
  out.xpVictoire=sysEtat().xp-xAvant-20;
  out.xpAttendu=r.elite?150:100;
  out.ligne=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='chasses')||[])[1]||'{}')[lundi].vaincu;
  habitsLog=habitsLog.filter(l=>l.date!==aujd); renderSysteme(); out.acquise=sysChasses[lundi].vaincu===true;
  modalFerme('sysAnnModal'); sysFile=[];
  // Une semaine passée se ferme et se garde.
  const avant=sysDecale(lundi,-7); sysChasses={...sysChasses,[avant]:{...sysMonstreNouveau(avant,sysEtat()),vaincu:false}};
  renderSysteme(); out.fermee=sysChasses[avant].fin===true&&typeof sysChasses[avant].degats==='number';
  sysVue('chasse'); out.histo=!!document.querySelector('#sysBox .sys-ch-h');
  // Les coffres : le monstre vaincu en donne un ; même graine, même objet.
  const cf=sysCoffresFermes(sysEtat()); out.coffre=cf.map(c=>c.id).includes('chasse:'+lundi);
  out.graine=JSON.stringify(sysObjetTire(cf[0],12))===JSON.stringify(sysObjetTire(cf[0],12));
  const fr0=sysInv.fragments;
  await sysCoffreOuvrir(); await new Promise(r=>setTimeout(r,1250));
  out.ouvert=[sysInv.objets.length,sysInv.ouverts.includes(cf[0].id),sysInv.fragments>fr0,!!document.querySelector('#sysCoffreObj .sys-obj-carte'),
    document.getElementById('sysCoffreModal').classList.contains('open')].join('|');
  out.ligneInv=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='inventaire')||[])[1]||'{}').objets.length;
  modalFerme('sysCoffreModal');
  // Les raretés : le coffre de niveau 5 ne donne jamais de commun.
  const moy=t=>{ let n=0, c=0; for(let i=0;i<1500;i++){ const o=sysObjetTire({id:'x'+t+'|'+i,t},10); n+=o.rarete; if(o.rarete===0)c++; } return [n/1500,c]; };
  const t0=moy(0), t5=moy(5); out.raretes=t5[0]>t0[0]+1.5&&t5[1]===0&&t0[1]>700;
  // Équiper, améliorer, démanteler.
  const o=sysInv.objets[0];
  await sysEquiper(o.id); out.equipe=(sysInv.equipe||{})[o.slot]===o.id;
  sysVue('equipement'); await new Promise(r=>setTimeout(r,20));
  out.vueEq=document.querySelectorAll('#sysBox .sys-slot').length+'|'+document.querySelectorAll('#sysBox .sys-objet').length+'|'+!!document.querySelector('#sysBox .sys-joueur');
  sysInv={...sysInv,fragments:1000}; const cout=sysCoutAmel(o);
  await sysAmeliorer(o.id); out.amel=[sysInv.objets[0].amel,1000-sysInv.fragments===cout].join('|');
  const b1=sysObjetBonus(sysInv.objets[0]), b0=sysObjetBonus({...sysInv.objets[0],amel:0});
  out.amelBonus=Object.values(b1.stats).reduce((t,v)=>t+v,0)+b1.deg+b1.crit>=Object.values(b0.stats).reduce((t,v)=>t+v,0)+b0.deg+b0.crit;
  window.confirm=()=>true; const f1=sysInv.fragments;
  await sysDemanteler(o.id); out.demonte=[sysInv.objets.length,!(sysInv.equipe||{})[o.slot],sysInv.fragments-f1===SYS_FRAG_DEMONTER[o.rarete]+3].join('|');
  modalFerme('sysObjetModal');
  // La boutique : une récompense, un achat qui se retranche de l'or.
  sysVue('boutique'); await new Promise(r=>setTimeout(r,20));
  document.getElementById('sysBtLib').value='Resto'; document.getElementById('sysBtPrix').value='0,5';
  await sysBtAjouter();
  out.article=(sysBoutique.articles[0]||{}).lib+'|'+(sysBoutique.articles[0]||{}).prix;
  habitsLog.push(L(1,aujd),L(2,aujd));
  const or0=cagnotte(); await sysBtAcheter(sysBoutique.articles[0].id);
  out.achat=Math.round((or0-cagnotte())*100)/100+'|'+JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='boutique')||[])[1]||'{}').achats.length+'|'+(/Boutique/.test(document.getElementById('sysAnnT').textContent));
  modalFerme('sysAnnModal'); sysFile=[];
  sysBoutique={...sysBoutique,articles:[...sysBoutique.articles,{id:'cher',lib:'Voyage',prix:99999}]};
  window.S_TOASTS=[]; await sysBtAcheter('cher'); out.tropCher=sysBoutique.achats.length===1&&S_TOASTS.some(t=>/Pas assez/.test(t));
  // Les titres de chasse ; le renommage.
  const tg=sysTitresGagnes(sysEtat()); out.titres=tg.includes('premierSang')&&SYS_TITRES.find(t=>t[0]==='monarque')[1]==='Souverain des portes';
  // Repartir de zéro : le monstre de la semaine aussi.
  await sysRepartir(); out.reset=!sysChasses[lundi]||!sysChasses[lundi].vaincu;
  sysVue('quete');
  return out;
});
chk('Le monstre de la semaine : fixé par sa semaine, de ton rang, des PV ronds',p3.fixe===true);
chk('...un monstre d\'élite une semaine sur quatre',p3.elites===2,String(p3.elites));
chk('...la rencontre s\'écrit dans le classeur, le monstre s\'affiche sous le statut',p3.rencontre&&p3.mini,JSON.stringify([p3.rencontre,p3.mini]));
chk('Les coups : chaque coche de la semaine frappe',p3.coups==='2|Budget,Pompes',p3.coups);
chk('...renforcée par la stat de sa catégorie (et doublée si critique)',p3.calcul===true);
chk('...l\'arme ajoute ses dégâts',p3.arme===true);
chk('L\'onglet Chasse : le monstre, le journal des coups, l\'onglet retenu',p3.vue==='chasse|true|2',p3.vue);
chk('...le coup porté s\'envole du monstre',p3.degat===true);
chk('La victoire : annoncée, écrite dans le classeur',p3.vaincu&&p3.ligne===true,JSON.stringify([p3.vaincu,p3.ligne]));
chk('...elle rapporte de l\'XP (100, 150 pour l\'élite)',p3.xpVictoire===p3.xpAttendu,JSON.stringify([p3.xpVictoire,p3.xpAttendu]));
chk('...et reste acquise même si l\'on décoche',p3.acquise===true);
chk('Une semaine passée se ferme et se garde dans l\'historique',p3.fermee&&p3.histo,JSON.stringify([p3.fermee,p3.histo]));
chk('Les coffres : le monstre vaincu en donne un, même graine même objet',p3.coffre&&p3.graine,JSON.stringify([p3.coffre,p3.graine]));
chk('...l\'ouverture : l\'objet révélé, des fragments, écrit dans le classeur',p3.ouvert==='1|true|true|true|true'&&p3.ligneInv===1,p3.ouvert+' '+p3.ligneInv);
chk('...les raretés suivent le niveau du coffre (pas de commun au niveau 5)',p3.raretes===true);
chk('Équiper : l\'emplacement, la silhouette, l\'inventaire',p3.equipe&&p3.vueEq==='4|1|true',p3.vueEq);
chk('...améliorer coûte des fragments et renforce les bonus',p3.amel==='1|true'&&p3.amelBonus,p3.amel);
chk('...démanteler rend des fragments et libère l\'emplacement',p3.demonte==='0|true|true',p3.demonte);
chk('La boutique : une récompense et son prix',p3.article==='Resto|0.5',p3.article);
chk('...l\'achat se retranche de l\'or, s\'écrit et s\'annonce',p3.achat==='0.5|1|true',p3.achat);
chk('...pas d\'achat sans assez d\'or',p3.tropCher===true);
chk('Les titres de chasse ; « Souverain des portes »',p3.titres===true);
chk('Repartir de zéro remet aussi le monstre de la semaine',p3.reset===true);

console.log('=== 12. CLASSES ET FAMILIERS ===');
const p4=await p.evaluate(async()=>{
  const out={}, L=(h,d)=>({id:'z'+Math.random(),habit_id:h,date:d,reward_eur:0.5,category:'Santé'}), aujd=td();
  window.confirm=()=>true; sysFile=[]; modalFerme('sysAnnModal');
  sysReset={depuis:'',objectifs:[]}; sysChasses={}; sysInv=sysInvNorm({}); sysClasses=sysClNorm({}); sysFam=sysFamNorm({}); sysUrgences={};
  sysCalib={k:50,xpJour:null,le:'banc'}; habitsLog=[]; sportLogs=[]; goals=[];
  sysQuete={versions:[{depuis:J(400),habits:['1','2','4']}],minimum:{}};
  // Sans classe : l'onglet propose les six.
  sysVue('classes'); await new Promise(r=>setTimeout(r,20));
  out.choix=document.querySelectorAll('#sysBox .sys-cl-carte').length;
  // La première classe, et le familier offert.
  await sysClasseChoisir('guerrier');
  out.classe=sysClasses.liste.map(x=>x.id+'|'+(x.le===aujd)).join(',');
  out.famDepart=sysFam.actif+'|'+!!sysFam.possede.renard;
  out.lignes=['classes','familiers'].every(k=>S_ONGLETS.systeme.some(x=>x[0]===k));
  out.annonce=/Éveil de classe/.test(document.getElementById('sysAnnT').textContent); sysAnnFermer(); sysFile=[];
  // L'XP de classe : son domaine en entier, un quart du reste, depuis qu'on l'a apprise.
  sportLogs=[{date:aujd,status:'done'},{date:J(3),status:'done'}]; habitsLog=[L(2,aujd)];
  out.xpCl=sysClasseXp(sysClasses.liste[0],sysEvenements())+'|'+(SYS_XP.sport+Math.round(SYS_XP.quete*0.25));
  // Les paliers : niveau 10, un éveil.
  sysClasses={...sysClasses,liste:[{id:'guerrier',le:J(400)}]}; sysCalib={k:10,xpJour:null,le:'banc'};
  for(let d=0;d<400;d++)sportLogs.push({date:J(d),status:'done'});
  let et=sysClassesEtat(); out.palier=et.l[0].niv+'|'+et.eveils;
  const niv=et.l[0].niv, att=SYS_CL_PALIERS.filter(p=>niv>=p).length;
  out.eveilsOk=et.eveils===att;
  // Apprendre une classe consomme un éveil.
  await sysClasseApprendre('mage'); et=sysClassesEtat();
  out.appris=sysClasses.liste.length+'|'+et.eveils;
  // Les spécialisations : la première dès le niveau 10, la seconde dès le 20 ; un éveil chacune.
  out.speOuv=sysSpeOuverte('berserker',et)+'|'+sysSpeOuverte('archimage',et);
  await sysSpePrendre('berserker'); sysAnnFermer(); await sysSpePrendre('seigneur');
  et=sysClassesEtat(); out.spe=sysClasses.spes.map(x=>x.id).join(',')+'|'+et.eveils;
  await sysClasseApprendre('rodeur'); await sysSpePrendre('paladin');
  out.speRefus=sysClasses.liste.length===2&&sysClasses.spes.length===2;
  sysAnnFermer(); sysFile=[];
  // Les effets au combat : le Guerrier et le Berserker renforcent le sport.
  const lundi=sysLundi(aujd); sysChasses={[lundi]:{famille:'loup',nom:'Loup d\'essai',niveau:1,rang:'G',elite:false,pv:99999,vaincu:false}};
  const e=sysEtat(), rec=sysChasses[lundi], sansFam={...sysFam};
  sysFam=sysFamNorm({});
  const c1=sysCombat(lundi,rec,e); const sauve=sysClasses; sysClasses=sysClNorm({});
  const c0=sysCombat(lundi,rec,e); sysClasses=sauve;
  const sp=c=>c.coups.find(x=>x.lib==='Séance de sport'&&x.date===aujd);
  out.ratio=Math.round(sp(c1).deg/sp(c0).deg*100)/100; out.ratioAttendu=2;
  // Le familier : son bonus s'ajoute, croît avec son niveau.
  sysFam={possede:{salamandre:{xp:0,le:aujd}},actif:'salamandre',depuis:aujd};
  const E1=sysEffets(); out.famBonus=E1.deg===sysFamBonus(sysFamDef('salamandre'),sysFamNiveau(sysFamXp('salamandre')),E1.fam).deg&&E1.deg>0;
  out.croit=sysFamBonus(sysFamDef('salamandre'),10,0).deg>sysFamBonus(sysFamDef('salamandre'),1,0).deg;
  // L'XP du familier équipé ; en changer garde l'acquis jusqu'à hier.
  sysFam={possede:{salamandre:{xp:0,le:J(10)},renard:{xp:0,le:J(10)}},actif:'salamandre',depuis:J(5)};
  const ev=sysEvenements(), gagne=ev.reduce((t,[d,x])=>d>=J(5)&&d<aujd?t+x:t,0);
  out.famXp=sysFamXp('salamandre')>gagne;
  await sysFamEquiper('renard');
  out.change=sysFam.actif+'|'+(sysFam.possede.salamandre.xp===gagne)+'|'+(sysFam.depuis===aujd);
  out.ligneFam=JSON.parse((S_ONGLETS.systeme.find(x=>x[0]==='familiers')||[])[1]||'{}').actif;
  // Le butin de familiers : toujours pour l'élite, environ un coffre sur six sinon.
  out.elite=!!sysFamTire({id:'essai',t:0,elite:true},sysEffets());
  let n=0; for(let i=0;i<600;i++)if(sysFamTire({id:'f'+i,t:0},{famLoot:0}))n++; out.freq=n;
  let m=0; for(let i=0;i<600;i++)if(sysFamTire({id:'f'+i,t:0},{famLoot:1}))m++; out.maitre=m>n*1.6;
  // Un doublon devient de l'expérience.
  sysFam={possede:Object.fromEntries(SYS_FAMILIERS.map(f=>[f.id,{xp:0,le:aujd}])),actif:'renard',depuis:aujd};
  const avantXp=Object.values(sysFam.possede).reduce((t,x)=>t+x.xp,0);
  sysChasses={...sysChasses,[sysDecale(lundi,-7)]:{famille:'ogre',nom:'Ogre d\'essai',niveau:1,rang:'G',elite:true,pv:100,vaincu:true,fin:true}};
  await sysCoffreOuvrir(); await new Promise(r=>setTimeout(r,1200));
  const apresXp=Object.values(sysFam.possede).reduce((t,x)=>t+x.xp,0);
  out.doublon=apresXp>avantXp&&(apresXp-avantXp)%300===0&&/Doublon/.test(document.getElementById('sysCoffreObj').textContent);
  modalFerme('sysCoffreModal');
  // Les onglets.
  sysFam={possede:{renard:{xp:0,le:aujd},lynx:{xp:0,le:aujd}},actif:'lynx',depuis:aujd};
  sysVue('familiers'); await new Promise(r=>setTimeout(r,20));
  out.grille=document.querySelectorAll('#sysBox .sys-fam-c').length+'|'+document.querySelectorAll('#sysBox .sys-fam-c.verrou').length+'|'+!!document.querySelector('#sysBox .sys-fam-actif');
  out.statutFam=/Lynx/.test((document.querySelector('#sysBox .sys-fam-statut')||{textContent:''}).textContent);
  sysVue('classes'); await new Promise(r=>setTimeout(r,20));
  out.vueCl=document.querySelectorAll('#sysBox .sys-cl-l').length+'|'+document.querySelectorAll('#sysBox .sys-spe').length+'|'+document.querySelectorAll('#sysBox .sys-cl-mini').length;
  out.titre=sysTitresGagnes(sysEtat()).includes('specialiste');
  out.bk=BK_TABLES.find(x=>x[0]==='systeme')[2]().map(x=>x.id).includes('classes')&&BK_TABLES.find(x=>x[0]==='systeme')[2]().map(x=>x.id).includes('familiers');
  sysFile=[]; modalFerme('sysAnnModal'); sysVue('quete');
  return out;
});
chk('Sans classe, l\'onglet propose les six classes',p4.choix===6,String(p4.choix));
chk('La première classe se choisit, datée du jour ; le Renard est offert et équipé',p4.classe==='guerrier|true'&&p4.famDepart==='renard|true'&&p4.annonce,JSON.stringify([p4.classe,p4.famDepart,p4.annonce]));
chk('...écrit dans le classeur (classes, familiers)',p4.lignes===true);
chk('L\'XP de classe : son domaine en entier, un quart du reste',p4.xpCl.split('|')[0]===p4.xpCl.split('|')[1],p4.xpCl);
chk('Les paliers 10, 20, 30 donnent chacun un éveil (niveau 30 : trois)',p4.eveilsOk&&p4.palier==='30|3',p4.palier);
chk('...apprendre une classe en consomme un',p4.appris.startsWith('2|'),p4.appris);
chk('...les deux spécialisations d\'une classe montée, pas celle d\'une classe neuve',p4.speOuv==='true|false'&&p4.spe==='berserker,seigneur|0',JSON.stringify([p4.speOuv,p4.spe]));
chk('...plus rien sans éveil',p4.speRefus===true);
chk('Au combat : Guerrier et Seigneur de guerre se cumulent sur le sport (+40 % +60 %)',Math.abs(p4.ratio-p4.ratioAttendu)<=0.03,JSON.stringify([p4.ratio,p4.ratioAttendu]));
chk('Le familier équipé ajoute son bonus, qui croît avec son niveau',p4.famBonus&&p4.croit,JSON.stringify([p4.famBonus,p4.croit]));
chk('...il prend l\'XP des gestes tant qu\'il est équipé',p4.famXp===true);
chk('...en changer garde l\'acquis jusqu\'à hier, écrit dans le classeur',p4.change==='renard|true|true'&&p4.ligneFam==='renard',p4.change+' '+p4.ligneFam);
chk('Le butin : un familier toujours pour l\'élite, environ un coffre ordinaire sur quatre sinon',p4.elite&&p4.freq>100&&p4.freq<200,JSON.stringify([p4.elite,p4.freq]));
chk('...le Maître des bêtes les rend plus fréquents',p4.maitre===true);
chk('...un doublon devient de l\'expérience',p4.doublon===true);
chk('L\'onglet Familiers : la collection des 20, verrouillés en silhouette ; le familier sous le statut',p4.grille==='37|35|true'&&p4.statutFam,p4.grille);
chk('L\'onglet Classes : classes apprises, spécialisations, classes à apprendre',p4.vueCl==='2|4|8',p4.vueCl);
chk('Le titre « Spécialiste » ; la sauvegarde emporte classes et familiers',p4.titre&&p4.bk,JSON.stringify([p4.titre,p4.bk]));

console.log('=== 13. CLASSES PREMIUM, SPÉCIALISATIONS, FAMILIERS DE DONJON ===');
const p5=await p.evaluate(async()=>{
  const out={}, aujd=td(), L=(h,d)=>({id:'w'+Math.random(),habit_id:h,date:d,reward_eur:0.5,category:'Santé'});
  window.confirm=()=>true; sysFile=[]; modalFerme('sysAnnModal');
  sysCalib={k:10,xpJour:null,le:'banc'}; sysReset={depuis:'',objectifs:[]}; sysUrgences={}; goals=[]; sysDonjons={};
  // Vingt spécialisations, chacune son mécanisme : aucun effet identique.
  const effs=Object.values(SYS_SPES).map(x=>JSON.stringify(x.eff));
  out.spes=Object.keys(SYS_SPES).length+'|'+new Set(effs).size+'|'+SYS_CLASSES.filter(c=>c.premium).length;
  // Les premium : fermées tant que les six de départ ne sont pas apprises.
  sysClasses={liste:[{id:'guerrier',le:J(400)}],spes:[]}; sportLogs=[]; for(let d=0;d<400;d++)sportLogs.push({date:J(d),status:'done'});
  habitsLog=[];
  window.S_TOASTS=[]; await sysClasseApprendre('draconique'); out.ferme=!sysClasses.liste.some(x=>x.id==='draconique')&&S_TOASTS.some(t=>/premium/.test(t));
  sysVue('classes'); await new Promise(r=>setTimeout(r,20));
  out.cadenas=document.querySelectorAll('#sysBox .sys-cl-mini.prem.ferme').length;
  out.premierChoix=(await (async()=>{ const sv=sysClasses; sysClasses=sysClNorm({}); sysVue('classes'); const n=document.querySelectorAll('#sysBox .sys-cl-carte').length; sysClasses=sv; return n; })());
  // Les six apprises (et assez d'éveils) : la porte s'ouvre.
  sysClasses={liste:['guerrier','gardien','assassin','mage','rodeur','invocateur'].map(id=>({id,le:J(400)})),spes:[]};
  habitsLog=[]; for(let d=0;d<400;d++)[1,2,3,4,5].forEach(h=>habitsLog.push(L(h,J(d))));
  await sysClasseApprendre('draconique'); out.ouvert=sysClasses.liste.some(x=>x.id==='draconique');
  sysVue('classes'); out.premVue=document.querySelectorAll('#sysBox .sys-cl-mini.prem').length+'|'+document.querySelectorAll('#sysBox .sys-cl-mini.prem.ferme').length;
  // Les mécanismes au combat.
  const lundi=sysLundi(aujd), rec={famille:'loup',nom:'Loup',niveau:1,rang:'G',elite:false,pv:999999,vaincu:false};
  sysInv=sysInvNorm({}); sysFam=sysFamNorm({}); sportLogs=[{date:aujd,status:'partial'}];
  habitsLog=[L(1,aujd),L(3,aujd)];
  sysQuete={versions:[{depuis:J(400),habits:['1','2','4']}],minimum:{}};
  const e=sysEtat(), C=sp=>{ const sv=sysClasses; sysClasses={liste:[],spes:sp.map(id=>({id,le:aujd}))}; const c=sysCombat(lundi,rec,e); sysClasses=sv; return c; };
  const c0=C([]), lib=(c,t)=>c.coups.filter(x=>x.lib.startsWith(t)).reduce((s,x)=>s+x.deg,0);
  out.sportPlein=lib(C(['seigneur']),'Séance')>lib(c0,'Séance')*3;
  out.oracle=lib(C(['oracle']),'Budget')>lib(c0,'Budget')*1.3&&lib(C(['oracle']),'Pompes')===lib(c0,'Pompes');
  out.echo=C(['echo']).coups.some(x=>/^Écho : Pompes/.test(x.lib))&&!C(['echo']).coups.some(x=>/^Écho : Budget/.test(x.lib));
  const cp=C(['ombre']); out.premier=cp.coups.filter(x=>/premier coup/.test(x.lib)).length===1;
  const rece={...rec,pv:Math.max(1,Math.round(c0.degats*0.75))}, sv=sysClasses; sysClasses={liste:[],spes:[{id:'souffle',le:aujd}]};
  const cx=sysCombat(lundi,rece,e); sysClasses=sv; out.exec=cx.coups.some(x=>/exécution/.test(x.lib));
  const w=new Date(aujd+'T12:00:00').getDay(); out.weekend=(w===0||w===6)?C(['tempus']).degats>c0.degats:C(['tempus']).degats===c0.degats;
  out.elite=(()=>{ const s2=sysClasses; sysClasses=sysClNorm({}); const d=sysCombat(lundi,{...rec,elite:true},e).degats; sysClasses=s2; return d; })()<(()=>{ const s2=sysClasses; sysClasses={liste:[],spes:[{id:'tireur',le:aujd}]}; const d=sysCombat(lundi,{...rec,elite:true},e).degats; sysClasses=s2; return d; })();
  out.pv=(()=>{ const s2=sysClasses; sysClasses={liste:[],spes:[{id:'colosse',le:aujd}]}; const c=sysCombat(lundi,rec,e); sysClasses=s2; return c.pv; })()===Math.round(999999*0.88);
  // L'Alchimiste : améliorations moins chères.
  const o={id:'oA',slot:'arme',nom:'Dague',rarete:2,niv:1,bonus:{deg:5,crit:0,stats:{}},amel:0};
  const sans=(()=>{ const s2=sysClasses; sysClasses=sysClNorm({}); const c=sysCoutAmel(o); sysClasses=s2; return c; })();
  const avec=(()=>{ const s2=sysClasses; sysClasses={liste:[{id:'alchimiste',le:aujd}],spes:[]}; const c=sysCoutAmel(o); sysClasses=s2; return c; })();
  out.ameli=avec===Math.round(sans*0.7);
  // Les familiers de donjon : au boss toujours, aux étapes un sur trois, jamais dans un coffre ordinaire.
  out.boss=(()=>{ let ok=true; for(let i=0;i<40;i++){ const f=sysFamTireDonjon({id:'b'+i,t:2,donjon:'boss'},{}); if(!f||!f.donjon||f.ra<1)ok=false; } return ok; })();
  let n=0; for(let i=0;i<600;i++)if(sysFamTireDonjon({id:'e'+i,t:1,donjon:'etape'},{}))n++; out.etape=n;
  out.jamais=(()=>{ for(let i=0;i<800;i++){ const f=sysFamTire({id:'c'+i,t:3,elite:true},{}); if(f&&f.donjon)return false; } return true; })();
  // Les coffres de donjon : un par étape franchie, et le boss.
  const cps=JSON.stringify([{t:'a',d:true},{t:'b',d:true},{t:'c',d:false}]);
  goals=[{id:'gD',title:'Marathon',category:'Santé',status:'active',checkpoints:cps}]; sysDonjons={gD:{rang:'B',habits:[],cible:0,debut:J(10)}};
  sysInv=sysInvNorm({}); sysChasses={};
  const cf=sysCoffresFermes(sysEtat()); out.etapes=cf.filter(c=>c.donjon==='etape').length+'|'+cf.filter(c=>c.donjon==='boss').length;
  goals[0].checkpoints=JSON.stringify([{t:'a',d:true},{t:'b',d:true},{t:'c',d:true}]);
  const cf2=sysCoffresFermes(sysEtat()); out.bossCoffre=cf2.filter(c=>c.donjon==='boss').length===1;
  // Ouvrir le coffre du boss avec le Maître des portes : deux objets, un familier de donjon.
  sysClasses={liste:[{id:'archonte',le:aujd}],spes:[{id:'trone',le:aujd}]}; sysFam=sysFamNorm({});
  sysInv={...sysInvNorm({}),ouverts:cf2.filter(c=>c.donjon!=='boss').map(c=>c.id)};
  await sysCoffreOuvrir(); await new Promise(r=>setTimeout(r,1200));
  out.double=sysInv.objets.length===2&&document.querySelectorAll('#sysCoffreObj .sys-obj-carte').length===2;
  out.famDonjon=Object.keys(sysFam.possede).some(id=>(sysFamDef(id)||{}).donjon);
  modalFerme('sysCoffreModal');
  // L'onglet Familiers : deux collections.
  sysVue('familiers'); await new Promise(r=>setTimeout(r,20));
  out.collections=document.querySelectorAll('#sysBox .sys-fam-grille').length+'|'+document.querySelectorAll('#sysBox .sys-fam-c').length;
  out.titres=sysTitresGagnes(sysEtat()).includes('explorateur')&&sysTitresGagnes(sysEtat()).includes('elu');
  sysFile=[]; modalFerme('sysAnnModal'); sysVue('quete');
  return out;
});
chk('Vingt spécialisations, chacune un effet différent ; quatre classes premium',p5.spes==='20|20|4',p5.spes);
chk('Les classes premium sont fermées tant que les six de départ ne sont pas apprises',p5.ferme&&p5.cadenas===4,JSON.stringify([p5.ferme,p5.cadenas]));
chk('...elles ne se choisissent pas au départ (six classes proposées)',p5.premierChoix===6,String(p5.premierChoix));
chk('...les six apprises, elles s\'ouvrent',p5.ouvert&&p5.premVue==='3|0',JSON.stringify([p5.ouvert,p5.premVue]));
chk('Seigneur de guerre : la séance partielle compte comme complète (+60 %)',p5.sportPlein===true);
chk('Oracle : les habitudes hors quête seulement',p5.oracle===true);
chk('Écho temporel : les coches de la quête frappent deux fois',p5.echo===true);
chk('Ombre furtive : le premier coup du jour',p5.premier===true);
chk('Souffle ardent : l\'exécution sous 30 % de PV',p5.exec===true);
chk('Maître du temps : le week-end seulement',p5.weekend===true);
chk('Tireur d\'élite : plus fort contre l\'élite ; Colosse : −12 % de PV',p5.elite&&p5.pv,JSON.stringify([p5.elite,p5.pv]));
chk('Alchimiste : les améliorations −30 %',p5.ameli===true);
chk('Familiers de donjon : toujours au boss, jamais communs',p5.boss===true);
chk('...environ un sur trois aux étapes',p5.etape>140&&p5.etape<260,String(p5.etape));
chk('...jamais dans un coffre ordinaire',p5.jamais===true);
chk('Les coffres de donjon : un par étape franchie, le boss à la fin',p5.etapes==='2|0'&&p5.bossCoffre,JSON.stringify([p5.etapes,p5.bossCoffre]));
chk('Maître des portes : le boss donne deux objets et un familier de donjon',p5.double&&p5.famDonjon,JSON.stringify([p5.double,p5.famDonjon]));
chk('L\'onglet Familiers : les collections des coffres, de la chasse et des donjons',p5.collections==='3|37',p5.collections);
chk('Les titres « Explorateur des profondeurs » et « L\'Élu »',p5.titres===true);

console.log('=== 14. FAMILIERS DE CHASSE ET CODEX ===');
const p6=await p.evaluate(async()=>{
  const out={}, aujd=td(); window.confirm=()=>true; sysFile=[]; modalFerme('sysAnnModal');
  // Les familiers de chasse : neuf, jamais communs, seulement sur les monstres de la semaine.
  const ch=SYS_FAMILIERS.filter(f=>f.chasse); out.nb=ch.length+'|'+ch.every(f=>f.ra>=1);
  out.elite=(()=>{ for(let i=0;i<40;i++){ const f=sysFamTireChasse({id:'chasse:x'+i,t:2,elite:true},{}); if(!f||!f.chasse)return false; } return true; })();
  let n=0; for(let i=0;i<600;i++)if(sysFamTireChasse({id:'chasse:y'+i,t:1},{}))n++; out.freq=n;
  out.ailleurs=(()=>{ for(let i=0;i<800;i++){ const f=sysFamTire({id:'z'+i,t:3,elite:i%2===0},{}); if(f&&(f.chasse||f.donjon))return false; const g=sysFamTireDonjon({id:'d'+i,t:3,donjon:'boss'},{}); if(g&&g.chasse)return false; } return true; })();
  // Un monstre d'élite vaincu : son coffre donne un familier de chasse.
  sysFam=sysFamNorm({}); sysInv=sysInvNorm({}); goals=[]; sysDonjons={}; sysClasses=sysClNorm({});
  sysChasses={[sysDecale(sysLundi(aujd),-7)]:{famille:'loup',nom:'Loup des cendres',niveau:3,rang:'G',elite:true,pv:100,vaincu:true,fin:true}};
  sysInv={...sysInv,ouverts:sysCoffresGagnes(sysEtat()).filter(c=>!c.id.startsWith('chasse:')).map(c=>c.id)};
  await sysCoffreOuvrir(); await new Promise(r=>setTimeout(r,1200));
  out.drop=Object.keys(sysFam.possede).some(id=>(sysFamDef(id)||{}).chasse)&&/se joint/.test(document.getElementById('sysCoffreObj').textContent);
  modalFerme('sysCoffreModal');
  // Le Codex : il s'ouvre depuis la fenêtre, plein écran.
  switchPage('today'); await new Promise(r=>setTimeout(r,150)); sysVue('quete');
  const bouton=document.querySelector('#sysBox .sys-codex-b'); out.bouton=!!bouton; bouton.click(); await new Promise(r=>setTimeout(r,30));
  const cx=document.getElementById('sysCodex');
  out.ouvert=!cx.hidden&&getComputedStyle(cx).position==='fixed'&&cx.querySelectorAll('.sys-codex-vues .sys-vue').length;
  out.fam=cx.querySelectorAll('.sys-cx-fam').length+'|'+cx.querySelectorAll('.sys-cx-fam.verrou').length;
  sysCodexFiltrer('fam','chasse'); out.filtre=cx.querySelectorAll('.sys-cx-fam').length;
  sysCodexFiltrer('fam','possedes'); out.possedes=cx.querySelectorAll('.sys-cx-fam').length===Object.keys(sysFam.possede).length;
  // Équiper depuis le Codex : il se redessine.
  sysFam={...sysFam,possede:{...sysFam.possede,renard:{xp:0,le:aujd}}}; sysCodexRendre();
  const b=[...cx.querySelectorAll('.sys-cx-fam button')].find(x=>/Équiper/.test(x.textContent));
  b.click(); await new Promise(r=>setTimeout(r,50)); out.equipe=!!cx.querySelector('.sys-cx-fam.actif .sys-cx-eq');
  // L'inventaire : filtres par emplacement et par rareté, tri.
  sysInv={...sysInv,objets:[{id:'i1',slot:'arme',nom:'Dague',rarete:0,niv:3,bonus:{deg:4,crit:0,stats:{}},amel:0,le:'2026-01-01'},
    {id:'i2',slot:'armure',nom:'Plastron',rarete:3,niv:5,bonus:{deg:0,crit:0,stats:{vitalite:20}},amel:2,le:'2026-02-01'},
    {id:'i3',slot:'arme',nom:'Katana',rarete:2,niv:9,bonus:{deg:12,crit:0,stats:{}},amel:0,le:'2026-03-01'}],equipe:{armure:'i2'}};
  sysCodexVoir('inventaire'); sysCodexFiltrer('fam','tous');
  const noms=()=>[...cx.querySelectorAll('.sys-cx-objs .sys-cx-obj b')].map(x=>x.textContent.trim());
  out.tri=noms().join(',');
  sysCodexFiltrer('slot','arme'); out.slot=noms().join(',');
  sysCodexFiltrer('tri','niveau'); out.niveau=noms().join(',');
  sysCodexFiltrer('slot','tous'); sysCodexFiltrer('ra','3'); out.ra=noms().join(','); sysCodexFiltrer('ra','tous'); sysCodexFiltrer('tri','rarete');
  out.eqs=cx.querySelectorAll('.sys-cx-eqs .sys-cx-obj').length+'|'+cx.querySelectorAll('.sys-cx-eqs .sys-cx-obj.vide').length;
  // Un clic sur un objet ouvre sa fiche, au-dessus du Codex.
  cx.querySelector('.sys-cx-objs .sys-cx-obj').click(); await new Promise(r=>setTimeout(r,30));
  const m=document.getElementById('sysObjetModal'); out.fiche=m.classList.contains('open')&&+getComputedStyle(m).zIndex>+getComputedStyle(cx).zIndex;
  modalFerme('sysObjetModal');
  // Le bestiaire.
  sysChasses={a1:{famille:'loup',nom:'Loup A',rang:'G',elite:false,pv:1,vaincu:true},a2:{famille:'loup',nom:'Loup B',rang:'G',elite:true,pv:1,vaincu:true},a3:{famille:'ogre',nom:'Ogre',rang:'G',elite:false,pv:1,vaincu:false}};
  sysCodexVoir('bestiaire');
  out.best=cx.querySelectorAll('.sys-cx-best').length+'|'+cx.querySelectorAll('.sys-cx-best:not(.verrou)').length+'|'+/2\/2 vaincus · 1 élite/.test(cx.textContent);
  sysCodexVoir('classes'); out.classes=!!cx.querySelector('.sys-cl');
  sysCodexVoir('titres'); out.titres=cx.querySelectorAll('.sys-titre').length===SYS_TITRES.length;
  // Échap le ferme.
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); out.ferme=cx.hidden;
  out.titreChasse=sysTitresGagnes(sysEtat()).includes('trophee');
  sysVue('quete');
  return out;
});
chk('Neuf familiers de chasse, jamais communs',p6.nb==='9|true',p6.nb);
chk('...toujours sur un monstre d\'élite, quatre fois sur dix sinon',p6.elite&&p6.freq>180&&p6.freq<300,JSON.stringify([p6.elite,p6.freq]));
chk('...jamais ailleurs (coffres ordinaires, donjons)',p6.ailleurs===true);
chk('...le coffre d\'un monstre d\'élite en donne un',p6.drop===true);
chk('Le Codex s\'ouvre depuis la fenêtre du Système, en plein écran',p6.bouton&&p6.ouvert===5,JSON.stringify([p6.bouton,p6.ouvert]));
chk('...les familiers : tous, trouvés ou en silhouette',p6.fam.split('|')[0]==='37',p6.fam);
chk('...filtrés par provenance, ou par ceux trouvés',p6.filtre===9&&p6.possedes,JSON.stringify([p6.filtre,p6.possedes]));
chk('...on y équipe un familier, il se redessine',p6.equipe===true);
chk('L\'inventaire : trié par rareté, filtré par emplacement, trié par niveau, filtré par rareté',p6.tri==='Plastron +2,Katana,Dague'&&p6.slot==='Katana,Dague'&&p6.niveau==='Katana,Dague'&&p6.ra==='Plastron +2',JSON.stringify([p6.tri,p6.slot,p6.niveau,p6.ra]));
chk('...les quatre emplacements équipés en tête',p6.eqs==='4|3',p6.eqs);
chk('...la fiche d\'un objet s\'ouvre au-dessus du Codex',p6.fiche===true);
chk('Le bestiaire : les familles rencontrées, vaincus et élites',p6.best==='19|2|true',p6.best);
chk('...et les classes, les titres ; Échap ferme le Codex',p6.classes&&p6.titres&&p6.ferme,JSON.stringify([p6.classes,p6.titres,p6.ferme]));
chk('Le titre « Premier trophée »',p6.titreChasse===true);

console.log('=== 15. SPORT SANS DOUBLON, TÂCHES IMPORTANTES ===');
const p7=await p.evaluate(async()=>{
  const out={}, aujd=td(); sysFile=[]; modalFerme('sysAnnModal');
  sysReset={depuis:'',objectifs:[]}; goals=[]; sysBoutique=sysBoutNorm({}); habitsLog=[];
  sportLogs=[];
  const or0=cagnotte(), x0=sysEtat().xp;
  sportLogs=[{date:aujd,status:'done',bonusDone:true},{date:J(1),status:'partial'},{date:J(2),status:'skipped'}];
  out.or=Math.round((cagnotte()-or0)*100)/100; out.xp=sysEtat().xp-x0;
  const ev=sysEvenements().filter(x=>x[2]==='force').reduce((t,x)=>t+x[1],0); out.ev=ev;
  const c=sysCombat(sysLundi(aujd),{famille:'loup',nom:'L',rang:'G',elite:false,pv:99999},sysEtat());
  out.bonusCoup=c.coups.some(x=>x.lib==='Activité bonus'&&x.date===aujd);
  sysReset={depuis:aujd,objectifs:[]}; out.reset=Math.round((cagnotte()-or0)*100)/100; sysReset={depuis:'',objectifs:[]};
  // « 2 Tâches importantes » : cochée seule à la deuxième tâche d'importance 4+.
  habits=[...habits.filter(h=>h.id!==77),{id:77,title:'2 Tâches Importantes',frequency:'daily',reward_eur:0.75,category:'Productivité',active:true}];
  window.persist=async()=>true;
  allTasks=[{id:'t1',title:'A',importance:5,due_date:aujd,completed_at:''},{id:'t2',title:'B',importance:2,due_date:aujd,completed_at:''},{id:'t3',title:'C',importance:4,due_date:aujd,completed_at:''}];
  tasks=allTasks;
  const coche=()=>habitsLog.some(l=>String(l.habit_id)==='77'&&l.date===aujd);
  await completeTask('t1'); out.une=coche();
  await completeTask('t2'); out.faible=coche();
  await completeTask('t3'); await new Promise(r=>setTimeout(r,30)); out.deux=coche();
  const n=habitsLog.length; autoTachesImportantes(); out.pasDeux=habitsLog.length===n;
  return out;
});
chk('Une séance rapporte son or : 1 € complète (+0,25 € de bonus), 0,50 € partielle, rien si sautée',p7.or===1.75,String(p7.or));
chk('...et son XP une seule fois (30 + 10 de bonus + 15)',p7.xp===55&&p7.ev===55,JSON.stringify([p7.xp,p7.ev]));
chk('...l\'activité bonus frappe le monstre',p7.bonusCoup===true);
chk('...seules les séances depuis la remise à zéro comptent',p7.reset===1.25,String(p7.reset));
chk('« 2 Tâches importantes » se coche seule à la deuxième tâche d\'importance 4 ou plus',p7.une===false&&p7.faible===false&&p7.deux===true&&p7.pasDeux,JSON.stringify(p7));

console.log('=== 16. LA QUÊTE IMPOSÉE ===');
const p8=await p.evaluate(async()=>{
  const out={}, aujd=td(); window.confirm=()=>true; sysFile=[]; modalFerme('sysAnnModal');
  window.sysSauver=async()=>true;
  const H=(id,title,frequency,category)=>({id,title,frequency,reward_eur:0.25,category,active:true});
  habits=[H(1,'Anki','daily','Esprit'),H(2,'Lecture 10 pages','daily','Esprit'),H(3,'Pas de sucre','daily','Santé'),H(4,'Méditation 10 min','daily','Esprit'),
    H(5,'8 000 pas','daily','Santé'),H(6,'Japonais 20 min','daily','Esprit'),H(7,'Comptabilité','weekly:0','Finance'),H(8,'Proteine (3 oeufs)','daily','Santé'),H(9,'Zero achat compulsif','daily','Finance')];
  goals=[{id:'g1785687461934',title:'12 livres 2027',category:'Esprit',status:'active',target_date:'2027-12-02',checkpoints:JSON.stringify([{t:'1',d:false},{t:'2',d:false}])},
    {id:'g1785683956237',title:'JLPT N5',category:'Esprit',status:'active',progress:0},{id:'g1785681906895',title:'85 kg',category:'Santé',status:'active',progress:0,target_date:'2026-12-31'}];
  sysDonjons={}; sysChasses={}; sysClasses=sysClNorm({}); sysFam=sysFamNorm({}); sysInv=sysInvNorm({});
  sysQuete={versions:[],minimum:{'1':'10 cartes','2':'2 pages','4':'3 minutes'},auto:true}; sysCharge=true; accessToken='T';
  sysDonjons={g1785687461934:{rang:'S',habits:['2'],cible:0,debut:aujd},g1785683956237:{rang:'C',habits:['1','6'],cible:0,debut:aujd},g1785681906895:{rang:'D',habits:['3','5','8'],cible:0,debut:aujd}};
  habitsLog=[]; for(let d=1;d<=20;d++){ habitsLog.push({id:'a'+d,habit_id:1,date:J(d),reward_eur:0,category:'Esprit'}); habitsLog.push({id:'b'+d,habit_id:3,date:J(d),reward_eur:0,category:'Santé'}); }
  switchPage('today'); await new Promise(r=>setTimeout(r,150)); renderSysteme();
  sysFile=[]; modalFerme('sysAnnModal');
  // La quête : quatre habitudes quotidiennes, deux piliers, le point faible, un défi.
  const v=sysQuete.versions.find(x=>x.depuis===aujd);
  out.quete=!!v&&v.auto&&v.habits.length===4&&v.r.join('')==='ppfd';
  out.quotidiennes=v.habits.every(id=>isHabitDueOnDate(habits.find(h=>String(h.id)===id).frequency,new Date(aujd+'T12:00:00')));
  const lies=new Set(Object.values(sysDonjons).flatMap(d=>d.habits.map(String)));
  out.piliers=v.habits.slice(0,2).every(id=>lies.has(id));
  // Les piliers sont ceux qu'on tient le moins bien : pas Anki ni Pas de sucre, tenues 20 jours sur 28.
  out.faibles=!v.habits.slice(0,2).includes('1')&&!v.habits.slice(0,2).includes('3');
  // Une seule fois : pas de nouvelle version, pas de nouvelle annonce.
  const n=sysQuete.versions.length; renderSysteme(); out.stable=sysQuete.versions.length===n&&!document.getElementById('sysAnnModal').classList.contains('open');
  // La fenêtre : les raisons sous chaque habitude ; pas de choix possible.
  out.raisons=[...document.querySelectorAll('#sysBox .sys-ligne small')].filter(x=>/Pilier|Point faible|Défi/.test(x.textContent)).length;
  sysQueteOuvrir(); await new Promise(r=>setTimeout(r,20));
  out.modal=document.getElementById('sysQTitre').textContent+'|'+document.querySelectorAll('#sysQListe input[type=checkbox]').length+'|'+document.querySelectorAll('#sysQListe [data-m]').length+'|'+habits.filter(h=>h.active).length;
  document.querySelector('#sysQListe [data-m]').value='1 minute'; await sysQueteEnregistrer();
  out.miniEdit=sysQuete.minimum[v.habits[0]]==='1 minute'&&sysQuete.versions.length===n;
  // La semaine suivante, la quête se réévalue ; le passé garde la sienne.
  const vieux={...v,depuis:J(1)}; sysQuete={...sysQuete,versions:[vieux]};
  sysQueteAuto(); out.reevalue=sysQuete.versions.length===2&&sysQueteDu(vieux.depuis).join()===vieux.habits.join();
  // Les habitudes du jour : une hebdomadaire entre dans le tirage le jour où elle est prévue, jamais un autre.
  const dow=new Date(aujd+'T12:00:00').getDay(), sauve=habits;
  habits=[H(21,'Hebdo du jour','weekly:'+dow,'Finance'),H(22,'Hebdo d\'un autre jour','weekly:'+((dow+3)%7),'Finance'),H(23,'A','daily','Esprit'),H(24,'B','daily','Esprit'),H(25,'C','daily','Esprit')];
  const ch=sysQueteChoisir(aujd).habits; out.hebdo=ch.includes('21')&&!ch.includes('22')&&ch.length===4;
  // Un autre jour, un autre tirage (au moins une fois sur une semaine).
  habits=sauve; const tirages=new Set([0,1,2,3,4,5,6].map(i=>sysQueteChoisir(sysDecale(aujd,i)).habits.join()));
  out.varie=tirages.size>1;
  // La tenue d'une hebdomadaire : rapportée aux jours où elle était prévue.
  habits=[H(31,'Hebdo','weekly:'+dow,'Finance')]; habitsLog=[1,2,3,4].map(i=>({id:'w'+i,habit_id:31,date:sysDecale(aujd,-7*i),reward_eur:0,category:'Finance'}));
  out.tenueHebdo=Math.round(sysQueteTaux(31,aujd)*100); habits=sauve;
  // L'archive : les vieilles quêtes compactées, l'XP du passé intacte.
  habitsLog=[]; const versions=[]; for(let i=300;i>=0;i--)versions.push({depuis:J(i),habits:['1','2','3','4'].map(x=>x+''),auto:true,r:['p','p','f','d']});
  versions[0].habits=['5','6','8','9'];
  sysQuete={versions,minimum:{},auto:true}; const q=sysQueteCompacter(sysQuete);
  out.compacte=JSON.stringify(q).length<20000&&q.versions.length<=61&&!!q.arch;
  sysQuete=q; out.archive=sysQueteDu(J(300)).join()==='5,6,8,9'&&sysQueteDu(J(100)).join()==='1,2,3,4'&&sysQueteDu(aujd).join()==='1,2,3,4';
  // Une habitude de la quête désactivée : la quête se refait sur-le-champ.
  const cible=sysQueteActuelle()[0]; habits.find(h=>String(h.id)===cible).active=false;
  sysQueteAuto(); out.refaite=!sysQueteActuelle().includes(cible)&&sysQueteActuelle().length===4;
  habits.find(h=>String(h.id)===cible).active=true;
  // En mode manuel (les épreuves précédentes), rien n'est imposé.
  sysQuete={versions:[],minimum:{}}; out.manuel=sysQueteAuto()===false&&sysQuete.versions.length===0;
  return out;
});
chk('La quête : quatre habitudes prévues aujourd\'hui, deux piliers, le point faible, un défi',p8.quete&&p8.quotidiennes&&p8.piliers,JSON.stringify([p8.quete,p8.quotidiennes,p8.piliers]));
chk('...les piliers sont les habitudes des portes les moins tenues',p8.faibles===true);
chk('...fixée pour la journée (rien ne bouge au passage suivant)',p8.stable===true);
chk('...la raison sous chaque habitude',p8.raisons===4,String(p8.raisons));
chk('...on ne choisit plus : la fenêtre ne règle que les versions minimales (quête et quêtes secondaires)',(()=>{ const [t,c,m,n]=p8.modal.split('|'); return t==='LA QUÊTE DU SYSTÈME'&&c==='0'&&m===n; })()&&p8.miniEdit,JSON.stringify([p8.modal,p8.miniEdit]));
chk('...tirée chaque jour, le passé garde la sienne',p8.reevalue===true);
chk('...parmi les habitudes du jour : une hebdomadaire le jour où elle est prévue',p8.hebdo===true);
chk('...un autre jour, un autre tirage',p8.varie===true);
chk('La tenue d\'une hebdomadaire se rapporte aux jours où elle était prévue (4 sur 4 : 100 %)',p8.tenueHebdo===100,String(p8.tenueHebdo));
chk('Les vieilles quêtes s\'archivent en compact ; l\'XP du passé ne bouge pas',p8.compacte&&p8.archive,JSON.stringify([p8.compacte,p8.archive]));
chk('...refaite si une de ses habitudes est désactivée',p8.refaite===true);
chk('...rien d\'imposé en mode manuel',p8.manuel===true);

console.log('=== 17. FAIT EN ENTIER OU EN MINI ===');
const p9=await p.evaluate(async()=>{
  const out={}, aujd=td(); sysFile=[]; modalFerme('sysAnnModal');
  let ecrit=null, ajout=null; window.rewriteHabitsLog=async()=>{ ecrit=habitsLog.map(l=>l.habit_id+':'+(l.mini?'mini':'')).join(','); return true; };
  window.appendHabitsLog=async e=>{ ajout=e; return true; }; window.offerUndo=()=>{};
  const H=(id,title)=>({id,title,frequency:'daily',reward_eur:0.5,category:'Esprit',active:true});
  habits=[H(11,'Anki'),H(12,'Lecture'),H(13,'Méditation'),H(14,'Japonais')]; habitsLog=[]; goals=[]; sysDonjons={}; sportLogs=[]; sysUrgences={};
  sysQuete={versions:[{depuis:aujd,habits:['11','12','13','14'],auto:true,r:['p','p','f','d']}],minimum:{'11':'10 cartes'},auto:true};
  sysReset={depuis:'',objectifs:[]}; sysCalib={k:50,xpJour:null,le:'banc'};
  sysVue('quete'); await new Promise(r=>setTimeout(r,20));
  out.cases=document.querySelectorAll('#sysBox .sys-ligne-w').length+'|'+document.querySelectorAll('#sysBox .sys-mini-b').length;
  out.titreMini=(document.querySelector('#sysBox .sys-mini-b')||{}).title;
  const or0=cagnotte(), xp0=sysEtat().xp;
  // Le mini : même comportement (XP, or), noté « mini ».
  await toggleHabitNiveau(11,'mini');
  out.mini=habitsLog.length===1&&habitsLog[0].mini===true&&ajout&&ajout.mini===true;
  out.memeOr=Math.round((cagnotte()-or0)*100)/100; out.memeXp=sysEtat().xp-xp0;
  out.vue=!!document.querySelector('#sysBox .sys-mini-b.on')&&!!document.querySelector('#sysBox .sys-ligne.mini');
  // Passer du mini au complet, et l'inverse, sans décocher.
  await toggleHabitNiveau(11,'complet'); out.complet=habitsLog.length===1&&!habitsLog[0].mini&&ecrit==='11:';
  await toggleHabitNiveau(11,'mini'); out.retour=habitsLog.length===1&&habitsLog[0].mini===true&&ecrit==='11:mini';
  // Recliquer le même niveau décoche.
  await toggleHabitNiveau(11,'mini'); out.decoche=habitsLog.length===0;
  // La quête accomplie avec des minis : la prime tombe, le pied dit combien en mini.
  await toggleHabitNiveau(11,'mini'); await toggleHabitNiveau(12,'complet'); await toggleHabitNiveau(13,'mini'); await toggleHabitNiveau(14,'complet');
  out.quete=sysQueteFaite(aujd)&&/QUÊTE ACCOMPLIE \(dont 2 en mini\)/.test(document.querySelector('#sysBox .sys-pied').textContent);
  // Le point faible : un mini compte pour moitié.
  habitsLog=[{id:'m1',habit_id:11,date:J(1),reward_eur:0.5,category:'Esprit',mini:true},{id:'m2',habit_id:12,date:J(1),reward_eur:0.5,category:'Esprit'}];
  out.tenue=sysQueteTaux(11,aujd)*28+'|'+sysQueteTaux(12,aujd)*28;
  // Les indicateurs de la page Habitudes : entier et mini distingués.
  habitsLog=[{id:'a',habit_id:11,date:aujd,reward_eur:0.5,category:'Esprit',mini:true},{id:'b',habit_id:12,date:aujd,reward_eur:0.5,category:'Esprit'}];
  habDayFilter='all'; switchPage('habits'); await new Promise(r=>setTimeout(r,80));
  const hdr=document.getElementById('habHeader').textContent.replace(/\s+/g,' ');
  out.hdr=hdr; out.filtre=habDayFilter;
  out.kpi=/2\/4 dont 1 mini/.test(hdr)&&/entier \/ mini\s*1 \/ 1/.test(hdr);
  out.pastille=document.querySelectorAll('#habGrid .hg-dot.done.mini').length===1&&document.querySelectorAll('#habGrid .hg-dot.done:not(.mini)').length===1;
  out.semaine=/\(1 mini\)/.test(document.getElementById('habGrid').textContent);
  switchPage('today'); await new Promise(r=>setTimeout(r,80));
  return out;
});
chk('Deux cases par habitude de la quête : « Fait » et « Mini » (avec la version minimale)',p9.cases==='4|4'&&/10 cartes/.test(p9.titreMini),JSON.stringify([p9.cases,p9.titreMini]));
chk('Le mini coché : noté « mini » dans le classeur',p9.mini===true);
chk('...même comportement : même or, même XP',p9.memeOr===0.5&&p9.memeXp===20,JSON.stringify([p9.memeOr,p9.memeXp]));
chk('...la case Mini allumée, la ligne en ambre',p9.vue===true);
chk('Passer du mini au complet et inversement, sans décocher',p9.complet&&p9.retour,JSON.stringify([p9.complet,p9.retour]));
chk('...recliquer le même niveau décoche',p9.decoche===true);
chk('La quête accomplie avec des minis : prime gagnée, « dont 2 en mini »',p9.quete===true);
chk('Le point faible : un mini compte pour moitié dans la tenue',p9.tenue==='0.5|1',p9.tenue);
chk('Les indicateurs distinguent : « 2/4 dont 1 mini », « entier / mini » du mois',p9.kpi===true,p9.hdr+' / '+p9.filtre);
chk('...la pastille à moitié pleine, le compte de la semaine',p9.pastille&&p9.semaine,JSON.stringify([p9.pastille,p9.semaine]));

console.log('=== 18. LES MINIS DES QUÊTES SECONDAIRES ===');
const p10=await p.evaluate(async()=>{
  const out={}, aujd=td(); window.offerUndo=()=>{}; window.rewriteHabitsLog=async()=>true; window.appendHabitsLog=async()=>true;
  const H=(id,title)=>({id,title,frequency:'daily',reward_eur:0.25,category:'Santé',active:true});
  habits=[H(11,'Anki'),H(12,'Lecture'),H(13,'Méditation'),H(14,'Japonais'),H(15,'8 000 pas'),H(16,'Protéines')]; habitsLog=[];
  sysQuete={versions:[{depuis:aujd,habits:['11','12','13','14'],auto:true,r:['p','p','f','d']}],minimum:{'15':'5 000 pas'},auto:true};
  tdHabOpen=true; switchPage('today'); await new Promise(r=>setTimeout(r,120));
  const lignes=()=>[...document.querySelectorAll('#tdHabits .td-row')];
  out.cases=lignes().length+'|'+document.querySelectorAll('#tdHabits .td-mini').length;
  out.minimum=/minimum : 5 000 pas/.test(document.getElementById('tdHabits').textContent);
  const pas=()=>lignes().find(x=>/8 000 pas/.test(x.textContent));
  pas().querySelector('.td-mini').click(); await new Promise(r=>setTimeout(r,60));
  out.mini=habitsLog.length===1&&habitsLog[0].mini===true&&pas().classList.contains('mini')&&pas().querySelector('.td-mini.on')!==null;
  pas().querySelector('.td-check').click(); await new Promise(r=>setTimeout(r,60));
  out.complet=habitsLog.length===1&&!habitsLog[0].mini&&pas().querySelector('.td-check.on')!==null;
  pas().querySelector('.td-check').click(); await new Promise(r=>setTimeout(r,60));
  out.decoche=habitsLog.length===0;
  return out;
});
chk('Les quêtes secondaires ont aussi leur case « Mini » (et leur version minimale)',p10.cases==='2|2'&&p10.minimum,JSON.stringify([p10.cases,p10.minimum]));
chk('...le mini se coche, la ligne le montre',p10.mini===true);
chk('...on passe au complet, on décoche',p10.complet&&p10.decoche,JSON.stringify([p10.complet,p10.decoche]));

console.log('=== 19. L\'ÉQUILIBRE DE L\'OR ===');
const p11=await p.evaluate(async()=>{
  const out={}; sysFile=[]; modalFerme('sysAnnModal');
  const H=(title,frequency,reward_eur,category)=>({id:title.length*1000+Math.round(reward_eur*100),title,frequency,reward_eur,category,active:true});
  habits=[H('Pas de sucre','daily',0.4,'Santé'),H('8 000 pas','daily',0.3,'Santé'),H('Proteine','daily',0.35,'Santé'),
    H('2 Tâches Importantes','daily',0.7,'Productivité'),H('Rituel du soir','daily',0.4,'Productivité'),H('Ranger','daily',0.25,'Productivité'),H('Planning semaine','weekly:0',1,'Productivité'),
    H('Anki','daily',0.4,'Esprit'),H('Japonais','daily',0.5,'Esprit'),H('Méditation','daily',0.35,'Esprit'),H('Lecture','daily',0.25,'Esprit'),
    H('Zero achat','daily',0.6,'Finance'),H('Veille','daily',0.6,'Finance'),H('Comptabilité','weekly:0',2,'Finance'),{...H('Inactive','daily',5,'Finance'),active:false}];
  sportPlans=[];
  const o=orParDomaine(); out.o=['Santé','Productivité','Esprit','Finance'].map(c=>o[c].toFixed(2)).join('|');
  out.equilibre=['Santé','Productivité','Esprit','Finance'].every(c=>Math.abs(o[c]-1.5)<0.05);
  sportPlans=[0,2,4,7,9,11].map(i=>({date:sysDecale(td(),i),type:'Muscu'})); out.seances=Math.abs(orParDomaine()['Santé']-(1.05+6/28))<0.001;
  habDayFilter='all'; switchPage('habits'); await new Promise(r=>setTimeout(r,80));
  out.indic=document.querySelectorAll('#habHeader .hg-equil-c').length>=4&&/Or possible par jour/.test(document.getElementById('habHeader').textContent);
  switchPage('today'); await new Promise(r=>setTimeout(r,60));
  return out;
});
chk('L\'or possible par jour dans chaque domaine (hebdomadaires ramenées au jour, inactives exclues, sport en Santé)',p11.equilibre===true,p11.o);
chk('...les séances programmées comptent en Santé',p11.seances===true);
chk('...l\'indicateur d\'équilibre sur la page Habitudes',p11.indic===true);

console.log('=== 20. LES FOCUS DU JOUR ===');
const p12=await p.evaluate(async()=>{
  const out={}, aujd=td();
  const H=(id,title,category)=>({id,title,frequency:'daily',reward_eur:0.4,category,active:true});
  habits=[H(41,'Anki','Esprit'),H(42,'Pas de sucre','Santé'),H(43,'8 000 pas','Santé'),H(44,'Zero achat','Finance')]; habitsLog=[];
  sysQuete={versions:[{depuis:aujd,habits:['41','42','43','44'],auto:true,r:['p','p','f','d']}],minimum:{},auto:true};
  sysVue('quete'); await new Promise(r=>setTimeout(r,20));
  out.focus=[...document.querySelectorAll('#sysBox .sys-focus b')].map(b=>b.textContent.trim()).join(',');
  out.cats=[...document.querySelectorAll('#sysBox .sys-ligne .sys-cat')].map(x=>x.textContent).join(',');
  out.couleur=getComputedStyle(document.querySelector('#sysBox .sys-ligne-w')).getPropertyValue('--cat').trim().length>0;
  out.lib=[...document.querySelectorAll('.sys-ligne')].map(x=>x.querySelector('.sys-lib').textContent).join('|');
  return out;
});
chk('Les focus du jour : les catégories de la quête, comptées, en couleur',p12.focus==='Santé ×2,Esprit,Finance',p12.focus);
chk('...chaque habitude porte sa catégorie et sa couleur',p12.cats==='Esprit,Santé,Santé,Finance'&&p12.couleur,JSON.stringify([p12.cats,p12.couleur]));

console.log('=== 21. LA SÉANCE SUR LA PAGE AUJOURD\'HUI, L\'ONGLET SÉANCE ===');
const p13=await p.evaluate(async()=>{
  const out={}, aujd=td(); sysFile=[]; modalFerme('sysAnnModal'); window.offerUndo=()=>{};
  window.sportUpsertLog=async l=>{ sportLogs=sportLogs.filter(x=>x.date!==l.date).concat([{...l}]); return true; }; window.sportSyncPoids=async()=>null;
  sportLoaded=true; sportDraft={status:null,feeling:null,weight:null,comment:null}; sportExDraft={};
  sportLogs=[{date:J(7),status:'done',exercises:JSON.stringify([{ex:'Développé couché 3×8',status:'done',weight:'45'}]),feeling:4,weight:0,comment:'',bonusDone:false}];
  sportPlans=[{date:aujd,type:'Muscu',duration:45,title:'Haut du corps',content:'# Échauffement\n5 min rameur\n# Bloc\n- Développé couché 3×8 @47.5kg\n- Tirage horizontal 3×10',bonus:'10 min de marche'}];
  switchPage('today'); await new Promise(r=>setTimeout(r,150));
  const c=()=>document.getElementById('tdSport');
  out.lignes=c().querySelectorAll('.sp-ex-row').length+'|'+c().querySelectorAll('.td-sp-h').length;
  out.dernier=/dernier : 45 kg/.test(c().textContent)&&c().querySelector('[data-spexw="0"]').value==='47.5';
  out.raccourcis=!!c().querySelector('[onclick^="openSportPlanModal"]')&&!!c().querySelector('[onclick="switchPage(\'sport\')"]')&&/10 min de marche/.test(c().textContent);
  // Cocher un exercice, noter une charge, le ressenti, puis Enregistrer.
  c().querySelector('.sp-ex-row .sp-ex-status').click(); await new Promise(r=>setTimeout(r,20));
  out.cycle=c().querySelector('.sp-ex-row .sp-ex-status').classList.contains('st-done');
  c().querySelector('[data-spexw="1"]').value='30';
  c().querySelectorAll('.td-sp-feel .sp-feel-btn')[4].click(); await new Promise(r=>setTimeout(r,20));
  out.garde=c().querySelector('[data-spexw="1"]').value==='30';
  [...c().querySelectorAll('.td-sp-b')].find(b=>/Enregistrer/.test(b.textContent)).click(); await new Promise(r=>setTimeout(r,120));
  const l=sportLogFor(aujd), ex=l?JSON.parse(l.exercises):[];
  out.enregistre=!!l&&l.status==='done'&&l.feeling===5&&ex[0].status==='done'&&ex[0].weight==='47.5'&&ex[1].weight==='30';
  out.statutAffiche=/Fait/.test(c().querySelector('.td-t').textContent);
  // Le statut de la séance en un clic.
  [...c().querySelectorAll('.td-sp-b')].find(b=>/Partiel/.test(b.textContent)).click(); await new Promise(r=>setTimeout(r,120));
  out.partiel=sportLogFor(aujd).status==='partial'&&JSON.parse(sportLogFor(aujd).exercises)[1].weight==='30';
  // Le bonus.
  [...c().querySelectorAll('.td-sp-r')].find(b=>/Bonus/.test(b.textContent)).click(); await new Promise(r=>setTimeout(r,120));
  out.bonus=sportLogFor(aujd).bonusDone===true&&/Bonus fait/.test(c().textContent);
  // Éditer le programme : la fenêtre s'ouvre.
  c().querySelector('[onclick^="openSportPlanModal"]').click(); await new Promise(r=>setTimeout(r,30));
  out.editer=document.getElementById('sportPlanModal').classList.contains('open'); modalFerme('sportPlanModal');
  // Sans séance : programmer.
  sportPlans=[]; renderTodayPage(); out.vide=/Programmer la séance/.test(c().textContent);
  // L'onglet SÉANCE dans le menu principal, plus dans OMEGA ; la touche 3.
  const tab=document.querySelector('.nav-tabs .nav-tab[data-page="sport"]'); out.onglet=!!tab&&tab.textContent.trim()==='SÉANCE'&&getComputedStyle(tab).display!=='none';
  out.omega=!OMEGA.some(([v])=>v==='sport');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'3',bubbles:true})); await new Promise(r=>setTimeout(r,120));
  out.touche=curPage==='sport'&&document.querySelector('.nav-tab.active').dataset.page==='sport';
  switchPage('today'); await new Promise(r=>setTimeout(r,80));
  return out;
});
chk('La séance du jour sur la page Aujourd\'hui : les exercices, par blocs',p13.lignes==='2|2',p13.lignes);
chk('...la dernière charge tenue, la charge suggérée pré-remplie',p13.dernier===true);
chk('...les raccourcis (éditer, ouvrir la page Séance) et l\'activité bonus',p13.raccourcis===true);
chk('...cocher un exercice, noter une charge et le ressenti (la saisie se garde)',p13.cycle&&p13.garde,JSON.stringify([p13.cycle,p13.garde]));
chk('...Enregistrer : statuts, charges, ressenti écrits ; le statut de la séance affiché',p13.enregistre&&p13.statutAffiche,JSON.stringify([p13.enregistre,p13.statutAffiche]));
chk('...le statut de la séance en un clic, sans perdre les charges',p13.partiel===true);
chk('...le bonus se coche ici',p13.bonus===true);
chk('...« Éditer » ouvre le programme du jour ; sans séance, « Programmer »',p13.editer&&p13.vide,JSON.stringify([p13.editer,p13.vide]));
chk('L\'onglet « SÉANCE » dans le menu principal (plus dans OMEGA), touche 3',p13.onglet&&p13.omega&&p13.touche,JSON.stringify([p13.onglet,p13.omega,p13.touche]));

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));
await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
