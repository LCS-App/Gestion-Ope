// Couverture des créneaux + panneau site
/* ═════════════════════════════════════
   COUVERTURE DES CRÉNEAUX D'OUVERTURE
   Croise site.creneaux (horaires d'ouverture) avec la couverture réelle.
   Deux natures de trou, deux traitements :
   • RÉCURRENT — aucune affectation ne couvre le créneau, chaque semaine.
     C'est un problème de données ou de contrat → pastille sur la fiche site + onglet "Récurrents".
   • DU JOUR — le créneau était couvert, une absence non remplacée / une libération l'a vidé.
     C'est actionnable maintenant → bande d'alerte.
   Un trou peut être marqué « normal » par site+jour+créneau (site.covIgnore[]).
══════════════════════════════════════ */

function _slotHoles(slot, covered){
  let holes=[slot.slice()];
  covered.forEach(([x,y])=>{
    const next=[];
    holes.forEach(([a,b])=>{
      if(y<=a||x>=b){ next.push([a,b]); return; }
      if(x>a) next.push([a,Math.min(x,b)]);
      if(y<b) next.push([Math.max(y,a),b]);
    });
    holes=next;
  });
  return holes.filter(([a,b])=>b>a);
}
function _hm(m){ return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }
function _holesLabel(holes){ return holes.map(([a,b])=>_hm(a)+'–'+_hm(b)).join(' + '); }
function _covKey(jour,debut,fin){ return jour+'|'+debut+'-'+fin; }
function covIgnored(site,jour,c){ return (site.covIgnore||[]).includes(_covKey(jour,c.debut,c.fin)); }
function covToggleIgnore(siteId,jour,debut,fin){
  const sites=gs(); const i=sites.findIndex(s=>s.id===siteId); if(i<0) return;
  const key=_covKey(jour,debut,fin);
  const list=(sites[i].covIgnore||[]).slice();
  const at=list.indexOf(key);
  if(at>=0) list.splice(at,1); else list.push(key);
  sites[i]={...sites[i],covIgnore:list};
  ss(sites);
  toast(at>=0?'Alerte réactivée':'Trou marqué comme normal');
  if(currentPanel==='panel-couverture') buildPanel('panel-couverture',currentPanelData);
  refreshCurrentView();
}

/* Seuls les agents d'accueil tiennent un créneau d'ouverture de site.
   Les multisites sont inclus : ce sont les remplaçants des postes d'accueil.
   Logistique, factotum et chantier passent sur site sans assurer l'ouverture. */
function estAgentAccueil(ag){ return agTypes(ag).some(t=>t==='accueil'||t==='concierge'||t==='multisite'); }
function couvreAccueil(ag,x){ const n=natureOf(x); if(n==='permanence') return true; if(n==='passage') return false; return estAgentAccueil(ag); }
function _afCouvreFn(){ const m=new Map(ga().filter(a=>!a.inactif).map(a=>[a.id,a])); return af=>m.has(af.agentId)&&couvreAccueil(m.get(af.agentId),af); }
function _accueilIds(){ return new Set(ga().filter(a=>!a.inactif&&estAgentAccueil(a)).map(a=>a.id)); }

/* Intervalles réellement couverts sur un site à une date (absences, remplacements, exceptions inclus) */
function _siteCoveredIntervals(siteId,date){
  const dateStr=_ymd(date); const out=[];
  ga().filter(a=>!a.inactif).forEach(ag=>{
    const dayAffecs=gaf().filter(af=>af.agentId===ag.id && _affActiveOn(af,date));
    const ab=gab().find(x=>x.agentId===ag.id && _absCoversDate(x,date));
    effectiveShifts(ag.id,dateStr,dayAffecs).forEach(s=>{
      if(s.siteId!==siteId) return;
      if(!couvreAccueil(ag,s)) return;
      if(ab && s.afId && !_replFor(ab, s.afId+'@'+dateStr)) return; // absent et non remplacé
      out.push([_mins(s.debut),_mins(s.fin)]);
    });
  });
  return out;
}
/* Couverture théorique : affectations récurrentes seules, sans aucun aléa */
function _siteBaseIntervals(siteId,date,strict){
  const couvre=_afCouvreFn();
  return gaf().filter(af=>af.siteId===siteId && couvre(af) && _affActiveOn(af,date,!strict)).map(af=>[_mins(af.debut),_mins(af.fin)]);
}

/* Contrat client : le site n'a d'obligation d'ouverture que pendant le contrat de son client */
function _siteContrat(s){ const cid=s&&s.client?_dvClients[s.client.trim().toLowerCase()]:null; const c=cid?(_dvCli.clients||[]).find(x=>x.id===cid):null; return c?{debut:c.debut||'',fin:c.fin||''}:{debut:'',fin:''}; }
function _siteContratActif(s,date){ const k=_siteContrat(s), ds=_ymd(date); return !(k.debut&&ds<k.debut) && !(k.fin&&ds>k.fin); }

function covGapsOnDate(date){
  const jour=JOURS[(date.getDay()+6)%7]; const out=[];
  gs().forEach(s=>{
    if(siteFermeLe(s.id,date) || !_siteContratActif(s,date)) return;
    (s.creneaux||[]).forEach(c=>{
      if(!c.debut||!c.fin) return;
      if(!(c.jours||[]).includes(jour) || covIgnored(s,jour,c)) return;
      const slot=[_mins(c.debut),_mins(c.fin)];
      const holes=_slotHoles(slot,_siteCoveredIntervals(s.id,date));
      if(!holes.length) return;
      const base=_slotHoles(slot,_siteBaseIntervals(s.id,date));
      const contrat=JSON.stringify(base)!==JSON.stringify(_slotHoles(slot,_siteBaseIntervals(s.id,date,true)));
      out.push({ siteId:s.id, jour, dateStr:_ymd(date), debut:c.debut, fin:c.fin, holes,
        manque:holes.reduce((a,[x,y])=>a+y-x,0), total:slot[1]-slot[0],
        totalHole: holes.length===1 && holes[0][0]===slot[0] && holes[0][1]===slot[1],
        degrade: JSON.stringify(base)!==JSON.stringify(holes), contrat });
    });
  });
  return out;
}

/* Trous de la semaine affichée causés par un aléa du jour (les récurrents sont exclus) */
function covGapsWeek(){
  const out=[];
  if(typeof weekStart==='undefined'||!weekStart) return out;
  for(let i=0;i<5;i++){
    const d=new Date(weekStart); d.setDate(d.getDate()+i);
    covGapsOnDate(d).filter(g=>g.degrade).forEach(g=>out.push(g));
  }
  const seen=new Set(out.map(g=>g.dateStr+'|'+g.siteId+'|'+g.debut));
  covGapsContrats().forEach(g=>{ const k=g.dateStr+'|'+g.siteId+'|'+g.debut; if(!seen.has(k)){ seen.add(k); out.push(g); } });
  return out.sort((a,b)=>a.dateStr.localeCompare(b.dateStr)||siteNom(a.siteId).localeCompare(siteNom(b.siteId)));
}

/* Trous créés par une fin de contrat sans successeur, sur le mois glissant à venir */
function covGapsContrats(){
  const t0=new Date(); t0.setHours(0,0,0,0);
  const lim=new Date(t0); lim.setDate(lim.getDate()+_CONTRAT_ALERTE_J);
  const t0s=_ymd(t0), lims=_ymd(lim);
  if(!ga().some(a=>!a.inactif&&((a.contratFin&&a.contratFin>=t0s&&a.contratFin<lims)||(a.contratDebut&&a.contratDebut>t0s&&a.contratDebut<=lims)))) return [];
  const out=[];
  for(let d=new Date(t0); d<=lim; d.setDate(d.getDate()+1)){
    const wd=d.getDay(); if(wd===0||wd===6) continue;
    covGapsOnDate(new Date(d)).filter(g=>g.degrade&&g.contrat).forEach(g=>out.push(g));
  }
  return out;
}

/* Trous récurrents : la structure du planning ne couvre pas le créneau d'ouverture */
function covGapsRecurrents(){
  const today=new Date();
  const couvre=_afCouvreFn();
  const map=new Map();
  gs().forEach(s=>{
    const k=_siteContrat(s); let ref=today;
    if(k.debut && _ymd(today)<k.debut) ref=new Date(k.debut+'T12:00:00');
    if(k.fin && _ymd(ref)>k.fin) return;
    const depuis=ref===today?'':_ymd(ref);
    (s.creneaux||[]).forEach(c=>{
      if(!c.debut||!c.fin) return;
      (c.jours||[]).forEach(jour=>{
        if(covIgnored(s,jour,c)) return;
        const slot=[_mins(c.debut),_mins(c.fin)];
        ['A','B'].forEach(par=>{
          const cov=gaf().filter(af=>af.siteId===s.id && couvre(af) && (af.jours||[]).includes(jour)
              && (af.semaine==='toutes'||af.semaine===par) && _affInRange(af,ref) && _contratInRange(af.agentId,ref))
            .map(af=>[_mins(af.debut),_mins(af.fin)]);
          const holes=_slotHoles(slot,cov);
          if(!holes.length) return;
          const k=s.id+'|'+jour+'|'+c.debut+'-'+c.fin+'|'+JSON.stringify(holes);
          const prev=map.get(k);
          if(prev){ prev.parite='toutes'; return; }
          map.set(k,{ siteId:s.id, jour, debut:c.debut, fin:c.fin, holes, parite:par, depuis, slots:[[c.debut,c.fin]],
            manque:holes.reduce((a,[x,y])=>a+y-x,0), total:slot[1]-slot[0],
            totalHole: holes.length===1 && holes[0][0]===slot[0] && holes[0][1]===slot[1] });
        });
      });
    });
  });
  const _union=iv=>{ const o=[]; iv.slice().sort((a,b)=>a[0]-b[0]).forEach(([x,y])=>{ const l=o[o.length-1]; if(l&&x<=l[1]) l[1]=Math.max(l[1],y); else o.push([x,y]); }); return o; };
  const mg=new Map();
  [...map.values()].forEach(g=>{
    const k=g.siteId+'|'+g.jour+'|'+g.parite, p=mg.get(k);
    if(!p){ mg.set(k,{...g, holes:g.holes.map(x=>x.slice()), slots:g.slots.slice(), _op:[[_mins(g.debut),_mins(g.fin)]]}); return; }
    p.holes=_union(p.holes.concat(g.holes)); p.slots.push(...g.slots); p._op.push([_mins(g.debut),_mins(g.fin)]);
  });
  return [...mg.values()].map(g=>{
    const op=_union(g._op); delete g._op;
    g.debut=_hm(op[0][0]); g.fin=_hm(op[op.length-1][1]);
    g.total=op.reduce((a,[x,y])=>a+y-x,0); g.manque=g.holes.reduce((a,[x,y])=>a+y-x,0);
    g.totalHole=g.manque>=g.total; return g;
  }).sort((a,b)=>
    siteNom(a.siteId).localeCompare(siteNom(b.siteId))||JOURS.indexOf(a.jour)-JOURS.indexOf(b.jour)||_mins(a.debut)-_mins(b.debut));
}
function covIgnoreSlots(siteId,jour,slots){
  const sites=gs(); const i=sites.findIndex(s=>s.id===siteId); if(i<0) return;
  const list=(sites[i].covIgnore||[]).slice();
  String(slots).split(',').forEach(sl=>{ const [d,f]=sl.split('-'); const key=_covKey(jour,d,f); if(!list.includes(key)) list.push(key); });
  sites[i]={...sites[i],covIgnore:list}; ss(sites);
  toast('Créneau ignoré');
  if(currentPanel==='panel-couverture') buildPanel('panel-couverture',currentPanelData);
  refreshCurrentView();
}

let covTab='jour';
function covSetTab(t){ covTab=t; buildPanel('panel-couverture',currentPanelData); }

function _covRowHtml(g,mode){
  const rouge=g.totalHole;
  const dot=rouge?'var(--red)':'#B8860B';
  const grav=(rouge?'Personne sur le créneau':`Manque ${_fmtDur(g.manque)} sur ${_fmtDur(g.total)}`)+(g.contrat?' · début/fin de contrat':'');
  const when = mode==='jour'
    ? new Date(g.dateStr+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'})
    : g.jour + (g.parite==='toutes'?'':(g.parite==='A'?' · semaines impaires':' · semaines paires'));
  const act = mode==='jour'
    ? `<button class="btn btn-sm btn-primary" onclick="openPanel('panel-couvrir','${g.siteId}|${g.dateStr}|${_hm(g.holes[0][0])}|${_hm(g.holes[0][1])}')">Attribuer</button>`
    : `<button class="btn btn-sm btn-secondary" onclick="covGoAffect('${g.siteId}','${g.jour}','${_hm(g.holes[0][0])}','${_hm(g.holes[0][1])}')">Affecter</button>`;
  return `<div class="cov-row">
    <span class="cov-dot" style="background:${dot}"></span>
    <div style="flex:1;min-width:0">
      ${mode==='jour'?`<div style="font-weight:600;font-size:13px">${_escH(siteNom(g.siteId))}</div>`:''}
      <div style="${mode==='jour'?'font-size:12px;color:var(--text2);margin-top:2px':'font-weight:600;font-size:13px'}">${_cap(when)}${mode==='jour'?' · ouverture ':'<span style="font-weight:400;color:var(--text2)"> · ouverture '}${g.debut}–${g.fin}${mode==='jour'?'':'</span>'}</div>
      <div style="font-size:12px;color:${rouge?'var(--red)':'#8A6410'};font-weight:600;margin-top:3px">${_holesLabel(g.holes)} — ${grav}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
      ${act}
      <button class="btn btn-sm btn-secondary" style="font-size:11px" onclick="${mode==='jour'?`covToggleIgnore('${g.siteId}','${g.jour}','${g.debut}','${g.fin}')`:`covIgnoreSlots('${g.siteId}','${g.jour}','${(g.slots||[[g.debut,g.fin]]).map(x=>x.join('-')).join(',')}')`}" title="Ne plus alerter sur ce créneau">Ignorer</button>
    </div>
  </div>`;
}

function _covRecGroups(list){
  const by=new Map(); list.forEach(g=>{ (by.get(g.siteId)||by.set(g.siteId,[]).get(g.siteId)).push(g); });
  return [...by.entries()].map(([sid,rows])=>{
    const d=rows[0].depuis;
    return `<div style="margin-bottom:18px"><div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;padding-bottom:6px;border-bottom:1px solid var(--border)"><span style="font-weight:800;font-size:14px">${_escH(siteNom(sid))}</span><span style="font-size:12px;color:var(--text2)">${d?'à couvrir à partir du '+_dFr(d):'à couvrir dès maintenant'}</span></div>${rows.map(g=>_covRowHtml(g,'rec')).join('')}</div>`;
  }).join('');
}
function buildPanelCouverture(body,footer){
  const week=covGapsWeek();
  const rec=covGapsRecurrents();
  const list = covTab==='jour' ? week : rec;
  const ignored=gs().reduce((n,s)=>n+(s.covIgnore||[]).length,0);
  body.innerHTML=`
    <div class="seg" style="margin-bottom:14px">
      <button type="button" class="seg-btn${covTab==='jour'?' active':''}" onclick="covSetTab('jour')">Cette semaine (${week.length})</button>
      <button type="button" class="seg-btn${covTab==='rec'?' active':''}" onclick="covSetTab('rec')">Récurrents (${rec.length})</button>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;margin-bottom:16px;font-size:12.5px;color:var(--text2);line-height:1.45">
      ${covTab==='jour'
        ? "Créneaux d'ouverture qu'un aléa a vidés cette semaine (absence non remplacée, créneau libéré). <strong>À traiter maintenant.</strong>"
        : "Créneaux d'ouverture qu'aucune affectation récurrente ne couvre. <strong>Problème de planning ou de saisie</strong> — à corriger une fois pour toutes."}
      <div style="margin-top:6px">Seuls les plannings des <strong>agents d'accueil</strong> (et des multisites qui les remplacent) sont comparés aux horaires d'ouverture. Les passages logistique, factotum et chantier ne comptent pas comme couverture.</div>
    </div>
    ${list.length
      ? (covTab==='jour' ? list.map(g=>_covRowHtml(g,covTab)).join('') : _covRecGroups(list))
      : `<div class="empty" style="padding:36px 12px"><div class="empty-text">${covTab==='jour'?'Tous les créneaux d\'ouverture sont couverts cette semaine':'Aucun trou récurrent'}</div></div>`}
    ${ignored?`<div style="font-size:11px;color:var(--text3);margin-top:14px;padding-top:10px;border-top:1px solid var(--border)">${ignored} créneau${ignored>1?'x':''} ignoré${ignored>1?'s':''} — modifiable depuis la fiche du site.</div>`:''}`;
  footer.innerHTML=`<button class="btn btn-secondary" onclick="closePanel()">Fermer</button>`;
}

function covGoAffect(siteId,jour,debut,fin){ openPanel('panel-affect',{siteId,jour,debut,fin}); }
function covOpenRec(){ covTab='rec'; openPanel('panel-couverture'); }
/* Ouverture depuis la bande : on tombe sur l'onglet qui a quelque chose à montrer */
function covOpenBand(){ covTab = covGapsWeek().length ? 'jour' : 'rec'; openPanel('panel-couverture'); }

let covCandQ='';
function covFilterCands(q){
  covCandQ=q.toLowerCase();
  document.querySelectorAll('#cov-cands [data-nom]').forEach(el=>{
    el.style.display = el.getAttribute('data-nom').includes(covCandQ)?'':'none';
  });
}

function buildPanelCouvrir(body,footer,raw){
  const [siteId,dateStr,hd,hf]=String(raw).split('|');
  const date=new Date(dateStr+'T00:00:00');
  const dateLabel=date.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  const libres=[], occupes=[];
  ga().filter(a=>!a.inactif && estAgentAccueil(a)).forEach(a=>{
    const ab=gab().find(x=>x.agentId===a.id && _absCoversDate(x,date));
    const busy = ab ? {type:'absence'} : _croiseBusy(a.id,date,hd,hf,null);
    (busy?occupes:libres).push({a,busy});
  });
  const row=({a,busy})=>{
    const why = !busy ? '' : busy.type==='absence' ? 'Absent ce jour'
      : `Déjà pris · ${_escH(siteNom(busy.siteId))} ${busy.debut}–${busy.fin}`;
    return `<div data-nom="${_escA(a.nom.toLowerCase())}" class="cov-row" style="cursor:pointer" onclick="covAssign('${a.id}','${siteId}','${dateStr}','${hd}','${hf}',${busy?'true':'false'})">
      <span class="cov-dot" style="background:${busy?'var(--red)':'var(--green)'}"></span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px">${_escH(a.nom)}</div>
        ${why?`<div style="font-size:11.5px;color:var(--red);margin-top:2px">⚠ ${why}</div>`
              :`<div style="font-size:11.5px;color:var(--text3);margin-top:2px">Libre sur ce créneau${isRespOpe(a)?' · responsable opé':a.remplacant?' · remplaçant':''}</div>`}
      </div>
    </div>`;
  };
  body.innerHTML=`
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:4px">${_cap(dateLabel)}</div>
    <div style="font-weight:700;font-size:14px;margin-bottom:2px">${_escH(siteNom(siteId))}</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Créneau à couvrir : <strong>${hd}–${hf}</strong></div>
    <input class="form-input" type="search" placeholder="Rechercher un agent…" oninput="covFilterCands(this.value)" style="margin-bottom:12px">
    <div id="cov-cands">
      ${libres.length?`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin:6px 0 2px">Disponibles (${libres.length})</div>${libres.map(row).join('')}`:''}
      ${occupes.length?`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin:16px 0 2px">Déjà occupés (${occupes.length})</div>${occupes.map(row).join('')}`:''}
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:14px;line-height:1.45">Seuls les <strong>agents d'accueil</strong> et les <strong>multisites</strong> sont proposés : eux seuls tiennent un créneau d'ouverture. L'agent choisi reçoit un <strong>créneau ponctuel</strong> sur ce seul jour. Le planning récurrent reste intact.</div>`;
  footer.innerHTML=`<button class="btn btn-secondary" onclick="openPanel('panel-couverture')">Retour</button>`;
}

function covAssign(agentId,siteId,dateStr,debut,fin,busy){
  if(busy && !confirm(`${agentNom(agentId)} est déjà pris sur ce créneau.\n\nL'affecter quand même ?`)) return;
  const arr=gex();
  arr.push({ id:DB.id(), agentId, dateStr, type:'add', siteId, debut, fin,
    notes:"Couverture créneau d'ouverture", createdBy:getCurrentUser(), createdAt:new Date().toISOString() });
  sex(arr);
  toast(agentNom(agentId)+' affecté sur ce créneau');
  refreshCurrentView();
  openPanel('panel-couverture');
}

function buildPanelSite(body,footer,id){
  const s=id?gs().find(x=>x.id===id):null;
  siteCrns=s?JSON.parse(JSON.stringify(s.creneaux||[])):[];
  body.innerHTML=`
    <div class="form-group">
      <label class="form-label">Nom *</label>
      <input class="form-input" type="text" id="ps-nom" value="${s?.nom||''}" placeholder="Ex: Aéroport de Bordeaux">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Adresse</label>
        <input class="form-input" type="text" id="ps-adresse" value="${s?.adresse||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Client</label>
        <input class="form-input" type="text" id="ps-client-q" autocomplete="off" placeholder="Rechercher un client…" style="margin-bottom:6px" oninput="_filterSelectOptions('ps-client',this.value)">
        <div style="display:flex;gap:6px">
          <select class="form-input" id="ps-client" style="flex:1;min-width:0" onchange="psClientChanged()">${_psClientOpts(s?.client||'')}</select>
          <button type="button" class="btn btn-secondary btn-sm" title="Créer un nouveau client" onclick="psNewClient()" style="white-space:nowrap">+ Nouveau</button>
        </div>
      </div>
    </div>
    <div class="form-row" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="form-group">
        <label class="form-label">Typologie</label>
        <select class="form-input" id="ps-typo"><option value="">—</option>${['Entreprise','Chantier','Accueil','Hospitality'].map(t=>`<option${s?.typologie===t?' selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Nb salariés (approx.)</label>
        <input class="form-input" type="number" min="0" step="1" id="ps-nbsal" value="${s?.nbSalaries??''}">
      </div>
      <div class="form-group">
        <label class="form-label">Semaines de permanence</label>
        <input class="form-input" type="number" min="0" max="53" step="1" id="ps-nbsem" value="${s?.nbSemPerm??''}">
      </div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin:-6px 0 12px;line-height:1.4">L'appartenance à une <strong>tournée</strong> (ordre de passage, agent attitré) se gère dans l'onglet <strong>Tournées</strong>.</div>
    <div class="form-section">Contact sur site</div>
    <div class="form-group" id="ps-ccontact-wrap" style="display:none">
      <label class="form-label">Contacts du client</label>
      <select class="form-input" id="ps-ccontact" onchange="psPickContact(this.value)"></select>
    </div>
    <input type="hidden" id="ps-contact-id" value="">
    <div class="form-group">
      <label class="form-label">Nom du contact</label>
      <input class="form-input" type="text" id="ps-contact" value="${s?.contact||''}" placeholder="Ex: Jean Dupont — Responsable accueil">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Téléphone</label>
        <input class="form-input" type="text" id="ps-tel" value="${s?.tel||''}" placeholder="05 xx xx xx xx">
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" type="email" id="ps-email" value="${s?.email||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Particularités / Notes</label>
      <textarea class="form-input" id="ps-notes" placeholder="Accès, code badge, consignes particulières…">${s?.notes||''}</textarea>
    </div>
    <div class="form-section" id="ps-sec-crn">Créneaux d'ouverture</div>
    <div id="ps-crns"></div>
    <div style="margin-top:10px;padding:12px 12px 14px;border:1px dashed var(--border);border-radius:var(--radius-sm)">
      <label class="form-label" style="margin-bottom:6px">Jours</label>
      <div class="jours-row" id="ps-crn-jours" style="margin-bottom:12px">
        ${JOURS.map(j=>`<button type="button" class="jour-pill" data-j="${j}" onclick="this.classList.toggle('on')">${j}</button>`).join('')}
      </div>
      <div class="form-row" style="margin:0">
        <div class="form-group" style="margin:0">
          <label class="form-label">Heure début</label>
          <input class="form-input" type="time" id="ps-crn-debut">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Heure fin</label>
          <input class="form-input" type="time" id="ps-crn-fin">
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addSiteCrn()">+ Ajouter ce créneau</button>
    </div>
    <div class="form-section">Périodes de fermeture</div>
    ${id?`<div style="font-size:11px;color:var(--text3);margin:-6px 0 10px;line-height:1.4">Le site est fermé (entier) sur ces plages : ses créneaux disparaissent du planning et ses agents sont libérés pour d'autres postes.</div>
    <div style="border:1.5px dashed var(--border,#ddd);border-radius:12px;padding:12px;margin-bottom:14px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:10px">Nouvelle fermeture</div>
    <div class="form-row" style="align-items:flex-end">
      <div class="form-group"><label class="form-label">Du</label><input class="form-input" type="date" id="pf-debut"></div>
      <div class="form-group"><label class="form-label">Au</label><input class="form-input" type="date" id="pf-fin"></div>
    </div>
    <div class="form-group"><label class="form-label">Motif</label><input class="form-input" type="text" id="pf-motif" placeholder="Ex: Fermeture estivale, jour férié…"></div>
    <button type="button" class="btn btn-secondary btn-sm" onclick="addSiteFerm()">+ Ajouter à la liste</button>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:6px">Fermetures programmées</div>
    <div id="ps-ferms"></div>`
    :`<div style="font-size:12px;color:var(--text3);padding:4px 0">Enregistrez d'abord le site pour pouvoir programmer des fermetures.</div>`}
    <input type="hidden" id="ps-id" value="${id||''}">`;
  siteFerms = id ? gferm().filter(f=>f.siteId===id).slice().sort((a,b)=>a.dateDebut.localeCompare(b.dateDebut)) : [];
  renderSiteCrns();
  renderSiteFerms();
  psClientChanged(true);
  footer.innerHTML=`
    <button class="btn btn-secondary" onclick="closePanel()">Annuler</button>
    <button class="btn btn-primary" onclick="saveSite()">Enregistrer</button>`;
}

function renderSiteCrns(){
  const el=document.getElementById('ps-crns');
  if(!el) return;
  if(!siteCrns.length){ el.innerHTML=`<div style="font-size:12px;color:var(--text3);padding:8px 0">Aucun créneau</div>`; return; }
  el.innerHTML=siteCrns.map((c,i)=>`<div class="affect-row">
    <div class="affect-dot" style="background:var(--green)"></div>
    <div class="affect-info">
      <div style="font-size:12px;font-weight:600">${c.jours.join(', ')}</div>
      <div style="font-size:11px;color:var(--text3)">${c.debut} – ${c.fin}</div>
    </div>
    <button class="btn-icon red" onclick="siteCrns.splice(${i},1);renderSiteCrns()"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg></button>
  </div>`).join('');
}

function addSiteCrn(){
  const jours=[...document.querySelectorAll('#ps-crn-jours .jour-pill.on')].map(b=>b.dataset.j);
  const debut=document.getElementById('ps-crn-debut').value;
  const fin=document.getElementById('ps-crn-fin').value;
  if(!jours.length){ toast('Sélectionnez au moins un jour',false); return; }
  if(!debut||!fin){ toast('Renseignez les heures de début et de fin',false); return; }
  if(_mins(fin)<=_mins(debut)){ toast('L’heure de fin doit être après le début',false); return; }
  siteCrns.push({jours,debut,fin});
  renderSiteCrns();
  document.querySelectorAll('#ps-crn-jours .jour-pill.on').forEach(b=>b.classList.remove('on'));
  document.getElementById('ps-crn-debut').value='';
  document.getElementById('ps-crn-fin').value='';
}

function _dvClientNames(){ return Object.values(_dvClientNoms).sort((a,b)=>a.localeCompare(b,'fr')); }
async function _dvCreateClient(nom){
  const m=await _dvMeta('lcs_client');
  const body=await _dvBody('lcs_client',{ lcs_nom:nom, lcs_filiale:_dvFil.me ? '#'+_dvFil.me : undefined }, true);
  const r=await _dvReq('POST', m.set, body);
  const g=r[m.pk]; _dvClients[nom.trim().toLowerCase()]=g; _dvClientNoms[g]=nom.trim();
  return g;
}
function _psClientOpts(cur){
  const names=_dvClientNames(); if(cur && !names.some(n=>n.toLowerCase()===cur.trim().toLowerCase())) names.unshift(cur);
  return '<option value="">— Aucun client —</option>'+names.map(n=>`<option value="${_escA(n)}"${n.toLowerCase()===(cur||'').trim().toLowerCase()?' selected':''}>${_escH(n)}</option>`).join('');
}
/* Contacts Dataverse du client choisi → liste pour remplir le contact du site (pré-rempli si un seul contact et champs vides) */
function psClientChanged(init){
  const v=document.getElementById('ps-client').value.trim(), g=v && _dvClients[v.toLowerCase()];
  const list=(g && _dvClientContacts[g]) || [], wrap=document.getElementById('ps-ccontact-wrap'), sel=document.getElementById('ps-ccontact');
  if(!wrap||!sel) return;
  wrap.style.display=list.length?'block':'none';
  sel.innerHTML='<option value="">— Choisir un contact ('+list.length+') —</option>'+list.map(c=>`<option value="${c.id}">${_escH(c.nom+(c.fonction?' · '+c.fonction:''))}</option>`).join('');
  const empty=['ps-contact','ps-tel','ps-email'].every(id=>!document.getElementById(id).value.trim());
  if(!init && empty && list.length===1){ sel.value=list[0].id; psPickContact(list[0].id); }
}
function psPickContact(id){
  const v=document.getElementById('ps-client').value.trim(), g=v && _dvClients[v.toLowerCase()];
  const c=((g && _dvClientContacts[g])||[]).find(x=>x.id===id); if(!c) return;
  document.getElementById('ps-contact').value=c.nom; document.getElementById('ps-tel').value=c.tel; document.getElementById('ps-email').value=c.email;
  document.getElementById('ps-contact-id').value=c.siteLibre ? c.id : '';
}
async function psNewClient(){
  const inp=document.getElementById('ps-client');
  const nom=(prompt('Nom du nouveau client :', '')||'').trim(); if(!nom) return;
  if(_dvClients[nom.toLowerCase()]){ inp.innerHTML=_psClientOpts(_dvClientNoms[_dvClients[nom.toLowerCase()]]||nom); psClientChanged(); toast('Ce client existe déjà'); return; }
  try{ await _dvCreateClient(nom); inp.innerHTML=_psClientOpts(nom); psClientChanged();
    toast('Client « '+nom+' » créé'); }
  catch(e){ console.error(e); toast('Création du client impossible',false); }
}
async function saveSite(){
  const nom=document.getElementById('ps-nom').value.trim();
  if(!nom){ toast('Nom requis',false); return; }
  const cl=document.getElementById('ps-client'), clv=cl.value.trim();
  if(clv){
    const g=_dvClients[clv.toLowerCase()];
    if(g) cl.value=_dvClientNoms[g]||clv;
    else { if(!confirm('Le client « '+clv+' » n\'existe pas encore.\n\nLe créer ?')) return;
      try{ await _dvCreateClient(clv); } catch(e){ console.error(e); toast('Création du client impossible',false); return; } }
  }
  const id=document.getElementById('ps-id').value;
  const sites=gs();
  const _int=id=>{ const v=parseInt(document.getElementById(id).value,10); return isFinite(v)&&v>=0?v:null; };
  const _cid=document.getElementById('ps-contact-id').value;
  const data={...(_cid?{contactDvid:_cid}:{}),nom,typologie:document.getElementById('ps-typo').value,nbSalaries:_int('ps-nbsal'),nbSemPerm:_int('ps-nbsem'),adresse:document.getElementById('ps-adresse').value,client:document.getElementById('ps-client').value,contact:document.getElementById('ps-contact').value,tel:document.getElementById('ps-tel').value,email:document.getElementById('ps-email').value,notes:document.getElementById('ps-notes').value,creneaux:siteCrns};
  if(id){ const i=sites.findIndex(s=>s.id===id); sites[i]={...sites[i],...data}; }
  else sites.push({id:DB.id(),...data});
  ss(sites);
  if(id){ sferm([...gferm().filter(f=>f.siteId!==id), ...siteFerms.map(f=>({...f,siteId:id}))]); }
  closePanel(); toast(id?'Site modifié':'Site ajouté'); renderSites(); if(currentView==='clients') renderClients();
  buildTourneeFilters();
}

function delSite(id){
  if(!confirm('Supprimer ce site ?')) return;
  ss(gs().filter(s=>s.id!==id));
  saf(gaf().filter(af=>af.siteId!==id));
  sferm(gferm().filter(f=>f.siteId!==id));
  st(gt().map(t=>({...t,siteIds:(t.siteIds||[]).filter(x=>x!==id)})));
  renderSites(); toast('Site supprimé'); buildTourneeFilters();
}

