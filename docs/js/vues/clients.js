// Vue clients (opérationnelle) + contacts
/* ═══════════════════════════════════════
   CLIENTS — vue opérationnelle
   Données : lcs_client, lcs_contactclient, lcs_bilan (+ sites, affectations, absences de l'app).
   Écriture directe Dataverse (hors diff _dvSync). Création / modification : responsables opé uniquement.
   Profil : 'ops' pour tous aujourd'hui. Vue commerciale à venir, choisie selon le rôle de sécurité Dataverse
   de l'utilisateur (WhoAmI → systemuserroles_association) : _cliProfil() renverra 'commercial' et CLIENT_VUES.commercial prendra le relais.
═══════════════════════════════════════ */
const _cli = { sel:null, tab:'tous', type:'', open:{} };
function _cliProfil(){ return 'ops'; }
async function _cliDv(table,id,f){
  if(DEMO_MODE) return id||('demo-'+Math.random().toString(36).slice(2,10));
  const m=await _dvMeta(table);
  if(id){ await _dvReq('PATCH', m.set+'('+id+')', await _dvBody(table,f,false)); return id; }
  return (await _dvReq('POST', m.set, await _dvBody(table,f,true)))[m.pk];
}
async function _cliDvDel(table,id){
  if(DEMO_MODE) return;
  const m=await _dvMeta(table); await _dvReq('DELETE', m.set+'('+id+')');
}
/* Démo : clients fictifs rattachés aux sites de data/sites.json, dates relatives à aujourd'hui pour montrer les alertes */
function _cliDemoSeed(){
  const t=new Date(); t.setHours(12,0,0,0);
  const D=n=>_ymd(_addDays(t,n)), M=n=>{ const d=new Date(t); d.setMonth(d.getMonth()+n); return _ymd(d); };
  _dvCli.me={ lcs_responsableope:true }; _dvCli.noteOk=true;
  _dvCli.filiales=[{id:'f-bdx',nom:'LCS Bordeaux'},{id:'f-lim',nom:'LCS Limoges'}];
  const C=[
    ['c1','COMPAGNIE FIDUCIAIRE','12 rue Lafaurie de Monbadon, 33000 Bordeaux','f-bdx',M(-30),D(25),'Trimestriel',/^COMPAGNIE FIDUCIAIRE/],
    ['c2','BORDEAUX MÉTROPOLE','Esplanade Charles de Gaulle, 33000 Bordeaux','f-bdx',M(-40),'','2x / an',/^BM —/],
    ['c3','EAU DE BORDEAUX','91 rue Paulin, 33000 Bordeaux','f-bdx',M(-14),'','Trimestriel',/^EAU DE BORDEAUX/],
    ['c4','MAIRIE DE CENON','1 avenue Carnot, 33150 Cenon','f-bdx',M(-8),D(50),'Annuel',/^MAIRIE DE CENON/],
    ['c5','ITEAM','','f-lim',M(-2),'','Mensuel',/^ITEAM/],
    ['c6','THALES','75-77 avenue Marcel Dassault, 33700 Mérignac','f-bdx',M(-24),'','Annuel',/^THALES$/],
    ['c7','UBISOFT','2 rue Lucien Faure, 33000 Bordeaux','f-bdx',M(-6),'','Trimestriel',/^UBISOFT$/],
    ['c8','AÉROPORT DE BORDEAUX','Cidex 40, 33700 Mérignac','f-bdx','','','À la demande',/^AÉROPORT/],
    ['c9','MEXENS','31 allée de Chartres, 33000 Bordeaux','f-bdx',M(-36),D(-20),'Annuel',/^MEXENS$/],
  ];
  _dvCli.clients=C.map(([id,nom,adresse,filiale,debut,fin,periodicite])=>({id,nom,adresse,filiale,debut,fin,periodicite}));
  C.forEach(([id,nom,,,,,,re])=>{ _dvClients[nom.toLowerCase()]=id; _dvClientNoms[id]=nom; gs().forEach(s=>{ if(re.test(s.nom)) s.client=nom; }); });
  const sid=re=>(gs().find(s=>re.test(s.nom))||{}).id||'';
  _dvCli.contacts=[
    {id:'k1',clientId:'c1',siteG:'',nom:'Bertin',prenom:'Claire',fonction:'Responsable services généraux',mail:'c.bertin@cfiduciaire.fr',telport:'06 12 34 56 78',telfixe:'05 56 00 11 22'},
    {id:'k2',clientId:'c1',siteG:sid(/PESSAC$/),nom:'Lopez',prenom:'Marc',fonction:'Office manager',mail:'m.lopez@cfiduciaire.fr',telport:'06 98 76 54 32',telfixe:''},
    {id:'k3',clientId:'c2',siteG:'',nom:'Durand',prenom:'Sophie',fonction:'Cheffe de projet QVT',mail:'s.durand@bordeaux-metropole.fr',telport:'',telfixe:'05 56 99 84 84'},
    {id:'k4',clientId:'c2',siteG:sid(/MERIADECK/),nom:'Nguyen',prenom:'Thomas',fonction:'Gestionnaire de site',mail:'t.nguyen@bordeaux-metropole.fr',telport:'07 11 22 33 44',telfixe:''},
    {id:'k5',clientId:'c3',siteG:'',nom:'Martin',prenom:'Julie',fonction:'DRH adjointe',mail:'j.martin@eaudebordeaux.fr',telport:'06 45 67 89 01',telfixe:''},
    {id:'k6',clientId:'c6',siteG:'',nom:'Rousseau',prenom:'Paul',fonction:'Facility manager',mail:'paul.rousseau@thalesgroup.com',telport:'06 22 44 66 88',telfixe:''},
    {id:'k7',clientId:'c7',siteG:'',nom:'Petit',prenom:'Léa',fonction:'Happiness manager',mail:'lea.petit@ubisoft.com',telport:'',telfixe:'05 57 00 00 00'},
  ];
  const AG=ga().filter(a=>!a.inactif).slice(0,3).map(a=>a.id), r=i=>AG[i%AG.length]||'';
  const N=(id,clientId,type,titre,date,participants,contenu,actions,lien)=>({ id,clientId,type,titre,date,participants,contenu,lien:lien||'',actions:actions||[] });
  const Ac=(id,libelle,i,echeance,fait)=>({ id,libelle,respId:r(i),echeance,fait:!!fait });
  _dvCli.notes=[
    N('n1','c1','Bilan','Bilan trimestriel',M(-4),'Claire Bertin (client), Charlotte (LCS)',"## Points abordés\n- Satisfaction **globale très bonne**\n- Demande d'élargir les horaires du site de Pessac le vendredi\n\n> « Le service est devenu indispensable. »\n\n| Indicateur | Résultat |\n|---|---|\n| Présence | 98 % |\n| Réclamations | 0 |",
      [Ac('a1',"Chiffrer l'extension d'horaires à Pessac",0,D(-10),false),Ac('a2','Envoyer le compte rendu au client',1,D(-12),true)]),
    N('n2','c1','Réunion / CR','Point renouvellement du contrat',M(-1),'Claire Bertin, Marc Lopez (client), Charlotte (LCS)',"Le contrat arrive à échéance. Le client souhaite **renouveler** avec un site en plus.\n\n## Décisions\n- [x] Proposition de renouvellement sur 12 mois\n- [ ] Ajouter le site de Paludate\n- [ ] Revoir les conditions tarifaires",
      [Ac('a3','Préparer la proposition de renouvellement',0,D(5),false)],'https://example.com/CR-renouvellement.pdf'),
    N('n3','c1','Appel','Planning du vendredi',D(-3),'Marc Lopez (client)',"Appel pour décaler la permanence du vendredi de 9h à 10h pendant les travaux. *Validé.*",[]),
    N('n4','c2','Bilan','Bilan semestriel',M(-5),'Sophie Durand (client), Jonathan (LCS)',"Bilan semestriel : 8 sites, retours positifs sur Mériadeck.",[]),
    N('n5','c2','Note interne','',D(-20),'',"Interlocuteur à privilégier : **Thomas Nguyen** pour tout ce qui touche à Mériadeck.\nÉviter les appels après 17h.",[]),
    N('n6','c3','Bilan','Bilan de démarrage',M(-1),'Julie Martin (client), Charlotte (LCS)',"Mise en place réussie sur les trois sites.",[]),
    N('n7','c3','Réclamation / incident','Retard d\'accueil site Paulin',D(-6),'Julie Martin (client)',"Retard de **20 minutes** le matin du lundi, agent bloqué dans les transports. Client prévenu, remplacement organisé la fois suivante.",
      [Ac('a4','Rappeler le client pour confirmer la solution',2,D(-4),true),Ac('a5',"Prévoir un remplaçant d'astreinte le lundi",1,D(7),false)]),
    N('n8','c6','Bilan','Bilan annuel',D(9),'Paul Rousseau (client), Jonathan (LCS)','',[Ac('a6','Préparer les chiffres de fréquentation',0,D(7),false)]),
    N('n9','c7','Bilan','',M(-2),'Léa Petit (client)','RAS.',[]),
    N('n10','c7','Renouvellement / upsell','Offre petits-déjeuners',D(-15),'Léa Petit (client)',"Intérêt pour des petits-déjeuners mensuels. Devis à transmettre au pôle Animation.",[Ac('a7','Transmettre la demande à Valérie',2,D(-8),false)]),
  ];
  Object.keys(_dvClientNoms).forEach(_cliSyncContacts);
}
function _cliCanEdit(){ return !!(_dvCli.me && _dvCli.me.lcs_responsableope); }
const _CLI_PER = ['Mensuel','Trimestriel','2x / an','Annuel','À la demande'];
const _CLI_MOT = { conges:'Congés payés', maladie:'Maladie', formation:'Formation', autre:'Autre' };
function _cliMois(p){ return {'Mensuel':1,'Trimestriel':3,'2x / an':6,'Annuel':12}[p]||0; }
function _cliInit(R, fil, notes, acts){
  const F=(r,c)=>r[c+'@OData.Community.Display.V1.FormattedValue']||'', d=v=>(v||'').slice(0,10);
  _dvCli.filiales = fil.filter(f=>f.statecode!==1).map(f=>({ id:f.lcs_filialeid, nom:f.lcs_nom||f.lcs_code||'' }));
  _dvCli.clients = R.client.filter(c=>c.statecode!==1 && c.lcs_nom).map(c=>({ id:c.lcs_clientid, nom:c.lcs_nom.trim(), adresse:c.lcs_adresse||'', filiale:c._lcs_filiale_value||'',
    debut:d(c.lcs_debutcontrat), fin:d(c.lcs_fincontrat), periodicite:F(c,'lcs_periodicitebilan') }));
  _dvCli.contacts = R.contactclient.filter(c=>c.statecode!==1).map(c=>({ id:c.lcs_contactclientid, clientId:c._lcs_client_value||'', siteG:c._lcs_site_value||'',
    nom:c.lcs_nom||'', prenom:c.lcs_prenom||'', fonction:c.lcs_fonction||'', mail:c.lcs_mail||'', telport:c.lcs_telportable||'', telfixe:c.lcs_telfixe||'' }));
  const by={}; (acts||[]).filter(a=>a.statecode!==1).forEach(a=>(by[a._lcs_note_value]=by[a._lcs_note_value]||[]).push({ id:a.lcs_noteactionid, libelle:a.lcs_libelle||'', respG:a._lcs_responsable_value||'', respId:'', echeance:d(a.lcs_echeance), fait:!!a.lcs_fait }));
  _dvCli.notes = notes.filter(n=>n.statecode!==1).map(n=>{ const type=F(n,'lcs_type')||'Note interne', lib=n.lcs_libelle||'';
    return { id:n.lcs_noteid, clientId:n._lcs_client_value||'', type, titre:lib===type?'':lib, date:d(n.lcs_date), participants:n.lcs_participants||'', contenu:n.lcs_contenu||'', lien:n.lcs_lien||'', actions:by[n.lcs_noteid]||[] }; });
}
function _cliSyncContacts(cid){
  _dvClientContacts[cid]=_dvCli.contacts.filter(c=>c.clientId===cid).map(c=>({ id:c.id, nom:[c.nom,c.prenom].filter(Boolean).join(' '), fonction:c.fonction, email:c.mail, tel:c.telport||c.telfixe, siteLibre:!c.siteG }))
    .sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
}
function _cliSites(cid){ return gs().filter(s=>s.client && _dvClients[s.client.trim().toLowerCase()]===cid).sort((a,b)=>a.nom.localeCompare(b.nom,'fr')); }
function _cliDays(ymd){ const t=new Date(); t.setHours(0,0,0,0); return Math.round((new Date(ymd+'T00:00:00')-t)/864e5); }
function _cliAddMonths(ymd,n){ const d=new Date(ymd+'T12:00:00'); d.setMonth(d.getMonth()+n); return _ymd(d); }
function _cliFin(c){ return !!(c.fin && c.fin<_ymd(new Date())); }
/* Prochain bilan : bilan futur déjà saisi, sinon dernier bilan (ou début de contrat) + périodicité */
function _cliBilan(c){
  const ts=_ymd(new Date()), bs=_dvCli.notes.filter(b=>b.clientId===c.id&&b.type==='Bilan'&&b.date).sort((a,b)=>b.date.localeCompare(a.date));
  const futur=bs.filter(b=>b.date>ts).pop(), dernier=(bs.find(b=>b.date<=ts)||{}).date||'', m=_cliMois(c.periodicite);
  if(futur) return { etat:'planifie', date:futur.date, dernier };
  if(_cliFin(c) || !m) return { etat:c.periodicite==='À la demande'?'demande':'', date:'', dernier };
  const base=dernier||c.debut;
  if(!base) return { etat:'aplanifier', date:'', dernier };
  const date=_cliAddMonths(base,m), j=_cliDays(date);
  return { etat:j<0?'retard':j<=30?'aplanifier':'ok', date, dernier };
}
function _cliAlertes(c){
  const out=[];
  if(c.fin){ const j=_cliDays(c.fin); if(j>=0&&j<=60) out.push({ txt:'Fin de contrat '+(j===0?"aujourd'hui":'dans '+j+' j')+' ('+_dFr(c.fin)+')', tone:j<=15?'red':'orange' }); }
  const b=_cliBilan(c);
  if(b.etat==='retard') out.push({ txt:'Bilan en retard depuis le '+_dFr(b.date), tone:'red' });
  else if(b.etat==='aplanifier') out.push({ txt:b.date?'Bilan à planifier avant le '+_dFr(b.date):'Bilan à planifier (aucun bilan ni début de contrat)', tone:'orange' });
  const late=_cliLate(c.id); if(late) out.push({ txt:late+' action'+(late>1?'s':'')+' en retard', tone:'red' });
  return out;
}
function cliSelect(id){ _cli.sel=id; renderClients(); }
function cliTab(t){ _cli.tab=t; renderClients(); }
function renderClients(){
  const list=document.getElementById('clients-list'); if(!list) return;
  const q=(document.getElementById('search-clients')?.value||'').trim().toLowerCase();
  const all=_dvCli.clients.slice().sort((a,b)=>a.nom.localeCompare(b.nom,'fr')).map(c=>({ c, sites:_cliSites(c.id), al:_cliAlertes(c) }));
  const nAl=all.filter(r=>r.al.length).length;
  document.getElementById('clients-sub').textContent=`${all.length} client${all.length>1?'s':''}`+(_cliCanEdit()?'':' · lecture seule (modification réservée aux responsables opé)');
  document.getElementById('clients-add').style.display=_cliCanEdit()?'':'none';
  document.getElementById('clients-tabs').innerHTML=`<button class="tab${_cli.tab==='tous'?' on':''}" onclick="cliTab('tous')">Tous</button><button class="tab${_cli.tab==='alertes'?' on':''}" onclick="cliTab('alertes')">À traiter (${nAl})</button>`;
  let rows=all;
  if(_cli.tab==='alertes') rows=rows.filter(r=>r.al.length);
  if(q) rows=rows.filter(r=>r.c.nom.toLowerCase().includes(q)||r.sites.some(s=>s.nom.toLowerCase().includes(q))
    ||_dvCli.contacts.some(x=>x.clientId===r.c.id&&(x.nom+' '+x.prenom+' '+x.prenom+' '+x.nom).toLowerCase().includes(q)));
  if(!_cli.sel || !all.some(r=>r.c.id===_cli.sel)) _cli.sel=(rows[0]||{c:{}}).c.id||null;
  list.innerHTML=rows.length ? rows.map(r=>`<button class="cli-item${r.c.id===_cli.sel?' on':''}" onclick="cliSelect('${r.c.id}')">
      <span style="flex:1;min-width:0"><span class="cli-item-nom">${_escH(r.c.nom)}</span><span class="cli-item-sub">${r.sites.length} site${r.sites.length>1?'s':''}${_cliFin(r.c)?' · contrat terminé':''}</span></span>
      ${r.al.map(a=>`<span class="cli-dot" style="background:var(--${a.tone})" title="${_escA(a.txt)}"></span>`).join('')}
    </button>`).join('') : `<div class="cli-empty" style="padding:16px 10px">Aucun client</div>`;
  const el=document.getElementById('clients-fiche'), c=_dvCli.clients.find(x=>x.id===_cli.sel);
  el.innerHTML = c ? (CLIENT_VUES[_cliProfil()]||CLIENT_VUES.ops)(c) : `<div class="empty"><div class="empty-text">Sélectionnez un client</div></div>`;
}
const CLIENT_VUES = { ops: c=>_cliFicheOps(c) /* , commercial: c=>… (à venir) */ };

function _cliCard(titre, action, inner, wide){
  return `<div class="card" style="${wide?'grid-column:1/-1;':''}">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><div class="cli-h">${titre}</div><div style="margin-left:auto;display:flex;gap:6px">${action||''}</div></div>${inner}</div>`;
}
function _cliTone(t){ return t==='red'?'background:var(--red-light);color:var(--red)':t==='orange'?'background:var(--orange-light);color:var(--orange)':t==='green'?'background:var(--green-light);color:var(--green)':'background:var(--surf2);color:var(--text2)'; }
function _cliFicheOps(c){
  const ed=_cliCanEdit(), today=new Date(); today.setHours(0,0,0,0);
  const sites=_cliSites(c.id), sids=new Set(sites.map(s=>s.id)), cq=`'${c.id}'`;
  const fil=(_dvCli.filiales.find(f=>f.id===c.filiale)||{}).nom||'';
  const al=_cliAlertes(c), b=_cliBilan(c);
  const contacts=_dvCli.contacts.filter(x=>x.clientId===c.id).sort((x,y)=>(x.nom+x.prenom).localeCompare(y.nom+y.prenom,'fr'));
  const afs=gaf().filter(af=>sids.has(af.siteId)&&!(af.dateFin&&af.dateFin<_ymd(today)));
  const rec=covGapsRecurrents().filter(g=>sids.has(g.siteId));
  const wk=[]; if(sites.length) for(let i=0;i<7;i++) covGapsOnDate(_addDays(today,i)).filter(g=>sids.has(g.siteId)&&g.degrade).forEach(g=>wk.push(g));
  const agIds=new Set(afs.map(a=>a.agentId)), d0=_ymd(_addDays(today,-30)), d1=_ymd(_addDays(today,30));
  const abs=gab().filter(a=>agIds.has(a.agentId)&&(a.dateFin||a.dateDebut)>=d0&&a.dateDebut<=d1).sort((x,y)=>y.dateDebut.localeCompare(x.dateDebut));
  const siteG=g=>sites.find(s=>(s._dvid||s.id)===g);
  const recBySite={}; rec.forEach(g=>recBySite[g.siteId]=(recBySite[g.siteId]||0)+1);

  const head=`<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
      <div style="flex:1;min-width:0">
        <div style="font-size:22px;font-weight:800;line-height:1.2">${_escH(c.nom)}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px">${[fil,c.adresse].filter(Boolean).map(_escH).join(' · ')||'<span class="cli-empty">Adresse non renseignée</span>'}</div>
      </div>
      ${ed?`<button class="btn btn-secondary btn-sm" onclick="openPanel('panel-client',${cq})">Modifier</button>`:''}
    </div>
    ${al.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">${al.map(a=>`<span class="cli-pill" style="${_cliTone(a.tone)}">${_escH(a.txt)}</span>`).join('')}</div>`:''}`;

  const prochain = b.etat==='planifie'?`${_dFr(b.date)} <span class="cli-pill" style="${_cliTone('green')};font-size:11px;padding:1px 8px">planifié</span>`
    : b.etat==='retard'?`<span style="color:var(--red)">${_dFr(b.date)} · en retard</span>`
    : b.etat==='aplanifier'?`<span style="color:var(--orange)">${b.date?'avant le '+_dFr(b.date):'à planifier'}</span>`
    : b.etat==='ok'?_dFr(b.date) : b.etat==='demande'?'À la demande' : '<span class="cli-empty">—</span>';
  const contrat=_cliCard('Contrat', ed?`<button class="btn btn-secondary btn-sm" onclick="clientEdit(${cq},'pc-sec-contrat')">Modifier</button>`:'', `
    <dl class="cli-kv">
      <dt>Début de contrat</dt><dd>${c.debut?_dFr(c.debut):'<span class="cli-empty">—</span>'}</dd>
      <dt>Fin de contrat</dt><dd>${c.fin?_dFr(c.fin)+(_cliFin(c)?' <span class="cli-pill" style="'+_cliTone()+';font-size:11px;padding:1px 8px">terminé</span>':''):'<span class="cli-empty">Sans fin</span>'}</dd>
      <dt>Périodicité bilan</dt><dd>${_escH(c.periodicite)||'<span class="cli-empty">—</span>'}</dd>
      <dt>Dernier bilan</dt><dd>${b.dernier?_dFr(b.dernier):'<span class="cli-empty">Aucun</span>'}</dd>
      <dt>Prochain bilan</dt><dd>${prochain}</dd>
    </dl>`);
  const jrn=_cliJournal(c,ed);

  const cts=_cliCard('Contacts', ed?`<button class="btn btn-secondary btn-sm" onclick="openPanel('panel-contact',{cid:${cq}})">+ Contact</button>`:'',
    contacts.length?contacts.map(x=>{ const s=x.siteG&&siteG(x.siteG); return `<div class="cli-row${ed?' clk':''}"${ed?` onclick="openPanel('panel-contact',{cid:${cq},id:'${x.id}'})"`:''}>
      <div style="flex:1;min-width:0">
        <div class="cli-row-t">${_escH([x.prenom,x.nom].filter(Boolean).join(' '))}</div>
        <div class="cli-row-s">${[x.fonction,s?s.nom:''].filter(Boolean).map(_escH).join(' · ')}</div>
        <div class="cli-row-s" style="display:flex;gap:12px;flex-wrap:wrap">${x.telport?`<a href="tel:${_escA(x.telport)}" onclick="event.stopPropagation()">${_escH(x.telport)}</a>`:''}${x.telfixe?`<a href="tel:${_escA(x.telfixe)}" onclick="event.stopPropagation()">${_escH(x.telfixe)}</a>`:''}${x.mail?`<a href="mailto:${_escA(x.mail)}" onclick="event.stopPropagation()">${_escH(x.mail)}</a>`:''}</div>
      </div></div>`; }).join('') : `<div class="cli-empty">Aucun contact</div>`);

  const sts=_cliCard(`Sites <span style="color:var(--text3)">(${sites.length})</span>`,
    (sites.length?`<button class="btn btn-secondary btn-sm" onclick="cliGoSites(${cq})">Voir dans Sites</button>`:'')+`<button class="btn btn-secondary btn-sm" onclick="cliNewSite(${cq})">+ Site</button>`,
    sites.length?sites.map(s=>`<div class="cli-row clk" onclick="openPanel('panel-site','${s.id}')">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="cli-row-t">${_escH(s.nom)}</span>${s.typologie?`<span class="badge badge-gray" style="font-size:10px">${_escH(s.typologie)}</span>`:''}
          ${recBySite[s.id]?`<span class="badge" style="font-size:10px;background:#FFF3D6;color:#7A5A0B">⚠ ${recBySite[s.id]} créneau${recBySite[s.id]>1?'x':''} non couvert${recBySite[s.id]>1?'s':''}</span>`:''}</div>
        <div class="cli-row-s">${[s.adresse, (s.creneaux||[]).map(k=>k.jours.slice(0,2).join('+')+' '+k.debut+'–'+k.fin).join(' · ')].filter(Boolean).map(_escH).join(' · ')}</div>
      </div></div>`).join('') : `<div class="cli-empty">Aucun site rattaché</div>`, true);

  const byAg={}; afs.forEach(af=>(byAg[af.agentId]=byAg[af.agentId]||[]).push(af));
  const ags=_cliCard(`Agents affectés <span style="color:var(--text3)">(${Object.keys(byAg).length})</span>`, '',
    Object.keys(byAg).length?Object.entries(byAg).sort((x,y)=>agentNom(x[0]).localeCompare(agentNom(y[0]),'fr')).map(([aid,l])=>`<div class="cli-row clk" onclick="openPanel('panel-agent-detail','${aid}')">
      <div style="flex:1;min-width:0"><div class="cli-row-t">${_escH(agentNom(aid))}</div>
      ${l.map(af=>`<div class="cli-row-s">${sites.length>1?_escH(siteNom(af.siteId))+' · ':''}${af.jours.join(', ')} · ${af.debut}–${af.fin}${af.dateDebut&&af.dateDebut>_ymd(today)?' · à partir du '+_dFr(af.dateDebut):''}</div>`).join('')}</div></div>`).join('')
    : `<div class="cli-empty">Aucune affectation en cours</div>`);

  const cov=_cliCard('Couverture', '', `
    <div style="font-size:12px;font-weight:700;margin-bottom:6px">7 prochains jours</div>
    ${wk.length?wk.map(g=>_covRowHtml(g,'jour')).join(''):`<div class="cli-empty" style="margin-bottom:6px">Aucun trou ponctuel</div>`}
    <div style="font-size:12px;font-weight:700;margin:14px 0 6px">Récurrents</div>
    ${rec.length?rec.map(g=>_covRowHtml(g,'rec')).join(''):`<div class="cli-empty">Tous les créneaux d'ouverture sont couverts</div>`}`);

  const abv=_cliCard('Absences & remplacements', '<span style="font-size:11px;color:var(--text3)">± 30 jours</span>',
    abs.length?abs.map(a=>{ const r=[...new Set([a.remplacantId,...Object.values(a.remplacants||{})].filter(Boolean))];
      const st=r.length?{t:'Remplacé · '+r.map(agentNom).join(', '),k:'green'}:a.needsReplacement&&!a.ignored?{t:'Non remplacé',k:'red'}:{t:'Sans remplacement',k:''};
      return `<div class="cli-row clk" onclick="openPanel('panel-remplacer','${a.id}')">
        <div style="flex:1;min-width:0"><div class="cli-row-t">${_escH(agentNom(a.agentId))}</div>
        <div class="cli-row-s">${_dFr(a.dateDebut)}${a.dateFin&&a.dateFin!==a.dateDebut?' → '+_dFr(a.dateFin):''} · ${_CLI_MOT[a.motif]||'Autre'}</div></div>
        <span class="cli-pill" style="${_cliTone(st.k)};font-size:11px;padding:2px 8px;flex-shrink:0;max-width:50%;white-space:normal;text-align:right">${_escH(st.t)}</span></div>`; }).join('')
    : `<div class="cli-empty">Aucune absence sur la période</div>`);

  return head+`<div class="cli-grid">${contrat}${cts}${jrn}${sts}${ags}${cov}${abv}</div>`;
}
function cliGoSites(cid){ showView('sites'); const i=document.getElementById('search-sites'); if(i){ i.value=_dvClientNoms[cid]||''; renderSites(); } }
function cliNewSite(cid){
  openPanel('panel-site',null);
  const sel=document.getElementById('ps-client'); if(sel){ sel.innerHTML=_psClientOpts(_dvClientNoms[cid]||''); psClientChanged(); }
}

/* ── Panneau client ── */
function buildPanelClient(body,footer,cid){
  const c=cid?_dvCli.clients.find(x=>x.id===cid):null, filCur=c?c.filiale:_dvFil.me;
  body.innerHTML=`
    <div class="form-group"><label class="form-label">Nom du client *</label><input class="form-input" type="text" id="pc-nom" value="${_escA(c?.nom||'')}"></div>
    <div class="form-group"><label class="form-label">Filiale</label><select class="form-input" id="pc-filiale"><option value="">—</option>${_dvCli.filiales.map(f=>`<option value="${f.id}"${f.id===filCur?' selected':''}>${_escH(f.nom)}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Adresse</label><input class="form-input" type="text" id="pc-adresse" value="${_escA(c?.adresse||'')}"></div>
    <div class="form-section" id="pc-sec-contrat">Contrat</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Début</label><input class="form-input" type="date" id="pc-debut" value="${c?.debut||''}"></div>
      <div class="form-group"><label class="form-label">Fin</label><input class="form-input" type="date" id="pc-fin" value="${c?.fin||''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Périodicité des bilans</label><select class="form-input" id="pc-per"><option value="">—</option>${_CLI_PER.map(p=>`<option${c?.periodicite===p?' selected':''}>${p}</option>`).join('')}</select></div>
    <input type="hidden" id="pc-id" value="${cid||''}">`;
  footer.innerHTML=`<button class="btn btn-secondary" onclick="closePanel()">Annuler</button><button class="btn btn-primary" id="pc-save" onclick="saveClient()">Enregistrer</button>`;
}
function _cliRename(oldNom,nom,id){
  const o=oldNom.trim().toLowerCase(); delete _dvClients[o]; _dvClients[nom.toLowerCase()]=id; _dvClientNoms[id]=nom;
  gs().forEach(s=>{ if(s.client && s.client.trim().toLowerCase()===o){ s.client=nom; if(_dvSnap.sites&&_dvSnap.sites[s.id]) _dvSnap.sites[s.id]=_dvJ(s); } });
}
async function saveClient(){
  if(!_cliCanEdit()){ toast('Réservé aux responsables opé',false); return; }
  const v=i=>document.getElementById(i).value.trim();
  const id=v('pc-id'), nom=v('pc-nom'), debut=v('pc-debut'), fin=v('pc-fin'), filiale=v('pc-filiale'), periodicite=v('pc-per'), adresse=v('pc-adresse');
  if(!nom){ toast('Nom requis',false); return; }
  const dup=_dvClients[nom.toLowerCase()]; if(dup && dup!==id){ toast('Un client porte déjà ce nom',false); return; }
  if(debut && fin && fin<debut){ toast('La fin de contrat doit être après le début',false); return; }
  const f={ lcs_nom:nom, lcs_adresse:adresse, lcs_filiale:filiale?'#'+filiale:'', lcs_debutcontrat:debut, lcs_fincontrat:fin, lcs_periodicitebilan:periodicite };
  const btn=document.getElementById('pc-save'); btn.disabled=true;
  let gid=id;
  try{
    gid=await _cliDv('lcs_client',id,f);
  }catch(e){ console.error(e); toast('Enregistrement impossible',false); btn.disabled=false; return; }
  const o={ id:gid, nom, adresse, filiale, debut, fin, periodicite };
  const old=_dvCli.clients.find(x=>x.id===gid);
  if(old){ if(old.nom!==nom) _cliRename(old.nom,nom,gid); Object.assign(old,o); }
  else { _dvCli.clients.push(o); _dvClients[nom.toLowerCase()]=gid; _dvClientNoms[gid]=nom; }
  _cli.sel=gid; closePanel(); toast(id?'Client modifié':'Client créé'); renderClients();
}

/* ── Panneau contact ── */
function buildPanelContact(body,footer,data){
  const c=data.id?_dvCli.contacts.find(x=>x.id===data.id):null, sites=_cliSites(data.cid);
  const inp=(id,l,v,t)=>`<div class="form-group"><label class="form-label">${l}</label><input class="form-input" type="${t||'text'}" id="${id}" value="${_escA(v||'')}"></div>`;
  body.innerHTML=`
    <div style="font-size:12px;color:var(--text3);margin-bottom:14px">Client : <strong style="color:var(--text)">${_escH(_dvClientNoms[data.cid]||'')}</strong></div>
    <div class="form-row">${inp('pcc-prenom','Prénom',c?.prenom)}${inp('pcc-nom','Nom *',c?.nom)}</div>
    ${inp('pcc-fonction','Fonction',c?.fonction)}
    <div class="form-group"><label class="form-label">Site</label><select class="form-input" id="pcc-site"><option value="">— Tous les sites / siège —</option>${sites.map(s=>`<option value="${s._dvid||s.id}"${(c?c.siteG:data.siteG)===(s._dvid||s.id)?' selected':''}>${_escH(s.nom)}</option>`).join('')}</select></div>
    <div class="form-row">${inp('pcc-port','Tél. portable',c?.telport)}${inp('pcc-fixe','Tél. fixe',c?.telfixe)}</div>
    ${inp('pcc-mail','E-mail',c?.mail,'email')}`;
  footer.innerHTML=(c?`<button class="btn btn-danger" style="margin-right:auto" onclick="delContact('${_escA(data.cid)}','${c.id}')">Supprimer</button>`:'')
    +`<button class="btn btn-secondary" onclick="closePanel()">Annuler</button><button class="btn btn-primary" id="pcc-save" onclick="saveContact('${_escA(data.cid)}','${c?c.id:''}')">Enregistrer</button>`;
}
/* Contact rattaché à un site : la fiche site (contact/tel/email) suit, sans déclencher de réécriture */
function _cliSiteContactSync(oldC, newC){
  [oldC&&oldC.siteG, newC&&newC.siteG].filter(Boolean).forEach(g=>{
    const s=gs().find(x=>(x._dvid||x.id)===g); if(!s) return;
    const oldNom=oldC?[oldC.nom,oldC.prenom].filter(Boolean).join(' '):'';
    if(newC && newC.siteG===g && (!s.contact || s.contact===oldNom)){ s.contact=[newC.nom,newC.prenom].filter(Boolean).join(' '); s.tel=newC.telport||newC.telfixe; s.email=newC.mail; }
    else if(oldC && oldC.siteG===g && s.contact===oldNom){ s.contact=''; s.tel=''; s.email=''; }
    else return;
    if(_dvSnap.sites&&_dvSnap.sites[s.id]) _dvSnap.sites[s.id]=_dvJ(s);
  });
}
async function saveContact(cid,id){
  if(!_cliCanEdit()){ toast('Réservé aux responsables opé',false); return; }
  const v=i=>document.getElementById(i).value.trim();
  const o={ clientId:cid, siteG:v('pcc-site'), nom:v('pcc-nom'), prenom:v('pcc-prenom'), fonction:v('pcc-fonction'), mail:v('pcc-mail'), telport:v('pcc-port'), telfixe:v('pcc-fixe') };
  if(!o.nom){ toast('Nom requis',false); return; }
  const f={ lcs_nom:o.nom, lcs_prenom:o.prenom, lcs_fonction:o.fonction, lcs_mail:o.mail, lcs_telportable:o.telport, lcs_telfixe:o.telfixe, lcs_client:'#'+cid, lcs_site:o.siteG?'#'+o.siteG:'' };
  const btn=document.getElementById('pcc-save'); btn.disabled=true;
  try{
    o.id=await _cliDv('lcs_contactclient',id,f);
  }catch(e){ console.error(e); toast('Enregistrement impossible',false); btn.disabled=false; return; }
  const old=id&&_dvCli.contacts.find(x=>x.id===id), prev=old?{...old}:null;
  if(old) Object.assign(old,o); else _dvCli.contacts.push(o);
  _cliSiteContactSync(prev, old||o); _cliSyncContacts(cid);
  closePanel(); toast(id?'Contact modifié':'Contact ajouté'); renderClients(); if(currentView==='sites') renderSites();
}
async function delContact(cid,id){
  if(!_cliCanEdit() || !confirm('Supprimer ce contact ?')) return;
  try{ if(!DEMO_MODE){ const m=await _dvMeta('lcs_contactclient'); await _dvReq('PATCH', m.set+'('+id+')', { statecode:1, statuscode:2 }); } }
  catch(e){ console.error(e); toast('Suppression impossible',false); return; }
  const i=_dvCli.contacts.findIndex(x=>x.id===id), prev=_dvCli.contacts[i]; _dvCli.contacts.splice(i,1);
  _cliSiteContactSync(prev,null); _cliSyncContacts(cid);
  closePanel(); toast('Contact supprimé'); renderClients();
}

