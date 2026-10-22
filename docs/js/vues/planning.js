// Vue planning principale, filtres périmètre, légende
/* ═══════════════════════════════════════
   PLANNING (vue principale)
═══════════════════════════════════════ */
function toggleNav(){ const open=!document.body.classList.contains('nav-open'); document.body.classList.toggle('nav-open',open); try{localStorage.setItem('gope_nav_open',open?'1':'0');}catch(e){} }
(function initNav(){ let open=true; try{const v=localStorage.getItem('gope_nav_open'); if(v!==null) open=(v==='1');}catch(e){} const apply=()=>document.body&&document.body.classList.toggle('nav-open',open); if(document.body) apply(); else document.addEventListener('DOMContentLoaded',apply); })();

/* Tri d'affichage de la liste des agents (semaine + mois) : par agent (alpha) ou par site (alpha du site, puis alpha agent) */
let agentSortMode=(function(){ try{ return localStorage.getItem('gope_agent_sort')||'agent'; }catch(e){ return 'agent'; } })();
function setAgentSortMode(m){
  if(agentSortMode===m) return;
  agentSortMode=m;
  try{ localStorage.setItem('gope_agent_sort', m); }catch(e){}
  updateSortToggleUI();
  refreshCurrentView();
}
function updateSortToggleUI(){
  document.querySelectorAll('.sort-seg-btn, .sort-seg-btn-mini').forEach(b=>b.classList.toggle('on', b.dataset.mode===agentSortMode));
}
function _agentIsTournee(agentId){ return gt().some(t=>t.agentId===agentId); }
function _agentPrimarySiteName(agentId){
  const ids=agentSiteIds(agentId);
  if(!ids.length) return null;
  return ids.map(siteNom).sort((x,y)=>x.localeCompare(y))[0];
}
function sortAgentsForDisplay(agents){
  const list=agents.slice();
  if(agentSortMode==='site'){
    list.sort((a,b)=>{
      const ta=_agentIsTournee(a.id)?1:0, tb=_agentIsTournee(b.id)?1:0;
      if(ta!==tb) return ta-tb;
      if(ta&&tb) return a.nom.localeCompare(b.nom);
      const sa=_agentPrimarySiteName(a.id), sb=_agentPrimarySiteName(b.id);
      if(!!sa!==!!sb) return sa?-1:1;
      if(sa&&sb&&sa!==sb) return sa.localeCompare(sb);
      return a.nom.localeCompare(b.nom);
    });
  } else {
    list.sort((a,b)=>a.nom.localeCompare(b.nom));
  }
  return list;
}

let tourneeFilter=[];
/* Période réellement affichée — le filtre de portée ne doit remonter que les remplacements
   et créneaux ponctuels de cette période (sinon un remplaçant d'une autre semaine reste listé). */
function _scopeDateRange(){
  try{
    if(currentView==='mois'){
      const a=new Date(moisDate.getFullYear(),moisDate.getMonth(),1);
      const b=new Date(moisDate.getFullYear(),moisDate.getMonth()+1,0);
      return [_isoDate(a),_isoDate(b)];
    }
  }catch(e){}
  const a=new Date(weekStart), b=new Date(weekStart); b.setDate(b.getDate()+6);
  return [_isoDate(a),_isoDate(b)];
}
function applyScopeFilter(agents){
  const anyFilter = tourneeFilter.length||siteFilter.length||agentFilter.length;
  if(!anyFilter) return agents;
  const siteSet=new Set(siteFilter);
  tourneeFilter.forEach(tid=>{ const t=gt().find(x=>x.id===tid); (t&&t.siteIds||[]).forEach(id=>siteSet.add(id)); });
  const fromSites=new Set(gaf().filter(a=>siteSet.has(a.siteId)).map(a=>a.agentId));
  const [rStart,rEnd]=_scopeDateRange();
  const inRange=ds=>!!ds && ds>=rStart && ds<=rEnd;
  // + remplaçants qui couvrent un créneau sur l'un des sites filtrés — uniquement sur la période affichée
  gab().forEach(ab=>{
    if(ab.ignored) return;
    _absenceShifts(ab).forEach(s=>{
      if(!siteSet.has(s.siteId)) return;
      if(!inRange(_isoDate(s.date))) return;
      const rid=_replFor(ab,_blockKey(s.afId,s.date));
      if(rid) fromSites.add(rid);
    });
  });
  // + créneaux ponctuels (exceptions ajout/modif) posés sur un site filtré, sur la période affichée
  (typeof gex==='function'?gex():[]).forEach(e=>{
    if(e.type==='del') return;
    if(!inRange(String(e.date||'').slice(0,10))) return;
    if(e.siteId && siteSet.has(e.siteId)) fromSites.add(e.agentId);
  });
  const keep=new Set(agentFilter);
  return agents.filter(a=>keep.has(a.id)||fromSites.has(a.id));
}
function refreshCurrentView(){ if(currentView==='mois') renderMois(); else renderPlanning(); }

function updateNavAlertes(){
  try{
    const set=(id,on,t)=>{ const e=document.getElementById('nav-alert-'+id); if(e){ e.classList.toggle('on',!!on); e.title=on?t:''; } };
    const nSites=covGapsRecurrents().length;
    set('sites',nSites>0,nSites+' créneau'+(nSites>1?'x':'')+' d\'ouverture non couvert'+(nSites>1?'s':''));
    const nCli=(_dvCli.clients||[]).filter(c=>_cliAlertes(c).length).length;
    set('clients',nCli>0,nCli+' client'+(nCli>1?'s':'')+' à traiter');
  }catch(e){}
}
function updateAlertBand(){
  setTimeout(updateNavAlertes,0);
  const urgent=gab().filter(_absenceUrgent);
  ['', '-mois'].forEach(suf=>{
    const band=document.getElementById('alert-band'+suf);
    if(!band) return;
    if(urgent.length>0){
      band.classList.add('visible');
      document.getElementById('alert-band'+suf+'-text').textContent=
        urgent.length===1?'1 agent absent sans remplaçant':`${urgent.length} agents absents sans remplaçant`;
      document.getElementById('alert-band'+suf+'-count').textContent=urgent.length;
    } else {
      band.classList.remove('visible');
    }
  });
  // Créneaux d'ouverture non couverts — aléas du jour (prioritaires) + trous récurrents
  const cov=covGapsWeek();
  const rec=covGapsRecurrents();
  const nTot=cov.length+rec.length;
  const nCtr=cov.filter(g=>g.contrat).length;
  const covTxt = (nCtr?`${nCtr} créneau${nCtr>1?'x':''} sans successeur (fin de contrat < 1 mois)${cov.length>nCtr||rec.length?' · ':''}`:'') + (cov.length===nCtr && !rec.length ? '' : cov.length && rec.length
    ? `${cov.length} créneau${cov.length>1?'x':''} découvert${cov.length>1?'s':''} cette semaine · ${rec.length} trou${rec.length>1?'s':''} récurrent${rec.length>1?'s':''}`
    : cov.length
      ? (cov.length===1?"1 créneau d'ouverture non couvert cette semaine":`${cov.length} créneaux d'ouverture non couverts cette semaine`)
      : (rec.length===1?"1 créneau d'ouverture jamais couvert par le planning":`${rec.length} créneaux d'ouverture jamais couverts par le planning`));
  [['cov-band',''],['cov-band-mois','-mois']].forEach(([id,suf])=>{
    const band=document.getElementById(id);
    if(!band) return;
    if(nTot>0){
      band.classList.add('visible');
      document.getElementById(id+'-text').textContent=covTxt;
      document.getElementById(id+'-count').textContent=nTot;
    } else {
      band.classList.remove('visible');
    }
  });
}

function renderPlanning(){
  updateWeekHeader();
  buildTourneeFilters();

  const isA=isWeekA(weekStart);
  const today=new Date(); today.setHours(0,0,0,0);

  // 5 jours Lun→Ven
  const days=[];
  for(let i=0;i<5;i++){
    const d=new Date(weekStart); d.setDate(d.getDate()+i);
    days.push({date:d, label:JOURS[i], full:JOURS_FULL[i]});
  }

  // Header
  const hdr=document.getElementById('planning-header');
  hdr.innerHTML=`<div class="ph-agent-col legend-anchor" style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:6px">
    <div style="display:flex;align-items:center;gap:6px;min-width:0">
      <span class="sort-seg-mini-label">Organisé par</span>
      <div class="sort-seg-mini" title="Trier la liste des agents">
        <button class="sort-seg-btn-mini" data-mode="agent" onclick="setAgentSortMode('agent')" title="Par agent (alpha)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg></button>
        <button class="sort-seg-btn-mini" data-mode="site" onclick="setAgentSortMode('site')" title="Par site"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg></button>
      </div>
    </div>
    <button class="legend-btn" id="legend-btn" onclick="toggleLegend(event)" title="Code couleur">?</button>
    <div class="legend-popover" id="legend-popover">
      <div class="legend-popover-title">Code couleur</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#DDEFE4"></span>En poste</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#fff;border:1px dashed #3E9A69"></span>Passage (collecte)</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#D3EDEA"></span>Permanence volante (accueil)</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#DCEBF7"></span>Remplacement</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#FFF1AE"></span>Absent — remplacé par…</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#F8DCD7"></span>Absence</div>
      <div class="legend-row"><span class="legend-swatch" style="background:repeating-linear-gradient(135deg,#ECECEA,#ECECEA 4px,#E3E3E1 4px,#E3E3E1 8px)"></span>Site fermé</div>
      <div class="legend-row"><span class="legend-swatch" style="background:var(--purple);color:#fff;display:inline-flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></span>Semaine impaire</div>
      <div class="legend-row"><span class="legend-swatch" style="background:var(--yellow);color:#fff;display:inline-flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></span>Semaine paire</div>
      <div class="legend-row"><span class="legend-swatch" style="background:var(--orange);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">!</span>Créneau ponctuel / ajusté</div>
      <div class="legend-row"><span class="legend-swatch" style="border:2px solid var(--red);background:transparent"></span>Conflit horaire</div>
    </div>
  </div>`+
    days.map(d=>{
      const isToday=d.date.getTime()===today.getTime();
      return `<div class="ph-day${isToday?' today':''}">
        ${d.full.slice(0,3).toUpperCase()}
        <span class="ph-day-num">${d.date.getDate()}</span>
      </div>`;
    }).join('');

  // Filtre unifié : union des tournées + sites + agents sélectionnés (chaque agent montre son planning complet)
  let affecs=gaf();
  let agents=sortAgentsForDisplay(applyScopeFilter(ga().filter(a=>!a.inactif)));
  updateSortToggleUI();

  // Absences semaine
  const we=new Date(weekStart); we.setDate(we.getDate()+6);
  const absences=gab().filter(ab=>{
    const s=new Date(ab.dateDebut+'T00:00:00');
    const e=ab.dateFin?new Date(ab.dateFin+'T23:59:59'):new Date(ab.dateDebut+'T23:59:59');
    return s<=we && e>=weekStart;
  });

  // Alerte band
  updateAlertBand();

  // Rows
  const rows=document.getElementById('planning-rows');
  if(agents.length===0){
    rows.innerHTML=`<div class="empty" style="padding:60px 20px"><div class="empty-icon"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg></div><div class="empty-text">Aucune affectation trouvée</div><div class="empty-sub">Ajoutez des agents et créez des affectations</div></div>`;
    return;
  }

  rows.innerHTML=agents.map(agent=>{
    const agentAffecs=affecs.filter(af=>af.agentId===agent.id);

    let wkMin=0;
    const weekKey=getWeekKey(weekStart);
    const cells=days.map(day=>{
      const dateStr=_ymd(day.date);
      const dayAffecs=agentAffecs.filter(af=>{
        if(!af.jours.includes(day.label)) return false;
        if(!_affInRange(af,day.date)) return false;
        if(af.semaine==='A'&&!isA) return false;
        if(af.semaine==='B'&&isA) return false;
        return true;
      });

      // Créneaux effectifs = récurrents + exceptions ponctuelles (mod/del/add) pour cette date
      let shifts=effectiveShifts(agent.id, dateStr, dayAffecs);
      // + créneaux couverts par cet agent comme remplaçant ce jour
      const replShifts=agentReplacementShifts(agent.id, day.date);
      if(replShifts.length) shifts=shifts.concat(replShifts).sort((a,b)=>_mins(a.debut)-_mins(b.debut));

      const evList=gev().filter(e=>e.agentId===agent.id&&e.date===dateStr).sort((a,b)=>(a.debut||'').localeCompare(b.debut||''));
      const evT=evList.filter(e=>e.debut&&e.fin&&_mins(e.fin)>_mins(e.debut));
      evT.forEach(e=>{ wkMin+=_shiftMin(e); });
      const evConf=new Set();
      for(let i=0;i<evT.length;i++)for(let j=i+1;j<evT.length;j++) if(_mins(evT[i].debut)<_mins(evT[j].fin)&&_mins(evT[j].debut)<_mins(evT[i].fin)){ evConf.add(evT[i].id); evConf.add(evT[j].id); }
      const mkEv=(cf)=>evList.map(e=>{
        const nm=e.titre.length>15?e.titre.slice(0,15)+'…':e.titre;
        const c=cf.has(e.id);
        return `<div class="shift-bar" style="background:var(--purple-light);color:var(--purple)${c?';box-shadow:inset 0 0 0 1.5px var(--red)':''}" title="${c?'Chevauchement horaire ce jour — ':''}${_escA(e.titre+(e.lieu?' — '+e.lieu:'')+(e.notes?' — '+e.notes:''))}" onclick="openPanel('panel-evenement','${_escA(e.id)}')">
          <span class="shift-site">${_escH(nm)}</span>
          <span class="shift-time">${c?'⚠ ':''}${e.debut?e.debut+(e.fin?'–'+e.fin:''):'Journée'}</span>
        </div>`; }).join('');
      const evBars=mkEv(evConf);
      if(shifts.length===0) return evBars ? `<div class="day-cell">${evBars}<div class="day-add" title="Ajouter un créneau ce jour" onclick="openPanel('panel-jour','${agent.id}|${dateStr}||')">+</div></div>` : `<div class="day-cell"><div class="day-empty" title="Ajouter un créneau ce jour" onclick="openPanel('panel-jour','${agent.id}|${dateStr}||')">+</div></div>`;

      shifts.forEach(s=>{ if(!siteFermeLe(s.siteId, day.date)) wkMin+=_shiftMin(s); });
      const conflictIds=new Set();
      const _openSh = sh => !siteFermeLe(sh.siteId, day.date);
      for(let i=0;i<shifts.length;i++)for(let j=i+1;j<shifts.length;j++){
        if(!_openSh(shifts[i])||!_openSh(shifts[j])) continue; // un créneau sur site fermé ne crée pas de conflit
        if(_mins(shifts[i].debut)<_mins(shifts[j].fin) && _mins(shifts[j].debut)<_mins(shifts[i].fin)){ conflictIds.add(shifts[i].id); conflictIds.add(shifts[j].id); }
      }

      const evCf=new Set(evConf);
      evT.forEach(e=>shifts.forEach(s=>{ if(_openSh(s)&&_mins(e.debut)<_mins(s.fin)&&_mins(s.debut)<_mins(e.fin)){ conflictIds.add(s.id); evCf.add(e.id); } }));
      const evBars2=mkEv(evCf);

      // Absence ce jour ?
      const dayAbs=absences.find(ab=>{
        if(ab.agentId!==agent.id) return false;
        const d=day.date;
        const s=new Date(ab.dateDebut+'T00:00:00');
        const e=ab.dateFin?new Date(ab.dateFin+'T23:59:59'):new Date(ab.dateDebut+'T23:59:59');
        return d>=s&&d<=e;
      });

      const bars=shifts.map(s=>{
        const nom=siteNom(s.siteId);
        const short=nom.length>15?nom.slice(0,15)+'…':nom;
        const isExc=!!s.ex;

        if(siteFermeLe(s.siteId, day.date)){
          return `<div class="shift-bar shift-bar-ferme" title="Site fermé — ${_escA(nom)}" onclick="openPanel('panel-site','${s.siteId}')">
            <span class="shift-site">${_escH(short)}</span>
            <span class="shift-time"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> Fermé</span>
          </div>`;
        }

        if(s.rempl){
          const conf=conflictIds.has(s.id);
          const swapSvg="<svg viewBox=\"0 0 24 24\" style=\"width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round\"><path d=\"M7 7h12l-3.2-3.2M17 17H5l3.2 3.2\"/></svg>";
          const warnSvg="<svg viewBox=\"0 0 24 24\" style=\"width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:var(--red);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round\"><path d=\"M12 3.6l9 15.4H3z\"/></svg>";
          const attrs = conf
            ? ' style="box-shadow:inset 0 0 0 1.5px var(--red)" title="Chevauchement — ce remplacement double un créneau existant ce jour"'
            : ' title="Remplacement de '+_escA(agentNom(s.forAgent))+'"';
          return `<div class="shift-bar shift-bar-remplace"${attrs} onclick="openRemplacePanelForShift('${s.forAgent}','${dateStr}')">
            <span class="shift-site">${_escH(short)}</span>
            <span class="shift-time">${conf?warnSvg:swapSvg} ${_escH(agentNom(s.forAgent).split(' ')[0])} · ${s.debut}–${s.fin}${conf?' ⚠':''}</span>
          </div>`;
        }


        if(dayAbs){
          const afRef=s.afId||s.id;
          const blkRepl=_replFor(dayAbs, _blockKey(afRef, day.date));
          if(blkRepl){
            return `<div class="shift-bar shift-bar-remplace" style="background:#FBE38C;color:#5A4A10" title="${_escA(nom)}" onclick="openPanel('panel-creneau','${afRef}|${agent.id}|${dateStr}|${dayAbs.id}')">
              <span class="shift-site">${_escH(short)}</span>
              <span class="shift-time"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M7 7h12l-3.2-3.2M17 17H5l3.2 3.2"/></svg> ${agentNom(blkRepl).split(' ')[0]} · ${s.debut}–${s.fin}</span>
            </div>`;
          }
          const absNeeds=dayAbs.needsReplacement;
          const absStyle=absNeeds?'':' style="background:#ECECEA;color:#6B6D68"';
          const absIcon=absNeeds
            ? '<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M12 3.6l9 15.4H3z"/><path d="M12 9.6v4.6M12 17.2v.4"/></svg>'
            : '<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/></svg>';
          return `<div class="shift-bar shift-bar-absent" data-absence-id="${dayAbs.id}"${absStyle} title="${_escA(nom)}" onclick="openPanel('panel-creneau','${afRef}|${agent.id}|${dateStr}|${dayAbs.id}')">
            <span class="shift-site">${_escH(short)}</span>
            <span class="shift-time">${absIcon} Absent</span>
          </div>`;
        }

        const conf=conflictIds.has(s.id);
        const nat=natureOf(s), natCls=nat==='passage'?' shift-nat-passage':nat==='permanence'?' shift-nat-perm':'', natIc=_natIcon(nat), natLbl=nat!=='poste'?NATURES[nat]+' — ':'';
        const abBadge = (!isExc && s.semaine!=='toutes') ? `<span class="shift-ab ab-${s.semaine}" title="Semaine ${semParityLabel(s.semaine).toLowerCase()} · binôme d'échange"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></span>` : '';
        const excBadge = isExc ? `<span class="shift-ab" style="background:var(--orange);color:#fff" title="${s.isAdd?'Créneau ponctuel':'Ajusté ce jour'}">!</span>` : '';
        const click = s.isAdd
          ? `openPanel('panel-jour','${agent.id}|${dateStr}||${s.ex.id}')`
          : (isExc ? `openPanel('panel-jour','${agent.id}|${dateStr}|${s.afId}|')`
                   : `openPanel('panel-creneau','${s.afId}|${agent.id}|${dateStr}|')`);
        const confIc = conf?'<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:var(--red);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round"><path d="M12 3.6l9 15.4H3z"/></svg>':'';
        return `<div class="shift-bar shift-bar-present${natCls}${isExc?' shift-except':''}"${conf?' style="box-shadow:inset 0 0 0 1.5px var(--red)" title="Chevauchement horaire ce jour"':` title="${natLbl}${_escA(nom)}"`} onclick="${click}">
          <span class="shift-site">${_escH(short)}</span>
          <span class="shift-time">${confIc}${natIc}${s.debut}–${s.fin}${abBadge}${excBadge}</span>
        </div>`;
      }).join('');

      const addBtn = dayAbs ? '' : `<div class="day-add" title="Ajouter un autre créneau ce jour" onclick="openPanel('panel-jour','${agent.id}|${dateStr}||')">+</div>`;
      return `<div class="day-cell">${evBars2}${bars}${addBtn}</div>`;
    }).join('');

    return `<div class="agent-row" data-agent-name="${_escA(agent.nom)}">
      <div class="agent-label" onclick="openPanel('panel-agent-detail','${agent.id}')">
        <div class="agent-name">${_escH(agent.nom)}</div>
        ${agent.remplacant?'<div class="agent-sub"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M7 7h12l-3.2-3.2M17 17H5l3.2 3.2"/></svg> Remplaçant</div>':''}
        ${_wkLabel(agent,wkMin)}
      </div>
      ${cells}
    </div>`;
  }).join('');

  filterPlanRows(planSearch, true);
  updateAbsenceBadge();
}

/* Total semaine + alerte dépassement du volume contractuel (absences maladie comptées) */
function _wkLabel(agent,wkMin){
  const cMin=agent.contratHebdo?Math.round(agent.contratHebdo*60):0;
  if(!wkMin&&!cMin) return '';
  if(!cMin) return `<div class="agent-sub" style="color:var(--text3)">${_fmtDur(wkMin)} / sem.</div>`;
  const over=wkMin>cMin;
  if(!over) return `<div class="agent-sub" style="color:var(--text3)" title="Volume contrat : ${_fmtDur(cMin)} / sem.">${_fmtDur(wkMin)} / ${_fmtDur(cMin)}</div>`;
  return `<div class="agent-sub" style="color:var(--red);font-weight:700" title="Dépasse le contrat de ${_fmtDur(wkMin-cMin)}"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round"><path d="M12 3.6l9 15.4H3z"/><path d="M12 9.6v4.6M12 17.2v.4"/></svg> ${_fmtDur(wkMin)} / ${_fmtDur(cMin)} (+${_fmtDur(wkMin-cMin)})</div>`;
}
let planSearch='';
function filterPlanRows(v, keepFocus){
  planSearch = v||'';
  const q = planSearch.trim().toLowerCase();
  const clear=document.getElementById('plan-search-clear');
  if(clear) clear.style.display = q?'block':'none';
  const rowsEl=document.getElementById('planning-rows');
  if(!rowsEl) return;
  let shown=0;
  rowsEl.querySelectorAll('.agent-row').forEach(r=>{
    const match = !q || (r.dataset.agentName||'').toLowerCase().includes(q);
    r.style.display = match?'':'none';
    if(match) shown++;
  });
  let empty=document.getElementById('plan-search-empty');
  if(q && shown===0){
    if(!empty){ empty=document.createElement('div'); empty.id='plan-search-empty'; empty.className='empty'; empty.style.padding='48px 20px'; rowsEl.appendChild(empty); }
    empty.innerHTML=`<div class="empty-text">Aucun agent « ${_escH(planSearch)} »</div>`;
    empty.style.display='';
  } else if(empty){ empty.style.display='none'; }
}
function clearPlanSearch(){
  planSearch='';
  const inp=document.getElementById('plan-search'); if(inp){ inp.value=''; inp.focus(); }
  filterPlanRows('');
}

function buildTourneeFilters(){
  updateScopeLabel();
  const menu=document.getElementById('scope-menu');
  if(menu && menu.classList.contains('open')){
    renderScopeMenu(document.getElementById('scope-search-input').value);
  }
}

function _scopeSel(){
  const out=[];
  tourneeFilter.forEach(id=>{ const t=gt().find(x=>x.id===id); if(t) out.push({type:'tournee',id,nom:t.nom}); });
  siteFilter.forEach(id=>{ const s=gs().find(x=>x.id===id); if(s) out.push({type:'site',id,nom:s.nom}); });
  agentFilter.forEach(id=>out.push({type:'agent',id,nom:agentNom(id)}));
  return out;
}
function updateScopeLabel(){
  const btn=document.getElementById('scope-btn');
  const chips=document.getElementById('scope-chips');
  const inp=document.getElementById('scope-search-input');
  if(!btn||!chips) return;
  const sel=_scopeSel();
  chips.innerHTML=sel.map(s=>`<span class="scope-chip t-${s.type}" title="${_escA(s.nom)}"><span class="txt">${_escH(s.nom)}</span><button class="x" title="Retirer" onclick="event.stopPropagation();selectScope('${s.type}','${_escA(s.id)}')"><svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>`).join('');
  if(inp) inp.placeholder = sel.length ? 'Ajouter…' : 'Tout le planning — filtrer tournée, site, agent…';
  btn.classList.toggle('filtered', sel.length>0);
  const clr=document.getElementById('scope-clear'); if(clr) clr.style.display=sel.length?'inline-flex':'none';
}

function _ic(path,extra){ return `<svg class="scope-ic" viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round${extra||''}">${path}</svg>`; }
const _CHECK=`<svg class="check" viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
function _escA(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function _escH(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderScopeMenu(q=''){
  q=(q||'').toLowerCase().trim();
  const sites=gs();
  const tournees=gt().slice().sort((a,b)=>a.nom.localeCompare(b.nom));
  const inTournee=new Set(); tournees.forEach(t=>(t.siteIds||[]).forEach(id=>inTournee.add(id)));
  const ungrouped=sites.filter(s=>!inTournee.has(s.id)).sort((a,b)=>a.nom.localeCompare(b.nom));
  const allActive=!tourneeFilter.length&&!siteFilter.length&&!agentFilter.length;
  const nSites=gs().length, nAgents=ga().filter(a=>!a.inactif).length;
  let html='';

  if(!q){
    html+=`<div class="scope-tabs">
      <button class="scope-tab${scopeTab==='tout'?' on':''}" data-scopetab="tout">Tout</button>
      <button class="scope-tab${scopeTab==='sites'?' on':''}" data-scopetab="sites">Sites</button>
      <button class="scope-tab${scopeTab==='agents'?' on':''}" data-scopetab="agents">Agents</button>
      <button class="scope-tab${scopeTab==='tournees'?' on':''}" data-scopetab="tournees">Tournées</button>
    </div>`;
  }

  const showSites = q || scopeTab==='tout' || scopeTab==='sites';
  const showAgents = q || scopeTab==='tout' || scopeTab==='agents';
  const showTournees = q || scopeTab==='tout' || scopeTab==='tournees';

  if(showSites){
    const allSites=sites.slice().sort((a,b)=>a.nom.localeCompare(b.nom)).filter(s=>!q||s.nom.toLowerCase().includes(q));
    if(allSites.length){
      html+=`<div class="scope-grouplabel">Sites</div>`;
      allSites.forEach(s=>{
        const sActive=siteFilter.includes(s.id);
        html+=`<button class="scope-opt scope-site${sActive?' active':''}" data-stype="site" data-sval="${s.id}"><span class="scope-dot"></span><span class="lbl">${_escH(s.nom)}</span>${_CHECK}</button>`;
      });
    }
  }

  const userIc=_ic('<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>');
  const agentsAll=ga().filter(a=>!a.inactif).slice().sort((a,b)=>a.nom.localeCompare(b.nom));
  const agShown=agentsAll.filter(a=>!q||a.nom.toLowerCase().includes(q));
  if(showAgents && agShown.length){
    html+=`<div class="scope-grouplabel">Agents</div>`;
    agShown.forEach(a=>{
      const aActive=agentFilter.includes(a.id);
      html+=`<button class="scope-opt scope-site${aActive?' active':''}" data-stype="agent" data-sval="${a.id}">${userIc}<span class="lbl">${_escH(a.nom)}</span>${_CHECK}</button>`;
    });
  }

  const routeIc=_ic('<circle cx="6" cy="6.5" r="2.4"/><circle cx="18" cy="17.5" r="2.4"/><path d="M8.4 6.5H15a3 3 0 010 6H9a3 3 0 000 6h6.6"/>');
  if(showTournees){
    const shownTournees=tournees.filter(t=>{
      const tMatch=t.nom.toLowerCase().includes(q);
      const hasSite=(t.siteIds||[]).some(id=>{const s=sites.find(x=>x.id===id);return s&&s.nom.toLowerCase().includes(q);});
      return !q||tMatch||hasSite;
    });
    if(shownTournees.length) html+=`<div class="scope-grouplabel">Tournées</div>`;
    shownTournees.forEach(t=>{
      const tsites=(t.siteIds||[]).map(id=>sites.find(s=>s.id===id)).filter(Boolean);
      const tMatch=t.nom.toLowerCase().includes(q);
      const shownSites=tsites.filter(s=>!q||tMatch||s.nom.toLowerCase().includes(q));
      const tActive=tourneeFilter.includes(t.id);
      const expanded = q || scopeExpanded.has(t.id);
      const chev=`<span class="scope-exp" data-exp="${_escA(t.id)}" title="Déplier / replier"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;transition:transform .15s;transform:rotate(${expanded?90:0}deg)"><path d="M9 6l6 6-6 6"/></svg></span>`;
      html+=`<button class="scope-opt scope-group-opt${tActive?' active':''}" data-stype="tournee" data-sval="${_escA(t.id)}">`+
        chev+routeIc+`<span class="lbl">${_escH(t.nom)}</span><span class="scope-count">${tsites.length}</span>${_CHECK}</button>`;
      if(expanded) shownSites.forEach(s=>{
        const sActive=siteFilter.includes(s.id);
        html+=`<button class="scope-opt scope-site${sActive?' active':''}" data-stype="site" data-sval="${s.id}"><span class="scope-dot"></span><span class="lbl">${_escH(s.nom)}</span>${_CHECK}</button>`;
      });
    });
  }

  const list=document.getElementById('scope-list');
  list.innerHTML=html||`<div class="scope-empty">Aucun résultat</div>`;
}
function selectScope(type,val){
  if(type==='tournee'){
    const i=tourneeFilter.indexOf(val);
    if(i>=0) tourneeFilter.splice(i,1); else tourneeFilter.push(val);
    renderScopeMenu(document.getElementById('scope-search-input')?.value||'');
  }
  else if(type==='site'){
    const i=siteFilter.indexOf(val);
    if(i>=0) siteFilter.splice(i,1); else siteFilter.push(val);
    renderScopeMenu(document.getElementById('scope-search-input')?.value||'');
  }
  else if(type==='agent'){
    const i=agentFilter.indexOf(val);
    if(i>=0) agentFilter.splice(i,1); else agentFilter.push(val);
    renderScopeMenu(document.getElementById('scope-search-input')?.value||'');
  }
  else { tourneeFilter=[]; siteFilter=[]; agentFilter=[]; closeScopeMenu(); }
  updateScopeLabel();
  refreshCurrentView();
}

function openScopeMenu(){
  const menu=document.getElementById('scope-menu'), btn=document.getElementById('scope-btn');
  if(!menu||menu.classList.contains('open')){ return; }
  menu.classList.add('open'); btn.classList.add('open');
  renderScopeMenu(document.getElementById('scope-search-input')?.value||'');
}
function scopeFieldClick(e){
  e.stopPropagation();
  const inp=document.getElementById('scope-search-input');
  if(inp) inp.focus();
  openScopeMenu();
}
function toggleScopeMenu(e){
  if(e) e.stopPropagation();
  const menu=document.getElementById('scope-menu');
  if(menu.classList.contains('open')) closeScopeMenu(); else openScopeMenu();
}
function onScopeInput(v){ openScopeMenu(); renderScopeMenu(v); }
function _scopeOpts(){ return [...document.querySelectorAll('#scope-list .scope-opt[data-stype]')]; }
function onScopeKey(e){
  const inp=e.target;
  if(e.key==='Escape'){ closeScopeMenu(); inp.blur(); return; }
  if(e.key==='Backspace' && !inp.value){
    const sel=_scopeSel();
    if(sel.length){ const last=sel[sel.length-1]; selectScope(last.type,last.id); }
    return;
  }
  const opts=_scopeOpts();
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault(); openScopeMenu();
    if(!opts.length) return;
    let i=opts.findIndex(o=>o.classList.contains('kb'));
    i = e.key==='ArrowDown' ? (i+1)%opts.length : (i<=0?opts.length-1:i-1);
    opts.forEach(o=>o.classList.remove('kb'));
    opts[i].classList.add('kb');
    opts[i].scrollIntoViewIfNeeded ? opts[i].scrollIntoViewIfNeeded() : null;
    return;
  }
  if(e.key==='Enter'){
    e.preventDefault();
    const target=opts.find(o=>o.classList.contains('kb'))||opts[0];
    if(target){ selectScope(target.dataset.stype, target.dataset.sval); inp.value=''; renderScopeMenu(''); }
  }
}
function closeScopeMenu(){
  document.getElementById('scope-menu').classList.remove('open');
  document.getElementById('scope-btn').classList.remove('open');
}
function clearScopeFilter(e){
  if(e) e.stopPropagation();
  tourneeFilter=[]; siteFilter=[]; agentFilter=[];
  closeScopeMenu(); refreshCurrentView();
}

let siteFilter=[];
let agentFilter=[];
let scopeTab='tout';
let scopeExpanded=new Set();
function setTournee(t){ tourneeFilter = t?[t]:[]; siteFilter=[]; agentFilter=[]; closeScopeMenu(); refreshCurrentView(); }
function setSiteFilter(v){ tourneeFilter=[]; agentFilter=[]; siteFilter = v?[v]:[]; closeScopeMenu(); refreshCurrentView(); }

function toggleLegend(e, btnId='legend-btn', popId='legend-popover'){
  e.stopPropagation();
  const pop=document.getElementById(popId), btn=document.getElementById(btnId);
  const willOpen=!pop.classList.contains('open');
  closeLegend();
  pop.classList.toggle('open',willOpen); btn.classList.toggle('open',willOpen);
}
function closeLegend(){
  document.querySelectorAll('.legend-popover.open').forEach(p=>p.classList.remove('open'));
  document.querySelectorAll('.legend-btn.open').forEach(b=>b.classList.remove('open'));
}
document.addEventListener('click', e=>{ if(!e.target.closest('.legend-anchor')) closeLegend(); });
// Semaines : numérotées sur le planning du mois → paires/impaires (plus cohérent que A/B)
function semParityLabel(code){ return code==='A'?'Impaire':code==='B'?'Paire':'Toutes'; }
function semParityShort(code){ return code==='A'?'I':(code==='B'?'P':''); }

function updateAbsenceBadge(){
  const n=gab().filter(_absenceUrgent).length;
  const badge=document.getElementById('absence-count-badge');
  if(!badge) return;
  badge.textContent=n;
  badge.style.display=n>0?'inline-block':'none';
}

