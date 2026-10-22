// Vue + panneau affectations
/* ═══════════════════════════════════════
   AFFECTATIONS
═══════════════════════════════════════ */
function renderAffect(){
  _affectReturnAgent=null;
  const q=(document.getElementById('search-affect')?.value||'').toLowerCase();
  let agents=ga().filter(a=>!a.inactif);
  const afs=gaf();
  if(q){
    const matched=agents.filter(a=>{
      if(a.nom.toLowerCase().includes(q)) return true;
      return afs.filter(af=>af.agentId===a.id).some(af=>siteNom(af.siteId).toLowerCase().includes(q));
    });
    agents=matched;
  }
  const el=document.getElementById('affect-list');
  if(!agents.length){ el.innerHTML=`<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg></div><div class="empty-text">Aucun résultat</div></div>`; return; }
  el.innerHTML=agents.map(a=>{
    const agAll=afs.filter(af=>af.agentId===a.id);
    const agAfs=agAll.filter(af=>!_affIsPast(af)), agPast=agAll.filter(_affIsPast);
    return `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:${agAll.length?'12px':'0'}">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${a.nom.charAt(0)}</div>
        <div style="flex:1;font-weight:700">${_escH(a.nom)}</div>
        <button class="btn btn-secondary btn-sm" onclick="openPanel('panel-affect',{agentId:'${a.id}'})">+ Créneau</button>
      </div>
      ${agAfs.map(af=>`<div class="affect-row">
        <div class="affect-dot"></div>
        <div class="affect-info">
          <div class="affect-site">${siteNom(af.siteId)}</div>
          <div class="affect-detail">${af.jours.join(', ')} · ${af.debut}–${af.fin}
            <span class="semaine-tag ${af.semaine==='A'?'semaine-a':af.semaine==='B'?'semaine-b':'semaine-all'}">${af.semaine==='toutes'?'Toutes':'Sem. '+semParityLabel(af.semaine).toLowerCase()}</span>
            ${_affPeriodLabel(af)}
            ${af.notes?'· '+af.notes:''}
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:6px" onclick="versionAffect('${af.id}',null)">Modifier à partir du…</button>
        </div>
        <button class="btn-icon" onclick="openPanel('panel-affect','${af.id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></button>
        <button class="btn-icon red" onclick="delAffect('${af.id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>
      </div>`).join('')}
      ${_affHistHTML(agPast, af=>`openPanel('panel-affect','${af.id}')`, af=>`delAffect('${af.id}')`)}
    </div>`;
  }).join('');
}

// Historique : une affectation est passée quand sa date de fin (dernier jour travaillé) est avant aujourd'hui
function _affIsPast(af){ return !!af.dateFin && af.dateFin<_ymd(new Date()); }
function _affHistHTML(past, editJs, delJs){
  if(!past.length) return '';
  const rows=[...past].sort((a,b)=>(b.dateFin||'').localeCompare(a.dateFin||'')).map(af=>`<div class="affect-row" style="opacity:.7">
    <div class="affect-dot" style="background:var(--text3)"></div>
    <div class="affect-info">
      <div class="affect-site">${_escH(siteNom(af.siteId))}</div>
      <div class="affect-detail">${af.jours.join(', ')} · ${af.debut}–${af.fin} ${_affPeriodLabel(af)}</div>
    </div>
    <button class="btn-icon" title="Modifier" onclick="${editJs(af)}"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></button>
    <button class="btn-icon red" title="Supprimer" onclick="${delJs(af)}"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>
  </div>`).join('');
  return `<details style="margin-top:10px"><summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text2);padding:4px 0">Plannings passés (${past.length})</summary>${rows}</details>`;
}
function versionAffect(afId, agentId){ _affectReturnAgent=agentId; openPanel('panel-affect', {versionOf:afId}); }
function _ymdPrev(ymd){ const d=new Date(ymd+'T12:00:00'); d.setDate(d.getDate()-1); return _ymd(d); }

function buildPanelAffect(body,footer,data){
  // data peut être un id d'affectation (string) ou {agentId} (objet)
  const isEdit=typeof data==='string';
  const verOf=(!isEdit&&data&&data.versionOf)?gaf().find(x=>x.id===data.versionOf):null;
  const af=isEdit?gaf().find(x=>x.id===data):verOf;
  const preAgent=typeof data==='object'&&data?.agentId?data.agentId:'';
  const preJour=typeof data==='object'&&data?.jour?data.jour:'';
  const preSite=typeof data==='object'&&data?.siteId?data.siteId:'';
  const preDebut=typeof data==='object'&&data?.debut?data.debut:'';
  const preFin=typeof data==='object'&&data?.fin?data.fin:'';
  const JOURS_LABELS=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  body.innerHTML=`
    ${verOf?`<div style="background:var(--blue-light);border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.45;margin-bottom:14px">Le planning actuel (${verOf.jours.join(', ')} · ${verOf.debut}–${verOf.fin}) sera terminé <strong>la veille</strong> de la date choisie et restera visible dans « Plannings passés ». Ajustez ci-dessous les jours et horaires du nouveau planning.</div>`:''}
    <input type="hidden" id="paf-verof" value="${verOf?verOf.id:''}">
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Agent *</label>
        <select class="form-input" id="paf-agent"></select>
      </div>
      <div class="form-group">
        <label class="form-label">Site *</label>
        <select class="form-input" id="paf-site"></select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Type d'intervention</label>
      ${_natSegHtml('paf-nat', af?natureOf(af):'poste')}
    </div>
    <div class="form-group">
      <label class="form-label">Jours *</label>
      <div class="jours-row" id="paf-jours">
        ${JOURS_LABELS.map(j=>`<button class="jour-pill${(af?.jours.includes(j) || (!af && j===preJour))?' on':''}" data-j="${j}" onclick="this.classList.toggle('on')">${j}</button>`).join('')}
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Heure début *</label>
        <input class="form-input" type="time" id="paf-debut" value="${af?.debut||preDebut||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Heure fin *</label>
        <input class="form-input" type="time" id="paf-fin" value="${af?.fin||preFin||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Pause déjeuner (min)</label>
      <input class="form-input" type="number" id="paf-pause" min="0" step="5" value="${af?.pause||''}" placeholder="Aucune">
      <div style="font-size:11px;color:var(--text3);margin-top:5px;line-height:1.4">Optionnel. Déduite du total d'heures ; les horaires du créneau restent inchangés.</div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${verOf?'À partir du * (1er jour travaillé)':'Date de début *'}</label>
        <input class="form-input" type="date" id="paf-datedebut" value="${verOf?'':af?.dateDebut||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Date de fin</label>
        <input class="form-input" type="date" id="paf-datefin" value="${verOf?'':af?.dateFin||''}">
      </div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin:-6px 0 14px;line-height:1.4">Laissez la date de fin vide pour une affectation permanente. Vous pourrez y ajouter une fin plus tard.</div>
    <div class="form-group">
      <label class="form-label">Récurrence</label>
      <select class="form-input" id="paf-sem">
        <option value="toutes" ${af?.semaine==='toutes'||!af?'selected':''}>Toutes les semaines</option>
        <option value="A" ${af?.semaine==='A'?'selected':''}>Semaine impaire uniquement</option>
        <option value="B" ${af?.semaine==='B'?'selected':''}>Semaine paire uniquement</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <input class="form-input" type="text" id="paf-notes" value="${af?.notes||''}" placeholder="Ex: Accueil principal">
    </div>
    <input type="hidden" id="paf-id" value="${isEdit?data:''}">`;

  fillSel('paf-agent',ga().filter(a=>!a.inactif).map(a=>({v:a.id,l:a.nom})),'Choisir un agent');
  fillSel('paf-site',gs().slice().sort((a,b)=>(a.nom||'').localeCompare(b.nom||'','fr',{sensitivity:'base'})).map(s=>({v:s.id,l:s.nom})),'Choisir un site');
  if(af){ document.getElementById('paf-agent').value=af.agentId; document.getElementById('paf-site').value=af.siteId; }
  else if(preAgent) document.getElementById('paf-agent').value=preAgent;
  if(!af && preSite) document.getElementById('paf-site').value=preSite;
  if(!af){ const selA=document.getElementById('paf-agent'); const sync=()=>_natSegSet('paf-nat', _natDefaultFor(selA.value)); sync(); selA.addEventListener('change', sync); }

  footer.innerHTML=`
    <button class="btn btn-secondary" onclick="cancelAffect()">Annuler</button>
    <button class="btn btn-primary" onclick="saveAffect()">Enregistrer</button>`;
}

// Édition d'affectation depuis la fiche agent (volet latéral) — retour auto à la fiche
let _affectReturnAgent=null;
function editAffectFromAgent(afId, agentId){ _affectReturnAgent=agentId; openPanel('panel-affect', afId); }
function addAffectFromAgent(agentId){ _affectReturnAgent=agentId; openPanel('panel-affect', {agentId}); }
let _affectFromGrid=false;
function addAffectFromGrid(agentId, jour){ _affectFromGrid=true; _affectReturnAgent=null; openPanel('panel-affect', {agentId, jour}); }
function cancelAffect(){ const r=_affectReturnAgent; _affectReturnAgent=null; if(r) openPanel('panel-agent-detail', r); else closePanel(); }
function delAffectFromAgent(afId, agentId){
  if(!confirm('Supprimer cette affectation ?')) return;
  saf(gaf().filter(a=>a.id!==afId));
  toast('Affectation supprimée');
  openPanel('panel-agent-detail', agentId);
  renderPlanning();
}

function saveAffect(){
  const agentId=document.getElementById('paf-agent').value;
  const siteId=document.getElementById('paf-site').value;
  const jours=[...document.querySelectorAll('#paf-jours .jour-pill.on')].map(b=>b.dataset.j);
  const debut=document.getElementById('paf-debut').value;
  const fin=document.getElementById('paf-fin').value;
  const dateDebut=document.getElementById('paf-datedebut').value;
  const dateFin=document.getElementById('paf-datefin').value;
  if(!agentId||!siteId||!jours.length||!debut||!fin){ toast('Tous les champs requis',false); return; }
  if(!dateDebut){ toast('La date de début est obligatoire',false); return; }
  if(dateFin && dateFin<dateDebut){ toast('La date de fin doit être après le début',false); return; }
  const id=document.getElementById('paf-id').value;
  const verOfId=document.getElementById('paf-verof')?.value||'';
  const afs=gaf();
  const old=verOfId?afs.find(a=>a.id===verOfId):null;
  if(old && old.dateDebut && dateDebut<=old.dateDebut){ toast('La date doit être après le début du planning actuel ('+_dFr(old.dateDebut)+')',false); return; }
  const data={agentId,siteId,jours,debut,fin,pause:Math.max(0,Number(document.getElementById('paf-pause').value)||0),semaine:document.getElementById('paf-sem').value,nature:_natSegVal('paf-nat'),notes:document.getElementById('paf-notes').value,dateDebut,dateFin:dateFin||''};
  const _perOverlap=o=> (!o.dateFin || o.dateFin>=dateDebut) && (!data.dateFin || !o.dateDebut || o.dateDebut<=data.dateFin);
  const conflict=gaf().find(o=> o.agentId===agentId && o.id!==id && o.id!==verOfId && _perOverlap(o) && o.jours.some(j=>jours.includes(j)) && (o.semaine==='toutes'||data.semaine==='toutes'||o.semaine===data.semaine) && _mins(debut)<_mins(o.fin) && _mins(o.debut)<_mins(fin));
  if(conflict){ if(!confirm(`⚠ Conflit horaire\n\n${agentNom(agentId)} est déjà affecté à « ${siteNom(conflict.siteId)} » (${conflict.jours.join(', ')} · ${conflict.debut}–${conflict.fin}), un créneau qui se chevauche.\n\nEnregistrer quand même ?`)) return; }
  if(id){ const i=afs.findIndex(a=>a.id===id); afs[i]={...afs[i],...data}; }
  else afs.push({id:DB.id(),...data});
  if(old){ const prev=_ymdPrev(dateDebut); if(!old.dateFin || old.dateFin>prev) old.dateFin=prev; }
  saf(afs);
  const ret=_affectReturnAgent;
  toast(old?'Nouveau planning à partir du '+_dFr(dateDebut):id?'Affectation modifiée':'Affectation créée');
  if(ret){ _affectReturnAgent=null; openPanel('panel-agent-detail', ret); renderPlanning(); }
  else if(_affectFromGrid){ _affectFromGrid=false; closePanel(); renderPlanning(); }
  else { closePanel(); renderAffect(); }
}

function delAffect(id){
  if(!confirm('Supprimer ?')) return;
  saf(gaf().filter(a=>a.id!==id)); renderAffect(); toast('Supprimée');
}

