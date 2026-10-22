// Démarrage (DOMContentLoaded)
/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', function(){
  var iframed = false; try { iframed = (window.parent !== window); } catch(e){ iframed = true; }
  if(location.hash==='#demo' || iframed){
    DEMO_MODE=true;
    showLoginScreen(false);
    if(iframed && location.hash!=='#demo'){ const b=document.getElementById('demo-banner'); if(b) b.style.display='block'; }
    Promise.all(FILES.map(f => fetch('./data/'+f+'.json').then(r=>r.ok?r.json():[]).catch(()=>[])))
      .then(res => { FILES.forEach((f,i)=>_cache[f]=res[i]||[]); if(!gs().length) seed(); migrateTournees(); migrateAgentTypes(); migrateNomPrenom(); _cliDemoSeed(); updateAbsenceBadge(); showView('planning'); });
  } else {
    showLoginScreen(true);
  }
  const sl=document.getElementById('scope-list');
  if(sl) sl.addEventListener('click', e=>{
    e.stopPropagation();
    const exp=e.target.closest('.scope-exp'); if(exp){ const id=exp.dataset.exp; if(scopeExpanded.has(id)) scopeExpanded.delete(id); else scopeExpanded.add(id); renderScopeMenu(document.getElementById('scope-search-input')?.value||''); return; }
    const tab=e.target.closest('.scope-tab'); if(tab){ scopeTab=tab.dataset.scopetab; renderScopeMenu(document.getElementById('scope-search-input')?.value||''); return; }
    const rst=e.target.closest('.scope-reset'); if(rst){ selectScope('all',''); return; }
    const btn=e.target.closest('.scope-opt'); if(!btn) return;
    selectScope(btn.dataset.stype, btn.dataset.sval||'');
  });
  document.addEventListener('click', e=>{
    if(!e.target.closest('#scope-filter')) closeScopeMenu();
  });
});
