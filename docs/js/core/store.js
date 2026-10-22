// Accès données (DB, gs/ga/…), natures de créneau, migrations
const DB = {
  get(k){ return _cache[k] || []; },
  set(k,v){
    _cache[k] = v;
    if(k==='agents') _contratMap=null;
    clearTimeout(_syncTimers[k]);
    _syncTimers[k] = setTimeout(async () => {
      _syncTimers[k] = null;
      if(DEMO_MODE){ showSyncStatus('Mode démo — modifications non enregistrées'); setTimeout(()=>showSyncStatus(''),3000); return; }
      await _attemptSave(k, v, 0);
    }, 800);
  },
  id(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,5) }
};
const gs = () => DB.get('sites');       const ss = v => DB.set('sites',v);
const ga = () => DB.get('agents');      const sa = v => DB.set('agents',v);
const gaf = () => DB.get('affec');      const saf = v => DB.set('affec',v);
const gab = () => DB.get('absences');   const sab = v => DB.set('absences',v);
const gr = () => DB.get('rempl');       const sr = v => { _ensureAbsForRempl(v); DB.set('rempl',v); };
/* Remplacement sans absence correspondante → absence d'une journée (motif Autre) créée pour le rattacher. Renvoie les remplacements concernés. */
function _ensureAbsForRempl(list){
  const abs=gab(), orph=(list||[]).filter(r=>r.agentAbsentId && r.date && !abs.some(a=>a.agentId===r.agentAbsentId && a.dateDebut<=r.date && r.date<=(a.dateFin||a.dateDebut)));
  if(!orph.length) return [];
  const seen=new Set();
  orph.forEach(r=>{ const k=r.agentAbsentId+'|'+r.date; if(seen.has(k)) return; seen.add(k);
    abs.push({ id:DB.id(), agentId:r.agentAbsentId, dateDebut:r.date, dateFin:r.date, motif:'autre', needsReplacement:true, siteId:r.siteId||'',
      remplacantId:r.remplacantId||'', ignored:false, notes:'Créée automatiquement pour rattacher un remplacement', createdAt:new Date().toISOString() }); });
  sab(abs);
  return orph;
}
/* Au chargement : remplacements existants sans absence → absence créée puis lien lcs_absence réécrit */
function _fixRemplSansAbsence(){
  const orph=_ensureAbsForRempl(gr()); if(!orph.length) return;
  orph.forEach(r=>{ if(_dvSnap.rempl && _dvSnap.rempl[r.id]) _dvSnap.rempl[r.id]=_dvJ({...r, agentAbsentId:''}); });
  DB.set('rempl', gr());
  console.log('Absences créées pour', orph.length, 'remplacement(s) orphelin(s)');
}
const gpt = () => DB.get('pointage');   const spt = v => DB.set('pointage',v);
const gt = () => DB.get('tournees');    const st = v => DB.set('tournees',v);
const gex = () => DB.get('except');     const sex = v => DB.set('except',v);
const gev = () => DB.get('evenements'); const sev = v => DB.set('evenements',v);
const gferm = () => DB.get('fermetures'); const sferm = v => DB.set('fermetures',v);

// Fermeture de site : { id, siteId, dateDebut:'YYYY-MM-DD', dateFin:'YYYY-MM-DD', motif, notes }
// Le site est considéré fermé (entier) sur toute la plage [dateDebut, dateFin] incluse.
function siteFermeLe(siteId, date){
  const ds = (date instanceof Date) ? _isoDate(date) : date;
  return gferm().some(f => f.siteId===siteId && ds >= f.dateDebut && ds <= (f.dateFin||f.dateDebut));
}
function _isoDate(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

// Tournée : { id, nom, agentId (agent attitré), siteIds:[ordre de passage], notes }
/* Nature d'une intervention (affectation ou créneau ponctuel) :
   poste (défaut) · passage = collecte sur le site d'un autre agent, ne couvre pas l'accueil
   · permanence = agent volant qui tient l'accueil un moment, compte dans la couverture. */
const NATURES={poste:'Poste fixe',passage:'Passage',permanence:'Permanence volante'};
function natureOf(x){ return x&&(x.nature==='passage'||x.nature==='permanence')?x.nature:'poste'; }
function _natIcon(n){
  const st='width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round';
  if(n==='passage') return '<span class="shift-nat-ic" title="Passage"><svg viewBox="0 0 24 24" style="'+st+'"><path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0113 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/></svg></span>';
  if(n==='permanence') return '<span class="shift-nat-ic" title="Permanence volante"><svg viewBox="0 0 24 24" style="'+st+'"><path d="M3.5 18h17M5.5 18a6.5 6.5 0 0113 0M12 8.5v3M10 8.5h4"/></svg></span>';
  return '';
}
function _natSegHtml(id,cur){
  return '<div class="seg" id="'+id+'">'+Object.keys(NATURES).map(k=>'<button type="button" class="seg-btn'+(k===cur?' active':'')+'" data-nat="'+k+'" onclick="segPickPlain(this)">'+NATURES[k]+'</button>').join('')+'</div>'
    +'<div class="nat-hint"><strong>Passage</strong> : collecte de prestations sur le site d\'un autre agent, ne compte pas comme accueil. <strong>Permanence volante</strong> : l\'agent tient l\'accueil, le créneau compte dans la couverture du site.</div>';
}
function _natSegVal(id){ return document.querySelector('#'+id+' .seg-btn.active')?.dataset.nat||'poste'; }
function _natSegSet(id,v){ document.querySelectorAll('#'+id+' .seg-btn').forEach(b=>b.classList.toggle('active',b.dataset.nat===v)); }
function _natDefaultFor(agentId){ const ag=ga().find(a=>a.id===agentId); return ag&&agTypes(ag).includes('logistique')&&!agTypes(ag).some(t=>t==='accueil'||t==='concierge')?'passage':'poste'; }
function siteTournee(siteId){ return gt().find(t => (t.siteIds||[]).includes(siteId)); }

/* Migration douce :
   1) l'ancien champ site.groupe (Pauillac, Fiduciaire, Bordeaux Métropole…) décrit en fait
      le CLIENT / lieu → on le recopie dans site.client (badge informatif).
   2) on pré-crée les 3 tournées logistiques réelles (Karima, Michael, Elvira), vides,
      avec l'agent attitré déjà rattaché si on le retrouve. À toi d'y glisser les sites. */
function migrateTournees(){
  let sites=gs(), changed=false;
  sites=sites.map(s=>{ if(s.groupe && !s.client){ changed=true; return {...s, client:s.groupe}; } return s; });
  if(changed) ss(sites);
  if(gt().length) return;
  const agents=ga();
  const noms=['Karima','Michael','Elvira'];
  const tournees=noms.map(n=>{
    const ag=agents.find(a=> a.nom.toLowerCase().includes(n.toLowerCase()) );
    return { id:DB.id(), nom:'Tournée '+n, agentId: ag?ag.id:'', siteIds: ag?agentSiteIds(ag.id):[], notes:'' };
  });
  st(tournees);
}

/* Sites du planning d'un agent, ordonnés par heure de passage (1er créneau le plus tôt). */
function agentSiteIds(agentId){
  const map={};
  gaf().filter(a=>a.agentId===agentId).forEach(a=>{
    const t=a.debut||'99:99';
    if(!(a.siteId in map) || t<map[a.siteId]) map[a.siteId]=t;
  });
  return Object.keys(map).sort((x,y)=>map[x].localeCompare(map[y]));
}

function getWeekKey(date){ return `${date.getFullYear()}-W${String(getWeekNum(date)).padStart(2,'0')}`; }

// Échange de créneau entre deux affectations : matérialisé par deux exceptions ('except'),
// une par agent, plutôt que par un mécanisme séparé de permutation.
function saveSwap(af1Id, af2Id, scope, dateStr){
  const af1=gaf().find(a=>a.id===af1Id), af2=gaf().find(a=>a.id===af2Id);
  if(!af1||!af2) return;
  let dates=[dateStr];
  if(scope==='semaine'){
    const commonJours=af1.jours.filter(j=>af2.jours.includes(j));
    dates=commonJours.map(j=>{ const idx=JOURS.indexOf(j); const d=new Date(weekStart); d.setDate(d.getDate()+idx); return _isoDate(d); });
  }
  let exs=gex();
  dates.forEach(ds=>{
    exs=exs.filter(e=>!(e.dateStr===ds && ((e.agentId===af1.agentId&&e.affecId===af1.id)||(e.agentId===af2.agentId&&e.affecId===af2.id))));
    exs.push({id:DB.id(),agentId:af1.agentId,affecId:af1.id,dateStr:ds,type:'mod',siteId:af2.siteId,debut:af2.debut,fin:af2.fin,notes:'Échange avec '+agentNom(af2.agentId)});
    exs.push({id:DB.id(),agentId:af2.agentId,affecId:af2.id,dateStr:ds,type:'mod',siteId:af1.siteId,debut:af1.debut,fin:af1.fin,notes:'Échange avec '+agentNom(af1.agentId)});
  });
  sex(exs);
  toast(scope==='jour' ? 'Échange enregistré pour ce jour' : 'Échange enregistré pour la semaine');
  closePanel();
  renderPlanning();
}
function segPick(btn){
  const seg=btn.parentElement;
  seg.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const hint=document.getElementById('perm-scope-hint');
  if(hint) hint.textContent = btn.dataset.scope==='jour' ? hint.dataset.day : hint.dataset.week;
}

