// Extraction plannings, absences, heures (CSV/impression)
/* ═══════════════════════════════════════
   EXTRACTION (plannings, absences, h.sup)
═══════════════════════════════════════ */
const EXP = { tab:'planning', start:'', end:'', agentId:'', ptType:'tous' };

function _ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function _addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function _cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
function _longDate(dateStr){ return _cap(new Date(dateStr+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})); }

function downloadCSV(filename, rows){
  const esc = v => { v=(v==null?'':String(v)); return /[";\n\r]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; };
  const csv = '\uFEFF' + rows.map(r => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  toast('Fichier CSV téléchargé');
}
function copyToClipboard(text){
  const done = () => toast('Copié dans le presse-papier');
  if(navigator.clipboard && window.isSecureContext){ navigator.clipboard.writeText(text).then(done).catch(()=>_fallbackCopy(text,done)); }
  else _fallbackCopy(text,done);
}
function _fallbackCopy(text,done){
  const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); done(); }catch{ toast('Copie impossible',false); }
  document.body.removeChild(ta);
}
function _absCoversDate(ab, d){
  const s=new Date(ab.dateDebut+'T00:00:00');
  const e=ab.dateFin?new Date(ab.dateFin+'T23:59:59'):new Date(ab.dateDebut+'T23:59:59');
  return d>=s && d<=e;
}

/* — calcul du planning d'un agent sur une plage — */
function computeAgentDays(agentId, start, end){
  const affs=gaf().filter(a=>a.agentId===agentId);
  const out=[]; const cur=new Date(start+'T00:00:00'); const last=new Date(end+'T00:00:00');
  while(cur<=last){
    const idx=(cur.getDay()+6)%7; const label=JOURS[idx]; const isA=isWeekA(cur);
    const dateStr=_ymd(cur); const weekKey=getWeekKey(getMonday(cur));
    const dayAff=affs.filter(a=>{
      if(!a.jours.includes(label)) return false;
      if(!_affInRange(a,cur)) return false;
      if(!_contratInRange(agentId,cur)) return false;
      if(a.semaine==='A'&&!isA) return false;
      if(a.semaine==='B'&&isA) return false;
      return true;
    });
    const eff=effectiveShifts(agentId, dateStr, dayAff);
    let shifts=[];
    if(eff.length){
      const abs=gab().find(ab=>ab.agentId===agentId && _absCoversDate(ab, cur));
      shifts=eff.map(a=>{
        let status='present', note='';
        if(abs){ status=abs.remplacantId?'remplace':'absent'; note=abs.remplacantId?('Remplacé par '+agentNom(abs.remplacantId)):('Absent — '+(abs.motif||'')); }
        if(a.ex && status==='present'){ note = a.isAdd ? 'Créneau ponctuel' : 'Ajusté ce jour'; }
        return { site:siteNom(a.siteId), debut:a.debut, fin:a.fin, pause:a.pause||0, status, note, motif:abs?(abs.motif||''):'' };
      });
    }
    // Créneaux couverts EN TANT QUE remplaçant (absences d'autres agents attribuées à cet agent)
    gab().filter(ab=>ab.remplacantId===agentId && _absCoversDate(ab, cur)).forEach(ab=>{
      const absAffs=gaf().filter(a=>a.agentId===ab.agentId).filter(a=>{
        if(!a.jours.includes(label)) return false;
        if(!_affInRange(a,cur)) return false;
        if(a.semaine==='A'&&!isA) return false;
        if(a.semaine==='B'&&isA) return false;
        return true;
      });
      effectiveShifts(ab.agentId, dateStr, absAffs).forEach(a=>{
        shifts.push({ site:siteNom(a.siteId), debut:a.debut, fin:a.fin, pause:a.pause||0, status:'remplacement', note:'Remplacement de '+agentNom(ab.agentId) });
      });
    });
    if(shifts.length){
      shifts.sort((x,y)=>x.debut.localeCompare(y.debut));
      out.push({ dateStr, label, full:JOURS_FULL[idx], shifts });
    }
    cur.setDate(cur.getDate()+1);
  }
  return out;
}
function _statusLabel(s){ return s.status==='absent'?'Absent':s.status==='remplace'?'Remplacé':s.status==='remplacement'?'Remplacement':'Prévu'; }

/* — Vue calendrier semaine (7h30 → 19h) pour l'aperçu planning d'un agent — */
const _CAL_START=450, _CAL_END=1140; // 7:30 → 19:00 en minutes
function _calStatusStyle(st){
  switch(st){
    case 'remplacement': return {bg:'#e7f0fb',bd:'#b8d0f0',fg:'#1b4f9c',solid:true};
    case 'absent':       return {bg:'#fdecea',bd:'#f2c2bc',fg:'#b23225',solid:false};
    case 'remplace':     return {bg:'#eef0f2',bd:'#d8dde2',fg:'#7a838c',solid:false};
    default:             return {bg:'#e8f6ef',bd:'#bfe6d1',fg:'#1e7a4d',solid:true};
  }
}
/* Détail d'une semaine en liste compacte : une ligne par jour */
function _expDayRows(weekDays){
  return weekDays.map(d=>{
    const dt=new Date(d.dateStr+'T00:00:00'); const idx=(dt.getDay()+6)%7;
    const mins=d.shifts.reduce((t,s)=>t+_shiftMin(s),0);
    return `<div style="display:grid;grid-template-columns:76px 1fr 50px;gap:10px;align-items:start;padding:8px 12px;border-top:1px solid var(--border)">
      <div style="font-size:11.5px;font-weight:700;color:var(--text2);padding-top:1px">${JOURS[idx]} ${dt.getDate()}</div>
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
        ${d.shifts.map(s=>{ const st=_calStatusStyle(s.status);
          return `<div style="display:flex;align-items:baseline;gap:9px;font-size:12px;flex-wrap:wrap">
            <span style="font-variant-numeric:tabular-nums;color:var(--text2);width:84px;flex:none">${s.debut}–${s.fin}</span>
            <span style="font-weight:600;min-width:0">${_escH(s.site)}</span>
            ${_pauseOf(s)?`<span style="font-size:11px;color:var(--text3)">pause ${_pauseOf(s)} min</span>`:''}
            ${s.status!=='present'?`<span style="font-size:10.5px;font-weight:700;color:${st.fg};background:${st.bg};border:1px solid ${st.bd};border-radius:20px;padding:1px 7px">${_escH(s.note||_statusLabel(s))}</span>`:''}
          </div>`; }).join('')}
      </div>
      <div style="font-size:11.5px;color:var(--text3);text-align:right;font-variant-numeric:tabular-nums;padding-top:1px">${_fmtDur(mins)}</div>
    </div>`;
  }).join('');
}
/* Grille horaire d'UNE semaine, couleurs en dur (pour la version imprimable) */
function _expPrintGrid(weekDays){
  const H=300, PX=H/(_CAL_END-_CAL_START);
  const byDate={}; weekDays.forEach(d=>byDate[d.dateStr]=d);
  const mon=getMonday(new Date(weekDays[0].dateStr+'T00:00:00'));
  let maxIdx=4; weekDays.forEach(d=>{ const i=(new Date(d.dateStr+'T00:00:00').getDay()+6)%7; if(i>maxIdx) maxIdx=i; });
  const axis=[`<div style="position:absolute;top:0;right:5px;transform:translateY(-50%);font-size:8px;color:#999">7h30</div>`];
  for(let h=8;h<=19;h++) axis.push(`<div style="position:absolute;top:${((h*60)-_CAL_START)*PX}px;right:5px;transform:translateY(-50%);font-size:8px;color:#999">${h}h</div>`);
  const gridBg=`background-image:linear-gradient(to bottom,#e8e8e4 0,transparent 1px);background-size:100% ${60*PX}px;background-position:0 ${(480-_CAL_START)*PX}px;`;
  let colHtml='';
  for(let i=0;i<=maxIdx;i++){
    const dt=_addDays(mon,i); const day=byDate[_ymd(dt)]; const idx=(dt.getDay()+6)%7;
    const blocks=(day?day.shifts:[]).map(s=>{
      const a=Math.max(_mins(s.debut),_CAL_START), b=Math.min(_mins(s.fin),_CAL_END);
      if(b<=a) return '';
      const st=_calStatusStyle(s.status);
      return `<div style="position:absolute;left:2px;right:2px;top:${(a-_CAL_START)*PX}px;height:${Math.max((b-a)*PX,14)}px;background:${st.bg};border:1px solid ${st.bd};border-radius:4px;padding:2px 3px;overflow:hidden;box-sizing:border-box">
        <div style="font-size:8.5px;font-weight:700;color:${st.fg};line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escH(s.site)}</div>
        <div style="font-size:7.5px;color:${st.fg}">${s.debut}–${s.fin}</div>
      </div>`;
    }).join('');
    colHtml+=`<div style="flex:1;min-width:0">
      <div style="text-align:center;font-size:9.5px;font-weight:700;color:#555;padding-bottom:3px">${JOURS[idx]} ${dt.getDate()}</div>
      <div style="position:relative;height:${H}px;border-left:1px solid #e8e8e4;${gridBg}">${blocks}</div>
    </div>`;
  }
  return `<div style="display:flex;padding:9px 10px 11px 0;border-bottom:1px solid #ececec;break-inside:avoid">
    <div style="position:relative;width:32px;flex:none;margin-top:16px">${axis.join('')}</div>
    ${colHtml}
  </div>`;
}
function expWeekCalendar(days, withDetail){
  if(!days.length) return '';
  const H=430, PX=H/(_CAL_END-_CAL_START);
  const byDate={}; days.forEach(d=>byDate[d.dateStr]=d);
  // regrouper par semaine (lundi)
  const weeks={};
  days.forEach(d=>{ const mk=_ymd(getMonday(new Date(d.dateStr+'T00:00:00'))); (weeks[mk]=weeks[mk]||[]).push(d); });
  const mondays=Object.keys(weeks).sort();
  const axisLabels=[]; for(let h=8;h<=19;h++){ axisLabels.push(`<div style="position:absolute;top:${((h*60)-_CAL_START)*PX}px;right:6px;transform:translateY(-50%);font-size:10px;color:var(--text3)">${h}h</div>`); }
  axisLabels.unshift(`<div style="position:absolute;top:0;right:6px;transform:translateY(-50%);font-size:10px;color:var(--text3)">7h30</div>`);
  const gridBg=`background-image:linear-gradient(to bottom,var(--border) 0,transparent 1px);background-size:100% ${60*PX}px;background-position:0 ${(480-_CAL_START)*PX}px;`;
  return mondays.map(mk=>{
    const mon=new Date(mk+'T00:00:00');
    // colonnes : lun→ven, + sam/dim si créneaux ce jour-là
    let maxIdx=4; weeks[mk].forEach(d=>{ const i=(new Date(d.dateStr+'T00:00:00').getDay()+6)%7; if(i>maxIdx) maxIdx=i; });
    const cols=[]; for(let i=0;i<=maxIdx;i++) cols.push(i);
    const colHtml=cols.map(i=>{
      const dt=_addDays(mon,i); const ds=_ymd(dt); const day=byDate[ds];
      const blocks=(day?day.shifts:[]).map(s=>{
        const a=Math.max(_mins(s.debut),_CAL_START), b=Math.min(_mins(s.fin),_CAL_END);
        if(b<=a) return '';
        const st=_calStatusStyle(s.status);
        const top=(a-_CAL_START)*PX, hgt=(b-a)*PX;
        return `<div title="${_escA(s.site+' · '+s.debut+'–'+s.fin+(s.status!=='present'?' ('+_statusLabel(s)+')':''))}" style="position:absolute;left:2px;right:2px;top:${top}px;height:${Math.max(hgt,16)}px;background:${st.bg};border:1px solid ${st.bd};${st.solid?'':'background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,.04) 4px,rgba(0,0,0,.04) 8px);'}border-radius:5px;padding:3px 4px;overflow:hidden;box-sizing:border-box">
          <div style="font-size:10px;font-weight:700;color:${st.fg};line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escH(s.site)}</div>
          <div style="font-size:9px;color:${st.fg};opacity:.8">${s.debut}–${s.fin}</div>
        </div>`;
      }).join('');
      const idx=(dt.getDay()+6)%7;
      return `<div style="flex:1;min-width:58px;display:flex;flex-direction:column">
        <div style="text-align:center;font-size:11px;font-weight:700;color:var(--text2);padding-bottom:4px">${JOURS[idx]} ${dt.getDate()}</div>
        <div style="position:relative;height:${H}px;border-left:1px solid var(--border);${gridBg}">${blocks}</div>
      </div>`;
    }).join('');
    const wd=weeks[mk];
    const nShifts=wd.reduce((t,d)=>t+d.shifts.length,0);
    const wMin=wd.reduce((t,d)=>t+d.shifts.reduce((u,s)=>u+_shiftMin(s),0),0);
    return `<div style="border:1px solid var(--border);border-radius:11px;background:var(--card);overflow:hidden;margin-bottom:16px">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:9px 12px;background:var(--bg)">
        <div style="font-size:12.5px;font-weight:700">Semaine du ${fmtDate(mk)}</div>
        <div style="font-size:11.5px;color:var(--text3);font-variant-numeric:tabular-nums">${wd.length} jour${wd.length>1?'s':''} · ${nShifts} créneau${nShifts>1?'x':''} · ${_fmtDur(wMin)}</div>
      </div>
      <div style="display:flex;padding:10px 8px 12px 0">
        <div style="position:relative;width:38px;flex:none;margin-top:19px">${axisLabels.join('')}</div>
        ${colHtml}
      </div>
      ${withDetail?_expDayRows(wd):''}
    </div>`;
  }).join('');
}

function planningText(agentId, start, end){
  const days=computeAgentDays(agentId, start, end);
  let t=`PLANNING — ${agentNom(agentId)}\nDu ${fmtDate(start)} au ${fmtDate(end)}\n`;
  if(!days.length){ t+='\nAucun créneau prévu sur cette période.\n'; return t; }
  days.forEach(d=>{ t+='\n'+_longDate(d.dateStr)+'\n';
    d.shifts.forEach(s=>{ t+=`  • ${s.site} · ${s.debut}–${s.fin}${_pauseTxt(s)}`+(s.status!=='present'?`  (${s.note||_statusLabel(s)})`:'')+'\n'; });
  });
  t+='\nLa Conciergerie Solidaire';
  return t;
}

function expScopeAgents(){
  if(EXP.agentId) return [EXP.agentId];
  const withAffec=new Set(gaf().map(a=>a.agentId));
  gab().forEach(ab=>{ if(ab.remplacantId) withAffec.add(ab.remplacantId); });
  return ga().filter(a=>!a.inactif&&withAffec.has(a.id)).sort((a,b)=>a.nom.localeCompare(b.nom)).map(a=>a.id);
}

/* ─── ouverture / onglets ─── */
function openExport(){ EXP.agentId=''; EXP.ptType='tous'; expSelectTab('planning'); document.getElementById('export-modal').style.display='flex'; }
function closeExport(){ document.getElementById('export-modal').style.display='none'; }
function expSelectTab(t){
  EXP.tab=t;
  if(t==='planning'){ const m=getMonday(weekStart); EXP.start=_ymd(m); EXP.end=_ymd(_addDays(m,4)); }
  else { const n=new Date(); EXP.start=_ymd(new Date(n.getFullYear(),n.getMonth(),1)); EXP.end=_ymd(new Date(n.getFullYear(),n.getMonth()+1,0)); }
  document.getElementById('export-tabs').innerHTML=[['planning','Plannings agents'],['absences','Absences'],['pointage','Retards & H. Sup.']]
    .map(([k,l])=>`<button class="tab ${t===k?'on':''}" onclick="expSelectTab('${k}')">${l}</button>`).join('');
  document.getElementById('export-controls').innerHTML=expControls();
  expUpdate();
}
const _chipStyle="height:26px;padding:0 11px;border-radius:20px;border:1px solid var(--border);background:var(--bg);color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font)";
function expControls(){
  let extra='';
  if(EXP.tab==='planning'){
    const opts=`<option value="">Tous les agents</option>`+ga().filter(a=>!a.inactif).slice().sort((a,b)=>a.nom.localeCompare(b.nom)).map(a=>`<option value="${a.id}" ${EXP.agentId===a.id?'selected':''}>${_escH(a.nom)}</option>`).join('');
    extra=`<div class="form-group"><label class="form-label">Agent</label><select class="form-input" id="exp-agent" onchange="expUpdate()">${opts}</select></div>`;
  } else if(EXP.tab==='pointage'){
    extra=`<div class="form-group"><label class="form-label">Type d'événement</label><select class="form-input" id="exp-pttype" onchange="expUpdate()">
      <option value="tous" ${EXP.ptType==='tous'?'selected':''}>Tout (retards + heures sup.)</option>
      <option value="retard" ${EXP.ptType==='retard'?'selected':''}>Retards uniquement</option>
      <option value="hsup" ${EXP.ptType==='hsup'?'selected':''}>Heures sup. uniquement</option></select></div>`;
  }
  const chips = EXP.tab==='planning'
    ? [['Cette semaine','week0'],['Semaine prochaine','week1'],['2 semaines','week2']]
    : [['Ce mois','month0'],['Mois dernier','month-1'],['Cette année','year0']];
  return `${extra}
    <div class="form-row">
      <div class="form-group"><label class="form-label">Du</label><input type="date" class="form-input" id="exp-start" value="${EXP.start}" onchange="expUpdate()"></div>
      <div class="form-group"><label class="form-label">Au</label><input type="date" class="form-input" id="exp-end" value="${EXP.end}" onchange="expUpdate()"></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:-2px 0 2px">${chips.map(([l,k])=>`<button style="${_chipStyle}" onclick="expQuick('${k}')">${l}</button>`).join('')}</div>`;
}
function expQuick(k){
  let s,e; const n=new Date();
  if(k==='week0'){ s=getMonday(weekStart); e=_addDays(s,4); }
  else if(k==='week1'){ s=_addDays(getMonday(weekStart),7); e=_addDays(s,4); }
  else if(k==='week2'){ s=getMonday(weekStart); e=_addDays(s,11); }
  else if(k==='month0'){ s=new Date(n.getFullYear(),n.getMonth(),1); e=new Date(n.getFullYear(),n.getMonth()+1,0); }
  else if(k==='month-1'){ s=new Date(n.getFullYear(),n.getMonth()-1,1); e=new Date(n.getFullYear(),n.getMonth(),0); }
  else { s=new Date(n.getFullYear(),0,1); e=new Date(n.getFullYear(),11,31); }
  EXP.start=_ymd(s); EXP.end=_ymd(e);
  document.getElementById('exp-start').value=EXP.start; document.getElementById('exp-end').value=EXP.end;
  expUpdate();
}
function _expEmpty(msg){ return `<div style="text-align:center;padding:34px 16px;color:var(--text3);font-size:13px">${msg}</div>`; }

function expUpdate(){
  EXP.start=document.getElementById('exp-start').value;
  EXP.end=document.getElementById('exp-end').value;
  const ag=document.getElementById('exp-agent'); if(ag) EXP.agentId=ag.value;
  const pt=document.getElementById('exp-pttype'); if(pt) EXP.ptType=pt.value;
  const prev=document.getElementById('export-preview'), act=document.getElementById('export-actions');
  if(!EXP.start||!EXP.end||EXP.start>EXP.end){ prev.innerHTML=_expEmpty('Sélectionnez une période valide.'); act.innerHTML=''; return; }
  if(EXP.tab==='planning') expRenderPlanning(prev,act);
  else if(EXP.tab==='absences') expRenderAbsences(prev,act);
  else expRenderPointage(prev,act);
}

/* ─── PLANNING ─── */
function expRenderPlanning(prev,act){
  const ids=expScopeAgents();
  const periodLbl=`${fmtDate(EXP.start)} → ${fmtDate(EXP.end)}`;
  if(EXP.agentId){
    const days=computeAgentDays(EXP.agentId, EXP.start, EXP.end);
    const ag=ga().find(a=>a.id===EXP.agentId);
    let html=`<div style="font-size:12px;color:var(--text3);margin-bottom:10px">${_escH(ag?ag.nom:'')} · ${periodLbl}</div>`;
    if(!days.length){ html+=_expEmpty('Aucun créneau prévu sur cette période.'); }
    else html+=expWeekCalendar(days, true);
    prev.innerHTML=html;
    const hasEmail=ag&&ag.email;
    act.innerHTML=`
      <button class="btn btn-secondary" onclick="copyToClipboard(planningText('${EXP.agentId}',EXP.start,EXP.end))">Copier le texte</button>
      <button class="btn btn-secondary" onclick="expPrint(['${EXP.agentId}'])">Imprimer / PDF</button>
      <button class="btn btn-secondary" onclick="expCsvPlanning()">CSV</button>
      <button class="btn btn-primary" ${hasEmail?'':'disabled style="opacity:.45;cursor:not-allowed"'} onclick="expEmailPlanning('${EXP.agentId}')" title="${hasEmail?_escA(ag.email):'Aucun email renseigné pour cet agent'}">${hasEmail?'Envoyer par email':'Pas d\'email'}</button>`;
  } else {
    let html=`<div style="font-size:12px;color:var(--text3);margin-bottom:10px">${ids.length} agent(s) · ${periodLbl}</div>`;
    html+=ids.map(id=>{ const n=computeAgentDays(id,EXP.start,EXP.end).reduce((s,d)=>s+d.shifts.length,0);
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg);border:1px solid var(--border);border-radius:7px;margin-bottom:4px">
        <span style="font-weight:600;flex:1">${_escH(agentNom(id))}</span>
        <span style="color:var(--text2);font-size:12px">${n} créneau${n>1?'x':''}</span></div>`; }).join('') || _expEmpty('Aucun agent affecté.');
    html+=`<div style="font-size:12px;color:var(--text3);margin-top:10px">Choisissez un agent ci-dessus pour le détail jour par jour et l'envoi par email.</div>`;
    prev.innerHTML=html;
    act.innerHTML=`
      <button class="btn btn-secondary" onclick="copyToClipboard(expScopeAgents().map(id=>planningText(id,EXP.start,EXP.end)).join('\\n\\n──────────\\n\\n'))">Copier tout</button>
      <button class="btn btn-secondary" onclick="expPrint(expScopeAgents())">Imprimer / PDF</button>
      <button class="btn btn-primary" onclick="expCsvPlanning()">Télécharger CSV</button>`;
  }
}
function expCsvPlanning(){
  const rows=[['Agent','Date','Jour','Site','Début','Fin','Pause (min)','Heures travaillées','Statut','Note']];
  expScopeAgents().forEach(id=>{ computeAgentDays(id,EXP.start,EXP.end).forEach(d=>{
    d.shifts.forEach(s=>rows.push([agentNom(id), d.dateStr, d.full, s.site, s.debut, s.fin, _pauseOf(s)||'', _fmtDur(_shiftMin(s)), _statusLabel(s), s.note]));
  }); });
  downloadCSV(`plannings_${EXP.start}_${EXP.end}.csv`, rows);
}
function expEmailPlanning(id){
  const ag=ga().find(a=>a.id===id); if(!ag||!ag.email){ toast('Aucun email pour cet agent',false); return; }
  const subj=`Votre planning · ${fmtDate(EXP.start)} au ${fmtDate(EXP.end)}`;
  window.location.href=`mailto:${ag.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(planningText(id,EXP.start,EXP.end))}`;
}
function _mins(t){ const p=String(t).split(':'); return (+p[0])*60+(+p[1]||0); }
function _fmtDur(m){ return `${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}`; }
/* Pause déjeuner : optionnelle, en minutes, déduite du total d'heures (les horaires du créneau restent inchangés) */
function _isMaladie(s){ return (s.status==='absent'||s.status==='remplace') && /maladie/i.test(s.motif||''); }
/* Ventilation des heures : travaillé / maladie / congés / autres absences */
function _hBreak(shifts){
  const o={trav:0,mal:0,cong:0,autre:0};
  shifts.forEach(s=>{ const m=_shiftMin(s);
    if(s.status!=='absent'&&s.status!=='remplace'){ o.trav+=m; return; }
    const mo=String(s.motif||'').toLowerCase();
    if(mo.includes('maladie')) o.mal+=m; else if(mo.includes('cong')) o.cong+=m; else o.autre+=m; });
  return o;
}
function _hBreakTxt(b){
  return [['travaillé',b.trav],['maladie',b.mal],['congés',b.cong],['autres absences',b.autre]].filter(x=>x[1]).map(x=>x[0]+' '+_fmtDur(x[1])).join(' · ');
}
function _pauseOf(s){ return Math.max(0, Number(s&&s.pause)||0); }
function _shiftMin(s){ return Math.max(0, _mins(s.fin)-_mins(s.debut)-_pauseOf(s)); }
function _pauseTxt(s){ const p=_pauseOf(s); return p?` (pause ${p} min)`:''; }
function _statBadge(s){
  if(s.status==='present') return '';
  const c=s.status==='absent'?['#fdecea','#c0392b']:s.status==='remplace'?['#e8f6ef','#1e8e5a']:s.status==='remplacement'?['#e7f0fb','#2166c9']:['#f0ecfa','#6c4bd0'];
  return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:1px 8px;border-radius:10px;background:${c[0]};color:${c[1]};margin-left:8px;vertical-align:1px">${_escH(s.note||_statusLabel(s))}</span>`;
}
function expPrint(ids){
  const head=`<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #FCD727;padding-bottom:11px;margin-bottom:4px">
    <div><div style="font-size:23px;font-weight:800;letter-spacing:-.01em">Planning</div>
    <div style="color:#666;font-size:13px;margin-top:2px">Du ${fmtDate(EXP.start)} au ${fmtDate(EXP.end)}</div></div>
    <div style="text-align:right;font-size:12px;color:#999">La Conciergerie Solidaire</div></div>`;
  const body=head+ids.map((id,ai)=>{
    const days=computeAgentDays(id,EXP.start,EXP.end);
    const ag=ga().find(a=>a.id===id);
    const totMin=days.reduce((t,d)=>t+d.shifts.reduce((u,s)=>u+_shiftMin(s),0),0);
    const totB=_hBreak(days.flatMap(d=>d.shifts)); const totAbs=totB.mal+totB.cong+totB.autre;
    const weeks={};
    days.forEach(d=>{ const mk=_ymd(getMonday(new Date(d.dateStr+'T00:00:00'))); (weeks[mk]=weeks[mk]||[]).push(d); });
    const mondays=Object.keys(weeks).sort();
    const weeksHtml=mondays.map((mk,wi)=>{
      const wd=weeks[mk];
      const nShifts=wd.reduce((t,d)=>t+d.shifts.length,0);
      const wMin=wd.reduce((t,d)=>t+d.shifts.reduce((u,s)=>u+_shiftMin(s),0),0);
      const wB=_hBreak(wd.flatMap(d=>d.shifts)); const wAbs=wB.mal+wB.cong+wB.autre;
      const cMin=ag&&ag.contratHebdo?Math.round(ag.contratHebdo*60):0;
      const rows=wd.map(d=>{
        const dt=new Date(d.dateStr+'T00:00:00'); const idx=(dt.getDay()+6)%7;
        const dayMin=d.shifts.reduce((t,s)=>t+_shiftMin(s),0);
        return `<tr style="break-inside:avoid">
          <td style="vertical-align:top;padding:7px 10px;border-top:1px solid #ececec;width:112px;font-weight:700;font-size:13px;white-space:nowrap">${JOURS[idx]} ${dt.getDate()}</td>
          <td style="vertical-align:top;padding:7px 10px;border-top:1px solid #ececec">
            ${d.shifts.map(s=>`<div style="font-size:13px;line-height:1.5">
              <span style="display:inline-block;width:104px;font-variant-numeric:tabular-nums;color:#555">${s.debut}–${s.fin}</span>
              <span style="font-weight:600">${_escH(s.site)}</span>${_pauseOf(s)?`<span style="color:#8a7f55;font-size:11.5px"> · pause ${_pauseOf(s)} min</span>`:''}${_statBadge(s)}
            </div>`).join('')}
          </td>
          <td style="vertical-align:top;padding:7px 10px;border-top:1px solid #ececec;width:52px;text-align:right;font-size:12px;color:#888;font-variant-numeric:tabular-nums">${_fmtDur(dayMin)}</td>
        </tr>`;
      }).join('');
      return `<div style="${wi>0?'margin-top:16px;':''}border:1px solid #ececec;border-radius:7px;overflow:hidden;break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:baseline;background:#FCF7DC;border-left:4px solid #FCD727;padding:8px 12px">
          <span style="font-weight:700;font-size:14px">Semaine du ${fmtDate(mk)}</span>
          <span style="font-size:11.5px;color:#8a7f55;font-weight:600">${wd.length} jour${wd.length>1?'s':''} · ${nShifts} créneau${nShifts>1?'x':''} · ${_fmtDur(wMin)}${cMin?' / '+_fmtDur(cMin)+' contrat':''}${cMin&&wMin>cMin?' · <span style="color:#c0392b">dépassement +'+_fmtDur(wMin-cMin)+'</span>':''}</span>
        </div>
        ${wAbs?`<div style="font-size:11.5px;color:#555;padding:6px 12px;border-bottom:1px solid #ececec;background:#fafaf7">${_hBreakTxt(wB)}</div>`:''}
        ${_expPrintGrid(wd)}
        <table style="width:100%;border-collapse:collapse;margin:0">${rows}</table>
      </div>`;
    }).join('') || `<p style="color:#999;font-size:13px">Aucun créneau prévu sur la période.</p>`;
    return `<section style="${ai>0?'page-break-before:always;padding-top:6px;':''}margin-top:20px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
        <div><div style="font-size:18px;font-weight:800">${_escH(agentNom(id))}</div>
        ${ag&&ag.notes?`<div style="font-size:12px;color:#999;margin-top:1px">${_escH(ag.notes)}</div>`:''}</div>
        ${totMin?`<div style="font-size:12px;color:#555;text-align:right">Total période&nbsp;<strong style="font-size:15px;color:#1a1a1a">${_fmtDur(totMin)}</strong>${totAbs?`<div style="font-size:11.5px;color:#555;margin-top:2px">${_hBreakTxt(totB)}</div>`:''}</div>`:''}
      </div>${weeksHtml}</section>`;
  }).join('');
  _printDoc('Plannings', body);
}
function _printDoc(title, body){
  const w=window.open('','_blank'); if(!w){ toast('Autorisez les fenêtres pop-up',false); return; }
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;padding:34px;max-width:780px;margin:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    h1{font-size:21px;margin:0 0 2px}h2{font-size:15px;margin:24px 0 8px;border-bottom:2px solid #FCD727;padding-bottom:5px}
    .sub{color:#666;font-size:13px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
    th,td{text-align:left;padding:7px 9px;border-bottom:1px solid #e4e4e2}
    th{background:#f6f6f3;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#666}
    .muted{color:#999;font-size:13px}.tot{font-weight:700}
    @media print{@page{margin:14mm}}
  </style></head><body>${body}<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
  w.document.close();
}

/* ─── ABSENCES ─── */
function absencesInRange(){
  const s=new Date(EXP.start+'T00:00:00'), e=new Date(EXP.end+'T23:59:59');
  return gab().filter(ab=>{ const as=new Date(ab.dateDebut+'T00:00:00'); const ae=ab.dateFin?new Date(ab.dateFin+'T23:59:59'):new Date(ab.dateDebut+'T23:59:59'); return as<=e && ae>=s; })
    .sort((a,b)=>new Date(a.dateDebut)-new Date(b.dateDebut));
}
function _absStatut(a){ return a.remplacantId?('Remplacé · '+agentNom(a.remplacantId)):(a.needsReplacement?'Sans remplaçant':'Sans remplacement'); }
function expRenderAbsences(prev,act){
  const abs=absencesInRange();
  let html=`<div style="font-size:12px;color:var(--text3);margin-bottom:10px">${abs.length} absence(s) · ${fmtDate(EXP.start)} → ${fmtDate(EXP.end)}</div>`;
  if(!abs.length){ prev.innerHTML=html+_expEmpty('Aucune absence sur cette période.'); act.innerHTML=`<button class="btn btn-secondary" disabled style="opacity:.45">Télécharger CSV</button>`; return; }
  html+=abs.map(a=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg);border:1px solid var(--border);border-radius:7px;margin-bottom:4px">
      <span style="font-weight:600">${_escH(agentNom(a.agentId))}</span>
      <span class="badge badge-gray">${_escH(a.motif||'—')}</span>
      <span style="flex:1;color:var(--text2);font-size:12px">${fmtDate(a.dateDebut)}${a.dateFin?' → '+fmtDate(a.dateFin):''}</span>
      <span class="badge ${a.remplacantId?'badge-green':a.needsReplacement?'badge-red':'badge-gray'}">${_escH(_absStatut(a))}</span>
    </div>`).join('');
  prev.innerHTML=html;
  act.innerHTML=`
    <button class="btn btn-secondary" onclick="copyToClipboard(absencesInRange().map(a=>agentNom(a.agentId)+' · '+a.motif+' · '+fmtDate(a.dateDebut)+(a.dateFin?' → '+fmtDate(a.dateFin):'')+' · '+_absStatut(a)).join('\\n'))">Copier</button>
    <button class="btn btn-secondary" onclick="expPrintAbsences()">Imprimer / PDF</button>
    <button class="btn btn-primary" onclick="expCsvAbsences()">Télécharger CSV</button>`;
}
function expCsvAbsences(){
  const rows=[['Agent','Motif','Date début','Date fin','Site','Statut','Remplaçant','Besoin remplacement','Notes']];
  absencesInRange().forEach(a=>rows.push([agentNom(a.agentId), a.motif||'', a.dateDebut, a.dateFin||'', a.siteId?siteNom(a.siteId):'', a.remplacantId?'Remplacé':a.needsReplacement?'Sans remplaçant':'Sans remplacement', a.remplacantId?agentNom(a.remplacantId):'', a.needsReplacement?'Oui':'Non', a.notes||'']));
  downloadCSV(`absences_${EXP.start}_${EXP.end}.csv`, rows);
}
function expPrintAbsences(){
  const abs=absencesInRange();
  const rows=abs.map(a=>`<tr><td>${_escH(agentNom(a.agentId))}</td><td>${_escH(a.motif||'')}</td><td>${fmtDate(a.dateDebut)}${a.dateFin?' → '+fmtDate(a.dateFin):''}</td><td>${a.siteId?_escH(siteNom(a.siteId)):''}</td><td>${_escH(_absStatut(a))}</td></tr>`).join('');
  _printDoc('Absences', `<h1>Absences</h1><div class="sub">Du ${fmtDate(EXP.start)} au ${fmtDate(EXP.end)} · ${abs.length} absence(s)</div><table><thead><tr><th>Agent</th><th>Motif</th><th>Période</th><th>Site</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>`);
}

/* ─── RETARDS & H.SUP ─── */
function pointageInRange(){
  const s=new Date(EXP.start+'T00:00:00'), e=new Date(EXP.end+'T23:59:59');
  return gpt().filter(p=>{ const d=new Date(p.date+'T00:00:00'); return d>=s && d<=e && (EXP.ptType==='tous'||p.type===EXP.ptType); })
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
}
function expRenderPointage(prev,act){
  const pts=pointageInRange();
  const ret=pts.filter(p=>p.type==='retard'), hs=pts.filter(p=>p.type==='hsup');
  const sum=arr=>arr.reduce((s,p)=>s+Number(p.duree||0),0);
  let html=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center"><div style="font-size:19px;font-weight:800;color:var(--orange)">${ret.length} · ${sum(ret)}<span style="font-size:12px">min</span></div><div style="font-size:11px;color:var(--text2)">Retards</div></div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center"><div style="font-size:19px;font-weight:800;color:var(--blue)">${hs.length} · ${sum(hs)}<span style="font-size:12px">min</span></div><div style="font-size:11px;color:var(--text2)">Heures sup.</div></div>
  </div>`;
  html+=`<div style="font-size:12px;color:var(--text3);margin-bottom:8px">${pts.length} événement(s) · ${fmtDate(EXP.start)} → ${fmtDate(EXP.end)}</div>`;
  if(!pts.length){ prev.innerHTML=html+_expEmpty('Aucun événement sur cette période.'); act.innerHTML=`<button class="btn btn-secondary" disabled style="opacity:.45">Télécharger CSV</button>`; return; }
  html+=pts.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg);border:1px solid var(--border);border-radius:7px;margin-bottom:4px">
      <span style="font-weight:600">${_escH(agentNom(p.agentId))}</span>
      <span class="badge ${p.type==='retard'?'badge-orange':'badge-blue'}">${p.type==='retard'?'Retard':'H. Sup.'}</span>
      <span style="flex:1;color:var(--text2);font-size:12px">${fmtDate(p.date)}${p.siteId?' · '+_escH(siteNom(p.siteId)):''}</span>
      <span style="font-weight:600;font-size:12px">${p.duree} min</span>
    </div>`).join('');
  prev.innerHTML=html;
  act.innerHTML=`
    <button class="btn btn-secondary" onclick="copyToClipboard(pointageInRange().map(p=>fmtDate(p.date)+' · '+(p.type==='retard'?'Retard':'H.Sup')+' · '+agentNom(p.agentId)+' · '+p.duree+' min').join('\\n'))">Copier</button>
    <button class="btn btn-secondary" onclick="expPrintPointage()">Imprimer / PDF</button>
    <button class="btn btn-primary" onclick="expCsvPointage()">Télécharger CSV</button>`;
}
function expCsvPointage(){
  const pts=pointageInRange();
  const rows=[['Date','Type','Agent','Site','Durée (min)','Notes']];
  pts.forEach(p=>rows.push([p.date, p.type==='retard'?'Retard':'Heure sup.', agentNom(p.agentId), p.siteId?siteNom(p.siteId):'', p.duree, p.notes||'']));
  rows.push([]);
  rows.push(['Total retards (min)', pts.filter(p=>p.type==='retard').reduce((s,p)=>s+Number(p.duree||0),0)]);
  rows.push(['Total heures sup. (min)', pts.filter(p=>p.type==='hsup').reduce((s,p)=>s+Number(p.duree||0),0)]);
  downloadCSV(`retards_hsup_${EXP.start}_${EXP.end}.csv`, rows);
}
function expPrintPointage(){
  const pts=pointageInRange();
  const rows=pts.map(p=>`<tr><td>${fmtDate(p.date)}</td><td>${p.type==='retard'?'Retard':'Heure sup.'}</td><td>${_escH(agentNom(p.agentId))}</td><td>${p.siteId?_escH(siteNom(p.siteId)):''}</td><td>${p.duree} min</td></tr>`).join('');
  const tr=pts.filter(p=>p.type==='retard').reduce((s,p)=>s+Number(p.duree||0),0);
  const th=pts.filter(p=>p.type==='hsup').reduce((s,p)=>s+Number(p.duree||0),0);
  _printDoc('Retards & Heures sup.', `<h1>Retards &amp; Heures sup.</h1><div class="sub">Du ${fmtDate(EXP.start)} au ${fmtDate(EXP.end)} · ${pts.length} événement(s)</div><table><thead><tr><th>Date</th><th>Type</th><th>Agent</th><th>Site</th><th>Durée</th></tr></thead><tbody>${rows}<tr class="tot"><td colspan="4">Total retards</td><td>${tr} min</td></tr><tr class="tot"><td colspan="4">Total heures sup.</td><td>${th} min</td></tr></tbody></table>`);
}

