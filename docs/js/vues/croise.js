// Planning croisé (aide à la décision)
/* ═══════════════════════════════════════
   PLANNING CROISÉ — aide à la décision
═══════════════════════════════════════ */
let croiseScreen='postes';
let croiseGapKey=null;
let croiseDrag=null;
let croiseHiddenCands=new Set();
let croiseCandIds=[];
const CX_START=420, CX_END=1140, CX_H=520;

function croiseGo(scr){ croiseScreen=scr; renderCroise(); }
function croiseToggleCand(id){ if(croiseHiddenCands.has(id)) croiseHiddenCands.delete(id); else croiseHiddenCands.add(id); renderCroise(); }
function croiseAllCands(show){ croiseHiddenCands = show ? new Set() : new Set(croiseCandIds); renderCroise(); }

const AV_COLORS=[['#2E8B5B','var(--green-light)'],['#B0722A','var(--orange-light)'],['#6B4FB0','var(--purple-light)'],['#2C6E9B','rgba(44,110,155,.14)'],['#A87F14','var(--yellow-light)']];
// Palette à teintes bien séparées pour distinguer les remplaçants dans le calendrier croisé
const CX_PALETTE=[['#2C6E9B','rgba(44,110,155,.15)'],['#D2691E','rgba(210,105,30,.15)'],['#2E8B5B','rgba(46,139,91,.15)'],['#C0347A','rgba(192,52,122,.15)'],['#6B4FB0','rgba(107,79,176,.15)'],['#0E9594','rgba(14,149,148,.15)'],['#B23030','rgba(178,48,48,.15)'],['#6E8B12','rgba(110,139,18,.15)'],['#3A50C0','rgba(58,80,192,.15)'],['#8A5A2B','rgba(138,90,43,.15)']];
function _agColor(id){ let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return AV_COLORS[h%AV_COLORS.length]; }
function _croiseCompKnown(){ return ga().some(a=>a.remplacant && (a.competences||[]).length>0); }
function _croiseComp(cand, siteId){ if(!_croiseCompKnown()) return true; return (cand.competences||[]).includes(siteId); }

// Créneaux occupés d'un candidat un jour donné (poste fixe actif + remplacements déjà pris)
function _croiseBusy(candId, date, deb, fin, exceptAbsId){
  for(const af of gaf().filter(a=>a.agentId===candId)){
    if(_affActiveOn(af,date) && !siteFermeLe(af.siteId,date) && _timeOverlap(deb,fin,af.debut,af.fin))
      return {type:'poste',siteId:af.siteId,debut:af.debut,fin:af.fin,date};
  }
  for(const s of _agentCoveredShifts(candId, exceptAbsId)){
    if(_sameDay(s.date,date) && _timeOverlap(deb,fin,s.debut,s.fin))
      return {type:'remplacement',siteId:s.siteId,debut:s.debut,fin:s.fin,date,agentAbsent:s.agentAbsent};
  }
  return null;
}

// Postes à couvrir : soit la semaine affichée, soit tous les créneaux manquants à venir
let croiseScope='tous';
function croiseSetScope(s){ croiseScope=s; renderCroise(); }
function croiseGaps(scope){
  scope=scope||croiseScope;
  let d0=null,d4=null;
  if(scope==='semaine'){
    const mon=getMonday(weekStart);
    d0=new Date(mon); d4=new Date(mon); d4.setDate(d4.getDate()+4); d4.setHours(23,59,59,0);
  }
  const gaps=[];
  gab().forEach(ab=>{
    if(!ab.needsReplacement||ab.ignored) return;
    _absenceShifts(ab).forEach(s=>{
      if((d0 && s.date<d0) || (d4 && s.date>d4)) return;
      if(siteFermeLe(s.siteId,s.date)) return;
      const blockKey=_blockKey(s.afId,s.date);
      gaps.push({key:[ab.id,s.afId,_isoDate(s.date),s.debut].join('~'), absenceId:ab.id, afId:s.afId, blockKey, agentId:ab.agentId,
        siteId:s.siteId, date:new Date(s.date), deb:s.debut, fin:s.fin, remplacantId:_replFor(ab,blockKey)});
    });
  });
  gaps.sort((a,b)=> (a.remplacantId?1:0)-(b.remplacantId?1:0) || a.date-b.date || _mins(a.deb)-_mins(b.deb) || siteNom(a.siteId).localeCompare(siteNom(b.siteId)));
  return gaps;
}

function _croiseSelected(gaps){
  return gaps.find(g=>g.key===croiseGapKey) || gaps.find(g=>!g.remplacantId) || gaps[0] || null;
}

function croiseSelect(key){
  croiseGapKey=key;
  const g=croiseGaps('tous').find(x=>x.key===key);
  if(g){ const m=getMonday(g.date); if(+m!==+getMonday(weekStart)) weekStart=m; }
  renderCroise();
}
function croiseFilterGaps(q){
  const s=(q||'').trim().toLowerCase();
  document.querySelectorAll('#croise-body .cx-gap-row').forEach(el=>{
    el.style.display = (!s || (el.dataset.q||'').includes(s)) ? '' : 'none';
  });
}
function _cxGapDate(g){
  const inWeek = +getMonday(g.date)===+getMonday(weekStart);
  const today=new Date(); today.setHours(0,0,0,0);
  const past = g.date<today ? ' · <span style="font-weight:700;color:var(--text3)">passé</span>' : '';
  return JOURS_FULL[(g.date.getDay()+6)%7]+' '+g.date.getDate()+(inWeek?'':' '+g.date.toLocaleDateString('fr-FR',{month:'short'}))+past;
}

function croiseAssign(gapKey, candId){
  const gap=croiseGaps('tous').find(g=>g.key===gapKey); if(!gap) return;
  const abs=gab(); const ab=abs.find(a=>a.id===gap.absenceId); if(!ab) return;
  const busy=_croiseBusy(candId, gap.date, gap.deb, gap.fin, gap.absenceId);
  if(busy && !confirm(`⚠ ${agentNom(candId)} est déjà occupé ${busy.debut}–${busy.fin} (${busy.type==='poste'?'son poste à « '+siteNom(busy.siteId)+' »':'un autre remplacement'}).\n\nForcer l'assignation ? Le créneau doublé sera signalé en rouge dans le planning.`)) return;
  ab.remplacants=ab.remplacants||{}; ab.remplacants[gap.blockKey]=candId; sab(abs);
  const r=gr();
  if(!r.some(x=>x.agentAbsentId===ab.agentId && x.remplacantId===candId && x.date===ab.dateDebut && (x.afId||null)===gap.afId))
    r.push({id:DB.id(),agentAbsentId:ab.agentId,remplacantId:candId,siteId:gap.siteId||'',afId:gap.afId,date:ab.dateDebut,statut:'confirme',createdAt:new Date().toISOString()});
  sr(r);
  toast('Remplaçant assigné : '+agentNom(candId).split(' ')[0]);
  refreshAfterAbsenceChange();
}
function croiseUnassign(gapKey){
  const gap=croiseGaps('tous').find(g=>g.key===gapKey); if(!gap) return;
  const abs=gab(); const ab=abs.find(a=>a.id===gap.absenceId); if(!ab) return;
  const prev=_replFor(ab,gap.blockKey); ab.remplacants=ab.remplacants||{}; ab.remplacants[gap.blockKey]=null; sab(abs);
  sr(gr().filter(x=>!(x.agentAbsentId===ab.agentId && x.remplacantId===prev && x.date===ab.dateDebut && (x.afId||null)===gap.afId)));
  toast('Remplacement retiré');
  refreshAfterAbsenceChange();
}


function _croiseCands(gap){
  const compKnown=_croiseCompKnown();
  // Candidats = remplaçants (multisite) + tout agent formé sur le site vacant
  const pool=ga().filter(a=> !a.inactif && a.id!==gap.agentId && (a.remplacant || isRespOpe(a) || (a.competences||[]).includes(gap.siteId)));
  const scored=pool.map(a=>{
    const comp=(a.competences||[]).includes(gap.siteId);
    const busy=_croiseBusy(a.id, gap.date, gap.deb, gap.fin, gap.absenceId);
    return {a, comp, busy, rank: busy?2:0};
  }).sort((x,y)=> x.rank-y.rank || (y.comp?1:0)-(x.comp?1:0) || x.a.nom.localeCompare(y.a.nom));
  return scored;
}

function croiseFilterCands(q){
  const s=(q||'').trim().toLowerCase();
  document.querySelectorAll('#cx-cand-list .cx-cand').forEach(el=>{
    el.style.display = (!s || (el.dataset.nm||'').includes(s)) ? '' : 'none';
  });
  const none=document.getElementById('cx-cand-none');
  if(none) none.style.display = document.querySelectorAll('#cx-cand-list .cx-cand:not([style*="display: none"])').length ? 'none' : '';
}

function _croiseCandPanelHTML(gap, header){
  if(!gap) return `<div class="cx-card" style="width:320px;flex:none;padding:16px;color:var(--text3);font-size:13px">Aucun poste sélectionné.</div>`;
  const scored=_croiseCands(gap);
  const covName=gap.remplacantId;
  const best=scored.find(c=>c.rank===0 && c.a.id!==covName && c.comp) || scored.find(c=>c.rank===0 && c.a.id!==covName);
  const compLabel=siteNom(gap.siteId);
  const rows=scored.map(c=>{
    const isCov=covName===c.a.id, isBest=best&&c.a.id===best.a.id;
    const [fg,bg]=_agColor(c.a.id);
    const status=c.busy?{l:'Occupé',bg:'var(--red-light)',fg:'var(--red)'}:{l:'Libre',bg:'var(--green-light)',fg:'var(--green)'};
    const roleTxt=isRespOpe(c.a)?'Responsable opé':c.a.remplacant?'Remplaçant':'Agent formé';
    const note=c.busy? ('Déjà pris '+c.busy.debut+'–'+c.busy.fin+(c.busy.type==='poste'?' · '+siteNom(c.busy.siteId):' · remplacement')) : (roleTxt+' · libre ce créneau');
    const compTag=c.comp?'<span style="font-size:9px;font-weight:800;background:var(--blue-light);color:var(--blue-mid);padding:1px 6px;border-radius:20px">formé</span>':'';
    return `<div class="cx-cand${isBest&&!isCov?' reco':''}" data-nm="${_escA(c.a.nom.toLowerCase())}" draggable="true" ondragstart="croiseDrag='${c.a.id}'" style="${isCov?'border-color:var(--green);background:var(--green-light)':''}">
      <div style="width:30px;height:30px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0">${_initials(c.a.nom)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:6px">${_escH(c.a.nom)}${compTag}${isBest&&!isCov?'<span style="font-size:9px;font-weight:800;background:var(--green-light);color:var(--green);padding:1px 6px;border-radius:20px">RECO</span>':''}</div>
        <div style="font-size:10.5px;color:var(--text2);margin-top:1px">${note}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
        <span class="cx-pill" style="background:${status.bg};color:${status.fg}">${status.l}</span>
        <span style="font-size:11px;font-weight:700;color:${isCov?'var(--green)':'var(--blue-mid)'};cursor:pointer" onclick="${isCov?`croiseUnassign('${gap.key}')`:`croiseAssign('${gap.key}','${c.a.id}')`}">${isCov?'✓ Assigné':'Assigner'}</span>
      </div>
    </div>`;
  }).join('');
  const covBanner = covName ? `<div style="display:flex;align-items:center;gap:9px;background:var(--green-light);border:1px solid rgba(46,139,91,.35);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:12px">
      <span style="font-size:15px;color:var(--green)">✓</span>
      <div style="flex:1;font-size:12.5px;font-weight:700;color:var(--green)">Couvert par ${_escH(agentNom(covName))}</div>
      <span style="font-size:11px;font-weight:700;color:var(--red);cursor:pointer" onclick="croiseUnassign('${gap.key}')">Retirer</span>
    </div>` : '';
  const subtitle = header ? '' : `<div style="font-size:11.5px;color:var(--text2);margin-bottom:2px">${_escH(compLabel)} · ${JOURS_FULL[(gap.date.getDay()+6)%7]} ${gap.date.getDate()} · ${gap.deb}–${gap.fin}</div>`;
  return `<div class="cx-card" style="width:320px;flex:none;padding:0;overflow:hidden;align-self:flex-start">
    ${header||''}
    <div style="padding:14px 16px 15px">
    <div style="display:flex;align-items:baseline;gap:7px">
      <div style="font-size:13px;font-weight:800">Qui peut couvrir&nbsp;?</div>
      <div style="font-size:11px;color:var(--text3)">${scored.length} possible${scored.length>1?'s':''}</div>
    </div>
    ${subtitle}
    <div style="display:flex;align-items:center;gap:7px;height:32px;margin:10px 0 4px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg)">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" style="width:13px;height:13px;flex:none"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5" stroke-linecap="round"></path></svg>
      <input type="text" placeholder="Rechercher un agent…" oninput="croiseFilterCands(this.value)" style="flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:inherit;font-size:12px;color:var(--text1)">
    </div>
    <div style="font-size:10.5px;color:var(--text3);margin:0 0 11px">Glisser-déposer sur le calendrier ou assigner</div>
    ${covBanner}
    <div id="cx-cand-list">
      ${rows||''}
      <div id="cx-cand-none" style="font-size:12px;color:var(--text3);${rows?'display:none':''}">Aucun remplaçant disponible pour ce poste.</div>
    </div>
    </div>
  </div>`;
}

function _croiseScreenPostes(gaps, sel){
  const covered=gaps.filter(g=>g.remplacantId).length, open=gaps.length-covered;
  const list = gaps.length ? gaps.map(g=>{
    const isCov=!!g.remplacantId, isSel=sel&&g.key===sel.key;
    return `<div class="cx-gap-row${isSel?' sel':''}" data-q="${_escA((siteNom(g.siteId)+' '+agentNom(g.agentId)).toLowerCase())}" onclick="croiseSelect('${g.key}')">
      <div style="width:8px;height:8px;border-radius:50%;background:${isCov?'var(--green)':'var(--red)'};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13.5px;font-weight:700">${_escH(siteNom(g.siteId))}</div>
        <div style="font-size:11.5px;color:var(--text2)">${_cxGapDate(g)} · ${g.deb}–${g.fin} · titulaire ${_escH(agentNom(g.agentId).split(' ')[0])}</div>
      </div>
      <span class="cx-pill" style="background:${isCov?'var(--green-light)':'var(--red-light)'};color:${isCov?'var(--green)':'var(--red)'};min-width:92px;text-align:center">${isCov?'✓ '+_escH(agentNom(g.remplacantId).split(' ')[0]):'Non couvert'}</span>
      ${isSel?absenceActionsHTML(g.absenceId,{day:_isoDate(g.date),blockKey:g.blockKey}):''}
    </div>`;
  }).join('') : `<div style="font-size:13px;color:var(--text3);padding:20px 4px">${croiseScope==='semaine'?'Aucun poste à couvrir cette semaine. 🎉':'Aucun créneau manquant. 🎉'}</div>`;
  const scopeBtn=(v,l)=>`<span onclick="croiseSetScope('${v}')" style="height:28px;padding:0 12px;border-radius:var(--radius-sm);border:1px solid ${croiseScope===v?'var(--blue)':'var(--border)'};background:${croiseScope===v?'var(--blue)':'#fff'};color:${croiseScope===v?'#000':'var(--text2)'};font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;cursor:pointer">${l}</span>`;
  const search = gaps.length>4 ? `<div style="display:flex;align-items:center;gap:7px;height:32px;margin:0 2px 10px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg)">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" style="width:13px;height:13px;flex:none"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5" stroke-linecap="round"></path></svg>
      <input type="text" placeholder="Rechercher un site ou un agent…" oninput="croiseFilterGaps(this.value)" style="flex:1;min-width:0;border:none;outline:none;background:transparent;font-family:inherit;font-size:12.5px;color:var(--text1)">
    </div>` : '';
  return `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px">
      <div style="flex:1">
        <div style="font-size:18px;font-weight:800;letter-spacing:-.2px">Postes à couvrir</div>
        <div style="font-size:12.5px;color:var(--text2)">${croiseScope==='semaine'?'Semaine affichée uniquement':'Tous les créneaux non couverts, toutes semaines confondues'} — sélectionne un poste : les remplaçants formés et disponibles apparaissent à droite</div>
      </div>
      <div style="display:flex;gap:8px">
        <div class="cx-card" style="text-align:center;padding:8px 16px"><div style="font-size:20px;font-weight:800;color:var(--red)">${open}</div><div style="font-size:10.5px;color:var(--text2)">à couvrir</div></div>
        <div class="cx-card" style="text-align:center;padding:8px 16px"><div style="font-size:20px;font-weight:800;color:var(--green)">${covered}</div><div style="font-size:10.5px;color:var(--text2)">réglés</div></div>
      </div>
    </div>
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:2px 2px 9px">
          <div style="font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--text3);flex:1;min-width:120px">${croiseScope==='semaine'?'Postes de la semaine':'Tous les créneaux manquants'}</div>
          ${scopeBtn('tous','Tous')}${scopeBtn('semaine','Semaine affichée')}
        </div>
        ${search}
        ${list}
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.5">Un poste apparaît dès qu'un titulaire est absent et le site ouvert. Fermer un site (fiche site) fait disparaître ses postes et libère ses agents.</div>
      </div>
      ${_croiseCandPanelHTML(sel)}
    </div>`;
}

function _croiseScreenCalendrier(gaps, sel){
  const mon=getMonday(weekStart);
  const days=[0,1,2,3,4].map(i=>{ const d=new Date(mon); d.setDate(d.getDate()+i); return d; });
  const PX=CX_H/(CX_END-CX_START);
  if(!sel){
    return gaps.length
      ? `<div class="cx-card" style="padding:22px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px"><div style="font-size:13.5px;font-weight:700">Aucun poste sélectionné</div>
          <div style="font-size:12.5px;color:var(--text2);margin-top:2px">${gaps.length} poste${gaps.length>1?'s':''} à couvrir cette semaine — choisissez-en un pour comparer les plannings.</div></div>
          <button onclick="croiseGo('postes')" style="height:34px;padding:0 16px;border-radius:9px;border:none;background:var(--yellow);color:#000;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Voir les postes à couvrir</button>
        </div>`
      : `<div class="cx-card" style="padding:22px;font-size:13px;color:var(--text3)">Aucun poste à couvrir cette semaine — rien à croiser.</div>`;
  }
  const scored=_croiseCands(sel);
  const comp=scored.map(c=>c.a);
  croiseCandIds=comp.map(a=>a.id);
  const candColor={}; comp.forEach((a,i)=>{ candColor[a.id]=CX_PALETTE[i%CX_PALETTE.length]; });
  const absGaps=gaps.filter(g=>g.absenceId===sel.absenceId).sort((a,b)=>a.date-b.date||_mins(a.deb)-_mins(b.deb));
  const absDayCount=new Set(absGaps.map(g=>_isoDate(g.date))).size;
  const selIdx=absGaps.findIndex(g=>g.key===sel.key)+1;
  const selTxt=`${JOURS_FULL[(sel.date.getDay()+6)%7]} ${sel.date.getDate()} · ${sel.deb}–${sel.fin}`;
  const absTxt=absGaps.length>1
    ? `créneau ${selIdx}/${absGaps.length} de l'absence de ${_escH(agentNom(sel.agentId).split(' ')[0])} · ${absDayCount} jour${absDayCount>1?'s':''} (${JOURS[(absGaps[0].date.getDay()+6)%7]} ${absGaps[0].date.getDate()} → ${JOURS[(absGaps[absGaps.length-1].date.getDay()+6)%7]} ${absGaps[absGaps.length-1].date.getDate()})`
    : `absence de ${_escH(agentNom(sel.agentId).split(' ')[0])} · créneau unique`;
  const prevKey=absGaps.length>1?absGaps[(selIdx-2+absGaps.length)%absGaps.length].key:null;
  const nextKey=absGaps.length>1?absGaps[selIdx%absGaps.length].key:null;
  const navBtn=(key,label)=>`<span ${key?`onclick="croiseSelect('${key}')"`:''} style="flex:1;height:27px;border-radius:var(--radius-sm);background:#fff;border:1px solid var(--border);font-size:11px;font-weight:700;color:${key?'var(--text2)':'var(--text3)'};display:flex;align-items:center;justify-content:center;cursor:${key?'pointer':'default'};opacity:${key?1:.5}">${label}</span>`;
  const selHeader=`<div style="background:var(--blue-light);border-bottom:1px solid var(--blue-mid);padding:12px 14px">
      <div style="display:flex;align-items:center;gap:9px">
        <div style="width:28px;height:28px;border-radius:8px;background:var(--blue);color:#000;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">◎</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:9.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--blue-mid)">Créneau sélectionné${absGaps.length>1?` · ${selIdx}/${absGaps.length}`:''}</div>
          <div style="font-size:12.5px;font-weight:800;margin-top:1px">${_escH(siteNom(sel.siteId))} · ${selTxt}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text2);margin-top:6px">${absTxt}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:9px">${navBtn(prevKey,'‹ créneau')}${navBtn(nextKey,'créneau ›')}${absenceActionsHTML(sel.absenceId,{day:_isoDate(sel.date),blockKey:sel.blockKey})}</div>
    </div>`;
  const legend=comp.map(a=>{ const [fg]=candColor[a.id]; const hidden=croiseHiddenCands.has(a.id); return `<span onclick="croiseToggleCand('${a.id}')" title="${_escA(a.nom)}" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:${hidden?'var(--text3)':'var(--text1)'};cursor:pointer;user-select:none;padding:2px 9px;border-radius:var(--radius-full);border:1px solid ${hidden?'var(--border)':fg};background:${hidden?'transparent':fg+'1f'}"><span style="width:9px;height:9px;border-radius:2px;background:${hidden?'#C9C9C9':fg}"></span>${_escH(a.nom.split(' ')[0])}</span>`; }).join('');
  const axis=(()=>{ let h=''; for(let m=CX_START;m<=CX_END;m+=60){ const top=(m-CX_START)*PX; h+=`<div style="position:absolute;top:${top}px;right:6px;transform:translateY(-50%);font-size:10px;color:var(--text3)">${Math.floor(m/60)}h</div>`; } return h; })();
  const cols=days.map(d=>{
    const dayGaps=absGaps.filter(g=>_sameDay(g.date,d));
    const isGapDay=dayGaps.length>0;
    // événements des candidats ce jour
    const evs=[];
    comp.forEach(a=>{
      if(croiseHiddenCands.has(a.id)) return;
      gaf().filter(af=>af.agentId===a.id).forEach(af=>{
        if(_affActiveOn(af,d) && !siteFermeLe(af.siteId,d)) evs.push({a,site:af.siteId,deb:af.debut,fin:af.fin});
      });
      gab().filter(x=>x.remplacantId===a.id).forEach(oa=>{
        _absenceShifts(oa).forEach(s=>{ if(_sameDay(s.date,d)) evs.push({a,site:s.siteId,deb:s.debut,fin:s.fin,rempl:true}); });
      });
    });
    evs.sort((x,y)=>_mins(x.deb)-_mins(y.deb));
    const laneEnd=[]; evs.forEach(ev=>{ let l=laneEnd.findIndex(e=>e<=_mins(ev.deb)); if(l===-1) l=laneEnd.length; laneEnd[l]=_mins(ev.fin); ev.lane=l; });
    const lc=Math.max(1,laneEnd.length);
    const blocks=evs.map(ev=>{
      const [fg,bg]=candColor[ev.a.id]||_agColor(ev.a.id);
      const top=(_mins(ev.deb)-CX_START)*PX, h=Math.max((_mins(ev.fin)-_mins(ev.deb))*PX,20);
      const conflict=dayGaps.some(g=>_timeOverlap(ev.deb,ev.fin,g.deb,g.fin));
      const nm=siteNom(ev.site); const short=nm.length>13?nm.slice(0,13)+'…':nm;
      return `<div title="${_escA(ev.a.nom+' · '+nm+' · '+ev.deb+'–'+ev.fin)}" style="position:absolute;top:${top}px;height:${h}px;left:calc(${(ev.lane/lc)*100}% + 2px);width:calc(${100/lc}% - 3px);background:${bg};border:1px solid ${conflict?'var(--red)':fg};border-left:3px solid ${fg};border-radius:5px;padding:4px 16px 4px 6px;overflow:hidden;color:${fg};box-sizing:border-box${conflict?';box-shadow:0 0 0 1px var(--red)':''}">
        <span style="position:absolute;top:3px;right:3px;display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:${fg};color:#fff;font-size:7px;font-weight:800">${_initials(ev.a.nom)}</span>
        <div style="font-size:9.5px;font-weight:700;line-height:1.12;overflow:hidden">${_escH(short)}</div>
        <div style="font-size:8.5px;opacity:.85;margin-top:1px">${ev.deb}–${ev.fin}</div>
      </div>`;
    }).join('');
    const band=dayGaps.map(g=>{
      const top=(_mins(g.deb)-CX_START)*PX, h=Math.max((_mins(g.fin)-_mins(g.deb))*PX,16);
      const cov=g.remplacantId, isSel=g.key===sel.key;
      const bd=cov?'var(--green)':'var(--blue-mid)';
      return `<div onclick="croiseSelect('${g.key}')" ondragover="event.preventDefault()" ondrop="if(croiseDrag){croiseAssign('${g.key}',croiseDrag);croiseDrag=null;}" title="${_escA(g.deb+'–'+g.fin+(cov?' · couvert par '+agentNom(cov):' · à couvrir'))}" style="position:absolute;left:0;right:0;top:${top}px;height:${h}px;cursor:pointer;background:${cov?'var(--green-light)':'var(--blue-light)'};opacity:${isSel?1:.55};border-top:2px ${isSel?'solid':'dashed'} ${bd};border-bottom:2px ${isSel?'solid':'dashed'} ${bd}">
        <span style="position:absolute;top:2px;left:0;right:0;text-align:center;font-size:9px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;color:${bd}">${cov?'Couvert · '+_escH(agentNom(cov).split(' ')[0]):g.deb+'–'+g.fin}</span>
      </div>`;
    }).join('');
    return `<div style="flex:1;display:flex;flex-direction:column;min-width:0">
      <div style="text-align:center;font-size:11.5px;font-weight:700;color:${isGapDay?'var(--blue-mid)':'var(--text2)'};padding-bottom:7px">${JOURS[days.indexOf(d)]} ${d.getDate()}</div>
      <div style="position:relative;height:${CX_H}px;border-left:1px solid var(--border);background-image:linear-gradient(to bottom,var(--border) 0,transparent 1px);background-size:100% ${60*PX}px">${band}${blocks}</div>
    </div>`;
  }).join('');
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="flex:1"><div style="font-size:18px;font-weight:800;letter-spacing:-.2px">Calendrier croisé</div>
      <div style="font-size:12.5px;color:var(--text2)">Un créneau à la fois : cliquez une bande du calendrier ou une pastille pour changer de créneau · glissez une vignette d'agent sur une bande pour l'assigner</div></div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;overflow-x:auto;padding-bottom:2px">
      ${gaps.filter(g=>!g.remplacantId || g.key===sel.key).map(g=>{
        const on=g.key===sel.key, cov=!!g.remplacantId;
        return `<button onclick="croiseSelect('${g.key}')" style="flex:none;display:flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:var(--radius-full);border:1px solid ${on?'var(--blue-mid)':'var(--border)'};background:${on?'var(--blue-light)':'#fff'};font-family:inherit;font-size:11.5px;font-weight:700;color:${on?'var(--blue-mid)':'var(--text2)'};cursor:pointer;white-space:nowrap">
          <span style="width:7px;height:7px;border-radius:50%;background:${cov?'var(--green)':'var(--red)'};flex-shrink:0"></span>
          ${_escH(siteNom(g.siteId))} · ${JOURS[(g.date.getDay()+6)%7]} ${g.date.getDate()} · ${g.deb}
        </button>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div class="cx-card" style="flex:1;min-width:0;padding:14px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding:0 2px;flex-wrap:wrap">
          <div style="font-size:12px;font-weight:700;color:var(--text2)">7h → 19h</div>
          <div style="flex:1;min-width:120px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end">
            <span style="font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--text3);margin-right:2px">Remplaçants</span>
            <span onclick="croiseAllCands(true)" style="font-size:11px;font-weight:700;color:var(--blue-mid);cursor:pointer">tous</span>
            <span onclick="croiseAllCands(false)" style="font-size:11px;font-weight:700;color:var(--text3);cursor:pointer">aucun</span>
            ${legend}
          </div>
        </div>
        <div style="display:flex">
          <div style="position:relative;width:34px;flex:none;margin-top:26px;height:${CX_H}px">${axis}</div>
          ${cols}
        </div>
      </div>
      ${_croiseCandPanelHTML(sel, selHeader)}
    </div>`;
}

function renderCroise(){
  updateWeekHeader();
  document.querySelectorAll('.croise-seg-btn').forEach(b=>b.classList.toggle('on', b.dataset.cseg===croiseScreen));
  const gaps=croiseGaps(croiseScreen==='calendrier'?'semaine':null);
  const sel=_croiseSelected(gaps);
  if(sel) croiseGapKey=sel.key;
  document.getElementById('croise-body').innerHTML =
    croiseScreen==='calendrier' ? _croiseScreenCalendrier(gaps,sel) : _croiseScreenPostes(gaps,sel);
}

