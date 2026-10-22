// Vue + panneau tournées
/* ═══════════════════════════════════════
   TOURNÉES
═══════════════════════════════════════ */
let tourSiteIds=[];

function _siteEarliest(siteId){
  const s=gs().find(x=>x.id===siteId);
  if(!s||!s.creneaux||!s.creneaux.length) return '';
  return s.creneaux.map(c=>c.debut).filter(Boolean).sort()[0]||'';
}
const _ROUTE_IC='<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="6" cy="6.5" r="2.4"/><circle cx="18" cy="17.5" r="2.4"/><path d="M8.4 6.5H15a3 3 0 010 6H9a3 3 0 000 6h6.6"/></svg>';
const _AGENT_IC='<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg>';
const _EDIT_IC='<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>';
const _TRASH_IC='<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>';

function renderTournees(){
  const tournees=gt();
  document.getElementById('tournees-sub').textContent=`${tournees.length} tournée${tournees.length>1?'s':''}`;
  const list=document.getElementById('tournees-list');
  if(!tournees.length){ list.innerHTML=`<div class="empty"><div class="empty-icon">${_ROUTE_IC}</div><div class="empty-text">Aucune tournée</div><div class="empty-sub">Créez une tournée pour regrouper des sites desservis ensemble par un agent</div></div>`; return; }
  list.innerHTML=tournees.slice().sort((a,b)=>a.nom.localeCompare(b.nom)).map(t=>{
    const ag=ga().find(a=>a.id===t.agentId);
    const sites=(t.siteIds||[]).map(id=>gs().find(s=>s.id===id)).filter(Boolean);
    const stops=sites.map((s,i)=>{
      const tm=_siteEarliest(s.id);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-top:1px solid var(--border)">
        <span style="width:22px;height:22px;border-radius:50%;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${i+1}</span>
        <span style="flex:1;font-size:13px;font-weight:600">${_escH(s.nom)}</span>
        ${tm?`<span style="font-size:12px;color:var(--text3)">dès ${tm}</span>`:''}
      </div>`;
    }).join('') || `<div style="padding:10px 14px;font-size:12px;color:var(--text3)">Aucun site dans cette tournée</div>`;
    return `<div class="card" style="padding:0;margin-bottom:14px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--surf2)">
        <div style="width:34px;height:34px;border-radius:9px;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:17px">${_ROUTE_IC}</div>
        <div style="flex:1">
          <div style="font-weight:800;font-size:14px">${_escH(t.nom)}</div>
          <div style="font-size:12px;color:var(--text2)">${ag?_AGENT_IC+' '+_escH(ag.nom):'<span style="color:var(--text3)">Aucun agent attitré</span>'} · ${sites.length} site${sites.length>1?'s':''}</div>
        </div>
        <button class="btn-icon" onclick="openPanel('panel-tournee','${t.id}')">${_EDIT_IC}</button>
        <button class="btn-icon red" onclick="delTournee('${t.id}')">${_TRASH_IC}</button>
      </div>
      ${stops}
    </div>`;
  }).join('');
}

function buildPanelTournee(body,footer,id){
  const t=id?gt().find(x=>x.id===id):null;
  tourSiteIds=t?(t.siteIds||[]).slice():[];
  const agentsOpts=ga().filter(a=>!a.inactif||t&&t.agentId===a.id).map(a=>`<option value="${a.id}" ${t&&t.agentId===a.id?'selected':''}>${_escH(a.nom)}</option>`).join('');
  body.innerHTML=`
    <div class="form-group">
      <label class="form-label">Nom de la tournée *</label>
      <input class="form-input" type="text" id="pt-nom" value="${t?_escA(t.nom):''}" placeholder="Ex: Tournée Karima">
    </div>
    <div class="form-group">
      <label class="form-label">Agent attitré</label>
      <select class="form-input" id="pt-agent"><option value="">— Aucun —</option>${agentsOpts}</select>
    </div>
    <div class="form-section" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span>Ordre de passage</span>
      <button class="btn btn-secondary btn-sm" onclick="sortTourByTime()" title="Réordonner selon l'heure d'ouverture des sites">Trier par horaire</button>
    </div>
    <div id="pt-sites"></div>
    <div class="form-group" style="margin-top:10px">
      <label class="form-label">Ajouter un site</label>
      <select class="form-input" id="pt-addsite" onchange="addTourSite(this.value)"></select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-input" id="pt-notes" placeholder="Itinéraire, consignes particulières…">${t?_escH(t.notes||''):''}</textarea>
    </div>
    <input type="hidden" id="pt-id" value="${id||''}">`;
  renderTourSites();
  footer.innerHTML=`
    <button class="btn btn-secondary" onclick="closePanel()">Annuler</button>
    <button class="btn btn-primary" onclick="saveTournee()">Enregistrer</button>`;
}

function renderTourSites(){
  const el=document.getElementById('pt-sites'); if(!el) return;
  if(!tourSiteIds.length){ el.innerHTML=`<div style="font-size:12px;color:var(--text3);padding:8px 0">Aucun site — ajoutez-en ci-dessous.</div>`; }
  else el.innerHTML=tourSiteIds.map((id,i)=>{
    const s=gs().find(x=>x.id===id); const nom=s?s.nom:'(site supprimé)'; const tm=s?_siteEarliest(id):'';
    return `<div class="affect-row">
      <span style="width:22px;height:22px;border-radius:50%;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${i+1}</span>
      <div class="affect-info" style="flex:1"><div style="font-size:12px;font-weight:600">${_escH(nom)}</div>${tm?`<div style="font-size:11px;color:var(--text3)">dès ${tm}</div>`:''}</div>
      <button class="btn-icon" ${i===0?'disabled style="opacity:.3"':''} onclick="moveTourSite(${i},-1)" title="Monter"><svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>
      <button class="btn-icon" ${i===tourSiteIds.length-1?'disabled style="opacity:.3"':''} onclick="moveTourSite(${i},1)" title="Descendre"><svg viewBox="0 0 24 24" style="width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>
      <button class="btn-icon red" onclick="removeTourSite(${i})" title="Retirer">${_TRASH_IC}</button>
    </div>`;
  }).join('');
  const sel=document.getElementById('pt-addsite');
  if(sel){
    const remaining=gs().filter(s=>!tourSiteIds.includes(s.id)).sort((a,b)=>a.nom.localeCompare(b.nom));
    sel.innerHTML=`<option value="">— Choisir un site —</option>`+remaining.map(s=>{const ot=siteTournee(s.id);return `<option value="${s.id}">${_escH(s.nom)}${ot?' (actuellement: '+_escH(ot.nom)+')':''}</option>`;}).join('');
  }
}
function addTourSite(id){ if(!id) return; if(!tourSiteIds.includes(id)) tourSiteIds.push(id); renderTourSites(); }
function removeTourSite(i){ tourSiteIds.splice(i,1); renderTourSites(); }
function moveTourSite(i,d){ const j=i+d; if(j<0||j>=tourSiteIds.length) return; [tourSiteIds[i],tourSiteIds[j]]=[tourSiteIds[j],tourSiteIds[i]]; renderTourSites(); }
function sortTourByTime(){ tourSiteIds.sort((a,b)=>(_siteEarliest(a)||'99:99').localeCompare(_siteEarliest(b)||'99:99')); renderTourSites(); }

function saveTournee(){
  const nom=document.getElementById('pt-nom').value.trim();
  if(!nom){ toast('Nom requis',false); return; }
  const id=document.getElementById('pt-id').value;
  const agentId=document.getElementById('pt-agent').value;
  const notes=document.getElementById('pt-notes').value;
  let tournees=gt();
  // Un site n'appartient qu'à une seule tournée : on le retire des autres.
  tournees=tournees.map(t=> t.id===id ? t : ({...t, siteIds:(t.siteIds||[]).filter(x=>!tourSiteIds.includes(x))}) );
  if(id){ const i=tournees.findIndex(t=>t.id===id); tournees[i]={...tournees[i],nom,agentId,notes,siteIds:tourSiteIds.slice()}; }
  else tournees.push({id:DB.id(),nom,agentId,notes,siteIds:tourSiteIds.slice()});
  st(tournees); closePanel(); toast(id?'Tournée modifiée':'Tournée créée'); renderTournees(); buildTourneeFilters();
}
function delTournee(id){
  if(!confirm('Supprimer cette tournée ? Les sites ne sont pas supprimés.')) return;
  st(gt().filter(t=>t.id!==id)); renderTournees(); toast('Tournée supprimée'); buildTourneeFilters();
}

