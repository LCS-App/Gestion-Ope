// Vue historique
/* ═══════════════════════════════════════
   HISTORIQUE
═══════════════════════════════════════ */
function renderHistorique(){
  const r=gr().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const empty=document.getElementById('histo-empty');
  const tbody=document.getElementById('histo-tbody');
  if(!r.length){ empty.style.display='block'; tbody.innerHTML=''; return; }
  empty.style.display='none';
  tbody.innerHTML=r.map(x=>`<tr>
    <td>${fmtDate(x.date)}</td>
    <td>${siteNom(x.siteId)}</td>
    <td>${_escH(agentNom(x.agentAbsentId))}</td>
    <td>${_escH(agentNom(x.remplacantId))}</td>
    <td><span class="badge badge-green">Confirmé</span></td>
  </tr>`).join('');
}

