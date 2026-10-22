// Changement de vue
/* ═══════════════════════════════════════
   NAVIGATION VUES
═══════════════════════════════════════ */
let currentView='planning';

function showView(v){
  currentView=v; setTimeout(updateNavAlertes,0);
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v)?.classList.add('active');
  document.getElementById('nav-'+v)?.classList.add('active');
  // Vue fusionnée Absences / Retards & H.Sup → même entrée de nav "Suivi"
  if(v==='absences'||v==='pointage'){
    document.getElementById('nav-suivi')?.classList.add('active');
    document.querySelectorAll('.suivi-seg-btn').forEach(el=>el.classList.toggle('on', el.dataset.seg===v));
  }

  const isPlanning = v==='planning';
  const showWeek = v==='planning'||v==='croise';
  document.getElementById('header-week-section').style.display = showWeek?'flex':'none';
  document.getElementById('header-mois-section').style.display = v==='mois'?'flex':'none';
  document.getElementById('header-filters').style.display = (isPlanning||v==='mois')?'flex':'none';
  document.getElementById('filters-planning').style.display = isPlanning?'flex':'none';
  document.getElementById('filters-mois').style.display = v==='mois'?'flex':'none';

  closePanel();
  const renders={
    planning:renderPlanning,absences:renderAbsences,
    historique:renderHistorique,pointage:renderPointage,
    agents:renderAgents,sites:renderSites,affect:renderAffect,
    jour:renderJour,tournees:renderTournees,croise:renderCroise,mois:renderMois,evenements:renderEvenements,
    partage:renderPartage,clients:renderClients
  };
  renders[v]?.();
}

