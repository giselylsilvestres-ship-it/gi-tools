/* Read-only monthly Garmin trends. Dates follow Garmin's wake-up calendarDate. */
(()=>{
 const fields='date,sleep_minutes,sleep_score,sleep_light_minutes,sleep_deep_minutes,sleep_rem_minutes,sleep_awake_minutes,body_battery_sleep_end,body_battery_min,stress_avg,hrv,resting_heart_rate,steps,is_partial';
 const tabs={sleep:'Sono',energy:'Energia',stress:'Estresse',recovery:'Recuperação',movement:'Movimento'};
 const colors={light:'#DCCD8A',deep:'#475480',rem:'#A7993C',awake:'#99958B',energy:'#DCCD8A',low:'#B57056'};
 let active='sleep',version=0,dayVersion=0,rows=[],period=null;
 const valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;
 const num=v=>valid(v)?Number(v):null;
 const mean=key=>{const values=rows.map(r=>num(r[key])).filter(v=>v!==null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;};
 const fmt=v=>v===null?'—':Math.round(v).toLocaleString('pt-BR');
 const duration=v=>v===null?'—':Math.floor(Math.round(v)/60)+'h '+String(Math.round(v)%60).padStart(2,'0');
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key=(y,m,d)=>y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 const metric=(label,value,unit='')=>'<div><span>'+label+'</span><strong>'+value+(unit?'<small> '+unit+'</small>':'')+'</strong></div>';
 const legend=(label,color)=>'<span><i style="background:'+color+'"></i>'+label+'</span>';
 function frame(title,series,max,unit,stacked=false){
  const y=period.year,m=period.month,days=new Date(y,m+1,0).getDate(),map=new Map(rows.map(r=>[r.date,r]));
  const left=40,top=14,width=600,height=170,step=width/days,x=d=>left+(d-.5)*step,yy=v=>top+height-v/max*height;
  let body='',hits='',has=false;
  for(let tick=0;tick<=4;tick++){const v=max*tick/4;body+='<line x1="40" x2="640" y1="'+yy(v)+'" y2="'+yy(v)+'" class="garmin-grid"/><text x="33" y="'+(yy(v)+4)+'" text-anchor="end">'+(unit==='h'?Math.round(v*10)/10:fmt(v))+'</text>';}
  if(stacked){
   for(let d=1;d<=days;d++){
    const r=map.get(key(y,m,d));if(!r)continue;let base=0;const complete=series.slice(0,3).every(s=>valid(r[s.key]));
    const parts=complete?series:[{key:'sleep_minutes',label:'Sono total · fases indisponíveis',color:'#DCCD8A'},series[3]];
    let tip=[];for(const s of parts){const v=num(r[s.key]);if(v===null)continue;has=true;const h=v/60/max*height;body+='<rect x="'+(x(d)-step*.33)+'" y="'+(yy(base+v/60))+'" width="'+step*.66+'" height="'+h+'" fill="'+s.color+'"/>';base+=v/60;tip.push(s.label+': '+duration(v));}
    if(tip.length)hits+=hit(d,x(d),step,r.date,tip.join(' · '));
   }
  }else{
   series.forEach(s=>{let previous=null;for(let d=1;d<=days;d++){const r=map.get(key(y,m,d)),v=num(r?.[s.key]);if(v===null){previous=null;continue;}has=true;
    if(s.bar)body+='<rect x="'+(x(d)-step*.33)+'" y="'+yy(v)+'" width="'+step*.66+'" height="'+(v/max*height)+'" rx="2" fill="'+s.color+'"/>';
    else{if(previous)body+='<line x1="'+previous.x+'" y1="'+previous.y+'" x2="'+x(d)+'" y2="'+yy(v)+'" stroke="'+s.color+'" stroke-width="2.5"/>';body+='<circle cx="'+x(d)+'" cy="'+yy(v)+'" r="3.5" fill="'+s.color+'"/>';previous={x:x(d),y:yy(v)};}
   }});
   for(let d=1;d<=days;d++){const r=map.get(key(y,m,d));if(!r)continue;const tip=series.filter(s=>valid(r[s.key])).map(s=>s.label+': '+fmt(num(r[s.key]))+(unit?' '+unit:''));if(tip.length)hits+=hit(d,x(d),step,r.date,tip.join(' · '));}
  }
  if(!has)return '<p class="garmin-empty">Sem dados de '+title.toLowerCase()+' neste mês.</p>';
  body+=[1,5,10,15,20,25,days].filter((d,i,a)=>a.indexOf(d)===i&&d<=days).map(d=>'<text x="'+x(d)+'" y="208" text-anchor="middle">'+d+'</text>').join('');
  return '<div class="garmin-scroll"><svg class="garmin-chart" viewBox="0 0 660 220" role="group" aria-label="'+title+' por dia · '+unit+'">'+body+hits+'</svg></div>';
 }
 function hit(d,x,step,date,tip){return '<g role="button" tabindex="0" data-garmin-day="'+date+'" aria-label="Dia '+d+' · '+esc(tip)+' · abrir check-in"><title>Dia '+d+' · '+esc(tip)+'</title><rect class="garmin-hit" x="'+(x-step/2)+'" y="10" width="'+step+'" height="180" fill="transparent"/></g>';}
 function paint(){
  const host=document.getElementById('garminMonthly');if(!host||!period)return;
  host.innerHTML='<header class="garmin-heading"><div><span>GARMIN</span><h2>seu corpo no mês</h2></div><p>'+new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(period.year,period.month,1))+'</p></header><div class="garmin-tabs" role="group" aria-label="Dados do Garmin">'+Object.entries(tabs).map(([id,label])=>'<button type="button" data-garmin-tab="'+id+'" aria-pressed="'+(active===id)+'">'+label+'</button>').join('')+'</div><div id="garminContent"></div><p class="garmin-footnote">Toque no gráfico para abrir o dia. Lacunas indicam dados indisponíveis.'+(rows.some(r=>r.is_partial)?' Há dias com sincronização parcial.':'')+'</p>';
  let html='',stats='',keys=[];
  if(active==='sleep'){
   stats=metric('Média por noite',duration(mean('sleep_minutes')))+metric('Nota média',fmt(mean('sleep_score')),'/100');
   const series=[{key:'sleep_light_minutes',label:'Leve',color:colors.light},{key:'sleep_deep_minutes',label:'Profundo',color:colors.deep},{key:'sleep_rem_minutes',label:'REM',color:colors.rem},{key:'sleep_awake_minutes',label:'Acordada',color:colors.awake}];
   const complete=rows.filter(r=>series.slice(0,3).every(s=>valid(r[s.key]))),totals=series.slice(0,3).map(s=>complete.reduce((sum,r)=>sum+Number(r[s.key]),0)),total=totals.reduce((a,b)=>a+b,0);
   html='<h3>Duração e fases por noite <small>horas</small></h3><div class="garmin-legend">'+series.map(s=>legend(s.label,s.color)).join('')+'</div>';
   const highest=Math.max(0,...rows.map(r=>Number(r.sleep_minutes||0)+Number(r.sleep_awake_minutes||0)),...rows.map(r=>series.reduce((n,s)=>n+Number(r[s.key]||0),0)))/60;
   html+=frame('Sono',series,Math.max(8,Math.ceil(highest/2)*2),'h',true);
   if(total)html+='<div class="garmin-distribution"><h3>Distribuição das fases no mês</h3><div class="garmin-phase-bar">'+totals.map((n,i)=>'<span style="width:'+n/total*100+'%;background:'+series[i].color+'"></span>').join('')+'</div><div class="garmin-legend">'+totals.map((n,i)=>legend(series[i].label+' '+Math.round(n/total*100)+'%',series[i].color)).join('')+'</div><p>Base: '+complete.length+' noite(s) com as três fases. Tempo acordada fica fora desta distribuição.</p></div>';
   html+='<p class="garmin-note">Cada noite aparece no dia em que você acordou.</p>';keys=['sleep_minutes'];
  }else if(active==='energy'){
   stats=metric('Ao acordar · média',fmt(mean('body_battery_sleep_end')))+metric('Mínimo diário · média',fmt(mean('body_battery_min')));
   html='<h3>Body Battery <small>0–100</small></h3><div class="garmin-legend">'+legend('Ao acordar',colors.energy)+legend('Menor valor do dia',colors.low)+'</div>'+frame('Body Battery',[{key:'body_battery_sleep_end',label:'Ao acordar',color:colors.energy},{key:'body_battery_min',label:'Menor valor',color:colors.low}],100,'');keys=['body_battery_sleep_end','body_battery_min'];
  }else if(active==='stress'){
   stats=metric('Estresse médio',fmt(mean('stress_avg')),'/100');html='<h3>Estresse médio por dia <small>0–100</small></h3>'+frame('Estresse',[{key:'stress_avg',label:'Estresse médio',color:'#B57056',bar:true}],100,'');keys=['stress_avg'];
  }else if(active==='recovery'){
   stats=metric('HRV médio',fmt(mean('hrv')),'ms')+metric('FC de repouso média',fmt(mean('resting_heart_rate')),'bpm');
   html='<h3>HRV noturno <small>ms</small></h3>'+frame('HRV',[{key:'hrv',label:'HRV',color:'#A7993C'}],Math.max(50,Math.ceil(Math.max(0,...rows.map(r=>num(r.hrv)||0))/20)*20),'ms')+'<h3>Frequência cardíaca de repouso <small>bpm</small></h3>'+frame('FC de repouso',[{key:'resting_heart_rate',label:'FC de repouso',color:'#B57056'}],Math.max(100,Math.ceil(Math.max(0,...rows.map(r=>num(r.resting_heart_rate)||0))/20)*20),'bpm');keys=['hrv','resting_heart_rate'];
  }else{
   stats=metric('Passos por dia · média',fmt(mean('steps')))+metric('Passos no mês',rows.some(r=>valid(r.steps))?fmt(rows.reduce((sum,r)=>sum+(num(r.steps)||0),0)):'—');
   html='<h3>Passos por dia</h3>'+frame('Passos',[{key:'steps',label:'Passos',color:'#A7993C',bar:true}],Math.max(5000,Math.ceil(Math.max(0,...rows.map(r=>num(r.steps)||0))/5000)*5000),'');keys=['steps'];
  }
  const count=rows.filter(r=>keys.some(k=>valid(r[k]))).length;
  document.getElementById('garminContent').innerHTML='<div class="garmin-stats">'+stats+'</div><p class="garmin-coverage">'+count+' dia(s) com dados · médias apenas dos valores disponíveis</p>'+html;
  host.querySelectorAll('[data-garmin-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.garminTab;paint();});
  host.querySelectorAll('[data-garmin-day]').forEach(b=>{b.onclick=()=>openModal(b.dataset.garminDay);b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openModal(b.dataset.garminDay);}};});
 }
 async function update(detail){
  const token=++version;period=detail;
  const panel=document.querySelector('.mood-calendar');if(!panel)return;
  let host=document.getElementById('garminMonthly');if(!host){host=document.createElement('section');host.id='garminMonthly';host.className='garmin-monthly';panel.appendChild(host);}
  host.hidden=detail.mode!=='month';if(host.hidden)return;
  host.innerHTML='<p class="garmin-empty" role="status">Carregando dados do Garmin…</p>';
  try{
   const {data:{session}}=await sb.auth.getSession();if(token!==version)return;if(!session){host.innerHTML='<p class="garmin-empty">Entre para ver seus dados.</p>';return;}
   const {data,error}=await sb.from('garmin_daily').select(fields).eq('user_id',session.user.id).gte('date',key(detail.year,detail.month,1)).lt('date',key(detail.year+(detail.month===11?1:0),(detail.month+1)%12,1)).order('date');
   if(token!==version)return;if(error)throw error;rows=data||[];paint();
  }catch(e){if(token!==version)return;host.innerHTML='<p class="garmin-empty" role="status">Não consegui carregar o Garmin.</p><button type="button" class="garmin-retry">Tentar novamente</button>';host.querySelector('button').onclick=()=>update(detail);}
 }
 document.addEventListener('gica-calendar-period',e=>update(e.detail));
 const originalOpen=openModal;openModal=function(date){originalOpen(date);if(selectedDate!==date||document.getElementById('modal').hidden)return;showDay(date);};
 async function showDay(date){
  const token=++dayVersion;let el=document.getElementById('garminDay');if(!el){el=document.createElement('details');el.id='garminDay';el.className='garmin-day';document.querySelector('#modal .modal-head').after(el);}el.open=false;el.innerHTML='<summary>Garmin · dados do dia</summary><p>Carregando…</p>';
  try{const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('session');const {data,error}=await sb.from('garmin_daily').select(fields).eq('user_id',session.user.id).eq('date',date).maybeSingle();if(token!==dayVersion||selectedDate!==date)return;if(error)throw error;
   const values=data?[
    ['Sono',duration(num(data.sleep_minutes)),data.sleep_minutes],['Nota do sono',fmt(num(data.sleep_score))+'/100',data.sleep_score],
    ['Leve',duration(num(data.sleep_light_minutes)),data.sleep_light_minutes],['Profundo',duration(num(data.sleep_deep_minutes)),data.sleep_deep_minutes],['REM',duration(num(data.sleep_rem_minutes)),data.sleep_rem_minutes],['Acordada',duration(num(data.sleep_awake_minutes)),data.sleep_awake_minutes],
    ['Body Battery ao acordar',fmt(num(data.body_battery_sleep_end)),data.body_battery_sleep_end],['Body Battery mínima',fmt(num(data.body_battery_min)),data.body_battery_min],['Estresse',fmt(num(data.stress_avg))+'/100',data.stress_avg],['HRV',fmt(num(data.hrv))+' ms',data.hrv],['FC de repouso',fmt(num(data.resting_heart_rate))+' bpm',data.resting_heart_rate],['Passos',fmt(num(data.steps)),data.steps]
   ].filter(v=>valid(v[2])):[];
   el.innerHTML='<summary>Garmin · dados do dia</summary>'+(values.length?'<div class="garmin-day-grid">'+values.map(v=>metric(v[0],v[1])).join('')+'</div>'+(data.is_partial?'<p>Sincronização parcial deste dia.</p>':''):'<p>Sem dados do Garmin para este dia.</p>');
  }catch(e){if(token===dayVersion&&selectedDate===date)el.innerHTML='<summary>Garmin · dados do dia</summary><p>Não consegui carregar os dados deste dia.</p>';}
 }
 update({year:month.getFullYear(),month:month.getMonth(),mode:'month'});
})();
