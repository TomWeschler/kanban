// ── NBA : le défi des paris, et les statistiques pour choisir ────────────
// Le classeur et ESPN sont SIMULÉS : l'environnement d'épreuve ne les joint
// pas. Les réponses d'ESPN suivent le format documenté de son API publique
// (scoreboard, summary) ; ce qu'on éprouve, c'est ce qu'on en tire.
const {chromium}=require('playwright');
const NAVIGATEUR=process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[];const chk=(n,ok,d='')=>R.push([n,ok,d]);

(async()=>{
const b=await chromium.launch({executablePath:NAVIGATEUR});
const ctx=await b.newContext({viewport:{width:1300,height:950},locale:'fr-FR',timezoneId:'Europe/Paris'});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
await p.goto('http://127.0.0.1:8899/index.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof renderNba==='function');

// ── Le banc ──
await p.evaluate(async()=>{
  window.toast=(m,t)=>{ (window.T_TOASTS=window.T_TOASTS||[]).push(m); };
  window.T_ANNUL=[]; window.offerUndo=(m,fn)=>{ T_ANNUL.push({m,fn}); };
  await new Promise(r=>{ const q=indexedDB.deleteDatabase('kanban-nba'); q.onsuccess=q.onerror=q.onblocked=r; });
  ['kanban_nba_saison','kanban_nba_vue','kanban_nba_jours'].forEach(k=>localStorage.removeItem(k));
  accessToken='T'; cfg.spreadsheetId='S';
  NBA_DELAI=500;
  // Le classeur simulé : un onglet = un tableau de lignes, en-tête compris.
  window.T_ONGLETS={}; window.T_CREES=[]; window.T_ECRITS=[];
  window.sheetTitres=async()=>Object.keys(T_ONGLETS);
  window.sheetTitresOublie=()=>{};
  window.authFetch=async(u,o={})=>{
    u=String(u);
    if(/:batchUpdate$/.test(u)){ JSON.parse(o.body).requests.forEach(r=>{ const t=r.addSheet.properties.title; T_ONGLETS[t]=[]; T_CREES.push(t); }); return {ok:true,json:async()=>({})}; }
    const ap=/\/values\/([^:]+):append/.exec(u);
    if(ap){ const t=decodeURIComponent(ap[1]); const v=JSON.parse(o.body).values; T_ONGLETS[t].push(...v.map(x=>x.slice())); T_ECRITS.push([t,'append',v.length]); return {ok:true,json:async()=>({})}; }
    return {ok:true,json:async()=>({})};
  };
  window.sheetPut=async(range,values)=>{ const t=range.split('!')[0]; T_ONGLETS[t]=T_ONGLETS[t]||[]; T_ONGLETS[t][0]=values[0]; return {ok:true,json:async()=>({})}; };
  window.sheetBatchGet=async ranges=>ranges.map(r=>(T_ONGLETS[r.split('!')[0]]||[]).map(x=>x.slice()));
  window.sheetBatchUpsert=async(sheet,rows)=>{
    T_ECRITS.push([sheet,'upsert',rows.length]);
    const t=T_ONGLETS[sheet]=T_ONGLETS[sheet]||[[]];
    rows.forEach(r=>{ const i=t.findIndex((x,k)=>k&&x[0]===r[0]); if(i>0)t[i]=r.slice(); else t.push(r.slice()); });
    return true;
  };
  // ESPN simulé : trois soirs, quatre équipes.
  const ev=(id,date,h,a,sh,sa,qh,qa,odds,etat='post')=>({id,date:date+'T23:30Z',season:{year:2027,type:2},
    status:{type:{completed:etat==='post',state:etat}},
    competitions:[{competitors:[
      {homeAway:'home',score:String(sh),team:{abbreviation:h,shortDisplayName:h+' nom',displayName:h+' complet'},linescores:qh.map(v=>({value:v}))},
      {homeAway:'away',score:String(sa),team:{abbreviation:a,shortDisplayName:a+' nom',displayName:a+' complet'},linescores:qa.map(v=>({value:v}))}],
      odds:odds?[odds]:[]}]});
  window.T_JOURS={
    '20261020':[ev('g1','2026-10-20','BOS','NY',110,100,[30,25,30,25],[20,30,25,25],{details:'BOS -5.5',overUnder:220.5}),
                ev('g2','2026-10-20','LAL','GSW',105,112,[25,25,25,30],[30,28,27,27],{details:'GSW -2',overUnder:225})],
    '20261021':[ev('g3','2026-10-21','NY','LAL',99,99+12,[25,25,25,24],[30,30,25,26],{details:'NY -1.5',overUnder:215.5}),
                ev('g4','2026-10-21','GSW','BOS',120,118,[30,30,30,24],[28,30,30,22,8].slice(0,4),null)],
    '20261022':[ev('g5','2026-10-22','BOS','LAL',0,0,[],[],{details:'BOS -7',overUnder:230.5},'pre')]};
  window.T_ESPN_APPELS=[];
  const ath=(id,nom,st)=>({athlete:{id,displayName:nom},starter:true,didNotPlay:!st,stats:st||[]});
  // MIN FG 3PT FT OREB DREB REB AST STL BLK TO PF +/- PTS
  const ligne=(min,pts,reb,ast,tpm)=>[String(min),'8-15',`${tpm}-6`,'4-4','1','4',String(reb),String(ast),'1','0','2','2','+5',String(pts)];
  const box=(h,a,jh,ja)=>({boxscore:{players:[
    {team:{abbreviation:h},statistics:[{names:['MIN','FG','3PT','FT','OREB','DREB','REB','AST','STL','BLK','TO','PF','+/-','PTS'],athletes:jh}]},
    {team:{abbreviation:a},statistics:[{names:['MIN','FG','3PT','FT','OREB','DREB','REB','AST','STL','BLK','TO','PF','+/-','PTS'],athletes:ja}]}]}});
  window.T_BOX={
    g1:box('BOS','NY',[ath('1','Jayson Tatum',ligne(36,30,8,5,3)),ath('2','Remplaçant Absent',null)],[ath('3','Jalen Brunson',ligne(35,28,3,7,2))]),
    g2:box('LAL','GSW',[ath('4','LeBron James',ligne(34,25,7,9,1))],[ath('5','Stephen Curry',ligne(33,35,4,6,6))]),
    g3:box('NY','LAL',[ath('3','Jalen Brunson',ligne(37,22,2,8,1))],[ath('4','LeBron James',ligne(35,31,9,8,2))]),
    g4:box('GSW','BOS',[ath('5','Stephen Curry',ligne(36,27,5,5,5))],[ath('1','Jayson Tatum',ligne(38,24,10,4,2))])};
  window.fetch=async u=>{
    u=String(u); T_ESPN_APPELS.push(u);
    let m=/scoreboard\?dates=(\d{8})/.exec(u);
    if(m)return {ok:true,status:200,json:async()=>({events:T_JOURS[m[1]]||[]})};
    m=/summary\?event=([^&]+)/.exec(u);
    if(m)return T_BOX[m[1]]?{ok:true,status:200,json:async()=>T_BOX[m[1]]}:{ok:false,status:404,json:async()=>null};
    return {ok:false,status:404,json:async()=>null};
  };
});

console.log('=== 1. LES MENUS ===');
const menus=await p.evaluate(async()=>{
  switchPage('objectifs'); await new Promise(r=>setTimeout(r,100));
  const vis=sel=>{ const e=document.querySelector(sel); return !!e&&getComputedStyle(e).display!=='none'; };
  return {adp:vis('.nav-tab[data-page="adp"]'),revue:vis('.nav-tab[data-page="review"]'),omega:vis('.nav-tab[data-page="omega"]'),
    sous:[...document.querySelectorAll('#subTabs .subtab')].map(b=>b.textContent)};
});
chk('ADP et Revue ne sont plus dans le menu',!menus.adp&&!menus.revue&&menus.omega,JSON.stringify(menus));
chk('Dans OMEGA, plus de japonais, et un onglet NBA',!menus.sous.includes('日本語')&&menus.sous.includes('NBA'),menus.sous.join('|'));

console.log('=== 2. LA SAISON ===');
const sa=await p.evaluate(async()=>{
  const out={};
  switchPage('nba'); await new Promise(r=>setTimeout(r,250));
  out.onglets=T_CREES.filter(t=>/^nba_/.test(t)).sort().join(',');
  out.entetes=T_ONGLETS.nba_paris&&T_ONGLETS.nba_paris[0]&&T_ONGLETS.nba_paris[0].join(',');
  out.vide=/créer la saison/i.test(document.getElementById('nbaWrap').textContent);
  nbaSaisonOuvrir(null); await new Promise(r=>setTimeout(r,50));
  out.miseDefaut=document.getElementById('nbaSaisonMise').value;
  out.nomDefaut=document.getElementById('nbaSaisonNom').value;
  document.getElementById('nbaSaisonNom').value='2026-27';
  document.getElementById('nbaSaisonDebut').value='2026-10-20'; document.getElementById('nbaSaisonFin').value='2027-06-30';
  await nbaSaisonEnregistrer(); await new Promise(r=>setTimeout(r,150));
  out.ligne=T_ONGLETS.nba_saisons.slice(1).map(x=>x.slice(1,5).join('|'));
  // La mise se change.
  nbaSaisonOuvrir(nbaSaison().id); document.getElementById('nbaSaisonMise').value='250,5'; await nbaSaisonEnregistrer();
  await new Promise(r=>setTimeout(r,100));
  out.mise=nbaSaison().mise_depart; out.une=nbaSaisons.length;
  out.bankroll=[...document.querySelectorAll('.jp-kpi')].find(k=>/Compte Winamax/.test(k.textContent)).querySelector('.jp-kpi-v').textContent;
  return out;
});
chk('Les six onglets naissent dans le classeur, avec leur en-tête',sa.onglets==='nba_cotes,nba_joueurs,nba_matchs,nba_paris,nba_poker,nba_saisons'&&/^id,saison,date,match_id/.test(sa.entetes||''),JSON.stringify(sa));
chk('Sans saison, on invite à en créer une',sa.vide===true);
chk('La mise de départ est de 200 € par défaut',sa.miseDefaut==='200',sa.miseDefaut);
chk('...le nom proposé suit le calendrier NBA',/^20\d\d-\d\d$/.test(sa.nomDefaut),sa.nomDefaut);
chk('La saison est écrite dans le classeur',sa.ligne[0]==='2026-27|200|2026-10-20|2027-06-30',JSON.stringify(sa.ligne));
chk('...la mise de départ se modifie',sa.mise===250.5&&sa.une===1,JSON.stringify(sa));
chk('...et la bankroll part de là',/250,50/.test(sa.bankroll),sa.bankroll);

console.log('=== 3. LES STATISTIQUES, LUES CHEZ ESPN ===');
const st=await p.evaluate(async()=>{
  const out={};
  // La saison a commencé le 20 ; « aujourd'hui », c'est le 22.
  const vrai=Date; const T=new vrai('2026-10-22T15:00:00').getTime();
  window.Date=class extends vrai{ constructor(...a){ if(!a.length)return new vrai(T); return new vrai(...a); } static now(){ return T; } };
  nbaVueChoisir('equipes'); await new Promise(r=>setTimeout(r,100));
  await nbaMettreAJour(); await new Promise(r=>setTimeout(r,200));
  window.Date=vrai;
  out.jours=T_ESPN_APPELS.filter(u=>/scoreboard/.test(u)).map(u=>/dates=(\d+)/.exec(u)[1]).sort().join(',');
  out.feuilles=T_ESPN_APPELS.filter(u=>/summary/.test(u)).length;
  out.matchs=nbaMatchs.length; out.finis=nbaMatchs.filter(m=>m.statut==='final').length;
  const g1=nbaMatchs.find(m=>m.id==='g1');
  out.g1=[g1.dom,g1.ext,g1.score_dom,g1.score_ext,g1.qt_dom.join('+'),g1.spread,g1.total,g1.box].join('|');
  out.g2spread=nbaMatchs.find(m=>m.id==='g2').spread;
  out.lignesMatchs=T_ONGLETS.nba_matchs.length-1;
  out.lignesJoueurs=T_ONGLETS.nba_joueurs.length-1;
  out.absent=nbaJoueurs.find(j=>j.joueur==='Remplaçant Absent');
  out.tatum=nbaJoueurs.filter(j=>j.joueur==='Jayson Tatum').map(j=>[j.match,j.dom,j.adv,j.pts,j.reb,j.tpm,j.fgm,j.fga].join(':'));
  // Les équipes.
  const bos=nbaBilanEquipe(nbaVuDe('BOS'));
  out.bos=[bos.v,bos.d,nbaRec(bos.dom),nbaRec(bos.ext),bos.pour,bos.contre,bos.serie,`${bos.ats.c}-${bos.ats.p}-${bos.ats.n}`,`${bos.ou.o}-${bos.ou.u}`,bos.qt[0]].join('|');
  const lal=nbaBilanEquipe(nbaVuDe('LAL'));
  out.lalB2b=nbaRec(lal.b2b);
  out.tableau=[...document.querySelectorAll('.nba-eqs tr td:first-child b')].map(x=>x.textContent).join(',');
  // Relancer ne relit pas les feuilles déjà lues.
  const avant=T_ESPN_APPELS.filter(u=>/summary/.test(u)).length;
  const vrai2=Date; window.Date=class extends vrai2{ constructor(...a){ if(!a.length)return new vrai2(T); return new vrai2(...a); } static now(){ return T; } };
  await nbaMettreAJour();
  window.Date=vrai2;
  out.relance=T_ESPN_APPELS.filter(u=>/summary/.test(u)).length-avant;
  return out;
});
chk('Chaque jour de la saison est lu, jusqu\'à aujourd\'hui',st.jours==='20261020,20261021,20261022',st.jours);
chk('...et la feuille de chaque match fini, pas des autres',st.feuilles===4&&st.matchs===5&&st.finis===4,JSON.stringify(st));
chk('Un match garde score, quart-temps, écart et total des bookmakers',st.g1==='BOS|NY|110|100|30+25+30+25|-5.5|220.5|true',st.g1);
chk('...l\'écart est vu du côté de l\'équipe à domicile',st.g2spread===2,String(st.g2spread));
chk('Tout est écrit dans le classeur',st.lignesMatchs>=5&&st.lignesJoueurs===9,JSON.stringify([st.lignesMatchs,st.lignesJoueurs]));
chk('Un joueur qui n\'a pas joué compte zéro minute',st.absent&&st.absent.min===0,JSON.stringify(st.absent));
chk('La feuille d\'un joueur : domicile, adversaire, points, rebonds, 3 pts, adresse',st.tatum.join(' ')==='g1:true:NY:30:8:3:8:15 g4:false:GS:24:10:2:8:15',st.tatum.join(' '));
chk('Le bilan d\'une équipe : V-D, domicile, extérieur, moyennes, série',st.bos.startsWith('1|1|1-0|0-1|114|110|D1'),st.bos);
chk('...contre l\'écart et au-dessus du total, quand ESPN les donne',/\|1-0-1\|0-1\|29$/.test(st.bos),st.bos);
chk('...les deuxièmes soirs de suite',st.lalB2b==='1-0',st.lalB2b);
chk('Le tableau des équipes les montre toutes',st.tableau.split(',').sort().join(',')==='BOS,GS,LAL,NY',st.tableau);
chk('Relancer la mise à jour ne relit pas les feuilles déjà lues',st.relance===0,String(st.relance));

console.log('=== 4. LES JOUEURS ===');
const jo=await p.evaluate(async()=>{
  const out={};
  const l=nbaMatchsJoueur('1');
  out.moy=nbaMoyJoueur(l).pts;
  out.passe=nbaPassages(l,'pts',25.5,'plus');
  out.pra=nbaPassages(l,'pra',40.5,'plus');
  nbaJoueurVoir('1'); await new Promise(r=>setTimeout(r,100));
  nbaLigneVal='25,5'; renderNba(); await new Promise(r=>setTimeout(r,100));
  out.fiche=document.querySelector('.nba-detail').textContent.replace(/\s+/g,' ');
  return out;
});
chk('La moyenne d\'un joueur',jo.moy===27,String(jo.moy));
chk('Combien de fois il a passé une ligne',jo.passe.ok===1&&jo.passe.n===2,JSON.stringify(jo.passe));
chk('...une ligne combinée (pts + reb + pas)',jo.pra.ok===1,JSON.stringify(jo.pra));
chk('La fiche du joueur donne la ligne : saison, domicile, extérieur',/Saison : 1\/2/.test(jo.fiche)&&/Domicile : 1\/1/.test(jo.fiche)&&/Extérieur : 0\/1/.test(jo.fiche),jo.fiche.slice(0,400));
chk('...et contre son prochain adversaire',/Contre LAL : 0\/0/.test(jo.fiche),jo.fiche.slice(0,600));

console.log('=== 5. L\'AVANT-MATCH ===');
const am=await p.evaluate(async()=>{
  const out={};
  const m=nbaMatchs.find(x=>x.id==='g5');
  const a=nbaAvantMatch(m);
  out.repos=[a.reposDom,a.reposExt];
  out.attendu=a.attendu&&[a.attendu.dom,a.attendu.ext].join('|');
  out.h2h=a.h2h.length;
  nbaVueChoisir('matchs'); nbaJourVu='2026-10-22'; renderNba(); await new Promise(r=>setTimeout(r,100));
  nbaMatchChoisir('g5'); await new Promise(r=>setTimeout(r,100));
  out.panneau=document.querySelector('.nba-avant').textContent.replace(/\s+/g,' ');
  out.cote=document.querySelector('.nba-cote').textContent;
  return out;
});
chk('Le repos de chaque équipe avant le match',am.repos.join()==='0,0',JSON.stringify(am.repos));
chk('Le score attendu : ce que chacune marque dans son rôle et ce que l\'autre encaisse dans le sien',am.attendu==='104.5|105.5',am.attendu);
chk('L\'avant-match s\'affiche, avec la ligne des bookmakers',/Score attendu/.test(am.panneau)&&/BOS -7/.test(am.cote)&&/O\/U 230,5/.test(am.cote),am.cote+' / '+am.panneau.slice(0,200));

console.log('=== 6. LES PARIS ===');
const pa=await p.evaluate(async()=>{
  const out={};
  nbaVueChoisir('defi'); await new Promise(r=>setTimeout(r,100));
  const remplir=async(o)=>{
    nbaPariOuvrir(null,o.pre); await new Promise(r=>setTimeout(r,80));
    const set=(id,v)=>{ const e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('change')); };
    if(o.match)set('nbaPMatch',o.match);
    set('nbaPMarche',o.marche);
    Object.entries(o.champs||{}).forEach(([k,v])=>set(k,v));
    await nbaPariEnregistrer(); await new Promise(r=>setTimeout(r,80));
  };
  // Le formulaire propose les matchs du jour.
  nbaPariOuvrir(null); document.getElementById('nbaPDate').value='2026-10-20'; document.getElementById('nbaPDate').dispatchEvent(new Event('change'));
  await new Promise(r=>setTimeout(r,80));
  out.choix=[...document.getElementById('nbaPMatch').options].map(o=>o.textContent).join('|');
  document.getElementById('nbaPMarche').value='vainqueur'; nbaPariChamps();
  out.equipes=[...document.getElementById('nbaPEquipe').options].map(o=>o.value).filter(Boolean).join(',');
  modalFerme('nbaPariModal');
  await remplir({pre:{date:'2026-10-20'},match:'g1',marche:'vainqueur',champs:{nbaPEquipe:'BOS',nbaPCote:'1,60',nbaPMise:'20'}});
  await remplir({pre:{date:'2026-10-20'},match:'g1',marche:'handicap',champs:{nbaPEquipe:'BOS',nbaPLigne:'-10',nbaPCote:'1,9',nbaPMise:'10'}});
  await remplir({pre:{date:'2026-10-20'},match:'g2',marche:'total',champs:{nbaPSens:'moins',nbaPLigne:'220,5',nbaPCote:'1,85',nbaPMise:'10'}});
  await remplir({pre:{date:'2026-10-21'},match:'g4',marche:'joueur',champs:{nbaPJoueur:'Stephen Curry',nbaPStat:'tpm',nbaPSens:'plus',nbaPLigne:'4,5',nbaPCote:'2,1',nbaPMise:'5'}});
  await remplir({pre:{date:'2026-10-20'},match:'g1',marche:'joueur',champs:{nbaPJoueur:'Remplaçant Absent',nbaPStat:'pts',nbaPSens:'plus',nbaPLigne:'5,5',nbaPCote:'1,5',nbaPMise:'4'}});
  await remplir({pre:{date:'2026-10-21'},match:'__libre',marche:'combine',champs:{nbaPMatchLibre:'Combiné du soir',nbaPSelection:'NY + GSW',nbaPCote:'3,4',nbaPMise:'5',nbaPStatut:'perdu'}});
  out.n=nbaParis.length;
  out.selections=nbaParis.map(p=>p.selection).join(' / ');
  out.lignes=T_ONGLETS.nba_paris.length-1;
  out.matchLib=nbaParis[0].match;
  // Un pari invalide est refusé.
  T_TOASTS.length=0;
  await remplir({pre:{date:'2026-10-21'},match:'g3',marche:'vainqueur',champs:{nbaPEquipe:'NY',nbaPCote:'',nbaPMise:'5'}});
  out.refus=T_TOASTS.join('|'); out.toujours=nbaParis.length; modalFerme('nbaPariModal');
  // Régler avec les résultats.
  out.aRegler=nbaAregler(nbaSaison()).length;
  out.bouton=!!document.querySelector('.nba-act button[onclick="nbaRegler()"]');
  await nbaRegler(); await new Promise(r=>setTimeout(r,100));
  out.statuts=nbaParis.map(p=>p.statut).join(',');
  const bl=nbaBilan(nbaParisSaison(nbaSaison()));
  out.bilan=[bl.regles,bl.gagnes,bl.perdus,bl.rembourses,bl.mise,bl.profit,Math.round(bl.roi)].join('|');
  out.kpis=[...document.querySelectorAll('.jp-kpi')].map(k=>k.textContent.replace(/\s+/g,' ').trim()).join(' / ');
  out.courbe=!!document.querySelector('.nba-courbe polyline');
  out.parMarche=[...document.querySelectorAll('.ca-ind-b')].find(x=>/Par marché/.test(x.textContent)).textContent.replace(/\s+/g,' ');
  // Un clic sur le statut le fait tourner, et s'annule.
  const id=nbaParis[0].id;
  await nbaPariStatut(id); out.tourne=nbaParis.find(p=>p.id===id).statut;
  await T_ANNUL[T_ANNUL.length-1].fn(); out.annule=nbaParis.find(p=>p.id===id).statut;
  // Le cash-out : ce qu'on a encaissé.
  const co=nbaParis.find(p=>p.marche==='combine'); co.statut='cashout'; co.retour=8; out.cashout=nbaProfit(co); co.statut='perdu'; co.retour=null;
  // Supprimer.
  nbaPariOuvrir(nbaParis[nbaParis.length-1].id); await nbaPariSupprimer(); await new Promise(r=>setTimeout(r,80));
  out.apresSuppr=nbaParis.length;
  await T_ANNUL[T_ANNUL.length-1].fn(); out.restaure=nbaParis.length;
  return out;
});
chk('Le formulaire propose les matchs du jour choisi',/NY @ BOS/.test(pa.choix)&&/GS @ LAL/.test(pa.choix),pa.choix);
chk('...et les deux équipes du match',['BOS,NY','BOS,GS,LAL,NY'].includes(pa.equipes.split(',').sort().join(',')),pa.equipes);
chk('Six paris enregistrés, la sélection écrite d\'elle-même',pa.n===6&&/BOS -10/.test(pa.selections)&&/Moins de 220,5/.test(pa.selections)&&/Stephen Curry \+4,5 paniers à 3 pts/.test(pa.selections),pa.selections);
chk('...dans le classeur',pa.lignes===6,String(pa.lignes));
chk('...avec le match en clair',pa.matchLib==='NY @ BOS',pa.matchLib);
chk('Un pari sans cote est refusé',/cote/i.test(pa.refus)&&pa.toujours===6,pa.refus);
chk('Cinq paris se règlent avec les résultats',pa.aRegler===5&&pa.bouton,JSON.stringify([pa.aRegler,pa.bouton]));
chk('...vainqueur gagné ; handicap −10 remboursé (victoire de 10) ; moins de 220,5 gagné (217) ; Curry +4,5 à 3 pts gagné (5) ; joueur absent remboursé',
    pa.statuts==='gagne,rembourse,gagne,gagne,rembourse,perdu',pa.statuts);
chk('Le bilan : 6 réglés, 3 gagnés, 1 perdu, 2 remboursés, 54 € misés, +21,00 €, ROI 39 %',pa.bilan==='6|3|1|2|54|21|39',pa.bilan);
chk('Les indicateurs du défi : bankroll, profit, ROI, réussite',/Compte Winamax/.test(pa.kpis)&&/ROI/.test(pa.kpis)&&/Réussite/.test(pa.kpis),pa.kpis);
chk('...la courbe de la bankroll',pa.courbe===true);
chk('...le détail par marché',/Vainqueur/.test(pa.parMarche)&&/Combiné/.test(pa.parMarche),pa.parMarche);
chk('Un clic sur le statut le fait tourner, et s\'annule',pa.tourne==='perdu'&&pa.annule==='gagne',JSON.stringify([pa.tourne,pa.annule]));
chk('Un cash-out compte ce qu\'on a encaissé',pa.cashout===3,String(pa.cashout));
chk('Supprimer un pari, et l\'annuler',pa.apresSuppr===5&&pa.restaure===6,JSON.stringify([pa.apresSuppr,pa.restaure]));

console.log('=== 7. LES CHIFFRES DU DÉFI ===');
const ch=await p.evaluate(()=>{
  const s=nbaSaison();
  const l=nbaParisSaison(s);
  const g=l.find(p=>p.marche==='vainqueur'), h=l.find(p=>p.marche==='handicap'), t=l.find(p=>p.marche==='total');
  return {g:nbaProfit(g),h:nbaProfit(h),t:nbaProfit(t),tStat:t.statut,
    courbe:nbaCourbe(s).map(x=>x.b).join(','),tranche:[nbaTrancheCote(1.4),nbaTrancheCote(1.85),nbaTrancheCote(2.1),nbaTrancheCote(3.4)].join('|')};
});
chk('Gagné : la mise fois la cote, moins la mise',ch.g===12,String(ch.g));
chk('Remboursé : ni gain ni perte',ch.h===0,String(ch.h));
chk('Le total de 217 points sous la ligne de 220,5 : le « moins » est gagné',ch.tStat==='gagne'&&ch.t===8.5,JSON.stringify(ch));
chk('La courbe part de la mise de départ',ch.courbe.startsWith('250.5,'),ch.courbe);
chk('Les tranches de cote',ch.tranche==='< 1,50|1,50 – 1,99|2,00 – 2,99|≥ 3,00',ch.tranche);

console.log('=== 7 bis. LE POKER ===');
const pk=await p.evaluate(async()=>{
  const out={};
  const s=nbaSaison();
  const compte=()=>([...document.querySelectorAll('.jp-kpi')].find(k=>/Compte Winamax/.test(k.textContent))||{textContent:''}).textContent.replace(/\s+/g,' ');
  nbaVueChoisir('defi'); await new Promise(r=>setTimeout(r,100));
  out.avant=compte();
  out.bouton=!!document.querySelector('.nba-act button[onclick="nbaPokerOuvrir(null)"]');
  const bilanAvant=JSON.stringify(nbaBilan(nbaParisSaison(s)));
  nbaPokerOuvrir(null); await new Promise(r=>setTimeout(r,50));
  out.dateDefaut=document.getElementById('nbaPkDate').value===td();
  document.getElementById('nbaPkDate').value='2026-10-21';
  document.getElementById('nbaPkMontant').value='12,5'; document.getElementById('nbaPkNotes').value='Expresso';
  await nbaPokerEnregistrer(); await new Promise(r=>setTimeout(r,100));
  out.apres=compte();
  out.kpiPoker=([...document.querySelectorAll('.jp-kpi')].find(k=>/Gains poker/.test(k.textContent))||{textContent:''}).textContent.replace(/\s+/g,' ');
  out.ligne=(T_ONGLETS.nba_poker||[]).slice(1).map(x=>x.slice(1,5).join('|'));
  out.liste=!!document.querySelector('.nba-pari.st-poker');
  out.bilanInchange=JSON.stringify(nbaBilan(nbaParisSaison(s)))===bilanAvant;
  out.courbe=nbaCourbe(s).map(x=>x.b).pop();
  // Un montant vide est refusé.
  T_TOASTS.length=0; nbaPokerOuvrir(null); document.getElementById('nbaPkMontant').value=''; await nbaPokerEnregistrer();
  out.refus=T_TOASTS.join('|'); modalFerme('nbaPokerModal');
  // Modifier, supprimer, annuler.
  const id=nbaPoker[0].id; nbaPokerOuvrir(id); document.getElementById('nbaPkMontant').value='20'; await nbaPokerEnregistrer();
  out.modifie=nbaPokerTotal(s);
  nbaPokerOuvrir(id); await nbaPokerSupprimer(); out.supprime=nbaPokerTotal(s);
  await T_ANNUL[T_ANNUL.length-1].fn(); out.restaure=nbaPokerTotal(s);
  // Relu depuis le classeur.
  nbaPoker=[]; await nbaCharger(); out.relu=nbaPokerTotal(s);
  out.sauvegarde=BK_TABLES.some(t=>t[0]==='nbaPoker');
  return out;
});
chk('Un bouton « + Gain poker » à côté de « + Pari »',pk.bouton===true);
chk('Le gain poker s\'ajoute au compte Winamax',/271,50/.test(pk.avant)&&/284,00/.test(pk.apres),JSON.stringify([pk.avant,pk.apres]));
chk('...il a son propre total',/\+12,50/.test(pk.kpiPoker),pk.kpiPoker);
chk('...il est écrit dans son onglet du classeur',/2026-10-21\|12\.5\|Expresso$/.test(pk.ligne[0]||''),JSON.stringify(pk.ligne));
chk('...il paraît dans l\'historique du jour, et dans la courbe',pk.liste&&pk.courbe===284,JSON.stringify([pk.liste,pk.courbe]));
chk('...sans toucher aux chiffres des paris (ROI, réussite)',pk.bilanInchange===true);
chk('Un gain sans montant est refusé',/montant/i.test(pk.refus),pk.refus);
chk('Modifier, supprimer, annuler',pk.modifie===20&&pk.supprime===0&&pk.restaure===20,JSON.stringify(pk));
chk('Relu depuis le classeur, et dans la sauvegarde',pk.relu===20&&pk.sauvegarde===true,JSON.stringify(pk));

console.log('=== 7 ter. LES COULEURS DES ÉQUIPES ===');
const co=await p.evaluate(async()=>{
  const out={};
  out.trente=Object.keys(NBA_EQUIPES).length;
  out.alias=[nbaAbbr('GSW'),nbaAbbr('nyk'),nbaAbbr('SAS'),nbaAbbr('UTA'),nbaAbbr('BOS')].join(',');
  out.logo=nbaLogo('GSW');
  out.couleurs=new Set(Object.values(NBA_EQUIPES).map(x=>x[1])).size;
  // Lisibles sur fond sombre : aucune trop foncée.
  const lum=h=>{ const n=parseInt(h.slice(1),16); const c=[n>>16,(n>>8)&255,n&255].map(v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
  out.sombres=Object.entries(NBA_EQUIPES).filter(([,x])=>lum(x[1])<0.06).map(([k])=>k).join(',');
  nbaVueChoisir('equipes'); await new Promise(r=>setTimeout(r,150));
  const tr=document.querySelector('.nba-eqs tr.nba-eq-l');
  out.ligne=tr&&tr.style.getPropertyValue('--eq'); out.logoTab=!!(tr&&tr.querySelector('.nba-t b'));
  nbaVueChoisir('matchs'); nbaJourVu='2026-10-20'; nbaMatchVu=''; renderNba(); await new Promise(r=>setTimeout(r,150));
  const m=document.querySelector('.nba-match');
  out.match=m&&[m.style.getPropertyValue('--c1'),m.style.getPropertyValue('--c2')].join(',');
  // Les logos ne se chargent pas ici (pas de réseau) et s'effacent : on compte les équipes, et l'on vérifie la balise.
  out.logosMatch=m?m.querySelectorAll('.nba-match-l .nba-eq .nba-t').length:0;
  out.balise=/<img class="nba-logo" src="https:\/\/a\.espncdn\.com\/i\/teamlogos\/nba\/500\/bos\.png"/.test(nbaEqHtml('BOS'));
  nbaVueChoisir('defi'); await new Promise(r=>setTimeout(r,150));
  out.pari=[...document.querySelectorAll('.nba-pari-m .nba-t')].length>0;
  out.parEquipe=!!([...document.querySelectorAll('.nba-reps .ca-ind-b')].find(x=>/Par équipe/.test(x.textContent))||{querySelector:()=>null}).querySelector('.nba-t');
  return out;
});
chk('Les trente équipes ont leur couleur',co.trente===30&&co.couleurs>=24,JSON.stringify(co));
chk('...aucune trop sombre pour un fond sombre',co.sombres==='',co.sombres);
chk('Les sigles de Winamax ou de NBA.com renvoient à ceux d\'ESPN',co.alias==='GS,NY,SA,UTAH,BOS',co.alias);
chk('Le logo vient d\'ESPN',co.logo==='https://a.espncdn.com/i/teamlogos/nba/500/gs.png',co.logo);
chk('Le tableau des équipes : logo et liseré à la couleur de l\'équipe',!!co.ligne&&co.logoTab,JSON.stringify(co));
chk('Un match : les deux couleurs, les deux logos',co.match==='#F58426,#1E9E5A'&&co.logosMatch===2&&co.balise,co.match+' '+co.logosMatch);
chk('...et les paris, et le détail par équipe, en couleurs',co.pari&&co.parEquipe,JSON.stringify(co));

console.log('=== 7 quater. LE CONSEIL ===');
const cs=await p.evaluate(async()=>{
  const out={};
  // Les blessures d'ESPN : une équipe par son sigle, l'autre par son seul nom.
  const fetchAvant=window.fetch;
  window.fetch=async u=>{ u=String(u);
    if(/\/injuries$/.test(u)){ T_ESPN_APPELS.push(u); return {ok:true,status:200,json:async()=>({injuries:[
      {team:{abbreviation:'BOS'},injuries:[{athlete:{id:'1',displayName:'Jayson Tatum'},status:'Out',detail:'Genou'}]},
      {team:{displayName:'Los Angeles Lakers'},injuries:[{athlete:{id:'4',displayName:'LeBron James'},status:'Questionable',type:{description:'Cheville'}}]}]})}; }
    return fetchAvant(u); };
  const l=await nbaBlessures(true);
  out.bl=l.map(b=>[b.equipe,b.joueur,b.statut].join(':')).join(' ');
  out.fr=[nbaStatutFr('Out'),nbaStatutFr('Questionable'),nbaStatutFr('Day-To-Day')].join(',');
  const m=nbaMatchs.find(x=>x.id==='g5');
  const iD=nbaImpactAbsences('BOS',m.date), iE=nbaImpactAbsences('LAL',m.date);
  out.impact=[iD.pts,iE.pts,iD.liste[0].regulier].join('|');
  const md=nbaModele(m);
  out.modele=[md.pd,md.pe,md.fatD,md.fatE,md.poids].map(x=>Math.round(x*100)/100).join('|');
  // Les outils.
  out.marge=Math.round(nbaSansMarge(1.8,2.0)*10000)/10000;
  out.seule=Math.round(nbaSansMarge(2.0)*10000)/10000;
  out.phi=[Math.round(nbaPhi(0)*1000)/1000,Math.round(nbaPhi(1)*1000)/1000,Math.round(nbaPhi(-1.96)*1000)/1000].join(',');
  const e=nbaEvaluer(0.6,0.5,0.5,2.0,284);
  out.eval=[e.p,Math.round(e.ev*1000)/1000,e.mise,e.valeur].join('|');
  out.plafond=nbaEvaluer(0.95,0.6,0.5,3,284).mise;
  out.negatif=nbaEvaluer(0.4,0.45,0.5,2,284).mise;
  // L'avant-match : saisir les cotes, analyser.
  nbaVueChoisir('matchs'); nbaJourVu='2026-10-22'; nbaMatchVu=''; renderNba(); await new Promise(r=>setTimeout(r,100));
  nbaMatchChoisir('g5'); await new Promise(r=>setTimeout(r,200));
  out.panneau=!!document.querySelector('.nba-conseil');
  out.absences=[...document.querySelectorAll('.nba-abs .nba-bl')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).join(' / ');
  const set=(id,v)=>{ document.getElementById(id).value=v; };
  set('nbaCMlExt','3,10'); set('nbaCMlDom','1,38'); set('nbaCHcLigne','-7'); set('nbaCHcExt','1,90'); set('nbaCHcDom','1,90');
  set('nbaCTotLigne','230,5'); set('nbaCTotPlus','1,90'); set('nbaCTotMoins','1,90');
  await nbaCotesEnregistrer('g5',true); await new Promise(r=>setTimeout(r,100));
  out.lignesJ=document.querySelectorAll('.nba-cj').length;
  const rows=document.querySelectorAll('.nba-cj');
  const sj=(r,k,v)=>{ r.querySelector(`[data-c="${k}"]`).value=v; };
  sj(rows[0],'joueur','Stephen Curry'); sj(rows[0],'ligne','5,5'); sj(rows[0],'plus','1,9'); sj(rows[0],'moins','1,9');
  sj(rows[1],'joueur','Jayson Tatum'); sj(rows[1],'ligne','25,5'); sj(rows[1],'plus','1,9'); sj(rows[1],'moins','1,9');
  rows[0].querySelector('[data-c="stat"]').value='tpm';
  await nbaCotesEnregistrer('g5'); await new Promise(r=>setTimeout(r,150));
  out.cotesClasseur=(T_ONGLETS.nba_cotes||[]).slice(1).map(x=>x[0]+':'+JSON.parse(x[3]).ml.dom+':'+JSON.parse(x[3]).joueurs.length).join(',');
  const opts=nbaOptions(m,nbaSaison());
  out.nOpts=opts.length;
  out.tatumExclu=!opts.some(o=>/Tatum/.test(o.lib));
  out.libs=opts.map(o=>o.lib).join(' | ');
  out.trie=opts.every((o,i)=>!i||opts[i-1].ev>=o.ev);
  out.tableau=document.querySelectorAll('.nba-opts tr').length-1;
  out.verts=document.querySelectorAll('.nba-opts tr.nba-val').length;
  out.valeurs=opts.filter(o=>o.valeur).map(o=>o.lib+'@'+Math.round(o.ev*100)).join(',');
  // Les conseils du jour.
  out.duJour=nbaConseilsDuJour('2026-10-22').length===opts.filter(o=>o.valeur).length;
  out.encart=!!document.querySelector('.nba-cj-jour')===(opts.some(o=>o.valeur));
  // Parier depuis le conseil : le formulaire est prérempli, la probabilité suit le pari.
  const v=opts.find(o=>o.valeur);
  out.aValeur=!!v;
  if(v){
    const btn=[...document.querySelectorAll('.nba-opts tr.nba-val button')][0]; btn.click(); await new Promise(r=>setTimeout(r,150));
    out.form=[document.getElementById('nbaPMarche').value,document.getElementById('nbaPCote').value,document.getElementById('nbaPMise').value,document.getElementById('nbaPMatch').value].join('|');
    out.info=document.getElementById('nbaPConseil').textContent;
    document.getElementById('nbaPCote').value=String(opts.find(o=>o.valeur).cote+0.1).replace('.',',');
    await nbaPariEnregistrer(); await new Promise(r=>setTimeout(r,100));
    const pr=nbaParis[nbaParis.length-1];
    out.pari=[pr.proba!=null,pr.ev!=null,Math.abs(pr.ev-(pr.proba*pr.cote-1))<0.002].join('|');
    out.ligneP=(T_ONGLETS.nba_paris.find(x=>x[0]===pr.id)||[]).slice(19).join('|');
    nbaVueChoisir('defi'); await new Promise(r=>setTimeout(r,120));
    out.parValeur=!!([...document.querySelectorAll('.nba-reps .ca-ind-b')].find(x=>/Par valeur estimée/.test(x.textContent)));
  }
  window.fetch=fetchAvant;
  return out;
});
chk('Les blessures d\'ESPN, équipe par sigle ou par nom',cs.bl==='BOS:Jayson Tatum:Out LAL:LeBron James:Questionable',cs.bl);
chk('...en français',cs.fr==='Absent,Incertain,Au jour le jour',cs.fr);
chk('Une absence coûte 30 % des points du joueur, pondérés par son statut',cs.impact==='8.1|4.2|true',cs.impact);
chk('Le modèle : score attendu ajusté du repos et des absences, poids des stats selon le nombre de matchs',cs.modele==='94.9|99.8|1.5|1.5|0.1',cs.modele);
chk('La marge retirée d\'un marché à deux issues',cs.marge===0.5263,String(cs.marge));
chk('...et d\'une cote seule (marge habituelle de 5 %)',cs.seule===0.4762,String(cs.seule));
chk('La loi normale',cs.phi==='0.5,0.841,0.025',cs.phi);
chk('Valeur et mise : mélange des probabilités, quart de Kelly',cs.eval==='0.55|0.1|7|true',cs.eval);
chk('...la mise plafonnée à 3 % du compte',cs.plafond===8.5,String(cs.plafond));
chk('...et aucune mise sans valeur',cs.negatif===0,String(cs.negatif));
chk('L\'avant-match propose la saisie des cotes, et montre les absences',cs.panneau&&/Jayson Tatum · Absent −8,1/.test(cs.absences)&&/LeBron James · Incertain/.test(cs.absences),cs.absences);
chk('« + ligne joueur » ajoute une ligne sans perdre la saisie',cs.lignesJ===2,String(cs.lignesJ));
chk('Les cotes sont écrites dans le classeur',cs.cotesClasseur==='g5:1.38:2',cs.cotesClasseur);
chk('Toutes les issues sont évaluées, le joueur absent écarté',cs.nOpts===8&&cs.tatumExclu,cs.libs);
chk('...de la meilleure valeur à la pire, et affichées',cs.trie&&cs.tableau===8,JSON.stringify([cs.trie,cs.tableau]));
chk('...les paris de valeur en vert',cs.verts===cs.valeurs.split(',').filter(Boolean).length,cs.valeurs);
chk('Les conseils du jour reprennent les paris de valeur',cs.duJour&&cs.encart,JSON.stringify(cs));
chk('Au moins un pari de valeur dans ce scénario',cs.aValeur,cs.valeurs);
chk('« Parier » préremplit le formulaire : marché, cote, mise, match',/^\w+\|\d+,?\d*\|\d+,?\d*\|g5$/.test(cs.form||''),cs.form);
chk('...et dit la probabilité et la valeur estimées',/probabilité estimée \d+ %/.test(cs.info||''),cs.info);
chk('Le pari garde sa probabilité ; la valeur suit la cote vraiment prise',cs.pari==='true|true|true',cs.pari);
chk('...écrites dans le classeur',/^0\.\d+\|-?0\.\d+$/.test(cs.ligneP||''),cs.ligneP);
chk('Les chiffres du défi par valeur estimée : la méthode se juge',cs.parValeur===true);

console.log('=== 7 quinquies. UN ONGLET D\'UNE VERSION PRÉCÉDENTE ===');
const mig=await p.evaluate(async()=>{
  // Un onglet nba_paris écrit avant les colonnes « proba » et « valeur ».
  T_ONGLETS.nba_paris[0]=NBA_H.paris.slice(0,19);
  nbaCharge=false; await nbaCharger();
  return {entete:T_ONGLETS.nba_paris[0].join(','),paris:nbaParis.length};
});
chk('L\'en-tête d\'un onglet ancien suit les nouvelles colonnes, les paris restent',/,proba,valeur$/.test(mig.entete)&&mig.paris>=7,JSON.stringify(mig));

console.log('=== 8. RELIRE, SÛRETÉ, SAUVEGARDE ===');
const re=await p.evaluate(async()=>{
  const out={};
  const avant=JSON.stringify(nbaParis.map(nbaPariRow).sort());
  nbaCharge=false; nbaParis=[]; nbaSaisons=[]; nbaMatchs=[]; nbaJoueursCharges=false; nbaJoueurs=[];
  await nbaCharger(); await nbaChargerJoueurs();
  out.relu=JSON.stringify(nbaParis.map(nbaPariRow).sort())===avant;
  out.saison=nbaSaisons.length===1&&nbaSaisons[0].mise_depart===250.5;
  out.joueurs=nbaJoueurs.length;
  // Un nom piégé ne s'exécute pas.
  const s=nbaSaison();
  await nbaPariSauver([{id:'piege',saison:s.id,date:'2026-10-21',match:'<img src=x onerror="window.PWN=1">',marche:'autre',
    selection:'<b>gras</b>',cote:2,mise:1,statut:'attente',created_at:td()}]);
  nbaVueChoisir('defi'); await new Promise(r=>setTimeout(r,150));
  out.pwn=!!window.PWN; out.inj=[...document.querySelectorAll('.nba-pari b')].some(x=>x.textContent==='gras')||!!document.querySelector('.nba-pari img[src="x"]');
  out.sauvegarde=BK_TABLES.some(t=>t[0]==='nbaParis')&&BK_TABLES.some(t=>t[0]==='nbaSaisons');
  return out;
});
chk('Tout se relit depuis le classeur',re.relu&&re.saison,JSON.stringify(re));
chk('...les feuilles de joueurs aussi, depuis l\'appareil',re.joueurs===9,String(re.joueurs));
chk('Un texte piégé ne s\'exécute pas',re.pwn===false&&re.inj===false,JSON.stringify(re));
chk('Saisons et paris font partie de la sauvegarde',re.sauvegarde===true);

console.log('=== 9. ESPN NE RÉPOND PAS ===');
const ko=await p.evaluate(async()=>{
  window.fetch=async()=>{ throw new TypeError('Failed to fetch'); };
  T_TOASTS.length=0; nbaMatchs=nbaMatchs.filter(m=>m.date!=='2026-10-23');
  localStorage.removeItem('kanban_nba_jours');
  await nbaMettreAJour();
  return {msg:T_TOASTS.join('|'),fini:nbaMaj===null,bouton:!!document.querySelector('.nba-maj button:not([disabled])')||nbaVue==='defi'};
});
chk('Sans réponse d\'ESPN, on le dit, et l\'on peut relancer',/sans réponse|ne répond pas/i.test(ko.msg)&&ko.fini,JSON.stringify(ko));

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));
await b.close();
const kos=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-kos.length}/${R.length}`);
process.exit(kos.length?1:0);
})();
