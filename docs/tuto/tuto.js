/* Gestion Opé — tutoriel interactif (surcouche, mode démo) */
(function(){
const FONT_CSS='tuto/fonts/fonts.css';
const Y='#FCD727', K='#000', CREAM='#FFF8DA', GD='#505252', GL='#CDCCCC';
const Z=2147483000, PAD=8;
const LS='gope_tuto_done';

/* ─── styles ─── */
const lk=document.createElement('link'); lk.rel='stylesheet'; lk.href=FONT_CSS; document.head.appendChild(lk);
const css=document.createElement('style');
css.textContent=`
.tt-cur{position:fixed;background:rgba(12,12,10,.58);backdrop-filter:blur(3px) saturate(.7);-webkit-backdrop-filter:blur(3px) saturate(.7);z-index:${Z};transition:all .28s cubic-bezier(.3,.7,.2,1)}
.tt-ring{position:fixed;z-index:${Z+1};pointer-events:none;border-radius:14px;box-shadow:0 0 0 3px ${Y},0 0 0 9px rgba(252,215,39,.28);transition:all .28s cubic-bezier(.3,.7,.2,1)}
.tt-ring.act{animation:ttPulse 1.6s ease-in-out infinite}
.tt-ring.ok{box-shadow:0 0 0 3px #3E9A5C,0 0 0 9px rgba(62,154,92,.3);animation:none}
@keyframes ttPulse{0%,100%{box-shadow:0 0 0 3px ${Y},0 0 0 8px rgba(252,215,39,.30)}50%{box-shadow:0 0 0 3px ${Y},0 0 0 16px rgba(252,215,39,.06)}}
.tt-card{position:fixed;z-index:${Z+2};width:370px;max-width:calc(100vw - 32px);background:${K};color:#fff;border-radius:20px;padding:20px 22px 18px;font-family:'MuseoSans',system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.35);transition:left .28s cubic-bezier(.3,.7,.2,1),top .28s cubic-bezier(.3,.7,.2,1),opacity .2s}
.tt-card *{box-sizing:border-box}
.tt-lab{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:${Y};margin-bottom:8px;display:flex;gap:8px;align-items:center}
.tt-ttl{font-family:'MuseoSans',system-ui,sans-serif;font-size:25px;line-height:1.12;font-weight:900;letter-spacing:-.01em;margin:0 0 10px;color:#fff}
.tt-txt{font-size:14px;line-height:1.55;font-weight:300;color:#fff}
.tt-txt b{font-weight:700;color:${Y}}
.tt-do{margin-top:12px;font-size:12.5px;font-weight:700;color:${Y};display:flex;gap:8px;align-items:flex-start;line-height:1.4}
.tt-do:before{content:'';flex:none;width:8px;height:8px;border-radius:50%;background:${Y};margin-top:4px;animation:ttDot 1.2s ease-in-out infinite}
@keyframes ttDot{50%{opacity:.25}}
.tt-bar{display:flex;gap:4px;margin:16px 0 14px}
.tt-bar span{flex:1;height:4px;border-radius:2px;background:#2E2F2F}
.tt-bar span.on{background:${Y}}
.tt-btns{display:flex;gap:8px;align-items:center}
.tt-b{height:38px;padding:0 16px;border-radius:9999px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid ${Y};background:${Y};color:${K};display:inline-flex;align-items:center;gap:6px}
.tt-b:hover{background:#fff;border-color:#fff}
.tt-g{background:transparent;color:#fff;border-color:${GD}}
.tt-g:hover{background:#1c1c1c;border-color:${GL};color:#fff}
.tt-kbd{margin-left:auto;font-size:10.5px;color:${GL}}
.tt-menu{position:fixed;inset:0;z-index:${Z+3};background:rgba(12,12,10,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;font-family:'MuseoSans',system-ui,sans-serif;overflow:auto}
.tt-mcard{background:${CREAM};color:${K};border-radius:20px;padding:34px 36px 28px;width:100%;max-width:920px;box-shadow:0 24px 70px rgba(0,0,0,.35)}
.tt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin:24px 0 22px}
.tt-ch{all:unset;box-sizing:border-box;cursor:pointer;background:#fff;border-radius:20px;padding:18px 18px 16px;display:flex;flex-direction:column;gap:8px;border:1.5px solid transparent;transition:border-color .15s,transform .15s}
.tt-ch:hover{border-color:${K};transform:translateY(-2px)}
.tt-num{width:30px;height:30px;border-radius:50%;background:${Y};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px}
.tt-ch.done .tt-num{background:${K};color:${Y}}
.tt-launch{position:fixed;right:16px;bottom:16px;z-index:${Z-1};height:42px;padding:0 18px 0 14px;border-radius:9999px;border:none;background:${K};color:#fff;font-family:'MuseoSans',system-ui,sans-serif;font-size:13px;font-weight:700;display:flex;align-items:center;gap:9px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.tt-launch i{width:10px;height:10px;border-radius:50%;background:${Y}}
.tt-launch:hover{background:#222}
`;
document.head.appendChild(css);

/* ─── helpers ─── */
const $=s=>document.querySelector(s);
const $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const byText=(sel,re,root)=>$$(sel,root).find(e=>re.test(e.textContent));
const shown=e=>e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
const grp=id=>{const e=document.getElementById(id);return e&&(e.closest('.form-group')||e);};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const prenom=n=>{const t=(n||'').split(/\s+/);return t.find(x=>x!==x.toUpperCase())||t[0]||n;};
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const dayLong=d=>d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
const noConfirm=fn=>{const c=window.confirm;window.confirm=()=>true;try{fn();}finally{window.confirm=c;}};
const doneSet=()=>{try{return new Set(JSON.parse(localStorage.getItem(LS)||'[]'));}catch(e){return new Set();}};
const markDone=id=>{const s=doneSet();s.add(id);try{localStorage.setItem(LS,JSON.stringify([...s]));}catch(e){}};
function reveal(el){
  let p=el&&el.parentElement;
  while(p&&p!==document.body){
    const cs=getComputedStyle(p);
    if(/(auto|scroll)/.test(cs.overflowY+cs.overflow)&&p.scrollHeight>p.clientHeight+2){
      const pr=p.getBoundingClientRect(),er=el.getBoundingClientRect();
      if(er.top<pr.top+10||er.bottom>pr.bottom-10) p.scrollTop+=er.top-pr.top-Math.min(120,pr.height/4);
    }
    if(/(auto|scroll)/.test(cs.overflowX+cs.overflow)&&p.scrollWidth>p.clientWidth+2){
      const pr=p.getBoundingClientRect(),er=el.getBoundingClientRect();
      if(er.left<pr.left+180||er.right>pr.right-10) p.scrollLeft+=er.left-pr.left-Math.min(260,pr.width/3);
    }
    p=p.parentElement;
  }
  const r=el&&el.getBoundingClientRect(),se=document.scrollingElement;
  if(r&&se&&(r.top<0||r.bottom>innerHeight)) se.scrollTop+=r.top-innerHeight/4;
}
function workDay(){const d=new Date();d.setHours(0,0,0,0);const w=d.getDay();if(w===6)d.setDate(d.getDate()+2);if(w===0)d.setDate(d.getDate()+1);return d;}
function pickCase(exclude){
  const d=workDay(),lab=JOURS[(d.getDay()+6)%7],isA=isWeekA(getMonday(d));
  const inR=af=>typeof _affInRange!=='function'||_affInRange(af,d);
  const list=ga().filter(a=>!a.inactif&&(a.type||'accueil')==='accueil'&&!(exclude||[]).includes(a.id));
  for(const a of list){
    const afs=gaf().filter(x=>x.agentId===a.id&&x.jours.includes(lab)&&(x.semaine==='toutes'||(x.semaine==='A')===isA)&&inR(x));
    if(afs.length===1){const af=afs[0];const site=gs().find(s=>s.id===af.siteId);if(site) return {agent:a,af,site,date:d,dateStr:_ymd(d),dayIdx:(d.getDay()+6)%7,P:prenom(a.nom),jour:dayLong(d)};}
  }
  return null;
}
function cellFor(c){
  const row=$$('#planning-rows .agent-row').find(r=>r.dataset.agentName===c.agent.nom);
  return row?row.querySelectorAll('.day-cell')[c.dayIdx]:null;
}
function moisCell(c,ds){return c.agent?$(`#mois-grid [onclick="moisCellClick('${c.agent.id}','${ds||c.dateStr}')"]`):null;}
function moisRow(c){
  const cell=c.agent&&$$('#mois-grid > div > div').find(d=>/left:\s*0/.test(d.getAttribute('style')||'')&&d.querySelector('[onclick*="panel-agent-detail"]')?.textContent.includes(c.agent.nom));if(!cell)return [];
  const out=[cell];let n=cell.nextElementSibling;
  while(n&&!/left:\s*0/.test(n.getAttribute('style')||'')){out.push(n);n=n.nextElementSibling;}
  return out;
}
async function resetData(){
  const res=await Promise.all(FILES.map(f=>fetch('./tuto/data/'+f+'.json').then(r=>r.ok?r.json():[]).catch(()=>[])));
  FILES.forEach((f,i)=>_cache[f]=res[i]||[]);
  try{migrateTournees();migrateAgentTypes();migrateNomPrenom();_cliDemoSeed();}catch(e){}
  try{_site.sel=null;_site.tab='tous';_cli.sel=null;_cli.tab='tous';_cli.type='';_cli.open={};window._agIncomplets=false;ptTab='tous';const sc=$('#search-clients');if(sc)sc.value='';}catch(e){}
  tourneeFilter=[];siteFilter=[];agentFilter=[];
  try{const i=$('#scope-search-input');if(i)i.value='';closeScopeMenu();updateScopeLabel();}catch(e){}
  weekStart=getMonday(workDay());
  try{moisSelMode=false;moisSelAgent=null;moisSelStart=null;moisSelEnd=null;closeMoisPopup();}catch(e){}
  closePanel();
  const sa=$('#search-agents');if(sa)sa.value='';const ss=$('#search-sites');if(ss)ss.value='';
  agTab='tous';
  showView('planning');
  updateAbsenceBadge();
}

const cliCard=re=>$$('#clients-fiche .card').find(k=>re.test(k.querySelector('.cli-h')?.textContent||''));
function seedAbs(c){
  const abs=gab();abs.push({id:'tuto-abs',agentId:c.agent.id,dateDebut:c.dateStr,dateFin:c.dateStr,motif:'maladie',needsReplacement:true,remplacantId:null,siteId:c.site.id,notes:'',createdAt:new Date().toISOString()});
  sab(abs);croiseScreen='postes';croiseScope='semaine';croiseGapKey=null;renderPlanning();
}
/* ─── chapitres ─── */
const CH=[
{id:'decouverte',t:"Découvrir l'interface",d:"Les zones de l'écran et où se fait chaque geste.",min:2,
 steps:[
  {t:'Bienvenue',x:()=>`Gestion Opé répond chaque jour à une question : <b>qui travaille où, à quelle heure</b>, et que faire quand quelqu'un manque. Tour des zones en deux minutes.`},
  {t:'La semaine',el:()=>$('#header-week-section'),x:()=>`La semaine affichée. Les flèches avancent ou reculent, un clic sur la date ouvre le calendrier, <b>Auj.</b> ramène à aujourd'hui.`},
  {t:'Le filtre',el:()=>$('#scope-filter'),x:()=>`Tapez une <b>tournée</b>, un <b>site</b> ou un <b>agent</b> : le planning se restreint. Les sélections s'empilent en pastilles.`},
  {t:'Extraire',el:()=>$('button[onclick="openExport()"]'),x:()=>`Plannings, absences, retards et heures sup. : aperçu, <b>CSV</b> ou impression.`},
  {t:'Le rail',el:()=>$('.nav-rail'),x:()=>`En haut, l'exploitation du quotidien. En bas, le référentiel : agents, clients, sites, tournées. Survolez une icône pour voir son nom.`},
  {t:'Les alertes',skip:()=>!shown($('#alert-band'))&&!shown($('#cov-band')),el:()=>[$('#alert-band'),$('#cov-band')].filter(shown),x:()=>`<b>Rouge</b> : un agent absent sans remplaçant. <b>Ambre</b> : un créneau d'ouverture que personne ne tient. Chaque bande a son bouton pour régler le problème.`},
  {t:'Le planning',el:()=>[$('#planning-header'),...$$('#planning-rows .agent-row').slice(0,3)],x:()=>`Une ligne par agent, une colonne par jour. Chaque carte est un créneau : <b>site et horaires</b>.`},
  {t:'Le code couleur',el:()=>[$('#legend-btn'),$('#legend-popover')].filter(shown),
   done:()=>$('#legend-popover')?.classList.contains('open'),auto:()=>toggleLegend({stopPropagation(){}}),
   todo:'Cliquez sur le « ? »',x:()=>`La légende rappelle la signification de chaque couleur de carte.`},
  {t:'La légende',el:()=>[$('#legend-btn'),$('#legend-popover')].filter(shown),x:()=>`Prenez le temps de la parcourir. Elle reste accessible à tout moment depuis le « ? ».`,leave:()=>{try{closeLegend();}catch(e){}}},
  {t:'Ouvrir un créneau',enter:()=>closeLegend(),el:()=>$$('#planning-rows .shift-bar-present').find(shown),
   done:()=>currentPanel==='panel-creneau',auto:()=>$$('#planning-rows .shift-bar-present').find(shown)?.click(),
   todo:'Cliquez sur une carte verte',x:()=>`Un clic sur une carte ouvre son détail.`},
  {t:'Le panneau latéral',el:()=>$('#side-panel'),place:'left',x:()=>`Toutes les modifications passent par ce panneau : <b>ajuster ce jour</b>, <b>déclarer une absence</b>, <b>échanger</b>. Il s'ouvre toujours au même endroit.`,leave:()=>closePanel()}
 ]},
{id:'mois',t:'Le planning du mois',d:'Heures, statuts et absences sur un mois entier.',min:2,
 setup:c=>{
   moisSelMode=false;moisSelAgent=null;moisSelStart=null;moisSelEnd=null;moisSearch='';
   if(c.date){moisDate=new Date(c.date.getFullYear(),c.date.getMonth(),1);
     const e=new Date(c.date);do{e.setDate(e.getDate()+1);}while(e.getDay()===0||e.getDay()===6);
     if(e.getMonth()===c.date.getMonth()){c.selA=c.dateStr;c.selB=_ymd(e);}else{const p=new Date(c.date);do{p.setDate(p.getDate()-1);}while(p.getDay()===0||p.getDay()===6);c.selA=_ymd(p);c.selB=c.dateStr;}
     c.jourA=dayLong(new Date(c.selA+'T00:00:00'));c.jourB=dayLong(new Date(c.selB+'T00:00:00'));}
 },
 steps:[
  {t:'Vue d’ensemble',x:()=>`La semaine sert au quotidien. Le mois répond à d'autres questions : <b>combien d'heures</b> fait chacun, qui est absent quand, où tombent les remplacements.`},
  {t:'Ouvrir le mois',el:()=>$('#nav-mois'),done:()=>currentView==='mois',auto:()=>showView('mois'),todo:'Cliquez sur l’icône du planning du mois',x:()=>`Juste sous le planning semaine dans le rail.`},
  {t:'Changer de mois',el:()=>$('#header-mois-section'),x:()=>`Les flèches passent au mois précédent ou suivant, <b>Ce mois</b> revient au mois en cours. Le filtre tournée / site / agent fonctionne comme en semaine.`},
  {t:'La grille',el:()=>$('#mois-grid'),place:'center',x:()=>`Une ligne par agent, une colonne par jour ouvré, regroupés par semaine. Chaque case donne la <b>durée travaillée</b> et le site. La colonne du jour même est surlignée en jaune.`},
  {t:'Une ligne',el:c=>moisRow(c).slice(0,12),x:c=>`La ligne de <b>${esc(c.P)}</b>. Vert : en poste. Bleu : remplacement. Rouge : absence à remplacer. Jaune : absence couverte, avec les initiales du remplaçant.`},
  {t:'Les totaux',el:c=>{const r=moisRow(c);return r.length?r[r.length-1]:null;},place:'left',x:()=>`Après chaque semaine, la colonne <b>Sem.</b> fait le sous-total. La dernière colonne donne le <b>total du mois</b> : absences et sites fermés sont déduits, remplacements ajoutés.`},
  {t:'Le code couleur',el:()=>[$('#mois-legend-btn'),$('#mois-legend-popover')].filter(shown),
   done:()=>$('#mois-legend-popover')?.classList.contains('open'),auto:()=>toggleLegend({stopPropagation(){}},'mois-legend-btn','mois-legend-popover'),
   todo:'Cliquez sur le « ? »',x:()=>`La légende de la vue mois.`},
  {t:'La légende',el:()=>[$('#mois-legend-btn'),$('#mois-legend-popover')].filter(shown),x:()=>`Même principe qu'en semaine, avec en plus les absences traitées (jaune) et sans action (gris).`,leave:()=>{try{closeLegend();}catch(e){}}},
  {t:'Le détail d’un jour',enter:()=>{try{closeLegend();}catch(e){}},el:c=>moisCell(c),
   done:()=>!!$('#mois-popup'),auto:c=>openMoisPopup(c.agent.id,c.dateStr),
   todo:c=>`Cliquez sur la case du ${c.jour}`,x:c=>`Un clic sur une case ouvre le détail de la journée de ${esc(c.P)}.`},
  {t:'Créneaux du jour',el:()=>$('#mois-popup > div:last-child'),x:()=>`Horaires, sites et statut de chaque créneau, et le total du jour. Si l'agent est absent, les actions sur l'absence et <b>Trouver un remplaçant</b> apparaissent ici.`,leave:()=>closeMoisPopup()},
  {t:'Poser une absence',enter:()=>closeMoisPopup(),el:()=>$('#mois-fab'),place:'left',
   done:()=>moisSelMode,auto:()=>toggleMoisSel(),todo:'Cliquez sur « Poser une absence »',x:()=>`Pour une absence de plusieurs jours, la grille permet de sélectionner la période directement.`},
  {t:'Premier jour',el:c=>moisCell(c,c.selA),done:c=>moisSelAgent===c.agent.id&&moisSelStart===c.selA,auto:c=>moisCellClick(c.agent.id,c.selA),
   todo:c=>`Cliquez sur la case du ${c.jourA}`,x:c=>`Premier clic : le début de l'absence.`},
  {t:'Dernier jour',el:c=>moisCell(c,c.selB),done:c=>!!moisSelEnd,auto:c=>moisCellClick(c.agent.id,c.selB),
   todo:c=>`Cliquez sur la case du ${c.jourB}`,x:()=>`Second clic sur la même ligne : la fin. La période s'entoure en jaune.`},
  {t:'Déclarer',el:()=>$('#mois-selbar'),place:'top',done:()=>currentPanel==='panel-absence',auto:()=>moisDeclareAbsence(),
   todo:'Cliquez sur « Déclarer une absence »',x:()=>`La barre rappelle l'agent et la période.`},
  {t:'Formulaire pré-rempli',el:()=>[grp('pa-agent'),$('#pa-debut')?.closest('.form-row')],place:'left',x:()=>`Agent, date de début et date de fin viennent de la sélection. Il reste le motif et le remplacement, comme au chapitre « Déclarer une absence ».`,
   leave:()=>{closePanel();moisSelMode=false;moisSelAgent=null;moisSelStart=null;moisSelEnd=null;renderMois();}}
 ]},
{id:'absence',t:'Déclarer une absence',d:"Déclarer l'absence depuis le planning.",min:2,
 setup:c=>{},
 steps:[
  {t:'7 h 45, le téléphone sonne',x:c=>`<b>${esc(c.P)}</b> ne viendra pas ${c.jour}. Au planning : <b>${esc(c.site.nom)}</b>, ${c.af.debut}–${c.af.fin}. On retrouve sa ligne et on déclare l'absence.`},
  {t:'Trouver l’agent',el:()=>[$('#scope-filter'),$('#scope-menu')].filter(shown),
   done:c=>($('#scope-search-input')?.value||'').toLowerCase().includes(c.P.toLowerCase()),
   auto:c=>{const i=$('#scope-search-input');i.value=c.P;onScopeInput(c.P);},
   todo:c=>`Tapez « ${esc(c.P)} » dans le filtre`,x:()=>`Le filtre de l'en-tête cherche parmi les agents, les sites et les tournées.`},
  {t:'Le sélectionner',el:c=>[$('#scope-filter'),$(`#scope-list .scope-opt[data-stype="agent"][data-sval="${c.agent.id}"]`)].filter(shown),
   done:c=>agentFilter.includes(c.agent.id),auto:c=>selectScope('agent',c.agent.id),
   todo:c=>`Cliquez sur ${esc(c.P)} dans la liste`,x:()=>`Le planning ne montre plus que cette personne.`},
  {t:'Son créneau',enter:()=>{try{closeScopeMenu();}catch(e){}},el:c=>cellFor(c)?.querySelector('.shift-bar'),
   done:()=>currentPanel==='panel-creneau',auto:c=>cellFor(c)?.querySelector('.shift-bar')?.click(),
   todo:c=>`Cliquez sur la carte de ${c.jour.split(' ')[0]}`,x:c=>`La carte ${esc(c.site.nom)} du ${c.jour}.`},
  {t:'Déclarer absent',el:()=>byText('#panel-footer button',/Déclarer absent/),place:'left',
   done:()=>currentPanel==='panel-absence',auto:()=>byText('#panel-footer button',/Déclarer absent/)?.click(),
   todo:'Cliquez sur « Déclarer absent »',x:()=>`Le panneau indique que l'agent est présent. On bascule vers la déclaration.`},
  {t:'Déjà pré-rempli',el:()=>[grp('pa-agent'),$('#pa-debut')?.closest('.form-row')],place:'left',x:()=>`Agent et date viennent du créneau. Si l'absence dure plusieurs jours, renseignez la <b>date de fin</b> : tous les créneaux de la période sont concernés.`},
  {t:'Le motif',el:()=>grp('pa-motif'),place:'left',x:()=>`<b>Maladie</b> est sélectionné par défaut. Congés, formation ou autre se choisissent ici.`},
  {t:'Remplacement',el:()=>[$('#pa-toggle')?.closest('.form-group'),$('#pa-repl-section')].filter(shown),place:'left',x:()=>`« Remplacement nécessaire » reste activé : c'est ce qui déclenche l'alerte rouge. On peut choisir un remplaçant ici, mais on le fera avec le <b>planning croisé</b> au chapitre suivant.`},
  {t:'Enregistrer',enter:c=>{c.nAbs=gab().length;},el:()=>byText('#panel-footer button',/Enregistrer/),place:'left',
   done:c=>gab().length>c.nAbs,auto:()=>saveAbsence(),todo:'Cliquez sur « Enregistrer »',x:()=>`L'absence est créée.`},
  {t:'Le créneau passe en rouge',el:c=>cellFor(c),x:c=>`La carte de ${esc(c.P)} affiche <b>Absent</b>. Elle reste rouge tant que personne ne la reprend.`},
  {t:'L’alerte',el:()=>$('#alert-band'),x:()=>`La bande rouge compte les absences sans remplaçant, sur toutes les vues planning. Son bouton mène droit à la liste à combler.`}
 ]},
{id:'remplacant',t:'Trouver un remplaçant',d:'Le cas courant : depuis le planning de la semaine.',min:2,
 setup:c=>seedAbs(c),
 steps:[
  {t:'Un poste à couvrir',x:c=>`<b>${esc(c.P)}</b> est absent·e ${c.jour}. Personne ne tient <b>${esc(c.site.nom)}</b> de ${c.af.debut} à ${c.af.fin}. Le cas le plus fréquent se règle directement depuis le <b>planning de la semaine</b>.`},
  {t:'L’alerte',el:()=>$('#alert-band'),x:()=>`La bande rouge compte les absences sans remplaçant.`},
  {t:'Plusieurs entrées possibles',el:c=>cellFor(c)?.querySelector('.shift-bar-absent'),x:c=>`La carte rouge de ${esc(c.P)} est cliquable : son panneau propose <b>Trouver un remplaçant</b>. Même bouton depuis la liste des Absences et depuis le détail d'un jour au planning du mois. Ici, on passe par la bande rouge.`},
  {t:'Absences à combler',el:()=>byText('#alert-band button',/Absences à combler/),done:()=>currentPanel==='panel-remplacer',auto:()=>goAbsencesToFill(),
   todo:'Cliquez sur « Absences à combler »',x:()=>`Le bouton amène la semaine sur l'absence concernée, la fait clignoter et ouvre le panneau de remplacement.`},
  {t:'Le panneau',el:()=>$('#side-panel'),place:'left',x:()=>`En haut, le rappel de l'absence. Dessous, un sélecteur par <b>bloc à couvrir</b> : site et horaires. Une absence de plusieurs jours propose aussi un remplaçant unique pour toute la période.`},
  {t:'Choisir',el:()=>[$('#pr-search')?.closest('.form-group'),$('.pr-block')].filter(Boolean),place:'left',
   done:()=>!!$('.pr-block')?.value,auto:()=>{const sel=$('.pr-block');const m=(window._prBlockConf||{})[sel.dataset.af]||{};const o=[...sel.options].find(o=>o.value&&!m[o.value]);if(o){sel.value=o.value;prCheckBlock(sel);}},
   todo:'Choisissez un remplaçant dans la liste',x:()=>`Les candidats sont classés : <b>formé</b> sur le site ou non, libre ou déjà occupé avec l'endroit. Un avertissement rouge apparaît en cas de conflit. Le champ au-dessus filtre par nom.`},
  {t:'Enregistrer',enter:c=>{c.nR=gr().length;},el:()=>byText('#panel-footer button',/Enregistrer/),place:'left',done:c=>gr().length>c.nR,auto:()=>confirmerRepl('tuto-abs'),
   todo:'Cliquez sur « Enregistrer »',x:()=>`Le remplacement est enregistré et apparaît dans l'<b>Historique</b>.`},
  {t:'Le cas particulier',el:()=>$('#nav-croise'),x:()=>`Quand plusieurs absences se chevauchent ou qu'il faut arbitrer entre plusieurs agents, le <b>planning croisé</b> prend le relais. C'est le chapitre suivant.`},
  {t:'C’est réglé',enter:c=>{siteFilter=[c.site.id];tourneeFilter=[];agentFilter=[];try{updateScopeLabel();}catch(e){}refreshCurrentView();},el:c=>cellFor(c),x:c=>`Le planning est filtré sur <b>${esc(c.site.nom)}</b>. La carte de ${esc(c.P)} passe au <b>jaune</b> avec le prénom du remplaçant, et le poste apparaît sur la ligne du remplaçant. La bande rouge a disparu.`}
 ]},
{id:'croise',t:'Cas complexe : planning croisé',d:'Plusieurs agents et plannings à arbitrer.',min:2,
 setup:c=>seedAbs(c),
 steps:[
  {t:'Quand l’utiliser',x:c=>`Le panneau du planning suffit pour un poste isolé. Dès qu'il y a <b>plusieurs absences</b> en même temps ou des <b>plannings individuels</b> à comparer, le planning croisé met tout à plat. Exemple : <b>${esc(c.P)}</b> est absent·e ${c.jour}, ${esc(c.site.nom)} n'est plus tenu.`},
  {t:'Le planning croisé',el:()=>$('#nav-croise'),done:()=>currentView==='croise',auto:()=>showView('croise'),
   todo:'Cliquez sur l’icône du planning croisé',x:()=>`L'outil d'aide à la décision pour les remplacements délicats.`},
  {t:'Deux écrans',el:()=>$('.croise-seg'),x:()=>`<b>Postes à couvrir</b> : la liste et les candidats. <b>Calendrier croisé</b> : les journées des remplaçants superposées. On commence par la liste.`},
  {t:'Le poste',el:c=>$$('.cx-gap-row').find(r=>(r.dataset.q||'').includes(c.agent.nom.toLowerCase())),
   x:c=>`Les postes de la semaine. Point rouge : non couvert. Titulaire : ${esc(c.P)}. Le poste sélectionné est surligné ; ses candidats s'affichent à droite.`},
  {t:'Qui peut couvrir ?',el:()=>byText('.cx-card',/Qui peut couvrir/),place:'left',x:()=>`Les candidats : <b>libres</b> en vert en haut, <b>occupés</b> en rouge en bas avec leur autre poste. <b>RECO</b> désigne le meilleur choix, libre et formé sur le site.`},
  {t:'Assigner',el:()=>{const c=$('.cx-cand.reco')||$$('.cx-cand').find(x=>/Libre/.test(x.textContent))||$('.cx-cand');return c;},place:'left',
   done:()=>/✓/.test($('.cx-gap-row.sel .cx-pill')?.textContent||''),
   auto:()=>{const c=$('.cx-cand.reco')||$$('.cx-cand').find(x=>/Libre/.test(x.textContent))||$('.cx-cand');byText('span',/^Assigner$/,c)?.click();},
   todo:'Cliquez sur « Assigner »',x:()=>`Sur la ligne du candidat proposé.`},
  {t:'Poste couvert',el:()=>$('.cx-gap-row.sel'),x:()=>`Le poste passe au vert avec le prénom du remplaçant. Le remplacement est enregistré et apparaît dans l'<b>Historique</b>.`},
  {t:'Le calendrier croisé',el:()=>$('.croise-seg-btn[data-cseg="calendrier"]'),done:()=>croiseScreen==='calendrier',auto:()=>croiseGo('calendrier'),
   todo:'Cliquez sur « Calendrier croisé »',x:()=>`Pour arbitrer entre plusieurs candidats.`},
  {t:'Les journées superposées',el:()=>$('#view-croise'),place:'center',x:()=>`Les journées des candidats se superposent de 7 h à 19 h : on voit qui est libre, quand, et où. On peut glisser un agent directement sur le poste à couvrir.`},
  {t:'Retour au planning',el:()=>$('#nav-planning'),done:()=>currentView==='planning',auto:()=>showView('planning'),todo:'Cliquez sur le planning semaine',x:()=>`Vérifions le résultat.`},
  {t:'C’est réglé',enter:c=>{siteFilter=[c.site.id];tourneeFilter=[];agentFilter=[];try{updateScopeLabel();}catch(e){}refreshCurrentView();},el:c=>cellFor(c),x:c=>`Le planning est filtré sur <b>${esc(c.site.nom)}</b>. La carte de ${esc(c.P)} passe au <b>jaune</b> avec le prénom du remplaçant, et le poste apparaît sur la ligne du remplaçant. La bande rouge a disparu.`}
 ]},
{id:'couverture',t:"Créneau d'ouverture non couvert",d:"Repérer un site ouvert sans personne et décider.",min:2,
 steps:[
  {t:'Les horaires d’ouverture',x:()=>`Chaque fiche site porte ses horaires d'ouverture. L'application vérifie en continu qu'un agent <b>accueil</b> ou <b>multisite</b> couvre chacun d'eux.`},
  {t:'La bande ambre',el:()=>$('#cov-band'),x:()=>`Elle compte les créneaux d'ouverture sans personne.`},
  {t:'Voir les créneaux',el:()=>byText('#cov-band button',/Voir les créneaux/),done:()=>currentPanel==='panel-couverture',auto:()=>covOpenBand(),todo:'Cliquez sur « Voir les créneaux »',x:()=>`La liste détaillée s'ouvre dans le panneau.`},
  {t:'Deux natures de trou',el:()=>$('#panel-body .seg')||$('#side-panel'),place:'left',x:()=>`<b>Cette semaine</b> : un trou créé par une absence ou une libération, à régler maintenant. <b>Récurrents</b> : personne n'est jamais prévu, c'est le planning de base à corriger.`},
  {t:'Un créneau',enter:()=>{if(!covGapsWeek().length&&covGapsRecurrents().length){covSetTab('rec');}},el:()=>$('#panel-body .cov-row'),place:'left',x:()=>`Site, jour, heure d'ouverture et ce qui manque. <b>Rouge</b> : personne sur tout le créneau. <b>Ambre</b> : couverture partielle.`},
  {t:'Corriger',el:()=>$('#panel-body .cov-row .btn-primary, #panel-body .cov-row button'),place:'left',x:()=>`<b>Affecter</b> crée une affectation récurrente pré-remplie (site, jour, horaires). <b>Attribuer</b> propose les agents disponibles pour cette journée seulement.`},
  {t:'C’est normal',enter:c=>{c.nCov=$$('#panel-body .cov-row').length;},el:()=>byText('#panel-body .cov-row button',/C'est normal/),place:'left',
   done:c=>$$('#panel-body .cov-row').length<c.nCov,auto:()=>byText('#panel-body .cov-row button',/C'est normal/)?.click(),
   todo:'Cliquez sur « C’est normal »',x:()=>`Si le site n'a besoin de personne à ce moment, ce bouton fait taire l'alerte pour ce créneau.`},
  {t:'Côté sites',enter:()=>closePanel(),el:()=>$('#nav-sites'),done:()=>currentView==='sites',auto:()=>showView('sites'),todo:'Ouvrez les Sites',x:()=>`La même information vit sur les fiches.`},
  {t:'Sites non couverts',el:()=>byText('#sites-tabs .tab',/Non couverts/),done:()=>_site.tab==='trous',auto:()=>siteTab('trous'),todo:'Cliquez sur l’onglet « Non couverts »',x:()=>`L'onglet isole les sites dont un créneau d'ouverture récurrent n'a aucun agent. Un point orange les repère aussi dans la liste.`},
  {t:'La fiche du site',el:()=>$$('#sites-fiche .cli-pill').find(k=>/non couvert/.test(k.textContent))||$('#sites-fiche'),place:'left',x:()=>`La fiche rappelle les créneaux non couverts. Un clic sur la pastille orange rouvre la liste détaillée ; la carte <b>Couverture</b> les répète, avec les mêmes boutons pour corriger.`}
 ]},
{id:'fermeture',t:"Fermeture exceptionnelle d'un site",d:'Fermer un site un jour donné et libérer ses agents.',min:2,
 steps:[
  {t:'Site fermé',x:c=>`<b>${esc(c.site.nom)}</b> sera fermé ${c.jour}. Ses créneaux doivent disparaître du planning et ${esc(c.P)} doit redevenir disponible.`},
  {t:'Les sites',el:()=>$('#nav-sites'),done:()=>currentView==='sites',auto:()=>showView('sites'),todo:'Cliquez sur l’icône Sites',x:()=>`Les fermetures se programment sur la fiche du site.`},
  {t:'Rechercher',el:()=>$('#search-sites')?.closest('.search-bar'),
   done:c=>c.site.nom.toLowerCase().includes(($('#search-sites')?.value||'~').toLowerCase().trim())&&($('#search-sites')?.value||'').trim().length>2,
   auto:c=>{const i=$('#search-sites');i.value=c.site.nom;renderSites();},todo:c=>`Tapez « ${esc(c.site.nom.split(/[ —-]/)[0])} »`,x:()=>`Toutes les listes longues ont leur champ de recherche.`},
  {t:'Ouvrir la fiche',el:c=>$$('#sites-list .cli-item').find(k=>k.textContent.includes(c.site.nom)),
   done:c=>_site.sel===c.site.id,auto:c=>siteSelect(c.site.id),todo:'Cliquez sur le site dans la liste',x:()=>`La fiche s'affiche à droite : ouverture, informations, contacts, agents affectés et couverture.`},
  {t:'Les fermetures',el:()=>byText('#sites-fiche button',/Ajouter une fermeture/),done:()=>shown($('#sf-form')),auto:()=>siteFermToggle(),
   todo:'Cliquez sur « + Ajouter une fermeture »',x:()=>`Les fermetures se programment directement sur la fiche du site.`},
  {t:'La période',el:()=>$('#sf-form'),done:()=>!!$('#sf-debut')?.value,auto:c=>{$('#sf-debut').value=c.dateStr;$('#sf-fin').value=c.dateStr;$('#sf-motif').value='Fermeture exceptionnelle';},
   todo:'Saisissez la date dans « Du »',x:c=>`<b>${c.jour}</b> : début, fin et motif. Sans date de fin, la fermeture dure un seul jour.`},
  {t:'Enregistrer',enter:c=>{c.nG=gferm().length;},el:()=>byText('#sf-form button',/Enregistrer la fermeture/),
   done:c=>gferm().length>c.nG,auto:c=>siteFermAdd(c.site.id),todo:'Cliquez sur « Enregistrer la fermeture »',x:()=>`La fermeture rejoint la liste de la fiche. Une pastille « Fermé jusqu'au… » apparaît tant qu'elle est en cours.`},
  {t:'Au planning',enter:c=>{closePanel();showView('planning');siteFilter=[c.site.id];tourneeFilter=[];agentFilter=[];try{updateScopeLabel();}catch(e){}refreshCurrentView();},el:c=>cellFor(c),x:c=>`Planning filtré sur le site. La carte de ${esc(c.P)} affiche <b>Fermé</b>, hachurée. Elle ne compte plus dans ses heures, ne crée pas d'alerte, et ${esc(c.P)} peut être proposé·e en remplacement ce jour-là.`}
 ]},
{id:'agents',t:'Fiche agent et archivage',d:'Profils, sites maîtrisés, départ d’un agent.',min:2,
 steps:[
  {t:'Les fiches agents',x:()=>`Elles alimentent les propositions de remplaçant : un profil et des sites maîtrisés bien renseignés donnent de meilleures suggestions.`},
  {t:'Les agents',el:()=>$('#nav-agents'),done:()=>currentView==='agents',auto:()=>showView('agents'),todo:'Cliquez sur l’icône Agents',x:()=>`La liste de l'équipe.`},
  {t:'Les profils',el:()=>$('#view-agents .tabs'),x:()=>`<b>Concierge</b>, <b>accueil</b> et <b>multisite</b> (les remplaçants) couvrent les ouvertures de site. Logistique, factotum et chantier n'en font pas partie. L'onglet <b>Responsables opé</b> regroupe ceux qui peuvent effectuer des remplacements.`},
  {t:'Rechercher',el:()=>$('#search-agents')?.closest('.search-bar'),
   done:c=>($('#search-agents')?.value||'').trim().length>1&&c.agent.nom.toLowerCase().includes($('#search-agents').value.toLowerCase().trim()),
   auto:c=>{$('#search-agents').value=c.P;renderAgents();},todo:c=>`Tapez « ${esc(c.P)} »`,x:()=>``},
  {t:'La carte',el:c=>$$('#agents-grid .card').find(k=>k.textContent.includes(c.agent.nom)),x:()=>`Coordonnées, sites maîtrisés et affectations, dépliables.`},
  {t:'Modifier',el:c=>$$('#agents-grid .card').find(k=>k.textContent.includes(c.agent.nom))?.querySelector('.btn-icon:not(.red)'),
   done:()=>currentPanel==='panel-agent',auto:c=>openPanel('panel-agent',c.agent.id),todo:'Cliquez sur le crayon',x:()=>`La fiche s'ouvre.`},
  {t:'Le type',el:()=>grp('pa2-type'),place:'left',x:()=>`Concierge, accueil, multisite, logistique, factotum, chantier. Plusieurs types peuvent se cumuler. Il détermine qui est proposé pour couvrir quoi.`},
  {t:'Sites maîtrisés',el:()=>{const g=$('#pa2-comps')?.closest('.form-group');if(g)reveal(g);return g;},place:'left',x:()=>`Cochez les sites que l'agent sait tenir. Le planning croisé les place en tête avec le badge <b>formé</b>.`},
  {t:'Un départ',enter:()=>closePanel(),el:c=>$$('#agents-grid .card').find(k=>k.textContent.includes(c.agent.nom))?.querySelector('.btn-icon.red'),
   done:c=>!!ga().find(a=>a.id===c.agent.id)?.inactif,auto:c=>noConfirm(()=>delAgent(c.agent.id)),
   todo:'Cliquez sur la corbeille, puis confirmez',x:()=>`On archive plutôt que de supprimer : ses affectations sont retirées, son historique reste.`},
  {t:'Les archivés',el:()=>byText('#view-agents .tab',/Archivés/),done:()=>agTab==='archives',auto:()=>byText('#view-agents .tab',/Archivés/)?.click(),todo:'Cliquez sur l’onglet « Archivés »',x:()=>``},
  {t:'Réversible',el:c=>$$('#agents-grid .card').find(k=>k.textContent.includes(c.agent.nom)),x:()=>`Absences, remplacements et pointages passés sont conservés. La flèche circulaire réactive l'agent.`}
 ]},
{id:'clients',t:'Clients et journal',d:'Contrat, contacts, sites et journal des échanges.',min:2,
 setup:c=>{c.cli=_dvCli.clients[0];c.cid=c.cli&&c.cli.id;c.cnom=c.cli?c.cli.nom:'';c.cq=(c.cnom.split(/\s+/)[0]||'').toLowerCase();},
 steps:[
  {t:'Un client, plusieurs sites',x:()=>`Un client regroupe ses <b>sites</b>, ses <b>contacts</b>, son <b>contrat</b> et le <b>journal</b> des échanges. Les agents affectés, la couverture et les absences de ses sites s'y retrouvent aussi.`},
  {t:'Les clients',el:()=>$('#nav-clients'),done:()=>currentView==='clients',auto:()=>showView('clients'),todo:'Cliquez sur l’icône Clients',x:()=>`Dans le rail, à côté des agents et des sites.`},
  {t:'La liste',el:()=>$('#clients-list'),place:'right',x:()=>`Liste à gauche, fiche à droite. Un point coloré signale une alerte : fin de contrat proche ou bilan en retard.`},
  {t:'À traiter',el:()=>byText('#clients-tabs .tab',/À traiter/),done:()=>_cli.tab==='alertes',auto:()=>cliTab('alertes'),todo:'Cliquez sur l’onglet « À traiter »',x:()=>`Il ne garde que les clients qui demandent une action.`},
  {t:'Rechercher',enter:()=>cliTab('tous'),el:()=>$('#search-clients')?.closest('.search-bar'),
   done:c=>($('#search-clients')?.value||'').trim().length>2,auto:c=>{const i=$('#search-clients');i.value=c.cq;renderClients();},
   todo:c=>`Tapez « ${esc(c.cq)} »`,x:()=>`La recherche porte sur le client, ses sites et ses contacts.`},
  {t:'Ouvrir la fiche',el:c=>$$('#clients-list .cli-item').find(k=>k.textContent.includes(c.cnom)),done:c=>_cli.sel===c.cid,auto:c=>cliSelect(c.cid),todo:'Cliquez sur le client',x:()=>`La fiche s'ouvre à droite.`},
  {t:'La fiche',el:()=>$('#clients-fiche'),place:'left',x:()=>`En-tête avec contrat et filiale, puis des cartes : <b>contacts</b>, <b>sites</b>, <b>agents affectés</b>, <b>couverture</b>, <b>absences et remplacements</b> sur ± 30 jours.`},
  {t:'Les contacts',el:()=>cliCard(/^Contacts/),place:'left',x:()=>`Un contact peut être rattaché au client entier ou à un site précis. Les numéros et adresses sont cliquables.`},
  {t:'Le journal',el:()=>cliCard(/^Journal/),place:'left',x:()=>`Bilans, comptes rendus, appels, réclamations, notes internes. Les pastilles du haut filtrent par type.`},
  {t:'Lire une entrée',el:()=>$$('#clients-fiche .note-h').find(h=>!h.parentElement.classList.contains('open'))||$('#clients-fiche .note-h'),
   done:()=>!!$('#clients-fiche .note.open'),auto:()=>($$('#clients-fiche .note-h').find(h=>!h.parentElement.classList.contains('open'))||$('#clients-fiche .note-h'))?.click(),
   todo:'Cliquez sur une entrée',x:()=>`Un clic la déplie : participants, compte rendu mis en forme, actions décidées avec responsable et échéance. Une case à cocher marque l'action faite.`},
  {t:'Nouvelle entrée',el:()=>byText('#clients-fiche button',/\+ Entrée/),done:()=>currentPanel==='panel-note',auto:c=>openPanel('panel-note',{cid:c.cid}),todo:'Cliquez sur « + Entrée »',x:()=>`Après un appel ou une réunion, on garde une trace ici.`},
  {t:'L’objet',el:()=>$('#pn-titre')?.closest('.form-group'),place:'left',done:()=>!!$('#pn-titre')?.value.trim(),auto:()=>{const i=$('#pn-titre');i.value='Point de suivi';},
   todo:'Saisissez un objet',x:()=>`Un titre court. À droite : le <b>type</b> d'entrée et la <b>date</b>.`},
  {t:'Le contenu',el:()=>[$('#pn-tools'),$('#pn-cr')].filter(Boolean),place:'left',x:()=>`Une barre de mise en forme, ou directement au clavier : « - » crée une liste, « [] » une tâche, « # » un titre.`},
  {t:'Participants et actions',el:()=>[$('#pn-part')?.closest('.form-group'),$('.nt-i6')].filter(Boolean),place:'left',x:()=>`Les participants se complètent avec les contacts du client. Chaque <b>action décidée</b> a un libellé, un responsable et une échéance.`},
  {t:'Enregistrer',enter:c=>{c.nN=_dvCli.notes.length;},el:()=>$('#pn-save'),place:'left',done:c=>_dvCli.notes.length>c.nN,auto:c=>saveNote(c.cid,''),todo:'Cliquez sur « Enregistrer »',x:()=>`L'entrée rejoint le journal du client. En démonstration, rien n'est conservé.`}
 ]},
{id:'tournees',t:'Tournées logistiques',d:'Sites desservis par un même agent, dans l’ordre.',min:1,
 setup:c=>{
   const ts=gt();const t=ts.find(x=>x.agentId)||ts[0];
   if(t&&!(t.siteIds||[]).length&&t.agentId&&typeof agentSiteIds==='function'){t.siteIds=agentSiteIds(t.agentId).slice(0,6);st(ts);}
   c.tour=t;
 },
 steps:[
  {t:'Les tournées',x:()=>`Les agents logistiques passent sur plusieurs sites dans la journée. La tournée regroupe ces sites dans l'ordre de passage.`},
  {t:'Ouvrir',el:()=>$('#nav-tournees'),done:()=>currentView==='tournees',auto:()=>showView('tournees'),todo:'Cliquez sur l’icône Tournées',x:()=>``},
  {t:'Une tournée',el:c=>$$('#tournees-list .card').find(k=>c.tour&&k.textContent.includes(c.tour.nom))||$('#tournees-list .card'),x:()=>`Agent attitré, sites numérotés dans l'ordre de passage, heure de première ouverture.`},
  {t:'Modifier',el:c=>($$('#tournees-list .card').find(k=>c.tour&&k.textContent.includes(c.tour.nom))||$('#tournees-list .card'))?.querySelector('.btn-icon:not(.red)'),
   done:()=>currentPanel==='panel-tournee',auto:c=>openPanel('panel-tournee',c.tour&&c.tour.id),todo:'Cliquez sur le crayon',x:()=>``},
  {t:'Ordre de passage',el:()=>$('#side-panel'),place:'left',x:()=>`Ajoutez ou retirez des sites et réglez l'ordre. Le tri automatique range les sites par horaire d'ouverture.`},
  {t:'Filtrer le planning',enter:()=>{closePanel();showView('planning');},el:()=>[$('#scope-filter'),$('#scope-menu')].filter(shown),
   done:c=>!!c.tour&&tourneeFilter.includes(c.tour.id),auto:c=>{if(c.tour){selectScope('tournee',c.tour.id);}},
   todo:c=>`Tapez « ${esc(c.tour?c.tour.nom:'')} » puis cliquez la tournée`,x:()=>`Le filtre de l'en-tête accepte aussi les tournées.`},
  {t:'Planning de la tournée',enter:()=>{try{closeScopeMenu();}catch(e){}},el:()=>$('#planning-container'),place:'center',x:()=>`Seuls les sites et agents de la tournée restent affichés, en semaine comme au mois. La croix du filtre remet tout le planning.`}
 ]},
{id:'pointage',t:'Retards et heures sup.',d:'Noter un retard ou une heure supplémentaire.',min:1,
 steps:[
  {t:'Le suivi du temps',x:()=>`Chaque retard et chaque heure supplémentaire se note par agent, avec le site et la durée.`},
  {t:'Ouvrir le suivi',el:()=>$('#nav-suivi'),done:()=>currentView==='pointage',auto:()=>showView('pointage'),todo:'Cliquez sur l’icône Retards et H. sup.',x:()=>`Dans le rail, à côté du planning du mois.`},
  {t:'Les compteurs',el:()=>$('#pt-stats'),x:()=>`Un résumé des événements enregistrés.`},
  {t:'Les onglets',el:()=>$('#view-pointage .tabs'),x:()=>`<b>Tous</b>, <b>Retards</b> ou <b>Heures sup.</b> pour filtrer la liste.`},
  {t:'Ajouter',el:()=>byText('#view-pointage .page-heading button',/Ajouter/),done:()=>currentPanel==='panel-pointage',auto:()=>openPanel('panel-pointage'),todo:'Cliquez sur « + Ajouter »',x:()=>`Le formulaire s'ouvre dans le panneau.`},
  {t:'Qui, quoi, où',el:()=>[grp('ppt-type'),grp('ppt-agent'),grp('ppt-site')].filter(Boolean),place:'left',
   done:c=>!!$('#ppt-agent')?.value&&!!$('#ppt-duree')?.value,auto:c=>{$('#ppt-agent').value=c.agent.id;$('#ppt-duree').value=20;},
   todo:'Choisissez un agent et saisissez une durée',x:()=>`Retard ou heure supplémentaire, l'agent concerné et le site. La date vaut aujourd'hui par défaut ; la durée se compte en minutes.`},
  {t:'Enregistrer',enter:c=>{c.nP=gpt().length;},el:()=>byText('#panel-footer button',/Enregistrer/),place:'left',done:c=>gpt().length>c.nP,auto:()=>savePointage(),todo:'Cliquez sur « Enregistrer »',x:()=>`L'événement est ajouté.`},
  {t:'Dans la liste',el:()=>$('#pt-list'),place:'center',x:()=>`Chaque ligne se supprime au besoin. Ces données alimentent l'extraction en haut de l'écran.`}
 ]}
];

/* ─── moteur ─── */
let cur=null, idx=0, C={}, raf=0, stepT0=0, advancing=false, lastEl=null;
const ui={};
function build(){
  ['t','l','r','b'].forEach(k=>{const d=document.createElement('div');d.className='tt-cur';d.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();});document.body.appendChild(d);ui[k]=d;});
  ui.ring=document.createElement('div');ui.ring.className='tt-ring';document.body.appendChild(ui.ring);
  ui.card=document.createElement('div');ui.card.className='tt-card';document.body.appendChild(ui.card);
  ['click','mousedown','pointerdown'].forEach(ev=>ui.card.addEventListener(ev,e=>e.stopPropagation()));
  hide();
}
function hide(){['t','l','r','b','ring','card'].forEach(k=>ui[k]&&(ui[k].style.display='none'));}
function rectOf(els){
  const a=(Array.isArray(els)?els:[els]).filter(shown);if(!a.length)return null;
  let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;
  a.forEach(e=>{const r=e.getBoundingClientRect();x1=Math.min(x1,r.left);y1=Math.min(y1,r.top);x2=Math.max(x2,r.right);y2=Math.max(y2,r.bottom);});
  const W=innerWidth,H=innerHeight;
  x1=Math.max(4,x1-PAD);y1=Math.max(4,y1-PAD);x2=Math.min(W-4,x2+PAD);y2=Math.min(H-4,y2+PAD);
  return {x:x1,y:y1,w:x2-x1,h:y2-y1};
}
function setBox(el,x,y,w,h){Object.assign(el.style,{display:'block',left:x+'px',top:y+'px',width:Math.max(0,w)+'px',height:Math.max(0,h)+'px'});}
function layout(r,place){
  const W=innerWidth,H=innerHeight;
  if(!r){setBox(ui.t,0,0,W,H);['l','r','b'].forEach(k=>ui[k].style.display='none');ui.ring.style.display='none';}
  else{
    setBox(ui.t,0,0,W,r.y);setBox(ui.b,0,r.y+r.h,W,H-r.y-r.h);setBox(ui.l,0,r.y,r.x,r.h);setBox(ui.r,r.x+r.w,r.y,W-r.x-r.w,r.h);
    setBox(ui.ring,r.x,r.y,r.w,r.h);
  }
  const c=ui.card;c.style.display='block';
  const cw=c.offsetWidth,ch=c.offsetHeight,g=18;let x,y;
  if(!r||place==='center'){x=(W-cw)/2;y=(H-ch)/2;if(r&&place==='center'){x=W-cw-24;y=H-ch-24;}}
  else{
    const cand=[];
    const cy=Math.min(Math.max(r.y,16),H-ch-16);
    const cx=Math.min(Math.max(r.x,16),W-cw-16);
    const opts={right:[r.x+r.w+g,cy,r.x+r.w+g+cw<W-8],left:[r.x-g-cw,cy,r.x-g-cw>8],bottom:[cx,r.y+r.h+g,r.y+r.h+g+ch<H-8],top:[cx,r.y-g-ch,r.y-g-ch>8]};
    (place?[place,'right','left','bottom','top']:['right','bottom','left','top']).forEach(k=>opts[k]&&opts[k][2]&&cand.push(opts[k]));
    if(cand.length){[x,y]=cand[0];}else{x=W-cw-24;y=H-ch-24;}
  }
  c.style.left=Math.round(Math.max(8,Math.min(x,W-cw-8)))+'px';c.style.top=Math.round(Math.max(8,Math.min(y,H-ch-8)))+'px';
}
function val(v){return typeof v==='function'?v(C):v;}
function renderCard(){
  const s=cur.steps[idx],n=cur.steps.length,last=idx===n-1;
  const todo=s.done?val(s.todo):'';
  const txt=val(s.x)||'';
  const label=s.auto?'Le faire pour moi':(last?'Terminer':'Suivant');
  ui.card.innerHTML=`
    <div class="tt-lab"><span>Chapitre ${CH.indexOf(cur)+1}</span><span style="color:${GL};font-weight:700;letter-spacing:.08em">${esc(cur.t)}</span></div>
    <div class="tt-ttl">${esc(s.t)}</div>
    ${txt?`<div class="tt-txt">${txt}</div>`:''}
    ${todo?`<div class="tt-do">${todo}</div>`:''}
    <div class="tt-bar">${cur.steps.map((_,i)=>`<span class="${i<=idx?'on':''}"></span>`).join('')}</div>
    <div class="tt-btns">
      <button class="tt-b" data-a="next">${label}${s.auto?'':' →'}</button>
      ${idx>0&&!s.done?`<button class="tt-b tt-g" data-a="restart" title="Recommencer le chapitre">↺</button>`:''}
      <button class="tt-b tt-g" data-a="menu">Chapitres</button>
      <span class="tt-kbd">${idx+1} / ${n}</span>
    </div>`;
  ui.card.querySelector('[data-a="next"]').onclick=next;
  ui.card.querySelector('[data-a="menu"]').onclick=()=>{stop();openMenu();};
  const rs=ui.card.querySelector('[data-a="restart"]');if(rs)rs.onclick=()=>startChapter(cur);
}
function tick(){
  if(!cur)return;
  const s=cur.steps[idx];
  let el=null;try{el=s.el?s.el(C):null;}catch(e){}
  if(el&&el!==lastEl){lastEl=el;reveal(Array.isArray(el)?el[0]:el);}
  const r=el?rectOf(el):null;
  ui.ring.classList.toggle('act',!!s.done&&!advancing);
  layout(r,s.place);
  if(s.done&&!advancing&&performance.now()-stepT0>350){
    let ok=false;try{ok=!!s.done(C);}catch(e){}
    if(ok){advancing=true;ui.ring.classList.add('ok');setTimeout(()=>{ui.ring.classList.remove('ok');go(idx+1);},550);}
  }
  raf=requestAnimationFrame(tick);
}
function go(i){
  const prev=cur.steps[idx];if(i>idx&&prev&&prev.leave)try{prev.leave(C);}catch(e){}
  if(i>=cur.steps.length){finish();return;}
  idx=i;const s=cur.steps[idx];
  if(s.skip&&s.skip(C)){go(i+1);return;}
  if(s.enter)try{s.enter(C);}catch(e){console.warn(e);}
  advancing=false;lastEl=null;stepT0=performance.now();
  renderCard();
}
function next(){
  if(!cur||advancing)return;
  const s=cur.steps[idx];
  if(s.auto){
    let ok=false;try{ok=s.done&&s.done(C);}catch(e){}
    if(!ok){try{s.auto(C);}catch(e){console.warn(e);}}
    advancing=true;ui.ring.classList.add('ok');
    setTimeout(()=>{ui.ring.classList.remove('ok');go(idx+1);},650);
  } else go(idx+1);
}
function finish(){
  markDone(cur.id);const done=cur;stop();
  openMenu(done.id);
}
function stop(){cancelAnimationFrame(raf);cur=null;hide();launch.style.display='flex';}
async function startChapter(ch){
  closeMenu();cancelAnimationFrame(raf);cur=null;hide();
  launch.style.display='none';
  await resetData();
  C=pickCase()||{};
  if(ch.setup)try{ch.setup(C);}catch(e){console.warn(e);}
  cur=ch;idx=-1;go(0);
  ['t','l','r','b','card'].forEach(k=>ui[k].style.display='block');
  raf=requestAnimationFrame(tick);
}

/* ─── menu ─── */
let menuEl=null;
function openMenu(justDone){
  closeMenu();
  const dn=doneSet();
  menuEl=document.createElement('div');menuEl.className='tt-menu';
  const justIdx=justDone?CH.findIndex(c=>c.id===justDone):-1;
  const nextCh=justIdx>=0?CH.slice(justIdx+1).find(c=>!dn.has(c.id)):null;
  menuEl.innerHTML=`<div class="tt-mcard">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="width:11px;height:11px;border-radius:50%;background:${Y}"></span>
      <span style="font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:${GD}">La Conciergerie Solidaire · Gestion Opé</span>
    </div>
    <h1 style="font-family:'MuseoSans',system-ui,sans-serif;font-weight:900;letter-spacing:-.02em;font-size:44px;line-height:1.02;margin:0 0 12px">${justDone?'Chapitre terminé':'Prise en main'}</h1>
    <p style="margin:0;font-size:15px;line-height:1.55;color:${GD};max-width:40em">${justDone?(nextCh?`Suite conseillée : <b style="color:${K}">${esc(nextCh.t)}</b>.`:'Choisissez un autre chapitre, ou explorez librement.'):`${CH.length} parcours courts sur les données de démonstration. Chaque chapitre repart des données d'origine et rien n'est enregistré : essayez sans crainte. À chaque étape, faites le geste vous-même ou cliquez « Le faire pour moi ».`}</p>
    <div class="tt-grid">${CH.map((c,i)=>`<button class="tt-ch${dn.has(c.id)?' done':''}" data-i="${i}">
      <div style="display:flex;align-items:center;justify-content:space-between"><span class="tt-num">${dn.has(c.id)?'✓':i+1}</span><span style="font-size:11px;color:${GD};font-weight:500">${c.steps.length} étapes · ${c.min} min</span></div>
      <div style="font-size:16px;font-weight:900;line-height:1.25">${esc(c.t)}</div>
      <div style="font-size:13px;line-height:1.45;color:${GD}">${esc(c.d)}</div>
    </button>`).join('')}</div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      ${nextCh?`<button class="tt-b" data-next="${CH.indexOf(nextCh)}" style="height:42px">Continuer : ${esc(nextCh.t)} →</button>`:''}
      <button class="tt-b tt-g" data-close style="height:42px;color:${K};border-color:${K}">Explorer librement</button>
      <span style="font-size:12px;color:${GD};margin-left:auto">Clavier : Entrée = suivant · Échap = chapitres</span>
    </div>
  </div>`;
  menuEl.addEventListener('click',e=>{
    const b=e.target.closest('[data-i],[data-next]');
    if(b){startChapter(CH[+(b.dataset.i??b.dataset.next)]);return;}
    if(e.target.closest('[data-close]')||e.target===menuEl){closeMenu();}
  });
  document.body.appendChild(menuEl);
  launch.style.display='none';
}
function closeMenu(){if(menuEl){menuEl.remove();menuEl=null;}if(!cur)launch.style.display='flex';}

const launch=document.createElement('button');launch.className='tt-launch';launch.innerHTML='<i></i>Tutoriel';launch.onclick=()=>openMenu();

document.addEventListener('keydown',e=>{
  if(menuEl&&e.key==='Escape'){closeMenu();return;}
  if(!cur)return;
  const tag=(e.target.tagName||'').toLowerCase();
  if(e.key==='Escape'){e.preventDefault();stop();openMenu();}
  else if(e.key==='Enter'&&!['input','textarea','select'].includes(tag)&&!e.target.closest('.tt-card')){e.preventDefault();next();}
},true);
window.addEventListener('resize',()=>{if(cur)lastEl=null;});

function init(){
  build();document.body.appendChild(launch);
  const wait=setInterval(()=>{try{if(ga().length&&gs().length){clearInterval(wait);setTimeout(()=>openMenu(),400);}}catch(e){}},150);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.GopeTuto={open:openMenu,start:i=>startChapter(CH[i])};
})();
