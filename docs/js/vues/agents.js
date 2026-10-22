// Vue + panneaux agents
/* ═══════════════════════════════════════
   AGENTS
═══════════════════════════════════════ */
let agTab='tous';
const AGENT_TYPES=[
  {v:'concierge',l:'Concierge'},
  {v:'accueil',l:'Accueil'},
  {v:'multisite',l:'Multisite (remplaçant)'},
  {v:'logistique',l:'Logistique'},
  {v:'factotum',l:'Factotum'},
  {v:'chantier',l:'Chantier'},
];
function agTypes(a){ return a&&a.types&&a.types.length ? a.types : [(a&&a.type)||'accueil']; }
function agentTypeBadges(a,st){ return agTypes(a).map(t=>`<span class="badge ${agentTypeBadgeClass(t)}" style="${st||''}">${agentTypeLabel(t)}</span>`).join(' '); }
function agentTypeLabel(t){ const x=AGENT_TYPES.find(o=>o.v===t); return x?x.l:'Accueil'; }
function agentTypeBadgeClass(t){ return t==='multisite'?'badge-orange':t==='logistique'?'badge-blue':t==='factotum'?'badge-purple':t==='chantier'?'badge-gray':'badge-green'; }
// Migration : dériver le type d'agent (les remplaçants = multisite), par nom sur les données existantes
function migrateAgentTypes(){
  const map={multisite:['amélie','amelie','charlie','christel'],logistique:['karima','michael','elvira'],factotum:['marouane']};
  let ags=ga(), changed=false;
  ags=ags.map(a=>{
    if(a.type) return a;
    changed=true;
    const n=(a.nom||'').toLowerCase();
    let type='accueil';
    for(const [t,names] of Object.entries(map)){ if(names.some(nm=>n.includes(nm))){ type=t; break; } }
    if(a.remplacant) type='multisite';
    return {...a, type, remplacant:type==='multisite'};
  });
  if(changed) sa(ags);
}
function tabAgents(t,btn){
  agTab=t;
  document.querySelectorAll('#view-agents .tab').forEach(el=>el.classList.remove('on'));
  btn.classList.add('on');
  renderAgents();
}

function renderAgents(){
  let agents=ga();
  const q=(document.getElementById('search-agents')?.value||'').toLowerCase();
  if(q) agents=agents.filter(a=>a.nom.toLowerCase().includes(q));
  const nbIncomplet=ga().filter(a=>!a.inactif && _agentNomIncomplet(a)).length;
  if(!nbIncomplet) window._agIncomplets=false;
  if(window._agIncomplets) agents=agents.filter(_agentNomIncomplet);
  if(agTab==='archives') agents=agents.filter(a=>a.inactif);
  else{
    agents=agents.filter(a=>!a.inactif);
    if(agTab==='remplacant') agents=agents.filter(a=>a.remplacant);
    else if(agTab==='respope') agents=agents.filter(isRespOpe);
    else if(agTab==='fixe') agents=agents.filter(a=>!a.remplacant);
    else if(agTab!=='tous') agents=agents.filter(a=>agTypes(a).includes(agTab));
  }
  document.getElementById('agents-sub').textContent=`${agents.length} agent${agents.length>1?'s':''}`;
  const grid=document.getElementById('agents-grid');
  const banner = nbIncomplet ? `<div style="grid-column:1/-1;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 14px;border-radius:var(--radius-sm);background:var(--orange-light,#FFF1DE);color:var(--text);font-size:12.5px"><span style="flex:1;min-width:200px"><strong>⚠ ${nbIncomplet} agent${nbIncomplet>1?'s':''} sans prénom ou sans nom de famille</strong> — à corriger dans la fiche agent.</span><button class="btn btn-secondary btn-sm" onclick="window._agIncomplets=!window._agIncomplets;renderAgents()">${window._agIncomplets?'Tout afficher':'Afficher ces agents'}</button></div>` : '';
  if(!agents.length){ grid.innerHTML=banner+`<div class="empty" style="grid-column:1/-1"><div class="empty-icon"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg></div><div class="empty-text">Aucun agent trouvé</div></div>`; return; }
  grid.innerHTML=banner+agents.map(a=>{
    const afs=gaf().filter(af=>af.agentId===a.id);
    return `<div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0">${a.nom.charAt(0)}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${_escH(a.nom)}</div>
          ${agentTypeBadges(a,'font-size:10px')}
          ${isRespOpe(a)?'<span class="badge badge-blue" style="font-size:10px;margin-left:4px">Responsable opé</span>':''}
          ${a.inactif?'<span class="badge" style="font-size:10px;background:#E7E5E0;color:#6B6D6D;margin-left:4px">Archivé</span>':''}
        </div>
        <button class="btn-icon" onclick="event.stopPropagation();openPanel('panel-agent','${a.id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></button>
        ${a.inactif?`<button class="btn-icon" title="Réactiver" onclick="event.stopPropagation();reactivateAgent('${a.id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5"/></svg></button>`:`<button class="btn-icon red" title="Archiver" onclick="event.stopPropagation();delAgent('${a.id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>`}
      </div>
      ${a.tel?`<div style="font-size:12px;color:var(--text3);margin-bottom:3px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A15 15 0 014 6a2 2 0 011-2z"/></svg> ${a.tel}</div>`:''}
      ${a.email?`<div style="font-size:12px;color:var(--text3);margin-bottom:3px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7.5l8 5.5 8-5.5"/></svg> ${a.email}</div>`:''}
      ${_contratLabel(a,12)}
      ${a.notes?`<div style="font-size:12px;color:var(--text2);margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">${_escH(a.notes)}</div>`:''}
      ${(a.competences||[]).length?`<details class="disc">
        <summary>Sites maîtrisés <span style="color:var(--text2)">(${a.competences.length})</span><span class="chev"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2"><path d="M9 6l6 6-6 6"/></svg></span></summary>
        <div class="disc-body" style="display:flex;flex-wrap:wrap;gap:5px">${a.competences.map(cid=>`<span class="badge badge-green" style="font-size:10px">${_escH(siteNom(cid))}</span>`).join('')}</div>
      </details>`:''}
      ${afs.length?`<details class="disc">
        <summary><span style="flex:1">Affectations <span style="color:var(--text2)">(${afs.length})</span></span><button class="btn-icon" title="Gérer les affectations" onclick="event.preventDefault();event.stopPropagation();openPanel('panel-agent-detail','${a.id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></button><span class="chev"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2"><path d="M9 6l6 6-6 6"/></svg></span></summary>
        <div class="disc-body">${afs.map(af=>`<div style="display:flex;align-items:baseline;gap:6px;font-size:12px;margin-bottom:3px">
          <span style="width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0;transform:translateY(-2px)"></span>
          <span style="flex:1;min-width:0"><span style="font-weight:600">${_escH(siteNom(af.siteId))}</span> <span style="color:var(--text3)">· ${af.jours.join(', ')} · ${af.debut}–${af.fin}</span></span>
        </div>`).join('')}</div>
      </details>`:`<div style="display:flex;align-items:center;gap:6px;margin-top:8px"><div style="flex:1;font-size:11px;color:var(--orange);font-style:italic">Aucune affectation</div><button class="btn-icon" style="color:var(--orange)" title="Ajouter une affectation" onclick="addAffectFromGrid('${a.id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M12 5v14M5 12h14"/></svg></button></div>`}
    </div>`;
  }).join('');
}

function _splitNom(full){
  const toks=(full||'').trim().split(/\s+/).filter(Boolean);
  if(!toks.length) return {nomFamille:'',prenom:''};
  const isUp=t=> t===t.toLocaleUpperCase() && t!==t.toLocaleLowerCase();
  const nomT=toks.filter(isUp), preT=toks.filter(t=>!isUp(t));
  if(nomT.length && preT.length) return {nomFamille:nomT.join(' '), prenom:preT.join(' ')};
  if(nomT.length) return {nomFamille:nomT.join(' '), prenom:''};
  return {nomFamille:'', prenom:preT.join(' ')};
}
function _agentNomIncomplet(a){ return !(a.prenom||'').trim() || !(a.nomFamille||'').trim(); }
function _warnNomsIncomplets(){
  const n=ga().filter(a=>!a.inactif && _agentNomIncomplet(a)).length;
  if(n) toast(n+' agent'+(n>1?'s':'')+' sans prénom ou nom de famille — voir Agents',false);
}
function _canonNom(nomFamille,prenom){ return [(nomFamille||'').trim(),(prenom||'').trim()].filter(Boolean).join(' '); }
function migrateNomPrenom(){
  let a=ga(), changed=false;
  a=a.map(x=>{
    let nf=x.nomFamille, pr=x.prenom;
    if(pr===undefined || nf===undefined){ const s=_splitNom(x.nom); nf=nf??s.nomFamille; pr=pr??s.prenom; }
    const canon=_canonNom(nf,pr) || (x.nom||'');
    if(nf!==x.nomFamille || pr!==x.prenom || canon!==x.nom){ changed=true; return {...x, nomFamille:nf, prenom:pr, nom:canon}; }
    return x;
  });
  if(changed) sa(a);
}

function buildPanelAgent(body,footer,id){
  const a=id?ga().find(x=>x.id===id):null;
  const _sp=_splitNom(a?.nom||''); const _nf=a?.nomFamille??_sp.nomFamille; const _pr=a?.prenom??_sp.prenom;
  body.innerHTML=`
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nom de famille *</label>
        <input class="form-input" type="text" id="pa2-nomf" value="${_escA(_nf)}" placeholder="Nom de famille" oninput="this.value=this.value.toUpperCase()">
      </div>
      <div class="form-group">
        <label class="form-label">Prénom *</label>
        <input class="form-input" type="text" id="pa2-prenom" value="${_escA(_pr)}" placeholder="Prénom">
      </div>
    </div>
    <div class="form-section">Coordonnées</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tél. pro</label>
        <input class="form-input" type="tel" id="pa2-tel" value="${_escA(a?.telPro||'')}" placeholder="06 xx xx xx xx">
      </div>
      <div class="form-group">
        <label class="form-label">Tél. perso</label>
        <input class="form-input" type="tel" id="pa2-telperso" value="${_escA(a ? (a.telPerso!=null ? a.telPerso : (a.telPro!=null ? '' : (a.tel||''))) : '')}" placeholder="06 xx xx xx xx">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Mail pro</label>
        <input class="form-input" type="email" id="pa2-email" value="${_escA(a ? (a.emailPro!=null ? a.emailPro : (/@conciergerie-solidaire\.fr$/i.test(a.email||'') ? a.email : '')) : '')}" placeholder="prenom.nom@conciergerie-solidaire.fr">
      </div>
      <div class="form-group">
        <label class="form-label">Mail perso</label>
        <input class="form-input" type="email" id="pa2-emailperso" value="${_escA(a ? (a.emailPerso!=null ? a.emailPerso : (a.emailPro!=null || /@conciergerie-solidaire\.fr$/i.test(a.email||'') ? '' : (a.email||''))) : '')}">
      </div>
    </div>
    <div class="form-section">Contrat</div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Début de contrat</label>
        <input class="form-input" type="date" id="pa2-cdebut" value="${a?.contratDebut||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Fin de contrat</label>
        <input class="form-input" type="date" id="pa2-cfin" value="${a?.contratFin||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Volume horaire hebdomadaire (h)</label>
      <input class="form-input" type="number" min="0" max="60" step="0.25" id="pa2-chebdo" value="${a?.contratHebdo??''}" placeholder="ex. 35">
    </div>
    <div style="font-size:11px;color:var(--text3);margin:-6px 0 12px">Fin vide = CDI / sans date de fin. Le planning alerte si la semaine dépasse le volume du contrat.</div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-input" id="pa2-notes">${a?.notes||''}</textarea>
    </div>
    <div class="form-section">Rôle</div>
    <div class="form-group">
      <label class="form-label">Types de poste</label>
      <div id="pa2-types" style="display:flex;flex-wrap:wrap;gap:6px 14px">${AGENT_TYPES.map(o=>`<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" value="${o.v}"${agTypes(a).includes(o.v)&&(a||o.v==='concierge')?' checked':''}> ${o.l}</label>`).join('')}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Plusieurs types possibles. Les agents <strong>multisite</strong> sont les remplaçants.</div>
      <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="pa2-respope"${a?.respOpe?' checked':''}> Responsable opé <span style="font-size:11px;color:var(--text3)">(peut effectuer des remplacements)</span></label>
    </div>
    <div class="form-section">Sites maîtrisés</div>
    <div class="form-group">
      <div style="font-size:11px;color:var(--text3);margin:-2px 0 8px">Sites que cet agent sait tenir — sert à proposer les bons remplaçants.</div>
      <input class="form-input" type="text" id="pa2-comp-search" placeholder="Rechercher un site…" oninput="filterCompPills(this.value)" style="margin-bottom:8px">
      <div id="pa2-comps" style="display:flex;flex-wrap:wrap;gap:7px">
        ${gs().slice().sort((x,y)=>x.nom.localeCompare(y.nom)).map(s=>{
          const on=(a?.competences||[]).includes(s.id);
          return `<button type="button" data-cid="${s.id}" data-cname="${_escH(s.nom).toLowerCase()}" class="comp-pill${on?' on':''}" onclick="toggleCompPill(this)" style="font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;cursor:pointer;border:1px solid ${on?'var(--green)':'var(--border)'};background:${on?'var(--green-light)':'transparent'};color:${on?'var(--green)':'var(--text2)'}">${_escH(s.nom)}</button>`;
        }).join('')}
      </div>
    </div>
    <input type="hidden" id="pa2-id" value="${id||''}">`;
  footer.innerHTML=`
    <button class="btn btn-secondary" onclick="closePanel()">Annuler</button>
    <button class="btn btn-primary" onclick="saveAgent()">Enregistrer</button>`;
}

function toggleCompPill(b){
  const on=b.classList.toggle('on');
  b.style.border='1px solid '+(on?'var(--green)':'var(--border)');
  b.style.background=on?'var(--green-light)':'transparent';
  b.style.color=on?'var(--green)':'var(--text2)';
  const cont=b.parentElement;
  if(cont){
    [...cont.querySelectorAll('.comp-pill')].sort((x,y)=>{
      const xo=x.classList.contains('on')?0:1, yo=y.classList.contains('on')?0:1;
      return xo!==yo ? xo-yo : x.dataset.cname.localeCompare(y.dataset.cname);
    }).forEach(p=>cont.appendChild(p));
  }
}
function filterCompPills(q){
  q=(q||'').toLowerCase().trim();
  document.querySelectorAll('#pa2-comps .comp-pill').forEach(b=>{
    b.style.display = (!q || b.dataset.cname.includes(q) || b.classList.contains('on')) ? '' : 'none';
  });
}
function saveAgent(){
  const nomf=document.getElementById('pa2-nomf').value.trim().toUpperCase();
  const prenom=document.getElementById('pa2-prenom').value.trim();
  const nom=(nomf+' '+prenom).trim();
  if(!nomf||!prenom){ toast('Nom de famille et prénom obligatoires',false); return; }
  const id=document.getElementById('pa2-id').value;
  const agents=ga();
  const competences=[...document.querySelectorAll('#pa2-comps .comp-pill.on')].map(b=>b.dataset.cid);
  let types=[...document.querySelectorAll('#pa2-types input:checked')].map(i=>i.value); if(!types.length) types=['concierge']; const type=types[0]; const respOpe=document.getElementById('pa2-respope').checked;
  const contratDebut=document.getElementById('pa2-cdebut').value||null, contratFin=document.getElementById('pa2-cfin').value||null;
  if(contratDebut&&contratFin&&contratFin<contratDebut){ toast('La fin de contrat précède le début',false); return; }
  const _ch=parseFloat(String(document.getElementById('pa2-chebdo').value).replace(',','.'));
  const contratHebdo=isFinite(_ch)&&_ch>0?_ch:null;
  const data={respOpe,contratDebut,contratFin,contratHebdo,nom,nomFamille:nomf,prenom,telPro:document.getElementById('pa2-tel').value.trim(),telPerso:document.getElementById('pa2-telperso').value.trim(),tel:document.getElementById('pa2-telperso').value.trim()||document.getElementById('pa2-tel').value.trim(),emailPro:document.getElementById('pa2-email').value.trim(),emailPerso:document.getElementById('pa2-emailperso').value.trim(),email:document.getElementById('pa2-email').value.trim()||document.getElementById('pa2-emailperso').value.trim(),notes:document.getElementById('pa2-notes').value,type,types,remplacant:types.includes('multisite'),competences};
  if(id){ const i=agents.findIndex(a=>a.id===id); agents[i]={...agents[i],...data}; }
  else agents.push({id:DB.id(),...data});
  sa(agents); closePanel(); toast(id?'Agent modifié':'Agent ajouté'); renderAgents();
}

function delAgent(id){
  const a=ga().find(x=>x.id===id);
  if(!a) return;
  const affCount=gaf().filter(af=>af.agentId===id).length;
  const absCount=gab().filter(ab=>ab.agentId===id).length;
  const remplCount=gr().filter(r=>r.agentAbsentId===id||r.remplacantId===id).length;
  const parts=[];
  if(affCount) parts.push(affCount+' affectation'+(affCount>1?'s':''));
  if(absCount) parts.push(absCount+' absence'+(absCount>1?'s':''));
  if(remplCount) parts.push(remplCount+' remplacement'+(remplCount>1?'s':''));
  const detail=parts.length?('\n\nConcerné : '+parts.join(', ')+'.'):'';
  if(!confirm(`Archiver ${a.nom} ?\n\nSes affectations et sa tournée en cours seront retirées. Son historique (absences, remplacements, pointages) reste conservé.${detail}`)) return;
  saf(gaf().filter(af=>af.agentId!==id));
  sex(gex().filter(e=>e.agentId!==id));
  st(gt().map(t=>t.agentId===id?{...t,agentId:''}:t));
  const agents=ga();
  const i=agents.findIndex(x=>x.id===id);
  if(i>=0) agents[i]={...agents[i],inactif:true};
  sa(agents);
  renderAgents(); toast('Agent archivé — historique conservé');
}
function reactivateAgent(id){
  const agents=ga();
  const i=agents.findIndex(x=>x.id===id);
  if(i<0) return;
  agents[i]={...agents[i],inactif:false};
  sa(agents); renderAgents(); toast('Agent réactivé');
}

/* Absences de l'agent — mêmes actions que partout ailleurs. */
function _agentAbsencesHTML(agentId){
  const list=gab().filter(x=>x.agentId===agentId).sort((a,b)=>String(b.dateDebut).localeCompare(String(a.dateDebut)));
  if(!list.length) return `<div style="font-size:13px;color:var(--text3);margin-bottom:6px">Aucune absence enregistrée</div>`;
  const rows=list.map(ab=>{
    const d=_absDesc(ab);
    const etat=ab.ignored?`<span class="badge badge-gray">Ignorée</span>`
      :_absenceCovered(ab)?`<span class="badge badge-green">Remplacée</span>`
      :_absenceAnyRepl(ab)?`<span class="badge" style="background:var(--orange-light);color:#B0722A">Partielle</span>`
      :(ab.needsReplacement?`<span class="badge badge-red">Sans remplaçant</span>`:`<span class="badge badge-gray">Sans remplacement</span>`);
    const q=[d.periode,ab.motif||'',ab.notes||''].join(' ').toLowerCase();
    return `<div class="affect-row agent-abs-row" data-q="${_escA(q)}">
      <div class="affect-dot" style="background:var(--red)"></div>
      <div class="affect-info" style="min-width:0">
        <div style="font-size:12.5px;font-weight:600">${d.periode}</div>
        <div style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px">${_escH(ab.motif||'—')} ${etat}</div>
      </div>
      ${absenceActionsHTML(ab.id)}
    </div>`;
  }).join('');
  const search=list.length>5?`<input class="form-input" type="search" placeholder="Rechercher une absence…" autocomplete="off" style="margin-bottom:8px" oninput="_filterAgentAbs(this)">`:'';
  return `<div id="agent-abs-wrap" style="margin-bottom:6px">${search}${rows}</div>`;
}
function _filterAgentAbs(input){
  const q=input.value.trim().toLowerCase();
  input.parentElement.querySelectorAll('.agent-abs-row').forEach(el=>{
    el.style.display=(!q||(el.dataset.q||'').includes(q))?'':'none';
  });
}

function buildPanelAgentDetail(body,footer,id){
  const a=ga().find(x=>x.id===id);
  if(!a){ body.innerHTML='Agent introuvable'; return; }
  const afs=gaf().filter(af=>af.agentId===id);
  body.innerHTML=`<div class="ag-wrap"><div class="ag-info">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px">${a.nom.charAt(0)}</div>
      <div>
        <div style="font-size:16px;font-weight:700">${_escH(a.nom)}</div>
        ${agentTypeBadges(a)}
      </div>
    </div>
    ${(a.competences||[]).length?`<div class="form-section">Sites maîtrisés</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">${a.competences.map(cid=>`<span class="badge badge-green" style="font-size:11px">${_escH(siteNom(cid))}</span>`).join('')}</div>`:''}
    ${a.tel?`<div style="font-size:13px;margin-bottom:8px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A15 15 0 014 6a2 2 0 011-2z"/></svg> ${a.tel}</div>`:''}
    ${a.email?`<div style="font-size:13px;margin-bottom:8px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7.5l8 5.5 8-5.5"/></svg> ${a.email}</div>`:''}
    ${_contratLabel(a,13)}
    ${a.notes?`<div style="font-size:13px;color:var(--text2);margin-bottom:16px">${_escH(a.notes)}</div>`:''}
    <div class="form-section">Absences</div>
    ${_agentAbsencesHTML(id)}
    <div class="form-section">Affectations</div>
    ${afs.filter(af=>!_affIsPast(af)).length?afs.filter(af=>!_affIsPast(af)).map(af=>`<div class="affect-row">
      <div class="affect-dot"></div>
      <div class="affect-info">
        <div class="affect-site">${siteNom(af.siteId)}</div>
        <div class="affect-detail">${af.jours.join(', ')} · ${af.debut}–${af.fin}
          <span class="semaine-tag ${af.semaine==='A'?'semaine-a':af.semaine==='B'?'semaine-b':'semaine-all'}">${af.semaine==='toutes'?'Toutes sem.':'Sem. '+semParityLabel(af.semaine).toLowerCase()}</span>
          ${_affPeriodLabel(af)}
        </div>
        <button class="btn btn-secondary btn-sm" style="margin-top:6px" onclick="versionAffect('${af.id}','${id}')">Modifier à partir du…</button>
      </div>
      <button class="btn-icon" title="Modifier l'affectation" onclick="editAffectFromAgent('${af.id}','${id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></button>
      <button class="btn-icon red" title="Supprimer l'affectation" onclick="delAffectFromAgent('${af.id}','${id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>
    </div>`).join(''):`<div style="font-size:13px;color:var(--text3)">Aucune affectation en cours</div>`}
    ${_affHistHTML(afs.filter(_affIsPast), af=>`editAffectFromAgent('${af.id}','${id}')`, af=>`delAffectFromAgent('${af.id}','${id}')`)}
    <button class="btn btn-secondary btn-sm" style="margin-top:10px;width:100%" onclick="addAffectFromAgent('${id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M12 5v14M5 12h14"/></svg> Ajouter une affectation</button>
    </div><div class="ag-week" id="ag-week"></div></div>`;
  renderAgentWeek(id);
  footer.innerHTML=`<button class="btn btn-secondary" onclick="absenceDepuisSelection('${id}',_ymd(new Date()))"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M14.5 14l-4 4M10.5 14l4 4"/></svg> Déclarer absent</button><button class="btn btn-secondary" onclick="openPanel('panel-agent','${id}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg> Modifier</button>`;
}

