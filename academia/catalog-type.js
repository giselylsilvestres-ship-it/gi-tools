const EXERCISE_TYPES=['Quadríceps','Posterior de coxa','Abdutores','Glúteos','Abdômen / Core','Peito','Costas','Ombros','Tríceps','Bíceps'];

function workedMuscles(e={}){return [...new Set([...(e.primary_muscles||[]),...(e.secondary_muscles||[])].filter(Boolean))]}

function exerciseFormHtml(e={}){
  const options=EXERCISE_TYPES.map(t=>`<option value="${esc(t)}" ${e.exercise_type===t?'selected':''}>${esc(t)}</option>`).join('');
  return `<label class="field"><span>nome</span><input id="fName" value="${esc(e.name||'')}" placeholder="Leg Press 45°"></label>
  <label class="field"><span>tipo</span><select id="fType"><option value="">Selecione</option>${options}</select></label>
  <label class="field"><span>músculos trabalhados</span><input id="fPrimary" value="${esc(workedMuscles(e).join(', '))}" placeholder="Quadríceps, Glúteos"></label>
  <label class="field"><span>equipamento</span><input id="fEquipment" value="${esc(e.equipment||'')}" placeholder="Leg press"></label>
  <label class="field"><span>observação</span><textarea id="fNotes" placeholder="Opcional">${esc(e.notes||'')}</textarea></label>
  <label class="field"><span>foto</span><input id="fImageFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
  ${e.image_url?'<small class="meta">A foto atual será mantida se você não enviar outra.</small>':''}`;
}

function readExerciseFields(){
  const muscles=$('fPrimary').value.split(',').map(x=>x.trim()).filter(Boolean);
  return {name:$('fName').value.trim(),exercise_type:$('fType').value||null,muscle_groups:[],primary_muscles:muscles,secondary_muscles:[],equipment:$('fEquipment').value.trim()||null,notes:$('fNotes').value.trim()||null};
}

function renderCatalog(){
  const q=$('exerciseSearch').value.toLowerCase();
  const items=catalog.filter(e=>[e.name,e.exercise_type,...workedMuscles(e)].join(' ').toLowerCase().includes(q));
  $('catalogList').innerHTML=items.map(e=>`<button class="catalog-card" data-exercise="${e.id}"><span class="catalog-thumb">${e.image_url?`<img src="${esc(e.image_url)}" alt="${esc(e.name)}">`:'⌁'}</span><span class="catalog-copy"><strong>${esc(e.name)}</strong><span class="tags">${e.exercise_type?`<span class="tag">${esc(e.exercise_type)}</span>`:''}${workedMuscles(e).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</span><span class="meta">${esc(e.equipment||'')}</span></span></button>`).join('')||'<div class="meta">Nenhum exercício cadastrado.</div>';
  $('catalogList').querySelectorAll('[data-exercise]').forEach(b=>b.onclick=()=>openExerciseDetail(b.dataset.exercise));
}

function openExerciseDetail(id){
  currentExercise=catalog.find(x=>x.id===id);if(!currentExercise)return;
  $('exerciseDetailTitle').textContent=currentExercise.name;
  const tags=[currentExercise.exercise_type,...workedMuscles(currentExercise)].filter(Boolean);
  $('exerciseDetailTags').innerHTML=[...new Set(tags)].map(x=>`<span class="tag">${esc(x)}</span>`).join('');
  $('exerciseDetailEquipment').textContent=currentExercise.equipment||'';
  const wrap=$('exerciseDetailImageWrap');
  if(currentExercise.image_url){$('exerciseDetailImage').src=currentExercise.image_url;$('exerciseDetailImage').alt=currentExercise.name;wrap.hidden=false}else{wrap.hidden=true;$('exerciseDetailImage').removeAttribute('src')}
  const st=exerciseStats(id);$('exerciseBest').textContent=fmtKg(st.best);$('exerciseLast').textContent=fmtKg(st.last);$('exerciseAvg').textContent=fmtKg(st.avg);
  const notes=$('exerciseDetailNotes');if(currentExercise.notes){notes.textContent=currentExercise.notes;notes.hidden=false}else notes.hidden=true;
  open('exerciseModal');
}

$('exerciseSearch').oninput=renderCatalog;
setTimeout(()=>{if(document.getElementById('catalog')?.classList.contains('active'))renderCatalog()},0);
