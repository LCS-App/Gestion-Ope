// Lecture Dataverse → modèle app, écriture différentielle (_dvSync)
/* ── Lecture Dataverse → mêmes structures JSON que l'app SharePoint ── */
function _dvBadge(){
  if(!DV_READONLY || document.getElementById('dv-badge')) return;
  const el=document.createElement('div'); el.id='dv-badge';
  el.style.cssText='position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:10002;background:var(--text);color:#fff;font-size:12px;font-weight:700;padding:7px 14px;border-radius:999px;box-shadow:var(--shadow-lg);pointer-events:none';
  el.textContent='Version Dataverse · lecture seule : les modifications ne sont pas enregistrées';
  document.body.appendChild(el);
}
async function dvGetAll(set){
  const token = await getToken();
  const H = { Authorization:'Bearer '+token, Accept:'application/json', 'OData-MaxVersion':'4.0', 'OData-Version':'4.0',
    Prefer:'odata.include-annotations="OData.Community.Display.V1.FormattedValue",odata.maxpagesize=5000' };
  let out=[], next=DV_API+set;
  while(next){
    const r = await fetch(next, { headers:H });
    if(r.status===401 || r.status===403){ const t=await r.text(); const e=new Error(set+' → '+r.status+' '+t.slice(0,300)); if(r.status===403) e.accessDenied=true; throw e; }
    if(!r.ok) throw new Error(set+' → '+r.status+' '+(await r.text()).slice(0,300));
    const j = await r.json(); out = out.concat(j.value); next = j['@odata.nextLink'];
  }
  return out;
}
async function loadAllData(){
  showSyncStatus('Chargement Dataverse…');
  const T = ['site','client','contactclient','creneausite','couvertureignoree','agent','competence','affectation','absence','remplacement','exception','fermeture','tournee','etapetournee','pointage'];
  const R = {};
  const res = await Promise.all(T.map(t => dvGetAll('lcs_'+t+'s')));
  T.forEach((t,i)=>R[t]=res[i]);
  _dvFilInit(R);
  R.evenement = await dvGetAll('lcs_evenements').catch(e=>{ console.warn('Table lcs_evenement indisponible (dataverse/table-evenement.js)', e.message); return null; });
  window._evOk = !!R.evenement;
  const [_fil,_nt,_na] = await Promise.all([ dvGetAll('lcs_filiales').catch(()=>[]),
    dvGetAll('lcs_notes').catch(e=>{ console.warn('Table lcs_note indisponible (dataverse/table-notes.js)', e.message); return null; }),
    dvGetAll('lcs_noteactions').catch(()=>[]) ]);
  _dvCli.noteOk = !!_nt;
  _cliInit(R,_fil,_nt||[],_na);
  await _dvLinkReferents(R).catch(e=>console.warn('Référents de site', e));
  const data = dvToApp(R);
  Object.assign(_cache, data);
  _cache.permut = [];
  const gid = r => { const m=(r.lcs_idsource||'').split('|').map(s=>s.trim()).find(s=>/^go:[^:]+$/.test(s)); return m ? m.slice(3) : ''; };
  R.agent.forEach(r => _dvG['agents:'+(gid(r)||r.lcs_agentid)] = r.lcs_agentid);
  R.site.forEach(r => _dvG['sites:'+(gid(r)||r.lcs_siteid)] = r.lcs_siteid);
  R.contactclient.filter(c => c.statecode!==1 && c._lcs_client_value).forEach(c => { (_dvClientContacts[c._lcs_client_value]=_dvClientContacts[c._lcs_client_value]||[]).push({
    id:c.lcs_contactclientid, nom:[c.lcs_nom,c.lcs_prenom].filter(Boolean).join(' '), fonction:c.lcs_fonction||'', email:c.lcs_mail||'', tel:c.lcs_telportable||c.lcs_telfixe||'', siteLibre:!c._lcs_site_value }); });
  Object.values(_dvClientContacts).forEach(l => l.sort((a,b)=>a.nom.localeCompare(b.nom,'fr')));
  R.client.forEach(c => { if(c.lcs_nom){ _dvClients[c.lcs_nom.trim().toLowerCase()] = c.lcs_clientid; _dvClientNoms[c.lcs_clientid] = c.lcs_nom.trim(); } });
  Object.keys(_DV_ENT).forEach(k => (data[k]||[]).forEach(x => { if(x && x._dvid) _dvG[k+':'+x.id] = x._dvid; }));
  showSyncStatus('');
}
/* Agents toujours affichés même sans planning (nom de famille) — les autres sans planning sont masqués, la base Dataverse reste intacte. */
/* Rôle « Responsable opé » (colonne lcs_responsableope sur lcs_agent) : peut effectuer des remplacements. */
function isRespOpe(a){ return !!(a&&a.respOpe); }
const _DV_TOUJOURS = /^(AUGRAUD|BULTEZ|PERRAUDIN|DELINEAU|GARCIA|BIWOLÉ BIWOLÉ|DUVERGER)$/i;
function dvToApp(R){
  const F = (r,c) => r[c+'@OData.Community.Display.V1.FormattedValue'] || '';
  const V = (r,c) => r[c]==null ? '' : r[c];
  const LK = (r,c) => r['_'+c+'_value'] || '';
  const goId = src => { const m=(src||'').split('|').map(s=>s.trim()).find(s=>/^go:[^:]+$/.test(s)); return m ? m.slice(3) : ''; };
  const IDS = {};
  const mapIds = (t,pk) => R[t].forEach(r => { IDS[r[pk]] = goId(r.lcs_idsource) || r[pk]; });
  mapIds('site','lcs_siteid'); mapIds('agent','lcs_agentid'); mapIds('affectation','lcs_affectationid'); mapIds('absence','lcs_absenceid'); mapIds('tournee','lcs_tourneeid');
  const id = g => g ? (IDS[g] || g) : '';
  const jours = s => (s||'').split(/;\s*/).map(x=>x.trim()).filter(Boolean);
  const by = (t,col) => { const m={}; R[t].forEach(r=>{ const k=LK(r,col); if(k)(m[k]=m[k]||[]).push(r); }); return m; };
  const clients={}; R.client.forEach(c=>clients[c.lcs_clientid]=c.lcs_nom);
  const cren=by('creneausite','lcs_site'), cov=by('couvertureignoree','lcs_site'), cont=by('contactclient','lcs_site'), comp=by('competence','lcs_agent'), etap=by('etapetournee','lcs_tournee');
  const sites = R.site.filter(s => s.statecode!==1).map(s => { const ct=(cont[s.lcs_siteid]||[]).filter(c=>c.statecode!==1).sort((a,b)=>(_isReferent(b)?1:0)-(_isReferent(a)?1:0))[0] || (cont[s.lcs_siteid]||[])[0]; const o={ id:id(s.lcs_siteid), nom:V(s,'lcs_nom'), adresse:V(s,'lcs_adresse'), client:clients[LK(s,'lcs_client')]||'', notes:V(s,'lcs_notes'),
      creneaux:(cren[s.lcs_siteid]||[]).sort((a,b)=>(a.lcs_idsource||'').localeCompare(b.lcs_idsource||'')).map(c=>({ jours:jours(F(c,'lcs_jours')), debut:V(c,'lcs_debut'), fin:V(c,'lcs_fin') })),
      covIgnore:(cov[s.lcs_siteid]||[]).map(c=>F(c,'lcs_jour')+'|'+V(c,'lcs_debut')+'-'+V(c,'lcs_fin')), typologie:F(s,'lcs_typologie'), nbSalaries:s.lcs_nbsalaries==null?null:s.lcs_nbsalaries, nbSemPerm:s.lcs_nbsemainespermanence==null?null:s.lcs_nbsemainespermanence, _dvid:s.lcs_siteid };
    if(ct){ o.contact=[ct.lcs_nom,ct.lcs_prenom].filter(Boolean).join(' '); o.email=V(ct,'lcs_mail'); o.tel=V(ct,'lcs_telportable')||V(ct,'lcs_telfixe'); }
    return o; });
  const TYPE = { 'Accueil':'accueil','Concierge':'concierge','Chantier':'chantier','Multisite':'multisite','Logistique':'logistique','Factotum':'factotum','Siège':'siege' };
  const agents = R.agent.filter(a => F(a,'lcs_type')!=='Siège' || _DV_TOUJOURS.test(V(a,'lcs_nom'))).map(a => ({ id:id(a.lcs_agentid), nom:[V(a,'lcs_nom'),V(a,'lcs_prenom')].filter(Boolean).join(' '), nomFamille:V(a,'lcs_nom'), prenom:V(a,'lcs_prenom'),
    types:(F(a,'lcs_types')||'').split(/\s*;\s*/).map(x=>TYPE[x]).filter(Boolean), type:TYPE[F(a,'lcs_type')]||'accueil', email:V(a,'lcs_mailpro')||V(a,'lcs_mailperso'), emailPro:V(a,'lcs_mailpro'), emailPerso:V(a,'lcs_mailperso'), tel:V(a,'lcs_telperso')||V(a,'lcs_telpro'), telPro:V(a,'lcs_telpro'), telPerso:V(a,'lcs_telperso'), remplacant:!!a.lcs_remplacant,
    respOpe:!!a.lcs_responsableope, inactif:a.statecode===1, notes:V(a,'lcs_notes'), competences:(comp[a.lcs_agentid]||[]).map(c=>id(LK(c,'lcs_site'))).filter(Boolean),
    filiale:LK(a,'lcs_filiale'), contratDebut:(V(a,'lcs_debutcontrat')+'').slice(0,10), contratFin:(V(a,'lcs_fincontrat')+'').slice(0,10), contratHebdo:a.lcs_volumehebdo==null?null:Number(a.lcs_volumehebdo), _dvid:a.lcs_agentid }));
  agents.forEach(a=>{ if(!a.types.length) a.types=[a.type]; a.type=a.types[0]; });
  const NAT = { 'Poste fixe':'poste','Passage':'passage','Permanence volante':'permanence' };
  const SEM = { 'Toutes':'toutes','A':'A','B':'B' };
  const affec = R.affectation.map(f => ({ id:id(f.lcs_affectationid), agentId:id(LK(f,'lcs_agent')), siteId:id(LK(f,'lcs_site')), jours:jours(F(f,'lcs_jours')),
    debut:V(f,'lcs_debut'), fin:V(f,'lcs_fin'), semaine:SEM[F(f,'lcs_semaine')]||'toutes', dateDebut:(V(f,'lcs_datedebut')+'').slice(0,10), dateFin:(V(f,'lcs_datefin')+'').slice(0,10),
    pause:f.lcs_pause==null?0:f.lcs_pause, notes:V(f,'lcs_notes'), nature:NAT[F(f,'lcs_nature')]||'', _dvid:f.lcs_affectationid }));
  const MOT = { 'Congés payés':'conges','Maladie':'maladie','Formation':'formation','Autre':'autre' };
  const remplAbs = {}, rempl = [];
  R.remplacement.forEach(r => { const src=r.lcs_idsource||'', abs=LK(r,'lcs_absence');
    if(abs && /^go:[^:|]+:[^:|]+:\d{4}-\d\d-\d\d$/.test(src)){ (remplAbs[abs]=remplAbs[abs]||[]).push(r); return; }
    const ab = R.absence.find(a=>a.lcs_absenceid===abs);
    rempl.push({ id:goId(src)||r.lcs_remplacementid, agentAbsentId:ab?id(LK(ab,'lcs_agent')):'', remplacantId:id(LK(r,'lcs_remplacant')), siteId:id(LK(r,'lcs_site')),
      afId:id(LK(r,'lcs_affectation'))||null, date:(V(r,'lcs_date')+'').slice(0,10), statut:F(r,'lcs_statut')==='Proposé'?'propose':'confirme', notes:V(r,'lcs_notes'), _dvid:r.lcs_remplacementid }); });
  const absences = R.absence.map(a => { const o={ id:id(a.lcs_absenceid), agentId:id(LK(a,'lcs_agent')), dateDebut:(V(a,'lcs_datedebut')+'').slice(0,10), dateFin:(V(a,'lcs_datefin')+'').slice(0,10),
      motif:MOT[F(a,'lcs_motif')]||'autre', needsReplacement:!!a.lcs_aremplacer, siteId:id(LK(a,'lcs_site')), remplacantId:id(LK(a,'lcs_remplacant')), ignored:!!a.lcs_ignoree, notes:V(a,'lcs_notes'), _dvid:a.lcs_absenceid };
    const rs=remplAbs[a.lcs_absenceid]||[];
    if(rs.length){ const g={}; rs.forEach(r=>{ const af=id(LK(r,'lcs_affectation')); (g[af]=g[af]||[]).push(r); }); o.remplacants={};
      Object.entries(g).forEach(([af,list])=>{ const rem=new Set(list.map(r=>LK(r,'lcs_remplacant')));
        if(rem.size===1) o.remplacants[af]=id([...rem][0]); else list.forEach(r=>o.remplacants[af+'@'+(V(r,'lcs_date')+'').slice(0,10)]=id(LK(r,'lcs_remplacant'))); }); }
    return o; });
  const EXT = { 'Ajout':'add','Modification':'mod','Libération':'del' };
  const except = R.exception.map(e => ({ id:goId(e.lcs_idsource)||e.lcs_exceptionid, agentId:id(LK(e,'lcs_agent')), dateStr:(V(e,'lcs_date')+'').slice(0,10), type:EXT[F(e,'lcs_type')]||'mod',
    affecId:id(LK(e,'lcs_affectation')), siteId:id(LK(e,'lcs_site')), debut:V(e,'lcs_debut'), fin:V(e,'lcs_fin'), notes:V(e,'lcs_notes'), nature:NAT[F(e,'lcs_nature')]||'', createdBy:V(e,'lcs_saisipar')||F(e,'_createdby_value'), _dvid:e.lcs_exceptionid }));
  const fermetures = R.fermeture.map(f => ({ id:goId(f.lcs_idsource)||f.lcs_fermetureid, siteId:id(LK(f,'lcs_site')), dateDebut:(V(f,'lcs_datedebut')+'').slice(0,10), dateFin:(V(f,'lcs_datefin')+'').slice(0,10), motif:V(f,'lcs_motif'), notes:V(f,'lcs_notes'), _dvid:f.lcs_fermetureid }));
  const tournees = R.tournee.map(t => ({ id:id(t.lcs_tourneeid), nom:V(t,'lcs_nom'), agentId:id(LK(t,'lcs_agent')), notes:V(t,'lcs_notes'),
    siteIds:(etap[t.lcs_tourneeid]||[]).sort((a,b)=>(a.lcs_ordre||0)-(b.lcs_ordre||0)).map(e=>id(LK(e,'lcs_site'))).filter(Boolean), _dvid:t.lcs_tourneeid }));
  const pointage = R.pointage.map(p => ({ id:goId(p.lcs_idsource)||p.lcs_pointageid, type:F(p,'lcs_type')==='Retard'?'retard':'hsup', agentId:id(LK(p,'lcs_agent')), siteId:id(LK(p,'lcs_site')),
    date:(V(p,'lcs_date')+'').slice(0,10), duree:p.lcs_duree==null?0:p.lcs_duree, notes:V(p,'lcs_notes'), _dvid:p.lcs_pointageid }));
  console.log('Dataverse chargé :', { sites:sites.length, agents:agents.length, affec:affec.length, absences:absences.length, rempl:rempl.length, except:except.length, fermetures:fermetures.length, tournees:tournees.length, pointage:pointage.length });
  const avecPlanning = new Set();
  affec.forEach(x=>avecPlanning.add(x.agentId)); absences.forEach(x=>{ avecPlanning.add(x.agentId); avecPlanning.add(x.remplacantId); Object.values(x.remplacants||{}).forEach(v=>avecPlanning.add(v)); });
  rempl.forEach(x=>{ avecPlanning.add(x.agentAbsentId); avecPlanning.add(x.remplacantId); }); except.forEach(x=>avecPlanning.add(x.agentId));
  tournees.forEach(x=>avecPlanning.add(x.agentId)); pointage.forEach(x=>avecPlanning.add(x.agentId));
  const agentsVisibles = agents.filter(a => avecPlanning.has(a.id) || _DV_TOUJOURS.test(a.nomFamille));
  console.log('Agents masqués (sans planning) :', agents.length - agentsVisibles.length);
  const evenements = (R.evenement||[]).map(v => ({ id:goId(v.lcs_idsource)||v.lcs_evenementid, titre:(V(v,'lcs_libelle')||'').replace(/ · \d{4}-\d\d-\d\d$/,''), categorie:EV_KEY[F(v,'lcs_categorie')]||'autre', date:(V(v,'lcs_date')+'').slice(0,10),
    debut:V(v,'lcs_debut'), fin:V(v,'lcs_fin'), agentId:id(LK(v,'lcs_agent')), lieu:V(v,'lcs_lieu'), notes:V(v,'lcs_notes'), _dvid:v.lcs_evenementid }));
  return { sites, agents:agentsVisibles, affec, absences, rempl, except, fermetures, tournees, pointage, evenements };
}
/* Contact « Référent de site » sans site, dont le client n'a qu'un site actif → rattaché automatiquement à ce site.
   Client à plusieurs sites : non rattaché (choix dans la fiche site, liste « Contacts du client »). */
const _isReferent = c => /r[ée]f[ée]rent/i.test(c.lcs_fonction||'');
async function _dvLinkReferents(R){
  const todo=R.contactclient.filter(c=>c.statecode!==1 && !c._lcs_site_value && c._lcs_client_value && _isReferent(c));
  if(!todo.length) return;
  const m=await _dvMeta('lcs_contactclient'), ms=await _dvMeta('lcs_site'), nav=m.lookups.lcs_site.nav, multi=[];
  for(const c of todo){
    const sites=R.site.filter(s=>s.statecode!==1 && s._lcs_client_value===c._lcs_client_value);
    if(sites.length!==1){ multi.push(c.lcs_nom+' '+(c.lcs_prenom||'')+' ('+sites.length+' sites)'); continue; }
    try{ await _dvReq('PATCH', m.set+'('+c.lcs_contactclientid+')', { [nav+'@odata.bind']:'/'+ms.set+'('+sites[0].lcs_siteid+')' }); c._lcs_site_value=sites[0].lcs_siteid;
      console.log('Référent rattaché :', c.lcs_nom, '→', sites[0].lcs_nom); }
    catch(e){ console.warn('Référent non rattaché', c.lcs_nom, e); }
  }
  if(multi.length) console.log('Référents non rattachés (client à plusieurs sites) :', multi);
}
/* ── Filiale d'affectation des agents ──
   Ordre : filiale déjà en base → filiale des clients de ses sites (la plus fréquente) → filiale du responsable connecté → sinon vide. */
const _dvFil = { site:{}, me:'' };
const _dvCli = { me:null, clients:[], contacts:[], notes:[], filiales:[], noteOk:false };
function _dvFilInit(R){
  const cf={}; R.client.forEach(c=>{ const f=c._lcs_filiale_value; if(f) cf[c.lcs_clientid]=f; });
  R.site.forEach(s=>{ const f=cf[s._lcs_client_value]; if(f) _dvFil.site[s.lcs_siteid]=f; });
  let mail=''; try{ const ac=window._msalApp && window._msalApp.getAllAccounts()[0]; mail=((ac&&ac.username)||'').trim().toLowerCase(); }catch(e){}
  const me = mail && R.agent.find(a=>[a.lcs_mailpro,a.lcs_mailperso].some(m=>(m||'').trim().toLowerCase()===mail));
  _dvFil.me = (me && me._lcs_filiale_value) || '';
  _dvCli.me = me || null;
}
function _agentFiliale(a){
  if(a.filiale) return a.filiale;
  const n={}; gaf().filter(f=>f.agentId===a.id).forEach(f=>{ const g=_dvG['sites:'+f.siteId], fil=g&&_dvFil.site[g]; if(fil) n[fil]=(n[fil]||0)+1; });
  const best=Object.keys(n).sort((x,y)=>n[y]-n[x])[0];
  return best || _dvFil.me || '';
}
/* Agents existants sans filiale : complétés une fois en arrière-plan après le chargement */
async function _dvBackfillFiliale(){
  const list=(_cache.agents||[]).filter(a=>!a.filiale && _dvG['agents:'+a.id]);
  if(!list.length) return;
  const m=await _dvMeta('lcs_agent'); let n=0;
  for(const a of list){
    const fil=_agentFiliale(a); if(!fil) continue;
    try{ await _dvReq('PATCH', m.set+'('+_dvG['agents:'+a.id]+')', await _dvBody('lcs_agent',{lcs_filiale:'#'+fil},false));
      a.filiale=fil; if(_dvSnap.agents) _dvSnap.agents[a.id]=_dvJ(a); n++; }
    catch(e){ console.warn('Filiale non écrite', a.nom, e); }
  }
  if(n) console.log('Filiale complétée pour', n, 'agent(s)');
}
function showSyncStatus(msg){
  const el = document.getElementById('sync-status');
  if(!el) return;
  el.textContent = msg; el.style.opacity = msg ? '1' : '0';
}

/* ── STORAGE : cache mémoire + écriture différée OneDrive (par clé) ── */
let _pendingSaves = 0;
function _saveErrorBanner(){
  let el = document.getElementById('save-error-banner');
  if(!el){
    el = document.createElement('div');
    el.id = 'save-error-banner';
    el.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;z-index:10000;background:var(--red);color:#fff;font-size:13px;font-weight:700;text-align:center;padding:9px 12px;box-shadow:var(--shadow-lg)';
    document.body.prepend(el);
  }
  return el;
}
function _showSaveError(){
  showSyncStatus('');
  _saveErrorBanner().textContent = '⚠ Sauvegarde impossible — vérifiez votre connexion. Ne fermez pas cet onglet, vos modifications sont conservées localement.';
  _saveErrorBanner().style.display = 'block';
}
function _clearSaveError(){
  const el = document.getElementById('save-error-banner');
  if(el) el.style.display = 'none';
}
/* ── Écriture Dataverse ──
   À chaque sauvegarde d'une collection, on compare élément par élément à l'état connu (_dvSnap) :
   créé → POST, modifié → PATCH des seules colonnes changées, disparu → DELETE (sites/agents : désactivés).
   Sous-listes (créneaux, compétences, étapes, remplaçants d'une absence) : remplacées en bloc si elles changent. */
const _dvG = {}, _dvSnap = {}, _dvQ = {}, _dvMetaP = {}, _dvClients = {}, _dvClientNoms = {}, _dvMetaCache = {}, _dvClientContacts = {};
const _DV_ENT = { sites:'lcs_site', agents:'lcs_agent', affec:'lcs_affectation', absences:'lcs_absence', rempl:'lcs_remplacement', except:'lcs_exception', fermetures:'lcs_fermeture', tournees:'lcs_tournee', pointage:'lcs_pointage', evenements:'lcs_evenement' };
const _dvJ = x => JSON.stringify(x, (k,v) => k==='_dvid' ? undefined : v);
function _dvSnapshot(){ Object.keys(_DV_ENT).forEach(k => { const m={}; (_cache[k]||[]).forEach(x => { if(x && x.id) m[x.id]=_dvJ(x); }); _dvSnap[k]=m; }); }
async function _dvReq(method, path, body){
  for(let k=0;;k++){
    const token = await getToken();
    const r = await fetch(DV_API+path, { method, body: body ? JSON.stringify(body) : undefined, headers:{ Authorization:'Bearer '+token, Accept:'application/json',
      'Content-Type':'application/json; charset=utf-8', 'OData-MaxVersion':'4.0', 'OData-Version':'4.0', Prefer:'return=representation' } });
    if((r.status===429 || r.status===503) && k<4){ await new Promise(s=>setTimeout(s, 1500*(k+1))); continue; }
    const t = await r.text();
    if(!r.ok){ if(r.status===401) _token=null; const e=new Error(method+' '+path.split('?')[0]+' → '+r.status+' '+t.slice(0,300)); e.status=r.status; throw e; }
    return t ? JSON.parse(t) : {};
  }
}
function _dvMeta(ent){
  return _dvMetaP[ent] = _dvMetaP[ent] || (async () => {
    const q = `EntityDefinitions(LogicalName='${ent}')`, lbl = o => { const l=o.Label.UserLocalizedLabel || o.Label.LocalizedLabels[0]; return l ? l.Label.trim().toLowerCase() : ''; };
    const [e, attrs, rels, pl, ms] = await Promise.all([ _dvReq('GET', q+'?$select=EntitySetName,PrimaryIdAttribute'),
      dvGetAll(q+'/Attributes?$select=LogicalName,AttributeType'),
      dvGetAll(q+'/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName'),
      dvGetAll(q+'/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet'),
      dvGetAll(q+'/Attributes/Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet') ]);
    const M = { set:e.EntitySetName, pk:e.PrimaryIdAttribute, types:{}, choices:{}, multi:{}, lookups:{} };
    attrs.forEach(a => M.types[a.LogicalName] = a.AttributeType);
    rels.forEach(r => { if(r.ReferencingAttribute.startsWith('lcs_')) M.lookups[r.ReferencingAttribute] = { target:r.ReferencedEntity, nav:r.ReferencingEntityNavigationPropertyName }; });
    [[pl,false],[ms,true]].forEach(([list,multi]) => list.forEach(a => { const m={}; ((a.OptionSet||{}).Options||[]).forEach(o => m[lbl(o)]=o.Value); M.choices[a.LogicalName]=m; if(multi) M.multi[a.LogicalName]=true; }));
    _dvMetaCache[ent] = M; return M;
  })().catch(e => { delete _dvMetaP[ent]; throw e; });
}
/* Valeurs : '' → vide ; 'coll:id' (recherche vers un élément de l'app) ; '#guid' (recherche directe) ; undefined → colonne non touchée. */
async function _dvBody(ent, fields, create){
  const m = await _dvMeta(ent), o = {};
  for(const [c,v] of Object.entries(fields)){
    if(v===undefined) continue;
    if(m.lookups[c]){
      const g = !v ? null : v[0]==='#' ? v.slice(1) : _dvG[v];
      if(v && !g){ console.warn('Dataverse : recherche introuvable', ent, c, v); continue; }
      if(!g && create) continue;
      o[m.lookups[c].nav+'@odata.bind'] = g ? '/'+(await _dvMeta(m.lookups[c].target)).set+'('+g+')' : null; continue;
    }
    const t = m.types[c];
    if(!t){ console.warn('Dataverse : colonne absente', ent, c); continue; }
    if(v==='' || v==null || (Array.isArray(v) && !v.length)){ if(!create) o[c]=null; continue; }
    if(m.choices[c]){
      const vals = (Array.isArray(v) ? v : [v]).map(x => m.choices[c][String(x).trim().toLowerCase()]);
      if(vals.some(x => x===undefined)){ console.warn('Dataverse : choix non reconnu', ent, c, v); continue; }
      o[c] = m.multi[c] ? vals.join(',') : vals[0];
    } else if(t==='Boolean') o[c] = !!v;
    else if(t==='Integer') o[c] = parseInt(v,10);
    else if(t==='Decimal' || t==='Double' || t==='Money') o[c] = Number(String(v).replace(',','.'));
    else o[c] = v;
  }
  return o;
}
const _dvHasCol = (ent,c) => { const m=_dvMetaCache[ent]; return !!(m && m.types && m.types[c]); };
const _dvRef = (coll,id) => id ? coll+':'+id : '';
const _DV_JS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const _DVL = {
  sites: s => ({ f:{ lcs_nom:s.nom||'', lcs_adresse:s.adresse||'', lcs_notes:s.notes||'',
      lcs_typologie:s.typologie||'', lcs_nbsalaries:s.nbSalaries==null?'':s.nbSalaries, lcs_nbsemainespermanence:s.nbSemPerm==null?'':s.nbSemPerm,
      lcs_client: !s.client ? '' : _dvClients[s.client.trim().toLowerCase()] ? '#'+_dvClients[s.client.trim().toLowerCase()] : undefined },
    ch:[ { ent:'lcs_creneausite', fk:'lcs_site', rows:(s.creneaux||[]).map((c,i) => ({ lcs_libelle:s.nom+' · '+(c.jours||[]).join(' ')+' '+c.debut+'-'+c.fin, lcs_jours:c.jours||[], lcs_debut:c.debut||'', lcs_fin:c.fin||'', lcs_idsource:'go:'+s.id+':cr'+i })) },
      { ent:'lcs_couvertureignoree', fk:'lcs_site', rows:(s.covIgnore||[]).map(ci => { const [j,h]=ci.split('|'), [d,f]=(h||'').split('-'); return { lcs_libelle:s.nom+' · '+ci, lcs_jour:j, lcs_debut:d||'', lcs_fin:f||'', lcs_idsource:'go:'+s.id+':ci:'+ci }; }) } ],
    after: _dvSiteContact }),
  agents: a => { const pro=/@conciergerie-solidaire\.fr$/i.test(a.email||'');
    const TY={ accueil:'Accueil', concierge:'Concierge', chantier:'Chantier', multisite:'Multisite', logistique:'Logistique', factotum:'Factotum', siege:'Siège' };
    return { f:{ lcs_nom:a.nomFamille||a.nom||'', lcs_prenom:a.nomFamille ? (a.prenom||'') : undefined, lcs_type:TY[a.type]||'Accueil', lcs_types:agTypes(a).map(t=>TY[t]).filter(Boolean), lcs_remplacant:!!a.remplacant, lcs_responsableope:!!a.respOpe,
        lcs_filiale:(f=>f?'#'+f:undefined)(_agentFiliale(a)),
        lcs_mailpro:a.emailPro!=null ? a.emailPro : (pro ? a.email : ''), lcs_mailperso:a.emailPerso!=null ? a.emailPerso : (pro ? undefined : (a.email||'')), lcs_telpro:a.telPro!=null ? a.telPro : undefined, lcs_telperso:a.telPerso!=null ? a.telPerso : (a.tel||''), lcs_notes:a.notes||'',
        lcs_debutcontrat:a.contratDebut||'', lcs_fincontrat:a.contratFin||'', lcs_volumehebdo:a.contratHebdo==null ? '' : a.contratHebdo },
      state:a.inactif ? 1 : 0,
      ch:[ { ent:'lcs_competence', fk:'lcs_agent', rows:[...new Set(a.competences||[])].map(sid => ({ lcs_libelle:(a.nom||'')+' · '+siteNom(sid), lcs_site:_dvRef('sites',sid), lcs_idsource:'go:'+a.id+':comp:'+sid })) } ] }; },
  affec: f => ({ f:{ lcs_libelle:agentNom(f.agentId)+' · '+siteNom(f.siteId)+' · '+(f.jours||[]).join(' ')+' '+f.debut+'-'+f.fin, lcs_agent:_dvRef('agents',f.agentId), lcs_site:_dvRef('sites',f.siteId),
      lcs_jours:f.jours||[], lcs_debut:f.debut||'', lcs_fin:f.fin||'', lcs_semaine:{toutes:'Toutes',A:'A',B:'B'}[f.semaine]||'Toutes', lcs_datedebut:f.dateDebut||'', lcs_datefin:f.dateFin||'',
      lcs_pause:f.pause||'', lcs_notes:f.notes||'', lcs_nature:NATURES[natureOf(f)] } }),
  absences: a => { const rows=[];
    Object.entries(a.remplacants||{}).forEach(([key,rem]) => { if(!rem) return; const [afId,day]=key.split('@'), f=gaf().find(x => x.id===afId); if(!f) return;
      for(let d=new Date((day||a.dateDebut)+'T12:00:00'), e=new Date((day||a.dateFin||a.dateDebut)+'T12:00:00'); d<=e; d.setDate(d.getDate()+1)){
        const ds=_isoDate(d); if(!day && !(f.jours||[]).includes(_DV_JS[d.getDay()])) continue;
        rows.push({ lcs_libelle:agentNom(rem)+' remplace '+agentNom(a.agentId)+' · '+ds, lcs_affectation:_dvRef('affec',afId), lcs_site:_dvRef('sites',f.siteId), lcs_remplacant:_dvRef('agents',rem),
          lcs_date:ds, lcs_statut:'Confirmé', lcs_idsource:'go:'+a.id+':'+afId+':'+ds }); } });
    return { f:{ lcs_libelle:agentNom(a.agentId)+' · '+a.dateDebut+' → '+a.dateFin, lcs_agent:_dvRef('agents',a.agentId), lcs_datedebut:a.dateDebut||'', lcs_datefin:a.dateFin||'',
        lcs_motif:{conges:'Congés payés',maladie:'Maladie',formation:'Formation'}[a.motif]||'Autre', lcs_aremplacer:!!a.needsReplacement, lcs_site:_dvRef('sites',a.siteId),
        lcs_remplacant:_dvRef('agents',a.remplacantId), lcs_ignoree:!!a.ignored, lcs_notes:a.notes||'' },
      ch:[ { ent:'lcs_remplacement', fk:'lcs_absence', match:/^go:[^:|]+:[^:|]+:\d{4}-\d\d-\d\d$/, rows } ] }; },
  rempl: r => { const ab=gab().find(a => a.agentId===r.agentAbsentId && a.dateDebut<=r.date && r.date<=(a.dateFin||a.dateDebut));
    return { f:{ lcs_libelle:agentNom(r.remplacantId)+' remplace '+agentNom(r.agentAbsentId)+' · '+r.date, lcs_absence:ab ? _dvRef('absences',ab.id) : '', lcs_affectation:_dvRef('affec',r.afId),
      lcs_site:_dvRef('sites',r.siteId), lcs_remplacant:_dvRef('agents',r.remplacantId), lcs_date:r.date||'', lcs_statut:r.statut==='propose' ? 'Proposé' : 'Confirmé', lcs_notes:r.notes||'' } }; },
  except: e => ({ f:{ lcs_libelle:agentNom(e.agentId)+' · '+e.dateStr+' · '+({add:'Ajout',mod:'Modification',del:'Libération'}[e.type]||''), lcs_agent:_dvRef('agents',e.agentId), lcs_date:e.dateStr||'',
      lcs_type:{add:'Ajout',mod:'Modification',del:'Libération'}[e.type]||'Modification', lcs_affectation:_dvRef('affec',e.affecId), lcs_site:_dvRef('sites',e.siteId),
      lcs_debut:e.debut||'', lcs_fin:e.fin||'', lcs_notes:e.notes||'', lcs_nature:e.nature ? NATURES[natureOf(e)] : '',
      lcs_saisipar:_dvHasCol('lcs_exception','lcs_saisipar') ? (e.createdBy||'') : undefined } }),
  fermetures: f => ({ f:{ lcs_libelle:siteNom(f.siteId)+' · '+f.dateDebut+' → '+f.dateFin, lcs_site:_dvRef('sites',f.siteId), lcs_datedebut:f.dateDebut||'', lcs_datefin:f.dateFin||'', lcs_motif:f.motif||'', lcs_notes:f.notes||'' } }),
  tournees: t => ({ f:{ lcs_nom:t.nom||'', lcs_agent:_dvRef('agents',t.agentId), lcs_notes:t.notes||'' },
    ch:[ { ent:'lcs_etapetournee', fk:'lcs_tournee', rows:(t.siteIds||[]).map((s,i) => ({ lcs_libelle:t.nom+' · '+(i+1)+' · '+siteNom(s), lcs_site:_dvRef('sites',s), lcs_ordre:i+1, lcs_idsource:'go:'+t.id+':'+(i+1) })) } ] }),
  pointage: p => ({ f:{ lcs_libelle:agentNom(p.agentId)+' · '+p.date+' · '+p.type, lcs_agent:_dvRef('agents',p.agentId), lcs_site:_dvRef('sites',p.siteId), lcs_date:p.date||'',
      lcs_type:p.type==='retard' ? 'Retard' : 'Heures sup.', lcs_duree:p.duree==null ? '' : p.duree, lcs_notes:p.notes||'' } }),
  evenements: e => ({ f:{ lcs_libelle:(e.titre||'(sans titre)')+' · '+(e.date||''), lcs_categorie:(EV_CATS[e.categorie]||EV_CATS.autre).l, lcs_date:e.date||'', lcs_debut:e.debut||'', lcs_fin:e.fin||'',
      lcs_agent:_dvRef('agents',e.agentId), lcs_lieu:e.lieu||'', lcs_notes:e.notes||'' } }),
};
async function _dvSiteContact(s, old, g){
  const k = x => x ? [x.contact||'', x.email||'', x.tel||'', x.client||'', x.contactDvid||''].join('|') : '||||';
  if(k(s)===k(old)) return;
  const m = await _dvMeta('lcs_contactclient');
  const ex = await dvGetAll(`${m.set}?$select=${m.pk}&$filter=_lcs_site_value eq ${g}&$top=1`);
  const t=(s.contact||'').trim().split(/\s+/).filter(Boolean), up=t.filter(w => w===w.toUpperCase() && /[A-ZÀ-Ý]/.test(w)), low=t.filter(w => !up.includes(w));
  const cg = s.client && _dvClients[s.client.trim().toLowerCase()];
  const f = { lcs_nom:(up.length && low.length ? up.join(' ') : s.contact)||'(sans nom)', lcs_prenom:up.length && low.length ? low.join(' ') : '', lcs_mail:s.email||'', lcs_telportable:s.tel||'', lcs_client:cg ? '#'+cg : undefined };
  // Contact du client choisi dans la fiche site (pas encore rattaché à un site) → rattaché à ce site au lieu d'en créer un nouveau
  if(!ex[0] && s.contactDvid){ await _dvReq('PATCH', `${m.set}(${s.contactDvid})`, await _dvBody('lcs_contactclient', { ...f, lcs_site:'#'+g }));
    Object.values(_dvClientContacts).forEach(l => l.forEach(c => { if(c.id===s.contactDvid) c.siteLibre=false; })); return; }
  if(ex[0]) await _dvReq('PATCH', `${m.set}(${ex[0][m.pk]})`, await _dvBody('lcs_contactclient', f));
  else if(s.contact || s.email || s.tel) await _dvReq('POST', m.set, await _dvBody('lcs_contactclient', { ...f, lcs_site:'#'+g, lcs_idsource:'go:'+s.id+':contact' }, true));
}
async function _dvChildren(c, pg, fresh){
  const m = await _dvMeta(c.ent);
  if(!fresh){
    const ex = await dvGetAll(`${m.set}?$select=${m.pk},lcs_idsource&$filter=_${c.fk}_value eq ${pg}`);
    for(const r of ex.filter(r => !c.match || c.match.test(r.lcs_idsource||''))) await _dvReq('DELETE', `${m.set}(${r[m.pk]})`);
  }
  for(const row of c.rows) await _dvReq('POST', m.set, await _dvBody(c.ent, { ...row, [c.fk]:'#'+pg }, true));
}
async function _dvUpsert(k, x, old){
  const ent=_DV_ENT[k], m=await _dvMeta(ent), nw=_DVL[k](x), od=old ? _DVL[k](old) : null, key=k+':'+x.id;
  let g=_dvG[key], fresh=false;
  if(!g){
    const body = await _dvBody(ent, nw.f, true); body.lcs_idsource = 'go:'+x.id;
    const r = await _dvReq('POST', m.set, body); g = r[m.pk]; _dvG[key]=g; x._dvid=g; fresh=true;
  } else {
    const diff={}; Object.entries(nw.f).forEach(([c,v]) => { if(v!==undefined && (!od || JSON.stringify(v)!==JSON.stringify(od.f[c]))) diff[c]=v; });
    if(Object.keys(diff).length) await _dvReq('PATCH', `${m.set}(${g})`, await _dvBody(ent, diff));
  }
  if(nw.state!==undefined && (fresh ? nw.state===1 : (!od || od.state!==nw.state)))
    await _dvReq('PATCH', `${m.set}(${g})`, nw.state ? { statecode:1, statuscode:2 } : { statecode:0, statuscode:1 });
  for(let i=0; i<(nw.ch||[]).length; i++)
    if(fresh || !od || JSON.stringify(nw.ch[i].rows)!==JSON.stringify(od.ch[i].rows)) await _dvChildren(nw.ch[i], g, fresh);
  if(nw.after) await nw.after(x, fresh ? null : old, g);
}
async function _dvRemove(k, old){
  const key=k+':'+old.id, g=_dvG[key]; if(!g) return;
  const m = await _dvMeta(_DV_ENT[k]);
  if(k==='sites' || k==='agents'){ await _dvReq('PATCH', `${m.set}(${g})`, { statecode:1, statuscode:2 }); return; }
  for(const c of (_DVL[k](old).ch||[])) await _dvChildren({ ...c, rows:[] }, g, false);
  try { await _dvReq('DELETE', `${m.set}(${g})`); } catch(e){ if(e.status!==404) throw e; }
  delete _dvG[key];
}
async function _dvSyncNow(k, list){
  const snap=_dvSnap[k]; if(!snap || !_DVL[k]) return 0;
  const now={}; (list||[]).forEach(x => { if(x && x.id) now[x.id]=x; });
  let n=0;
  for(const [id,x] of Object.entries(now)){ const j=_dvJ(x); if(snap[id]===j) continue; await _dvUpsert(k, x, snap[id] ? JSON.parse(snap[id]) : null); snap[id]=j; n++; }
  for(const id of Object.keys(snap)) if(!now[id]){ await _dvRemove(k, JSON.parse(snap[id])); delete snap[id]; n++; }
  return n;
}
function _dvSync(k, v){ const prev = k==='rempl' ? Promise.all([_dvQ.rempl, _dvQ.absences]) : _dvQ[k]; // remplacements après absences (lien lcs_absence)
  const p=(prev||Promise.resolve()).then(() => _dvSyncNow(k, v)); _dvQ[k]=p.catch(() => {}); return p; }
async function _attemptSave(k, v, retry){
  if(DV_READONLY){ showSyncStatus('Lecture seule — non enregistré'); setTimeout(()=>showSyncStatus(''),2500); return; }
  if(!_DV_ENT[k]) return;
  _pendingSaves++;
  showSyncStatus('Enregistrement…');
  try {
    await _dvSync(k, v);
    showSyncStatus('✓ Enregistré'); setTimeout(()=>showSyncStatus(''),2000);
    _clearSaveError();
  } catch(e){
    console.error('Dataverse ('+k+') :', e.message);
    if(e.status===403){ _showSaveError(); _saveErrorBanner().textContent='⚠ Enregistrement refusé : votre compte n’a pas les droits d’écriture dans Dataverse. Contactez Jonathan.'; }
    else if(retry < 2){ setTimeout(()=>_attemptSave(k, v, retry+1), 1800); }
    else { _showSaveError(); }
  } finally {
    _pendingSaves--;
  }
}
window.addEventListener('beforeunload', e => {
  const pending = _pendingSaves>0 || Object.values(_syncTimers).some(t=>t) || document.getElementById('save-error-banner')?.style.display==='block';
  if(pending){ e.preventDefault(); e.returnValue = ''; }
});
