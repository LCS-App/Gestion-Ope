// Vues événements et pointage
/* ═══════════════════════════════════════
   POINTAGE
═══════════════════════════════════════ */
const EV_CATS = { vehicule:{l:'Véhicule',b:'badge-orange'}, medical:{l:'Médical',b:'badge-red'}, formation:{l:'Formation',b:'badge-purple'}, reunion:{l:'Réunion',b:'badge-blue'}, admin:{l:'Administratif',b:'badge-green'}, autre:{l:'Autre',b:'badge-gray'} };
const EV_KEY = Object.fromEntries(Object.entries(EV_CATS).map(([k,v])=>[v.l,k]));
let evTab='avenir', evCat='', evSearch='';
function tabEv(t,btn){ evTab=t; document.querySelectorAll('#view-evenements .tab').forEach(el=>el.classList.remove('on')); btn.classList.add('on'); renderEvenements(); }
function _evRow(e){
  const c=EV_CATS[e.categorie]||EV_CATS.autre, h=e.debut?(e.debut+(e.fin?'–'+e.fin:'')):'Journée';
  return `<div class="pt-item" style="cursor:pointer" onclick="openPanel('panel-evenement','${_escA(e.id)}')">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap"><span style="font-weight:600">${_escH(e.titre)}</span><span class="badge ${c.b}">${c.l}</span></div>
      <div style="font-size:12px;color:var(--text3)">${fmtDate(e.date)} · ${h}${e.agentId?' · '+_escH(agentNom(e.agentId)):''}${e.lieu?' · '+_escH(e.lieu):''}${e.notes?' · '+_escH(e.notes):''}</div>
    </div>
  </div>`;
}
function renderEvenements(){
  const warn=document.getElementById('ev-warn');
  if(warn){ warn.style.display=window._evOk===false?'block':'none'; warn.innerHTML='Table Dataverse <b>lcs_evenement</b> absente : exécuter <code>dataverse/table-evenement.js</code> dans la console, puis recharger.'; }
  const sel=document.getElementById('ev-cat');
  if(sel && !sel.options.length){ sel.innerHTML='<option value="">Toutes les catégories</option>'+Object.entries(EV_CATS).map(([k,v])=>`<option value="${k}">${v.l}</option>`).join(''); }
  const today=_ymd(new Date()), q=(evSearch||'').trim().toLowerCase();
  let l=gev().slice();
  if(evTab==='avenir') l=l.filter(e=>e.date>=today); else if(evTab==='passes') l=l.filter(e=>e.date<today);
  if(evCat) l=l.filter(e=>e.categorie===evCat);
  if(q) l=l.filter(e=>[e.titre,e.lieu,e.notes,e.agentId?agentNom(e.agentId):''].join(' ').toLowerCase().includes(q));
  l.sort((a,b)=> evTab==='passes' ? b.date.localeCompare(a.date)||(b.debut||'').localeCompare(a.debut||'') : a.date.localeCompare(b.date)||(a.debut||'').localeCompare(b.debut||''));
  document.getElementById('ev-list').innerHTML=l.map(_evRow).join('');
  document.getElementById('ev-empty').style.display=l.length?'none':'block';
}
function buildPanelEvenement(body,footer,id){
  const [_p,_pa,_pd]=(id||'').split('|'), _new=_p==='new'; const e=(id&&!_new)?gev().find(x=>x.id===id):null, v=(k,d='')=>_escA(e?(e[k]||''):d);
  body.innerHTML=`
    ${ _new&&_pa ? `<div class="tabs" style="margin-bottom:16px"><button class="tab" onclick="openPanel('panel-jour','${_pa}|${_pd}||')">Passage sur site</button><button class="tab on">Autre événement</button></div>` : '' }
    <div class="form-group"><label class="form-label">Titre *</label><input class="form-input" id="pev-titre" value="${v('titre')}" placeholder="Révision véhicule…"></div>
    <div class="form-group"><label class="form-label">Date *</label><input class="form-input" type="date" id="pev-date" value="${e?e.date:(_pd||_ymd(new Date()))}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Début</label><input class="form-input" type="time" id="pev-debut" value="${v('debut')}"></div>
      <div class="form-group"><label class="form-label">Fin</label><input class="form-input" type="time" id="pev-fin" value="${v('fin')}"></div>
    </div>
    <div class="form-group"><label class="form-label">Agent concerné</label><select class="form-input" id="pev-agent"></select></div>
    <div class="form-group"><label class="form-label">Lieu</label><input class="form-input" id="pev-lieu" value="${v('lieu')}"></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="pev-notes">${_escH(e?e.notes||'':'')}</textarea></div>`;
  fillSel('pev-agent',[{v:'',l:'— Aucun —'},...ga().filter(a=>!a.inactif).map(a=>({v:a.id,l:a.nom}))]);
  if(e&&e.agentId) document.getElementById('pev-agent').value=e.agentId; else if(_pa) document.getElementById('pev-agent').value=_pa;
  footer.innerHTML=`${e?`<button class="btn btn-secondary" style="margin-right:auto;color:var(--red)" onclick="delEvenement('${_escA(e.id)}')">Supprimer</button>`:''}
    <button class="btn btn-secondary" onclick="closePanel()">Annuler</button>
    <button class="btn btn-primary" onclick="saveEvenement('${e?_escA(e.id):''}')">Enregistrer</button>`;
}
function saveEvenement(id){
  const g=i=>document.getElementById(i).value.trim();
  const titre=g('pev-titre'), date=g('pev-date');
  if(!titre||!date){ toast('Titre et date requis',false); return; }
  const o={ titre, date, debut:g('pev-debut'), fin:g('pev-fin'), agentId:g('pev-agent'), lieu:g('pev-lieu'), notes:g('pev-notes') };
  const l=gev().slice(), i=id?l.findIndex(x=>x.id===id):-1;
  if(i>=0) l[i]={...l[i],...o}; else l.push({id:DB.id(),...o});
  sev(l); closePanel(); toast('Événement enregistré'); refreshAfterAbsenceChange();
}
function delEvenement(id){
  if(!confirm('Supprimer cet événement ?')) return;
  sev(gev().filter(x=>x.id!==id)); closePanel(); toast('Supprimé'); refreshAfterAbsenceChange();
}

let ptTab='tous';
function tabPointage(t,btn){
  ptTab=t;
  document.querySelectorAll('#view-pointage .tab').forEach(el=>el.classList.remove('on'));
  btn.classList.add('on');
  renderPointage();
}

function renderPointage(){
  const all=gpt();
  const retards=all.filter(p=>p.type==='retard');
  const hsups=all.filter(p=>p.type==='hsup');
  document.getElementById('pt-stats').innerHTML=`
    <div class="card" style="text-align:center;padding:14px">
      <div style="font-size:24px;font-weight:800;color:var(--red)">${retards.length}</div>
      <div style="font-size:12px;color:var(--text2)">Retards</div>
    </div>
    <div class="card" style="text-align:center;padding:14px">
      <div style="font-size:24px;font-weight:800;color:var(--orange)">${retards.reduce((s,p)=>s+Number(p.duree),0)}<span style="font-size:14px">min</span></div>
      <div style="font-size:12px;color:var(--text2)">Total retards</div>
    </div>
    <div class="card" style="text-align:center;padding:14px">
      <div style="font-size:24px;font-weight:800;color:var(--blue)">${hsups.length}</div>
      <div style="font-size:12px;color:var(--text2)">H.Sup</div>
    </div>
    <div class="card" style="text-align:center;padding:14px">
      <div style="font-size:24px;font-weight:800;color:var(--green)">${hsups.reduce((s,p)=>s+Number(p.duree),0)}<span style="font-size:14px">min</span></div>
      <div style="font-size:12px;color:var(--text2)">Total H.Sup</div>
    </div>`;

  let pts=all.sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(ptTab!=='tous') pts=pts.filter(p=>p.type===ptTab);
  const empty=document.getElementById('pt-empty');
  const list=document.getElementById('pt-list');
  if(!pts.length){ empty.style.display='block'; list.innerHTML=''; return; }
  empty.style.display='none';
  list.innerHTML=pts.map(p=>`<div class="pt-item">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
        <span style="font-weight:600">${_escH(agentNom(p.agentId))}</span>
        ${p.type==='retard'?'<span class="badge badge-orange">Retard</span>':'<span class="badge badge-blue">H.Sup</span>'}
        <span style="font-size:12px;color:var(--text2)">${p.duree} min</span>
      </div>
      <div style="font-size:12px;color:var(--text3)">${fmtDate(p.date)}${p.siteId?' · '+siteNom(p.siteId):''}${p.notes?' · '+p.notes:''}</div>
    </div>
    <button class="btn-icon red" onclick="delPointage('${p.id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>
  </div>`).join('');
}

function buildPanelPointage(body,footer){
  const today=new Date().toISOString().split('T')[0];
  body.innerHTML=`
    <div class="form-group">
      <label class="form-label">Type *</label>
      <select class="form-input" id="ppt-type">
        <option value="retard">Retard</option>
        <option value="hsup">Heure supplémentaire</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Agent *</label>
      <select class="form-input" id="ppt-agent"></select>
    </div>
    <div class="form-group">
      <label class="form-label">Site</label>
      <select class="form-input" id="ppt-site"></select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input class="form-input" type="date" id="ppt-date" value="${today}">
      </div>
      <div class="form-group">
        <label class="form-label">Durée (minutes) *</label>
        <input class="form-input" type="number" id="ppt-duree" min="1" placeholder="20">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-input" id="ppt-notes"></textarea>
    </div>`;
  fillSel('ppt-agent',ga().filter(a=>!a.inactif).map(a=>({v:a.id,l:a.nom})),'Choisir un agent');
  fillSel('ppt-site',[{v:'',l:'— Aucun —'},...gs().map(s=>({v:s.id,l:s.nom}))]);
  footer.innerHTML=`
    <button class="btn btn-secondary" onclick="closePanel()">Annuler</button>
    <button class="btn btn-primary" onclick="savePointage()">Enregistrer</button>`;
}

function savePointage(){
  const agentId=document.getElementById('ppt-agent').value;
  const date=document.getElementById('ppt-date').value;
  const duree=document.getElementById('ppt-duree').value;
  if(!agentId||!date||!duree){ toast('Champs requis manquants',false); return; }
  const pts=gpt();
  pts.push({id:DB.id(),type:document.getElementById('ppt-type').value,agentId,siteId:document.getElementById('ppt-site').value,date,duree:Number(duree),notes:document.getElementById('ppt-notes').value,createdAt:new Date().toISOString()});
  spt(pts); closePanel(); toast('Événement enregistré'); renderPointage();
}

function delPointage(id){
  if(!confirm('Supprimer ?')) return;
  spt(gpt().filter(p=>p.id!==id)); renderPointage(); toast('Supprimé');
}

