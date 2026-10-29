/* Writing dashboard, styled with Academia's palette and chart weights. */
(()=>{
 const el=id=>document.getElementById(id),palette=['#DCCD8A','#A7993C','#475480','#B57056','#7F3B25'];
 const fmt=(n,d=1)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
 const text=(id,v)=>{el(id).textContent=v;};
 const dateLabel=d=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit'}).format(new Date(d+'T12:00:00Z'));
 const fullDate=v=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
 const empty=(id,message)=>{el(id).innerHTML=`<div class="wa-empty">${esc(message)}</div>`;};
 function renderTypes(data){
  text('waTypeSubtitle',`${data.types.length} tipos · ${data.total} escritas · todo o histórico`);
  if(!data.total)return empty('waTypeChart','Os tipos de escrita aparecerão aqui.');
  const max=Math.max(...data.types.map(t=>t.value));
  el('waTypeChart').innerHTML=data.types.map((t,i)=>`<div class="wa-bar-row"><span title="${esc(t.name)}">${esc(t.name)}</span><i class="wa-bar-track"><b style="width:${t.value/max*100}%;background:${palette[i%palette.length]}"></b></i><strong>${t.value}</strong><small>${Math.round(t.value/data.total*100)}%</small><span class="wa-type-average" aria-label="Nota média: ${t.average===null?'sem nota':fmt(t.average)}">${t.average===null?'—':fmt(t.average)}<small>nota</small></span></div>`).join('');
 }
 function chartFrame(yRange,xLabels,yLabel,xLabel,body){
  const left=46,right=574,top=20,bottom=212;
  const grid=[0,1,2,3,4].map(i=>{const y=bottom-i*(bottom-top)/4;return `<line class="wa-gridline" x1="${left}" x2="${right}" y1="${y}" y2="${y}"/><text class="wa-axis" x="${left-10}" y="${y+4}" text-anchor="end">${fmt(yRange.min+(yRange.max-yRange.min)*i/4,1)}</text>`;}).join('');
  return `<svg viewBox="0 0 600 260" role="img" aria-label="${esc(yLabel+' por '+xLabel)}"><text class="wa-axis wa-axis-title" x="${left}" y="11">${esc(yLabel)}</text>${grid}${body}${xLabels.map(l=>`<text class="wa-axis" x="${l.x}" y="232" text-anchor="${l.anchor||'middle'}">${esc(l.label)}</text>`).join('')}<text class="wa-axis" x="574" y="254" text-anchor="end">${esc(xLabel)}</text></svg>`;
 }
 const bounds=values=>{let min=Math.floor(Math.min(...values)*2)/2,max=Math.ceil(Math.max(...values)*2)/2;if(min===max){min=Math.max(0,min-.5);max+=.5;}return {min,max};};
 // Horizontal Bezier controls keep each segment inside its endpoint values.
 const smoothPath=pts=>pts.map((p,i)=>{if(!i)return `M ${p.x},${p.y}`;const q=pts[i-1],mid=(q.x+p.x)/2;return `C ${mid},${q.y} ${mid},${p.y} ${p.x},${p.y}`;}).join(' ');
 function bindChartDetails(id){
  const target=el(id),caption=document.createElement('div');caption.className='wa-chart-caption';caption.setAttribute('role','status');caption.hidden=true;target.appendChild(caption);
  target.querySelectorAll('.wa-point').forEach(point=>{const show=()=>{const same=[...target.querySelectorAll('.wa-point')].filter(p=>p.getAttribute('cx')===point.getAttribute('cx')&&p.getAttribute('cy')===point.getAttribute('cy'));caption.textContent=same.map(p=>p.querySelector('title').textContent).join('\n');caption.hidden=false;};point.addEventListener('click',show);point.addEventListener('focus',show);});
 }
 function renderScatter(data){
  text('waScatterSubtitle',`${data.scatter.length} escritas com nota, palavras e duração · todo o histórico`);
  if(!data.scatter.length)return empty('waScatterChart','As escritas com nota, palavras e duração aparecerão aqui.');
  const xr=bounds(data.scatter.map(p=>p.x)),yr=bounds(data.scatter.map(p=>p.y));
  const points=data.scatter.map(p=>{const x=46+(p.x-xr.min)/(xr.max-xr.min)*528,y=212-(p.y-yr.min)/(yr.max-yr.min)*192;const title=`${fullDate(p.row.createdAt)} · ${p.row.writingType||'Sem classificação'} · ${fmt(p.x)} palavras/min · nota ${fmt(p.y)}`;return `<circle class="wa-point" tabindex="0" cx="${x}" cy="${y}" r="5" fill="#A7993C" stroke="var(--surface)" stroke-width="1.5" aria-label="${esc(title)}"><title>${esc(title)}</title></circle>`;}).join('');
  el('waScatterChart').innerHTML=chartFrame(yr,[0,1,2,3,4].map(i=>({x:46+i/4*528,label:fmt(xr.min+(xr.max-xr.min)*i/4,1)})),'Nota','Palavras por minuto',points);bindChartDetails('waScatterChart');
 }
 function renderTimeline(data){
  if(!data.timeline.length)return empty('waHistoryChart','O histórico de notas aparecerá após as primeiras avaliações.');
  const rows=data.timeline,yr=bounds(rows.map(p=>p.value));
  const pts=rows.map((p,i)=>({...p,x:rows.length>1?46+i/(rows.length-1)*528:310,y:212-(p.value-yr.min)/(yr.max-yr.min)*192}));
  const line=smoothPath(pts),area=`${line} L ${pts.at(-1).x},212 L ${pts[0].x},212 Z`;
  const labels=[...new Set([0,Math.floor((rows.length-1)/3),Math.floor((rows.length-1)*2/3),rows.length-1])].map(i=>({x:pts[i].x,label:dateLabel(rows[i].date),anchor:i===0&&rows.length>1?'start':i===rows.length-1&&rows.length>1?'end':'middle'}));
  const body=`<defs><linearGradient id="waHistoryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#B57056" stop-opacity=".24"/><stop offset="100%" stop-color="#B57056" stop-opacity=".02"/></linearGradient></defs>${pts.length>1?`<path d="${area}" fill="url(#waHistoryFill)"/><path d="${line}" fill="none" stroke="#B57056" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`:''}${pts.map(p=>{const title=`${fullDate(p.row.createdAt)} · ${p.row.prompt||p.row.category||'Escrita livre'} · nota ${fmt(p.value)}`;return `<circle class="wa-point" tabindex="0" cx="${p.x}" cy="${p.y}" r="4.5" fill="#DCCD8A" stroke="#B57056" stroke-width="2" aria-label="${esc(title)}"><title>${esc(title)}</title></circle>`;}).join('')}`;
  el('waHistoryChart').innerHTML=chartFrame(yr,labels,'Nota','Data',body);bindChartDetails('waHistoryChart');
 }
 function renderComments(data){
  text('waCommentCount',`${data.comments.length} análise${data.comments.length===1?'':'s'}`);
  const toggle=el('waExpandAll');toggle.hidden=!data.comments.length;toggle.textContent='Expandir tudo';toggle.setAttribute('aria-expanded','false');
  if(!data.comments.length)return empty('waComments','As análises das suas escritas aparecerão aqui, das mais recentes às mais antigas.');
  el('waComments').innerHTML=data.comments.map(r=>`<details class="wa-comment"><summary><div class="wa-comment-meta">${esc(fullDate(r.createdAt))} · ${esc(r.writingType||'Sem classificação')}</div><div class="wa-comment-heading"><strong>${esc(r.prompt||r.category||'Escrita livre')}</strong><span class="wa-grade">${r.grade===null?'Sem nota':fmt(r.grade)}</span><span class="wa-chevron" aria-hidden="true">⌄</span></div></summary><div class="wa-comment-body">${esc(r.analysis)}</div></details>`).join('');
  const sync=()=>{const all=[...el('waComments').querySelectorAll('details')].every(d=>d.open);toggle.textContent=all?'Recolher tudo':'Expandir tudo';toggle.setAttribute('aria-expanded',String(all));};
  el('waComments').querySelectorAll('details').forEach(d=>d.addEventListener('toggle',sync));
  toggle.onclick=()=>{const all=[...el('waComments').querySelectorAll('details')].every(d=>d.open);el('waComments').querySelectorAll('details').forEach(d=>d.open=!all);sync();};
 }
 window.renderWritingAnalyses=()=>{
  const data=WritingAnalytics.summarize(historyCache);
  text('waTotal',data.total.toLocaleString('pt-BR'));
  text('waUniqueDays',`textos em ${data.uniqueDays} dia${data.uniqueDays===1?' único':'s únicos'}`);
  text('waWordsPerMinute',data.wordsPerMinute===null?'—':fmt(data.wordsPerMinute));
  text('waWordTotals',`${fmt(data.totalWords,0)} palavras / ${fmt(data.totalMinutes)} min`);
  text('waFrequencyOverall',data.overallFrequency===null?'Ainda sem histórico':`Média geral · ${fmt(data.overallFrequency)}×/sem`);
  const fd=data.frequencyComparison,fc=el('waFrequencyComparison');fc.className='wa-comparison';
  fc.textContent=fd===null?'Sem comparação disponível':Math.abs(fd)<.05?'→ Na média geral':`${fd>0?'↑':'↓'} ${fmt(Math.abs(fd))}×/sem vs. geral`;
  if(fd!==null&&Math.abs(fd)>=.05)fc.classList.add(fd>0?'positive':'negative');text('waFrequency',`${fmt(data.weeklyFrequency)}×`);text('waFrequencyContext',`${data.activeDays} dias com escrita em 30 dias`);
  text('waAverage',data.recentMean===null?'—':fmt(data.recentMean));text('waOverall',data.overallMean===null?'Ainda sem notas':`Média geral · ${fmt(data.overallMean)}`);
  const diff=data.comparison,comparison=el('waComparison');comparison.className='wa-comparison';
  if(diff===null)comparison.textContent='Sem comparação disponível';else if(Math.abs(diff)<0.05)comparison.textContent='→ Na média geral';else{comparison.textContent=`${diff>0?'↑':'↓'} ${fmt(Math.abs(diff))} ${Math.abs(diff)===1?'ponto':'pontos'} vs. geral`;comparison.classList.add(diff>0?'positive':'negative');}
  renderTypes(data);renderScatter(data);renderTimeline(data);renderComments(data);
 };
 let refreshing=false;
 window.refreshWritingAnalyses=async()=>{
  if(refreshing)return;refreshing=true;const status=el('waStatus');status.hidden=false;status.textContent='Atualizando análises…';
  try{const ok=await loadHistory();if(!ok){status.textContent='Não consegui atualizar. Toque em Análises para tentar novamente.';return;}window.renderWritingAnalyses();status.hidden=true;}catch(e){console.error(e);status.textContent='Não consegui carregar suas análises. Tente novamente.';}finally{refreshing=false;}
 };
})();
