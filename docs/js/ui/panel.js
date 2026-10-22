// Panneau latéral (ouverture, routage buildPanel*)
/* ═══════════════════════════════════════
   PANNEAU DROIT
═══════════════════════════════════════ */
let currentPanel=null;
let currentPanelData=null;

let _agWide=false,_noteWide=false,_panelKind='',_agWeekFor=null,_agWeekStart=null;
function toggleAgentWide(){
  if(_panelKind==='panel-note'){ _noteWide=!_noteWide; document.getElementById('side-panel').classList.toggle('wide',_noteWide); return; }
  _agWide=!_agWide;
  document.getElementById('side-panel').classList.toggle('wide',_agWide);
}
function _wkRefresh(){
  const id=currentPanel==='panel-affect'?document.getElementById('paf-agent')?.value:currentPanelData;
  renderAgentWeek(id);
}
function agWeekMove(n){ _agWeekStart=n===0?getMonday(new Date()):_addDays(_agWeekStart,7*n); _wkRefresh(); }
function _affGhost(){
  const v=i=>document.getElementById(i)?.value||'';
  const debut=v('paf-debut'), fin=v('paf-fin');
  if(!debut||!fin||_mins(fin)<=_mins(debut)) return null;
  return {jours:[...document.querySelectorAll('#paf-jours .jour-pill.on')].map(b=>b.dataset.j),debut,fin,sem:v('paf-sem')||'toutes',dd:v('paf-datedebut'),df:v('paf-datefin'),siteId:v('paf-site'),skip:typeof currentPanelData==='string'?currentPanelData:null};
}
function renderAgentWeek(agentId){
  const el=document.getElementById('ag-week'); if(!el) return;
  if(!agentId){ el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:20px 0">Choisissez un agent pour voir son planning.</div>'; return; }
  const inAff=currentPanel==='panel-affect', ghost=inAff?_affGhost():null;
  const H0=7,H1=19,PX=48, mon=_agWeekStart, todayS=_ymd(new Date());
  const abs=gab().filter(x=>x.agentId===agentId);
  const days=[...Array(7)].map((_,i)=>_addDays(mon,i));
  const cols=days.map(d=>{
    const idx=(d.getDay()+6)%7, label=JOURS[idx], isA=isWeekA(d), ds=_ymd(d);
    const dayAf=gaf().filter(af=>af.agentId===agentId&&(af.jours||[]).includes(label)&&_affInRange(af,d)&&!(af.semaine==='A'&&!isA)&&!(af.semaine==='B'&&isA));
    const ab=abs.find(a=>_absCoversDate(a,d));
    const sh=[];
    effectiveShifts(agentId,ds,dayAf).filter(s=>!(ghost&&ghost.skip&&s.afId===ghost.skip)).forEach(s=>sh.push({s,k:siteFermeLe(s.siteId,d)?'ferme':(ab?'abs':'own')}));
    if(ghost&&ghost.jours.includes(label)&&(ghost.sem==='toutes'||(ghost.sem==='A'&&isA)||(ghost.sem==='B'&&!isA))&&(!ghost.dd||ds>=ghost.dd)&&(!ghost.df||ds<=ghost.df)) sh.push({s:{siteId:ghost.siteId,debut:ghost.debut,fin:ghost.fin},k:'ghost'});
    agentReplacementShifts(agentId,d).forEach(s=>sh.push({s,k:'repl'}));
    sh.forEach(x=>{x.a=_mins(x.s.debut);x.b=_mins(x.s.fin);}); sh.sort((p,q)=>p.a-q.a||p.b-q.b);
    const lanes=[]; sh.forEach(x=>{ let l=lanes.findIndex(e=>e<=x.a); if(l<0){l=lanes.length;lanes.push(0);} lanes[l]=x.b; x.l=l; });
    const n=Math.max(1,lanes.length);
    const blks=sh.map(x=>{
      const top=Math.max(0,(x.a-H0*60)/60*PX), bot=Math.min((H1-H0)*PX,(x.b-H0*60)/60*PX);
      if(bot<=0||top>=(H1-H0)*PX) return '';
      const nat=x.k==='own'?natureOf(x.s):'poste';
      const st={own:nat==='passage'?'background:#FFFFFF;color:#1E5738;border:1px dashed #3E9A69;border-left:3px dashed #3E9A69':nat==='permanence'?'background:#D3EDEA;color:#0E4F48;border-left:3px solid #1F8A7E':'background:#DDEFE4;color:#1E5738;border-left:3px solid #3E9A69',repl:'background:#DCEBF7;color:#134B72',abs:'background:repeating-linear-gradient(45deg,#F8DCD7,#F8DCD7 6px,#F3C9C2 6px,#F3C9C2 12px);color:#7A2019',ghost:'background:#FFF3B8;color:#4D3B00;border:2px dashed #C9A100;z-index:2',ferme:'background:#ECECEA;color:#6B6D68'}[x.k];
      const clk=inAff||x.k==='ghost'?'':x.k==='own'&&x.s.afId?`editAffectFromAgent('${x.s.afId}','${agentId}')`:(x.k==='abs'&&ab?`openPanel('panel-remplacer','${ab.id}')`:'');
      return `<div class="wk-blk" onclick="${clk}" title="${_escA(siteNom(x.s.siteId))} · ${x.s.debut}–${x.s.fin}${x.k==='own'&&nat!=='poste'?' · '+NATURES[nat]:''}${x.k==='abs'?' · absent':x.k==='ghost'?' · en cours de modification':x.k==='repl'?' · remplacement':x.k==='ferme'?' · site fermé':''}" style="top:${top}px;height:${Math.max(18,bot-top)}px;left:calc(${x.l/n*100}% + 1px);width:calc(${100/n}% - 2px);${st}"><b>${x.k==='own'?_natIcon(nat):''} ${_escH(siteNom(x.s.siteId))}</b>${x.s.debut}–${x.s.fin}${x.k==='abs'?' · Absent':x.k==='repl'?' · Remplac.':x.k==='ghost'?' · En cours':''}</div>`;
    }).join('');
    const mins=sh.filter(x=>x.k==='own'||x.k==='repl'||x.k==='ghost').reduce((t,x)=>t+(x.b-x.a),0);
    return {d,ds,blks,mins};
  });
  const tot=cols.reduce((t,c)=>t+c.mins,0);
  const wn=getWeekNum(mon), fin=_addDays(mon,6);
  const hrs=[...Array(H1-H0+1)].map((_,i)=>`<span style="top:${i*PX}px">${H0+i}h</span>`).join('');
  el.innerHTML=`<div class="wk-nav">
    <button class="btn btn-secondary btn-sm" onclick="agWeekMove(-1)">‹</button>
    <button class="btn btn-secondary btn-sm" onclick="agWeekMove(0)">Aujourd'hui</button>
    <button class="btn btn-secondary btn-sm" onclick="agWeekMove(1)">›</button>
    <div style="font-size:13px;font-weight:700;margin-left:6px">Semaine ${wn} <span style="font-weight:500;color:var(--text2)">· ${isWeekA(mon)?'impaire':'paire'} · ${_dFr(_ymd(mon)).slice(0,5)} → ${_dFr(_ymd(fin)).slice(0,5)}</span></div>
    <div style="margin-left:auto;font-size:12px;color:var(--text2)">${_fmtDur(tot)} planifiées</div>
  </div>
  <div class="wk-grid">
    <div class="wk-head" style="border-left:0"></div>
    ${cols.map(c=>`<div class="wk-head${c.ds===todayS?' today':''}">${JOURS[(c.d.getDay()+6)%7]} ${c.d.getDate()}</div>`).join('')}
    <div class="wk-hours">${hrs}</div>
    ${cols.map(c=>`<div class="wk-col${c.ds===todayS?' today':''}">${c.blks}</div>`).join('')}
  </div>
  <div style="display:flex;gap:14px;margin-top:10px;font-size:11px;color:var(--text2);flex-wrap:wrap">
    ${ghost?'<span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#FFF3B8;border:1px dashed #C9A100;margin-right:4px"></i>En cours de modification</span>':''}
    <span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#DDEFE4;margin-right:4px"></i>Poste fixe</span>
    <span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#fff;border:1px dashed #3E9A69;margin-right:4px"></i>Passage</span>
    <span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#D3EDEA;margin-right:4px"></i>Permanence volante</span>
    <span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#DCEBF7;margin-right:4px"></i>Remplacement</span>
    <span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#F3C9C2;margin-right:4px"></i>Absent</span>
    <span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#ECECEA;margin-right:4px"></i>Site fermé</span>
  </div>`;
}

function openPanel(panelId, data=null){
  currentPanel=panelId;
  currentPanelData=data;
  const panel=document.getElementById('side-panel');
  panel.classList.add('open');
  document.body.classList.add('side-panel-open');
  const sc=document.getElementById('panel-scrim'); if(sc) sc.classList.add('show');
  buildPanel(panelId,data);
  const _pb=document.getElementById('panel-body'); if(_pb) _pb.scrollTop=0; panel.scrollTop=0;
  requestAnimationFrame(()=>{ if(_pb) _pb.scrollTop=0; });
}

function closePanel(){
  document.getElementById('side-panel').classList.remove('open');
  document.body.classList.remove('side-panel-open');
  const sc=document.getElementById('panel-scrim'); if(sc) sc.classList.remove('show');
  currentPanel=null;
}

function buildPanel(id,data){
  const titles={
    'panel-absence':'Déclarer une absence',
    'panel-agent': data?'Modifier l\'agent':'Nouvel agent',
    'panel-site': data?'Modifier le site':'Nouveau site',
    'panel-tournee': data?'Modifier la tournée':'Nouvelle tournée',
    'panel-affect': data&&data.versionOf?'Modifier à partir du…':data?'Modifier l\'affectation':'Nouvelle affectation',
    'panel-pointage':'Ajouter un événement',
    'panel-evenement': (data&&!String(data).startsWith('new|'))?'Modifier l\'événement':'Nouvel événement',
    'panel-remplacer':'Attribuer un remplaçant',
    'panel-agent-detail':'Fiche agent',
    'panel-creneau':'Détail du créneau',
    'panel-jour':'Ajuster ce jour',
    'panel-couverture':"Créneaux d'ouverture non couverts",
    'panel-couvrir':'Couvrir ce créneau',
    'panel-client': data?'Modifier le client':'Nouveau client',
    'panel-contact': data&&data.id?'Modifier le contact':'Nouveau contact',
    'panel-note': data&&data.id?'Entrée du journal':'Nouvelle entrée',
  };
  document.getElementById('panel-title').textContent=titles[id]||'';
  const navBtn=document.getElementById('panel-next-absence');
  if(navBtn) navBtn.style.display=(id==='panel-remplacer')?'inline-flex':'none';
  const _isAg=id==='panel-agent-detail'||id==='panel-affect', _isNote=id==='panel-note'; _panelKind=id;
  document.getElementById('panel-expand').style.display=(_isAg||_isNote)?'inline-flex':'none';
  document.getElementById('side-panel').classList.toggle('wide',(_isAg&&_agWide)||(_isNote&&_noteWide));
  document.getElementById('panel-body').oninput=document.getElementById('panel-body').onchange=document.getElementById('panel-body').onclick=null;
  if(_isAg && _agWeekFor!==data){ _agWeekFor=data; _agWeekStart=getMonday(new Date()); }

  const body=document.getElementById('panel-body');
  const footer=document.getElementById('panel-footer');

  const renders={
    'panel-couverture': buildPanelCouverture,
    'panel-couvrir': buildPanelCouvrir,
    'panel-absence': buildPanelAbsence,
    'panel-agent': buildPanelAgent,
    'panel-site': buildPanelSite,
    'panel-tournee': buildPanelTournee,
    'panel-affect': buildPanelAffect,
    'panel-pointage': buildPanelPointage,
    'panel-evenement': buildPanelEvenement,
    'panel-remplacer': buildPanelRemplacer,
    'panel-agent-detail': buildPanelAgentDetail,
    'panel-creneau': buildPanelCreneau,
    'panel-jour': buildPanelJour,
    'panel-client': buildPanelClient,
    'panel-contact': buildPanelContact,
    'panel-note': buildPanelNote,
  };
  renders[id]?.(body,footer,data);
  if(id==='panel-affect'){
    const wrap=document.createElement('div'); wrap.className='ag-wrap';
    const info=document.createElement('div'); info.className='ag-info';
    while(body.firstChild) info.appendChild(body.firstChild);
    const wk=document.createElement('div'); wk.className='ag-week'; wk.id='ag-week';
    wrap.appendChild(info); wrap.appendChild(wk); body.appendChild(wrap);
    const rf=()=>setTimeout(_wkRefresh,0);
    body.oninput=body.onchange=body.onclick=rf;
    _wkRefresh();
  }
}

