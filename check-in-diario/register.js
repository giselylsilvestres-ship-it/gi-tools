/* Additive registration UI; existing daily entries and legacy states remain intact. */
(()=>{
const pairs=[['Afiada','Nebulosa','Clareza e agilidade'],['Focada','Dispersa','Atenção'],['Organizada','Travada','Organização e ação'],['Descansada','Exausta','Fôlego mental']];
const habitRows=[
 ['Comida','Água','Exercício','Dormi'],
 ['Amor','Família','Amigos','Inspiradores'],
 ['Livro','Costura','Estudo','Arte'],
 ['Casa','Trabalho','Finanças','Escrita'],
 ['Meditação','Reflexão','Fé','Natureza'],
 ['Skin care','Cabelo','Massagem']
];
const habits=habitRows.flat();
const aliases={'Espiritualidade':'Fé','Treino':'Exercício','Leitura':'Livro','Ar livre':'Natureza','Skincare':'Skin care'};
const habitPaths=[
 'M5 3v7m3-7v7M3 7h7m-4 3v11M17 3v18m0-18c-5 4-5 9 0 9',
 'M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13Z',
 'm6 6 12 12M3 8l5-5m8 18 5-5M2 5l3-3m14 20 3-3',
 'M19 15A8 8 0 0 1 9 4a8 8 0 1 0 10 11Z',
 'M20 5c-4-4-8 1-8 1S8 1 4 5c-5 5 8 15 8 15S25 10 20 5Z',
 'M3 20v-6c0-4 7-4 7 0v6m4 0v-6c0-4 7-4 7 0v6M7 7a3 3 0 1 0 0-.1M17 7a3 3 0 1 0 0-.1',
 'M2 21v-4c0-5 9-5 9 0v4m2 0v-4c0-5 9-5 9 0v4M7 7a3 3 0 1 0 0-.1M17 7a3 3 0 1 0 0-.1',
 'm12 2 2.5 6 6.5 1-5 4.5 1.5 6.5-5.5-3.5L6.5 20 8 13.5 3 9l6.5-1Z',
 'M12 5v16M3 3c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2Z',
 'm5 19 13-13c4-4 6 0 2 3L7 22ZM6 4c-7 7 8 5 1 12',
 'm2 8 10-5 10 5-10 5Zm4 3v6q6 6 12 0v-6M22 8v9',
 'M12 3C0 3 0 21 12 21h2c5 0-1-5 3-7 9-2 5-11-5-11ZM7 8h.1M12 6h.1M17 8h.1M6 13h.1',
 'm3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
 'M3 7h18v14H3ZM8 7V3h8v4M3 12q9 5 18 0M12 12v4',
 'M3 6h18v15H3ZM3 10h18M17 15h4M6 3h13',
 'M10 5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M9 12l3-3 3 3 5 2M4 14l5-2M8 16l-5 4h18l-5-4M12 9v8',
 'M9 4a8 8 0 0 0-4 13v4h12v-6c7-2 3-11-3-11ZM10 9h5m-5 4h3',
 'M12 2 9 9l-7 3 7 3 3 7 3-7 7-3-7-3ZM19 3v4m-2-2h4',
 'M20 3C4 2 1 14 9 18s13-5 11-15ZM5 22 16 9',
 'M8 4h8v3H8ZM7 7h10v15H7ZM10 1h4v3M10 12h4',
 'M4 21V9a8 8 0 0 1 16 0v12M4 10q8 2 8-8 0 10 8 8M8 14v7m8-7v7',
 'M3 17q4-5 8-2l3-6q1-2 3 0l-2 6 4-2q3-1 3 2l-5 6H8l-5 1'
];
habitPaths.splice(15,0,'');
const filledHealthIcons={
 'Comida':'<path fill-rule="evenodd" d="M11.8 6C8.2 6 7.8 4.9 5.3 5.8 1.4 7.3 2.1 13.6 4.3 17.3 6.3 20.6 9 22 12 22s5.7-1.4 7.7-4.7c2.2-3.7 2.9-10-1-11.5-2.5-.9-2.9.2-6.9.2ZM9.9 13.2c-.8-.2-1.6 3.1-.8 3.3.9.3 1.7-3 .8-3.3Zm4.2 0c-.9.3-.1 3.6.8 3.3.8-.2 0-3.5-.8-3.3Z"/><path d="M7 1.6c3.1-.1 5.1 1.9 5 4.3C9 6 7 4.1 7 1.6Z"/>',
 'Água':'<path d="M12 1.5C9.9 5.3 4 12.5 4 16a8 7 0 0 0 16 0c0-3.5-5.9-10.7-8-14.5Z"/>',
 'Exercício':'<g transform="rotate(45 12 12)"><rect x="10" y="7" width="4" height="10" rx="1"/><rect x="5" y="4" width="14" height="3.5" rx="1.75"/><rect x="7" y="1.5" width="10" height="3.5" rx="1.75"/><rect x="5" y="16.5" width="14" height="3.5" rx="1.75"/><rect x="7" y="19" width="10" height="3.5" rx="1.75"/></g>',
 'Dormi':'<path d="M13.1 2.2c.7-.1 1 .7.6 1.2-5 6.6.4 15 8 12.5.6-.2 1.1.4.8 1C18.8 24 8.9 24 4.4 17.4.1 11.1 4.3 3 13.1 2.2Z"/>',
 'Amor':'<path d="M12 21c-1.6-2.4-8.7-6-9.8-11.3C.6 2.3 9.1.3 12 6c2.9-5.7 11.4-3.7 9.8 3.7C20.7 15 13.6 18.6 12 21Z"/>',
 'Família':'<circle cx="12" cy="5.4" r="3.5"/><circle cx="4.8" cy="8" r="2.7"/><circle cx="19.2" cy="8" r="2.7"/><path d="M1 20v-3.4c0-4 3.8-5.5 6.5-3.7 1.8-3.4 7.2-3.4 9 0 2.7-1.8 6.5-.3 6.5 3.7V20Z"/>',
 'Amigos':'<path d="M7 4.2A9 9 0 0 1 9 3.3v1.8l-1.2.6Zm8-1a9 9 0 0 1 2 1l-.8 1.5-1.2-.6ZM4.2 17a9 9 0 0 0 4.1 3.3l.7-1.6A7.2 7.2 0 0 1 5.5 16Zm11.5 3.3a9 9 0 0 0 4.1-3.3l-1.3-1a7.2 7.2 0 0 1-3.5 2.7Z"/><circle cx="12" cy="3.5" r="2.2"/><circle cx="3.5" cy="11" r="2.2"/><circle cx="20.5" cy="11" r="2.2"/><circle cx="12" cy="17" r="2.2"/><path d="M9.3 6c1.7 1 3.7 1 5.4 0 .8.7.6 2.7.3 4.1-.7.7-5.3.7-6 0-.3-1.4-.5-3.4.3-4.1ZM.8 13.5c1.7 1 3.7 1 5.4 0 .8.7.6 2.7.3 4.1-.7.7-5.3.7-6 0-.3-1.4-.5-3.4.3-4.1Zm17 0c1.7 1 3.7 1 5.4 0 .8.7.6 2.7.3 4.1-.7.7-5.3.7-6 0-.3-1.4-.5-3.4.3-4.1Zm-8.5 6c1.7 1 3.7 1 5.4 0 .8.7.6 2.4.3 3.5-.7.7-5.3.7-6 0-.3-1.1-.5-2.8.3-3.5Z"/>',
 'Inspiradores':'<path d="M12 1.6c1.3 0 3 5.4 4 6.1s6.6.6 7 1.9-4 4.5-4.4 5.6 1.4 6.5.3 7.3-5.7-2.6-6.9-2.6-5.8 3.4-6.9 2.6.7-6.2.3-7.3S.6 10.9 1 9.6s6-1.2 7-1.9 2.7-6.1 4-6.1Z"/>',
 'Livro':'<path d="M3 3c3-.6 5.7.1 8.5 2v15C8.7 18.1 6 17.4 3 18Zm18 0c-3-.6-5.7.1-8.5 2v15c2.8-1.9 5.5-2.6 8.5-2ZM1 6h1v13c3.2-.6 6.4.2 9 2H1Zm22 0h-1v13c-3.2-.6-6.4.2-9 2h10Z"/>',
 'Costura':'<path fill-rule="evenodd" d="M7 4a7 2.5 0 1 0 14 0A7 2.5 0 1 0 7 4Zm4.6 0a2.4.8 0 1 1 4.8 0 2.4.8 0 1 1-4.8 0ZM7 7v12c4.7 1.8 9.3 1.8 14 0V7c-4.7 1.8-9.3 1.8-14 0Zm0 13c4.7 1.8 9.3 1.8 14 0v1c-3.4 3-10.6 3-14 0Z"/><path d="M7 12C3 10 7 18 2.5 17.5 1 17.3 1 15.5 2 15" style="fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round"/><path d="m8 10 10 2m-10 2 10 2m-9 2 10-9" style="fill:none;stroke:var(--panel,#181818);stroke-width:.7"/>',
 'Estudo':'<path d="M1.2 7.2 11 2.6a2.5 2.5 0 0 1 2 0l9.5 4.5c.5.3.5 1 0 1.3L12 13.3 1.2 8.5c-.6-.3-.6-1 0-1.3ZM5 12l6 2.7a2.4 2.4 0 0 0 2 0l6-2.7v5c0 3-14 3-14 0Z"/><rect x="21" y="8" width="1.5" height="13" rx=".75"/>',
 'Arte':'<path fill-rule="evenodd" d="M12 2C5 2 1 7 1 13c0 5 3.7 9 8.7 9 5.4 0 1.1-4.6 4.1-5 5.5 1.2 8.2-.8 8.2-5C22 6 18 2 12 2ZM8 7a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0Zm6 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0ZM4 11a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0Zm13 1a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0ZM6 18a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0Z"/>',
 'Casa':'<path d="M2 11c-.8 0-1.2-1-.6-1.6L11 1.8a1.7 1.7 0 0 1 2 0l9.6 7.6c.6.6.2 1.6-.6 1.6h-1v10a1 1 0 0 1-1 1h-5.5v-4.5a2.5 2.5 0 0 0-5 0V22H4a1 1 0 0 1-1-1V11Z"/>',
 'Trabalho':'<path fill-rule="evenodd" d="M4 2h16a1 1 0 0 1 1 1v12H3V3a1 1 0 0 1 1-1Zm1 2v9h14V4ZM3 16h18l2 4c.5 1-.1 2-1.2 2H2.2C1.1 22 .5 21 1 20Zm7 2-.5 2h5l-.5-2Z"/>',
 'Escrita':'<path d="M6 2h10v15H6a2 2 0 0 0 0 4h1v-1H6a1 1 0 0 1 0-2h3v5l1.5-1 1.5 1v-4h7a1 1 0 0 1 0 2h-6v1h6a2 2 0 0 0 0-4H6c-1 0-2 .3-3 1V5a3 3 0 0 1 3-3ZM18 2h1a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-1Z"/>',
 'Finanças':'<path d="M8 6 5.5 2.5c-.4-.8 1-1.2 2.2-.7C9 .4 15 .4 16.3 1.8c1.2-.5 2.6-.1 2.2.7L16 6ZM8 7h8c3.8 3.1 7.2 8.3 6 12.3-.9 3.3-19.1 3.3-20 0C.8 15.3 4.2 10.1 8 7Z"/><path d="M14.4 11.6c-3.6-2.1-6.4 2-2.4 3s1.3 5.1-2.4 3M12 10v10" style="fill:none;stroke:var(--panel,#181818);stroke-width:1.5;stroke-linecap:round"/>',
 'Meditação':'<circle cx="12" cy="4" r="3"/><path d="M9 8h6c1 0 1.6.6 2 1.6l1.7 4.1 3.2 1.9c1.7 1 .6 3-1 2.3l-4.4-1.8-1-2.2v3.5c3.9-.2 6.7.3 6.7 2.2 0 2.6-4.5 2.2-6 2.4 1.1 3-3.6.7-4.2.5-.6.2-5.3 2.5-4.2-.5-1.5-.2-6 .2-6-2.4 0-1.9 2.8-2.4 6.7-2.2v-3.5l-1 2.2-4.4 1.8c-1.6.7-2.7-1.3-1-2.3l3.2-1.9L8 9.6C8.4 8.6 8 8 9 8Z"/>',
 'Reflexão':'<path d="M14 2c-2-1.4-4-.6-5 .2-2-.7-4 .3-4.6 1.7C1.8 4.2.8 6.3 1.5 8 0 10 .4 13 2.7 14c.7 2.7 3.1 3.3 5.1 3 1.2 1.4 3.3 1.2 5.3 2l2.4 4h2l-.7-4c5.4.6 7.3-4 5-6 2.7-1.8 1.9-5-1-5.6.2-2.2-1.7-4-4-3.8C16.6 2.3 15.3 1.5 14 2Z"/><path d="M5 6c2 1 3 0 3.5-1M7 6l1 2m3-4c2 .5 2 2 2.5 3M11 8c3 2 5 1 6-1m-2 2c2 1 2 2 2.5 4M5 10c-2 1-2 3-1 4m3-1c1-2 2-2 4-1m2 2c1 2 3 3 5 1" style="fill:none;stroke:var(--panel,#181818);stroke-width:1;stroke-linecap:round"/>',
 'Fé':'<path d="M11.4 2.7c0-1.7-1.8-2-2.5-.4L4.7 11c-.5 1-.3 2.8-.3 4L1 18.5 5 22l5.3-5.1c.7-.7 1.1-1.5 1.1-2.5V8.7c-1.3-1-2.2-.3-2.5 1.4l-.8 3.5c-.2.8-1.3.5-1.1-.3l.8-4c.4-2.4 2-3.3 3.6-2.6Zm1.2 0c0-1.7 1.8-2 2.5-.4l4.2 8.7c.5 1 .3 2.8.3 4l3.4 3.5-4 3.5-5.3-5.1c-.7-.7-1.1-1.5-1.1-2.5V8.7c1.3-1 2.2-.3 2.5 1.4l.8 3.5c.2.8 1.3.5 1.1-.3l-.8-4c-.4-2.4-2-3.3-3.6-2.6Z"/>',
 'Natureza':'<circle cx="6" cy="7" r="2.8"/><path d="M1.5 20c.8-4 4.4-4.4 7.8-3.9.8.2 1.2-.1 1.7-.9L15 7l4 6 2.2-3L24 19c.2.6-.1 1-1 1Z"/>',
 'Skin care':'<path d="M15 2h7c.6 0 1 .4 1 1v1H14V3c0-.6.4-1 1-1ZM14.2 5.3h8.6L22 18h-7ZM15 19.2h7V21c0 .6-.4 1-1 1h-5c-.6 0-1-.4-1-1ZM1.5 16.8h10c.6 0 1 .4 1 1v1.5c0 1.7-1.4 2.7-3 2.7h-6c-1.7 0-3-1-3-2.7v-1.5c0-.6.4-1 1-1Z"/><rect x=".5" y="12.1" width="11.8" height="2" rx=".8" transform="rotate(-25 6.4 13.1)"/><path d="m7.8 14.5 2.8-.8c.8-.2 1.2.2 1.4 1.3H7Z"/>',
 'Cabelo':'<path d="M10.8 2c-3.1-.2-5.4 2-6.7 4.6C2.8 9.3.5 9.3.5 12.7c0 2.8 2.7 4.5 5.2 3.8 1.8-.5 3.3-2.2 4-4.3-.8.4-1.6.7-2.1.4-.5-.2-.3-.8-.6-1-.6-.2-.1-.5-.4-.7-.4-.3-1.1-.3-.7-.9l.7-1.1c.3-.6 0-1.1.2-1.8.1-.6.3-1.1.7-1.5 1 2.1 3.3 2.3 3.6 4.6.6 3.2-2.4 4.8-1.5 8 .9 3.4 5.1 4.9 8.4 3.4 4.9-2.1 6-8.3 2.8-12.3-1.5-1.9-4-3.4-5.8-5.1C13.9 2.9 12.6 2 10.8 2Z"/>',
 'Massagem':'<path d="M12 3c-4.5 4.8-4.5 9.9 0 15 4.5-5.1 4.5-10.2 0-15ZM5 5c-.5 2.4-.5 3.8-.2 5.2 1.4.7 2.4 1.6 3.5 2.7-.4-2.6-.1-4.1.3-5.3C7.6 6.5 6.5 5.7 5 5Zm14 0c-1.5.7-2.6 1.5-3.6 2.6.4 1.2.7 2.7.3 5.3 1.1-1.1 2.1-2 3.5-2.7.3-1.4.3-2.8-.2-5.2ZM.5 10c1.3 5.4 5 8.6 10.8 8.2C8.7 13 5.3 10 .5 10Zm23 0c-4.8 0-8.2 3-10.8 8.2 5.8.4 9.5-2.8 10.8-8.2ZM4.7 17.6c-1.5.2-2.2.7-3.2 1.4 3.4 2.8 7.5 2.9 10.5-.4-2.4.7-5.4.4-7.3-1Zm14.6 0c-1.9 1.4-4.9 1.7-7.3 1 3 3.3 7.1 3.2 10.5.4-1-.7-1.7-1.2-3.2-1.4Z"/>'
};
const habitIcon=h=>filledHealthIcons[h]?'<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none">'+filledHealthIcons[h]+'</svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+habitPaths[habits.indexOf(h)]+'"/></svg>';
let touchedHabits=new Set();

let details={},pendingPhoto=null,photoReady=true,saving=false,openVersion=0;
const card=$('modal').querySelector('.modal-card');card.classList.add('registration-card');
const moods=['radiante','de boa','meh','tristinha','terrível'];
// Low-set features and rounded strokes keep the five moods legible at small sizes.
const face=(i)=>{
 const expressions=[
  '<path d="M8.5 26.5q2.5-2 5 1M34.5 27.5q2.5-3 5-1"/><path d="M17 30.5h14c1 0 1.5.8 1.1 1.8-2.8 9-13.4 9-16.2 0-.4-1 .1-1.8 1.1-1.8Z" fill="#202b2b" stroke="none"/><path d="M19 36q5-2.5 10 0-5 4.5-10 0Z" fill="currentColor" stroke="none"/>',
  '<circle cx="12" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><circle cx="36" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><path d="M20 32q4 4 8 0"/>',
  '<circle cx="12" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><circle cx="36" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><path d="M18.5 32.5h11"/>',
  '<path d="M9 20q2-2.5 4-1M35 19q2-1.5 4 1"/><circle cx="12" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><circle cx="36" cy="28" r="2.3" fill="var(--face-ink,#202b2b)" stroke="none"/><path d="M18 36c0-8 12-8 12 0"/>',
  '<path d="M12 18q0 3-3 3M36 18q0 3 3 3M10 25l5 3-5 1.5M38 25l-5 3 5 1.5M18 36c0-8 12-8 12 0"/>'
 ][i];
 return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="currentColor"/><g fill="none" stroke="var(--face-ink,#202b2b)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${expressions}</g></svg>`;
};
const intro=document.createElement('div');intro.className='registration';intro.innerHTML=`<h3>como está?</h3><div class="mood-faces" role="group" aria-label="Humor">${moods.map((m,i)=>`<button type="button" data-mood="${100-i*25}" aria-pressed="false">${face(i)}<span>${m}</span></button>`).join('')}</div><h3>como tá a mente?</h3><div class="mind-pairs">${pairs.map(([a,b,label],i)=>`<div><div class="mind-pair" role="group" aria-label="${label}"><button type="button" data-mind="${a}" data-pair="${i}">${a}</button><button type="button" data-mind="${b}" data-pair="${i}">${b}</button></div></div>`).join('')}</div><h3>o que teve no dia?</h3><div class="habit-pills">${habitRows.map(row=>`<div class="habit-row">${row.map(h=>`<button type="button" data-habit="${h}" aria-pressed="false"><i aria-hidden="true">${habitIcon(h)}</i><span>${h}</span></button>`).join('')}</div>`).join('')}</div>`;
card.querySelector('.modal-head').after(intro);
$('joy').closest('.field').hidden=true;$('note').previousElementSibling.textContent='Anotações · opcional';$('joy').placeholder='O que vale guardar de hoje?';
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
const priorOpen=openModal;openModal=function(date){if(saving)return;const version=++openVersion;details=structuredClone(items.find(x=>x.checkin_date===date)?.entry_details||{});pendingPhoto=null;photoReady=true;touchedHabits=new Set();
if(Array.isArray(details.habits))details.habits=[...new Set(details.habits.map(h=>aliases[h]||h))];
const suggestHabits=!Array.isArray(details.habits);
priorOpen(date);
if(suggestHabits&&user)prefillHabits(date,version,user.id);$('modalTitle').textContent='Seu check-in';$('journalTime').value=details.note_time||new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date());$('journalPlaceText').value=details.place||'';$('journalPlaceText').hidden=!details.place;$('journalTagsText').value=(details.tags||[]).join(', ');$('journalTagsText').hidden=!(details.tags||[]).length;$('regPhotoFile').value='';$('regPhotoPreview').hidden=true;$('regPhotoStatus').textContent='';paint();if(details.photo_path)sb.storage.from('checkin-photos').createSignedUrl(details.photo_path,3600).then(({data,error})=>{if(version!==openVersion||pendingPhoto||!details.photo_path)return;if(error){$('regPhotoStatus').textContent='Não consegui carregar a foto.';return;}$('regPhotoPreview').src=data.signedUrl;$('regPhotoPreview').hidden=false;});};
intro.querySelectorAll('[data-mind]').forEach(b=>b.onclick=()=>{if(!editing||saving)return;const selected=mindStates.has(b.dataset.mind);pairs[Number(b.dataset.pair)].slice(0,2).forEach(v=>mindStates.delete(v));if(!selected)mindStates.add(b.dataset.mind);paint();});
intro.querySelectorAll('[data-habit]').forEach(b=>b.onclick=()=>{if(!editing||saving)return;touchedHabits.add(b.dataset.habit);const hs=new Set(details.habits||[]);hs.has(b.dataset.habit)?hs.delete(b.dataset.habit):hs.add(b.dataset.habit);details.habits=[...hs];paint();});
intro.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{if(!editing||saving)return;details.mood=Number(b.dataset.mood);paint();});

async function prefillHabits(date,version,userId){
 const nextDate=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const results=await Promise.allSettled([
  sb.from('gym_sessions').select('id').eq('user_id',userId).eq('session_date',date).eq('completed',true).limit(1),
  sb.from('garmin_daily').select('sleep_score').eq('user_id',userId).eq('date',date).limit(1),
  sb.from('writing_sessions').select('id').eq('user_id',userId).gte('written_at',date+'T00:00:00-03:00').lt('written_at',nextDate+'T00:00:00-03:00').limit(1)
 ]);
 if(version!==openVersion||saving||!editing)return;
 const hs=new Set(details.habits||[]);
 results.forEach((r,i)=>{const habit=['Exercício','Dormi','Escrita'][i];if(r.status!=='fulfilled'||r.value.error||touchedHabits.has(habit))return;const rows=r.value.data||[];if(i!==1?rows.length>0:rows.some(x=>x.sleep_score!=null&&Number(x.sleep_score)>=80))hs.add(habit);});
 details.habits=[...hs];paint();
}
async function compress(file){if(file.size>25*1024*1024)throw Error('Escolha uma foto de até 25 MB.');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const ratio=Math.min(1,1600/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Não consegui preparar a foto.')),'image/jpeg',.85));}finally{URL.revokeObjectURL(url);}}
$('regPhotoFile').onchange=async()=>{const file=$('regPhotoFile').files[0];if(!file)return;const version=openVersion;photoReady=false;$('regPhotoStatus').textContent='Preparando foto…';$('save').disabled=true;try{const blob=await compress(file);if(version!==openVersion)return;pendingPhoto=blob;$('regPhotoPreview').src=URL.createObjectURL(blob);$('regPhotoPreview').hidden=false;$('regPhotoStatus').textContent='Foto pronta para salvar.';}catch(e){if(version===openVersion)$('regPhotoStatus').textContent=e.message;}finally{if(version===openVersion){photoReady=true;$('save').disabled=false;paint();}}};
$('regPhotoRemove').onclick=()=>{pendingPhoto=null;delete details.photo_path;$('regPhotoPreview').hidden=true;$('regPhotoFile').value='';paint();};
$('save').textContent='Salvar check-in';
$('save').onclick=async()=>{if(saving||!editing||!photoReady||!user)return;

 saving=true;paint();$('save').disabled=true;$('save').textContent='Salvando…';let uploaded=null,persisted=false;const old=items.find(x=>x.checkin_date===selectedDate);try{
 if(pendingPhoto){uploaded=`${user.id}/${selectedDate}/${crypto.randomUUID()}.jpg`;const {error}=await sb.storage.from('checkin-photos').upload(uploaded,pendingPhoto,{contentType:'image/jpeg',upsert:false});if(error)throw Error('Não consegui enviar a foto. Seu texto continua aqui.');}
 const next={...details,note_time:$('journalTime').value,...(uploaded?{photo_path:uploaded}:{})};const payload={user_id:user.id,checkin_date:selectedDate,mind_states:[...mindStates],note:$('note').value.trim()||null,entry_details:next,updated_at:new Date().toISOString()};
 const {error}=await sb.from('daily_checkins').upsert(payload,{onConflict:'user_id,checkin_date'});if(error)throw Error('Não consegui salvar. Seus campos continuam aqui para tentar novamente.');persisted=true;details=next;pendingPhoto=null;
 if(old?.entry_details?.photo_path&&old.entry_details.photo_path!==next.photo_path)await sb.storage.from('checkin-photos').remove([old.entry_details.photo_path]);
 await load();setEditing(false,true);$('regPhotoStatus').textContent='Check-in salvo.';
 }catch(e){if(uploaded&&!persisted)await sb.storage.from('checkin-photos').remove([uploaded]);alert(e.message);}finally{saving=false;$('save').disabled=false;$('save').textContent='Salvar check-in';paint();}};
const priorClose=closeModal;closeModal=function(){if(saving)return;openVersion++;priorClose();};$('closeModal').onclick=closeModal;$('modalBackdrop').onclick=closeModal;
$('edit').onclick=()=>setEditing(true,true);

let historyVersion=0,historyMonth=null;
renderList=function(){
 const version=++historyVersion,colors=['#DCCD8A','#A7993C','#475480','#B57056','#7F3B25'];
 if(!historyMonth)historyMonth=(items[0]?.checkin_date||today()).slice(0,7);
 const periodDate=new Date(historyMonth+'-01T12:00:00Z');
 let controls=$('historyPeriod');
 if(!controls){controls=document.createElement('div');controls.id='historyPeriod';$('list').before(controls);}
 controls.innerHTML='<button type="button" data-history-step="-1" aria-label="Mês anterior">‹</button><h2>'+esc(new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(periodDate))+'</h2><button type="button" data-history-step="1" aria-label="Próximo mês">›</button>';
 controls.querySelectorAll('[data-history-step]').forEach(b=>b.onclick=()=>{const date=new Date(Date.UTC(periodDate.getUTCFullYear(),periodDate.getUTCMonth()+Number(b.dataset.historyStep),1));historyMonth=date.toISOString().slice(0,7);renderList();});
 const visible=items.filter(x=>x.checkin_date.startsWith(historyMonth));
 $('list').innerHTML=visible.length?[...visible].sort((a,b)=>b.checkin_date.localeCompare(a.checkin_date)).map((x,index)=>{
 const d=x.entry_details||{},hasMood=typeof d.mood==='number'&&Number.isFinite(d.mood),mi=hasMood?4-Math.round(Math.max(0,Math.min(100,d.mood))/25):null;
 const heading='';
 const hs=[...new Set((d.habits||[]).map(h=>aliases[h]||h))],states=[...(x.mind_states||[]),...(hasMood?(x.soul_states||[]):(x.soul_states||[]).slice(1))];
 const time=d.note_time|| (x.created_at?new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(x.created_at)):'');
 return heading+'<article class="timeline-entry" style="--mood-color:'+(hasMood?colors[mi]:'var(--muted)')+'"><div class="timeline-face">'+(hasMood?face(mi):'<svg viewBox="0 0 48 48" aria-label="Registro sem humor"><rect x="12" y="7" width="26" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 17h12m-12 7h12m-12 7h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>')+'</div><div class="timeline-body"><div class="timeline-date">'+esc(new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(x.checkin_date+'T12:00:00Z')).replace('.',''))+'</div><div class="timeline-heading"><strong>'+(hasMood?moods[mi]:esc((x.soul_states||[])[0]||'check-in'))+'</strong><time>'+esc(time)+'</time><button type="button" data-open-date="'+esc(x.checkin_date)+'" aria-label="Abrir check-in de '+esc(fmtDate(x.checkin_date))+'">⌄</button></div>'+
 (states.length?'<div class="timeline-states">'+states.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>':'')+
 (hs.length?'<div class="timeline-habits">'+hs.map(h=>'<span>'+(habits.includes(h)?habitIcon(h):'')+esc(h)+'</span>').join('')+'</div>':'')+
 ([x.joy_reason||x.day_saver,x.note].filter(t=>typeof t==='string'&&t.trim()).length?'<p class="timeline-note">'+esc([x.joy_reason||x.day_saver,x.note].filter(t=>typeof t==='string'&&t.trim()).join('\n\n'))+'</p>':'')+
 (d.photo_path?'<img class="timeline-photo" data-photo-index="'+index+'" alt="Foto do dia" hidden>':'')+
 (d.place||(d.tags||[]).length?'<div class="timeline-context">'+(d.place?'<span>⌖ '+esc(d.place)+'</span>':'')+(d.tags||[]).map(t=>'<span>#'+esc(t)+'</span>').join('')+'</div>':'')+'</div></article>';
 }).join(''):'<p class="reg-muted">Nenhum check-in neste mês.</p>';
 $('list').querySelectorAll('[data-open-date]').forEach(b=>b.onclick=()=>openModal(b.dataset.openDate));
 const sorted=[...visible].sort((a,b)=>b.checkin_date.localeCompare(a.checkin_date));
 $('list').querySelectorAll('[data-photo-index]').forEach(async img=>{
 try{const {data,error}=await sb.storage.from('checkin-photos').createSignedUrl(sorted[Number(img.dataset.photoIndex)].entry_details.photo_path,3600);if(version!==historyVersion||!img.isConnected)return;if(!error&&data?.signedUrl){img.src=data.signedUrl;img.hidden=false;}}catch(e){/* Keep text available if a photo cannot load. */}
 });
};

})();