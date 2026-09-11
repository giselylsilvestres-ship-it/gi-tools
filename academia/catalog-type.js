const EXERCISE_TYPES=['Superior','Inferior','Core'];
const MUSCLE_GROUPS=['Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posterior de coxa','Glúteos','Adutores','Abdutores','Panturrilha','Abdômen'];

function exerciseGroups(e={}){return [...new Set((e.muscle_groups||[]).filter(Boolean))]}
function exerciseTags(e={}){return [e.exercise_type,...exerciseGroups(e)].filter(Boolean)}

function exerciseFormHtml(e={}){
  const typeOptions=EXERCISE_TYPES.map(t=>`<option value="${esc(t)}" ${e.exercise_type===t?'selected':''}>${esc(t)}</option>`).join('');
  const selected=new Set(exerciseGroups(e));
  const groupChecks=MUSCLE_GROUPS.map(g=>`<label style="display:flex;gap:8px;align-items:center"><input class="fGroupCheck" type="checkbox" value="${esc(g)}" ${selected.has(g)?'checked':''}> <span>${esc(g)}</span></label>`).join('');
  return `<label class="field"><span>nome</span><input id="fName" value="${esc(e.name||'')}" placeholder="Leg Press 45°"></label>
  <label class="field"><span>tipo</span><select id="fType"><option value="">Selecione</option>${typeOptions}</select></label>
  <div class="field"><span>grupo(s) muscular(es)</span><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;padding-top:6px">${groupChecks}</div></div>
  <label class="field"><span>equipamento</span><input id="fEquipment" value="${esc(e.equipment||'')}" placeholder="Leg press"></label>
  <label class="field"><span>observação</span><textarea id="fNotes" placeholder="Opcional">${esc(e.notes||'')}</textarea></label>
  <label class="field"><span>foto</span><input id="fImageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
  ${e.image_url?'<small class="meta">A foto atual será mantida se você não enviar outra.</small>':''}`;
}

function readExerciseFields(){
  const groups=[...document.querySelectorAll('.fGroupCheck:checked')].map(x=>x.value);
  return {name:$('fName').value.trim(),exercise_type:$('fType').value||null,muscle_groups:groups,primary_muscles:[],secondary_muscles:[],equipment:$('fEquipment').value.trim()||null,notes:$('fNotes').value.trim()||null};
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

$('exerciseSearch').oninput=renderCatalog;
setTimeout(()=>{if(document.getElementById('catalog')?.classList.contains('active'))renderCatalog()},0);
