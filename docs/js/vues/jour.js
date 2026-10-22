// Vue du jour (dispatch)
/* ═══════════════════════════════════════
   VUE DU JOUR (dispatch)
═══════════════════════════════════════ */
let jourDate=(function(){ const d=new Date(); d.setHours(0,0,0,0); return d; })();
let jourGroupe='', jourSearch='';
function changeJourDay(n){ jourDate=new Date(jourDate); jourDate.setDate(jourDate.getDate()+n); renderJour(); }
function goJourToday(){ jourDate=new Date(); jourDate.setHours(0,0,0,0); renderJour(); }
function renderJour(){
  const d=new Date(jourDate); d.setHours(0,0,0,0);
  const idx=(d.getDay()+6)%7, label=JOURS[idx], isA=isWeekA(d);
  const dateStr=_ymd(d), weekKey=getWeekKey(getMonday(d));
  document.getElementById('jour-date-label').textContent=_cap(d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+` · Semaine ${isA?'A':'B'}`;

  const evJ=gev().filter(e=>e.date===dateStr).sort((a,b)=>(a.debut||'').localeCompare(b.debut||''));
  document.getElementById('jour-events').innerHTML=evJ.length?`<div class="card" style="padding:0;overflow:hidden;margin-bottom:14px"><div style="padding:9px 14px;background:var(--surf2);font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Événements ponctuels</div>${evJ.map(e=>_evRow(e)).join('')}</div>`:'';

  const selG=document.getElementById('jour-groupe');
  if(selG){ const tournees=gt().slice().sort((a,b)=>a.nom.localeCompare(b.nom));
    selG.innerHTML=`<option value="">Toutes les tournées</option>`+tournees.map(t=>`<option value="${_escA(t.id)}">${_escH(t.nom)}</option>`).join('');
    selG.value=jourGroupe;
  }

  let affs=gaf().filter(a=>a.jours.includes(label) && _affInRange(a,d) && !(a.semaine==='A'&&!isA) && !(a.semaine==='B'&&isA));
  if(jourGroupe){ const t=gt().find(x=>x.id===jourGroupe); const set=new Set(t?(t.siteIds||[]):[]); affs=affs.filter(a=>set.has(a.siteId)); }
  const q=(jourSearch||'').trim().toLowerCase();
  if(q) affs=affs.filter(a=> siteNom(a.siteId).toLowerCase().includes(q) || agentNom(a.agentId).toLowerCase().includes(q));
  const absByAgent={}; gab().filter(ab=>_absCoversDate(ab,d)).forEach(ab=>absByAgent[ab.agentId]=ab);

  const groups={}; affs.forEach(a=>{ (groups[a.siteId]=groups[a.siteId]||[]).push(a); });
  const siteIds=Object.keys(groups).sort((x,y)=>siteNom(x).localeCompare(siteNom(y)));

  const absCount=affs.filter(a=>absByAgent[a.agentId]).length;
  const sansRempl=affs.filter(a=>{ const ab=absByAgent[a.agentId]; return ab&&ab.needsReplacement&&!ab.remplacantId; }).length;
  const st_=(val,color,label)=>`<div class="card" style="flex:1;min-width:120px;display:flex;align-items:center;gap:10px;padding:10px 14px"><div style="font-size:22px;font-weight:800;color:${color};line-height:1">${val}</div><div style="font-size:11px;color:var(--text2);line-height:1.2">${label}</div></div>`;
  document.getElementById('jour-stats').innerHTML=
    st_(siteIds.length,'var(--blue)','Sites actifs')+
    st_(new Set(affs.map(a=>a.agentId)).size,'var(--green)','Agents en poste')+
    st_(absCount,'var(--orange)','Absents')+
    st_(sansRempl,'var(--red)','Sans remplaçant');

  const list=document.getElementById('jour-list');
  if(!siteIds.length){ const filtered=jourGroupe||q; list.innerHTML=`<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg></div><div class="empty-text">${filtered?'Aucun résultat pour ce filtre':'Aucun créneau ce jour'}</div></div>`; return; }
  const entries=[];
  siteIds.forEach(sid=>groups[sid].forEach(a=>{ const ab=absByAgent[a.agentId]; entries.push({a, ab, sid, sev: ab?(ab.remplacantId?1:0):2}); }));
  entries.sort((x,y)=> x.sev-y.sev || _mins(x.a.debut)-_mins(y.a.debut) || siteNom(x.sid).localeCompare(siteNom(y.sid)));
  const head=`<div style="display:flex;align-items:center;gap:12px;padding:9px 14px;background:var(--surf2);font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">
    <span style="width:104px;flex-shrink:0">Statut</span>
    <span style="width:92px;flex-shrink:0">Horaire</span>
    <span style="flex:1.2;min-width:0">Site</span>
    <span style="flex:1;min-width:0">Agent</span>
  </div>`;
  const rowsHtml=entries.map(({a,ab,sid})=>{
    const uncovered=ab&&!ab.remplacantId, covered=ab&&ab.remplacantId;
    const badge = uncovered?`<span class="badge badge-red">Sans rempl.</span>` : covered?`<span class="badge" style="background:#DCEBF7;color:#134B72">Remplacé</span>` : `<span class="badge badge-green">Présent</span>`;
    const who = covered? `${_escH(agentNom(ab.remplacantId))} <span style="color:var(--text3);font-size:11px">(remplace ${_escH(agentNom(a.agentId).split(' ')[0])})</span>` : _escH(agentNom(a.agentId));
    const accent = uncovered?'var(--red)':covered?'#3B84C4':'var(--green)';
    return `<div style="display:flex;align-items:center;gap:12px;padding:9px 14px;border-top:1px solid var(--border);border-left:3px solid ${accent};cursor:pointer;${uncovered?'background:var(--red-light)':''}" onclick="openPanel('panel-creneau','${a.id}|${a.agentId}|${dateStr}|${ab?ab.id:''}')">
      <span style="width:104px;flex-shrink:0">${badge}</span>
      <span style="width:92px;flex-shrink:0;font-weight:700;font-size:12px;font-variant-numeric:tabular-nums;color:${uncovered?'var(--red)':'var(--text)'}">${a.debut}–${a.fin}</span>
      <span style="flex:1.2;min-width:0;font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_escH(siteNom(sid))}</span>
      <span style="flex:1;min-width:0;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${who}</span>
    </div>`;
  }).join('');
  list.innerHTML=`<div class="card" style="padding:0;overflow:hidden">${head}${rowsHtml}</div>`;
}

