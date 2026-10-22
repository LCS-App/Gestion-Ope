// Constantes jours, formats de date, toast, fillSel
/* ═══════════════════════════════════════
   UTILS
═══════════════════════════════════════ */
const JOURS=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const JOURS_FULL=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

function fmtDate(d){ if(!d) return ''; return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}); }
function siteNom(id){ return gs().find(s=>s.id===id)?.nom||'—'; }
function agentNom(id){ return ga().find(a=>a.id===id)?.nom||'—'; }

function getMonday(date){
  const d=new Date(date); const day=d.getDay();
  d.setDate(d.getDate()-day+(day===0?-6:1)); d.setHours(0,0,0,0); return d;
}
function getWeekNum(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const dn=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-dn);
  const ys=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-ys)/86400000)+1)/7);
}
function isWeekA(date){ return getWeekNum(date)%2===1; }

function toast(msg,ok=true){
  const t=document.getElementById('toast');
  t.textContent=(ok?'✓ ':'✕ ')+msg;
  t.style.background=ok?'#0D0D0D':'var(--red)';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}

function fillSel(id,items,ph=''){
  const el=document.getElementById(id); if(!el) return;
  el.innerHTML=ph?`<option value="">— ${_escH(ph)} —`:'';
  items.forEach(i=>el.innerHTML+=`<option value="${_escA(i.v)}">${_escH(String(i.l))}`);
}

