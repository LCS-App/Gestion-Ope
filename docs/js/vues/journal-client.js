// Journal client (notes Markdown, actions)
/* ═══════════════════════════════════════
   JOURNAL CLIENT — lcs_note (contenu en Markdown) + lcs_noteaction (actions avec responsable / échéance)
═══════════════════════════════════════ */
const _NOTE_TYPES=['Bilan','Réunion / CR','Note interne','Appel','Échange e-mail','Réclamation / incident','Renouvellement / upsell'];
const _NOTE_TONE={ 'Bilan':'blue','Réclamation / incident':'red','Renouvellement / upsell':'orange','Réunion / CR':'green' };
function _cliNoteTone(t){ const k=_NOTE_TONE[t]; return k?`background:var(--${k}-light);color:var(--${k})`:'background:var(--surf2);color:var(--text2)'; }
function _cliAgApp(g){ if(!g) return ''; for(const k in _dvG){ if(_dvG[k]===g && k.startsWith('agents:')) return k.slice(7); } return ''; }
function _cliResp(a){ return a.respId || _cliAgApp(a.respG); }
function _cliNotes(cid){ return _dvCli.notes.filter(n=>n.clientId===cid).sort((a,b)=>(b.date||'').localeCompare(a.date||'')); }
function _cliLate(cid){ const ts=_ymd(new Date()); let n=0; _cliNotes(cid).forEach(x=>x.actions.forEach(a=>{ if(!a.fait && a.echeance && a.echeance<ts) n++; })); return n; }

/* Markdown (échappé : seul le balisage ci-dessous produit du HTML) */
function _mdInline(s){
  return _escH(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)"]+|mailto:[^\s)"]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)"]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}
function mdRender(src){
  const L=String(src||'').replace(/\r/g,'').split('\n'), out=[]; let i=0;
  const isT=l=>/^\s*\|.*\|\s*$/.test(l), cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
  while(i<L.length){
    const l=L[i]; let m;
    if(!l.trim()){ i++; continue; }
    if((m=l.match(/^(#{1,3})\s+(.*)$/))){ const n=m[1].length+2; out.push(`<h${n}>${_mdInline(m[2])}</h${n}>`); i++; continue; }
    if(/^\s*[-*]\s/.test(l)||/^\s*\d+[.)]\s/.test(l)){
      const ord=/^\s*\d+/.test(l), re=ord?/^\s*\d+[.)]\s+/:/^\s*[-*]\s+/, it=[];
      while(i<L.length&&re.test(L[i])){ const t=L[i].replace(re,''), cb=t.match(/^\[([ xX])\]\s+(.*)$/);
        it.push(cb?`<li class="md-task"><span class="md-box${cb[1]!==' '?' on':''}" contenteditable="false"></span>${_mdInline(cb[2])}</li>`:`<li>${_mdInline(t)}</li>`); i++; }
      out.push(`<${ord?'ol':'ul'}>${it.join('')}</${ord?'ol':'ul'}>`); continue; }
    if(/^>/.test(l)){ const b=[]; while(i<L.length&&/^>/.test(L[i])) b.push(L[i++].replace(/^>\s?/,'')); out.push(`<blockquote>${b.map(_mdInline).join('<br>')}</blockquote>`); continue; }
    if(isT(l)&&i+1<L.length&&/^\s*\|[\s:|-]+\|\s*$/.test(L[i+1])){
      const hd=cells(l), rows=[]; i+=2; while(i<L.length&&isT(L[i])) rows.push(cells(L[i++]));
      out.push(`<table><thead><tr>${hd.map(c=>`<th>${_mdInline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${_mdInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`); continue; }
    const p=[]; while(i<L.length&&L[i].trim()&&!/^(#{1,3}\s|\s*[-*]\s|\s*\d+[.)]\s|>)/.test(L[i])) p.push(L[i++]);
    if(!p.length) p.push(L[i++]);
    out.push(`<p>${p.map(_mdInline).join('<br>')}</p>`);
  }
  return out.join('');
}
/* Éditeur riche (contenteditable) : le contenu est stocké en Markdown */
function _rteNorm(e){
  e.querySelectorAll('li.md-task').forEach(li=>{ if(!li.querySelector(':scope > .md-box')){ const b=document.createElement('span'); b.className='md-box'; b.contentEditable='false'; li.insertBefore(b,li.firstChild); } });
  e.querySelectorAll('li:not(.md-task) > .md-box').forEach(b=>b.remove());
  if(!e.textContent.replace(/\u200b/g,'').trim() && !e.querySelector('li,table,blockquote')) e.innerHTML='';
}
function _rte(c){
  const e=document.getElementById('pn-cr'); if(!e) return; e.focus();
  document.execCommand('styleWithCSS',false,false); document.execCommand('defaultParagraphSeparator',false,'p');
  const cur=(document.queryCommandValue('formatBlock')||'').toLowerCase().replace(/[<>]/g,'');
  if(c==='h') document.execCommand('formatBlock',false,cur==='h3'?'p':'h3');
  else if(c==='q') document.execCommand('formatBlock',false,cur==='blockquote'?'p':'blockquote');
  else if(c==='task'){
    const n=getSelection().anchorNode, li0=n&&(n.nodeType===3?n.parentNode:n).closest('li');
    document.execCommand('insertUnorderedList');
    if(!(li0&&li0.classList.contains('md-task'))){ const m=getSelection().anchorNode, li=m&&(m.nodeType===3?m.parentNode:m).closest('li'); if(li) li.classList.add('md-task'); }
  }
  else if(c==='link'){ const u=prompt('Adresse du lien','https://'); if(u&&/^(https?:\/\/|mailto:)/i.test(u)) document.execCommand('createLink',false,u); }
  else document.execCommand(c);
  _rteNorm(e);
}
function _rteKey(ev){
  if(ev.key!==' ') return;
  const sel=getSelection(); if(!sel.rangeCount||!sel.isCollapsed) return;
  const tn=sel.anchorNode; if(!tn||tn.nodeType!==3||sel.anchorOffset!==tn.nodeValue.length) return;
  const blk=tn.parentNode.closest('p,div,h3,h4,h5,blockquote,li'); if(!blk||blk.textContent!==tn.nodeValue) return;
  const M={ '#':'h', '##':'h', '-':'insertUnorderedList', '*':'insertUnorderedList', '1.':'insertOrderedList', '>':'q', '[]':'task', '[ ]':'task' }, c=M[tn.nodeValue.trim()];
  if(!c) return;
  ev.preventDefault(); tn.nodeValue='\u200b'; sel.collapse(tn,1); _rte(c);
}
function _htmlToMd(root){
  const T=s=>s.replace(/\u200b/g,'').replace(/\u00a0/g,' ');
  const wrap=(c,m)=>{ const x=c.match(/^(\s*)([\s\S]*?)(\s*)$/); return x[2]?x[1]+m+x[2]+m+x[3]:c; };
  const inl=n=>{
    if(n.nodeType===3) return T(n.nodeValue);
    if(n.nodeType!==1) return '';
    const t=n.tagName; if(t==='BR') return '\n';
    if(n.classList.contains('md-box')) return '';
    const c=[...n.childNodes].map(inl).join('');
    if(t==='B'||t==='STRONG') return wrap(c,'**');
    if(t==='I'||t==='EM') return wrap(c,'*');
    if(t==='CODE') return '`'+c+'`';
    if(t==='A' && n.getAttribute('href')) return '['+c+']('+n.getAttribute('href')+')';
    return c;
  };
  const BLK=/^(P|DIV|H[1-6]|UL|OL|BLOCKQUOTE|TABLE)$/;
  const walk=parent=>{
    const out=[]; let buf='';
    const flush=()=>{ const s=buf.trim(); if(s) out.push(s); buf=''; };
    [...parent.childNodes].forEach(n=>{
      const t=n.nodeType===1?n.tagName:'';
      if(!BLK.test(t)){ buf+=inl(n); return; }
      flush();
      if(/^H[1-6]$/.test(t)){ const s=inl(n).trim(); if(s) out.push('#'.repeat(Math.max(1,+t[1]-2))+' '+s.replace(/\n/g,' ')); }
      else if(t==='UL'||t==='OL'){ const L=[...n.children].filter(x=>x.tagName==='LI').map((li,i)=>{
          const txt=[...li.childNodes].filter(x=>!(x.nodeType===1&&/^(UL|OL)$/.test(x.tagName))).map(inl).join('').trim().replace(/\n+/g,' ');
          const pre=t==='OL'?(i+1)+'. ':li.classList.contains('md-task')?(li.querySelector('.md-box.on')?'- [x] ':'- [ ] '):'- ';
          return pre+txt; });
        if(L.length) out.push(L.join('\n')); }
      else if(t==='BLOCKQUOTE'){ const s=walk(n).join('\n'); if(s) out.push(s.split('\n').map(l=>'> '+l).join('\n')); }
      else if(t==='TABLE'){ const R=[...n.rows].map(r=>[...r.cells].map(c=>inl(c).trim().replace(/\n+/g,' ')));
        if(R.length){ out.push('| '+R[0].join(' | ')+' |\n|'+R[0].map(()=>'---').join('|')+'|'+R.slice(1).map(r=>'\n| '+r.join(' | ')+' |').join('')); } }
      else if([...n.children].some(x=>BLK.test(x.tagName))) out.push(...walk(n));
      else { const s=inl(n).trim(); if(s) out.push(s); }
    });
    flush(); return out;
  };
  return walk(root).join('\n\n');
}

/* Journal dans la fiche */
function cliType(t){ _cli.type=t; renderClients(); }
function cliNoteToggle(id){ if(_cli.open[id]) delete _cli.open[id]; else _cli.open[id]=1; renderClients(); }
function _cliJournal(c,ed){
  const cq=`'${c.id}'`, ts=_ymd(new Date()), all=_cliNotes(c.id), flt=_cli.type, list=flt?all.filter(n=>n.type===flt):all, counts={};
  all.forEach(n=>counts[n.type]=(counts[n.type]||0)+1);
  const add=ed&&_dvCli.noteOk?`<button class="btn btn-secondary btn-sm" onclick="openPanel('panel-note',{cid:${cq}})">+ Entrée</button>`:'';
  if(!_dvCli.noteOk) return _cliCard('Journal', '', `<div class="cli-empty">Indisponible : les tables « Note client » et « Action de note » n'existent pas encore dans Dataverse (dataverse/table-notes.js).</div>`, true);
  const chips=['',..._NOTE_TYPES].filter(t=>!t||counts[t]).map(t=>`<button class="tab${flt===t?' on':''}" data-t="${_escA(t)}" onclick="cliType(this.dataset.t)">${t||'Tout'} <span style="opacity:.6">${t?counts[t]:all.length}</span></button>`).join('');
  const row=n=>{
    const open=!!_cli.open[n.id], A=n.actions, nd=A.filter(a=>a.fait).length, late=A.filter(a=>!a.fait&&a.echeance&&a.echeance<ts).length;
    const ex=(n.contenu||'').replace(/[#*>`|\[\]]|^\s*[-\d.)]+\s/gm,'').trim().split('\n')[0].slice(0,100);
    const head=`<div class="note-h" onclick="cliNoteToggle('${n.id}')">
      <span class="note-d">${_dFr(n.date)}</span>
      <span class="cli-pill" style="${_cliNoteTone(n.type)};font-size:11px;padding:2px 9px;flex-shrink:0">${_escH(n.type)}</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span class="cli-row-t">${_escH(n.titre)||''}</span>${!open&&ex?`<span style="color:var(--text3);font-size:12px">${n.titre?' · ':''}${_escH(ex)}</span>`:''}</span>
      ${n.date>ts?`<span class="cli-pill" style="${_cliTone('green')};font-size:11px;padding:1px 8px">à venir</span>`:''}
      ${A.length?`<span class="cli-pill" style="${late?_cliTone('red'):nd===A.length?_cliTone('green'):_cliTone()};font-size:11px;padding:1px 8px">${nd}/${A.length} action${A.length>1?'s':''}${late?' · '+late+' en retard':''}</span>`:''}
      ${n.lien?`<a href="${_escA(n.lien)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Ouvrir le document" style="font-size:13px">↗</a>`:''}
      <span style="color:var(--text3);font-size:11px;width:10px;text-align:center">${open?'▾':'▸'}</span></div>`;
    if(!open) return `<div class="note">${head}</div>`;
    const body=`<div class="note-b">
      ${n.participants?`<div class="cli-row-s" style="margin:0 0 8px"><strong style="color:var(--text2)">Participants</strong> · ${_escH(n.participants)}</div>`:''}
      ${n.contenu?`<div class="md">${mdRender(n.contenu)}</div>`:`<div class="cli-empty">Pas de contenu</div>`}
      ${n.lien?`<div style="margin-top:10px;font-size:12px"><a href="${_escA(n.lien)}" target="_blank" rel="noopener">Ouvrir le document ↗</a></div>`:''}
      ${A.length?`<div class="cli-h" style="margin:14px 0 6px">Actions</div>`+A.map(a=>{ const r=_cliResp(a), lt=!a.fait&&a.echeance&&a.echeance<ts;
        return `<div class="act-row"><button class="act-box${a.fait?' on':''}"${ed?` onclick="cliToggleAct('${n.id}','${a.id}')"`:' disabled'} title="${a.fait?'Fait':'À faire'}"></button>
          <span style="flex:1;min-width:0;${a.fait?'text-decoration:line-through;color:var(--text3)':''}">${_escH(a.libelle)}</span>
          ${r?`<span style="font-size:11.5px;color:var(--text2)">${_escH(agentNom(r))}</span>`:''}
          ${a.echeance?`<span style="font-size:11.5px;font-weight:700;${lt?'color:var(--red)':'color:var(--text3)'}">${_dFr(a.echeance)}</span>`:''}</div>`; }).join(''):''}
      ${ed?`<div style="margin-top:12px"><button class="btn btn-secondary btn-sm" onclick="openPanel('panel-note',{cid:${cq},id:'${n.id}'})">Modifier</button></div>`:''}</div>`;
    return `<div class="note open">${head}${body}</div>`;
  };
  return _cliCard(`Journal <span style="color:var(--text3)">(${all.length})</span>`, add,
    (all.length?`<div class="tabs" style="flex-wrap:wrap;margin-bottom:10px">${chips}</div>`:'')
    +(list.length?list.map(row).join(''):`<div class="cli-empty">${all.length?'Aucune entrée de ce type':'Aucune entrée : bilans, comptes rendus, appels, notes…'}</div>`), true);
}
async function cliToggleAct(nid,aid){
  if(!_cliCanEdit()) return;
  const n=_dvCli.notes.find(x=>x.id===nid), a=n&&n.actions.find(x=>x.id===aid); if(!a) return;
  const fait=!a.fait;
  try{ await _cliDv('lcs_noteaction',aid,{ lcs_fait:fait }); }catch(e){ console.error(e); toast('Mise à jour impossible',false); return; }
  a.fait=fait; renderClients();
}

/* ── Panneau entrée du journal ── */
let _noteDraft=null;
function buildPanelNote(body,footer,data){
  const n=data.id?_dvCli.notes.find(x=>x.id===data.id):null, ed=_cliCanEdit(), dis=ed?'':' disabled';
  _noteDraft={ acts:(n?n.actions:[]).map(a=>({...a,respId:_cliResp(a)})), del:[] };
  const cts=_dvCli.contacts.filter(x=>x.clientId===data.cid), tp=n?n.type:(data.type||'Réunion / CR');
  const tb=(l,fn,t,st)=>`<button type="button" class="btn btn-secondary btn-sm" style="padding:2px 9px;${st||''}" title="${t}" onmousedown="event.preventDefault()" onclick="${fn}">${l}</button>`;
  body.innerHTML=`
    <div style="font-size:12px;color:var(--text3);margin-bottom:14px">Client : <strong style="color:var(--text)">${_escH(_dvClientNoms[data.cid]||'')}</strong></div>
    <div class="nt-wrap">
      <div class="nt-main">
        <div class="nt-i2"><div class="form-group"><label class="form-label">Objet</label><input class="form-input" type="text" id="pn-titre" value="${_escA(n?.titre||'')}" placeholder="Ex : Bilan trimestriel, Point renouvellement"${dis}></div></div>
        <div class="nt-i4"><div class="form-group"><label class="form-label">Contenu</label>
      ${ed?`<div id="pn-tools" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${tb('<b>G</b>',"_rte('bold')",'Gras')}${tb('<i>I</i>',"_rte('italic')",'Italique')}${tb('Titre',"_rte('h')",'Titre')}${tb('• Liste',"_rte('insertUnorderedList')",'Liste à puces')}${tb('1. Liste',"_rte('insertOrderedList')",'Liste numérotée')}${tb('☐ Tâche',"_rte('task')",'Case à cocher')}${tb('Citation',"_rte('q')",'Citation')}${tb('Lien',"_rte('link')",'Lien (sélectionner le texte avant)')}</div>`:''}
      <div id="pn-cr" class="md rte"${ed?' contenteditable="true"':''} data-ph="Écrivez ici…  (« - » liste, « [] » tâche, « # » titre se transforment en direct)"></div></div></div>
      </div>
      <div class="nt-side">
        <div class="nt-i1"><div class="form-row">
      <div class="form-group"><label class="form-label">Type</label><select class="form-input" id="pn-type"${dis}>${_NOTE_TYPES.map(t=>`<option${t===tp?' selected':''}>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Date *</label><input class="form-input" type="date" id="pn-date" value="${n?n.date:_ymd(new Date())}"${dis}></div>
    </div></div>
        <div class="nt-i3"><div class="form-group"><label class="form-label">Participants</label><input class="form-input" type="text" id="pn-part" value="${_escA(n?.participants||'')}" placeholder="Ex : Mme Bertin (client), Charlotte (LCS)"${dis}>
      ${ed&&cts.length?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">${cts.map(x=>{ const nm=[x.prenom,x.nom].filter(Boolean).join(' '); return `<button type="button" class="btn btn-secondary btn-sm" style="padding:1px 8px;font-size:11px" data-n="${_escA(nm)}" onclick="_notePart(this.dataset.n)">+ ${_escH(nm)}</button>`; }).join('')}</div>`:''}</div></div>
        <div class="nt-i5"><div class="form-group"><label class="form-label">Lien du document (SharePoint…)</label><input class="form-input" type="url" id="pn-lien" value="${_escA(n?.lien||'')}" placeholder="https://"${dis}></div></div>
        <div class="nt-i6"><div class="form-section">Actions décidées</div>
    <div id="pn-acts"></div>
    ${ed?`<button type="button" class="btn btn-secondary btn-sm" style="margin-top:6px" onclick="_noteActAdd()">+ Action</button>`:''}</div>
      </div></div>`;
  const ce=document.getElementById('pn-cr'); ce.innerHTML=mdRender(n?n.contenu:'');
  if(ed){
    ce.addEventListener('keydown',_rteKey); ce.addEventListener('input',()=>_rteNorm(ce));
    ce.addEventListener('paste',e=>{ e.preventDefault(); document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text/plain')); });
    ce.addEventListener('click',e=>{ if(e.target.classList&&e.target.classList.contains('md-box')) e.target.classList.toggle('on'); });
  }
  _noteActsRender(ed);
  footer.innerHTML=!ed?`<button class="btn btn-secondary" onclick="closePanel()">Fermer</button>`
    :(n?`<button class="btn btn-danger" style="margin-right:auto" onclick="delNote('${n.id}')">Supprimer</button>`:'')
    +`<button class="btn btn-secondary" onclick="closePanel()">Annuler</button><button class="btn btn-primary" id="pn-save" onclick="saveNote('${_escA(data.cid)}','${n?n.id:''}')">Enregistrer</button>`;
}
function _notePart(nm){ const i=document.getElementById('pn-part'); if(!i) return; i.value=i.value.trim()?i.value.trim().replace(/,$/,'')+', '+nm:nm; }
function _noteActsRender(ed){
  if(ed===undefined) ed=_cliCanEdit();
  const el=document.getElementById('pn-acts'); if(!el) return;
  const ags=ga().filter(a=>!a.inactif).slice().sort((x,y)=>(x.nom||'').localeCompare(y.nom||'','fr')), dis=ed?'':' disabled';
  el.innerHTML=_noteDraft.acts.length?_noteDraft.acts.map((a,i)=>`<div class="act-edit">
      <input type="checkbox" ${a.fait?'checked':''}${dis} onchange="_noteActSet(${i},'fait',this.checked)" title="Fait">
      <input class="form-input" type="text" value="${_escA(a.libelle)}" placeholder="Action à mener"${dis} oninput="_noteActSet(${i},'libelle',this.value)">
      ${ed?`<button type="button" class="btn btn-secondary btn-sm" style="padding:2px 8px" onclick="_noteActDel(${i})" title="Retirer">×</button>`:'<span></span>'}
      <span></span>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 140px;gap:6px">
        <select class="form-input"${dis} onchange="_noteActSet(${i},'respId',this.value)"><option value="">Responsable…</option>${ags.map(g=>`<option value="${_escA(g.id)}"${g.id===a.respId?' selected':''}>${_escH(g.nom)}</option>`).join('')}</select>
        <input class="form-input" type="date" value="${a.echeance||''}"${dis} onchange="_noteActSet(${i},'echeance',this.value)"></div>
      <span></span></div>`).join(''):`<div class="cli-empty">Aucune action</div>`;
}
function _noteActSet(i,k,v){ if(_noteDraft.acts[i]) _noteDraft.acts[i][k]=v; }
function _noteActAdd(){ _noteDraft.acts.push({ id:'', libelle:'', respId:'', echeance:'', fait:false }); _noteActsRender(true); const l=document.querySelectorAll('#pn-acts .act-edit input[type=text]'); if(l.length) l[l.length-1].focus(); }
function _noteActDel(i){ const a=_noteDraft.acts.splice(i,1)[0]; if(a&&a.id) _noteDraft.del.push(a.id); _noteActsRender(true); }
async function saveNote(cid,id){
  if(!_cliCanEdit()){ toast('Réservé aux responsables opé',false); return; }
  const v=i=>document.getElementById(i).value.trim();
  const o={ clientId:cid, type:v('pn-type'), date:v('pn-date'), titre:v('pn-titre'), participants:v('pn-part'), contenu:_htmlToMd(document.getElementById('pn-cr')), lien:v('pn-lien') };
  if(!o.date){ toast('Date requise',false); return; }
  if(o.lien && !/^https?:\/\//i.test(o.lien)){ toast('Le lien doit commencer par http:// ou https://',false); return; }
  const acts=_noteDraft.acts.filter(a=>(a.libelle||'').trim()), del=_noteDraft.del.slice();
  _noteDraft.acts.forEach(a=>{ if(!(a.libelle||'').trim() && a.id) del.push(a.id); });
  const f={ lcs_libelle:o.titre||o.type, lcs_type:o.type, lcs_date:o.date, lcs_participants:o.participants, lcs_contenu:o.contenu, lcs_lien:o.lien, lcs_client:'#'+cid };
  const btn=document.getElementById('pn-save'); btn.disabled=true;
  try{
    o.id=await _cliDv('lcs_note',id,f);
    for(const d of del) await _cliDvDel('lcs_noteaction',d);
    for(const a of acts){
      a.id=await _cliDv('lcs_noteaction',a.id,{ lcs_libelle:a.libelle.trim(), lcs_note:'#'+o.id, lcs_responsable:a.respId?_dvRef('agents',a.respId):'', lcs_echeance:a.echeance||'', lcs_fait:!!a.fait });
    }
  }catch(e){ console.error(e); toast('Enregistrement impossible',false); btn.disabled=false; return; }
  o.actions=acts.map(a=>({ id:a.id, libelle:a.libelle.trim(), respId:a.respId||'', respG:'', echeance:a.echeance||'', fait:!!a.fait }));
  const old=id&&_dvCli.notes.find(x=>x.id===id); if(old) Object.assign(old,o); else _dvCli.notes.push(o);
  _cli.open[o.id]=1; closePanel(); toast(id?'Entrée modifiée':'Entrée ajoutée'); renderClients();
}
async function delNote(id){
  if(!_cliCanEdit() || !confirm('Supprimer cette entrée et ses actions ?')) return;
  try{ await _cliDvDel('lcs_note',id); }catch(e){ console.error(e); toast('Suppression impossible',false); return; }
  _dvCli.notes=_dvCli.notes.filter(x=>x.id!==id); delete _cli.open[id];
  closePanel(); toast('Entrée supprimée'); renderClients();
}


