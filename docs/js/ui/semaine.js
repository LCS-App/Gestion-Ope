// Navigation semaine + sélecteur de date
/* ═══════════════════════════════════════
   SEMAINE
═══════════════════════════════════════ */
let weekStart=getMonday(new Date());

function changeWeek(d){
  weekStart=new Date(weekStart); weekStart.setDate(weekStart.getDate()+d*7);
  (currentView==='croise'?renderCroise:renderPlanning)();
}
function goCurrentWeek(){ weekStart=getMonday(new Date()); (currentView==='croise'?renderCroise:renderPlanning)(); }

let weekPickerMonth=null;
function closeWeekDatePicker(){
  const p=document.getElementById('week-date-popover'); if(p) p.remove();
  document.removeEventListener('click', closeWeekDatePicker);
}
function openWeekDatePicker(){
  closeWeekDatePicker();
  weekPickerMonth=new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  const anchor=document.querySelector('.week-picker-trigger');
  const r=anchor.getBoundingClientRect();
  const pop=document.createElement('div');
  pop.id='week-date-popover';
  pop.style.cssText=`position:fixed;top:${r.bottom+6}px;left:${r.left}px;background:var(--white);border:1px solid var(--border-strong);border-radius:var(--radius);box-shadow:var(--shadow-lg);z-index:2000;padding:12px;width:250px;font-size:12.5px;color:var(--text)`;
  pop.onclick=e=>e.stopPropagation();
  document.body.appendChild(pop);
  renderWeekDatePicker();
  setTimeout(()=>document.addEventListener('click', closeWeekDatePicker),0);
}
function shiftWeekPickerMonth(d){ weekPickerMonth.setMonth(weekPickerMonth.getMonth()+d); renderWeekDatePicker(); }
function pickWeekDate(y,m,d){
  weekStart=getMonday(new Date(y,m,d));
  (currentView==='croise'?renderCroise:renderPlanning)();
  closeWeekDatePicker();
}
function renderWeekDatePicker(){
  const pop=document.getElementById('week-date-popover'); if(!pop) return;
  const y=weekPickerMonth.getFullYear(), m=weekPickerMonth.getMonth();
  const first=new Date(y,m,1);
  const startDow=(first.getDay()+6)%7; // lundi=0
  const daysInMonth=new Date(y,m+1,0).getDate();
  const today=new Date(); today.setHours(0,0,0,0);
  const selMonday=weekStart, selSunday=new Date(weekStart); selSunday.setDate(selSunday.getDate()+6);
  let cells='';
  for(let i=0;i<startDow;i++) cells+=`<div></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const dt=new Date(y,m,d); dt.setHours(0,0,0,0);
    const inSelWeek = dt>=selMonday && dt<=selSunday;
    const isToday = dt.getTime()===today.getTime();
    const bg = inSelWeek ? 'var(--blue)' : 'transparent';
    const fw = inSelWeek ? '800' : (isToday?'700':'500');
    const bd = isToday && !inSelWeek ? '1px solid var(--border-strong)' : '1px solid transparent';
    cells+=`<div onclick="pickWeekDate(${y},${m},${d})" style="cursor:pointer;text-align:center;padding:5px 0;border-radius:7px;background:${bg};font-weight:${fw};border:${bd}">${d}</div>`;
  }
  const dowLabels=['L','M','M','J','V','S','D'];
  pop.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <button onclick="shiftWeekPickerMonth(-1)" style="border:1px solid var(--border);background:var(--white);border-radius:7px;width:24px;height:24px;cursor:pointer;color:var(--text)">‹</button>
      <div style="font-weight:700">${_cap(weekPickerMonth.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}))}</div>
      <button onclick="shiftWeekPickerMonth(1)" style="border:1px solid var(--border);background:var(--white);border-radius:7px;width:24px;height:24px;cursor:pointer;color:var(--text)">›</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:2px">
      ${dowLabels.map(l=>`<div style="text-align:center;color:var(--text2);font-size:11px;font-weight:600">${l}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">${cells}</div>
    <div style="margin-top:10px;text-align:center">
      <button onclick="goCurrentWeek();closeWeekDatePicker()" style="border:1px solid var(--border);background:var(--white);border-radius:7px;padding:5px 10px;cursor:pointer;font-size:11.5px;font-weight:600;color:var(--text)">Aujourd'hui</button>
    </div>`;
}

function updateWeekHeader(){
  const we=new Date(weekStart); we.setDate(we.getDate()+4);
  const wn=getWeekNum(weekStart);
  const isA=isWeekA(weekStart);
  document.getElementById('week-label-header').textContent=
    `Sem. ${wn} · ${weekStart.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${we.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;
}

