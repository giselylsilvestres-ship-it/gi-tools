/* Academia v3: routines, set-level logging, dropsets, supersets and recovery. */
let activeWorkout=null,activeRevision=0,workoutDate=null,workoutSheet=null,workoutTraining=null;
let saveTimer,savingWorkout=false,pendingSave=false,workoutConflict=false,editRoutine=null,saveState='',finishingWorkout=false,savingRoutine=false,deletingWorkout=false;
const clone=Gym.copy;
const timeLabel=seconds=>`${Math.floor(Math.max(0,seconds)/60)}:${String(Math.floor(Math.max(0,seconds)%60)).padStart(2,'0')}`;
const numericLabel=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(n);
const draftKey=()=>`gica-gym-v3:${user.id}:${workoutDate}`;
const historyWorkouts=()=>sessions.filter(s=>s.workout_data?.version===3).map(s=>({...s.workout_data,date:s.session_date})).sort((a,b)=>b.date.localeCompare(a.date));
// Old summaries provide defaults, without fabricating historical individual sets.
const prefillHistory=()=>sessions.slice().sort((a,b)=>b.session_date.localeCompare(a.session_date)).filter(s=>s.session_date<workoutDate).map(s=>{
  if(s.workout_data?.version===3)return s.workout_data;
  return {exercises:logs.filter(l=>l.session_id===s.id).map(l=>{
    const link=links.find(x=>x.id===l.exercise_id||x.exercise_id===l.exercise_id);
    return {exerciseId:link?.exercise_id||l.exercise_id,sets:[Gym.set({weight:Gym.number(l.weight),reps:/^\d+$/.test(l.reps||'')?Number(l.reps):null})]};
  })};
});
const recordedStepLabel=step=>`${step.weight==null?'—':numericLabel(step.weight)} × ${step.reps??'—'}`;
function toast(message){let el=$('gymToast');el.textContent=message;el.hidden=false;clearTimeout(el.hideTimer);el.hideTimer=setTimeout(()=>el.hidden=true,4500)}
function showLoadError(error){console.error(error);let box=$('gymLoadError');if(!box){box=document.createElement('div');box.id='gymLoadError';box.className='load-error';document.querySelector('.app').prepend(box)}box.innerHTML='<strong>Não consegui carregar seus treinos.</strong><p>Seus dados continuam guardados. Tente novamente quando a conexão voltar.</p><button class="soft" id="retryGymLoad">Tentar novamente</button>';$('retryGymLoad').onclick=()=>location.reload()}
function keepDraft(){if(!activeWorkout)return;try{localStorage.setItem(draftKey(),JSON.stringify({workout:activeWorkout,revision:activeRevision,sheetId:workoutSheet,trainingId:workoutTraining,savedAt:Date.now()}));return true}catch{setSaveState('Sem espaço para guardar neste aparelho. Salve antes de sair.','error');return false}}
function setSaveState(text,state=''){saveState=text;const el=$('workoutSaveState');if(el){el.textContent=text;el.dataset.state=state}}
function changed(render=false){if(!activeWorkout||deletingWorkout)return;activeWorkout.modifiedAt=Date.now();keepDraft();if(!workoutConflict)setSaveState(window.GYM_DEMO?'Prévia · salva só neste navegador':'Salvo neste aparelho · sincronizando…');clearTimeout(saveTimer);saveTimer=setTimeout(()=>persistWorkout(),900);if(render)renderWorkout()}
function flushWorkoutInputs(){
  if(activeWorkout?.status!=='active')return;
  $('sessionExercises').querySelectorAll('.set-line input[data-field]:not(:disabled)').forEach(input=>{
    const card=input.closest('[data-lift]'),row=input.closest('.set-line'),e=activeWorkout.exercises.find(e=>e.id===card.dataset.lift),s=e?.sets.find(s=>s.id===row.dataset.set),step=row.dataset.drop===''?s:s?.drops[Number(row.dataset.drop)];
    if(step&&step[input.dataset.field]!==Gym.number(input.value))input.oninput?.();
  });
}
async function persistWorkout(){
  if(!activeWorkout||workoutConflict||deletingWorkout)return false;
  flushWorkoutInputs();
  if(savingWorkout){pendingSave=true;return false}
  const invalid=Gym.validate(activeWorkout);if(invalid){setSaveState(invalid,'error');return false}
  savingWorkout=true;pendingSave=false;const snapshot=clone(activeWorkout),date=workoutDate,revision=activeRevision;
  setSaveState('Salvando…');
  try{
    const {data,error}=await sb.rpc('gym_save_workout',{p_date:date,p_sheet_id:workoutSheet,p_training_id:workoutTraining,p_workout:snapshot,p_revision:revision});
    if(error)throw error;
    if(date!==workoutDate)return false;
    activeRevision=data.revision;const at=sessions.findIndex(s=>s.session_date===date);if(at<0)sessions.push(data);else sessions[at]=data;
    keepDraft();setSaveState(window.GYM_DEMO?'Prévia · salva só neste navegador':'✓ Salvo na sua conta','saved');renderMetrics();renderWeek();renderHistory();return true;
  }catch(error){console.error(error);if(String(error.message).includes('WORKOUT_CONFLICT')){workoutConflict=true;setSaveState('Outra aba alterou este treino. Toque aqui para resolver.','error')}else setSaveState('Sem sincronizar · cópia salva neste aparelho. Toque para tentar.','error');return false}
  finally{savingWorkout=false;if(pendingSave||activeWorkout?.modifiedAt!==snapshot.modifiedAt){pendingSave=false;if(!workoutConflict)saveTimer=setTimeout(()=>persistWorkout(),100)}}
}
function routineFor(sh){return sh.routine_data?.version===3?clone(sh.routine_data):{version:3,name:sh.name,exercises:Gym.fromLinks(sheetLinks(sh.id),catalog)}}
function chooseDraft(server){let draft;try{draft=JSON.parse(localStorage.getItem(draftKey())||'null')}catch{}if(!draft?.workout||draft.workout.version!==3)return server;
  if(draft.revision===(server?.revision||0)&&(!server?.workout_data||(draft.workout.modifiedAt||0)>(server.workout_data.modifiedAt||0)))return {...server,workout_data:draft.workout,revision:draft.revision,sheet_id:draft.sheetId,training_id:draft.trainingId};
  if(draft.revision<(server?.revision||0)&&(draft.workout.modifiedAt||0)>(server.workout_data?.modifiedAt||0)){try{localStorage.setItem(draftKey()+':recovery',JSON.stringify(draft))}catch{}toast('A conta tem uma versão mais recente. Sua cópia local foi preservada.');}
  return server
}
openSession=function(){
  if(deletingWorkout)return;
  if(savingWorkout){toast('Espere terminar de salvar o treino atual.');return}
  if(activeWorkout&&workoutDate!==currentDate&&saveState.includes('Sem sincronizar')){toast('Sincronize o treino atual antes de abrir outro dia.');return}
  workoutDate=currentDate;let server=sessions.find(s=>s.session_date===currentDate);const selected=chooseDraft(server);workoutSheet=selected?.sheet_id??currentSheet?.id??null;workoutTraining=selected?.training_id??currentSheet?.training_id??null;activeRevision=selected?.revision||0;workoutConflict=false;
  if(selected?.workout_data)activeWorkout=clone(selected.workout_data);
  else if(server&&logs.some(l=>l.session_id===server.id))activeWorkout={version:3,name:currentSheet?.name||'Treino anterior',status:'legacy',notes:server.notes||'',exercises:Gym.fromLegacy(logs.filter(l=>l.session_id===server.id),links,catalog)};
  else {if(!currentSheet){toast('Esta ficha não está mais disponível.');return}activeWorkout=Gym.start(routineFor(currentSheet),prefillHistory());if(!activeWorkout.exercises.length){activeWorkout.activityOnly=true;activeWorkout.exercises=[Gym.exercise({name:currentSheet.name,sets:[]})]}}
  Gym.normalizeTimer(activeWorkout);
  if(activeWorkout.status==='active')Gym.prefill(activeWorkout,prefillHistory());
  $('sessionDate').textContent=new Date(workoutDate+'T12:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});$('sessionTitle').textContent=activeWorkout.name;$('sessionNotes').value=activeWorkout.notes||'';
  $('sessionNotes').disabled=activeWorkout.status!=='active';$('sessionNotes').oninput=()=>{activeWorkout.notes=$('sessionNotes').value;changed()};
  renderWorkout();setSaveState(activeWorkout.status==='legacy'?'Registro antigo · preservado':window.GYM_DEMO?'Prévia · salva só neste navegador':'Alterações salvas automaticamente');open('sessionModal');if(activeWorkout.status==='active')changed();
};
function previousSet(e,index,drop){for(const w of historyWorkouts().filter(w=>w.date<workoutDate)){const prev=w.exercises.find(x=>x.exerciseId&&x.exerciseId===e.exerciseId);const s=prev?.sets[index];const p=drop===null?s:s?.drops[drop];if(p?.done)return recordedStepLabel(p)}return '—'}
function inputRow(e,s,index,step,drop,readonly){
  const done=step.done,typeNames={normal:'Normal',warmup:'Aquecimento',drop:'Dropset',failure:'Até a falha'},number=e.sets.slice(0,index+1).filter(x=>x.type!=='warmup').length;
  const label=drop!==null?`D${drop+1}`:s.type==='warmup'?'W':s.type==='failure'?'F':String(number),typeLabel=drop===null?typeNames[s.type]:`Redução ${drop+1}`;
  return `<div class="set-swipe ${readonly?'read-only':''}" data-set="${s.id}" data-drop="${drop??''}" ${readonly?'':`tabindex="0" role="group" aria-label="${esc(e.name)}, série ${label}. Deslize para a esquerda para excluir."`}>${!readonly?`<button type="button" class="set-delete" tabindex="-1" aria-hidden="true" aria-label="Excluir ${esc(e.name)}, série ${label}">Excluir</button>`:''}<div class="set-line ${done?'set-done':''} ${drop!==null?'drop-line':''}" data-set="${s.id}" data-drop="${drop??''}">${drop===null?`<button type="button" class="set-index set-index-${s.type}" data-action="type" data-set="${s.id}" aria-label="Tipo da série ${label}: ${typeLabel}" ${readonly?'disabled':''}>${label}${s.type==='drop'?'<small>D</small>':''}</button>`:`<span class="set-index set-index-drop" aria-label="${typeLabel}">${label}</span>`}<span class="set-reference"><span class="set-previous">${previousSet(e,index,drop)}</span>${s.targetReps?`<small class="set-target" title="Meta de repetições">Meta: ${esc(s.targetReps)}</small>`:''}</span><input aria-label="Carga ${esc(e.name)}, série ${label}" inputmode="decimal" type="text" data-field="weight" value="${step.weight??''}" placeholder="—" ${readonly||done?'disabled':''}><input aria-label="Repetições ${esc(e.name)}, série ${label}" inputmode="numeric" type="number" min="1" max="1000" step="1" data-field="reps" value="${step.reps??''}" placeholder="—" ${readonly||done?'disabled':''}><button type="button" class="set-check" data-action="check" aria-label="${done?'Desmarcar':'Concluir'} ${esc(e.name)}, série ${label}" aria-pressed="${done}" ${readonly?'disabled':''}>✓</button></div></div>`;
}
function renderWorkout(){
  const w=activeWorkout;if(!w)return;const readonly=w.status!=='active',st=Gym.stats(w),groups=[...new Set(w.exercises.map(e=>e.supersetId).filter(Boolean))];
  $('sessionExercises').innerHTML=`<div class="workout-dashboard"><div><small>DURAÇÃO</small><strong id="workoutDuration">0:00</strong></div><div><small>VOLUME</small><strong>${numericLabel(st.volume)} <em>kg</em></strong></div><div><small>SÉRIES</small><strong>${st.done}<em> / ${st.total}</em></strong></div></div><div class="progress-track"><i style="width:${st.total?st.done/st.total*100:0}%"></i></div>${w.status==='finished'?'<div class="finished-banner">✓ Treino concluído.</div>':''}${w.status==='legacy'?'<div class="finished-banner">Histórico anterior: o app guardava um resumo por exercício. Não estimamos séries que não foram registradas.</div>':''}`+(w.activityOnly?`<div class="activity-summary"><h3>${esc(w.name)}</h3><p>Você pode marcar esta atividade como feita sem registrar exercícios ou séries.</p></div>`:'')+(w.activityOnly?[]:w.exercises).map((e,ei)=>{
    const group=e.supersetId?groups.indexOf(e.supersetId)+1:0;return `<article class="lift-card ${group?'grouped':''}" id="lift-${e.id}" data-lift="${e.id}">${group?`<div class="superset-label">SUPERSET ${group} <span>· descanso após a rodada completa</span></div>`:''}<div class="lift-head">${e.imageUrl?`<img src="${esc(e.imageUrl)}" alt="" class="lift-thumb">`:'<span class="lift-thumb placeholder">↗</span>'}<div><h3>${esc(e.name)}</h3><div class="lift-tools"><button class="rest-chip" data-action="rest" ${readonly?'disabled':''}>◷ ${timeLabel(e.restSeconds)}</button>${!readonly?'<button class="note-chip" data-action="note">+ Nota</button>':''}</div></div>${!readonly?`<button class="icon-btn" data-action="exercise-menu" aria-label="Opções de ${esc(e.name)}">···</button>`:''}</div>${e.notes?`<p class="lift-note">${esc(e.notes)}</p>`:''}${e.legacy?`<p class="legacy-summary">${esc(e.legacySummary)}</p>`:`<div class="set-table"><div class="set-head"><span>SÉRIE</span><span>ANTERIOR</span><span>KG</span><span>REPS</span><span>✓</span></div>${e.sets.map((s,i)=>`<div class="set-block" data-block="${s.id}">${inputRow(e,s,i,s,null,readonly)}${s.drops.map((d,j)=>inputRow(e,s,i,d,j,readonly)).join('')}${s.type==='drop'&&!readonly?`<button class="add-drop" data-action="add-drop" data-set="${s.id}">+ redução de carga</button>`:''}</div>`).join('')}</div>`}${!readonly?'<button class="add-set" data-action="add-set">+ Adicionar série</button>':''}</article>`
  }).join('')+(!readonly?'<button class="soft wide" id="addWorkoutExercise">+ Adicionar exercício ao treino</button>':'');
  $('sessionExercises').querySelectorAll('[data-lift]').forEach(card=>{
    const e=w.exercises.find(e=>e.id===card.dataset.lift);
    card.querySelectorAll('input[data-field]').forEach(input=>{
      input.oninput=()=>{
        const row=input.closest('.set-line'),s=e.sets.find(s=>s.id===row.dataset.set),drop=row.dataset.drop===''?null:Number(row.dataset.drop),step=drop===null?s:s.drops[drop],field=input.dataset.field;
        if(field==='weight'){
          Gym.setWeight(e,e.sets.indexOf(s),drop,Gym.number(input.value));
          card.querySelectorAll('[data-field=weight]').forEach(other=>{if(other===input)return;const r=other.closest('.set-line'),set=e.sets.find(x=>x.id===r.dataset.set),value=r.dataset.drop===''?set:set.drops[Number(r.dataset.drop)];other.value=value.weight??''});
        }else{step[field]=Gym.number(input.value);step[field+'Edited']=true}
        changed();
      };
      input.onchange=()=>input.oninput();
      input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();input.blur();input.closest('.set-line').querySelector('.set-check').click()}};
    });
    if(!readonly)bindSetSwipes(card,e);
    card.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>workoutAction(btn.dataset.action,e,btn));
  });
  $('addWorkoutExercise')?.addEventListener('click',()=>pickExercises(items=>{if(w.activityOnly){w.activityOnly=false;w.exercises=[];}items.forEach(e=>w.exercises.push(Gym.exercise({exerciseId:e.id,name:e.name,imageUrl:e.image_url})));Gym.prefill(w,prefillHistory());changed(true)}));
  $('saveSession').textContent=w.status==='finished'?'Editar registro':w.status==='legacy'?'Fechar histórico':w.activityOnly?'Marcar como feito':!w.timerStarted?'Iniciar treino':'Concluir treino';
  $('saveSession').onclick=()=>{if(w.status==='active'&&!w.activityOnly&&!w.timerStarted){Gym.toggleTimer(w);changed(true);return;}return finishWorkout();};$('sessionNotes').disabled=readonly;tickWorkout();
}
function workoutAction(action,e,btn){
  if(activeWorkout.status!=='active')return;let s=e.sets.find(s=>s.id===(btn.dataset.set||btn.closest('.set-line')?.dataset.set));
  if(action==='check'){
    const row=btn.closest('.set-line'),step=row.dataset.drop===''?s:s.drops[Number(row.dataset.drop)];row.querySelectorAll('input[data-field]').forEach(input=>{const value=Gym.number(input.value);if(step[input.dataset.field]!==value)input.oninput()});if(!step.done&&!Gym.valid(step)){toast('Confira a carga e as repetições, ou deixe em branco.');return}document.activeElement?.blur();step.done=!step.done;
    activeWorkout.restEnd=null;
    if(step.done&&Gym.done(s)){const next=Gym.next(activeWorkout,e.id,e.sets.indexOf(s));if(next.rest&&next.seconds>0){activeWorkout.restEnd=Date.now()+next.seconds*1000;activeWorkout.restSeconds=next.seconds}if(next.exerciseId&&next.exerciseId!==e.id)setTimeout(()=>$('lift-'+next.exerciseId)?.scrollIntoView({behavior:'smooth',block:'start'}),70)}
    changed(true);return
  }
  if(action==='add-set'){if(e.sets.length>=30)return toast('Máximo de 30 séries por exercício.');const prev=e.sets.at(-1);e.sets.push(Gym.set({weight:prev?.weight??null,reps:prev?.reps??Gym.suggestedReps(prev?.targetReps||'10'),targetReps:prev?.targetReps||'10'}));changed(true)}
  if(action==='remove-set')removeWorkoutSet(e,s,null);
  if(action==='add-drop'){if(s.drops.length>=8)return toast('Máximo de 8 reduções.');s.drops.push({id:Gym.id(),weight:null,reps:s.drops.at(-1)?.reps??s.reps??Gym.suggestedReps(s.targetReps),done:false});changed(true)}
  if(action==='type')form('série','Tipo de série',`<div class="type-picker">${[['normal','Normal','Série de trabalho'],['warmup','Aquecimento','Preparar o movimento'],['drop','Dropset','Carga e repetições em cada redução'],['failure','Até a falha','Registrar as repetições realizadas']].map(([v,n,d])=>`<label><input type="radio" name="setType" value="${v}" ${s.type===v?'checked':''}><span><b>${n}</b><small>${d}</small></span></label>`).join('')}</div><button type="button" class="soft danger-icon wide" id="deleteSelectedSet">Excluir série</button>`,()=>{const type=document.querySelector('[name=setType]:checked').value;if(type!=='drop'&&s.drops.length&&!confirm('Remover as reduções desta série?'))return;s.type=type;if(type==='drop'&&!s.drops.length)s.drops=[{id:Gym.id(),weight:null,reps:s.reps??Gym.suggestedReps(s.targetReps),done:false}];if(type!=='drop')s.drops=[];close('formModal');changed(true)});
  if(action==='type')$('deleteSelectedSet').onclick=()=>{close('formModal');removeWorkoutSet(e,s,null)};
  if(action==='rest')form('descanso','Entre séries',`<label class="field"><span>Segundos (0 = sem descanso)</span><input id="restSecondsInput" type="number" min="0" max="900" value="${e.restSeconds}"></label>`,()=>{const n=Number($('restSecondsInput').value);if(!Number.isInteger(n)||n<0||n>900)return toast('Use de 0 a 900 segundos.');e.restSeconds=n;close('formModal');changed(true)});
  if(action==='note')form('exercício','Anotação',`<label class="field"><span>${esc(e.name)}</span><textarea id="quickExerciseNote" placeholder="Ex.: controlar a descida">${esc(e.notes)}</textarea></label>`,()=>{e.notes=$('quickExerciseNote').value;close('formModal');changed(true)});
  if(action==='exercise-menu')exerciseMenu(e);
}
function replaceWorkoutExercise(e){
  if(activeWorkout?.status!=='active')return;
  flushWorkoutInputs();
  const workout=activeWorkout,date=workoutDate;
  const choices=catalog.filter(item=>item.id!==e.exerciseId);
  form('somente nesta sessão','Trocar exercício',
    '<p class="editor-hint">As séries já registradas ficam no exercício original. As séries restantes passam para o novo exercício, com as cargas dele. Sua ficha continua igual.</p><input id="swapSearch" class="search" type="search" placeholder="Buscar exercício"><div id="swapList" class="pick-list">'+
    (choices.map(item=>'<label data-search="'+esc(item.name.toLocaleLowerCase('pt-BR'))+'"><input type="radio" name="swapWorkoutChoice" value="'+esc(item.id)+'"><span><b>'+esc(item.name)+'</b><small>'+esc((item.muscle_groups||[]).join(' · '))+'</small></span></label>').join('')||'<p>Cadastre outro exercício na biblioteca para trocar.</p>')+'</div>',
    ()=>{
      if(activeWorkout!==workout||workoutDate!==date||workout.status!=='active')return toast('Abra novamente as opções do treino atual.');
      const item=choices.find(x=>x.id===document.querySelector('#swapList input:checked')?.value);
      if(!item)return toast('Selecione o exercício que vai entrar.');
      const error=Gym.replaceExercise(workout,e.id,item,prefillHistory());if(error)return toast(error);
      close('formModal');changed(true);toast('Exercício trocado só nesta sessão.');
    });
  $('formSave').textContent='Trocar';
  $('swapSearch').oninput=()=>{const q=$('swapSearch').value.toLocaleLowerCase('pt-BR');$('swapList').querySelectorAll('label').forEach(label=>label.hidden=!label.dataset.search.includes(q));};
}
function exerciseMenu(e){const list=activeWorkout.exercises;form('exercício',e.name,`<label class="field"><span>Superset com</span><select id="supersetWith"><option value="">Sem superset</option>${list.filter(x=>x!==e).map(x=>`<option value="${x.id}" ${e.supersetId&&e.supersetId===x.supersetId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label class="field"><span>Anotações</span><textarea id="exerciseNote">${esc(e.notes)}</textarea></label><div class="exercise-menu-actions"><button type="button" class="soft" id="swapWorkoutExercise"><span aria-hidden="true">⇄</span> Trocar exercício</button><button class="soft" id="moveExerciseUp">↑ Subir</button><button class="soft" id="moveExerciseDown">↓ Descer</button><button class="soft danger-icon" id="removeWorkoutExercise">Remover exercício</button></div>`,()=>{const other=list.find(x=>x.id===$('supersetWith').value);if(other){const g=other.supersetId||Gym.id();e.supersetId=g;other.supersetId=g}else e.supersetId=null;e.notes=$('exerciseNote').value;Gym.normalizeGroups(list);close('formModal');changed(true)});
  $('swapWorkoutExercise').onclick=()=>replaceWorkoutExercise(e);
  const move=delta=>{let i=list.indexOf(e),j=i+delta;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];close('formModal');changed(true)};$('moveExerciseUp').onclick=()=>move(-1);$('moveExerciseDown').onclick=()=>move(1);$('removeWorkoutExercise').onclick=()=>{if(list.length===1)return toast('Mantenha ao menos um exercício.');if(!confirm('Remover este exercício e suas séries deste treino?'))return;activeWorkout.exercises=list.filter(x=>x!==e);Gym.normalizeGroups(activeWorkout.exercises);close('formModal');changed(true)};
}
function tickWorkout(){if(!activeWorkout||$('sessionModal').hidden)return;const w=activeWorkout;const elapsed=Gym.elapsed(w);if($('workoutDuration'))$('workoutDuration').textContent=timeLabel(elapsed);const el=$('restTimer');if(!el)return;el.hidden=!w.restEnd;if(!w.restEnd)return;const remaining=Math.max(0,Math.ceil((w.restEnd-Date.now())/1000));el.innerHTML=`<span>◷ ${remaining?'Descanso':'Descanso concluído'}</span><strong>${timeLabel(remaining)}</strong><div><button data-rest="minus" aria-label="Reduzir 15 segundos">−15s</button><button data-rest="plus" aria-label="Adicionar 15 segundos">+15s</button><button data-rest="skip">Pular</button></div>`;el.querySelectorAll('[data-rest]').forEach(b=>b.onclick=()=>{if(b.dataset.rest==='skip')w.restEnd=null;else w.restEnd=Math.max(Date.now(),w.restEnd+(b.dataset.rest==='plus'?15000:-15000));changed();tickWorkout()});if(!remaining&&!w.restAlerted){w.restAlerted=true;navigator.vibrate?.([120,60,120]);toast('Descanso concluído. Próxima série!')}if(remaining)w.restAlerted=false}
async function finishWorkout(){
  flushWorkoutInputs();
  if(finishingWorkout)return;if(savingWorkout){toast('Salvando suas últimas séries. Tente concluir em instantes.');return}
  if(activeWorkout.status==='legacy'){close('sessionModal');return}
  if(activeWorkout.status==='finished'){activeWorkout.status='active';activeWorkout.editingFinished=true;changed(true);return}
  const st=Gym.stats(activeWorkout);if(!st.steps&&!activeWorkout.activityOnly&&!confirm('Marcar este dia como feito sem registrar séries?'))return;if(st.steps&&st.done<st.total&&!confirm(`Você fez ${st.done} de ${st.total} séries. Concluir deixando as restantes sem marcar?`))return;
  finishingWorkout=true;Gym.pauseTimer(activeWorkout);activeWorkout.status='finished';if(!activeWorkout.editingFinished)activeWorkout.finishedAt=new Date().toISOString();activeWorkout.restEnd=null;changed(true);clearTimeout(saveTimer);$('saveSession').disabled=true;try{const ok=await persistWorkout();if(ok)toast('Treino salvo. Mais um pra conta!')}finally{finishingWorkout=false;$('saveSession').disabled=false}
}
function pickExercises(onPick){form('biblioteca','Adicionar exercícios',`<input id="pickSearch" class="search" type="search" placeholder="Buscar exercício"><div id="pickList" class="pick-list">${catalog.map(e=>`<label data-search="${esc(e.name.toLowerCase())}"><input type="checkbox" value="${e.id}"><span><b>${esc(e.name)}</b><small>${esc((e.muscle_groups||[]).join(' · '))}</small></span></label>`).join('')||'<p>Cadastre exercícios na aba Exercícios.</p>'}</div>`,()=>{const ids=[...$('pickList').querySelectorAll('input:checked')].map(x=>x.value);if(!ids.length)return;onPick(catalog.filter(e=>ids.includes(e.id)));close('formModal')});$('pickSearch').oninput=()=>{const q=$('pickSearch').value.toLowerCase();$('pickList').querySelectorAll('label').forEach(l=>l.hidden=!l.dataset.search.includes(q))}}

openSheet=function(id){currentSheet=sheets.find(s=>s.id===id);if(!currentSheet)return;editRoutine=routineFor(currentSheet);editRoutine.name=currentSheet.name;renderRoutine();open('sheetModal')};
function renderRoutine(){
  const r=editRoutine;$('sheetTitle').innerHTML=`<label class="routine-name-label"><small>Nome da ficha · toque para editar</small><input id="routineName" class="routine-name" aria-label="Nome da ficha" value="${esc(r.name)}"></label>`;$('routineName').oninput=()=>r.name=$('routineName').value;
  $('sheetExerciseList').innerHTML=`<p class="editor-hint">Configure cada série. Supersets alternam os exercícios e descansam só ao completar a rodada.</p>`+r.exercises.map((e,i)=>`<article class="routine-exercise" data-routine="${e.id}"><div class="routine-head"><div><small>EXERCÍCIO ${i+1}</small><h3>${esc(e.name)}</h3></div><div class="routine-order"><button data-edit="up" aria-label="Subir ${esc(e.name)}" ${i===0?'disabled':''}>↑</button><button data-edit="down" aria-label="Descer ${esc(e.name)}" ${i===r.exercises.length-1?'disabled':''}>↓</button><button data-edit="remove" aria-label="Remover ${esc(e.name)}">×</button></div></div><div class="routine-settings"><label>Descanso (seg)<input data-config="restSeconds" type="number" min="0" max="900" value="${e.restSeconds}"></label><label>Superset com<select data-config="supersetId"><option value="">Sem superset</option>${r.exercises.filter(x=>x!==e).map(x=>`<option value="${x.id}" ${e.supersetId&&e.supersetId===x.supersetId?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label></div><div class="routine-sets">${e.sets.map((s,si)=>`<div class="routine-set" data-routine-set="${s.id}"><b>${si+1}</b><select data-config="type" aria-label="Tipo série ${si+1}">${[['normal','Normal'],['warmup','Aquecimento'],['drop','Dropset'],['failure','Falha']].map(([v,n])=>`<option value="${v}" ${s.type===v?'selected':''}>${n}</option>`).join('')}</select><input data-config="targetReps" aria-label="Repetições série ${si+1}" value="${esc(s.targetReps)}" placeholder="8–12"><button data-edit="remove-set" aria-label="Remover série ${si+1}">×</button>${s.type==='drop'?`<label class="routine-drops">Reduções de carga <input data-config="dropCount" aria-label="Reduções série ${si+1}" type="number" min="1" max="8" value="${s.drops.length||1}"></label>`:''}</div>`).join('')}</div><button class="add-set" data-edit="add-set">+ Série</button></article>`).join('')+(r.exercises.length?'':'<div class="routine-empty">Sua ficha começa aqui.<br>Adicione os movimentos que você quer treinar.</div>');
  $('sheetExerciseList').querySelectorAll('[data-routine]').forEach(card=>{const e=r.exercises.find(e=>e.id===card.dataset.routine);card.querySelectorAll('[data-config]').forEach(input=>input.onchange=()=>{const s=e.sets.find(s=>s.id===input.closest('[data-routine-set]')?.dataset.routineSet);switch(input.dataset.config){case 'restSeconds':e.restSeconds=Math.min(900,Math.max(0,Number(input.value)||0));break;case 'supersetId':{const other=r.exercises.find(x=>x.id===input.value);if(other){const g=other.supersetId||Gym.id();e.supersetId=g;other.supersetId=g}else e.supersetId=null;Gym.normalizeGroups(r.exercises);break}case 'type':s.type=input.value;if(s.type==='drop'&&!s.drops.length)s.drops=[{id:Gym.id(),weight:null,reps:null,done:false}];if(s.type!=='drop')s.drops=[];break;case 'targetReps':s.targetReps=input.value;break;case 'dropCount':{const count=Math.min(8,Math.max(1,Number(input.value)||1));s.drops=Array.from({length:count},(_,i)=>s.drops[i]||{id:Gym.id(),weight:null,reps:null,done:false});break}}renderRoutine()});card.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const i=r.exercises.indexOf(e),s=e.sets.find(s=>s.id===b.closest('[data-routine-set]')?.dataset.routineSet);if(b.dataset.edit==='up'&&i>0)[r.exercises[i-1],r.exercises[i]]=[e,r.exercises[i-1]];if(b.dataset.edit==='down'&&i<r.exercises.length-1)[r.exercises[i],r.exercises[i+1]]=[r.exercises[i+1],e];if(b.dataset.edit==='remove'){r.exercises=r.exercises.filter(x=>x!==e);Gym.normalizeGroups(r.exercises)}if(b.dataset.edit==='add-set'&&e.sets.length<30)e.sets.push(Gym.set({targetReps:e.sets.at(-1)?.targetReps||'10'}));if(b.dataset.edit==='remove-set'&&e.sets.length>1)e.sets=e.sets.filter(x=>x!==s);renderRoutine()})});
  $('addCatalogExercise').onclick=()=>pickExercises(items=>{items.forEach(e=>r.exercises.push(Gym.exercise({exerciseId:e.id,name:e.name,imageUrl:e.image_url})));renderRoutine()});
  let actions=$('routineActions');if(!actions){actions=document.createElement('div');actions.id='routineActions';actions.className='modal-actions routine-actions';$('addCatalogExercise').after(actions)}actions.innerHTML='<button id="deleteRoutine" class="icon-btn danger-icon" aria-label="Excluir ficha" title="Excluir ficha"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button id="duplicateRoutine" class="soft">Duplicar</button><button id="saveRoutine" class="primary">Salvar ficha</button>';$('deleteRoutine').onclick=deleteRoutine;$('saveRoutine').onclick=()=>saveRoutine();$('duplicateRoutine').onclick=()=>saveRoutine(true)
}
async function deleteRoutine(){
  if(savingRoutine||!currentSheet)return;
  if(savingWorkout||deletingWorkout)return toast('Espere terminar de salvar o treino e tente novamente.');
  const sheet=currentSheet;
  if(!confirm(`Excluir a ficha ${sheet.name}? Ela sairá da lista de fichas e seus agendamentos serão removidos. O histórico realizado será preservado.`))return;
  savingRoutine=true;deletingWorkout=true;clearTimeout(saveTimer);pendingSave=false;$('deleteRoutine').disabled=true;
  try{
    const {data,error}=await sb.from('gym_sheets').delete().eq('id',sheet.id).eq('user_id',user.id).select('id');
    if(error)throw error;if(!data?.length)throw new Error('Ficha não encontrada para exclusão.');
    // Preserve an ongoing workout snapshot when its original sheet is deleted.
    if(workoutSheet===sheet.id){workoutSheet=null;if(!activeWorkout?.exercises.length){activeWorkout=null;workoutTraining=null;}}
    for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(!k?.startsWith(`gica-gym-v3:${user.id}:`))continue;try{const draft=JSON.parse(localStorage.getItem(k));if(draft?.sheetId===sheet.id){draft.sheetId=null;localStorage.setItem(k,JSON.stringify(draft))}}catch{}}
    close('sheetModal');currentSheet=null;editRoutine=null;await load();renderTrainings();
    if(currentTraining&&trainings.some(t=>t.id===currentTraining.id))openTraining(currentTraining.id);
    toast('Ficha excluída.');
  }catch(error){console.error(error);toast('Não consegui excluir a ficha. Tente novamente.');}
  finally{savingRoutine=false;deletingWorkout=false;if(activeWorkout?.status==='active')changed();if($('deleteRoutine'))$('deleteRoutine').disabled=false;}
}
async function saveRoutine(duplicate=false){
  if(savingRoutine)return;
  const r=editRoutine;if(!r?.name.trim())return toast('Dê um nome à ficha.');if(r.exercises.some(e=>e.sets.some(s=>!s.targetReps.trim())))return toast('Preencha a meta de repetições.');const payload={name:r.name.trim()+(duplicate?' · cópia':''),routine_data:Gym.template(r)};const button=$(duplicate?'duplicateRoutine':'saveRoutine');savingRoutine=true;$('deleteRoutine').disabled=true;$('saveRoutine').disabled=true;$('duplicateRoutine').disabled=true;
  try{const query=duplicate?sb.from('gym_sheets').insert({...payload,user_id:user.id,training_id:currentSheet.training_id,sort_order:sheets.filter(s=>s.training_id===currentSheet.training_id).length}):sb.from('gym_sheets').update(payload).eq('id',currentSheet.id).eq('user_id',user.id);const {data,error}=await query.select().single();if(error)throw error;await load();close('sheetModal');if(currentTraining)openTraining(currentTraining.id);toast(duplicate?'Ficha duplicada.':'Ficha salva. Mudanças valem para os próximos treinos.')}catch(error){console.error(error);toast('Não consegui salvar a ficha. Tente novamente.')}finally{savingRoutine=false;if($('deleteRoutine'))$('deleteRoutine').disabled=false;button.disabled=false;if($('saveRoutine'))$('saveRoutine').disabled=false;if($('duplicateRoutine'))$('duplicateRoutine').disabled=false}
}
function renderHistory(){const el=$('historyList');if(!el)return;el.innerHTML=sessions.slice().sort((a,b)=>b.session_date.localeCompare(a.session_date)).map(s=>{const w=s.workout_data,sh=sheets.find(x=>x.id===s.sheet_id),st=w?Gym.stats(w):null;return `<button class="history-card" data-history="${s.id}"><span class="history-date">${new Date(s.session_date+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span><span><b>${esc(w?.name||sh?.name||'Treino anterior')}</b><small>${s.completed?'Concluído':'Em andamento'}${st?` · ${st.done} séries · ${numericLabel(st.volume)} kg`:''}</small></span><span>↗</span></button>`}).join('')||'<div class="routine-empty">Seu histórico vai aparecer aqui.<br>Cada série conta.</div>';el.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>{const s=sessions.find(s=>s.id===b.dataset.history);currentDate=s.session_date;currentSheet=sheets.find(sh=>sh.id===s.sheet_id)||null;openSession()})}
const legacyStats=exerciseStats;
exerciseStats=function(id){const weights=historyWorkouts().flatMap(w=>w.exercises.filter(e=>e.exerciseId===id).flatMap(e=>e.sets.flatMap(s=>s.type==='warmup'?[]:Gym.steps(s).filter(x=>x.done&&x.weight!=null).map(x=>x.weight))));if(!weights.length)return legacyStats(id);return {best:Math.max(...weights),last:weights[0],avg:weights.reduce((a,b)=>a+b,0)/weights.length}};
progression=function(){const hist=historyWorkouts().filter(w=>w.status==='finished'),by={};hist.forEach(w=>w.exercises.forEach(e=>{if(!e.exerciseId)return;const weights=e.sets.filter(s=>s.type!=='warmup').flatMap(s=>Gym.steps(s)).filter(s=>s.done&&s.weight!=null).map(s=>s.weight);if(weights.length)(by[e.exerciseId]??=[]).push(Math.max(...weights))}));return {total:Object.values(by).filter(x=>x.length>1).length,up:Object.values(by).filter(x=>x.length>1&&x[0]>x[1]).length}};
const originalDetail=openExerciseDetail;
openExerciseDetail=function(id){originalDetail(id);let history=$('exerciseSetHistory');if(!history){history=document.createElement('section');history.id='exerciseSetHistory';$('exerciseDetailNotes').after(history)}const rows=historyWorkouts().flatMap(w=>w.exercises.filter(e=>e.exerciseId===id).map(e=>({date:w.date,sets:e.sets}))).filter(r=>r.sets.some(s=>Gym.steps(s).some(x=>x.done)));history.innerHTML='<h3>Evolução por treino</h3>'+ (rows.length?rows.slice(0,12).map(r=>`<div class="exercise-history-row"><small>${new Date(r.date+'T12:00').toLocaleDateString('pt-BR')}</small><span>${r.sets.map(s=>Gym.steps(s).filter(x=>x.done).map(x=>`${x.weight==null?'—':numericLabel(x.weight)} kg × ${x.reps??'—'}`).join(' → ')).filter(Boolean).join(' · ')}</span></div>`).join(''):'<p class="meta">Registre suas séries para acompanhar a evolução aqui.</p>')};
function startFreeWorkout(){const date=key(new Date());if(sessions.some(s=>s.session_date===date))return toast('Você já tem um treino hoje. Abra o treino para adicionar exercícios.');pickExercises(items=>{currentDate=date;currentSheet=null;workoutDate=date;const w=Gym.start({version:3,name:'Treino livre',exercises:items.map(e=>Gym.exercise({exerciseId:e.id,name:e.name,imageUrl:e.image_url}))});try{localStorage.setItem(`gica-gym-v3:${user.id}:${date}`,JSON.stringify({workout:w,revision:0,sheetId:null,trainingId:null}))}catch{return toast('Sem espaço neste aparelho.')}openSession()})}
function setupWorkoutUI(){
  const metrics=document.querySelector('#week .metric-grid');metrics.insertAdjacentHTML('beforebegin','<div class="gym-intro"><div><small>UM TREINO DE CADA VEZ</small><h1>Seu ritmo. Sua evolução.</h1></div><button class="soft" id="startFreeWorkout">+ Treino livre</button></div><div id="todayWorkout" class="today-workout-wrap"></div>');
  document.querySelector('[data-view="week"]').textContent='Hoje';const tab=document.createElement('button');tab.dataset.view='history';tab.textContent='Histórico';document.querySelector('.view-switch').append(tab);const view=document.createElement('section');view.id='history';view.className='view';view.innerHTML='<div class="section-head"><div><small>cada série conta</small><h1>Histórico</h1></div></div><div id="historyList"></div>';document.querySelector('.app').append(view);tab.onclick=()=>{document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='history'));document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===tab));renderHistory()};
  $('startFreeWorkout').onclick=startFreeWorkout;
  const card=$('sessionModal').querySelector('.modal-card');card.classList.add('workout-session');card.querySelector('.modal-actions').insertAdjacentHTML('afterbegin','<div id="restTimer" class="rest-timer" hidden></div>');const status=document.createElement('button');status.id='workoutSaveState';status.className='save-state';status.setAttribute('aria-live','polite');$('sessionNotes').parentElement.before(status);status.onclick=()=>workoutConflict?resolveWorkoutConflict():persistWorkout();
  $('unplan').textContent='Salvar e sair';$('unplan').onclick=async()=>{if(activeWorkout?.status==='active'){clearTimeout(saveTimer);await persistWorkout()}close('sessionModal')};
  document.body.insertAdjacentHTML('beforeend','<div id="gymToast" class="gym-toast" role="status" hidden></div>');
  // Native modal dismissal always keeps a local checkpoint; network sync continues.
  document.querySelectorAll('#sessionModal [data-close]').forEach(b=>b.onclick=()=>{keepDraft();close('sessionModal')});
  document.addEventListener('keydown',e=>{if(e.key==='Tab'&&modalStack.length){const modal=$(modalStack.at(-1)),focusable=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(x=>x.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement.tagName==='H2')){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}if(e.key==='Escape'){const visible=$(modalStack.at(-1));if(visible){if(visible.id==='sessionModal')keepDraft();close(visible.id)}}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)keepDraft();else tickWorkout()});window.addEventListener('online',()=>persistWorkout());window.addEventListener('beforeunload',keepDraft);setInterval(tickWorkout,1000);
}
setupWorkoutUI();

async function resolveWorkoutConflict(){
  try{
    const {data:server,error}=await sb.from('gym_sessions').select('*').eq('user_id',user.id).eq('session_date',workoutDate).single();if(error)throw error;
    const localStats=Gym.stats(activeWorkout),remoteStats=server.workout_data?Gym.stats(server.workout_data):null;
    form('conflito entre aparelhos','Escolher versão',`<p class="editor-hint">As duas cópias serão preservadas neste aparelho antes de escolher. A versão escolhida substituirá a outra na sua conta.</p><div class="type-picker"><label><input type="radio" name="conflictVersion" value="server" checked><span><b>Versão da conta</b><small>${remoteStats?.done??0} séries concluídas</small></span></label><label><input type="radio" name="conflictVersion" value="local"><span><b>Versão deste aparelho</b><small>${localStats.done} séries concluídas</small></span></label></div>`,async()=>{
      const choice=document.querySelector('[name=conflictVersion]:checked').value;
      if(choice==='local'&&!confirm('Substituir na sua conta o treino salvo pelo outro aparelho?'))return;
      try{localStorage.setItem(draftKey()+':recovery',JSON.stringify({local:activeWorkout,server:server.workout_data}))}catch{return toast('Não consegui guardar uma cópia. Libere espaço antes de continuar.')}
      close('formModal');activeRevision=server.revision;workoutConflict=false;
      if(choice==='server'){activeWorkout=clone(server.workout_data);workoutSheet=server.sheet_id;workoutTraining=server.training_id;$('sessionNotes').value=activeWorkout.notes||'';keepDraft();renderWorkout();setSaveState('✓ Versão da conta carregada','saved')}
      else{changed(true);clearTimeout(saveTimer);await persistWorkout()}
    });
  }catch(error){console.error(error);toast('Não consegui buscar a versão da conta. Tente quando a conexão voltar.')}
}

function removeWorkoutSet(e,s,drop){
  if(activeWorkout?.status!=='active'||!s)return;
  if(drop===null&&e.sets.length===1){toast('Mantenha pelo menos uma série no exercício.');return}
  if(!e.sets.includes(s)||(drop!==null&&!s.drops[drop]))return;
  const workout=activeWorkout,date=workoutDate,index=e.sets.indexOf(s),snapshot=clone(drop===null?s:s.drops[drop]),oldType=s.type;
  if(!snapshot)return;
  if(drop===null)e.sets.splice(index,1);
  else{s.drops.splice(drop,1);if(!s.drops.length)s.type='normal'}
  changed(true);toast(drop===null?'Série excluída.':'Redução excluída.');
  const message=$('gymToast'),undo=document.createElement('button');undo.type='button';undo.className='undo-series';undo.textContent='Desfazer';message.append(undo);
  clearTimeout(message.hideTimer);message.hideTimer=setTimeout(()=>message.hidden=true,12000);
  undo.onclick=()=>{
    if(activeWorkout!==workout||activeWorkout.status!=='active'||workoutDate!==date||!activeWorkout.exercises.includes(e)){toast('Abra o treino original para recuperar esta série.');return}
    if(drop===null)e.sets.splice(Math.min(index,e.sets.length),0,snapshot);
    else if(e.sets.includes(s)){s.drops.splice(Math.min(drop,s.drops.length),0,snapshot);s.type=oldType}
    else return toast('A série desta redução não está mais no treino.');
    changed(true);toast('Série restaurada.');
  };
}
function bindSetSwipes(card,e){
  const width=88;
  const toggle=(row,open)=>{
    row.classList.toggle('is-open',open);row.classList.remove('is-dragging');
    row.querySelector('.set-line').style.transform=open?`translateX(-${width}px)`:'';
    const button=row.querySelector('.set-delete');button.tabIndex=open?0:-1;button.setAttribute('aria-hidden',String(!open));
  };
  const closeOthers=except=>document.querySelectorAll('.set-swipe.is-open').forEach(row=>{if(row!==except)toggle(row,false)});
  card.querySelectorAll('.set-swipe:not(.read-only)').forEach(row=>{
    const line=row.querySelector('.set-line'),s=e.sets.find(s=>s.id===row.dataset.set),drop=row.dataset.drop===''?null:Number(row.dataset.drop);
    let gesture=null,lastSwipe=-Infinity;
    const deleteButton=row.querySelector('.set-delete');let activated=false;
    const remove=()=>{if(activated)return;activated=true;removeWorkoutSet(e,s,drop)};
    deleteButton.onclick=remove;
    deleteButton.addEventListener('pointerup',event=>{if(event.pointerType==='touch'){event.preventDefault();remove()}});
    row.onkeydown=event=>{
      if(event.key==='Escape'&&row.classList.contains('is-open')){event.preventDefault();event.stopPropagation();toggle(row,false);row.focus();return}
      if(event.target!==row)return;
      if(event.key==='ArrowLeft'){event.preventDefault();closeOthers(row);toggle(row,true);row.querySelector('.set-delete').focus()}
      if(event.key==='Escape'||event.key==='ArrowRight'){event.preventDefault();toggle(row,false)}
      if(event.key==='Delete'&&row.classList.contains('is-open')){event.preventDefault();removeWorkoutSet(e,s,drop)}
    };
    row.addEventListener('click',event=>{
      if(event.target.closest('.set-delete'))return;
      if(performance.now()-lastSwipe<350){event.preventDefault();event.stopImmediatePropagation();return}
      if(row.classList.contains('is-open')){toggle(row,false);event.preventDefault();event.stopImmediatePropagation()}
    },true);
    line.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      closeOthers(row);gesture={id:event.pointerId,x:event.clientX,y:event.clientY,offset:row.classList.contains('is-open')?-width:0,dragging:false,value:0};
    });
    line.addEventListener('pointermove',event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(!gesture.dragging){
        if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){gesture=null;return}
        if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.3)return;
        gesture.dragging=true;row.classList.add('is-dragging');document.activeElement?.blur();line.setPointerCapture(event.pointerId);
      }
      event.preventDefault();gesture.value=Math.max(-width,Math.min(0,gesture.offset+dx));line.style.transform=`translateX(${gesture.value}px)`;
    },{passive:false});
    const finish=event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const current=gesture;gesture=null;
      if(current.dragging){lastSwipe=performance.now();toggle(row,current.value<-width*.4);if(line.hasPointerCapture(event.pointerId))line.releasePointerCapture(event.pointerId)}
    };
    line.addEventListener('pointerup',finish);
    line.addEventListener('pointercancel',event=>{if(gesture?.id===event.pointerId){gesture=null;toggle(row,false)}});
  });
}

