// Panneau saisie absence
/* ═══════════════════════════════════════
   PANEL — ABSENCE
═══════════════════════════════════════ */
let absNeedsRepl=true;

let editAbsId=null;
function buildPanelAbsence(body,footer){
  editAbsId=null;
  const agents=ga().filter(a=>!a.inactif).map(a=>({v:a.id,l:a.nom}));
  const today=new Date().toISOString().split('T')[0];
  body.innerHTML=`
    <div class="form-group">
      <label class="form-label">Agent absent *</label>
      <select class="form-input" id="pa-agent"></select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date début *</label>
        <input class="form-input" type="date" id="pa-debut" value="${today}">
      </div>
      <div class="form-group">
        <label class="form-label">Date fin</label>
        <input class="form-input" type="date" id="pa-fin">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Motif</label>
      <select class="form-input" id="pa-motif">
        <option value="maladie">Maladie</option>
        <option value="conges">Congés</option>
        <option value="formation">Formation</option>
        <option value="autre">Autre</option>
      </select>
    </div>
    <div class="divider"></div>
    <div class="form-group">
      <div class="toggle-row">
        <button class="toggle on" id="pa-toggle" onclick="this.classList.toggle('on');absNeedsRepl=this.classList.contains('on');document.getElementById('pa-repl-section').style.display=absNeedsRepl?'block':'none'"></button>
        <span class="toggle-label">Remplacement nécessaire</span>
      </div>
    </div>
    <div id="pa-repl-section">
      <div class="form-group">
        <label class="form-label">Créneaux concernés</label>
        <div id="pa-creneaux" style="font-size:12px;color:var(--text3)">Sélectionnez un agent</div>
      </div>
      <div class="form-group">
        <label class="form-label">Remplaçant</label>
        <input class="form-input" type="text" id="pa-rempl-search" placeholder="Rechercher un remplaçant…" autocomplete="off" oninput="_filterSelectOptions('pa-rempl',this.value)" style="margin-bottom:6px">
        <select class="form-input" id="pa-rempl" onchange="paCheckConflict()"></select>
        <div id="pa-conflict-note" style="display:none;background:var(--red-light);border:1px solid rgba(226,109,99,.32);border-radius:var(--radius-sm);padding:10px 12px;margin-top:10px;font-size:12.5px;color:var(--red);line-height:1.45"></div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-input" id="pa-notes" placeholder="Informations complémentaires…"></textarea>
    </div>`;

  fillSel('pa-agent',agents,'Choisir un agent');
  refreshPaRempl();

  document.getElementById('pa-agent').addEventListener('change',function(){
    const afs=gaf().filter(af=>af.agentId===this.value);
    const el=document.getElementById('pa-creneaux');
    if(!afs.length){ el.textContent='Aucune affectation trouvée'; }
    else el.innerHTML=afs.map(af=>`<div class="affect-row" style="margin-bottom:4px">
      <div class="affect-dot"></div>
      <div style="font-size:12px"><strong>${siteNom(af.siteId)}</strong> — ${af.jours.join('+')} ${af.debut}–${af.fin}</div>
    </div>`).join('');
    refreshPaRempl();
  });
  ['pa-debut','pa-fin'].forEach(id=>document.getElementById(id)?.addEventListener('change',refreshPaRempl));

  absNeedsRepl=true;
  footer.innerHTML=`
    <button class="btn btn-secondary" onclick="closePanel()">Annuler</button>
    <button class="btn btn-primary" onclick="saveAbsence()">Enregistrer</button>`;
}

function refreshPaRempl(){
  const sel=document.getElementById('pa-rempl'); if(!sel) return;
  const prev=sel.value;
  const agentId=document.getElementById('pa-agent')?.value||'';
  const debut=document.getElementById('pa-debut')?.value||'';
  const fin=document.getElementById('pa-fin')?.value||'';
  const af=agentId?gaf().find(a=>a.agentId===agentId):null;
  const cands=_replOptions({agentId, dateDebut:debut, dateFin:fin||null, siteId:af?.siteId||null});
  window._paConf={}; cands.forEach(c=>{ if(c.conf) window._paConf[c.v]=c.conf; });
  const free=cands.find(c=>!c.conf && c.comp) || cands.find(c=>!c.conf);
  window._paFree=free?{v:free.v,nom:free.nom,comp:free.comp}:null;
  fillSel('pa-rempl', cands.map(c=>({v:c.v, l: debut? _replOptionLabel(c) : c.nom})), 'Choisir un remplaçant');
  if(prev && cands.some(c=>c.v===prev)) sel.value=prev;
  paCheckConflict();
}
function paCheckConflict(){
  const sel=document.getElementById('pa-rempl'), note=document.getElementById('pa-conflict-note');
  if(!sel||!note) return;
  const c=(window._paConf||{})[sel.value];
  if(c){
    note.style.display='block';
    const free=window._paFree;
    const cta = free ? `<button class="btn btn-secondary btn-sm" style="margin-top:10px;border-color:var(--green);color:var(--green)" onclick="paPickFree()"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M20 6L9 17l-5-5"/></svg> Prendre ${_escH(free.nom.split(' ')[0])}, disponible${free.comp?' et formé':''}</button>` : `<div style="margin-top:8px;font-size:11.5px;color:var(--text2)">Aucun autre remplaçant libre sur ce créneau.</div>`;
    note.innerHTML=`<strong>⚠ Déjà occupé</strong> le ${_confShort(c)} — ${_confWhere(c)}.${cta}`;
  } else { note.style.display='none'; note.innerHTML=''; }
}
function paPickFree(){
  const sel=document.getElementById('pa-rempl'); const free=window._paFree;
  if(sel&&free){ sel.value=free.v; paCheckConflict(); }
}

function saveAbsence(){
  const agentId=document.getElementById('pa-agent').value;
  const debut=document.getElementById('pa-debut').value;
  if(!agentId||!debut){ toast('Agent et date requis',false); return; }
  const af=gaf().find(a=>a.agentId===agentId);
  const abs=gab();
  const replId=document.getElementById('pa-rempl')?.value||null;
  const fields={
    agentId, dateDebut:debut,
    dateFin:document.getElementById('pa-fin').value||null,
    motif:document.getElementById('pa-motif').value,
    needsReplacement:absNeedsRepl,
    remplacantId:replId||null,
    siteId:af?.siteId||null,
    notes:document.getElementById('pa-notes').value
  };
  if(replId){
    const conf=replacerConflict(replId,{...fields,id:editAbsId||'new'});
    if(conf && !confirm(`⚠ ${agentNom(replId)} est déjà occupé le ${_confShort(conf)}\n(${_confWhere(conf)}).\n\nConfirmer quand même ce remplacement ?`)) return;
  }
  if(editAbsId){
    const i=abs.findIndex(x=>x.id===editAbsId);
    if(i>=0) abs[i]={...abs[i],...fields};
    sr(gr().filter(x=>x.agentAbsentId!==agentId));
  } else {
    abs.push({ id:DB.id(), ...fields, createdAt:new Date().toISOString() });
  }
  if(replId){
    const r=gr();
    r.push({id:DB.id(),agentAbsentId:agentId,remplacantId:replId,siteId:af?.siteId||'',date:debut,statut:'confirme',createdAt:new Date().toISOString()});
    sr(r);
  }
  sab(abs);
  const wasEdit=!!editAbsId; editAbsId=null;
  closePanel();
  toast(wasEdit?'Absence modifiée':'Absence enregistrée');
  if(currentView==='planning') renderPlanning();
  else if(currentView==='mois'){ moisClearSel(); }
  else renderAbsences();
  updateAbsenceBadge();
}

