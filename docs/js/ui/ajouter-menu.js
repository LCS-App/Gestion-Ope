// Menu « Ajouter » : en-tête (global) et « + » de cellule du planning (agent + jour connus)
function closeAddMenu(){ document.getElementById('add-menu')?.remove(); }
document.addEventListener('click',e=>{ if(!e.target.closest('#add-menu')&&!e.target.closest('#add-menu-btn')) closeAddMenu(); });
function openAddMenu(ev, agentId, dateStr){
  ev.stopPropagation(); closeAddMenu();
  const JL=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const cell=!!(agentId&&dateStr);
  const d=cell?new Date(dateStr+'T12:00:00'):null;
  const it=(t,s,js,hi)=>`<div onclick="closeAddMenu();${js}" style="padding:10px 12px;border-radius:9px;cursor:pointer;${hi?'background:var(--surf2)':''}" onmouseover="this.style.background='var(--surf2)'" onmouseout="this.style.background='${hi?'var(--surf2)':'transparent'}'"><div style="font-weight:700;font-size:13.5px">${t}</div><div style="font-size:12px;color:var(--text2);margin-top:2px;line-height:1.4">${s}</div></div>`;
  let html='';
  if(cell){
    html+=`<div style="padding:6px 12px 4px;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">${_escH(agentNom(agentId))} · ${_dFr(dateStr)}</div>`;
    html+=it('Créneau ponctuel','Ce jour uniquement',`openPanel('panel-jour','${agentId}|${dateStr}||')`,true);
    html+=it('Affectation à partir du '+_dFr(dateStr).slice(0,5),'Chaque '+JL[d.getDay()].toLowerCase()+', début pré-rempli',`addAffectFromGrid('${agentId}','${JL[d.getDay()]}','${dateStr}')`);
  } else {
    html+=it('Nouvelle affectation','Règle qui se répète chaque semaine : un agent, un site, des jours et des horaires.',`_affectFromGrid=true;openPanel('panel-affect',null)`,true);
    html+=it('Créneau ponctuel','Un seul jour. Cliquez ensuite sur le « + » de la cellule voulue dans le planning.',`showView('planning');toast('Cliquez sur le « + » du jour voulu')`);
    html+=it('Déclarer une absence','Pour trouver un remplaçant.',`openPanel('panel-absence')`);
  }
  const m=document.createElement('div'); m.id='add-menu';
  m.style.cssText='position:fixed;z-index:400;width:'+(cell?260:330)+'px;background:var(--white);border:1px solid var(--border);border-radius:13px;box-shadow:var(--shadow-lg);padding:6px';
  m.innerHTML=html; document.body.appendChild(m);
  const r=ev.currentTarget.getBoundingClientRect();
  let left=Math.min(r.left, innerWidth-m.offsetWidth-12), top=r.bottom+6;
  if(top+m.offsetHeight>innerHeight-8) top=Math.max(8,r.top-m.offsetHeight-6);
  m.style.left=Math.max(8,left)+'px'; m.style.top=top+'px';
}
