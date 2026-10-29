/* Additive registration UI; existing daily entries and legacy states remain intact. */
(()=>{
const pairs=[['Afiada','Nebulosa','Clareza e agilidade'],['Focada','Dispersa','Atenção'],['Organizada','Travada','Organização e ação'],['Descansada','Exausta','Fôlego mental']];
const habits=['Trabalho','Treino','Leitura','Amigos','Família','Descanso','Ar livre','Skincare','Água'];
let details={},pendingPhoto=null,photoReady=true,saving=false,openVersion=0;
const card=$('modal').querySelector('.modal-card');card.classList.add('registration-card');
const moods=['radiante','de boa','meh','tristinha','terrível'];
// Low-set features and rounded strokes keep the five moods legible at small sizes.
const face=(i)=>{
 const expressions=[
  '<path d="M8 27q3-2 5 1M35 28q2-3 5-1"/><path d="M16 31h16c-1 10-15 10-16 0Z" fill="var(--face-ink,#202b2b)"/><path d="M19 36q5-3 10 0" stroke="currentColor" stroke-width="2.5"/>',
  '<circle cx="12" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><circle cx="36" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><path d="M20 32q4 4 8 0"/>',
  '<circle cx="12" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><circle cx="36" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><path d="M18.5 32.5h11"/>',
  '<path d="M9 20q2-2.5 4-1M35 19q2-1.5 4 1"/><circle cx="12" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><circle cx="36" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><path d="M18 36c0-8 12-8 12 0"/>',
  '<path d="M12 18q0 3-3 3M36 18q0 3 3 3M10 25l5 3-5 1.5M38 25l-5 3 5 1.5M18 36c0-8 12-8 12 0"/>'
 ][i];
 return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="currentColor"/><g fill="none" stroke="var(--face-ink,#202b2b)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${expressions}</g></svg>`;
};
const icons=['◈','↗','▤','♧','♡','☾','☀','✧','◉'];
const intro=document.createElement('div');intro.className='registration';intro.innerHTML=`<h3>como está?</h3><div class="mood-faces" role="group" aria-label="Humor">${moods.map((m,i)=>`<button type="button" data-mood="${100-i*25}" aria-pressed="false">${face(i)}<span>${m}</span></button>`).join('')}</div><h3>como tá a mente?</h3><div class="mind-pairs">${pairs.map(([a,b,label],i)=>`<div><small>${label}</small><div class="mind-pair" role="group" aria-label="${label}"><button type="button" data-mind="${a}" data-pair="${i}">${a}</button><button type="button" data-mind="${b}" data-pair="${i}">${b}</button></div></div>`).join('')}</div><h3>o que teve no dia?</h3><div class="habit-pills">${habits.map((h,i)=>`<button type="button" data-habit="${h}" aria-pressed="false"><i aria-hidden="true">${icons[i]}</i><span>${h}</span></button>`).join('')}</div>`;
card.querySelector('.modal-head').after(intro);
$('joy').previousElementSibling.textContent='Uma coisa boa do dia · opcional';$('note').previousElementSibling.textContent='Anotações · opcional';$('joy').placeholder='O que vale guardar de hoje?';
const photo=document.createElement('div');photo.className='reg-photo';photo.innerHTML='<label class="reg-photo-button">＋ Adicionar foto<input id="regPhotoFile" type="file" accept="image/*" hidden></label><p class="reg-muted">Galeria ou câmera · opcional</p><img id="regPhotoPreview" alt="Foto da coisa boa do dia" hidden><button id="regPhotoRemove" type="button" class="reg-clear" hidden>Remover foto</button><p id="regPhotoStatus" role="status"></p>';
$('joy').parentElement.after(photo);
const journal=document.createElement('section');journal.className='reg-journal';
journal.innerHTML='<h3>pra não esquecer</h3><div class="journal-sheet"><div class="journal-toolbar"><button type="button" id="journalPlace" aria-label="Adicionar lugar" title="Lugar"><svg viewBox="0 0 24 24"><path d="m3 10 18-7-7 18-3-8-8-3Z"/></svg></button><button type="button" id="journalCamera" aria-label="Adicionar foto" title="Foto"><svg viewBox="0 0 24 24"><path d="M3 7h5l2-3h4l2 3h5v13H3Z"/><circle cx="12" cy="13" r="4"/></svg></button><button type="button" id="journalTag" aria-label="Adicionar etiquetas" title="Etiquetas"><svg viewBox="0 0 24 24"><path d="m3 13 10-10h8v8L11 21Z"/><circle cx="17" cy="7" r="1"/></svg></button><input id="journalTime" type="time" aria-label="Horário da anotação"></div><div class="journal-context"><input id="journalPlaceText" placeholder="Lugar · opcional" aria-label="Lugar" maxlength="160" hidden><input id="journalTagsText" placeholder="Etiquetas separadas por vírgula" aria-label="Etiquetas" maxlength="300" hidden></div></div>';
photo.before(journal);
const sheet=journal.querySelector('.journal-sheet'),noteField=$('note').closest('.field');
noteField.querySelector('label').hidden=true;sheet.appendChild(noteField);sheet.appendChild(photo);
$('note').placeholder='O que vale guardar de hoje?';
$('journalCamera').onclick=()=>{if(editing&&!saving)$('regPhotoFile').click();};
$('journalPlace').onclick=()=>{const el=$('journalPlaceText');el.hidden=!el.hidden;if(!el.hidden)el.focus();};
$('journalTag').onclick=()=>{const el=$('journalTagsText');el.hidden=!el.hidden;if(!el.hidden)el.focus();};
$('journalPlaceText').oninput=()=>{details.place=$('journalPlaceText').value.trim();};
$('journalTagsText').oninput=()=>{details.tags=$('journalTagsText').value.split(',').map(x=>x.trim()).filter(Boolean);};
$('journalTime').oninput=()=>{details.note_time=$('journalTime').value;};

// Keep the old controls for records made before this form, and preserve all their values.
$('mindTrigger').closest('.field').hidden=true;
const soulField=$('soulTrigger').closest('.field');const legacy=document.createElement('details');legacy.className='reg-legacy';legacy.hidden=true;legacy.innerHTML='<summary>Outros sentimentos · alma</summary>';soulField.before(legacy);legacy.appendChild(soulField);
const register=document.createElement('button');register.type='button';register.textContent='Registrar';register.id='registerEntry';document.querySelector('.view-switch').prepend(register);register.onclick=()=>{if(user)openModal(today());};
const paint=()=>{
 document.querySelectorAll('[data-mind]').forEach(b=>{b.classList.toggle('selected',mindStates.has(b.dataset.mind));b.setAttribute('aria-pressed',String(mindStates.has(b.dataset.mind)));b.disabled=!editing||saving;});
 document.querySelectorAll('[data-habit]').forEach(b=>{const on=(details.habits||[]).includes(b.dataset.habit);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));b.disabled=!editing||saving;});
 intro.querySelectorAll('[data-mood]').forEach(b=>{const on=details.mood!=null&&Number(b.dataset.mood)===Math.round(details.mood/25)*25;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));b.disabled=!editing||saving;});
 ['regPhotoFile','regPhotoRemove','journalCamera','journalPlace','journalTag','journalPlaceText','journalTagsText','journalTime'].forEach(id=>$(id).disabled=!editing||saving);
 $('regPhotoRemove').hidden=!details.photo_path&&!pendingPhoto;

};
const priorEditing=setEditing;setEditing=function(...args){priorEditing(...args);paint();};
const priorOpen=openModal;openModal=function(date){if(saving)return;const version=++openVersion;details=structuredClone(items.find(x=>x.checkin_date===date)?.entry_details||{});pendingPhoto=null;photoReady=true;priorOpen(date);$('modalTitle').textContent='Seu check-in';$('journalTime').value=details.note_time||new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date());$('journalPlaceText').value=details.place||'';$('journalPlaceText').hidden=!details.place;$('journalTagsText').value=(details.tags||[]).join(', ');$('journalTagsText').hidden=!(details.tags||[]).length;$('regPhotoFile').value='';$('regPhotoPreview').hidden=true;$('regPhotoStatus').textContent='';paint();if(details.photo_path)sb.storage.from('checkin-photos').createSignedUrl(details.photo_path,3600).then(({data,error})=>{if(version!==openVersion||pendingPhoto||!details.photo_path)return;if(error){$('regPhotoStatus').textContent='Não consegui carregar a foto.';return;}$('regPhotoPreview').src=data.signedUrl;$('regPhotoPreview').hidden=false;});};
intro.querySelectorAll('[data-mind]').forEach(b=>b.onclick=()=>{if(!editing||saving)return;const selected=mindStates.has(b.dataset.mind);pairs[Number(b.dataset.pair)].slice(0,2).forEach(v=>mindStates.delete(v));if(!selected)mindStates.add(b.dataset.mind);paint();});
intro.querySelectorAll('[data-habit]').forEach(b=>b.onclick=()=>{if(!editing||saving)return;const hs=new Set(details.habits||[]);hs.has(b.dataset.habit)?hs.delete(b.dataset.habit):hs.add(b.dataset.habit);details.habits=[...hs];paint();});
intro.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{if(!editing||saving)return;details.mood=Number(b.dataset.mood);paint();});

async function compress(file){if(file.size>25*1024*1024)throw Error('Escolha uma foto de até 25 MB.');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const ratio=Math.min(1,1600/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Não consegui preparar a foto.')),'image/jpeg',.85));}finally{URL.revokeObjectURL(url);}}
$('regPhotoFile').onchange=async()=>{const file=$('regPhotoFile').files[0];if(!file)return;const version=openVersion;photoReady=false;$('regPhotoStatus').textContent='Preparando foto…';$('save').disabled=true;try{const blob=await compress(file);if(version!==openVersion)return;pendingPhoto=blob;$('regPhotoPreview').src=URL.createObjectURL(blob);$('regPhotoPreview').hidden=false;$('regPhotoStatus').textContent='Foto pronta para salvar.';}catch(e){if(version===openVersion)$('regPhotoStatus').textContent=e.message;}finally{if(version===openVersion){photoReady=true;$('save').disabled=false;paint();}}};
$('regPhotoRemove').onclick=()=>{pendingPhoto=null;delete details.photo_path;$('regPhotoPreview').hidden=true;$('regPhotoFile').value='';paint();};
$('save').textContent='Salvar check-in';
$('save').onclick=async()=>{if(saving||!editing||!photoReady||!user)return;

 saving=true;paint();$('save').disabled=true;$('save').textContent='Salvando…';let uploaded=null,persisted=false;const old=items.find(x=>x.checkin_date===selectedDate);try{
 if(pendingPhoto){uploaded=`${user.id}/${selectedDate}/${crypto.randomUUID()}.jpg`;const {error}=await sb.storage.from('checkin-photos').upload(uploaded,pendingPhoto,{contentType:'image/jpeg',upsert:false});if(error)throw Error('Não consegui enviar a foto. Seu texto continua aqui.');}
 const next={...details,note_time:$('journalTime').value,...(uploaded?{photo_path:uploaded}:{})};const payload={user_id:user.id,checkin_date:selectedDate,mind_states:[...mindStates],soul_states:[...soulStates],joy_reason:$('joy').value.trim()||null,note:$('note').value.trim()||null,entry_details:next,updated_at:new Date().toISOString()};
 const {error}=await sb.from('daily_checkins').upsert(payload,{onConflict:'user_id,checkin_date'});if(error)throw Error('Não consegui salvar. Seus campos continuam aqui para tentar novamente.');persisted=true;details=next;pendingPhoto=null;
 if(old?.entry_details?.photo_path&&old.entry_details.photo_path!==next.photo_path)await sb.storage.from('checkin-photos').remove([old.entry_details.photo_path]);
 await load();setEditing(false,true);$('regPhotoStatus').textContent='Check-in salvo.';
 }catch(e){if(uploaded&&!persisted)await sb.storage.from('checkin-photos').remove([uploaded]);alert(e.message);}finally{saving=false;$('save').disabled=false;$('save').textContent='Salvar check-in';paint();}};
const priorClose=closeModal;closeModal=function(){if(saving)return;openVersion++;priorClose();};$('closeModal').onclick=closeModal;$('modalBackdrop').onclick=closeModal;
$('edit').onclick=()=>setEditing(true,true);
})();

