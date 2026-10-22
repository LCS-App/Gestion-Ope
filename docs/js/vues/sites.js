// Vue sites (liste, fiche, fermetures)
/* ═══════════════════════════════════════
   SITES
═══════════════════════════════════════ */
let siteCrns=[];
let siteFerms=[];

function renderSiteFerms(){
  const el=document.getElementById('ps-ferms');
  if(!el) return;
  if(!siteFerms.length){ el.innerHTML=`<div style="font-size:12px;color:var(--text3);padding:4px 0">Aucune fermeture programmée</div>`; return; }
  el.innerHTML=siteFerms.map((f,i)=>{
    const meme=f.dateDebut===(f.dateFin||f.dateDebut);
    const periode = meme ? fmtDate(f.dateDebut) : fmtDate(f.dateDebut)+' → '+fmtDate(f.dateFin);
    return `<div class="affect-row">
    <div class="affect-dot" style="background:#9A9C97"></div>
    <div class="affect-info">
      <div style="font-size:12px;font-weight:600">${periode}</div>
      ${f.motif?`<div style="font-size:11px;color:var(--text3)">${_escH(f.motif)}</div>`:''}
    </div>
    <button class="btn-icon red" onclick="siteFerms.splice(${i},1);renderSiteFerms()"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>
  </div>`;}).join('');
}

function addSiteFerm(){
  const d=document.getElementById('pf-debut').value;
  const f=document.getElementById('pf-fin').value||d;
  const m=document.getElementById('pf-motif').value.trim();
  if(!d){ toast('Date de début requise',false); return; }
  if(f<d){ toast('La date de fin précède le début',false); return; }
  siteFerms.push({id:DB.id(),siteId:document.getElementById('ps-id').value,dateDebut:d,dateFin:f,motif:m,notes:''});
  siteFerms.sort((a,b)=>a.dateDebut.localeCompare(b.dateDebut));
  document.getElementById('pf-debut').value='';
  document.getElementById('pf-fin').value='';
  document.getElementById('pf-motif').value='';
  renderSiteFerms();
}

function clientEdit(id,anchor){ siteEdit(id,anchor,'panel-client'); }
function siteEdit(id,anchor,panel){
  openPanel(panel||'panel-site',id);
  if(!anchor) return;
  setTimeout(()=>{ const el=document.getElementById(anchor); if(!el) return; let p=el.parentElement; while(p&&p.scrollHeight<=p.clientHeight) p=p.parentElement; if(p) p.scrollTop=el.getBoundingClientRect().top-p.getBoundingClientRect().top+p.scrollTop-8; },80);
}
function siteFermToggle(){ const f=document.getElementById('sf-form'); if(f) f.style.display=f.style.display==='none'?'block':'none'; }
function siteFermAdd(sid){
  const d=document.getElementById('sf-debut').value, f=document.getElementById('sf-fin').value||d, m=document.getElementById('sf-motif').value.trim();
  if(!d){ toast('Date de début requise',false); return; }
  if(f<d){ toast('La date de fin précède le début',false); return; }
  sferm([...gferm(),{id:DB.id(),siteId:sid,dateDebut:d,dateFin:f,motif:m,notes:''}]);
  toast('Fermeture ajoutée'); renderSites(); if(currentView==='clients') renderClients();
}
function siteFermDel(id){ if(!confirm('Supprimer cette fermeture ?')) return; sferm(gferm().filter(f=>f.id!==id)); toast('Fermeture supprimée'); renderSites(); if(currentView==='clients') renderClients(); }

/* Sites : liste à gauche + fiche à droite (même mise en page que Clients) */
const _site = { sel:null, tab:'tous' };
function siteSelect(id){ _site.sel=id; renderSites(); }
function siteTab(t){ _site.tab=t; renderSites(); }
function cliOpen(cid){ _cli.sel=cid; _cli.tab='tous'; const i=document.getElementById('search-clients'); if(i) i.value=''; showView('clients'); }
function renderSites(){
  const list=document.getElementById('sites-list'); if(!list) return;
  const q=(document.getElementById('search-sites')?.value||'').trim().toLowerCase();
  const rec={}; covGapsRecurrents().forEach(g=>{ (rec[g.siteId]=rec[g.siteId]||[]).push(g); });
  const all=gs().slice().sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
  let rows=all;
  if(_site.tab==='trous') rows=rows.filter(s=>rec[s.id]);
  if(q) rows=rows.filter(s=>s.nom.toLowerCase().includes(q)||(s.client||'').toLowerCase().includes(q)||(siteTournee(s.id)?.nom||'').toLowerCase().includes(q)||(s.adresse||'').toLowerCase().includes(q));
  document.getElementById('sites-sub').textContent=`${all.length} site${all.length>1?'s':''}`;
  document.getElementById('sites-tabs').innerHTML=`<button class="tab${_site.tab==='tous'?' on':''}" onclick="siteTab('tous')">Tous</button><button class="tab${_site.tab==='trous'?' on':''}" onclick="siteTab('trous')">Non couverts (${Object.keys(rec).length})</button>`;
  if(!rows.some(s=>s.id===_site.sel)) _site.sel=rows[0]?.id||null;
  list.innerHTML=rows.length?rows.map(s=>`<button class="cli-item${s.id===_site.sel?' on':''}" onclick="siteSelect('${s.id}')">
      <span style="flex:1;min-width:0"><span class="cli-item-nom">${_escH(s.nom)}</span><span class="cli-item-sub">${_escH(s.client||'Sans client')}</span></span>
      ${rec[s.id]?`<span class="cli-dot" style="background:var(--orange)" title="${rec[s.id].length} créneau(x) non couvert(s)"></span>`:''}
    </button>`).join(''):`<div class="cli-empty" style="padding:16px 10px">Aucun site</div>`;
  const s=all.find(x=>x.id===_site.sel);
  document.getElementById('sites-fiche').innerHTML=s?_siteFiche(s,rec):`<div class="empty"><div class="empty-text">Sélectionnez un site</div></div>`;
}
function _siteFiche(s,rec){
  const today=new Date(); today.setHours(0,0,0,0); const ts=_ymd(today), sid=`'${s.id}'`;
  const t=siteTournee(s.id), cid=s.client?_dvClients[s.client.trim().toLowerCase()]:'';
  const afs=gaf().filter(af=>af.siteId===s.id&&!(af.dateFin&&af.dateFin<ts)), gaps=rec[s.id]||[];
  const wk=[]; for(let i=0;i<7;i++) covGapsOnDate(_addDays(today,i)).filter(g=>g.siteId===s.id&&g.degrade).forEach(g=>wk.push(g));
  const ferms=gferm().filter(f=>f.siteId===s.id&&(f.dateFin||f.dateDebut)>=ts).sort((a,b)=>a.dateDebut.localeCompare(b.dateDebut));
  const closed=ferms.find(f=>f.dateDebut<=ts);
  const cts=cid?_dvCli.contacts.filter(x=>x.clientId===cid&&(!x.siteG||x.siteG===(s._dvid||s.id))).sort((a,b)=>(!!b.siteG)-(!!a.siteG)):[];
  const byAg={}; afs.forEach(af=>(byAg[af.agentId]=byAg[af.agentId]||[]).push(af));
  const kv=(k,v)=>`<dt>${k}</dt><dd>${v||'<span class="cli-empty">—</span>'}</dd>`;
  const head=`<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
      <div style="flex:1;min-width:0">
        <div style="font-size:22px;font-weight:800;line-height:1.2">${_escH(s.nom)}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${s.client?(cid?`<a href="#" onclick="cliOpen('${cid}');return false" style="font-weight:700">${_escH(s.client)}</a>`:`<span style="font-weight:700">${_escH(s.client)}</span>`):'<span class="cli-empty">Sans client</span>'}
          ${s.typologie?`<span class="badge badge-gray" style="font-size:10px">${_escH(s.typologie)}</span>`:''}
          ${t?`<span class="badge badge-blue" style="font-size:10px">Tournée · ${_escH(t.nom)}</span>`:''}
          ${s.adresse?`<span>· ${_escH(s.adresse)}</span>`:''}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="openPanel('panel-site','${s.id}')">Modifier</button>
      <button class="btn btn-secondary btn-sm" style="color:var(--red)" onclick="delSite('${s.id}')">Supprimer</button>
    </div>
    ${(gaps.length||closed)?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      ${gaps.length?`<span class="cli-pill" style="${_cliTone('orange')};cursor:pointer" onclick="covOpenRec()">${gaps.length} créneau${gaps.length>1?'x':''} non couvert${gaps.length>1?'s':''}</span>`:''}
      ${closed?`<span class="cli-pill" style="${_cliTone('red')}">Fermé jusqu'au ${_dFr(closed.dateFin||closed.dateDebut)}${closed.motif?' · '+_escH(closed.motif):''}</span>`:''}</div>`:''}`;

  const ouv=_cliCard('Ouverture', `<button class="btn btn-secondary btn-sm" onclick="siteEdit('${s.id}','ps-sec-crn')">Modifier</button>`, (s.creneaux||[]).length?(s.creneaux).map(c=>`<div class="cli-row"><div style="flex:1"><div class="cli-row-t">${c.jours.join(', ')}</div><div class="cli-row-s">${c.debut}–${c.fin}</div></div></div>`).join(''):`<div class="cli-empty">Aucun créneau d'ouverture</div>`)
    .replace(/<\/div>$/, `<div style="display:flex;align-items:center;gap:8px;margin:14px 0 6px"><div class="cli-h">Fermetures</div><button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="siteFermToggle()">+ Ajouter une fermeture</button></div>
    <div id="sf-form" style="display:none;border:1.5px dashed var(--border,#ddd);border-radius:12px;padding:12px;margin-bottom:8px"><div class="form-row" style="align-items:flex-end"><div class="form-group"><label class="form-label">Du</label><input class="form-input" type="date" id="sf-debut"></div><div class="form-group"><label class="form-label">Au</label><input class="form-input" type="date" id="sf-fin"></div></div><div class="form-group"><label class="form-label">Motif</label><input class="form-input" type="text" id="sf-motif" placeholder="Ex: Fermeture estivale, jour férié…"></div><div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="siteFermAdd('${s.id}')">Enregistrer la fermeture</button><button class="btn btn-secondary btn-sm" onclick="siteFermToggle()">Annuler</button></div></div>`+(ferms.length?ferms.map(f=>`<div class="cli-row"><div style="flex:1"><div class="cli-row-t">${_dFr(f.dateDebut)}${f.dateFin&&f.dateFin!==f.dateDebut?' → '+_dFr(f.dateFin):''}</div>${f.motif?`<div class="cli-row-s">${_escH(f.motif)}</div>`:''}</div><button class="btn btn-secondary btn-sm" style="color:var(--red)" onclick="siteFermDel('${f.id}')">Supprimer</button></div>`).join(''):'<div class="cli-row-s" style="padding:4px 0">Aucune fermeture à venir</div>')+'</div>');

  const infos=_cliCard('Informations', `<button class="btn btn-secondary btn-sm" onclick="siteEdit('${s.id}')">Modifier</button>`, `<dl class="cli-kv">
      ${kv('Typologie',_escH(s.typologie||''))}${kv('Salariés (approx.)',s.nbSalaries!=null&&s.nbSalaries!==''?s.nbSalaries:'')}${kv('Semaines de permanence',s.nbSemPerm!=null&&s.nbSemPerm!==''?s.nbSemPerm:'')}
      ${kv('Tournée',t?_escH(t.nom):'')}</dl>`);

  const contact=_cliCard('Contacts', (cid&&_cliCanEdit())?`<button class="btn btn-secondary btn-sm" onclick="openPanel('panel-contact',{cid:'${cid}',siteG:'${s._dvid||s.id}'})">+ Ajouter un contact</button>`:'', ((s.contact||s.tel||s.email)?`<div class="cli-row"><div style="flex:1;min-width:0"><div class="cli-row-t">${_escH(s.contact||'Contact sur site')}</div><div class="cli-row-s" style="display:flex;gap:12px;flex-wrap:wrap">${s.tel?`<a href="tel:${_escA(s.tel)}">${_escH(s.tel)}</a>`:''}${s.email?`<a href="mailto:${_escA(s.email)}">${_escH(s.email)}</a>`:''}</div></div></div>`:'')
    +cts.filter(x=>[x.prenom,x.nom].filter(Boolean).join(' ')!==s.contact&&(x.nom+' '+x.prenom)!==s.contact&&(x.prenom+' '+x.nom)!==s.contact).map(x=>`<div class="cli-row"><div style="flex:1;min-width:0"><div class="cli-row-t">${_escH([x.prenom,x.nom].filter(Boolean).join(' '))}</div><div class="cli-row-s">${[x.fonction,x.siteG?'':'Contact du client'].filter(Boolean).map(_escH).join(' · ')}</div><div class="cli-row-s" style="display:flex;gap:12px;flex-wrap:wrap">${x.telport?`<a href="tel:${_escA(x.telport)}">${_escH(x.telport)}</a>`:''}${x.telfixe?`<a href="tel:${_escA(x.telfixe)}">${_escH(x.telfixe)}</a>`:''}${x.mail?`<a href="mailto:${_escA(x.mail)}">${_escH(x.mail)}</a>`:''}</div></div></div>`).join('')
    ||((s.contact||s.tel||s.email)?'':`<div class="cli-empty">Aucun contact</div>`));

  const notes=s.notes?_cliCard('Particularités', '', `<div style="font-size:13px;line-height:1.5;white-space:pre-wrap">${_escH(s.notes)}</div>`,true):'';

  const ags=_cliCard(`Agents affectés <span style="color:var(--text3)">(${Object.keys(byAg).length})</span>`, `<button class="btn btn-secondary btn-sm" onclick="openPanel('panel-affect',{siteId:${sid}})">+ Affecter</button>`,
    Object.keys(byAg).length?Object.entries(byAg).sort((x,y)=>agentNom(x[0]).localeCompare(agentNom(y[0]),'fr')).map(([aid,l])=>`<div class="cli-row clk" onclick="openPanel('panel-agent-detail','${aid}')"><div style="flex:1;min-width:0"><div class="cli-row-t">${_escH(agentNom(aid))}</div>${l.map(af=>`<div class="cli-row-s">${af.jours.join(', ')} · ${af.debut}–${af.fin}${af.dateDebut&&af.dateDebut>ts?` · à partir du ${_dFr(af.dateDebut)}`:''}</div>`).join('')}</div></div>`).join('')
    :`<div class="cli-empty">Aucun agent affecté</div>`);

  const cov=_cliCard('Couverture', '', `
    <div style="font-size:12px;font-weight:700;margin-bottom:6px">7 prochains jours</div>
    ${wk.length?wk.map(g=>_covRowHtml(g,'jour')).join(''):`<div class="cli-empty" style="margin-bottom:6px">Aucun trou ponctuel</div>`}
    <div style="font-size:12px;font-weight:700;margin:14px 0 6px">Récurrents</div>
    ${gaps.length?gaps.map(g=>_covRowHtml(g,'rec')).join(''):`<div class="cli-empty">Tous les créneaux d'ouverture sont couverts</div>`}`);

  return head+`<div class="cli-grid">${ouv}${infos}${contact}${ags}${notes}${cov}</div>`;
}

