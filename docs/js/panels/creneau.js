// Panneau détail créneau
/* ═══════════════════════════════════════
   PANEL — DÉTAIL CRÉNEAU
   data = "afId|agentId|dateStr|absId"
═══════════════════════════════════════ */
function buildPanelCreneau(body,footer,raw){
  const [afId,agentId,dateStr,absId]=raw.split('|');
  const af=gaf().find(x=>x.id===afId);
  const agent=ga().find(x=>x.id===agentId);
  const site=gs().find(x=>x.id===af?.siteId);
  const absence=absId?gab().find(x=>x.id===absId):null;
  const blockKey=afId+'@'+dateStr;
  const dateLabel=new Date(dateStr+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});

  if(!af||!agent||!site){ body.innerHTML='<div class="empty"><div class="empty-text">Créneau introuvable</div></div>'; return; }

  // Statut
  let statusHtml='';
  if(absence){
    const blkRepl=_replFor(absence, blockKey);
    if(blkRepl){
      const repl=ga().find(a=>a.id===blkRepl);
      statusHtml=`<div style="background:#DCEBF7;border:1px solid #B6D4EC;border-radius:var(--radius);padding:14px;margin-bottom:20px"><div style="float:right;margin:-4px -4px 4px 10px">${absenceActionsHTML(absence.id,{day:dateStr})}</div>
        <div style="font-weight:700;color:#134B72;margin-bottom:6px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M7 7h12l-3.2-3.2M17 17H5l3.2 3.2"/></svg> Créneau remplacé</div>
        <div style="font-size:13px">Agent absent : <strong>${_escH(agent.nom)}</strong></div>
        <div style="font-size:13px">Remplaçant : <strong>${_escH(repl?.nom||'—')}</strong></div>
        ${repl?.tel?`<div style="font-size:12px;color:var(--text2);margin-top:4px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A15 15 0 014 6a2 2 0 011-2z"/></svg> ${repl.tel}</div>`:''}
        ${repl?.email?`<div style="font-size:12px;color:var(--text2)"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7.5l8 5.5 8-5.5"/></svg> ${repl.email}</div>`:''}
      </div>`;
    } else {
      statusHtml=`<div style="background:var(--red-light);border:1px solid rgba(226,109,99,.32);border-radius:var(--radius);padding:14px;margin-bottom:20px"><div style="float:right;margin:-4px -4px 4px 10px">${absenceActionsHTML(absence.id,{day:dateStr})}</div>
        <div style="font-weight:700;color:var(--red);margin-bottom:4px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M12 3.6l9 15.4H3z"/><path d="M12 9.6v4.6M12 17.2v.4"/></svg> Agent absent — sans remplaçant</div>
        <div style="font-size:12px;color:var(--text2)">Motif : ${_escH(absence.motif)} · ${_escH(absence.notes||'')}</div>
      </div>`;
    }
  } else {
    statusHtml=`<div style="background:var(--green-light);border:1px solid rgba(116,199,156,.32);border-radius:var(--radius);padding:10px 14px;margin-bottom:20px;display:flex;align-items:center;gap:8px">
      <span style="color:var(--green);font-size:16px">✓</span>
      <span style="font-weight:600;color:var(--green);font-size:13px">Présent</span>
    </div>`;
  }

  // Infos créneau
  const semTag=af.semaine==='A'?'<span class="semaine-tag semaine-a">Sem. impaire</span>':af.semaine==='B'?'<span class="semaine-tag semaine-b">Sem. paire</span>':'<span class="semaine-tag semaine-all">Toutes semaines</span>';

  body.innerHTML=`
    <!-- Date -->
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:16px">${dateLabel}</div>

    ${statusHtml}

    <!-- Agent -->
    <div class="form-section">Agent</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer" onclick="openPanel('panel-agent-detail','${agent.id}')">
      <div style="width:38px;height:38px;border-radius:50%;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0">${agent.nom.charAt(0)}</div>
      <div>
        <div style="font-weight:700;font-size:14px">${_escH(agent.nom)}</div>
        ${agentTypeBadges(agent,'font-size:10px')}
        ${agent.tel?`<div style="font-size:12px;color:var(--text2)"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A15 15 0 014 6a2 2 0 011-2z"/></svg> ${agent.tel}</div>`:''}
      </div>
      <span style="margin-left:auto;color:var(--text3);font-size:12px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M9 6l6 6-6 6"/></svg></span>
    </div>

    <!-- Créneau -->
    <div class="form-section">Créneau</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 12px">
        <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Horaires</div>
        <div style="font-size:16px;font-weight:700">${af.debut}<span style="color:var(--text3)"> – </span>${af.fin}</div>
      </div>
      <div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px 12px">
        <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Jours</div>
        <div style="font-size:13px;font-weight:600">${af.jours.join(' · ')}</div>
        <div style="margin-top:4px">${semTag}</div>
      </div>
    </div>
    ${af.notes?`<div style="font-size:12px;color:var(--text2);font-style:italic;margin-bottom:16px">💬 ${_escH(af.notes)}</div>`:''}

    <!-- Site -->
    <div class="form-section">Site</div>
    <div style="background:var(--bg);border-radius:var(--radius);padding:14px;margin-bottom:8px">
      <div style="font-weight:700;font-size:14px;margin-bottom:6px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="5" y="3" width="14" height="18" rx="1.6"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></svg> ${_escH(site.nom)}</div>
      ${(()=>{const t=siteTournee(site.id);const parts=[];if(t)parts.push(`<span class="badge badge-blue" style="font-size:10px">${_escH(t.nom)}</span>`);if(site.client)parts.push(`<span class="badge badge-gray" style="font-size:10px">${_escH(site.client)}</span>`);return parts.length?`<div style="margin-bottom:6px;display:flex;gap:4px;flex-wrap:wrap">${parts.join('')}</div>`:'';})()}
      ${site.adresse?`<div style="font-size:12px;color:var(--text2);margin-bottom:4px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg> ${_escH(site.adresse)}</div>`:''}
      ${site.contact?`<div style="font-size:12px;color:var(--text2);margin-bottom:2px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg> Contact : ${_escH(site.contact)}</div>`:''}
      ${site.tel?`<div style="font-size:12px;color:var(--text2);margin-bottom:2px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A15 15 0 014 6a2 2 0 011-2z"/></svg> ${site.tel}</div>`:''}
      ${site.email?`<div style="font-size:12px;color:var(--text2);margin-bottom:2px"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7.5l8 5.5 8-5.5"/></svg> ${site.email}</div>`:''}
      ${site.notes?`<div style="font-size:12px;color:var(--text2);margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-style:italic">${_escH(site.notes)}</div>`:''}
      ${site.creneaux?.length?`<div style="font-size:11px;color:var(--text3);margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12.5" r="8"/><path d="M12 8.5V12.5l3 1.8"/></svg> Plages site : ${site.creneaux.map(c=>c.debut+'–'+c.fin).join(' · ')}</div>`:''}
    </div>`;

  // Footer selon statut
  if(absence && !_replFor(absence,blockKey)){
    footer.innerHTML=`
      <button class="btn btn-secondary" onclick="closePanel()">Fermer</button>
      <button class="btn btn-danger" onclick="openPanel('panel-remplacer','${absence.id}|${blockKey}')">${_ABSIC.find} Trouver un remplaçant</button>`;
  } else if(!absence){
    // Chercher binôme : même affectation (site + créneau commun) et type "accueil" des deux côtés
    // (l'échange de créneau ne concerne que les postes fixes accueil, pas les multisites/logistique/etc.)
    const isAccueil=(id)=>{ const t=agTypes(ga().find(a=>a.id===id)); return t.includes('accueil')||t.includes('concierge'); };
    const _dd=new Date(dateStr+'T12:00:00'), _jr=JOURS[(_dd.getDay()+6)%7];
    const _mat=x=>(_mins(x.debut)+_mins(x.fin))/2<780;
    const binome=isAccueil(agent.id) ? gaf().filter(b=>b.id!==af.id && b.agentId!==agent.id && b.siteId===af.siteId && isAccueil(b.agentId) && _affActiveOn(b,_dd) && _mat(b)!==_mat(af))
      .sort((x,y)=>agentNom(x.agentId).localeCompare(agentNom(y.agentId),'fr')) : [];
    const swapIc='<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M7 7h12l-3.2-3.2M17 17H5l3.2 3.2"/></svg>';

    let permHTML='';
    if(binome.length>0){
      const binomeOptions=binome.map(b=>`<option value="${b.id}">${_escH(agentNom(b.agentId))} · ${_mat(b)?'matin':'après-midi'} ${b.debut}–${b.fin}</option>`).join('');
      permHTML=`
        <div class="form-section">Échange de créneau</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px">Échange avec un agent d'accueil du site : vous prenez son créneau ${_mat(af)?'de l\'après-midi':'du matin'} et il prend le vôtre (${af.debut}–${af.fin}). Crée une exception ponctuelle pour chacun (modifiable ou annulable ensuite via « Exception ponctuelle » ci-dessous).</div>
        <div class="form-group">
          <label class="form-label">Échanger avec</label>
          <select class="form-input" id="perm-binome">${binomeOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Portée de l'échange</label>
          <div class="seg" id="perm-scope-seg">
            <button type="button" class="seg-btn active" data-scope="jour" onclick="segPick(this)">Cette journée</button>
            <button type="button" class="seg-btn" data-scope="semaine" onclick="segPick(this)">Toute la semaine</button>
          </div>
          <div class="seg-hint" id="perm-scope-hint" data-day="Uniquement le ${dateLabel}." data-week="Chaque jour commun de la semaine en cours (lun → ven).">Uniquement le ${dateLabel}.</div>
        </div>
        <button class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:8px;border-color:var(--purple);color:var(--purple)" onclick="saveSwap('${af.id}',document.getElementById('perm-binome').value,document.querySelector('#perm-scope-seg .seg-btn.active').dataset.scope,'${dateStr}')">${swapIc} Échanger</button>`;
    }

    if(!binome.length) permHTML=`<div class="form-section">Échange de créneau</div><div style="font-size:12px;color:var(--text2);margin-bottom:14px">${!isAccueil(agent.id)?'Réservé aux agents d\'accueil (type de '+_escH(agent.nom)+' : '+agTypes(agent).map(agentTypeLabel).join(', ')+').':'Aucun autre agent d\'accueil de '+_escH(site.nom)+' n\'a de créneau '+(_mat(af)?'de l\'après-midi':'du matin')+' ce jour-là.'}</div>`;
    // Injecter dans le body avant le footer
    const existingPerm=body.querySelector('#perm-section');
    if(!existingPerm){
      const jourBtn=`<div class="form-section">Exception ponctuelle</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px">Modifier ou libérer ce créneau pour cette journée seulement, sans toucher au planning récurrent.</div>
        <button class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:14px;border-color:var(--blue);color:var(--blue)" onclick="openPanel('panel-jour','${agent.id}|${dateStr}|${afId}|')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg> Modifier pour ce jour</button>`;
      body.insertAdjacentHTML('beforeend', `<div id="perm-section">${jourBtn}${permHTML}</div>`);
    }

    footer.innerHTML=`
      <button class="btn btn-secondary" onclick="closePanel()">Fermer</button>
      <button class="btn btn-primary" onclick="absenceDepuisCreneau('${agentId}','${dateStr}','${af.siteId}')">Déclarer absent</button>`;
  } else {
    // Créneau déjà remplacé : permettre de retirer ou de changer de remplaçant sans supprimer l'absence
    footer.innerHTML=`
      <button class="btn btn-secondary" onclick="retirerRemplacementBloc('${absence.id}','${blockKey}')">${_ABSIC.off} Retirer ce remplaçant</button>
      <button class="btn btn-primary" onclick="openPanel('panel-remplacer','${absence.id}|${blockKey}')"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M7 7h12l-3.2-3.2M17 17H5l3.2 3.2"/></svg> Changer de remplaçant</button>`;
  }
}

function absenceDepuisSelection(agentId, dsStart, dsEnd){
  openPanel('panel-absence');
  setTimeout(()=>{
    const sel=document.getElementById('pa-agent');
    if(sel){ sel.value=agentId; sel.dispatchEvent(new Event('change')); }
    const dt=document.getElementById('pa-debut'); if(dt) dt.value=dsStart;
    const dtf=document.getElementById('pa-fin'); if(dtf) dtf.value=dsEnd||dsStart;
    if(typeof refreshPaRempl==='function') refreshPaRempl();
  },50);
}

function absenceDepuisCreneau(agentId, dateStr, siteId){
  // Pré-remplit le panneau absence avec l'agent et la date déjà renseignés
  openPanel('panel-absence');
  // Attendre que le DOM soit rendu puis pré-remplir
  setTimeout(()=>{
    const sel=document.getElementById('pa-agent');
    if(sel){ sel.value=agentId; sel.dispatchEvent(new Event('change')); }
    const dt=document.getElementById('pa-debut');
    if(dt) dt.value=dateStr;
    const dtf=document.getElementById('pa-fin');
    if(dtf) dtf.value=dateStr;
  },50);
}

