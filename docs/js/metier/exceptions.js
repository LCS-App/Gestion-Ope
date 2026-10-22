// Exceptions ponctuelles de planning (panneau jour)
/* ═══════════════════════════════════════
   EXCEPTIONS DE PLANNING (ponctuel, par date)
   except = { id, agentId, dateStr, type:'mod'|'del'|'add', affecId?, siteId?, debut?, fin?, notes?, createdAt }
   - 'mod' : modifie un créneau récurrent (affecId) ce jour-là (horaires/site)
   - 'del' : retire un créneau récurrent (affecId) ce jour-là (créneau libéré)
   - 'add' : ajoute un créneau ponctuel qui n'existe pas dans le récurrent
   Ne touche jamais au planning récurrent A/B.
═══════════════════════════════════════ */
function dayExceptions(agentId, dateStr){ return gex().filter(e=>e.agentId===agentId && e.dateStr===dateStr); }
function findAfException(agentId, dateStr, afId){ return gex().find(e=>e.agentId===agentId && e.dateStr===dateStr && e.affecId===afId && (e.type==='mod'||e.type==='del')); }

// Liste effective des créneaux d'un agent pour une date, exceptions appliquées
function effectiveShifts(agentId, dateStr, dayAffecs){
  const exs = dayExceptions(agentId, dateStr);
  const out = [];
  dayAffecs.forEach(af=>{
    const ex = exs.find(e=>e.affecId===af.id && (e.type==='mod'||e.type==='del'));
    if(ex && ex.type==='del') return; // créneau libéré ce jour
    if(ex && ex.type==='mod'){
      out.push({ id:af.id, afId:af.id, siteId:ex.siteId||af.siteId, debut:ex.debut, fin:ex.fin, pause:(ex.pause!=null&&ex.pause!=='')?Number(ex.pause):(af.pause||0), semaine:af.semaine, jours:af.jours, notes:ex.notes||af.notes, nature:ex.nature||af.nature, ex });
    } else {
      out.push({ id:af.id, afId:af.id, siteId:af.siteId, debut:af.debut, fin:af.fin, pause:af.pause||0, semaine:af.semaine, jours:af.jours, notes:af.notes, nature:af.nature });
    }
  });
  exs.filter(e=>e.type==='add').forEach(ex=>{
    out.push({ id:'ex-'+ex.id, afId:null, siteId:ex.siteId, debut:ex.debut, fin:ex.fin, pause:ex.pause||0, semaine:'toutes', jours:[], notes:ex.notes, nature:ex.nature, ex, isAdd:true });
  });
  return out.sort((a,b)=>_mins(a.debut)-_mins(b.debut));
}

// Lun→Ven de la semaine contenant dateStr, où le créneau récurrent est actif (pour "appliquer à la semaine")
function _weekDatesFor(dateStr, af){
  const mon=getMonday(new Date(dateStr+'T00:00:00'));
  const out=[];
  for(let i=0;i<5;i++){ const d=new Date(mon); d.setDate(d.getDate()+i);
    if(!af || _affActiveOn(af, d)) out.push(_ymd(d));
  }
  return out;
}

function segPickPlain(btn){ btn.parentElement.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
function pjGoRecurrent(agentId, dateStr){ const label=JOURS[(new Date(dateStr+'T00:00:00').getDay()+6)%7]; closePanel(); addAffectFromGrid(agentId, label); }

/* Panneau : ajuster le planning d'un agent pour UN jour (exception ponctuelle)
   raw = "agentId|dateStr|afId|exId" */
function buildPanelJour(body, footer, raw){
  const [agentId, dateStr, afId, exId] = raw.split('|');
  const agent=ga().find(a=>a.id===agentId);
  if(!agent){ body.innerHTML='<div class="empty"><div class="empty-text">Agent introuvable</div></div>'; return; }
  const dateLabel=new Date(dateStr+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  const af = afId ? gaf().find(a=>a.id===afId) : null;
  const existingMod = afId ? gex().find(e=>e.agentId===agentId && e.dateStr===dateStr && e.affecId===afId && e.type==='mod') : null;
  const addEx = exId ? gex().find(e=>e.id===exId) : null;
  const isNewAdd = !af && !addEx;

  let curSite = existingMod?.siteId || af?.siteId || addEx?.siteId || '';
  const curDebut = existingMod?.debut || af?.debut || addEx?.debut || '';
  const curFin = existingMod?.fin || af?.fin || addEx?.fin || '';
  const curNotes = (existingMod?.notes || addEx?.notes || '').replace(/"/g,'&quot;');
  const sites = gs().slice().sort((a,b)=>a.nom.localeCompare(b.nom)).map(s=>({v:s.id,l:s.nom}));

  document.getElementById('panel-title').textContent = af ? 'Modifier pour ce jour' : (addEx ? 'Créneau ponctuel' : 'Ajouter un créneau ce jour');

  body.innerHTML=`
    ${ isNewAdd ? `<div class="tabs" style="margin-bottom:16px"><button class="tab on">Passage sur site</button><button class="tab" onclick="openPanel('panel-evenement','new|${agentId}|${dateStr}')">Autre événement</button></div>` : '' }
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:6px">${dateLabel}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700">${agent.nom.charAt(0)}</div>
      <strong>${_escH(agent.nom)}</strong>
    </div>
    <div style="background:var(--blue-light);border:1px solid rgba(90,150,220,.32);border-radius:var(--radius);padding:10px 12px;margin-bottom:18px;font-size:12.5px;color:var(--text);line-height:1.45">
      <strong>Exception ponctuelle</strong> — ne change que ce jour, le planning récurrent A/B reste intact.
    </div>
    ${ isNewAdd ? `
    <div class="form-group">
      <label class="form-label">Portée</label>
      <div class="seg" id="pj-scope-seg">
        <button type="button" class="seg-btn active" data-scope="jour" onclick="segPickPlain(this)">Ce jour uniquement</button>
        <button type="button" class="seg-btn" data-scope="rec" onclick="pjGoRecurrent('${agentId}','${dateStr}')">Toutes les semaines…</button>
      </div>
    </div>` : '' }
    <div class="form-group">
      <label class="form-label">Site *</label>
      <select class="form-input" id="pj-site"></select>
    </div>
    <div class="form-group">
      <label class="form-label">Type d'intervention</label>
      ${_natSegHtml('pj-nat', (existingMod&&existingMod.nature)? natureOf(existingMod) : af? natureOf(af) : addEx? natureOf(addEx) : _natDefaultFor(agentId))}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Début *</label><input class="form-input" type="time" id="pj-debut" value="${curDebut}"></div>
      <div class="form-group"><label class="form-label">Fin *</label><input class="form-input" type="time" id="pj-fin" value="${curFin}"></div>
    </div>
    <div class="form-group"><label class="form-label">Note (optionnel)</label><input class="form-input" type="text" id="pj-notes" value="${curNotes}" placeholder="ex : Campus ouvert le matin seulement"></div>
    ${ afId ? `<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:2px">
      <input type="checkbox" id="pj-week"> Appliquer à toute la semaine (Lun→Ven)
    </label>` : '' }`;

  fillSel('pj-site', sites, 'Choisir un site');
  document.getElementById('pj-site').value = curSite || '';

  // Actions secondaires
  let extra='';
  if(af){
    extra += `<button class="btn btn-danger btn-sm" style="width:100%;margin-top:16px" onclick="freeDayException('${agentId}','${dateStr}','${afId}')">Libérer ce créneau ce jour (retirer l'agent)</button>`;
    if(existingMod) extra += `<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:8px" onclick="revertDayException('${agentId}','${dateStr}','${afId}')">↺ Revenir au planning normal</button>`;
  } else if(addEx){
    extra += `<button class="btn btn-danger btn-sm" style="width:100%;margin-top:16px" onclick="deleteAddException('${exId}')">Supprimer ce créneau</button>`;
  }
  if(extra) body.insertAdjacentHTML('beforeend', extra);

  let mainBtn;
  if(af) mainBtn = `<button class="btn btn-primary" onclick="saveDayException('${agentId}','${dateStr}','${afId}')">Enregistrer ce jour</button>`;
  else if(addEx) mainBtn = `<button class="btn btn-primary" onclick="saveAddException('${exId}','${agentId}','${dateStr}')">Enregistrer</button>`;
  else mainBtn = `<button class="btn btn-primary" onclick="saveAddException('','${agentId}','${dateStr}')">Ajouter ce jour</button>`;
  footer.innerHTML = `<button class="btn btn-secondary" onclick="closePanel()">Annuler</button>${mainBtn}`;
}

function _pjReadForm(){
  return {
    siteId: document.getElementById('pj-site').value,
    debut: document.getElementById('pj-debut').value,
    fin: document.getElementById('pj-fin').value,
    notes: (document.getElementById('pj-notes').value||'').trim(),
    week: !!document.getElementById('pj-week')?.checked,
    nature: _natSegVal('pj-nat')
  };
}

function saveDayException(agentId, dateStr, afId){
  const f=_pjReadForm();
  if(!f.siteId||!f.debut||!f.fin){ toast('Site et horaires requis',false); return; }
  const af=gaf().find(a=>a.id===afId);
  const dates = f.week ? _weekDatesFor(dateStr, af) : [dateStr];
  let arr=gex();
  dates.forEach(ds=>{
    arr = arr.filter(e=>!(e.agentId===agentId && e.dateStr===ds && e.affecId===afId));
    arr.push({ id:DB.id(), agentId, dateStr:ds, type:'mod', affecId:afId, siteId:f.siteId, debut:f.debut, fin:f.fin, notes:f.notes, nature:f.nature, createdBy:getCurrentUser(), createdAt:new Date().toISOString() });
  });
  sex(arr); closePanel();
  toast(f.week?'Exception appliquée à la semaine':'Exception enregistrée pour ce jour'); renderPlanning();
}

function freeDayException(agentId, dateStr, afId){
  const week = !!document.getElementById('pj-week')?.checked;
  const af=gaf().find(a=>a.id===afId);
  const dates = week ? _weekDatesFor(dateStr, af) : [dateStr];
  let arr=gex();
  dates.forEach(ds=>{
    arr = arr.filter(e=>!(e.agentId===agentId && e.dateStr===ds && e.affecId===afId));
    arr.push({ id:DB.id(), agentId, dateStr:ds, type:'del', affecId:afId, createdBy:getCurrentUser(), createdAt:new Date().toISOString() });
  });
  sex(arr); closePanel();
  toast(week?'Créneau libéré sur la semaine':'Créneau libéré ce jour'); renderPlanning();
}

function revertDayException(agentId, dateStr, afId){
  const week = !!document.getElementById('pj-week')?.checked;
  const dates = week ? _weekDatesFor(dateStr, gaf().find(a=>a.id===afId)) : [dateStr];
  sex(gex().filter(e=>!(e.agentId===agentId && dates.includes(e.dateStr) && e.affecId===afId)));
  closePanel(); toast('Retour au planning normal'); renderPlanning();
}

function saveAddException(exId, agentId, dateStr){
  const f=_pjReadForm();
  if(!f.siteId||!f.debut||!f.fin){ toast('Site et horaires requis',false); return; }
  let arr=gex();
  if(exId){ const i=arr.findIndex(e=>e.id===exId); if(i>=0) arr[i]={...arr[i], siteId:f.siteId, debut:f.debut, fin:f.fin, notes:f.notes, nature:f.nature}; }
  else { arr.push({ id:DB.id(), agentId, dateStr, type:'add', siteId:f.siteId, debut:f.debut, fin:f.fin, notes:f.notes, nature:f.nature, createdBy:getCurrentUser(), createdAt:new Date().toISOString() }); }
  sex(arr); closePanel(); toast('Créneau ponctuel enregistré'); renderPlanning();
}

function deleteAddException(exId){ sex(gex().filter(e=>e.id!==exId)); closePanel(); toast('Créneau supprimé'); renderPlanning(); }

