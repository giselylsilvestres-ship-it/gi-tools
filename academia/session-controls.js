/* Session-level controls for completed workouts. Loaded after workout.js. */
(()=>{
  const modal=document.getElementById('sessionModal');
  const head=modal?.querySelector('.modal-head');
  const card=modal?.querySelector('.modal-card');
  if(!head||!card)return;

  const closeBtn=head.querySelector('.close');
  const actions=document.createElement('div');
  actions.className='session-head-actions';
  actions.innerHTML=`
    <button id="editWorkoutSheet" class="icon-btn" aria-label="Editar ficha" title="Editar ficha">✎</button>
    <button id="changeWorkoutSheet" class="soft" aria-label="Trocar ficha">Trocar ficha</button>
    <button id="deleteWorkoutRecord" class="icon-btn danger-icon session-record-action" aria-label="Excluir treino realizado" title="Excluir treino realizado" hidden>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;
  head.appendChild(actions);
  if(closeBtn)actions.appendChild(closeBtn);

  const deleteBtn=document.getElementById('deleteWorkoutRecord');

  function currentElapsed(){
    if(!activeWorkout)return 0;
    if(activeWorkout.startedAt)return Math.max(0,Math.floor((Date.now()-Date.parse(activeWorkout.startedAt))/1000));
    return Math.max(0,Number(activeWorkout.elapsedSeconds)||0);
  }

  function paintTimerButton(){
    const btn=document.getElementById('workoutTimerToggle');
    if(!btn||!activeWorkout)return;
    const running=activeWorkout.status==='active'&&!!activeWorkout.startedAt;
    btn.classList.toggle('running',running);
    btn.setAttribute('aria-label',running?'Pausar duração':'Retomar duração');
    btn.title=running?'Pausar duração':'Retomar duração';
    btn.disabled=activeWorkout.status!=='active';
  }

  function toggleWorkoutTimer(){
    if(!activeWorkout||activeWorkout.status!=='active')return;
    if(activeWorkout.startedAt){
      activeWorkout.elapsedSeconds=currentElapsed();
      activeWorkout.startedAt=null;
      activeWorkout.timerPaused=true;
    }else{
      const elapsed=Math.max(0,Number(activeWorkout.elapsedSeconds)||0);
      activeWorkout.startedAt=new Date(Date.now()-elapsed*1000).toISOString();
      activeWorkout.timerPaused=false;
    }
    changed();
    tickWorkout();
    paintTimerButton();
  }

  function syncStickyOffsets(){
    const dashboard=document.querySelector('#sessionExercises>.workout-dashboard');
    const progress=document.querySelector('#sessionExercises>.progress-track');
    if(!dashboard)return;
    requestAnimationFrame(()=>{
      const headHeight=Math.ceil(head.getBoundingClientRect().height);
      const dashHeight=Math.ceil(dashboard.getBoundingClientRect().height);
      card.style.setProperty('--session-head-height',`${headHeight}px`);
      card.style.setProperty('--workout-dashboard-height',`${dashHeight}px`);
      if(progress)progress.style.visibility='visible';
    });
  }

  function ensureImageViewer(){
    let viewer=document.getElementById('exerciseImageViewer');
    if(viewer)return viewer;
    viewer=document.createElement('div');
    viewer.id='exerciseImageViewer';
    viewer.className='exercise-image-viewer';
    viewer.hidden=true;
    viewer.innerHTML=`<div class="exercise-image-viewer-backdrop"></div><section class="exercise-image-viewer-card" role="dialog" aria-modal="true" aria-labelledby="exerciseImageViewerTitle"><button class="exercise-image-viewer-close" type="button" aria-label="Fechar imagem">×</button><div class="exercise-image-viewer-frame"><img alt=""></div><div id="exerciseImageViewerTitle" class="exercise-image-viewer-title"></div></section>`;
    document.body.appendChild(viewer);
    viewer.querySelector('.exercise-image-viewer-close').onclick=()=>{viewer.hidden=true};
    viewer.querySelector('.exercise-image-viewer-backdrop').onclick=()=>{viewer.hidden=true};
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!viewer.hidden){viewer.hidden=true;event.stopPropagation()}});
    return viewer;
  }

  function openExerciseImage(img,title){
    const viewer=ensureImageViewer();
    const large=viewer.querySelector('img');
    large.src=img.src;
    large.alt=title||img.alt||'Exercício';
    viewer.querySelector('.exercise-image-viewer-title').textContent=title||'';
    viewer.hidden=false;
    viewer.querySelector('.exercise-image-viewer-close').focus();
  }

  function enhanceWorkoutDom(){
    const duration=document.getElementById('workoutDuration');
    if(duration&&activeWorkout){
      const cell=duration.parentElement;
      if(!cell.querySelector('.workout-duration-row')){
        const row=document.createElement('div');
        row.className='workout-duration-row';
        duration.before(row);
        row.appendChild(duration);
        const btn=document.createElement('button');
        btn.id='workoutTimerToggle';
        btn.type='button';
        btn.className='workout-timer-toggle';
        btn.innerHTML='<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7.3v9.4L17 12 9 7.3Z"></path></svg><svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7v10M15 7v10"></path></svg>';
        btn.onclick=toggleWorkoutTimer;
        row.appendChild(btn);
      }
      paintTimerButton();
    }

    document.querySelectorAll('#sessionExercises img.lift-thumb').forEach(img=>{
      if(img.dataset.viewerBound)return;
      img.dataset.viewerBound='1';
      img.tabIndex=0;
      img.setAttribute('role','button');
      const title=img.closest('.lift-card')?.querySelector('h3')?.textContent||'';
      img.setAttribute('aria-label',`Ampliar imagem de ${title||'exercício'}`);
      img.onclick=event=>{event.stopPropagation();openExerciseImage(img,title)};
      img.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openExerciseImage(img,title)}};
    });

    syncStickyOffsets();
  }

  const originalRender=window.renderWorkout;
  window.renderWorkout=function(){
    const result=originalRender.apply(this,arguments);
    const recorded=!!sessions.find(s=>s.session_date===workoutDate);
    deleteBtn.hidden=false;
    deleteBtn.setAttribute('aria-label',recorded?'Excluir treino realizado':'Excluir agendamento');
    $('editWorkoutSheet').hidden=!sheets.some(s=>s.id===workoutSheet);
    $('changeWorkoutSheet').hidden=activeWorkout?.status!=='active'||!!Gym.stats(activeWorkout).steps;
    enhanceWorkoutDom();
    return result;
  };

  new ResizeObserver(syncStickyOffsets).observe(head);
  window.addEventListener('resize',syncStickyOffsets);

  // If the workout is paused, finishing must preserve accumulated duration instead of resetting it to zero.
  document.getElementById('saveSession')?.addEventListener('click',()=>{
    if(activeWorkout?.status==='active'&&!activeWorkout.startedAt){
      const elapsed=Math.max(0,Number(activeWorkout.elapsedSeconds)||0);
      activeWorkout.startedAt=new Date(Date.now()-elapsed*1000).toISOString();
      activeWorkout.timerPaused=false;
    }
  },true);

  $('editWorkoutSheet').onclick=()=>{if(workoutSheet)openSheet(workoutSheet)};

  async function removeDayWorkout(ask=true){
    if(deletingWorkout)return false;
    if(savingWorkout||finishingWorkout){toast('Espere terminar de salvar e tente novamente.');return false;}
    const date=workoutDate,session=sessions.find(s=>s.session_date===date);
    const label=activeWorkout?.name||'este treino';
    if(ask&&!confirm(`Excluir ${label} de ${new Date(date+'T12:00').toLocaleDateString('pt-BR')}? Ele sairá do calendário e da lista da semana. As séries desse dia serão apagadas. A ficha original será preservada.`))return false;
    deletingWorkout=true;deleteBtn.disabled=true;clearTimeout(saveTimer);pendingSave=false;
    try{
      // Query by date as well: this includes sessions saved since the modal opened.
      const removed=await sb.from('gym_sessions').delete().eq('session_date',date).eq('user_id',user.id);
      if(removed.error)throw removed.error;
      const unplanned=await sb.from('gym_plans').delete().eq('user_id',user.id).eq('plan_date',date);
      if(unplanned.error)throw unplanned.error;
      try{localStorage.removeItem(`gica-gym-v3:${user.id}:${date}`);localStorage.removeItem(`gica-gym-v3:${user.id}:${date}:recovery`)}catch{}
      close('sessionModal');activeWorkout=null;activeRevision=0;workoutSheet=null;workoutTraining=null;currentSheet=null;
      await load();renderWeek();renderMetrics();renderHistory();
      return true;
    }catch(error){console.error(error);alert('Não consegui concluir a exclusão. Atualize a página e tente novamente.');return false;}
    finally{deletingWorkout=false;deleteBtn.disabled=false;}
  }
  deleteBtn.onclick=async()=>{if(await removeDayWorkout())toast('Treino removido do calendário e da lista da semana.');};
  $('changeWorkoutSheet').onclick=async()=>{
    if(activeWorkout?.status!=='active'||Gym.stats(activeWorkout).steps)return;
    const date=workoutDate;
    if(!confirm('Trocar a ficha planejada para este dia?'))return;
    if(await removeDayWorkout(false)){currentDate=date;openPicker();}
  };

  const saveExit=document.getElementById('unplan');
  if(saveExit)saveExit.hidden=true;
})();
