/* Academia v2: calendar-first planning + compact expandable workout session */
let calendarMonth=new Date();calendarMonth.setDate(1);calendarMonth.setHours(12,0,0,0);

function monthLabel(d){const month=d.toLocaleDateString('pt-BR',{month:'long'});return `${month.charAt(0).toUpperCase()+month.slice(1)} de ${d.getFullYear()}`}
function todayPlan(){let k=key(new Date()),p=plans.find(x=>x.plan_date===k),ses=sessions.find(x=>x.session_date===k),sheetId=p?.sheet_id||ses?.sheet_id,sh=sheetId&&sheets.find(x=>x.id===sheetId),tr=sh&&trainings.find(x=>x.id===sh.training_id);return{k,p,sh,tr,ses}}
function sessionCountForSheet(id){return sheetLinks(id).length}
function sheetForDate(dk){const p=plans.find(x=>x.plan_date===dk),ses=sessions.find(x=>x.session_date===dk),sheetId=p?.sheet_id||ses?.sheet_id;return sheetId?sheets.find(x=>x.id===sheetId):null}

renderWeek=function(){
  const {k,sh,tr,ses}=todayPlan(),hero=$('todayWorkout');
  if(hero){hero.innerHTML=sh?`<button class="today-workout ${ses?.completed?'completed':''}" data-today-session><span class="today-kicker">hoje ${ses?.completed?'· concluído ✓':''}</span><strong>${esc(sh.name)}</strong><span>${sessionCountForSheet(sh.id)} exercícios · ${esc(tr?.name||'')}</span><b>${ses?.completed?'ver treino':'abrir ficha'} →</b></button>`:`<button class="today-workout empty" data-today-plan><span class="today-kicker">hoje</span><strong>Sem treino planejado</strong><span>Escolha uma ficha para hoje</span><b>planejar →</b></button>`;hero.querySelector('[data-today-session]')?.addEventListener('click',()=>{currentDate=k;currentSheet=sh;openSession()});hero.querySelector('[data-today-plan]')?.addEventListener('click',()=>{currentDate=k;openPicker()})}
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

function getExerciseHistory(exerciseId,currentSessionId){return logs.filter(x=>x.exercise_id===exerciseId&&x.weight!=null&&(!currentSessionId||x.session_id!==currentSessionId)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))}
function sessionExerciseCard(r,currentSessionId){let e=catalog.find(x=>x.id===r.exercise_id),img=e?.image_url||r.image_url,h=getExerciseHistory(r.exercise_id,currentSessionId),last=h.length?Number(h[0].weight):null,best=h.length?Math.max(...h.map(x=>Number(x.weight))):null,weight=r.weight??last??'';return`<article class="workout-exercise ${r.completed?'is-done':''}" data-ex="${r.exercise_id}" data-name="${esc(r.exercise_name)}" data-sets="${r.sets}" data-reps="${esc(r.reps)}"><button class="workout-summary" type="button"><input class="donebox" type="checkbox" ${r.completed?'checked':''} aria-label="Concluir exercício"><span class="workout-thumb">${img?`<img src="${esc(img)}" alt="">`:'⌁'}</span><span class="workout-copy"><strong>${esc(r.exercise_name)}</strong><small>${r.sets} × ${esc(r.reps)}${last!=null?` · última ${fmtKg(last)}`:''}</small></span><span class="chevron">⌄</span></button><div class="workout-detail"><div class="workout-prescription"><span><b>${r.sets} × ${esc(r.reps)}</b><small>prescrição</small></span><span><b>${fmtKg(last)}</b><small>última</small></span><span><b>${fmtKg(best)}</b><small>melhor</small></span></div><div class="today-load"><label>carga de hoje</label><div><button type="button" class="load-step" data-step="-0.5">−</button><input class="weight" type="number" step="0.5" value="${weight}" placeholder="—"><span>kg</span><button type="button" class="load-step" data-step="0.5">+</button></div></div>${img?`<div class="movement-image"><img src="${esc(img)}" alt="${esc(r.exercise_name)}"></div>`:''}<button type="button" class="finish-exercise">${r.completed?'✓ concluído':'concluir exercício'}</button></div></article>`}

openSession=function(){
  let ses=sessions.find(x=>x.session_date===currentDate&&x.sheet_id===currentSheet.id),base=ses?logs.filter(x=>x.session_id===ses.id).sort((a,b)=>a.sort_order-b.sort_order):sheetLinks(currentSheet.id).map(l=>{let e=catalog.find(x=>x.id===l.exercise_id),h=getExerciseHistory(l.exercise_id);return{exercise_id:l.exercise_id,exercise_name:e?.name||'',sets:l.sets,reps:l.reps,weight:h[0]?.weight??'',completed:false,image_url:e?.image_url}}),done=base.filter(x=>x.completed).length;
  $('sessionDate').textContent=new Date(currentDate+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});$('sessionTitle').textContent=currentSheet.name;$('sessionNotes').value=ses?.notes||'';
  $('sessionExercises').innerHTML=`<div class="session-progress"><div><strong><span id="sessionDoneCount">${done}</span> / ${base.length}</strong><span> exercícios</span></div><div class="progress-track"><i id="sessionProgressBar" style="width:${base.length?done/base.length*100:0}%"></i></div></div>`+base.map(r=>sessionExerciseCard(r,ses?.id)).join('');
  const updateProgress=()=>{let cards=[...$('sessionExercises').querySelectorAll('.workout-exercise')],n=cards.filter(c=>c.querySelector('.donebox').checked).length;$('sessionDoneCount').textContent=n;$('sessionProgressBar').style.width=(cards.length?n/cards.length*100:0)+'%'};
  $('sessionExercises').querySelectorAll('.workout-exercise').forEach(card=>{let summary=card.querySelector('.workout-summary'),box=card.querySelector('.donebox');summary.onclick=e=>{if(e.target===box)return;card.classList.toggle('expanded')};box.onchange=()=>{card.classList.toggle('is-done',box.checked);card.querySelector('.finish-exercise').textContent=box.checked?'✓ concluído':'concluir exercício';updateProgress()};card.querySelector('.finish-exercise').onclick=()=>{box.checked=!box.checked;box.dispatchEvent(new Event('change'));if(box.checked)card.classList.remove('expanded')};card.querySelectorAll('.load-step').forEach(btn=>btn.onclick=()=>{let input=card.querySelector('.weight'),v=Number(input.value||0)+Number(btn.dataset.step);input.value=Math.max(0,v)})});open('sessionModal')
}

function wireMonthNav(){const nav=document.querySelector('.week-nav');if(nav)nav.style.display='none'}
wireMonthNav();setTimeout(()=>{wireMonthNav();renderWeek()},0);
