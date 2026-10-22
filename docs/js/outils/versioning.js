// Versioning & utilisateur
/* ═══════════════════════════════════════
   VERSIONING & UTILISATEUR
═══════════════════════════════════════ */
const DATA_KEYS = ['sites','agents','affec','absences','rempl','pointage','tournees','except','fermetures','evenements'];
let _loadedVersion = 0;     // version du fichier qu'on a chargé
let _loadedMeta = null;     // meta du fichier chargé
let _pendingImportData = null; // données en attente si conflit

function getCurrentUser(){
  try{ const a = window._msalApp && window._msalApp.getAllAccounts()[0]; if(a) return a.name || a.username; }catch(e){}
  return localStorage.getItem('gope_username') || '';
}
function setCurrentUser(name){
  localStorage.setItem('gope_username', name);
}

function fmtRelative(isoStr){
  if(!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff/60000);
  const h = Math.floor(min/60);
  const d = Math.floor(h/24);
  if(min < 1) return 'à l\'instant';
  if(min < 60) return `il y a ${min} min`;
  if(h < 24) return `il y a ${h}h`;
  return `il y a ${d}j`;
}

function updateSyncBar(meta){
  const el = document.getElementById('sync-bar');
  if(!el || !meta) return;
  const v = meta._version || '—';
  const who = meta._lastModifiedBy || '—';
  const when = fmtRelative(meta._lastModifiedAt);
  el.innerHTML = `<span style="color:var(--text3);font-size:11px">v${v} · ${who} · ${when}</span>`;
}

