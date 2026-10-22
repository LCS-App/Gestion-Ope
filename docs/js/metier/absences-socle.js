// Actions communes sur une absence
/* ═══════════════════════════════════════
   SOCLE COMMUN — ACTIONS SUR UNE ABSENCE
   Toutes les vues (planning, mois, liste, croisement, fiche agent, panneaux)
   passent par ces fonctions : même jeu d'actions, mêmes garde-fous, même refresh.
═══════════════════════════════════════ */
const _ABSIC=(()=>{ const s='style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"'; return {
  edit:`<svg viewBox="0 0 24 24" ${s}><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>`,
  del:`<svg viewBox="0 0 24 24" ${s}><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>`,
  ign:`<svg viewBox="0 0 24 24" ${s}><circle cx="12" cy="12" r="8.5"/><path d="M6.2 17.8L17.8 6.2"/></svg>`,
  res:`<svg viewBox="0 0 24 24" ${s}><path d="M4 12a8 8 0 1 0 2.8-6.1M4 4.5V10h5.5"/></svg>`,
  off:`<svg viewBox="0 0 24 24" ${s}><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  find:`<svg viewBox="0 0 24 24" ${s}><path d="M12 3.6l9 15.4H3z"/><path d="M12 9.6v4.6M12 17.2v.4"/></svg>`
}; })();

/* Unique point de rafraîchissement après toute modification d'absence. */
function refreshAfterAbsenceChange(){
  if(typeof closeMoisPopup==='function') closeMoisPopup();
  const map={planning:'renderPlanning',mois:'renderMois',absences:'renderAbsences',croise:'renderCroise',historique:'renderHistorique',pointage:'renderPointage',evenements:'renderEvenements',jour:'renderJour'};
  const fn=window[map[currentView]]||window.renderPlanning;
  if(typeof fn==='function') fn();
  if(typeof updateAbsenceBadge==='function') updateAbsenceBadge();
  if(typeof updateAlertBand==='function') updateAlertBand();
}

function _absShiftDay(iso,n){ const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return _isoDate(d); }
function _absDays(ab){ return _replDateRange(ab.dateDebut, ab.dateFin).map(_isoDate); }
function _absDesc(ab){
  const blocks=_absenceBlocks(ab);
  return {
    nom: agentNom(ab.agentId),
    periode: fmtDate(ab.dateDebut)+((ab.dateFin&&ab.dateFin!==ab.dateDebut)?' → '+fmtDate(ab.dateFin):''),
    blocks: blocks.length,
    repl: blocks.filter(b=>_replFor(ab,b.key)).length
  };
}
/* Purge TOUS les enregistrements de remplacement liés à une absence.
   L'ancien filtre (date === dateDebut) laissait des orphelins sur les absences multi-jours. */
function _absPurgeRempl(rows, ab){
  const keys=new Set(_absenceBlocks(ab).map(b=>b.key));
  return rows.filter(x=>!(x.agentAbsentId===ab.agentId && (x.date===ab.dateDebut || keys.has(x.afId))));
}
/* Reconstruit les lignes de remplacement à partir de la map remplacants (utilisé après scission). */
function _absRemplRows(ab){
  const out=[];
  _absenceBlocks(ab).forEach(b=>{
    const r=_replFor(ab,b.key); if(!r) return;
    out.push({id:DB.id(),agentAbsentId:ab.agentId,remplacantId:r,siteId:b.siteId,afId:b.key,date:ab.dateDebut,
      notes:ab.replNotes||'',statut:'confirme',createdAt:new Date().toISOString()});
  });
  return out;
}

/* Groupe d'actions homogène. opts : {day:iso, blockKey, compact:true, hideFind:true} */
function absenceActionsHTML(absId, opts){
  const o=opts||{};
  const ab=gab().find(a=>a.id===absId); if(!ab) return '';
  const dayArg=o.day?`,'${o.day}'`:'';
  const repl=o.blockKey?_replFor(ab,o.blockKey):null;
  const b=(extra,title,fn,ic)=>`<button class="btn-icon${extra?' '+extra:''}" title="${title}" onclick="event.stopPropagation();${fn}">${ic}</button>`;
  return `<div class="abs-actions" style="display:flex;gap:6px;align-items:center;flex-shrink:0">
    ${o.blockKey&&repl?b('',`Retirer le remplaçant (${_escA(agentNom(repl).split(' ')[0])})`,`retirerRemplacementBloc('${absId}','${o.blockKey}')`,_ABSIC.off):''}
    ${b('',"Modifier l'absence",`editAbsence('${absId}')`,_ABSIC.edit)}
    ${ab.ignored
      ? b('',"Réactiver l'absence (à nouveau à couvrir)",`toggleIgnorerAbsence('${absId}')`,_ABSIC.res)
      : b('',"Ignorer l'absence (ne plus proposer à couvrir)",`toggleIgnorerAbsence('${absId}')`,_ABSIC.ign)}
    ${b('red',"Supprimer l'absence",`delAbsence('${absId}'${dayArg})`,_ABSIC.del)}
  </div>`;
}

/* Ignorer / réactiver — réversible partout. */
function toggleIgnorerAbsence(absId){
  const abs=gab(); const ab=abs.find(a=>a.id===absId); if(!ab) return;
  if(!ab.ignored){
    if(!confirm(`Ignorer l'absence de ${agentNom(ab.agentId)} — ${_absDesc(ab).periode} ?\n\nElle ne sera plus proposée à couvrir, mais reste visible dans la liste des absences.`)) return;
    ab.ignored=true;
  } else {
    delete ab.ignored;
  }
  sab(abs);
  if(document.getElementById('side-panel')?.classList.contains('open')) closePanel();
  toast(ab.ignored?'Absence ignorée':'Absence réactivée — à nouveau à couvrir');
  refreshAfterAbsenceChange();
}

function closeAbsAsk(){ const p=document.getElementById('abs-ask'); if(p) p.remove(); }

/* Retire une seule journée d'une absence multi-jours : l'absence est scindée en deux.
   Les clés de bloc étant datées (afId@date), les remplaçants déjà attribués sont conservés. */
function absRetirerJour(absId, dayIso){
  closeAbsAsk();
  const abs=gab(); const i=abs.findIndex(a=>a.id===absId); if(i<0) return;
  const ab=abs[i];
  const start=ab.dateDebut, end=ab.dateFin||ab.dateDebut;
  let rows=_absPurgeRempl(gr(), ab);
  if(dayIso<=start && dayIso>=end){ abs.splice(i,1); sab(abs); sr(rows); toast('Absence supprimée'); refreshAfterAbsenceChange(); return; }
  const parts=[];
  if(dayIso>start){ const p=JSON.parse(JSON.stringify(ab)); p.dateFin=_absShiftDay(dayIso,-1); parts.push(p); }
  if(dayIso<end){ const p=JSON.parse(JSON.stringify(ab)); p.id=DB.id(); p.dateDebut=_absShiftDay(dayIso,1); p.dateFin=end; parts.push(p); }
  abs.splice(i,1,...parts);
  sab(abs);
  parts.forEach(p=>{ rows=rows.concat(_absRemplRows(p)); });
  sr(rows);
  toast(fmtDate(dayIso)+' retiré de l\'absence');
  refreshAfterAbsenceChange();
}

function absSupprimerTout(absId){
  closeAbsAsk();
  const ab=gab().find(a=>a.id===absId); if(!ab) return;
  sab(gab().filter(a=>a.id!==absId));
  sr(_absPurgeRempl(gr(), ab));
  toast('Absence supprimée');
  refreshAfterAbsenceChange();
}

// Retire le remplaçant sans supprimer l'absence — le poste redevient à couvrir. Rafraîchit la vue courante.
function retirerRemplacement(absenceId){
  const abs=gab(); const ab=abs.find(a=>a.id===absenceId); if(!ab) return;
  const nom=ab.remplacantId?agentNom(ab.remplacantId):'';
  if(!confirm(`Retirer ${nom?'le remplacement de '+nom.split(' ')[0]:'ce remplacement'} ?\n\nL'absence reste enregistrée et le poste redevient « à couvrir ».`)) return;
  const prev=ab.remplacantId; ab.remplacantId=null; sab(abs);
  sr(gr().filter(x=>!(x.agentAbsentId===ab.agentId && x.remplacantId===prev && x.date===ab.dateDebut)));
  closePanel();
  toast('Remplacement retiré — poste à couvrir');
  refreshAfterAbsenceChange();
}

// Créneaux qu'un agent COUVRE comme remplaçant un jour donné (pour affichage dans son planning)
function agentReplacementShifts(agentId, date){
  const out=[];
  _agentCoveredShifts(agentId).forEach(s=>{
    if(_sameDay(s.date,date) && !siteFermeLe(s.siteId,date))
      out.push({ id:'rmp-'+s.agentAbsent+'-'+s.siteId+'-'+s.debut, afId:null, siteId:s.siteId, debut:s.debut, fin:s.fin, pause:s.pause||0, semaine:'toutes', jours:[], rempl:true, forAgent:s.agentAbsent });
  });
  return out;
}

