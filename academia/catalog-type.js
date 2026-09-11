const EXERCISE_TYPES=['Superior','Inferior','Core'];
const MUSCLE_GROUPS=['Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posterior','Glúteos','Adutores','Abdutores','Panturrilha','Abdômen'];

function exerciseGroup(e={}){return (e.muscle_groups||[])[0]||''}
function exerciseTags(e={}){return [e.exercise_type,exerciseGroup(e)].filter(Boolean)}

function exerciseFormHtml(e={}){
  const typeOptions=EXERCISE_TYPES.map(t=>`<option value="${esc(t)}" ${e.exercise_type===t?'selected':''}>${esc(t)}</option>`).join('');
  const group=exerciseGroup(e);
  const groupOptions=MUSCLE_GROUPS.map(g=>`<option value="${esc(g)}" ${group===g?'selected':''}>${esc(g)}</option>`).join('');
  return `<label class="field"><span>nome</span><input id="fName" value="${esc(e.name||'')}" placeholder="Leg Press 45°"></label>
  <label class="field"><span>tipo</span><select id="fType"><option value="">Selecione</option>${typeOptions}</select></label>
  <label class="field"><span>grupo muscular</span><select id="fGroup"><option value="">Selecione</option>${groupOptions}</select></label>
  <label class="field"><span>equipamento</span><input id="fEquipment" value="${esc(e.equipment||'')}" placeholder="Leg press"></label>
  <label class="field"><span>observação</span><textarea id="fNotes" placeholder="Opcional">${esc(e.notes||'')}</textarea></label>
  <label class="field"><span>foto</span><input id="fImageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
  ${e.image_url?'<small class="meta">A foto atual será mantida se você não enviar outra.</small>':''}`;
}

function readExerciseFields(){
  const group=$('fGroup').value;
  return {name:$('fName').value.trim(),exercise_type:$('fType').value||null,muscle_groups:group?[group]:[],equipment:$('fEquipment').value.trim()||null,notes:$('fNotes').value.trim()||null};
}

function renderCatalog(){
  const q=$('exerciseSearch').value.toLowerCase();
  const items=catalog.filter(e=>[e.name,e.exercise_type,exerciseGroup(e)].join(' ').toLowerCase().includes(q));
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

$('exerciseSearch').oninput=renderCatalog;
setTimeout(()=>{if(document.getElementById('catalog')?.classList.contains('active'))renderCatalog()},0);
