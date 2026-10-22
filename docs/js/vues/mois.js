// Vue planning du mois
/* ═══════════════════════════════════════
   VUE PLANNING DU MOIS
═══════════════════════════════════════ */
let moisDate=(function(){ const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
function changeMois(n){ moisDate=new Date(moisDate.getFullYear(), moisDate.getMonth()+n, 1); renderMois(); }
function goMoisToday(){ const d=new Date(); moisDate=new Date(d.getFullYear(), d.getMonth(), 1); renderMois(); }
function jourFromMois(ds){ jourDate=new Date(ds+'T00:00:00'); jourDate.setHours(0,0,0,0); showView('jour'); }

// ── Filtre par recherche (tous les agents affichés par défaut)
let moisSearch='';
function filterMoisSearch(v){ moisSearch=v||''; renderMois(); const inp=document.getElementById('mois-search'); if(inp){ inp.focus(); const n=inp.value.length; try{inp.setSelectionRange(n,n);}catch(e){} } }
function clearMoisSearch(){ moisSearch=''; const inp=document.getElementById('mois-search'); if(inp) inp.value=''; renderMois(); }

/* ── Sélection de créneaux sur la grille → déclaration d'absence ── */
let moisSelMode=false, moisSelAgent=null, moisSelStart=null, moisSelEnd=null;
function toggleMoisSel(){ moisSelMode=!moisSelMode; if(!moisSelMode){ moisSelAgent=null; moisSelStart=null; moisSelEnd=null; } renderMois(); }
function moisClearSel(){ moisSelAgent=null; moisSelStart=null; moisSelEnd=null; renderMois(); }
function _initials(name){ const p=(name||'').trim().split(/\s+/).filter(Boolean); if(p.length>=2) return (p[p.length-1][0]+p[0][0]).toUpperCase(); return (p[0]||'?').slice(0,2).toUpperCase(); }

/* ── Ordre manuel des agents (glisser-déposer) + reset alphabétique ── */
function _moisOrder(){ try{ return JSON.parse(localStorage.getItem('gope_mois_order')||'[]'); }catch(e){ return []; } }
function _setMoisOrder(ids){ localStorage.setItem('gope_mois_order', JSON.stringify(ids)); }
function moisResetOrder(){ localStorage.removeItem('gope_mois_order'); renderMois(); toast('Ordre alphabétique rétabli'); }
function _moisAgentsOrdered(){
  const order=_moisOrder(), all=ga().filter(a=>!a.inactif).slice();
  if(!order.length) return all.sort((a,b)=>a.nom.localeCompare(b.nom));
  const pos=new Map(order.map((id,i)=>[id,i]));
  return all.sort((a,b)=>{ const pa=pos.has(a.id)?pos.get(a.id):Infinity, pb=pos.has(b.id)?pos.get(b.id):Infinity; return pa!==pb ? pa-pb : a.nom.localeCompare(b.nom); });
}
let moisDragId=null;
function moisDragStart(id,e){ moisDragId=id; try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',id); }catch(_){} }
function moisDragOver(e){ e.preventDefault(); try{ e.dataTransfer.dropEffect='move'; }catch(_){}
  const cell=e.currentTarget; if(!cell) return;
  const r=cell.getBoundingClientRect();
  const after=(e.clientY-r.top)>r.height/2;
  if(cell!==window._moisDropCell || after!==window._moisDropAfter){
    _moisClearMark();
    window._moisDropCell=cell; window._moisDropAfter=after;
    cell.style.boxShadow = after ? 'inset 0 -3px 0 0 var(--blue-mid)' : 'inset 0 3px 0 0 var(--blue-mid)';
  }
}
function _moisClearMark(){ const c=window._moisDropCell; if(c){ c.style.boxShadow=''; window._moisDropCell=null; } }
function moisDrop(targetId,e){
  e.preventDefault();
  const after=window._moisDropAfter; _moisClearMark();
  if(agentSortMode==='site'||!moisDragId||moisDragId===targetId){ moisDragId=null; return; }
  const ids=_moisAgentsOrdered().map(a=>a.id);
  const from=ids.indexOf(moisDragId); if(from<0){ moisDragId=null; return; }
  ids.splice(from,1);
  let to=ids.indexOf(targetId); if(to<0){ moisDragId=null; return; }
  if(after) to+=1;
  ids.splice(to,0,moisDragId);
  _setMoisOrder(ids); moisDragId=null; renderMois();
}
function moisCellClick(agentId, ds){
  if(!moisSelMode){ openMoisPopup(agentId, ds); return; }
  // 1er clic (ou reprise) : ancre. 2e clic sur le même agent : borne de fin.
  if(moisSelAgent!==agentId || !moisSelStart || moisSelEnd){ moisSelAgent=agentId; moisSelStart=ds; moisSelEnd=null; renderMois(); return; }
  if(ds<moisSelStart){ moisSelEnd=moisSelStart; moisSelStart=ds; } else { moisSelEnd=ds; }
  renderMois();
}
function moisDeclareAbsence(){
  if(!moisSelAgent||!moisSelStart) return;
  absenceDepuisSelection(moisSelAgent, moisSelStart, moisSelEnd||moisSelStart);
}
function renderMoisFab(){
  const host=document.getElementById('view-mois'); if(!host) return;
  let fab=document.getElementById('mois-fab');
  if(!fab){ fab=document.createElement('button'); fab.id='mois-fab'; fab.onclick=toggleMoisSel; host.appendChild(fab); }
  const on=moisSelMode;
  fab.style.cssText=`position:fixed;bottom:24px;right:26px;z-index:240;display:inline-flex;align-items:center;gap:9px;height:46px;padding:0 20px;border:none;border-radius:26px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.22);background:${on?'#2B2A28':'#FCD727'};color:${on?'#fff':'#1A1A17'}`;
  fab.innerHTML=`<svg viewBox="0 0 24 24" style="width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round">${on?'<path d="M6 6l12 12M18 6L6 18"/>':'<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 13v4M10 15h4"/>'}</svg>${on?'Terminer':'Poser une absence'}`;
}

function renderMoisSelBar(){
  const host=document.getElementById('view-mois');
  let bar=document.getElementById('mois-selbar');
  if(!moisSelMode||!moisSelStart||!host){ if(bar) bar.remove(); return; }
  if(!bar){ bar=document.createElement('div'); bar.id='mois-selbar'; host.appendChild(bar); }
  bar.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:250;background:var(--white);border:1px solid var(--border);box-shadow:var(--shadow-lg);border-radius:var(--radius);padding:11px 16px;display:flex;align-items:center;gap:14px';
  const end=moisSelEnd||moisSelStart;
  const range=moisSelEnd?`${fmtDate(moisSelStart)} → ${fmtDate(end)}`:`${fmtDate(moisSelStart)} · cliquez le dernier jour`;
  bar.innerHTML=`<div style="font-size:13px"><strong>${_escH(agentNom(moisSelAgent))}</strong> <span style="color:var(--text2)">${range}</span></div>
    <button class="btn btn-primary btn-sm" onclick="moisDeclareAbsence()">Déclarer une absence</button>
    <button class="btn btn-secondary btn-sm" onclick="moisClearSel()">Effacer</button>`;
}

function renderMoisAgentBar(shown, total){
  const clearBtn=document.getElementById('mois-search-clear'); if(clearBtn) clearBtn.style.display=moisSearch?'inline-flex':'none';
  const lbl=document.getElementById('mois-count-label'); if(lbl) lbl.textContent=`${shown} agent${shown>1?'s':''}${moisSearch?` sur ${total}`:' affichés'}`;
}

// Heures & statut d'un agent pour un jour ouvré donné
function _agentMonthDay(agentId, d){
  const idx=(d.getDay()+6)%7;
  if(idx>4) return {weekend:true, mins:0, status:'weekend'};
  const label=JOURS[idx], isA=isWeekA(d), dateStr=_ymd(d);
  const dayAffecs=gaf().filter(af=>af.agentId===agentId && af.jours.includes(label) && _affInRange(af,d) && !(af.semaine==='A'&&!isA) && !(af.semaine==='B'&&isA));
  const own=effectiveShifts(agentId, dateStr, dayAffecs);
  const repl=agentReplacementShifts(agentId, d);
  const ab=gab().find(a=>a.agentId===agentId && _absCoversDate(a,d));
  let mins=0;
  if(!ab) own.forEach(s=>{ if(!siteFermeLe(s.siteId,d)) mins+=_shiftMin(s); });
  repl.forEach(s=>{ if(!siteFermeLe(s.siteId,d)) mins+=_shiftMin(s); });
  const allClosed = own.length>0 && own.every(s=>siteFermeLe(s.siteId,d));
  let status;
  if(ab && own.length>0) status='absent'; // absence sans affectation ce jour : repos (pas de Abs ni d'alerte)
  else if(repl.length>0) status='remplacement';
  else if(own.length>0) status = allClosed ? 'ferme' : 'present';
  else status='repos';
  const sites=[...new Set(own.concat(repl).map(s=>s.siteId))].map(id=>siteNom(id));
  // Blocs de l'absence pour ce jour (ex. matin / après-midi), chacun avec son propre remplaçant éventuel
  let absBlocks=null;
  if(ab){
    absBlocks=dayAffecs.filter(af=>!siteFermeLe(af.siteId,d))
      .map(af=>({afId:af.id, siteId:af.siteId, debut:af.debut, fin:af.fin, remplacantId:_replFor(ab, af.id+'@'+dateStr)}))
      .sort((a,b)=>_mins(a.debut)-_mins(b.debut));
  }
  return {weekend:false, mins, status, ab, sites, own, repl, dateStr, absBlocks};
}

const _MOIS_ST={
  present:{bg:'#DDEFE4',fg:'#1E5738'},
  remplacement:{bg:'#DCEBF7',fg:'#134B72'},
  absent:{bg:'#F8DCD7',fg:'#7A2019'},
  ferme:{bg:'#ECECEA',fg:'#6B6D68'},
  repos:{bg:'transparent',fg:'var(--text3)'}
};

function renderMois(){
  updateAlertBand();
  buildTourneeFilters();
  const first=new Date(moisDate.getFullYear(), moisDate.getMonth(), 1);
  const lbl=document.getElementById('mois-label-header'); if(lbl) lbl.textContent=_cap(first.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}));
  const gridEl=document.getElementById('mois-grid'); if(!gridEl) return;
  // Tous les agents apparaissent, même sans affectation · ordre manuel puis alphabétique
  let agentsSel=(agentSortMode==='site' ? applyScopeFilter(sortAgentsForDisplay(ga())) : applyScopeFilter(_moisAgentsOrdered())).filter(a=>!a.inactif);
  updateSortToggleUI();
  const total=agentsSel.length;
  const q=moisSearch.trim().toLowerCase();
  if(q) agentsSel=agentsSel.filter(a=>a.nom.toLowerCase().includes(q));
  renderMoisAgentBar(agentsSel.length, total);

  if(agentsSel.length===0){
    gridEl.innerHTML=`<div class="empty" style="padding:56px 20px"><div class="empty-icon"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.3-4.3"/></svg></div><div class="empty-text">Aucun agent « ${_escH(moisSearch)} »</div></div>`;
    return;
  }

  const today=new Date(); today.setHours(0,0,0,0);
  const lastOfMonth=new Date(moisDate.getFullYear(), moisDate.getMonth()+1, 0);
  // Jours ouvrés (Lun–Ven) du mois, groupés par semaine
  const weeks=[]; let curW=null, curKey=null;
  for(let day=1; day<=lastOfMonth.getDate(); day++){
    const d=new Date(moisDate.getFullYear(), moisDate.getMonth(), day);
    if((d.getDay()+6)%7>4) continue;
    const key=getWeekKey(getMonday(d));
    if(key!==curKey){ curKey=key; curW={key, label:'S'+_weekNum(d), dates:[]}; weeks.push(curW); }
    curW.dates.push(d);
  }

  const DAYW=68, SUBW=54, TOTW=64, AGW=170;
  const cols=[`${AGW}px`];
  weeks.forEach(w=>{ w.dates.forEach(()=>cols.push(`${DAYW}px`)); cols.push(`${SUBW}px`); });
  cols.push(`${TOTW}px`);
  const gt=cols.join(' ');
  const dayL=['L','M','M','J','V'];

  // En-têtes (flottants en haut pour rester visibles au scroll)
  const H1H=26, H2H=34;
  let h1=`<div style="position:sticky;top:0;left:0;z-index:4;height:${H1H}px;background:var(--surf2);border-radius:var(--radius-sm) 0 0 0"></div>`;
  weeks.forEach(w=>{ h1+=`<div style="grid-column:span ${w.dates.length+1};position:sticky;top:0;z-index:3;height:${H1H}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10.5px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;background:var(--surf2)">${w.label}</div>`; });
  h1+=`<div style="position:sticky;top:0;z-index:3;height:${H1H}px;background:var(--surf2)"></div>`;
  let h2=`<div class="legend-anchor" style="position:sticky;top:${H1H}px;left:0;z-index:4;height:${H2H}px;box-sizing:border-box;background:var(--surf2);display:flex;align-items:center;justify-content:space-between;gap:5px;padding:0 8px 0 10px">
    <div style="display:flex;align-items:center;gap:6px;min-width:0">
      <span class="sort-seg-mini-label">Organisé par</span>
      <div class="sort-seg-mini" title="Trier la liste des agents">
        <button class="sort-seg-btn-mini" data-mode="agent" onclick="agentSortMode==='agent'?moisResetOrder():setAgentSortMode('agent')" title="Par agent (alpha) — recliquer pour reclasser"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg></button>
        <button class="sort-seg-btn-mini" data-mode="site" onclick="setAgentSortMode('site')" title="Par site"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg></button>
      </div>
    </div>
    <button class="legend-btn" id="mois-legend-btn" onclick="toggleLegend(event,'mois-legend-btn','mois-legend-popover')" title="Code couleur" style="width:18px;height:18px;font-size:10px">?</button>
    <div class="legend-popover" id="mois-legend-popover">
      <div class="legend-popover-title">Code couleur</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#3E9A69"></span>En poste</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#3B84C4"></span>Remplacement</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#ECECEA"></span>Absence — aucune action</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#F6C9C1"></span>Absence à remplacer</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#FBE38C"></span>Absence traitée</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#9A9C97"></span>Site fermé</div>
      <div class="legend-row"><span class="legend-swatch" style="border:1px solid var(--border);background:transparent"></span>Repos</div>
    </div>
  </div>`;
  weeks.forEach(w=>{
    w.dates.forEach(d=>{
      const isToday=_sameDay(d,today);
      h2+=`<div style="position:sticky;top:${H1H}px;z-index:3;height:${H2H}px;box-sizing:border-box;text-align:center;padding:4px 0;background:${isToday?'var(--blue-light)':'var(--surf2)'}">
        <div style="font-size:9px;color:var(--text3)">${dayL[(d.getDay()+6)%7]}</div>
        <div style="font-size:12px;font-weight:700;color:${isToday?'#000':'var(--text)'}">${d.getDate()}</div></div>`;
    });
    h2+=`<div style="position:sticky;top:${H1H}px;z-index:3;height:${H2H}px;box-sizing:border-box;text-align:center;font-size:9.5px;font-weight:700;color:var(--text3);background:#EFEEEA;display:flex;align-items:center;justify-content:center">Sem.</div>`;
  });
  h2+=`<div style="position:sticky;top:${H1H}px;z-index:3;height:${H2H}px;box-sizing:border-box;text-align:center;font-size:9.5px;font-weight:800;color:var(--text2);background:#EFEEEA;display:flex;align-items:center;justify-content:center">Mois</div>`;

  // Lignes agents
  const rows=agentsSel.map(ag=>{
    let monthMin=0;
    const _siteM=agentSortMode==='site';
    let cells=`<div ${_siteM?'draggable="false"':'draggable="true" ondragstart="moisDragStart(\'' + ag.id + '\',event)" ondragover="moisDragOver(event)" ondrop="moisDrop(\'' + ag.id + '\',event)" ondragend="_moisClearMark()"'} title="${_siteM?'':'Glisser pour réorganiser'}" style="position:sticky;left:0;z-index:1;background:var(--white);border-right:1px solid var(--border);display:flex;align-items:center;gap:6px;padding:6px 8px 6px 6px;${_siteM?'':'cursor:grab'}">
      ${_siteM?'':'<svg viewBox="0 0 24 24" style="width:13px;height:13px;flex-shrink:0;fill:none;stroke:var(--text3);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="9" cy="6" r=".6"/><circle cx="9" cy="12" r=".6"/><circle cx="9" cy="18" r=".6"/><circle cx="15" cy="6" r=".6"/><circle cx="15" cy="12" r=".6"/><circle cx="15" cy="18" r=".6"/></svg>'}
      <div style="flex:1;min-width:0;cursor:pointer" onclick="openPanel('panel-agent-detail','${ag.id}')">
        <div style="font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_escH(ag.nom)}</div>
        ${ag.remplacant?'<div style="font-size:10px;color:var(--text3)">Remplaçant</div>':''}
      </div>
    </div>`;
    weeks.forEach(w=>{
      let weekMin=0;
      w.dates.forEach(d=>{
        const c=_agentMonthDay(ag.id, d);
        weekMin+=c.mins; monthMin+=c.mins;
        const st=_MOIS_ST[c.status]||_MOIS_ST.repos;
        const isToday=_sameDay(d,today);
        const siteShort = c.sites&&c.sites.length ? _escH((c.sites[0].length>9?c.sites[0].slice(0,8)+'…':c.sites[0])+(c.sites.length>1?' +'+(c.sites.length-1):'')) : '';
        const replFor=[...new Set((c.repl||[]).map(s=>s.forAgent).filter(Boolean))].map(id=>agentNom(id));
        let title;
        if(c.status==='absent') title=`Absent (${c.ab&&c.ab.remplacantId?'remplacé par '+agentNom(c.ab.remplacantId):'sans remplaçant'})`;
        else if(c.status==='remplacement') title=`Remplacement${replFor.length?' · remplace '+replFor.join(', '):''}${c.sites&&c.sites.length?' · '+c.sites.join(', '):''}`;
        else title = c.sites&&c.sites.length ? c.sites.join(', ') : 'Repos';
        const clickableNormal = c.status!=='repos';
        const cellClickable = moisSelMode || clickableNormal;
        const selInRange = moisSelMode && moisSelAgent===ag.id && moisSelStart && c.dateStr>=moisSelStart && c.dateStr<=(moisSelEnd||moisSelStart);
        const absBlocks = c.absBlocks && c.absBlocks.length ? c.absBlocks : null;
        // Vue mensuelle : on ne coupe la cellule que si au moins un créneau est remplacé (sinon un simple « Abs »)
        const multiBlock = c.status==='absent' && absBlocks && absBlocks.length>1 && absBlocks.some(b=>b.remplacantId);
        let inner;
        if(c.status==='absent' && !multiBlock) inner=`<span style="font-size:11px;font-weight:700">Abs</span>`;
        else if(c.status==='ferme') inner=`<span style="font-size:10px;font-weight:600">Fermé</span>`;
        else if(c.mins>0) inner=`<span style="display:block;font-size:11.5px;font-weight:700;line-height:1.1">${_fmtDur(c.mins)}</span><span style="display:block;width:100%;font-size:8.5px;font-weight:500;line-height:1.15;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${siteShort}</span>`;
        else if(c.status!=='absent') inner=`<span style="font-size:12px;opacity:.5">·</span>`;
        // Couverture : un seul remplaçant pour la journée, ou fallback si aucun bloc détecté
        const singleReplId = absBlocks ? (absBlocks[0].remplacantId) : (c.ab && c.ab.remplacantId);
        const absCovered = c.status==='absent' && !multiBlock && !!singleReplId;
        const absNeeds = c.status==='absent' && !multiBlock && c.ab && c.ab.needsReplacement && !absCovered;
        const absBadge = absCovered ? `<span title="Remplacé par ${_escA(agentNom(singleReplId))}" style="position:absolute;top:2px;right:2px;height:15px;min-width:15px;padding:0 3px;border-radius:8px;background:#000;color:#fff;font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1">${_escH(_initials(agentNom(singleReplId)))}</span>` : '';
        const alertBadge = absNeeds ? `<span title="Absence à remplacer" style="position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#B4271B;color:#fff;font-size:9.5px;font-weight:900;display:flex;align-items:center;justify-content:center;line-height:1">!</span>` : '';
        const replBadge = (c.status==='remplacement' && replFor.length) ? `<span title="Remplace ${_escA(replFor.join(', '))}" style="position:absolute;top:2px;right:2px;height:15px;min-width:15px;padding:0 3px;border-radius:8px;background:var(--blue-mid);color:#fff;font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1">${_escH(replFor.length===1?_initials(replFor[0]):_initials(replFor[0])+'+')}</span>` : '';
        let cellBg=st.bg, cellFg=st.fg;
        if(c.status==='absent' && !multiBlock){ if(absCovered){ cellBg='#FBE38C'; cellFg='#5A4A10'; } else if(absNeeds){ cellBg='#F6C9C1'; cellFg='#6E1B14'; } else { cellBg='#ECECEA'; cellFg='#6B6D68'; } }
        const ring = selInRange ? 'box-shadow:inset 0 0 0 2.5px var(--blue-mid);' : (isToday?'box-shadow:inset 0 0 0 1.5px var(--blue-mid);':'');
        // Journée coupée en blocs (matin/après-midi…) si remplaçants différents par créneau
        let multiInner='';
        if(multiBlock){
          multiInner = absBlocks.map(b=>{
            const bCovered=!!b.remplacantId;
            const bNeeds=c.ab && c.ab.needsReplacement && !bCovered;
            const bBg = bCovered?'#FBE38C':(bNeeds?'#F6C9C1':'#ECECEA');
            const bFg = bCovered?'#5A4A10':(bNeeds?'#6E1B14':'#6B6D68');
            const bBadge = bCovered ? `<span style="height:13px;min-width:13px;padding:0 2px;border-radius:7px;background:#000;color:#fff;font-size:7.5px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1">${_escH(_initials(agentNom(b.remplacantId)))}</span>` : (bNeeds?`<span style="width:11px;height:11px;border-radius:50%;background:#B4271B;color:#fff;font-size:8px;font-weight:900;display:flex;align-items:center;justify-content:center;line-height:1">!</span>`:'');
            const bTitle=bCovered?`${b.debut}–${b.fin} · remplacé par ${agentNom(b.remplacantId)}`:`${b.debut}–${b.fin} · sans remplaçant`;
            return `<div title="${_escA(bTitle)}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:3px;background:${bBg};color:${bFg};width:100%">
              <span style="font-size:9.5px;font-weight:700">Abs</span>${bBadge}
            </div>`;
          }).join('<div style="height:1px;background:var(--border);width:100%"></div>');
        }
        cells+=`<div title="${multiBlock?'':_escA(title)}" style="position:relative;min-height:40px;display:flex;flex-direction:${multiBlock?'column':'column'};align-items:center;justify-content:center;gap:${multiBlock?'0':'1px'};padding:0;background:${selInRange?'var(--blue-light)':(multiBlock?'transparent':cellBg)};color:${cellFg};border:1px solid var(--border);${ring}${cellClickable?'cursor:pointer':''}"${cellClickable?` onclick="moisCellClick('${ag.id}','${c.dateStr}')"`:''}>${multiBlock?multiInner:`${alertBadge}${absBadge}${replBadge}<div style="padding:0 3px">${inner}</div>`}</div>`;
      });
      cells+=`<div style="min-height:38px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text2);background:#F6F5F1;border:1px solid var(--border)">${weekMin?_fmtDur(weekMin):'—'}</div>`;
    });
    cells+=`<div style="min-height:38px;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;color:var(--text1);background:#F0EFEA;border:1px solid var(--border)">${monthMin?_fmtDur(monthMin):'—'}</div>`;
    return cells;
  }).join('');

  gridEl.innerHTML=`<div style="display:grid;grid-template-columns:${gt};min-width:max-content;gap:0;align-items:stretch">${h1}${h2}${rows}</div>`;
  updateSortToggleUI();
  renderMoisSelBar();
  renderMoisFab();
}
function _weekNum(d){ const t=new Date(d); t.setHours(0,0,0,0); t.setDate(t.getDate()+3-((t.getDay()+6)%7)); const w1=new Date(t.getFullYear(),0,4); return 1+Math.round(((t-w1)/86400000-3+((w1.getDay()+6)%7))/7); }

function closeMoisPopup(){ const p=document.getElementById('mois-popup'); if(p) p.remove(); }
function openMoisPopup(agentId, ds){
  closeMoisPopup();
  const ag=ga().find(a=>a.id===agentId); if(!ag) return;
  const d=new Date(ds+'T00:00:00');
  const c=_agentMonthDay(agentId, d);
  const dateLabel=_cap(d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}));
  const line=(deb,fin,site,tag,stKey)=>{ const st=_MOIS_ST[stKey]||_MOIS_ST.present; return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--border)">
    <span style="font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;width:96px;flex-shrink:0">${deb}–${fin}</span>
    <span style="flex:1;font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_escH(site)}</span>
    <span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;background:${st.bg};color:${st.fg};flex-shrink:0">${tag}</span>
  </div>`; };
  let body='';
  if(c.ab){
    const rep=c.ab.remplacantId?agentNom(c.ab.remplacantId):null;
    body+=`<div style="background:var(--red-light);border:1px solid rgba(226,109,99,.32);border-radius:var(--radius-sm);padding:11px 13px;margin-bottom:12px;font-size:12.5px">
      <div style="font-weight:700;color:var(--red);margin-bottom:3px">Absent ce jour</div>
      <div style="color:var(--text2)">Motif : ${_escH(c.ab.motif||'—')}</div>
      <div style="color:var(--text2)">${rep?'Remplacé par <strong>'+_escH(rep.split(' ')[0])+'</strong>':'Sans remplaçant'}</div>
    </div>`;
  }
  const shifts=[];
  if(!c.ab) c.own.forEach(s=>{ const closed=siteFermeLe(s.siteId,d); shifts.push(line(s.debut,s.fin,siteNom(s.siteId),closed?'Site fermé':'En poste',closed?'ferme':'present')); });
  c.repl.forEach(s=>shifts.push(line(s.debut,s.fin,siteNom(s.siteId),'Remplacement','remplacement')));
  if(shifts.length) body+=`<div>${shifts.join('')}</div>`;
  else if(!c.ab) body+=`<div style="font-size:13px;color:var(--text3);padding:14px 0;text-align:center">Repos — aucun créneau ce jour.</div>`;

  const html=`<div id="mois-popup" style="position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)closeMoisPopup()">
    <div style="position:absolute;inset:0;background:rgba(20,20,18,.42)"></div>
    <div style="position:relative;background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow-lg);width:400px;max-width:100%;max-height:82vh;overflow:auto;padding:18px 20px 20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:2px">
        <div style="font-size:16px;font-weight:800">${_escH(ag.nom)}</div>
        <button onclick="closeMoisPopup()" title="Fermer" style="border:none;background:var(--bg);width:28px;height:28px;border-radius:8px;cursor:pointer;color:var(--text2);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div style="font-size:12.5px;color:var(--text2);margin-bottom:14px">${dateLabel}</div>
      ${body}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:2px solid var(--border)">
        <span style="font-size:12px;color:var(--text2)">Total du jour</span>
        <span style="font-size:16px;font-weight:800">${c.mins?_fmtDur(c.mins):'0h'}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        ${c.ab?absenceActionsHTML(c.ab.id,{day:ds}):''}
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="closeMoisPopup();openPanel('panel-agent-detail','${ag.id}')">Fiche agent</button>
        ${c.ab?`<button class="btn btn-primary btn-sm" style="flex:1" onclick="closeMoisPopup();openPanel('panel-remplacer','${c.ab.id}')">Trouver un remplaçant</button>`:''}
      </div>
    </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

