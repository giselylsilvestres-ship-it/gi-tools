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

  renderWeek=function(){
    const end=new Date(weekStart);end.setDate(end.getDate()+6);
    $('weekTitle').textContent=weekTitleLabel(weekStart,end);
    const nav=document.querySelector('.week-nav');if(nav)nav.style.display='flex';
    const today=key(new Date());
    const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    let html='';
    for(let i=0;i<7;i++){
      const d=new Date(weekStart);d.setDate(d.getDate()+i);
      const dk=key(d),p=plans.find(x=>x.plan_date===dk),ses=sessions.find(x=>x.session_date===dk),sh=sheetForPlannerDate(dk),done=!!ses?.completed,planned=!!p&&!done;
      const state=done?'done':planned?'planned':'';
      const label=done?'✓':d.getDate();
      const aria=done?`${names[i]}, ${d.getDate()}: treino concluído${sh?.name?`, ${sh.name}`:''}`:planned?`${names[i]}, ${d.getDate()}: ${sh?.name||'treino'} planejado`:`${names[i]}, ${d.getDate()}: planejar treino`;
      html+=`<button class="week-status-day ${state} ${dk===today?'today':''}" data-day="${dk}" aria-label="${esc(aria)}"><span class="week-dow">${names[i]}</span><span class="week-circle">${label}</span><span class="week-sheet">${sh?esc(sh.name):' '}</span></button>`;
    }
    const grid=$('weekGrid');grid.className='week-grid week-status-grid';grid.innerHTML=html;
    grid.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>plannerDayClick(b.dataset.day));
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

  function showTrainingStage(){
    const heading=document.querySelector('#sheetPicker .modal-head h2');if(heading)heading.textContent='Escolher treino';
    const available=trainings.filter(t=>sheets.some(s=>s.training_id===t.id));
    $('sheetOptions').innerHTML=available.length?available.map(t=>{
      const count=sheets.filter(s=>s.training_id===t.id).length;
      return `<button class="option" data-training-pick="${t.id}"><strong>${esc(t.name)}</strong><small>${count} ficha${count===1?'':'s'} ›</small></button>`;
    }).join(''):'<div class="meta">Crie um Treino e pelo menos uma Ficha primeiro.</div>';
    $('sheetOptions').querySelectorAll('[data-training-pick]').forEach(b=>b.onclick=()=>showSheetStage(b.dataset.trainingPick));
  }

  function showSheetStage(trainingId){
    const training=trainings.find(t=>t.id===trainingId),heading=document.querySelector('#sheetPicker .modal-head h2');if(heading)heading.textContent=training?.name||'Escolher ficha';
    const options=sheets.filter(s=>s.training_id===trainingId).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
    $('sheetOptions').innerHTML=`<button class="option picker-back" data-picker-back><strong>← Treinos</strong><small>voltar</small></button>`+(options.length?options.map(s=>`<button class="option" data-sheet-pick="${s.id}"><strong>${esc(s.name)}</strong><small>${s.routine_data?.exercises?.length??sheetLinks(s.id).length} exercícios</small></button>`).join(''):'<div class="meta">Esse treino ainda não tem fichas.</div>');
    $('sheetOptions').querySelector('[data-picker-back]')?.addEventListener('click',showTrainingStage);
    $('sheetOptions').querySelectorAll('[data-sheet-pick]').forEach(b=>b.onclick=()=>chooseSheet(b.dataset.sheetPick));
  }

  openPicker=function(){
    $('pickerDate').textContent=new Date(currentDate+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
    showTrainingStage();open('sheetPicker');
  };

  // The old monthly layer hides this nav. Re-enable it and ensure the original weekly handlers remain useful.
  const nav=document.querySelector('.week-nav');if(nav)nav.style.display='flex';
  setTimeout(()=>{const n=document.querySelector('.week-nav');if(n)n.style.display='flex';renderWeek()},0);
})();
