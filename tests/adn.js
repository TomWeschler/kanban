// ── Correction et analyse de séquence ADN ─────────────────────────────────
// Ce qu'on éprouve ici, dans l'ordre de ce qui coûte le plus cher quand c'est
// faux :
//   1. LA CORRECTION NE MENT PAS. Elle rend une séquence propre, et le journal
//      de tout ce qu'elle a touché — une base changée en silence, c'est un
//      résultat de laboratoire faux qu'on ne pourra plus expliquer.
//   2. LES CHIFFRES SONT JUSTES. Composition, GC, Tm, masse : des valeurs qu'on
//      recopie dans un cahier de manip.
//   3. LES COORDONNÉES SONT JUSTES. ORF et motifs sur le brin inverse sont
//      rendus en coordonnées du brin direct : c'est là que tout le monde se
//      trompe d'une base.
//   4. ON REFUSE DE DEVINER. Un codon ambigu qui ne désigne pas un seul acide
//      aminé donne X ; une Tm hors du domaine du calcul ne donne pas de chiffre.
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
await p.goto('http://127.0.0.1:8899/adn.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>window.ADN&&typeof ADN.corriger==='function');

console.log('=== 1. LA CORRECTION NE MENT PAS ===');
const cor=await p.evaluate(()=>{
  const out={};
  // Le cas réel : une séquence recopiée d'un PDF, numérotée, en minuscules,
  // coupée en blocs, avec de l'ARN au milieu.
  const sale='  1 augc gua\n 11 ACGT\n';
  const r=ADN.corriger(sale,{uracile:true,lacunes:true,ambigusEnN:false,retirerInvalides:true});
  out.propre=r.seq;
  out.uraciles=r.comptes.uracile;
  out.miseEnForme=r.comptes.miseEnForme>0;
  out.numerotation=r.comptes.numerotation;
  // Un caractère invalide : retiré, mais jamais sans le dire.
  const inv=ADN.corriger('ACxGT',{retirerInvalides:true});
  out.invSeq=inv.seq; out.invJournal=inv.journal.length;
  out.invDit=inv.journal[0]&&inv.journal[0].type;
  // Ou remplacé par N — ce qui garde la longueur, donc les coordonnées.
  const inv2=ADN.corriger('ACxGT',{retirerInvalides:false});
  out.invN=inv2.seq;
  // Les codes ambigus sont gardés par défaut : ils portent de l'information.
  out.ambGarde=ADN.corriger('ACRYGT',{}).seq;
  out.ambEcrase=ADN.corriger('ACRYGT',{ambigusEnN:true}).seq;
  // Les lacunes d'alignement s'en vont, ou restent si on le demande.
  out.lacRetiree=ADN.corriger('AC--GT',{lacunes:true}).seq;
  out.lacGardee=ADN.corriger('AC--GT',{lacunes:false}).seq;
  // Une séquence déjà propre ne déclenche aucune correction de contenu.
  const net=ADN.corriger('ACGTACGT',{});
  out.netPropre=net.propre; out.netJournal=net.journal.length;
  // La position journalisée est celle de la séquence rendue, pas de la source.
  const pos=ADN.corriger('  ACGT u\n',{uracile:true});
  out.posU=pos.journal[0]&&pos.journal[0].pos;
  return out;
});
chk('ARN, minuscules, numérotation et blocs : une séquence propre',cor.propre==='ATGCGTAACGT',cor.propre);
chk('Les U sont comptés, pas seulement remplacés',cor.uraciles===2,String(cor.uraciles));
chk('Les espaces et retours à la ligne sont ignorés',cor.miseEnForme===true);
chk('Les chiffres de numérotation sont retirés',cor.numerotation===3,String(cor.numerotation));
chk('Un caractère invalide est retiré...',cor.invSeq==='ACGT',cor.invSeq);
chk('...et journalisé, jamais silencieux',cor.invJournal===1&&cor.invDit==='invalide',
    cor.invJournal+'/'+cor.invDit);
chk('Au choix, remplacé par N pour garder les coordonnées',cor.invN==='ACNGT',cor.invN);
chk('Les codes ambigus sont gardés par défaut',cor.ambGarde==='ACRYGT',cor.ambGarde);
chk('...et écrasés en N seulement si on le demande',cor.ambEcrase==='ACNNGT',cor.ambEcrase);
chk('Les lacunes d\'alignement partent',cor.lacRetiree==='ACGT',cor.lacRetiree);
chk('...ou restent si on le demande',cor.lacGardee==='AC--GT',cor.lacGardee);
chk('Une séquence propre est déclarée propre, sans journal',
    cor.netPropre===true&&cor.netJournal===0,String(cor.netPropre)+'/'+cor.netJournal);
chk('La position journalisée est celle de la séquence rendue',cor.posU===5,String(cor.posU));

console.log('=== 2. LES CHIFFRES SONT JUSTES ===');
const num=await p.evaluate(()=>{
  const out={};
  const c=ADN.composition('AACCGGTTNN');
  out.n=c.n; out.longueur=c.longueur; out.autres=c.autres;
  out.gc=c.gc;                       // 4 G+C sur 8 bases définies = 50 %
  out.skew=ADN.composition('GGGC').skewGC;   // (3-1)/4 = 0.5
  // GC glissant : une valeur par position possible de la fenêtre.
  const g=ADN.gcGlissant('GGGGCCCCAAAATTTT',4);
  out.points=g.length; out.premier=g[0].gc; out.dernier=g[g.length-1].gc;
  out.wallace=ADN.tmWallace('ATGC');          // 2×2 + 4×2 = 12
  out.masseA=ADN.masse('A');                  // 313,21 − 61,96
  // Le plus proche voisin : plus de GC, Tm plus haute, à longueur égale.
  out.riche=ADN.tmPlusProcheVoisin('GCGCGCGCGCGCGCGCGCGC',500,50);
  out.pauvre=ADN.tmPlusProcheVoisin('ATATATATATATATATATAT',500,50);
  // Une amorce ordinaire tombe où l'on s'attend à la trouver.
  out.amorce=ADN.tmPlusProcheVoisin('ACGTCAGGTCTTTCACCAGT',500,50);
  // Le sel compte : moins de sel, Tm plus basse.
  out.peuDeSel=ADN.tmPlusProcheVoisin('ACGTCAGGTCTTTCACCAGT',500,10);
  // Hors domaine : pas de chiffre plutôt qu'un chiffre faux.
  out.courte=ADN.tmPlusProcheVoisin('ACGTAC',500,50);
  out.ambigue=ADN.tmPlusProcheVoisin('ACGTNACGTACGT',500,50);
  return out;
});
chk('Les bases sont comptées une par une',
    num.n.A===2&&num.n.C===2&&num.n.G===2&&num.n.T===2&&num.autres===2,JSON.stringify(num.n));
chk('Les ambiguës comptent dans la longueur, pas dans le GC',
    num.longueur===10&&num.gc===50,num.longueur+'/'+num.gc);
chk('Le biais GC vaut (G−C)/(G+C)',num.skew===0.5,String(num.skew));
chk('Le GC glissant donne L−fenêtre+1 points',num.points===13,String(num.points));
chk('...et suit la séquence : 100 % au début, 0 % à la fin',
    num.premier===100&&num.dernier===0,num.premier+'/'+num.dernier);
chk('Tm de Wallace : 2(A+T) + 4(G+C)',num.wallace===12,String(num.wallace));
chk('Masse d\'un mononucléotide',Math.abs(num.masseA-251.25)<0.01,String(num.masseA));
chk('Plus de GC, Tm plus haute',num.riche>num.pauvre+10,num.riche+' vs '+num.pauvre);
chk('Une amorce de 20 nt tombe dans la plage attendue',
    num.amorce>45&&num.amorce<70,String(num.amorce));
chk('Moins de sel, Tm plus basse',num.peuDeSel<num.amorce-3,num.peuDeSel+' vs '+num.amorce);
chk('Trop courte : pas de Tm plus proche voisin',num.courte===null,String(num.courte));
chk('Ambiguë : pas de Tm plus proche voisin',num.ambigue===null,String(num.ambigue));

console.log('=== 3. LES BRINS ET LES COORDONNÉES ===');
const brins=await p.evaluate(()=>{
  const out={};
  out.rc=ADN.complementInverse('ATGC');            // GCAT
  out.comp=ADN.complement('ATGC');                 // TACG
  out.arn=ADN.transcrire('ATGC');                  // AUGC
  out.ambRc=ADN.complementInverse('RYKMN');        // N K M R Y
  // Un ORF sur le brin direct.
  const direct=ADN.orfs('AAAATGAAATTTTAA',{minAA:3,inverse:false});
  out.direct=direct.length&&{debut:direct[0].debut,fin:direct[0].fin,aa:direct[0].longueurAA,
                             prot:direct[0].prot,stop:direct[0].avecStop};
  // Le même, écrit à l'envers : les coordonnées sont rendues sur le brin direct.
  const inverse=ADN.orfs('TTAAAATTTCAT',{minAA:3,inverse:true});
  out.inverse=inverse.length&&{brin:inverse[0].brin,debut:inverse[0].debut,fin:inverse[0].fin,
                               prot:inverse[0].prot};
  // Sans le brin inverse, on ne le trouve pas : la case sert à quelque chose.
  out.sansInverse=ADN.orfs('TTAAAATTTCAT',{minAA:3,inverse:false}).length;
  // Un ORF sans stop est rendu, mais annoncé tronqué.
  const tronq=ADN.orfs('ATGAAATTTAAACCC',{minAA:3,inverse:false});
  out.tronque=tronq.length&&tronq[0].avecStop;
  // Le seuil de longueur est respecté.
  out.seuil=ADN.orfs('AAAATGAAATTTTAA',{minAA:10,inverse:false}).length;
  return out;
});
chk('Complémentaire inverse',brins.rc==='GCAT',brins.rc);
chk('Complémentaire, sens conservé',brins.comp==='TACG',brins.comp);
chk('Transcription en ARN',brins.arn==='AUGC',brins.arn);
chk('Les codes ambigus se complémentent aussi',brins.ambRc==='NKMRY',brins.ambRc);
chk('ORF direct : coordonnées, longueur, protéine',
    brins.direct&&brins.direct.debut===4&&brins.direct.fin===15&&brins.direct.aa===3&&
    brins.direct.prot==='MKF*'&&brins.direct.stop===true,JSON.stringify(brins.direct));
chk('ORF inverse : coordonnées rendues sur le brin direct',
    brins.inverse&&brins.inverse.brin==='−'&&brins.inverse.debut===1&&
    brins.inverse.fin===12&&brins.inverse.prot==='MKF*',JSON.stringify(brins.inverse));
chk('Sans le brin inverse, cet ORF n\'existe pas',brins.sansInverse===0,String(brins.sansInverse));
chk('Un ORF sans stop est annoncé tronqué',brins.tronque===false,String(brins.tronque));
chk('Le seuil de longueur écarte les courts',brins.seuil===0,String(brins.seuil));

console.log('=== 4. TRADUIRE SANS DEVINER ===');
const trad=await p.evaluate(()=>({
  standard:ADN.traduire('ATGGCCTGGTAA'),      // M A W *
  cadre2:ADN.traduire('GATGGCCTGGTAA',1),     // le même, décalé
  ggn:ADN.traduireCodon('GGN'),               // toutes les combinaisons = Gly
  yta:ADN.traduireCodon('YTA'),               // CTA et TTA = Leu
  nnn:ADN.traduireCodon('NNN'),               // indécidable
  atn:ADN.traduireCodon('ATN'),               // Ile ou Met : indécidable
  stop:ADN.traduireCodon('TGA'),
  reste:ADN.traduire('ATGGC')                 // le codon incomplet est laissé
}));
chk('Traduction standard',trad.standard==='MAW*',trad.standard);
chk('Traduction dans un autre cadre',trad.cadre2==='MAW*',trad.cadre2);
chk('GGN se traduit : toutes les issues donnent Gly',trad.ggn==='G',trad.ggn);
chk('YTA aussi : CTA et TTA donnent Leu',trad.yta==='L',trad.yta);
chk('NNN ne se traduit pas : X, pas un acide aminé au hasard',trad.nnn==='X',trad.nnn);
chk('ATN non plus : Ile et Met ne se confondent pas',trad.atn==='X',trad.atn);
chk('Les stops sont marqués',trad.stop==='*',trad.stop);
chk('Un codon incomplet en fin de séquence est laissé de côté',trad.reste==='M',trad.reste);

console.log('=== 5. MOTIFS ET ENZYMES ===');
const mot=await p.evaluate(()=>{
  const out={};
  // Les occurrences chevauchantes : TATATA contient deux TATA, pas une.
  out.chevauche=ADN.chercherMotif('TATATA','TATA',false).length;
  // Un motif palindromique n'est pas compté deux fois parce qu'on regarde
  // aussi le brin inverse.
  out.palindrome=ADN.chercherMotif('TATATA','TATA',true).length;
  // Un motif non palindromique, lui, se trouve sur les deux brins.
  const deux=ADN.chercherMotif('AAAGGGGCCCCTTT','GGGG',true);
  out.deuxBrins=deux.map(h=>h.brin+h.debut).join(',');
  // Les codes IUPAC valent dans le motif.
  out.iupac=ADN.chercherMotif('GGACC GGTCC'.replace(' ',''),'GGWCC',false).length;
  out.invalide=ADN.motifEnRegex('GGZCC');
  out.vide=ADN.motifEnRegex('');
  // Enzymes : la position rendue est celle de la coupure.
  const enz=ADN.sitesRestriction('AAAGAATTCAAA');
  const eco=enz.find(e=>e.nom==='EcoRI');
  out.eco=eco&&eco.positions.join(',');   // G^AATTC : site en 4, coupure en 5
  out.ecoN=eco&&eco.n;
  const sac=enz.find(e=>e.nom==='SacI'); // GAGCT^C : absent ici
  out.sacN=sac&&sac.n;
  // Un site dégénéré est reconnu (HincII = GTYRAC).
  const deg=ADN.sitesRestriction('TTGTCGACTT').find(e=>e.nom==='HincII');
  out.degN=deg&&deg.n;
  return out;
});
chk('Les occurrences chevauchantes sont comptées',mot.chevauche===2,String(mot.chevauche));
chk('Un palindrome n\'est pas compté deux fois',mot.palindrome===2,String(mot.palindrome));
chk('Un motif non palindromique se trouve sur les deux brins',
    mot.deuxBrins==='+4,−8',mot.deuxBrins);
chk('Les codes IUPAC valent dans le motif',mot.iupac===2,String(mot.iupac));
chk('Un motif impossible est refusé, pas interprété',mot.invalide===null,String(mot.invalide));
chk('Un motif vide ne cherche rien',mot.vide===null,String(mot.vide));
chk('EcoRI : une coupure, à la bonne base',mot.ecoN===1&&mot.eco==='5',mot.ecoN+'/'+mot.eco);
chk('Une enzyme qui ne coupe pas est rendue à zéro',mot.sacN===0,String(mot.sacN));
chk('Un site dégénéré est reconnu',mot.degN===1,String(mot.degN));

console.log('=== 6. LE FASTA ET LA PAGE ===');
const fa=await p.evaluate(()=>{
  const out={};
  const e=ADN.lireFasta('>un\nACGT\n>deux\nTTTT\n');
  out.deux=e.length; out.noms=e.map(x=>x.nom).join(',');
  // Une séquence nue reste une séquence : on ne la perd pas faute d'en-tête.
  out.nue=ADN.lireFasta('ACGT').length;
  // Ce qui précède le premier '>' n'est pas jeté en silence.
  out.avant=ADN.lireFasta('ACGT\n>un\nTTTT').length;
  return out;
});
chk('Deux enregistrements FASTA sont lus',fa.deux===2&&fa.noms==='un,deux',fa.noms);
chk('Une séquence sans en-tête reste lisible',fa.nue===1,String(fa.nue));
chk('Ce qui précède le premier « > » n\'est pas jeté',fa.avant===2,String(fa.avant));

// La page, maintenant : ce qu'on tape doit s'afficher.
await p.fill('#brut','>essai\nacgtacgtggcc uuu xx\n');
await p.waitForTimeout(400);
const page=await p.evaluate(()=>({
  kpis:document.getElementById('compo-kpis').textContent.replace(/\s+/g,' '),
  rapport:document.getElementById('rapport-resume').textContent.replace(/\s+/g,' '),
  detail:document.getElementById('rapport-detail').textContent.replace(/\s+/g,' '),
  vue:document.querySelector('#seq-vue .seqvue')?document.querySelector('#seq-vue .seqvue').textContent:'',
  enzymes:document.getElementById('enz-table').textContent.replace(/\s+/g,' '),
  choix:document.getElementById('choix-enr').hidden
}));
chk('La longueur corrigée s\'affiche',/15/.test(page.kpis),page.kpis.slice(0,120));
chk('Le rapport dit ce qui a été corrigé',
    /invalide/i.test(page.detail)&&/uracile|U d/i.test(page.detail),page.detail.slice(0,160));
chk('La séquence corrigée est affichée, numérotée',
    /ACGTACGTGGCCTTT/.test(page.vue.replace(/\s+/g,'')),page.vue.slice(0,80));
chk('Les sites de restriction sont listés',/HaeIII/.test(page.enzymes),page.enzymes.slice(0,120));
chk('Un seul enregistrement : pas de sélecteur',page.choix===true,String(page.choix));

// Deux enregistrements : le sélecteur apparaît et change la séquence analysée.
await p.fill('#brut','>un\nAAAAAAAAAA\n>deux\nGGGGGGGGGG\n');
await p.waitForTimeout(400);
const av=await p.evaluate(()=>({
  choix:document.getElementById('choix-enr').hidden,
  gc:document.getElementById('compo-kpis').textContent.replace(/\s+/g,' ')
}));
await p.selectOption('#enr','1');
await p.waitForTimeout(300);
const ap=await p.evaluate(()=>document.getElementById('compo-kpis').textContent.replace(/\s+/g,' '));
chk('Deux enregistrements : le sélecteur apparaît',av.choix===false,String(av.choix));
chk('Le premier est analysé (0 % GC)',/0,0 %/.test(av.gc),av.gc.slice(0,140));
chk('Changer d\'enregistrement change l\'analyse (100 % GC)',/100,0 %/.test(ap),ap.slice(0,140));

// Le motif surligne dans la vue, et le compte est affiché.
await p.fill('#brut','TATATATATA');
await p.fill('#motif','TATA');
await p.waitForTimeout(400);
const surl=await p.evaluate(()=>({
  res:document.getElementById('motif-res').textContent.replace(/\s+/g,' '),
  marques:document.querySelectorAll('#seq-vue .marq').length
}));
chk('Le motif est compté',/4 occurrence/.test(surl.res),surl.res.slice(0,120));
chk('...et surligné dans la séquence',surl.marques>0,String(surl.marques));

// Un motif impossible ne casse rien : il le dit.
await p.fill('#motif','GGZCC');
await p.waitForTimeout(300);
const refus=await p.evaluate(()=>document.getElementById('motif-res').textContent);
chk('Un motif impossible est refusé à l\'écran',/invalide/i.test(refus),refus.slice(0,80));

// Une saisie vide ne laisse pas la page dans un état indéfini.
await p.fill('#brut','');
await p.fill('#motif','');
await p.waitForTimeout(300);
const vide=await p.evaluate(()=>({
  err:document.getElementById('erreur').hidden,
  txt:document.getElementById('erreur').textContent
}));
chk('Vide : on le dit, on ne calcule rien',vide.err===false&&/vide/i.test(vide.txt),vide.txt);

chk('Aucune erreur JS',errs.length===0,errs.join(' | '));

await b.close();
const ko=R.filter(x=>!x[1]);
R.forEach(([n,ok,d])=>console.log((ok?'  ✓ ':'  ✗ ')+n+(ok?'':' → '+d)));
console.log(`\n${R.length-ko.length}/${R.length}`);
process.exit(ko.length?1:0);
})();
