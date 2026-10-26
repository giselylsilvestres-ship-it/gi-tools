/* Session-level controls for completed workouts. Loaded after workout.js. */
(()=>{
  const modal=document.getElementById('sessionModal');
  const head=modal?.querySelector('.modal-head');
  if(!head)return;

  const closeBtn=head.querySelector('.close');
  const actions=document.createElement('div');
  actions.className='session-head-actions';
  actions.innerHTML=`
    <button id="editWorkoutRecord" class="icon-btn session-record-action" aria-label="Editar registro" title="Editar registro" hidden>✎</button>
    <button id="deleteWorkoutRecord" class="icon-btn danger-icon session-record-action" aria-label="Excluir treino realizado" title="Excluir treino realizado" hidden>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;
  head.appendChild(actions);
  if(closeBtn)actions.appendChild(closeBtn);

  const editBtn=document.getElementById('editWorkoutRecord');
  const deleteBtn=document.getElementById('deleteWorkoutRecord');
  const originalRender=window.renderWorkout;
  window.renderWorkout=function(){
    const result=originalRender.apply(this,arguments);
    const recorded=!!sessions.find(s=>s.session_date===workoutDate);
    const finished=activeWorkout?.status==='finished';
    editBtn.hidden=!finished;
    deleteBtn.hidden=!recorded;
    return result;
  };

  editBtn.onclick=()=>{
    if(activeWorkout?.status!=='finished')return;
    activeWorkout.status='active';
    activeWorkout.editingFinished=true;
    changed(true);
  };

  deleteBtn.onclick=async()=>{
    const session=sessions.find(s=>s.session_date===workoutDate);
    if(!session)return;
    const label=activeWorkout?.name||'este treino';
    if(!confirm(`Excluir ${label} de ${new Date(workoutDate+'T12:00').toLocaleDateString('pt-BR')}? As séries registradas neste treino serão apagadas. A ficha original continua intacta.`))return;
    deleteBtn.disabled=true;
    try{
      // gym_session_exercises has ON DELETE CASCADE from gym_sessions.
      const removed=await sb.from('gym_sessions').delete().eq('id',session.id).eq('user_id',user.id);
      if(removed.error)throw removed.error;
      // Free the day as well, so another/correct sheet can be scheduled immediately.
      const unplanned=await sb.from('gym_plans').delete().eq('user_id',user.id).eq('plan_date',workoutDate);
      if(unplanned.error)throw unplanned.error;
      try{localStorage.removeItem(`gica-gym-v3:${user.id}:${workoutDate}`);localStorage.removeItem(`gica-gym-v3:${user.id}:${workoutDate}:recovery`)}catch{}
      close('sessionModal');
      activeWorkout=null;activeRevision=0;workoutSheet=null;workoutTraining=null;
      await load();
      renderWeek();renderMetrics();renderHistory();
      toast('Treino excluído. O dia está livre para você marcar a ficha certa.');
    }catch(error){
      console.error(error);
      alert('Não consegui excluir esse treino. Nada mais foi alterado.');
    }finally{deleteBtn.disabled=false}
  };

  // Match the compact send control used by Escrita diária: save-and-exit becomes a round arrow button.
  const saveExit=document.getElementById('unplan');
  if(saveExit){saveExit.classList.add('session-save-exit');saveExit.innerHTML='<span aria-hidden="true">↑</span>';saveExit.setAttribute('aria-label','Salvar e sair');saveExit.title='Salvar e sair'}
})();