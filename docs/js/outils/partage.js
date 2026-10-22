// Liens de consultation agents
/* ═══════════════════════════════════════
   PARTAGE AUX AGENTS (lien de consultation)
═══════════════════════════════════════ */
const PART = { weeks:4, msg:'' };
const _ST_IDX = { present:0, remplacement:1, absent:2, remplace:3 };

function partBaseUrl(){
  const base = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/,'');
  return base + 'partage.html';
}
function _b64url(str){
  const bytes = new TextEncoder().encode(str);
  let s=''; bytes.forEach(c=>s+=String.fromCharCode(c));
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function partRange(){
  const m = getMonday(new Date());
  return { start:_ymd(m), end:_ymd(_addDays(m, PART.weeks*7-1)) };
}
function partLink(agentId){
  const { start, end } = partRange();
  const days = computeAgentDays(agentId, start, end);
  const d0 = new Date(start+'T00:00:00');
  const sites=[], idx={}, sh=[];
  days.forEach(d=>{
    const off = Math.round((new Date(d.dateStr+'T00:00:00') - d0)/86400000);
    d.shifts.forEach(s=>{
      if(idx[s.site]===undefined){
        const site = gs().find(x=>x.nom===s.site);
        idx[s.site]=sites.length;
        sites.push([s.site, (site&&site.adresse)?site.adresse:'']);
      }
      const row=[off, idx[s.site], s.debut.replace(':',''), s.fin.replace(':',''), _ST_IDX[s.status]||0];
      if(s.status==='present' && s.note) row.push(s.note);
      sh.push(row);
    });
  });
  const arr=[2, agentNom(agentId), _ymd(new Date()).replace(/-/g,''), start.replace(/-/g,''), end.replace(/-/g,''), sites, sh, PART.msg||''];
  return { url: partBaseUrl()+'#p='+_b64url(JSON.stringify(arr)), shifts:sh.length, days:days.length, start, end };
}
function partSetWeeks(v){ PART.weeks=parseInt(v,10)||4; renderPartage(); }
function partSetMsg(v){ PART.msg=(v||'').trim(); renderPartage(); }

function partCopy(agentId){ copyToClipboard(partLink(agentId).url); }
function partOpen(agentId){ window.open(partLink(agentId).url, '_blank'); }
function partMail(agentId){
  const ag = ga().find(a=>a.id===agentId); if(!ag) return;
  const L = partLink(agentId);
  const per = `${fmtDate(L.start)} au ${fmtDate(L.end)}`;
  const body = `Bonjour,\n\nVoici votre planning du ${per} :\n${L.url}\n\nCe lien reste consultable à tout moment, depuis un téléphone ou un ordinateur, et peut être imprimé.`
    + (PART.msg ? `\n\n${PART.msg}` : '')
    + `\n\nLa Conciergerie Solidaire`;
  const href = `mailto:${encodeURIComponent(ag.email||'')}?subject=${encodeURIComponent('Votre planning — '+per)}&body=${encodeURIComponent(body)}`;
  if(href.length > 8000){ toast('Lien trop long pour un mail — réduisez la période', false); return; }
  window.location.href = href;
}
function partCsv(){
  const rows=[['Agent','Email','Créneaux','Lien']];
  partAgents().forEach(a=>{ const L=partLink(a.id); rows.push([a.nom, a.email||'', L.shifts, L.url]); });
  if(rows.length<2){ toast('Aucun agent à exporter', false); return; }
  downloadCSV('liens-planning.csv', rows);
}
function partAgents(){
  const withAffec=new Set(gaf().map(a=>a.agentId));
  gab().forEach(ab=>{ if(ab.remplacantId) withAffec.add(ab.remplacantId); });
  return ga().filter(a=>!a.inactif && withAffec.has(a.id)).sort((a,b)=>a.nom.localeCompare(b.nom));
}

function renderPartage(){
  const host=document.getElementById('partage-list'); if(!host) return;
  const q=(document.getElementById('search-partage')?.value||'').toLowerCase();
  const { start, end } = partRange();
  const all=partAgents();
  const list=all.filter(a=>!q || a.nom.toLowerCase().includes(q));
  const sub=document.getElementById('partage-sub');
  if(sub) sub.textContent = `Période partagée : ${fmtDate(start)} → ${fmtDate(end)} · ${all.length} agent${all.length>1?'s':''}`;
  if(!list.length){ host.innerHTML=`<div style="padding:30px;text-align:center;color:var(--text3);font-size:13px">Aucun agent ne correspond.</div>`; return; }
  host.innerHTML = list.map(a=>{
    const L=partLink(a.id);
    const mailOk=!!(a.email||'').trim();
    const meta = L.shifts
      ? `${L.shifts} créneau${L.shifts>1?'x':''} · ${L.days} jour${L.days>1?'s':''}`
      : 'Aucun créneau sur la période';
    return `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);margin-bottom:8px">
      <div style="flex:1;min-width:180px">
        <div style="font-size:14px;font-weight:700">${_escH(a.nom)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${meta}${mailOk?' · '+_escH(a.email):' · <span style="color:var(--red)">pas d\'email</span>'}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="partCopy('${a.id}')">Copier le lien</button>
        <button class="btn btn-secondary btn-sm" onclick="partOpen('${a.id}')">Aperçu</button>
        <button class="btn btn-primary btn-sm" onclick="partMail('${a.id}')" ${mailOk?'':'disabled style="opacity:.45"'}>Envoyer par mail</button>
      </div>
    </div>`;
  }).join('');
}

