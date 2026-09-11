const EXERCISE_TYPES=['Superior','Inferior','Core'];
const MUSCLE_GROUPS=['Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posterior de coxa','Glúteos','Adutores','Abdutores','Panturrilha','Abdômen'];

function exerciseGroups(e={}){return [...new Set((e.muscle_groups||[]).filter(Boolean))]}
function exerciseTags(e={}){return [e.exercise_type,...exerciseGroups(e)].filter(Boolean)}

function multiSelectHtml(id,items,selected=[],placeholder='Selecionar',opts={}){
  const set=new Set(selected), searchable=!!opts.searchable, columns=opts.columns||1;
  const selectedLabels=items.filter(i=>set.has(i.value)).map(i=>i.label);
  return `<div class="multi-select" id="${id}" data-placeholder="${esc(placeholder)}" data-columns="${columns}">
    <button type="button" class="multi-trigger" aria-expanded="false">
      <span class="multi-summary">${selectedLabels.length?selectedLabels.map(x=>`<span class="multi-chip">${esc(x)}</span>`).join(''):`<span class="multi-placeholder">${esc(placeholder)}</span>`}</span>
      <svg class="multi-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="multi-menu" hidden>
      ${searchable?`<div class="multi-search-wrap"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m13.3 13.3 3.2 3.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><input class="multi-search" type="search" placeholder="Buscar"></div>`:''}
      <div class="multi-options">${items.map(item=>`<label class="multi-option" data-label="${esc(item.label.toLowerCase())}"><input type="checkbox" value="${esc(item.value)}" ${set.has(item.value)?'checked':''}><span class="multi-check"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 10.2 2.8 2.8 6.2-6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="multi-option-label">${esc(item.label)}</span></label>`).join('')}</div>
    </div>
  </div>`;
}

function bindMultiSelect(id,placeholder='Selecionar'){
  const root=$(id);if(!root)return;
  const trigger=root.querySelector('.multi-trigger'),menu=root.querySelector('.multi-menu'),summary=root.querySelector('.multi-summary'),search=root.querySelector('.multi-search');
  const refresh=()=>{
    const selected=[...menu.querySelectorAll('input:checked')].map(x=>x.closest('.multi-option').querySelector('.multi-option-label').textContent);
    summary.innerHTML=selected.length?selected.map(x=>`<span class="multi-chip">${esc(x)}</span>`).join(''):`<span class="multi-placeholder">${esc(placeholder)}</span>`;
  };
  const closeOthers=()=>{document.querySelectorAll('.multi-menu').forEach(m=>{if(m!==menu)m.hidden=true});document.querySelectorAll('.multi-trigger').forEach(b=>{if(b!==trigger)b.setAttribute('aria-expanded','false')})};
  trigger.onclick=e=>{e.stopPropagation();const opening=menu.hidden;closeOthers();menu.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));if(opening&&search)setTimeout(()=>search.focus(),0)};
  menu.onclick=e=>e.stopPropagation();
  menu.querySelectorAll('input[type=checkbox]').forEach(i=>i.onchange=refresh);
  if(search) search.oninput=()=>{const q=search.value.trim().toLowerCase();menu.querySelectorAll('.multi-option').forEach(o=>o.hidden=!!q&&!o.dataset.label.includes(q))};
  refresh();
}
document.addEventListener('click',()=>{document.querySelectorAll('.multi-menu').forEach(m=>m.hidden=true);document.querySelectorAll('.multi-trigger').forEach(b=>b.setAttribute('aria-expanded','false'))});
function multiValues(id){const root=$(id);return root?[...root.querySelectorAll('.multi-menu input:checked')].map(x=>x.value):[]}

function exerciseFormHtml(e={}){
  const typeOptions=EXERCISE_TYPES.map(t=>`<option value="${esc(t)}" ${e.exercise_type===t?'selected':''}>${esc(t)}</option>`).join('');
  return `<label class="field"><span>nome</span><input id="fName" value="${esc(e.name||'')}" placeholder="Leg Press 45°"></label>
  <label class="field"><span>tipo</span><select id="fType"><option value="">Selecione</option>${typeOptions}</select></label>
  <div class="field"><span>grupo(s) muscular(es)</span>${multiSelectHtml('fGroupsMulti',MUSCLE_GROUPS.map(x=>({value:x,label:x})),exerciseGroups(e),'Selecionar músculos',{columns:2})}</div>
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
  form('ficha','Adicionar exercícios',`<div class="field"><span>exercícios</span>${multiSelectHtml('fExercisesMulti',items,[],'Selecionar exercícios',{searchable:true})}</div><label class="field"><span>séries</span><input id="fSets" type="number" value="3"></label><label class="field"><span>repetições</span><input id="fReps" value="10" placeholder="8–12"></label>`,async()=>{
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
  .multi-select{position:relative;width:100%}.multi-trigger{width:100%;min-height:44px;padding:8px 11px;border:1px solid var(--border,#343434);border-radius:12px;background:var(--surface,#202020);color:inherit;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;cursor:pointer}.multi-trigger[aria-expanded="true"]{border-color:#777}.multi-summary{display:flex;flex-wrap:wrap;gap:6px;min-width:0;align-items:center}.multi-placeholder{opacity:.55}.multi-chip{display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border-radius:999px;background:rgba(127,127,127,.13);font-size:12px;line-height:1.2}.multi-chevron{width:18px;height:18px;flex:none;opacity:.6;transition:transform .15s}.multi-trigger[aria-expanded="true"] .multi-chevron{transform:rotate(180deg)}
  .multi-menu{position:absolute;z-index:100;left:0;right:0;top:calc(100% + 6px);max-height:310px;overflow:hidden;padding:7px;border:1px solid var(--border,#343434);border-radius:13px;background:#1f1f1f;box-shadow:0 18px 50px rgba(0,0,0,.45)}
  .multi-search-wrap{height:38px;margin-bottom:6px;padding:0 10px;border:1px solid #373737;border-radius:10px;display:flex;align-items:center;gap:8px;background:#191919}.multi-search-wrap svg{width:16px;height:16px;opacity:.55;flex:none}.multi-search{width:100%;border:0!important;background:transparent!important;padding:0!important;outline:0!important;color:inherit!important;font:inherit}.multi-options{display:grid;grid-template-columns:repeat(var(--multi-cols,1),minmax(0,1fr));gap:3px;max-height:250px;overflow:auto;padding:1px}.multi-select[data-columns="2"] .multi-options{--multi-cols:2}
  .multi-option{display:flex;align-items:center;gap:9px;min-height:38px;padding:8px 9px;border-radius:9px;cursor:pointer;user-select:none}.multi-option:hover{background:rgba(127,127,127,.1)}.multi-option:has(input:checked){background:rgba(181,101,118,.13)}.multi-option input{position:absolute;opacity:0;pointer-events:none}.multi-check{width:18px;height:18px;border:1px solid #555;border-radius:5px;display:grid;place-items:center;flex:none;color:white}.multi-check svg{width:14px;height:14px;opacity:0}.multi-option input:checked + .multi-check{background:#b56576;border-color:#b56576}.multi-option input:checked + .multi-check svg{opacity:1}.multi-option-label{min-width:0;font-size:13px;line-height:1.25}.field:has(.multi-select){overflow:visible}
  @media(max-width:700px){.multi-menu{position:fixed;left:16px;right:16px;top:auto;bottom:18px;max-height:55vh}.multi-options{max-height:42vh}.multi-select[data-columns="2"] .multi-options{--multi-cols:1}}
  `;document.head.appendChild(style);
}

$('exerciseSearch').oninput=renderCatalog;
setTimeout(()=>{if(document.getElementById('catalog')?.classList.contains('active'))renderCatalog()},0);
