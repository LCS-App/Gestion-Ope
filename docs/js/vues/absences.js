// Vue absences
/* ═══════════════════════════════════════
   ABSENCES VIEW
═══════════════════════════════════════ */
let absTab='tous';
function openRemplacePanelForShift(agentId,dateStr){
  const d=new Date(dateStr+'T00:00:00');
  const ab=gab().find(a=>{
    if(a.agentId!==agentId) return false;
    const s=new Date(a.dateDebut+'T00:00:00');
    const e=a.dateFin?new Date(a.dateFin+'T23:59:59'):new Date(a.dateDebut+'T23:59:59');
    return d>=s&&d<=e;
  });
  if(ab) openPanel('panel-remplacer',ab.id);
  else showView('croise');
}
function goAbsencesToFill(){
  const urgent=gab().filter(_absenceUrgent).sort((a,b)=>new Date(a.dateDebut)-new Date(b.dateDebut));
  if(!urgent.length) return;
  const we=new Date(weekStart); we.setDate(we.getDate()+6);
  // Préférer une absence urgente déjà visible dans la semaine affichée, sinon la plus proche.
  let ab=urgent.find(a=>{
    const s=new Date(a.dateDebut+'T00:00:00');
    const e=a.dateFin?new Date(a.dateFin+'T23:59:59'):new Date(a.dateDebut+'T23:59:59');
    return s<=we && e>=weekStart;
  });
  if(!ab) ab=urgent[0];
  _focusAbsence(ab);
}
// Amène la semaine + le planning sur l'absence, la fait clignoter, puis ouvre le panneau
function _focusAbsence(ab){
  if(!ab) return;
  const we=new Date(weekStart); we.setDate(we.getDate()+6);
  const abStart=new Date(ab.dateDebut+'T00:00:00');
  if(abStart<weekStart || abStart>we){
    weekStart=getMonday(abStart);
    if(currentView==='mois') showView('planning'); else refreshCurrentView();
  }
  const cell=document.querySelector(`[data-absence-id="${ab.id}"]`);
  const container=document.getElementById('planning-container');
  if(cell&&container){
    const cRect=container.getBoundingClientRect(), eRect=cell.getBoundingClientRect();
    container.scrollTop += (eRect.top-cRect.top) - container.clientHeight/2 + eRect.height/2;
    container.scrollLeft += (eRect.left-cRect.left) - container.clientWidth/2 + eRect.width/2;
    cell.classList.add('cell-flash');
    setTimeout(()=>cell.classList.remove('cell-flash'),2200);
  }
  openPanel('panel-remplacer',ab.id);
}
function tabAbsences(t,btn){
  absTab=t;
  document.querySelectorAll('#view-absences .tab').forEach(el=>el.classList.remove('on'));
  btn.classList.add('on');
  renderAbsences();
}

/* Sites réellement impactés par une absence : tous les postes de l'agent absent
   sur la période (= sa tournée entière), pas seulement le site déclaré. */
function absenceImpactSites(a){
  const seen=new Set(); const ids=[];
  _absenceShifts(a).forEach(s=>{ if(!seen.has(s.siteId)){ seen.add(s.siteId); ids.push(s.siteId); } });
  if(!ids.length && a.siteId){ ids.push(a.siteId); }
  return ids;
}

function renderAbsences(){
  let abs=gab().sort((a,b)=>new Date(b.dateDebut)-new Date(a.dateDebut));
  if(absTab==='urgent') abs=abs.filter(_absenceUrgent);
  if(absTab==='covered') abs=abs.filter(a=>_absenceCovered(a)&&!a.ignored);
  const el=document.getElementById('absences-list');
  if(!abs.length){
    el.innerHTML=`<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.4 2.4 4.9-5"/></svg></div><div class="empty-text">Aucune absence à afficher</div></div>`;
    return;
  }
  el.innerHTML=abs.map(a=>{
    const _cov=_absenceCovered(a), _some=_absenceAnyRepl(a), _names=_absenceReplNames(a).map(_escH).join(', ');
    const urgent=_absenceUrgent(a);
    const cls=a.ignored?'':urgent?'urgent':_cov?'covered':'';
    const badge=a.ignored
      ?`<span class="badge badge-gray">Absence ignorée</span>`
      :_cov
      ?`<span class="badge badge-green">Remplacé · ${_names}</span>`
        :_some
        ?`<span class="badge" style="background:var(--orange-light);color:#B0722A">Partiel · ${_names}</span>`
        :(a.needsReplacement?`<span class="badge badge-red">Sans remplaçant</span>`:`<span class="badge badge-gray">Sans remplacement</span>`);
    const bldIc='<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="5" y="3" width="14" height="18" rx="1.6"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></svg>';
    const impact=absenceImpactSites(a);
    const tour=gt().find(t=>t.agentId===a.agentId && (t.siteIds||[]).length);
    const multi=impact.length>1;
    let inlineLoc='';
    if(!multi && impact.length){ inlineLoc=` · ${bldIc} ${_escH(siteNom(impact[0]))}`; }
    let impactBlock='';
    if(multi){
      const names=impact.map(id=>_escH(siteNom(id))).join(' · ');
      const head=tour?`${_escH(tour.nom)} · `:'';
      impactBlock=`<div style="margin-top:7px;display:flex;align-items:flex-start;gap:8px;background:var(--blue-light);border:1px solid var(--blue-border,rgba(19,75,114,.15));border-radius:10px;padding:8px 11px">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;fill:none;stroke:var(--blue-mid);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><circle cx="6" cy="6.5" r="2.4"/><circle cx="18" cy="17.5" r="2.4"/><path d="M8.4 6.5H15a3 3 0 010 6H9a3 3 0 000 6h6.6"/></svg>
        <div style="min-width:0">
          <div style="font-size:12px;font-weight:800;color:var(--blue-mid)">${head}toute la tournée impactée — ${impact.length} sites à couvrir</div>
          <div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.5">${names}</div>
        </div>
      </div>`;
    }
    const q=[agentNom(a.agentId),a.motif,a.notes||'',fmtDate(a.dateDebut)].concat(impact.map(siteNom)).concat(_absenceReplNames(a)).join(' ').toLowerCase();
    return `<div class="abs-item ${cls}" data-q="${_escA(q)}">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="font-weight:700;font-size:14px">${_escH(agentNom(a.agentId))}</span>
          ${badge}
          <span class="badge badge-gray">${_escH(a.motif)}</span>
        </div>
        <div style="font-size:12px;color:var(--text2)">
          <svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg> ${fmtDate(a.dateDebut)}${a.dateFin?' → '+fmtDate(a.dateFin):''}${inlineLoc}${a.notes?' · '+a.notes:''}
        </div>
        ${impactBlock}
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        ${urgent?`<button class="btn btn-primary btn-sm" onclick="openPanel('panel-remplacer','${a.id}')">Attribuer</button>`:''}
        ${absenceActionsHTML(a.id)}
      </div>
    </div>`;
  }).join('');
  filterAbsList(document.getElementById('abs-search')?.value||'');
}

/* Suppression — point d'entrée unique. `dayIso` = journée depuis laquelle l'action est lancée
   (clic sur un créneau, popup du mois, poste du croisement) : on propose alors la portée. */
function delAbsence(id, dayIso){
  const ab=gab().find(a=>a.id===id); if(!ab) return;
  const d=_absDesc(ab);
  const days=_absDays(ab);
  const perte=d.repl?`, dont <strong>${d.repl}</strong> déjà remplacé${d.repl>1?'s':''} — ${d.repl>1?'ces remplacements seront annulés':'ce remplacement sera annulé'}`:'';
  if(!(dayIso && days.length>1 && days.includes(dayIso))){
    if(!confirm(`Supprimer l'absence de ${d.nom} — ${d.periode} ?\n\n${d.blocks} créneau${d.blocks>1?'x':''} concerné${d.blocks>1?'s':''}${d.repl?`, dont ${d.repl} déjà remplacé${d.repl>1?'s':''} (le${d.repl>1?'s':''} remplacement${d.repl>1?'s':''} sera annulé).`:'.'}`)) return;
    absSupprimerTout(id); return;
  }
  closeAbsAsk();
  const jourLabel=_cap(new Date(dayIso+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}));
  document.body.insertAdjacentHTML('beforeend',`<div id="abs-ask" style="position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)closeAbsAsk()">
    <div style="position:absolute;inset:0;background:rgba(20,20,18,.42)"></div>
    <div style="position:relative;background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow-lg);width:420px;max-width:100%;padding:20px">
      <div style="font-size:16px;font-weight:800;margin-bottom:4px">Que faut-il supprimer ?</div>
      <div style="font-size:12.5px;color:var(--text2);line-height:1.55;margin-bottom:16px">Absence de <strong>${_escH(d.nom)}</strong> — ${d.periode} (${days.length} jours, ${d.blocks} créneau${d.blocks>1?'x':''}${perte}).</div>
      <button class="btn btn-secondary" style="width:100%;justify-content:flex-start;text-align:left;height:auto;padding:11px 13px;margin-bottom:8px" onclick="absRetirerJour('${id}','${dayIso}')">
        <span><span style="display:block;font-weight:700;font-size:13px">Ce jour seulement</span><span style="display:block;font-size:11.5px;color:var(--text2);margin-top:2px">${_escH(jourLabel)} — l'absence est scindée, le reste de la période est conservé.</span></span>
      </button>
      <button class="btn btn-danger" style="width:100%;justify-content:flex-start;text-align:left;height:auto;padding:11px 13px" onclick="absSupprimerTout('${id}')">
        <span><span style="display:block;font-weight:700;font-size:13px">Toute l'absence</span><span style="display:block;font-size:11.5px;opacity:.85;margin-top:2px">${d.periode} — tous les créneaux et remplacements associés.</span></span>
      </button>
      <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:10px" onclick="closeAbsAsk()">Annuler</button>
    </div></div>`);
}

function filterAbsList(q){
  q=(q||'').trim().toLowerCase();
  document.querySelectorAll('#absences-list .abs-item').forEach(el=>{
    el.style.display = (!q || (el.dataset.q||'').includes(q)) ? '' : 'none';
  });
}
function editAbsence(absId){
  const ab=gab().find(a=>a.id===absId); if(!ab) return;
  if(typeof closeMoisPopup==='function') closeMoisPopup();
  openPanel('panel-absence');
  editAbsId=absId;
  setTimeout(()=>{
    const sel=document.getElementById('pa-agent'); if(sel){ sel.value=ab.agentId; sel.dispatchEvent(new Event('change')); }
    const dt=document.getElementById('pa-debut'); if(dt) dt.value=ab.dateDebut;
    const dtf=document.getElementById('pa-fin'); if(dtf) dtf.value=ab.dateFin||'';
    const mot=document.getElementById('pa-motif'); if(mot) mot.value=ab.motif||'maladie';
    absNeedsRepl=!!ab.needsReplacement;
    const tgl=document.getElementById('pa-toggle'); if(tgl){ tgl.classList.toggle('on',absNeedsRepl); const sec=document.getElementById('pa-repl-section'); if(sec) sec.style.display=absNeedsRepl?'block':'none'; }
    if(typeof refreshPaRempl==='function') refreshPaRempl();
    const rsel=document.getElementById('pa-rempl'); if(rsel && ab.remplacantId){ rsel.value=ab.remplacantId; if(typeof paCheckConflict==='function') paCheckConflict(); }
  },60);
}

