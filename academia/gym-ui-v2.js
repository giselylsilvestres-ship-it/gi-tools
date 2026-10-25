/* Academia v2: calendar-first planning + compact expandable workout session */
let calendarMonth=new Date();calendarMonth.setDate(1);calendarMonth.setHours(12,0,0,0);

function monthLabel(d){const month=d.toLocaleDateString('pt-BR',{month:'long'});return `${month.charAt(0).toUpperCase()+month.slice(1)} de ${d.getFullYear()}`}
function todayPlan(){let k=key(new Date()),p=plans.find(x=>x.plan_date===k),ses=sessions.find(x=>x.session_date===k),sheetId=p?.sheet_id||ses?.sheet_id,sh=(sheetId&&sheets.find(x=>x.id===sheetId))||(ses?.workout_data?{id:ses.sheet_id,name:ses.workout_data.name,training_id:ses.training_id}:null),tr=sh&&trainings.find(x=>x.id===sh.training_id);return{k,p,sh,tr,ses}}
function sessionCountForSheet(id){const sh=sheets.find(s=>s.id===id);return sh?.routine_data?.exercises?.length??sheetLinks(id).length}
function sheetForDate(dk){const p=plans.find(x=>x.plan_date===dk),ses=sessions.find(x=>x.session_date===dk),sheetId=p?.sheet_id||ses?.sheet_id;return (sheetId?sheets.find(x=>x.id===sheetId):null)||(ses?.workout_data?{id:ses.sheet_id,name:ses.workout_data.name,training_id:ses.training_id}:null)}

renderWeek=function(){
  const {k,sh,tr,ses}=todayPlan(),hero=$('todayWorkout');
  if(hero){hero.innerHTML=sh?`<button class="today-workout ${ses?.completed?'completed':''}" data-today-session><span class="today-kicker">hoje ${ses?.completed?'· concluído ✓':''}</span><strong>${esc(sh.name)}</strong><span>${sessionCountForSheet(sh.id)} exercícios · ${esc(tr?.name||'')}</span><b>${ses?.completed?'Ver treino':ses?.workout_data?'Continuar treino':'Começar treino'} →</b></button>`:`<button class="today-workout empty" data-today-plan><span class="today-kicker">hoje</span><strong>Sem treino planejado</strong><span>Escolha uma ficha para hoje</span><b>planejar →</b></button>`;hero.querySelector('[data-today-session]')?.addEventListener('click',()=>{currentDate=k;currentSheet=sh;openSession()});hero.querySelector('[data-today-plan]')?.addEventListener('click',()=>{currentDate=k;openPicker()})}
  $('weekTitle').textContent=monthLabel(calendarMonth);
  const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),first=new Date(y,m,1,12),last=new Date(y,m+1,0,12),offset=first.getDay(),total=Math.ceil((offset+last.getDate())/7)*7,start=new Date(y,m,1-offset,12),today=key(new Date());
  let daysHtml='';
  for(let i=0;i<total;i++){
    let d=new Date(start);d.setDate(start.getDate()+i);let dk=key(d),outside=d.getMonth()!==m,s=sheetForDate(dk),t=s&&trainings.find(x=>x.id===s.training_id),daySession=sessions.find(x=>x.session_date===dk),done=daySession?.completed;
    daysHtml+=`<button class="month-day ${outside?'outside':''} ${dk===today?'today':''} ${done?'done':''} ${s?'has-workout':''}" data-day="${dk}" aria-label="${s?`Abrir ${esc(s.name)}`:'Planejar treino'}"><span class="month-date">${d.getDate()}</span>${s?`<span class="month-sheet">${done?'✓ ':''}${esc(s.name)}</span><span class="month-training">${esc(t?.name||'')}</span>`:''}</button>`;
  }
  $('weekGrid').innerHTML=`<div class="cal-weekdays">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-shell"><div class="month-days">${daysHtml}</div><button class="month-arrow prev" type="button" aria-label="Mês anterior">‹</button><button class="month-arrow next" type="button" aria-label="Próximo mês">›</button></div>`;
  $('weekGrid').querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openCalendarDay(b.dataset.day));
  $('weekGrid').querySelector('.month-arrow.prev').onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderWeek()};
  $('weekGrid').querySelector('.month-arrow.next').onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderWeek()};
}

function openCalendarDay(dk){
  currentDate=dk;
  const sh=sheetForDate(dk);
  if(sh){currentSheet=sh;openSession();return}
  openPicker();
}

function wireMonthNav(){const nav=document.querySelector('.week-nav');if(nav)nav.style.display='none'}
wireMonthNav();setTimeout(()=>{wireMonthNav();renderWeek()},0);
