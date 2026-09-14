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

function ensureSessionActions(){
  const head=$('sessionModal')?.querySelector('.modal-head');
  if(!head||$('editDayWorkout'))return;
  const closeBtn=head.querySelector('.close');
  const actions=document.createElement('div');
  actions.className='detail-actions';
  actions.innerHTML=`<button id="editDayWorkout" class="icon-btn" aria-label="Editar ficha do dia" title="Editar ficha do dia">✎</button><button id="deleteDayWorkout" class="icon-btn danger-icon" aria-label="Excluir treino do dia" title="Excluir treino do dia"><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  head.appendChild(actions);if(closeBtn)actions.appendChild(closeBtn);
  $('editDayWorkout').onclick=()=>{close('sessionModal');openPicker()};
  $('deleteDayWorkout').onclick=async()=>{
    if(!currentDate)return;
    const ses=sessions.find(x=>x.session_date===currentDate&&x.sheet_id===currentSheet?.id);
    const hasHistory=ses&&logs.some(x=>x.session_id===ses.id);
    const label=new Date(currentDate+'T12:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long'});
    const msg=hasHistory?`Excluir o treino de ${label}? Isso também apaga as cargas e marcações registradas neste dia.`:`Excluir o treino planejado de ${label}?`;
    if(!confirm(msg))return;
    if(ses){await sb.from('gym_session_exercises').delete().eq('session_id',ses.id).eq('user_id',user.id);await sb.from('gym_sessions').delete().eq('id',ses.id).eq('user_id',user.id)}
    await sb.from('gym_plans').delete().eq('plan_date',currentDate).eq('user_id',user.id);
    close('sessionModal');await load();renderWeek();
  };
  if($('unplan'))$('unplan').style.display='none';
}

openSession=function(){
  let ses=sessions.find(x=>x.session_date===currentDate&&x.sheet_id===currentSheet.id),savedRows=ses?logs.filter(x=>x.session_id===ses.id).sort((a,b)=>a.sort_order-b.sort_order):[],base=savedRows.length?savedRows:sheetLinks(currentSheet.id).map(l=>{let e=catalog.find(x=>x.id===l.exercise_id),h=getExerciseHistory(l.exercise_id,ses?.id);return{exercise_id:l.exercise_id,exercise_name:e?.name||'',sets:l.sets,reps:l.reps,weight:h[0]?.weight??'',completed:false,image_url:e?.image_url}}),done=base.filter(x=>x.completed).length;
  $('sessionDate').textContent=new Date(currentDate+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});$('sessionTitle').textContent=currentSheet.name;$('sessionNotes').value=ses?.notes||'';
  $('sessionExercises').innerHTML=`<div class="session-progress"><div><strong><span id="sessionDoneCount">${done}</span> / ${base.length}</strong><span> exercícios</span></div><div class="progress-track"><i id="sessionProgressBar" style="width:${base.length?done/base.length*100:0}%"></i></div></div>`+base.map(r=>sessionExerciseCard(r,ses?.id)).join('');
  const updateProgress=()=>{let cards=[...$('sessionExercises').querySelectorAll('.workout-exercise')],n=cards.filter(c=>c.querySelector('.donebox').checked).length;$('sessionDoneCount').textContent=n;$('sessionProgressBar').style.width=(cards.length?n/cards.length*100:0)+'%'};
  $('sessionExercises').querySelectorAll('.workout-exercise').forEach(card=>{let summary=card.querySelector('.workout-summary'),box=card.querySelector('.donebox');summary.onclick=e=>{if(e.target===box)return;card.classList.toggle('expanded')};box.onchange=()=>{card.classList.toggle('is-done',box.checked);card.querySelector('.finish-exercise').textContent=box.checked?'✓ concluído':'concluir exercício';updateProgress()};card.querySelector('.finish-exercise').onclick=()=>{box.checked=!box.checked;box.dispatchEvent(new Event('change'));if(box.checked)card.classList.remove('expanded')};card.querySelectorAll('.load-step').forEach(btn=>btn.onclick=()=>{let input=card.querySelector('.weight'),v=Number(input.value||0)+Number(btn.dataset.step);input.value=Math.max(0,v)})});ensureSessionActions();open('sessionModal')
}

function wireMonthNav(){const nav=document.querySelector('.week-nav');if(nav)nav.style.display='none'}
wireMonthNav();setTimeout(()=>{wireMonthNav();renderWeek()},0);
