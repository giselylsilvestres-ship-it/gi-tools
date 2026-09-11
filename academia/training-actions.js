(()=>{
  const modal=document.getElementById('trainingModal');
  const head=modal?.querySelector('.modal-head');
  if(!head)return;

  const closeBtn=head.querySelector('.close');
  const actions=document.createElement('div');
  actions.className='detail-actions';
  actions.innerHTML=`
    <button id="editTraining" class="icon-btn" aria-label="Editar treino" title="Editar treino">✎</button>
    <button id="deleteTraining" class="icon-btn danger-icon" aria-label="Excluir treino" title="Excluir treino">
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;
  head.appendChild(actions);
  if(closeBtn)actions.appendChild(closeBtn);

  document.getElementById('editTraining').onclick=()=>{
    if(!currentTraining)return;
    const training=currentTraining;
    close('trainingModal');
    form('treino','Editar treino',`<label class="field"><span>nome</span><input id="fName" value="${esc(training.name||'')}" placeholder="ex.: PPL"></label>`,async()=>{
      const name=document.getElementById('fName').value.trim();
      if(!name)return;
      const r=await sb.from('gym_trainings').update({name}).eq('id',training.id).eq('user_id',user.id);
      if(r.error){console.error(r.error);return alert('Não consegui editar o treino.');}
      close('formModal');
      await load();
      renderTrainings();
    });
  };

  document.getElementById('deleteTraining').onclick=async()=>{
    if(!currentTraining)return;
    const training=currentTraining;
    const sheetCount=sheets.filter(s=>s.training_id===training.id).length;
    if(!confirm(`Excluir ${training.name}? ${sheetCount?`As ${sheetCount} ficha(s) deste treino também serão removidas. `:''}O histórico das sessões será preservado.`))return;
    const r=await sb.from('gym_trainings').delete().eq('id',training.id).eq('user_id',user.id);
    if(r.error){console.error(r.error);return alert('Não consegui excluir o treino.');}
    close('trainingModal');
    currentTraining=null;
    await load();
    renderTrainings();
  };
})();
