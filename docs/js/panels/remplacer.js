// Panneau remplacement + contrats/affectations actives
/* ═══════════════════════════════════════
   PANEL — REMPLACER
═══════════════════════════════════════ */
/* — Détection de disponibilité d'un remplaçant — */
function _replDateRange(startStr,endStr){
  const out=[]; if(!startStr) return out;
  const s=new Date(startStr+'T00:00:00'), e=new Date((endStr||startStr)+'T00:00:00');
  let guard=0;
  for(let d=new Date(s); d<=e && guard<400; d.setDate(d.getDate()+1), guard++) out.push(new Date(d));
  return out;
}
/* Dates de contrat de l'agent : bornent toutes ses affectations (planning + couverture). */
let _contratMap=null, _contratRef=null;
const _CONTRAT_ALERTE_J=30; // alerte fin de contrat : 1 mois glissant
function _contratOf(agentId){
  const ags=ga();
  if(!_contratMap||_contratRef!==ags){ _contratRef=ags; _contratMap=new Map(ags.filter(a=>a.contratDebut||a.contratFin).map(a=>[a.id,a])); }
  return _contratMap.get(agentId)||null;
}
function _contratInRange(agentId,date){
  const c=_contratOf(agentId); if(!c) return true;
  const ymd=_ymd(date);
  if(c.contratDebut && ymd<c.contratDebut) return false;
  if(c.contratFin && ymd>c.contratFin) return false;
  return true;
}
function _affActiveOn(af,date,ignoreFutureEnd){
  const label=JOURS[(date.getDay()+6)%7];
  if(!af.jours||!af.jours.includes(label)) return false;
  if(!_affInRange(af,date)) return false;
  if(!_contratInRange(af.agentId,date)){
    // Fin de contrat pas encore atteinte : la couverture théorique la garde, pour que le trou ressorte en alerte sur les semaines concernées.
    const c=_contratOf(af.agentId);
    const lim=new Date(); lim.setDate(lim.getDate()+_CONTRAT_ALERTE_J);
    const td=_ymd(new Date()), ds=_ymd(date);
    const futureEnd=c&&c.contratFin&&c.contratFin>=td&&ds<=_ymd(lim)&&!(c.contratDebut&&ds<c.contratDebut);
    const futureStart=c&&c.contratDebut&&c.contratDebut>td&&ds<c.contratDebut&&!(c.contratFin&&ds>c.contratFin);
    if(!(ignoreFutureEnd&&(futureEnd||futureStart))) return false;
  }
  const isA=isWeekA(date);
  if(af.semaine==='A'&&!isA) return false;
  if(af.semaine==='B'&&isA) return false;
  return true;
}
// Période de validité de l'affectation : dateDebut obligatoire, dateFin optionnelle (vide = permanente)
function _affInRange(af,date){
  const ymd=_ymd(date);
  if(af.dateDebut && ymd<af.dateDebut) return false;
  if(af.dateFin && ymd>af.dateFin) return false;
  return true;
}
function _dFr(ymd){ if(!ymd) return ''; const[y,m,d]=ymd.split('-'); return `${d}/${m}/${y}`; }
function _contratLabel(a,fs){
  if(!a||(!a.contratDebut&&!a.contratFin&&!a.contratHebdo)) return '';
  const today=_ymd(new Date());
  const vol=a.contratHebdo?_fmtDur(Math.round(a.contratHebdo*60))+' / sem.':'';
  let txt = !a.contratDebut&&!a.contratFin ? 'Contrat '+vol : a.contratDebut&&a.contratFin ? 'Contrat du '+_dFr(a.contratDebut)+' au '+_dFr(a.contratFin)
    : a.contratDebut ? 'Contrat depuis le '+_dFr(a.contratDebut) : "Contrat jusqu'au "+_dFr(a.contratFin);
  let col='var(--text2)', tag='';
  if(a.contratDebut && today<a.contratDebut){ tag='à venir'; col='var(--blue)'; }
  else if(a.contratFin && today>a.contratFin){ tag='terminé'; col='var(--red)'; }
  else if(a.contratFin){ const j=Math.round((new Date(a.contratFin+'T00:00:00')-new Date(today+'T00:00:00'))/864e5); if(j<=30){ tag='fin dans '+j+' j'; col='var(--orange,#C77700)'; } }
  if(vol && (a.contratDebut||a.contratFin)) txt+=' · '+vol;
  return `<div style="font-size:${fs||12}px;color:${col};margin-bottom:${fs>12?8:3}px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg> ${txt}${tag?' · <strong>'+tag+'</strong>':''}</div>`;
}
function _affPeriodLabel(af){
  if(!af.dateDebut && !af.dateFin) return '';
  if(af.dateDebut && !af.dateFin) return `<span class="semaine-tag semaine-all">Depuis ${_dFr(af.dateDebut)}</span>`;
  if(af.dateDebut && af.dateFin) return `<span class="semaine-tag semaine-all">${_dFr(af.dateDebut)} → ${_dFr(af.dateFin)}</span>`;
  return `<span class="semaine-tag semaine-all">Jusqu'au ${_dFr(af.dateFin)}</span>`;
}
function _timeOverlap(a1,f1,a2,f2){ return _mins(a1)<_mins(f2) && _mins(a2)<_mins(f1); }
function _sameDay(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
/* Créneaux réellement couverts par une absence (postes de l'absent sur la période) */
function _absenceShifts(absence){
  const shifts=[]; const afs=gaf().filter(a=>a.agentId===absence.agentId);
  _replDateRange(absence.dateDebut,absence.dateFin).forEach(date=>{
    afs.forEach(af=>{ if(_affActiveOn(af,date)) shifts.push({date:new Date(date),debut:af.debut,fin:af.fin,pause:af.pause||0,siteId:af.siteId,afId:af.id}); });
  });
  return shifts;
}
/* ── Remplacement par bloc (les blocs = affectations de l'agent, ex. matin / après-midi) ── */
function _replFor(ab, key){
  if(!ab) return null;
  if(ab.remplacants){
    if(Object.prototype.hasOwnProperty.call(ab.remplacants, key)) return ab.remplacants[key]||null; // override explicite (null = à couvrir)
    const afId=String(key).split('@')[0]; // compat anciennes données clé=afId seul (toute la période)
    if(afId!==key && Object.prototype.hasOwnProperty.call(ab.remplacants, afId)) return ab.remplacants[afId]||null;
    return null; // mode par bloc actif : bloc non renseigné = à couvrir, pas de repli sur le remplaçant global
  }
  return ab.remplacantId||null;
}
/* Bloc = une occurrence datée d'une affectation de l'agent absent (ex. « matin » un jour précis).
   La clé composite afId@date permet un remplaçant différent par jour sur une absence multi-jours. */
function _blockKey(afId,date){ return afId+'@'+_isoDate(date); }
function _absenceBlocks(ab){
  const out=[];
  const afs=gaf().filter(a=>a.agentId===ab.agentId);
  _replDateRange(ab.dateDebut,ab.dateFin).forEach(date=>{
    afs.forEach(af=>{ if(_affActiveOn(af,date)) out.push({key:_blockKey(af.id,date), afId:af.id, date:new Date(date), siteId:af.siteId, debut:af.debut, fin:af.fin, pause:af.pause||0}); });
  });
  out.sort((a,b)=> a.date-b.date || _mins(a.debut)-_mins(b.debut));
  return out;
}
function _absenceCovered(ab){ const b=_absenceBlocks(ab); return b.length>0 && b.every(x=>_replFor(ab,x.key)); }
function _absenceUrgent(ab){ return ab.needsReplacement && !ab.ignored && !_absenceCovered(ab); }
function _absenceAnyRepl(ab){ return _absenceBlocks(ab).some(x=>_replFor(ab,x.key)); }
function _absenceReplNames(ab){
  const names=[], seen=new Set();
  _absenceBlocks(ab).forEach(x=>{ const r=_replFor(ab,x.key); if(r&&!seen.has(r)){ seen.add(r); names.push(agentNom(r)); } });
  return names;
}
/* Créneaux qu'un agent couvre comme remplaçant, tous blocs/absences confondus */
function _agentCoveredShifts(candId, exceptAbsId){
  const out=[];
  gab().forEach(ab=>{
    if(exceptAbsId && ab.id===exceptAbsId) return;
    _absenceShifts(ab).forEach(s=>{ if(_replFor(ab,_blockKey(s.afId,s.date))===candId) out.push({date:s.date,debut:s.debut,fin:s.fin,pause:s.pause||0,siteId:s.siteId,agentAbsent:ab.agentId}); });
  });
  return out;
}
/* Renvoie le 1er conflit trouvé si `candId` est affecté à couvrir `absence`, sinon null */
function replacerConflict(candId,absence,onlyKey){
  let shifts=_absenceShifts(absence);
  if(onlyKey) shifts=shifts.filter(s=>_blockKey(s.afId,s.date)===onlyKey); // contrôle limité au bloc sélectionné
  if(!shifts.length) return null; // aucun créneau connu → indétectable, on laisse passer
  const candAffs=gaf().filter(a=>a.agentId===candId);
  const otherShiftLists=onlyKey ? [_agentCoveredShifts(candId, absence.id)]
    : gab().filter(a=>a.id!==absence.id && a.remplacantId===candId)
    .map(oa=>_absenceShifts(oa).map(s=>({...s,agentAbsent:oa.agentId})));
  for(const sh of shifts){
    for(const af of candAffs){
      if(_affActiveOn(af,sh.date) && _timeOverlap(sh.debut,sh.fin,af.debut,af.fin))
        return {type:'poste',date:sh.date,debut:af.debut,fin:af.fin,siteId:af.siteId};
    }
    for(const list of otherShiftLists){
      for(const os of list){
        if(_sameDay(os.date,sh.date) && _timeOverlap(sh.debut,sh.fin,os.debut,os.fin))
          return {type:'remplacement',date:sh.date,debut:os.debut,fin:os.fin,siteId:os.siteId,agentAbsent:os.agentAbsent};
      }
    }
  }
  return null;
}
function _confShort(c){ const d=c.date; return `${JOURS[(d.getDay()+6)%7]} ${d.getDate()} · ${c.debut}–${c.fin}`; }
function _confWhere(c){ return c.type==='poste' ? `son poste fixe à « ${siteNom(c.siteId)} »` : `un autre remplacement (absence de ${agentNom(c.agentAbsent)})`; }

/* Candidats remplaçants pour une absence (réelle ou en cours de saisie) :
   multisites + agents formés sur le(s) site(s) concerné(s), triés dispo/formés d'abord. */
function _replOptions(absenceLike){
  let targetSites=[];
  if(absenceLike.siteId) targetSites=[absenceLike.siteId];
  else if(absenceLike.agentId) targetSites=[...new Set(gaf().filter(a=>a.agentId===absenceLike.agentId).map(a=>a.siteId))];
  const compKnown = ga().some(a=>(a.competences||[]).length);
  const isComp=(a)=> targetSites.length>0 && (a.competences||[]).some(c=>targetSites.includes(c));
  const cands=ga().filter(a=> !a.inactif && a.id!==absenceLike.agentId && (a.remplacant || isRespOpe(a) || (compKnown && isComp(a))))
    .map(a=>({v:a.id, nom:a.nom, comp:isComp(a), rempl:!!a.remplacant||isRespOpe(a), conf: absenceLike.dateDebut? replacerConflict(a.id, absenceLike):null}));
  cands.sort((x,y)=> (x.conf?1:0)-(y.conf?1:0) || (x.comp?0:1)-(y.comp?0:1) || x.nom.localeCompare(y.nom));
  return cands;
}
function _replOptionLabel(c){
  const tags=[];
  if(c.comp) tags.push('✓ formé'); else tags.push('○ non formé');
  if(c.conf) tags.push('⚠ occupé ('+_confShort(c.conf)+')');
  return c.nom+'  —  '+tags.join('  ·  ');
}
function prCheckConflict(){
  const sel=document.getElementById('pr-agent'), note=document.getElementById('pr-conflict-note');
  if(!sel||!note) return;
  const c=(window._prConf||{})[sel.value];
  if(c){
    note.style.display='block';
    const free=window._prFree;
    const cta = free ? `<button class="btn btn-secondary btn-sm" style="margin-top:10px;border-color:var(--green);color:var(--green)" onclick="prPickFree()"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M20 6L9 17l-5-5"/></svg> Prendre ${_escH(free.nom.split(' ')[0])}, disponible${free.comp?' et formé':''}</button>` : `<div style="margin-top:8px;font-size:11.5px;color:var(--text2)">Aucun autre remplaçant libre sur ce créneau — confirmez si c'est volontaire.</div>`;
    note.innerHTML=`<strong>⚠ Déjà occupé</strong> le ${_confShort(c)} — ${_confWhere(c)}.${cta}`;
  } else { note.style.display='none'; note.innerHTML=''; }
}
function prPickFree(){
  const sel=document.getElementById('pr-agent'); const free=window._prFree;
  if(sel&&free){ sel.value=free.v; prCheckConflict(); }
}
function goNextAbsence(){
  const urgent=gab().filter(_absenceUrgent).sort((a,b)=>new Date(a.dateDebut)-new Date(b.dateDebut));
  if(!urgent.length){ toast('Plus aucune absence à couvrir 🎉'); return; }
  const curId=String(currentPanelData||'').split('|')[0];
  const idx=urgent.findIndex(a=>a.id===curId);
  if(urgent.length===1 && idx===0){ toast('C\'est la seule absence à couvrir'); return; }
  _focusAbsence(urgent[(idx+1)%urgent.length]);
}
function buildPanelRemplacer(body,footer,raw){
  const [absId,focusAf]=String(raw).split('|');
  const absence=gab().find(a=>a.id===absId);
  if(!absence){ body.innerHTML='Absence introuvable'; return; }
  const blocks=_absenceBlocks(absence);
  const cands=_replOptions(absence);
  window._prConf={}; cands.forEach(c=>{ if(c.conf) window._prConf[c.v]=c.conf; });
  const opts=['<option value="">— À couvrir —</option>'].concat(cands.map(c=>`<option value="${c.v}">${_escH(_replOptionLabel(c))}</option>`)).join('');
  // Conflits calculés bloc par bloc (jour + créneau), pas sur toute la période
  window._prBlockConf={};
  blocks.forEach(b=>{ const m={}; cands.forEach(c=>{ const cf=replacerConflict(c.v,absence,b.key); if(cf) m[c.v]=cf; }); window._prBlockConf[b.key]=m; });
  const blockOpts=(key)=>{ const m=window._prBlockConf[key]||{}; return ['<option value="">— À couvrir —</option>'].concat(cands.map(c=>`<option value="${c.v}">${_escH(_replOptionLabel({...c,conf:m[c.v]||null}))}</option>`)).join(''); };
  const multiJours = blocks.length>0 && _isoDate(blocks[0].date)!==_isoDate(blocks[blocks.length-1].date);
  // Regroupement par jour pour ne pas mélanger les créneaux entre plusieurs journées
  const byDay=new Map();
  blocks.forEach(b=>{ const k=_isoDate(b.date); if(!byDay.has(k)) byDay.set(k,[]); byDay.get(k).push(b); });
  const dayGroups=[...byDay.entries()].map(([iso,bs])=>{
    const label=_cap(bs[0].date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}));
    const rows=bs.map(b=>`
      <div class="pr-block-row" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px${focusAf===b.key?';box-shadow:inset 0 0 0 2px var(--blue)':''}">
        <div style="font-size:12.5px;font-weight:700;margin-bottom:7px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="5" y="3" width="14" height="18" rx="1.6"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2"/></svg> ${_escH(siteNom(b.siteId))} · ${b.debut}–${b.fin}</div>
        <select class="form-input pr-block" data-af="${b.key}" data-day="${iso}" onchange="prCheckBlock(this)">${blockOpts(b.key)}</select>
        <div class="pr-block-note" style="display:none;margin-top:6px;font-size:11.5px;color:var(--red);line-height:1.4"></div>
      </div>`).join('');
    return `
      <div class="pr-day-group" style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:var(--radius)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text2)">${_escH(label)}</div>
          ${bs.length>1?`<select class="form-input" style="width:auto;max-width:58%;font-size:11.5px;padding:5px 8px" onchange="prApplyDay('${iso}',this.value)"><option value="">Même remplaçant ce jour…</option>${cands.map(c=>`<option value="${c.v}">${_escH(c.nom)}</option>`).join('')}</select>`:''}
        </div>
        ${rows}
      </div>`;
  }).join('');
  body.innerHTML=`
    <div style="background:var(--red-light);border:1px solid rgba(226,109,99,.32);border-radius:var(--radius);padding:14px;margin-bottom:18px;font-size:13px">
      <div style="float:right;margin:-4px -4px 4px 10px">${absenceActionsHTML(absId,{day:focusAf?String(focusAf).split('@')[1]:''})}</div>
      <div style="font-weight:600;color:var(--red);margin-bottom:4px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M12 3.6l9 15.4H3z"/><path d="M12 9.6v4.6M12 17.2v.4"/></svg> Attribuer un remplaçant</div>
      <div><strong>Agent :</strong> ${_escH(agentNom(absence.agentId))}</div>
      <div><strong>Période :</strong> ${fmtDate(absence.dateDebut)}${absence.dateFin?' → '+fmtDate(absence.dateFin):''}</div>
      <div><strong>Motif :</strong> ${_escH(absence.motif)}</div>
    </div>
    ${multiJours?`<div class="form-group">
      <label class="form-label">Même remplaçant sur toute la période</label>
      <select class="form-input" id="pr-allday" onchange="prApplyAllDay(this.value)">${opts}</select>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Applique à tous les blocs, tous jours confondus. Ajustez ensuite jour par jour ou bloc par bloc si besoin.</div>
    </div>`:''}
    <div class="form-group">
      <input class="form-input" type="text" id="pr-search" placeholder="Rechercher un remplaçant…" autocomplete="off" oninput="_filterSelectOptions(document.querySelectorAll('#side-panel .pr-block, #pr-allday'),this.value)">
    </div>
    <div class="form-section">Blocs à couvrir</div>
    ${dayGroups||'<div style="font-size:12px;color:var(--text3);margin-bottom:12px">Aucun bloc de planning identifié pour cet agent sur la période.</div>'}
    <div class="form-group" style="margin-top:6px">
      <label class="form-label">Notes pour le(s) remplaçant(s)</label>
      <textarea class="form-input" id="pr-notes" placeholder="Informations pratiques, consignes…">${_escH(absence.replNotes||'')}</textarea>
    </div>`;
  body.querySelectorAll('.pr-block').forEach(sel=>{ sel.value=_replFor(absence, sel.dataset.af)||''; prCheckBlock(sel); });
  footer.innerHTML=`
    <button class="btn btn-secondary" onclick="closePanel()">Annuler</button>
    <button class="btn btn-primary" onclick="confirmerRepl('${absId}')">Enregistrer</button>`;
}
function ignorerAbsence(absId){ toggleIgnorerAbsence(absId); }
function _filterSelectOptions(sel,q){
  q=q.trim().toLowerCase();
  const els=typeof sel==='string'?[document.getElementById(sel)].filter(Boolean):[...sel];
  els.forEach(el=>{ [...el.options].forEach(o=>{ if(!o.value) return; o.hidden=!!q && !o.textContent.toLowerCase().includes(q); }); });
}
function prApplyAllDay(v){ document.querySelectorAll('#side-panel .pr-block').forEach(sel=>{ sel.value=v; prCheckBlock(sel); }); }
function prApplyDay(iso,v){ document.querySelectorAll(`#side-panel .pr-block[data-day="${iso}"]`).forEach(sel=>{ sel.value=v; prCheckBlock(sel); }); }
function prCheckBlock(sel){
  const row=sel.closest('.pr-block-row'); const note=row?row.querySelector('.pr-block-note'):null; if(!note) return;
  const c=((window._prBlockConf||{})[sel.dataset.af]||{})[sel.value];
  if(sel.value && c){ note.style.display='block'; note.innerHTML=`⚠ ${_escH(agentNom(sel.value).split(' ')[0])} déjà occupé le ${_confShort(c)} — ${_confWhere(c)}.`; }
  else { note.style.display='none'; note.innerHTML=''; }
}
function confirmerRepl(absId){
  const abs=gab(); const absence=abs.find(a=>a.id===absId); if(!absence) return;
  const rows=[...document.querySelectorAll('#side-panel .pr-block')];
  if(!rows.length){ toast('Aucun bloc à attribuer',false); return; }
  const notes=document.getElementById('pr-notes')?document.getElementById('pr-notes').value:'';
  // Contrôle de chevauchement (au moins un bloc en conflit) → confirmation unique
  const _bc=s=>((window._prBlockConf||{})[s.dataset.af]||{})[s.value];
  const confRow=rows.find(s=>s.value && _bc(s));
  if(confRow){ const c=_bc(confRow); if(!confirm(`⚠ ${agentNom(confRow.value)} est déjà occupé le ${_confShort(c)}\n(${_confWhere(c)}).\n\nEnregistrer quand même ?`)) return; }
  absence.remplacants=absence.remplacants||{};
  let r=gr().filter(x=>!(x.agentAbsentId===absence.agentId && x.date===absence.dateDebut));
  const blocks=_absenceBlocks(absence);
  rows.forEach(sel=>{
    const af=sel.dataset.af, v=sel.value||null;
    absence.remplacants[af]=v;
    if(v){
      const b=blocks.find(x=>x.key===af);
      r.push({id:DB.id(),agentAbsentId:absence.agentId,remplacantId:v,siteId:(b&&b.siteId)||absence.siteId||'',afId:(b&&b.afId)||af,date:absence.dateDebut,notes,statut:'confirme',createdAt:new Date().toISOString()});
    }
  });
  const vals=rows.map(s=>s.value||null);
  if(vals.length && vals.every(v=>v && v===vals[0])) absence.remplacantId=vals[0];
  absence.replNotes=notes;
  sab(abs); sr(r);
  closePanel();
  toast(vals.some(v=>v)?'Remplacement enregistré ✓':'Blocs remis à couvrir');
  refreshAfterAbsenceChange();
}
function retirerRemplacementBloc(absId, afId){
  const abs=gab(); const ab=abs.find(a=>a.id===absId); if(!ab) return;
  const prev=_replFor(ab,afId); if(!prev){ closePanel(); return; }
  if(!confirm(`Retirer le remplacement de ${agentNom(prev).split(' ')[0]} sur ce bloc ?\n\nL'absence reste enregistrée et le bloc redevient « à couvrir ».`)) return;
  ab.remplacants=ab.remplacants||{}; ab.remplacants[afId]=null; sab(abs);
  sr(gr().filter(x=>!(x.agentAbsentId===ab.agentId && x.remplacantId===prev && x.date===ab.dateDebut && (x.afId||null)===afId)));
  closePanel(); toast('Remplacement retiré — bloc à couvrir');
  refreshAfterAbsenceChange();
}

