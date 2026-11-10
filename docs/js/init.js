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

// Diagnostic mobile : ajouter ?diag=1 à l'adresse
(function(){
  if(!/[?&]diag=1/.test(location.search)) return;
  var d=document.createElement('div');
  d.style.cssText='position:fixed;left:6px;right:6px;top:60px;z-index:99999;background:#000;color:#0f0;font:11px/1.35 monospace;padding:6px;border-radius:6px;white-space:pre-wrap;pointer-events:none';
  document.body.appendChild(d);
  var p=document.createElement('div'); p.style.cssText='position:fixed;left:0;top:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden'; document.body.appendChild(p);
  function r(el){ if(!el) return 'null'; var b=el.getBoundingClientRect(); return Math.round(b.top)+'→'+Math.round(b.bottom)+' (h'+Math.round(b.height)+')'; }
  function u(){ var vv=window.visualViewport;
    d.textContent='innerH '+innerHeight+' | vvH '+(vv?Math.round(vv.height):'-')+' | clientH '+document.documentElement.clientHeight+' | screenH '+screen.height+' | safeBottom '+getComputedStyle(p).paddingBottom+'\n'+
    'body '+r(document.body)+'\napp-body '+r(document.querySelector('.app-body'))+'\nmain '+r(document.querySelector('.main-content'))+'\nview '+r(document.querySelector('.view.active'))+'\nplanning '+r(document.getElementById('planning-container'))+'\nnav '+r(document.querySelector('.nav-rail')); }
  u(); setInterval(u,700);
})();
