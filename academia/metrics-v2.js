(()=>{
const el=id=>document.getElementById(id),DAY=864e5,dash='—';
// Ordered visual sequence requested for all categorical bars/markers:
// Master Key → Prickly Pear → Mozart → Sunburn → Roycroft Copper Red.
let metricsPeriod='week',metricsCache=null;
const PALETTE=['#DCCD8A','#A7993C','#475480','#B57056','#7F3B25'];
function d(s){return new Date(`${s}T12:00:00`)}function monday(x){x=new Date(x);x.setHours(12,0,0,0);let n=x.getDay()||7;x.setDate(x.getDate()-n+1);return x}function pct(a,b){return b?Math.round(a/b*100):0}function fmt(v,n=1){return Number(v).toFixed(n).replace('.',',')}
function activityName(s,sheetTypes){
  // Explicit sheet classification is authoritative. Historical sessions use the
  // saved sheet ID; never infer a new activity type from an arbitrary sheet title.
  const category=sheetTypes.get(s.sheet_id);
  return category||'Não classificado';
}
function setsFrom(sessions){const out=[];for(const s of sessions)for(const ex of(s.workout_data?.exercises||[]))for(const set of(ex.sets||[])){if(!set.done||set.type==='warmup')continue;const w=set.weight==null||set.weight===''?null:Number(set.weight),r=set.reps==null||set.reps===''?null:Number(set.reps);out.push({date:s.session_date,exercise:ex.name,exerciseId:ex.exerciseId,sheetId:s.sheet_id,weight:Number.isFinite(w)?w:null,reps:Number.isFinite(r)?r:null});for(const drop of(set.drops||[])){const dw=drop.weight==null||drop.weight===''?null:Number(drop.weight),dr=drop.reps==null||drop.reps===''?null:Number(drop.reps);if(Number.isFinite(dw)&&Number.isFinite(dr)&&dw>0&&dr>0)out.push({date:s.session_date,exercise:ex.name,exerciseId:ex.exerciseId,weight:dw,reps:dr,drop:true})}}return out}
function e1rm(x){return x.weight>0&&x.reps>0?x.weight*(1+x.reps/30):null}function bestByExercise(sets,start,end){const m={};for(const x of sets){const dt=d(x.date),v=e1rm(x);if(v==null||dt<start||dt>end)continue;const k=x.exerciseId||x.exercise;m[k]=Math.max(m[k]||0,v)}return m}
function strengthChange(sets,now){const a0=new Date(now);a0.setDate(a0.getDate()-29);const b1=new Date(a0);b1.setDate(b1.getDate()-1);const b0=new Date(b1);b0.setDate(b0.getDate()-29);const cur=bestByExercise(sets,a0,now),prev=bestByExercise(sets,b0,b1),changes=[];for(const k of Object.keys(cur))if(prev[k]>0)changes.push((cur[k]/prev[k]-1)*100);return changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:null}
function bars(target,rows){const max=Math.max(1,...rows.map(x=>x.value));target.innerHTML=rows.length?rows.map((x,i)=>`<div class="balance-row"><span class="balance-name">${x.name}</span><i class="balance-track"><b style="width:${x.value/max*100}%;background:${PALETTE[i%PALETTE.length]}"></b></i><strong>${x.value}</strong><small class="${x.tone||''}">${x.extra??''}</small></div>`).join(''):`<div class="strength-empty">${dash}</div>`}
async function getData(){const[sr,cr,tr,sh]=await Promise.all([sb.from('gym_sessions').select('id,session_date,completed,training_id,sheet_id,workout_data').eq('user_id',user.id).eq('completed',true).order('session_date'),sb.from('gym_exercise_catalog').select('id,name,muscle_groups,primary_muscles').eq('user_id',user.id),sb.from('gym_trainings').select('id,name').eq('user_id',user.id),sb.from('gym_sheets').select('id,activity_type').eq('user_id',user.id)]);if(sr.error)throw sr.error;if(cr.error)throw cr.error;if(tr.error)throw tr.error;if(sh.error)throw sh.error;return{sessions:sr.data||[],catalog:cr.data||[],trainings:tr.data||[],sheets:sh.data||[]}}
function periodBounds(now){
  const end=new Date(now);end.setHours(23,59,59,999);
  const start=metricsPeriod==='week'?monday(now):new Date(now);
  if(metricsPeriod==='month')start.setDate(start.getDate()-29);
  start.setHours(0,0,0,0);
  return {start,end};
}
function updatePeriodControls(){
  document.querySelectorAll('[data-metrics-period]').forEach(button=>{
    const active=button.dataset.metricsPeriod===metricsPeriod;
    button.setAttribute('aria-pressed',String(active));
  });
}
function renderDetails(data,now){
  const {start,end}=periodBounds(now);
  const recent=data.sessions.filter(s=>{const dt=d(s.session_date);return dt>=start&&dt<=end});
  const sheetTypes=new Map(data.sheets.map(sh=>[sh.id,sh.activity_type]));
  const am={};
  recent.forEach(s=>{const name=activityName(s,sheetTypes);am[name]=(am[name]||0)+1});
  bars(el('activityBalance'),Object.entries(am).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value,extra:`${pct(value,recent.length)}%`})));
  const sets=setsFrom(data.sessions);
  renderMuscles(sets,data.catalog,now);
  renderPRs(sets,start,end);
  renderStrengthChart(sets,data.catalog,sheetTypes,now);
  const activityLabel=el('activityPeriodLabel');
  if(activityLabel)activityLabel.textContent=metricsPeriod==='week'?'distribuição das sessões · semana atual':'distribuição das sessões · últimos 30 dias';
  const prLabel=el('prPeriodLabel');
  if(prLabel)prLabel.textContent=metricsPeriod==='week'?'recordes pessoais · semana atual':'recordes pessoais · últimos 30 dias';
  updatePeriodControls();
}
async function render(){
  let data;try{data=await getData()}catch(e){console.error('metrics',e);return}
  metricsCache=data;
  const done=data.sessions,now=new Date(),year=now.getFullYear(),yearDone=done.filter(s=>d(s.session_date).getFullYear()===year);
  const yearLen=365+(new Date(year,1,29).getMonth()===1?1:0),dayOfYear=Math.floor((now-new Date(year,0,1))/DAY)+1,yearProgress=Math.min(100,pct(dayOfYear,yearLen));
  el('mTotal').textContent=yearDone.length||dash;
  el('mTotalSub').textContent=yearDone.length?`${yearProgress}% do ano · YTD`:dash;
  if(el('mTotalBar'))el('mTotalBar').style.width=`${yearProgress}%`;
  const c30=new Date(now);c30.setDate(c30.getDate()-29);
  const recent=done.filter(s=>{const x=d(s.session_date);return x>=c30&&x<=now}),freq=recent.length?recent.length/30*7:null;
  el('mMonth').textContent=freq==null?dash:`${fmt(freq)}×`;
  const yearFreq=yearDone.length?yearDone.length/Math.max(1,dayOfYear)*7:null;
  el('mMonthSub').textContent=freq==null?dash:(yearFreq==null?dash:`média do ano · ${fmt(yearFreq)}×/sem`);
  const first=done.length?d(done[0].session_date):null;let weeks=0,good=0;
  if(first){for(let w=monday(first);w<=monday(now);w.setDate(w.getDate()+7)){weeks++;const end=new Date(w);end.setDate(end.getDate()+6);const n=done.filter(s=>{const x=d(s.session_date);return x>=w&&x<=end}).length;if(n>=4)good++}}
  const consistency=weeks?pct(good,weeks):null;
  el('mStreak').textContent=consistency==null?dash:`${consistency}%`;
  el('mStreakSub').textContent=weeks?`${good} de ${weeks} semanas`:dash;
  if(el('mStreakBar'))el('mStreakBar').style.width=`${consistency||0}%`;
  renderDetails(data,now);
}
document.querySelectorAll('[data-metrics-period]').forEach(button=>button.addEventListener('click',()=>{
  metricsPeriod=button.dataset.metricsPeriod;
  if(metricsCache)renderDetails(metricsCache,new Date());
}));

// Count each completed working set once, in its catalog's first (principal) muscle group.
// Secondary involvement is intentionally not added as another full set.
function renderMuscles(sets,catalog,now){
  const {start:cutoff,end}=periodBounds(now);
  const recent=sets.filter(x=>{const date=d(x.date);return date>=cutoff&&date<=end&&!x.drop});
  const byId=new Map(catalog.map(x=>[x.id,x])),byName=new Map(catalog.map(x=>[String(x.name).toLowerCase(),x])),count={};
  for(const x of recent){
    const exercise=byId.get(x.exerciseId)||byName.get(String(x.exercise).toLowerCase());
    const groups=exercise?.primary_muscles?.length?exercise.primary_muscles:exercise?.muscle_groups||[];
    const primary=groups[0];if(primary)count[primary]=(count[primary]||0)+1;
  }
  // Compare the latest two distinct training days for the SAME exercise.
  // Group percentages are the average of comparable exercise changes, never
  // comparisons between different exercises or between different machines.
  const histories=new Map();
  for(const x of sets){
    if(x.drop||e1rm(x)==null)continue;
    const exercise=byId.get(x.exerciseId)||byName.get(String(x.exercise).toLowerCase());
    const group=(exercise?.primary_muscles?.length?exercise.primary_muscles:exercise?.muscle_groups||[])[0];
    if(!group)continue;
    const key=x.exerciseId||String(x.exercise).toLowerCase();
    if(!histories.has(key))histories.set(key,{group,days:new Map()});
    const days=histories.get(key).days,estimated=e1rm(x);
    days.set(x.date,Math.max(days.get(x.date)||0,estimated));
  }
  const changes={};
  for(const {group,days} of histories.values()){
    const dates=[...days.keys()].sort().reverse();
    if(dates.length<2)continue;
    const last=days.get(dates[0]),previous=days.get(dates[1]);
    if(previous>0)(changes[group]??=[]).push((last/previous-1)*100);
  }
  const label=el('muscleBalancePeriodLabel');if(label)label.textContent=metricsPeriod==='week'?'séries por grupo · semana atual (seg–dom)':'séries por grupo · últimos 30 dias';
  
  bars(el('muscleBalance'),Object.entries(count).sort((a,b)=>b[1]-a[1]).map(([name,value])=>{const values=changes[name]||[],change=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;return{name,value,extra:change==null?dash:`${change>=0?'+':''}${fmt(change)}%`,tone:change>0?'positive':change<0?'negative':''}}));
}

function renderPRs(sets,start,end){const valid=sets.filter(x=>e1rm(x)!=null&&d(x.date)>=start&&d(x.date)<=end),best={};for(const x of valid){const k=x.exerciseId||x.exercise,v=e1rm(x);if(!best[k]||v>best[k].v)best[k]={...x,v}}const rows=Object.values(best).sort((a,b)=>d(b.date)-d(a.date)).slice(0,4);el('recentPrs').className=rows.length?'pr-list':'strength-empty';el('recentPrs').innerHTML=rows.length?rows.map((x,i)=>`<div class="pr-row"><span class="pr-dot" style="background:${PALETTE[i%PALETTE.length]}"></span><div class="pr-copy"><strong>${x.exercise}</strong><small>${x.date.split('-').reverse().join('/')}</small></div><span class="pr-value">${fmt(x.weight,Number.isInteger(x.weight)?0:1)} kg × ${x.reps}</span></div>`).join(''):dash}
function renderStrengthChart(sets,now){
  const target=el('strengthChart');
  if(!target)return;
  const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-29);
  // Display actual measured performance even before two comparable time windows exist.
  // Do not average estimated 1RMs of unrelated movements into a fictitious strength trend.
  const recent=sets.filter(x=>!x.drop&&d(x.date)>=cutoff&&d(x.date)<=now&&e1rm(x)!=null);
  const best=new Map();
  for(const x of recent){
    const key=x.exerciseId||x.exercise,value=e1rm(x);
    if(!best.has(key)||value>best.get(key).value)best.set(key,{name:x.exercise,value,date:x.date,weight:x.weight,reps:x.reps});
  }
  const rows=[...best.values()].sort((a,b)=>b.date.localeCompare(a.date)||b.value-a.value).slice(0,5);
  if(!rows.length){target.className='strength-empty';target.textContent=dash;return}
  const max=Math.max(...rows.map(x=>x.value));
  target.className='strength-exercise-list';
  target.innerHTML='<div class="strength-method-label">Melhor força estimada por exercício · últimos 30 dias</div>'+
    rows.map((x,i)=>'<div class="strength-exercise-row"><span class="strength-exercise-name">'+String(x.name).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))+'</span><span class="strength-exercise-bar"><b style="width:'+(x.value/max*100).toFixed(1)+'%;background:'+PALETTE[i%PALETTE.length]+'"></b></span><strong>'+fmt(x.value,1)+' kg</strong></div>').join('')+
    '<small class="strength-method-note">e1RM estimado a partir da carga e repetições. Exercícios diferentes não devem ser comparados entre si.</small>';
}

const toggle=el('metricsDetailsToggle'),details=el('metricsDetails');if(toggle&&details)toggle.onclick=()=>{const open=details.hidden;details.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.querySelector('span').textContent=open?'⌃':'⌄'};const old=window.renderMetrics;window.renderMetrics=function(){old?.();render()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(render,150));else setTimeout(render,150);
})();