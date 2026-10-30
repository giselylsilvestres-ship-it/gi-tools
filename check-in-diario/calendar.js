/* Calendar views share the existing per-day records and registration editor. */
(()=>{
let mode='month';
const palette=['#DCCD8A','#A7993C','#475480','#B57056','#7F3B25'];
const names=['radiante','de boa','meh','tristinha','terrível'];
const index=row=>{const v=row?.entry_details?.mood;return typeof v==='number'&&Number.isFinite(v)?4-Math.round(Math.max(0,Math.min(100,v))/25):null;};
const dateKey=(y,m,d)=>y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
const face=i=>{const el=document.querySelector('[data-mood="'+(100-i*25)+'"] svg');return el?el.outerHTML.replace('<svg ','<svg style="color:'+palette[i]+';--face-ink:#202b2b" '):'';};
const host=$('calendar'),old=document.createElement('div');old.hidden=true;old.className='legacy-calendar';while(host.firstChild)old.appendChild(host.firstChild);host.appendChild(old);
const panel=document.createElement('div');panel.className='mood-calendar';host.appendChild(panel);
function bindDays(){panel.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openModal(b.dataset.day));}
function render(){
 const y=month.getFullYear(),m=month.getMonth(),rows=items.filter(r=>r.checkin_date?.startsWith(y+'-')),map=new Map(items.map(r=>[r.checkin_date,r]));
 const label=mode==='year'?String(y):new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(month);
 panel.innerHTML='<div class="calendar-controls"><div class="calendar-mode" role="group" aria-label="Período do calendário"><button data-mode="month" aria-pressed="'+(mode==='month')+'">Mês</button><button data-mode="year" aria-pressed="'+(mode==='year')+'">Ano</button></div><div class="calendar-period"><button id="moodPrev" aria-label="Período anterior">‹</button><h1>'+label+'</h1><button id="moodNext" aria-label="Próximo período">›</button></div></div><div id="moodCalendarBody"></div><div class="mood-key">'+names.map((n,i)=>'<span><i style="background:'+palette[i]+'"></i>'+n+'</span>').join('')+'<span><i class="unrated"></i>sem humor</span></div><div id="monthlyMoodCharts"></div>';
 panel.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render();});
 $('moodPrev').onclick=()=>{month=new Date(y-(mode==='year'?1:0),m-(mode==='month'?1:0),1);renderCalendar();};
 $('moodNext').onclick=()=>{month=new Date(y+(mode==='year'?1:0),m+(mode==='month'?1:0),1);renderCalendar();};
 if(mode==='year'){
 let html='<div class="year-pixels"><span></span>'+Array.from({length:12},(_,k)=>'<span class="pixel-month">'+new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(y,k,1)).replace('.','')+'</span>').join('');
 for(let d=1;d<=31;d++){html+='<span class="pixel-day">'+d+'</span>';for(let k=0;k<12;k++){if(d>new Date(y,k+1,0).getDate()){html+='<span></span>';continue;}const key=dateKey(y,k,d),row=map.get(key),i=index(row);html+='<button class="year-pixel '+(row?'recorded':'')+'" data-day="'+key+'" aria-label="'+d+'/'+(k+1)+'/'+y+' · '+(i==null?row?'registrado sem humor':'sem registro':names[i])+'" title="'+d+'/'+(k+1)+' · '+(i==null?'sem humor':names[i])+'"><i style="'+(i==null?'':'background:'+palette[i])+'"></i></button>';}}
 $('moodCalendarBody').innerHTML=html+'</div>';
 }else{
 const days=new Date(y,m+1,0).getDate(),first=new Date(y,m,1).getDay();
 let html='<div class="month-moods">'+['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=>'<span class="month-weekday">'+d+'</span>').join('')+'<span class="month-pad" style="grid-column:span '+(first||1)+';'+(!first?'display:none':'')+'"></span>';
 for(let d=1;d<=days;d++){const key=dateKey(y,m,d),row=map.get(key),i=index(row);html+='<button class="month-mood '+(key===today()?'is-today':'')+'" data-day="'+key+'" aria-label="'+d+' de '+label+' · '+(i==null?row?'registrado sem humor':'sem registro':names[i])+'"><span class="month-face">'+(i==null?'<span class="empty-mood">'+(row?'✓':'+')+'</span>':face(i))+'</span><span>'+d+'</span></button>';}
 $('moodCalendarBody').innerHTML=html+'</div>';
 const current=rows.filter(r=>r.checkin_date.startsWith(dateKey(y,m,1).slice(0,7))),rated=current.filter(r=>index(r)!=null).sort((a,b)=>a.checkin_date.localeCompare(b.checkin_date));
 const counts=names.map((_,i)=>rated.filter(r=>index(r)===i).length),total=rated.length;
 let arcs='',offset=0;
 counts.forEach((n,i)=>{if(!n)return;const a=Math.PI+offset/total*Math.PI,b=Math.PI+(offset+n)/total*Math.PI;arcs+='<path d="M '+(150+110*Math.cos(a))+' '+(135+110*Math.sin(a))+' A 110 110 0 0 1 '+(150+110*Math.cos(b))+' '+(135+110*Math.sin(b))+'" fill="none" stroke="'+palette[i]+'" stroke-width="32"/>';offset+=n;});
 let history='<p class="calendar-empty">Registre seu humor para acompanhar o histórico deste mês.</p>';
 if(total){const x=d=>60+(Number(d.slice(-2))-1)/Math.max(1,days-1)*500,yy=i=>32+i*40;
 const points=rated.map(r=>({r,i:index(r),x:x(r.checkin_date),y:yy(index(r))}));
 let path='';points.forEach((p,k)=>{if(!k)path='M'+p.x+' '+p.y;else{const prev=points[k-1],mid=(prev.x+p.x)/2;path+=' C'+mid+' '+prev.y+' '+mid+' '+p.y+' '+p.x+' '+p.y;}});
 history='<svg class="mood-history" viewBox="0 0 600 235" role="img" aria-label="Histórico de humor em '+label+'">'+names.map((n,i)=>'<line x1="60" x2="560" y1="'+yy(i)+'" y2="'+yy(i)+'" stroke="var(--border)" stroke-dasharray="3 5"/><text x="50" y="'+(yy(i)+4)+'" text-anchor="end">'+['rad.','boa','meh','trist.','terr.'][i]+'</text>').join('')+'<path d="'+path+'" fill="none" stroke="#B57056" stroke-width="3"/>'+points.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="'+palette[p.i]+'" stroke="var(--text)" stroke-width="1"><title>'+p.r.checkin_date+' · '+names[p.i]+'</title></circle>').join('')+[1,Math.ceil(days/2),days].map(d=>'<text x="'+x(dateKey(y,m,d))+'" y="224" text-anchor="middle">'+d+'</text>').join('')+'</svg>';}
 $('monthlyMoodCharts').innerHTML='<article class="calendar-chart"><h2>contagem de humor</h2><svg class="mood-count" viewBox="0 0 300 160" role="img" aria-label="'+total+' registros com humor"><path d="M40 135A110 110 0 0 1 260 135" fill="none" stroke="var(--surface2)" stroke-width="32"/>'+arcs+'<text x="150" y="125" text-anchor="middle" class="mood-total">'+total+'</text></svg><div class="count-faces">'+names.map((n,i)=>'<div>'+face(i)+'<b>'+counts[i]+'</b><span>'+n+'</span></div>').join('')+'</div>'+(current.length>total?'<p class="calendar-empty">'+(current.length-total)+' registro(s) sem humor informado</p>':'')+'</article><article class="calendar-chart"><h2>histórico de humor</h2>'+history+'</article>';
 }
 bindDays();
 document.dispatchEvent(new CustomEvent('gica-calendar-period',{detail:{year:y,month:m,mode}}));
}
const previousRender=renderCalendar;renderCalendar=function(...args){previousRender(...args);render();};
render();
})();
