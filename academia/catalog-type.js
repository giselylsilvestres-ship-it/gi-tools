const EXERCISE_TYPES=['Superior','Inferior','Core'];
const MUSCLE_GROUPS=['Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posterior de coxa','Glúteos','Adutores','Abdutores','Panturrilha','Abdômen'];

function exerciseGroups(e={}){return [...new Set((e.muscle_groups||[]).filter(Boolean))]}
function exerciseTags(e={}){return [e.exercise_type,...exerciseGroups(e)].filter(Boolean)}

function multiSelectHtml(id,items,selected=[],placeholder='Selecionar'){
  const set=new Set(selected);
  return `<div class="multi-select" id="${id}">
    <button type="button" class="multi-trigger" aria-expanded="false"><span class="multi-value">${set.size?esc([...set].join(' · ')):placeholder}</span><span class="multi-chevron">⌄</span></button>
    <div class="multi-menu" hidden>${items.map(item=>`<label class="multi-option"><input type="checkbox" value="${esc(item.value)}" ${set.has(item.value)?'checked':''}><span>${esc(item.label)}</span></label>`).join('')}</div>
  </div>`;
}
function bindMultiSelect(id,placeholder='Selecionar'){
  const root=$(id);if(!root)return;
  const trigger=root.querySelector('.multi-trigger'),menu=root.querySelector('.multi-menu'),value=root.querySelector('.multi-value');
  const refresh=()=>{const vals=[...menu.querySelectorAll('input:checked')].map(x=>x.closest('label').querySelector('span').textContent);value.textContent=vals.length?vals.join(' · '):placeholder;};
  trigger.onclick=e=>{e.stopPropagation();const willOpen=menu.hidden;document.querySelectorAll('.multi-menu').forEach(m=>m.hidden=true);document.querySelectorAll('.multi-trigger').forEach(b=>b.setAttribute('aria-expanded','false'));menu.hidden=!willOpen;trigger.setAttribute('aria-expanded',String(willOpen));};
  menu.onclick=e=>e.stopPropagation();menu.querySelectorAll('input').forEach(i=>i.onchange=refresh);refresh();
}
document.addEventListener('click',()=>{document.querySelectorAll('.multi-menu').forEach(m=>m.hidden=true);document.querySelectorAll('.multi-trigger').forEach(b=>b.setAttribute('aria-expanded','false'))});
function multiValues(id){const root=$(id);return root?[...root.querySelectorAll('.multi-menu input:checked')].map(x=>x.value):[]}

function exerciseFormHtml(e={}){
  const typeOptions=EXERCISE_TYPES.map(t=>`<option value="${esc(t)}" ${e.exercise_type===t?'selected':''}>${esc(t)}</option>`).join('');
  return `<label class="field"><span>nome</span><input id="fName" value="${esc(e.name||'')}" placeholder="Leg Press 45°"></label>
  <label class="field"><span>tipo</span><select id="fType"><option value="">Selecione</option>${typeOptions}</select></label>
  <div class="field"><span>grupo(s) muscular(es)</span>${multiSelectHtml('fGroupsMulti',MUSCLE_GROUPS.map(x=>({value:x,label:x})),exerciseGroups(e),'Selecionar músculos')}</div>
  <label class="field"><span>equipamento</span><input id="fEquipment" value="${esc(e.equipment||'')}" placeholder="Leg press"></label>
  <label class="field"><span>observação</span><textarea id="fNotes" placeholder="Opcional">${esc(e.notes||'')}</textarea></label>
  <label class="field"><span>foto</span><input id="fImageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
  ${e.image_url?'<small class="meta">A foto atual será mantida se você não enviar outra.</small>':''}`;
}

function readExerciseFields(){
  return {name:$('fName').value.trim(),exercise_type:$('fType').value||null,muscle_groups:multiValues('fGroupsMulti'),primary_muscles:[],secondary_muscles:[],equipment:$('fEquipment').value.trim()||null,notes:$('fNotes').value.trim()||null};
}

function renderCatalog(){
  const q=$('exerciseSearch').value.toLowerCase();
  const items=catalog.filter(e=>[e.name,e.exercise_type,...exerciseGroups(e)].join(' ').toLowerCase().includes(q));
  $('catalogList').innerHTML=items.map(e=>`<button class="catalog-card" data-exercise="${e.id}"><span class="catalog-thumb">${e.image_url?`<img src="${esc(e.image_url)}" alt="${esc(e.name)}">`:'⌁'}</span><span class="catalog-copy"><strong>${esc(e.name)}</strong><span class="tags">${exerciseTags(e).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</span><span class="meta">${esc(e.equipment||'')}</span></span></button>`).join('')||'<div class="meta">Nenhum exercício cadastrado.</div>';
  $('catalogList').querySelectorAll('[data-exercise]').forEach(b=>b.onclick=()=>openExerciseDetail(b.dataset.exercise));
}

function openExerciseDetail(id){
  currentExercise=catalog.find(x=>x.id===id);if(!currentExercise)return;
  $('exerciseDetailTitle').textContent=currentExercise.name;
  $('exerciseDetailTags').innerHTML=exerciseTags(currentExercise).map(x=>`<span class="tag">${esc(x)}</span>`).join('');
  $('exerciseDetailEquipment').textContent=currentExercise.equipment||'';
  const wrap=$('exerciseDetailImageWrap');
  if(currentExercise.image_url){$('exerciseDetailImage').src=currentExercise.image_url;$('exerciseDetailImage').alt=currentExercise.name;wrap.hidden=false}else{wrap.hidden=true;$('exerciseDetailImage').removeAttribute('src')}
  const st=exerciseStats(id);$('exerciseBest').textContent=fmtKg(st.best);$('exerciseLast').textContent=fmtKg(st.last);$('exerciseAvg').textContent=fmtKg(st.avg);
  const notes=$('exerciseDetailNotes');if(currentExercise.notes){notes.textContent=currentExercise.notes;notes.hidden=false}else notes.hidden=true;
  open('exerciseModal');
}

const originalForm=form;
form=(eyebrow,title,html,save)=>{originalForm(eyebrow,title,html,save);setTimeout(()=>bindMultiSelect('fGroupsMulti','Selecionar músculos'),0)};

$('addCatalogExercise').onclick=()=>{
  const items=catalog.map(e=>({value:e.id,label:e.name}));
  form('ficha','Adicionar exercícios',`<div class="field"><span>exercícios</span>${multiSelectHtml('fExercisesMulti',items,[],'Selecionar exercícios')}</div><label class="field"><span>séries</span><input id="fSets" type="number" value="3"></label><label class="field"><span>repetições</span><input id="fReps" value="10" placeholder="8–12"></label>`,async()=>{
    const ids=multiValues('fExercisesMulti');if(!ids.length)return;
    const existing=new Set(sheetLinks(currentSheet.id).map(x=>x.exercise_id));
    const base=sheetLinks(currentSheet.id).length,sets=Number($('fSets').value)||3,reps=$('fReps').value||'10';
    const rows=ids.filter(id=>!existing.has(id)).map((id,i)=>({user_id:user.id,sheet_id:currentSheet.id,exercise_id:id,name:catalog.find(e=>e.id===id)?.name||'',sets,reps,sort_order:base+i}));
    if(rows.length){const r=await sb.from('gym_sheet_exercises').insert(rows);if(r.error){console.error(r.error);return alert('Não consegui adicionar os exercícios.')}}
    close('formModal');await load();openSheet(currentSheet.id);
  });
  setTimeout(()=>bindMultiSelect('fExercisesMulti','Selecionar exercícios'),0);
};

if(!document.getElementById('multiSelectStyles')){
  const style=document.createElement('style');style.id='multiSelectStyles';style.textContent=`
  .multi-select{position:relative}.multi-trigger{width:100%;min-height:42px;padding:10px 12px;border:1px solid var(--border,#333);border-radius:12px;background:var(--surface,#202020);color:inherit;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left}.multi-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit}.multi-chevron{opacity:.65}.multi-menu{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 6px);max-height:260px;overflow:auto;padding:6px;border:1px solid var(--border,#333);border-radius:12px;background:var(--surface,#202020);box-shadow:0 14px 40px rgba(0,0,0,.28)}.multi-option{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer}.multi-option:hover{background:rgba(127,127,127,.1)}.multi-option input{width:16px;height:16px;margin:0;flex:0 0 auto}.multi-option span{min-width:0}.field:has(.multi-select){overflow:visible}`;document.head.appendChild(style);
}

$('exerciseSearch').oninput=renderCatalog;
setTimeout(()=>{if(document.getElementById('catalog')?.classList.contains('active'))renderCatalog()},0);
