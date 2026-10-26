/* Weekly planning UX + training > sheet picker. Loaded after the legacy calendar layer. */
(()=>{
  const cap=s=>s?`${s.charAt(0).toUpperCase()}${s.slice(1)}`:s;
  const datePart=d=>`${d.getDate()} de ${cap(d.toLocaleDateString('pt-BR',{month:'long'}))}`;
  const weekTitleLabel=(start,end)=>start.getMonth()===end.getMonth()
    ? `${start.getDate()} de ${cap(start.toLocaleDateString('pt-BR',{month:'long'}))} - ${end.getDate()} de ${cap(end.toLocaleDateString('pt-BR',{month:'long'}))}`
    : `${datePart(start)} - ${datePart(end)}`;

  function sheetForPlannerDate(dk){
    const p=plans.find(x=>x.plan_date===dk),ses=sessions.find(x=>x.session_date===dk),sheetId=p?.sheet_id||ses?.sheet_id;
    return (sheetId?sheets.find(x=>x.id===sheetId):null)||(ses?.workout_data?{id:ses.sheet_id,name:ses.workout_data.name,training_id:ses.training_id}:null);
  }

  function workoutSetsForSession(ses){
    if(!ses)return 0;
    if(ses.workout_data?.version===3){
      return (ses.workout_data.exercises||[]).reduce((sum,e)=>sum+(e.sets||[]).reduce((n,s)=>n+(s.done?1:0)+(s.drops||[]).filter(d=>d.done).length,0),0);
    }
    return logs.filter(l=>l.session_id===ses.id&&l.completed).length;
  }

  function ensureWeekSummary(){
    let wrap=document.getElementById('weekSummary');
    if(wrap)return wrap;
    wrap=document.createElement('section');wrap.id='weekSummary';wrap.className='week-summary';
    $('weekGrid').insertAdjacentElement('afterend',wrap);
    return wrap;
  }

  function renderWeekSummary(){
    const wrap=ensureWeekSummary();
    let items=[];
    for(let i=0;i<7;i++){
      const d=new Date(weekStart);d.setDate(d.getDate()+i);
      const dk=key(d),p=plans.find(x=>x.plan_date===dk),ses=sessions.find(x=>x.session_date===dk),sh=sheetForPlannerDate(dk);
      if(!p&&!ses)continue;
      const tr=sh&&trainings.find(x=>x.id===sh.training_id),done=!!ses?.completed,sets=done?workoutSetsForSession(ses):0;
      items.push(`<button class="week-summary-row" data-summary-day="${dk}"><span class="summary-date">${cap(d.toLocaleDateString('pt-BR',{weekday:'long'}))}, ${d.getDate()} de ${cap(d.toLocaleDateString('pt-BR',{month:'long'}))}</span><span class="summary-main"><strong>${esc(sh?.name||ses?.workout_data?.name||'treino')}</strong><small>${esc((tr?.name||'').toLowerCase())}</small></span><span class="summary-status ${done?'done':'planned'}">${done?`${sets} série${sets===1?'':'s'} · concluído`:'planejado'}</span></button>`);
    }
    wrap.innerHTML=`<div class="week-summary-head"><strong>Treinos da semana</strong><small>${items.length?`${items.length} dia${items.length===1?'':'s'} com treino`:'Nenhum treino planejado'}</small></div>${items.length?`<div class="week-summary-list">${items.join('')}</div>`:'<div class="week-summary-empty">Planeje um treino tocando em uma das bolinhas acima.</div>'}`;
    wrap.querySelectorAll('[data-summary-day]').forEach(b=>b.onclick=()=>plannerDayClick(b.dataset.summaryDay));
  }

  renderWeek=function(){
    const end=new Date(weekStart);end.setDate(end.getDate()+6);
    const head=document.querySelector('.week-head');
    if(head){
      head.innerHTML=`<div class="week-range-line"><button id="prevWeekInline" class="week-inline-arrow" aria-label="Semana anterior">‹</button><h1 id="weekTitle">${weekTitleLabel(weekStart,end)}</h1><button id="nextWeekInline" class="week-inline-arrow" aria-label="Próxima semana">›</button></div>`;
      $('prevWeekInline').onclick=()=>{weekStart.setDate(weekStart.getDate()-7);renderWeek()};
      $('nextWeekInline').onclick=()=>{weekStart.setDate(weekStart.getDate()+7);renderWeek()};
    }
    const oldNav=document.querySelector('.week-nav');if(oldNav)oldNav.style.display='none';
    const today=key(new Date());
    const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    let html='';
    for(let i=0;i<7;i++){
      const d=new Date(weekStart);d.setDate(d.getDate()+i);
      const dk=key(d),p=plans.find(x=>x.plan_date===dk),ses=sessions.find(x=>x.session_date===dk),sh=sheetForPlannerDate(dk),done=!!ses?.completed,planned=!!p&&!done;
      const state=done?'done':planned?'planned':'';
      const label=done?'✓':d.getDate();
      const aria=done?`${names[i]}, ${d.getDate()}: treino concluído${sh?.name?`, ${sh.name}`:''}`:planned?`${names[i]}, ${d.getDate()}: ${sh?.name||'treino'} planejado`:`${names[i]}, ${d.getDate()}: planejar treino`;
      html+=`<button class="week-status-day ${state} ${dk===today?'today':''}" data-day="${dk}" aria-label="${esc(aria)}"><span class="week-dow">${names[i]}</span><span class="week-circle">${label}</span></button>`;
    }
    const grid=$('weekGrid');grid.className='week-grid week-status-grid';grid.innerHTML=html;
    grid.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>plannerDayClick(b.dataset.day));
    renderWeekSummary();
  };

  function plannerDayClick(dk){
    currentDate=dk;
    const sh=sheetForPlannerDate(dk),ses=sessions.find(x=>x.session_date===dk);
    if(sh||ses){currentSheet=sh||null;openSession();return}
    openPicker();
  }

  async function chooseSheet(sheetId){
    if(sessions.some(s=>s.session_date===currentDate)){
      alert('Já há um treino registrado neste dia. Abra o registro existente para preservar suas séries.');return;
    }
    const result=await sb.from('gym_plans').upsert({user_id:user.id,plan_date:currentDate,sheet_id:sheetId},{onConflict:'user_id,plan_date'});
    if(result.error){console.error(result.error);alert('Não consegui planejar. Tente novamente.');return}
    close('sheetPicker');await load();currentSheet=sheets.find(x=>x.id===sheetId);openSession();
  }

  function startFreeForSelectedDate(){
    const date=currentDate||key(new Date());
    if(sessions.some(s=>s.session_date===date))return toast('Já existe um treino nesse dia. Abra o treino para adicionar exercícios.');
    close('sheetPicker');
    pickExercises(items=>{
      if(!items?.length)return;
      currentDate=date;currentSheet=null;workoutDate=date;
      const w=Gym.start({version:3,name:'treino livre',exercises:items.map(e=>Gym.exercise({exerciseId:e.id,name:e.name,imageUrl:e.image_url}))});
      try{localStorage.setItem(`gica-gym-v3:${user.id}:${date}`,JSON.stringify({workout:w,revision:0,sheetId:null,trainingId:null}))}catch{return toast('Sem espaço neste aparelho.')}
      openSession();
    });
  }

  function showTrainingStage(){
    const heading=document.querySelector('#sheetPicker .modal-head h2');if(heading)heading.textContent='Escolher treino';
    const available=trainings.filter(t=>sheets.some(s=>s.training_id===t.id));
    const trainingOptions=available.map(t=>{
      const count=sheets.filter(s=>s.training_id===t.id).length;
      return `<button class="option" data-training-pick="${t.id}"><strong>${esc(t.name.toLowerCase())}</strong><small>${count} ficha${count===1?'':'s'} ›</small></button>`;
    }).join('');
    $('sheetOptions').innerHTML=trainingOptions+`<button class="option free-workout-option" data-free-workout><strong>treino livre</strong><small>escolher exercícios avulsos</small></button>`;
    $('sheetOptions').querySelectorAll('[data-training-pick]').forEach(b=>b.onclick=()=>showSheetStage(b.dataset.trainingPick));
    $('sheetOptions').querySelector('[data-free-workout]')?.addEventListener('click',startFreeForSelectedDate);
  }

  function showSheetStage(trainingId){
    const training=trainings.find(t=>t.id===trainingId),heading=document.querySelector('#sheetPicker .modal-head h2');if(heading)heading.textContent=(training?.name||'Escolher ficha').toLowerCase();
    const options=sheets.filter(s=>s.training_id===trainingId).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
    $('sheetOptions').innerHTML=`<button class="option picker-back" data-picker-back><strong>← treinos</strong><small>voltar</small></button>`+(options.length?options.map(s=>`<button class="option" data-sheet-pick="${s.id}"><strong>${esc(s.name)}</strong><small>${s.routine_data?.exercises?.length??sheetLinks(s.id).length} exercícios</small></button>`).join(''):'<div class="meta">Esse treino ainda não tem fichas.</div>');
    $('sheetOptions').querySelector('[data-picker-back]')?.addEventListener('click',showTrainingStage);
    $('sheetOptions').querySelectorAll('[data-sheet-pick]').forEach(b=>b.onclick=()=>chooseSheet(b.dataset.sheetPick));
  }

  openPicker=function(){
    $('pickerDate').textContent=new Date(currentDate+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
    showTrainingStage();open('sheetPicker');
  };

  setTimeout(()=>renderWeek(),0);
})();
