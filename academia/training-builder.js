/* Training creation hub. Reuses the existing routine and catalog editors. */
(()=>{
 const host=$('trainings'),catalogView=$('catalog');if(!host||!catalogView)return;
 host.classList.add('training-builder');
 const heading=document.createElement('header');heading.className='section-head';heading.innerHTML='<div><small>criação e organização</small><h1>Treinos</h1></div>';
 const groups=document.createElement('div');groups.className='builder-groups';
 const block=(id,title,opened=false)=>{const el=document.createElement('details');el.id=id;el.className='builder-group';el.open=opened;el.innerHTML='<summary><span>'+title+'</span><span class="builder-summary-end"><small class="builder-count"></small><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span></summary><div class="builder-body"></div>';groups.appendChild(el);return el.querySelector('.builder-body');};
 const trainingBody=block('builderTrainings','Treinos',true),sheetBody=block('builderSheets','Fichas'),exerciseBody=block('builderExercises','Exercícios');
 const oldHead=host.querySelector('.section-head');oldHead?.querySelector('div')?.remove();oldHead?.classList.add('builder-toolbar');
 while(host.firstChild)trainingBody.appendChild(host.firstChild);
 host.append(heading,groups);
 sheetBody.innerHTML='<div class="builder-toolbar"><button id="builderNewSheet" type="button" class="primary">+ ficha</button></div><div id="builderSheetList" class="program-list"></div>';
 catalogView.classList.remove('view','active');catalogView.classList.add('builder-catalog');
 const catalogHead=catalogView.querySelector('.section-head');catalogHead?.querySelector('div')?.remove();catalogHead?.classList.add('builder-toolbar');exerciseBody.appendChild(catalogView);
 const recentFirst=(a,b)=>(Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0)||a.name.localeCompare(b.name,'pt-BR');
 const orderedTrainings=()=>trainings.slice().sort((a,b)=>Number(a.is_archived===true)-Number(b.is_archived===true)||recentFirst(a,b));
 function refreshTrainingStatuses(){
  const list=$('trainingList');
  orderedTrainings().forEach(row=>{
   const button=[...list.querySelectorAll('[data-training]')].find(b=>b.dataset.training===row.id);if(!button)return;
   const count=sheets.filter(sh=>sh.training_id===row.id).length;
   button.classList.add('builder-compact-row');button.classList.toggle('is-inactive',row.is_archived===true);
   button.innerHTML='<strong>'+esc(row.name)+'</strong><span class="builder-row-meta">'+count+' '+(count===1?'ficha':'fichas')+' · '+(row.is_archived?'Inativo':'Ativo')+'</span>';
   list.appendChild(button);
  });
 }
 function refresh(){
  refreshTrainingStatuses();
  $('builderTrainings').querySelector('.builder-count').textContent=String(trainings.length);
  $('builderSheets').querySelector('.builder-count').textContent=String(sheets.length);
  $('builderExercises').querySelector('.builder-count').textContent=String(catalog.length);
  const trainingOrder=new Map(orderedTrainings().map((t,i)=>[t.id,i]));
  const orderedSheets=sheets.slice().sort((a,b)=>Number(!sheetIsAvailable(a))-Number(!sheetIsAvailable(b))||(trainingOrder.get(a.training_id)??Infinity)-(trainingOrder.get(b.training_id)??Infinity)||recentFirst(a,b));
  $('builderSheetList').innerHTML=sheets.length?orderedSheets.map(sh=>{
   const training=trainings.find(t=>t.id===sh.training_id),count=sh.routine_data?.exercises?.length??sheetLinks(sh.id).length;
   return '<button type="button" class="sheet-card builder-compact-row '+(!sheetIsAvailable(sh)?'is-inactive':'')+'" data-builder-sheet="'+esc(sh.id)+'"><strong>'+esc(sh.name)+'</strong><span class="builder-row-meta">'+esc(training?.name||'Sem treino')+' · '+count+' '+(count===1?'exercício':'exercícios')+' · '+(sh.is_archived?'Inativa':trainingIsAvailable(training)?'Ativa':'Ativa · treino inativo')+'</span></button>';
  }).join(''):'<p class="meta">Crie uma ficha e vincule a um treino.</p>';
  $('builderSheetList').querySelectorAll('[data-builder-sheet]').forEach(button=>button.onclick=()=>{const sh=sheets.find(s=>s.id===button.dataset.builderSheet);if(!sh)return;currentTraining=trainings.find(t=>t.id===sh.training_id)||null;openSheet(sh.id);});
 }
 $('builderNewSheet').onclick=()=>{
  if(!trainings.length){$('builderTrainings').open=true;toast('Crie um treino antes de adicionar a ficha.');return;}
  form('ficha','Nova ficha','<label class="field"><span>treino</span><select id="builderSheetTraining">'+trainings.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select></label><label class="field"><span>nome</span><input id="builderSheetName" placeholder="ex.: A · Push"></label>',async()=>{
   const name=$('builderSheetName').value.trim(),training=trainings.find(t=>t.id===$('builderSheetTraining').value);if(!name)return toast('Dê um nome à ficha.');if(!training)return toast('Selecione um treino.');
   const {data,error}=await sb.from('gym_sheets').insert({user_id:user.id,training_id:training.id,name,sort_order:sheets.filter(s=>s.training_id===training.id).length}).select().single();
   if(error){console.error(error);return toast('Não consegui criar a ficha. Tente novamente.');}
   close('formModal');await load();currentTraining=trainings.find(t=>t.id===training.id)||training;$('builderSheets').open=true;openSheet(data.id,true);
  });
 };
 const oldCatalog=renderCatalog;renderCatalog=function(...args){catalog.sort((a,b)=>Number(a.is_archived===true)-Number(b.is_archived===true)||a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'}));return oldCatalog(...args);};$('exerciseSearch').oninput=renderCatalog;
 const oldRender=renderTrainings;renderTrainings=function(...args){oldRender(...args);refresh();};
 const oldLoad=load;load=async function(...args){await oldLoad(...args);refresh();renderCatalog();};
 const tab=document.querySelector('[data-view="trainings"]'),click=tab.onclick;tab.onclick=function(event){click?.call(this,event);renderCatalog();};
 refresh();renderTrainings();renderCatalog();
})();



