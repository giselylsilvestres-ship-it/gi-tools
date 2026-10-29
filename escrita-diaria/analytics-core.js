/* Pure writing analytics. Calendar windows use America/Sao_Paulo. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WritingAnalytics=api;})(globalThis,()=>{
 const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
 function day(v){const d=new Date(v);if(!Number.isFinite(d.getTime()))return null;return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
 const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 function summarize(history,now=new Date()){
  const today=day(now),cutoff=new Date(Date.parse(today+'T12:00:00Z')-29*864e5).toISOString().slice(0,10);
  const rows=history.map(r=>({...r,day:day(r.createdAt),grade:number(r.grade),minutes:number(r.durationSeconds)===null?null:Number(r.durationSeconds)/60})).filter(r=>r.day&&r.day<=today).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const recent=rows.filter(r=>r.day>=cutoff),graded=rows.filter(r=>r.grade!==null),recentGraded=recent.filter(r=>r.grade!==null);
  const activeDays=new Set(recent.map(r=>r.day)).size,overall=mean(graded.map(r=>r.grade)),recentMean=mean(recentGraded.map(r=>r.grade));
  const types=new Map(),dates=new Map();
  for(const r of rows){const type=String(r.writingType||'').trim()||'Sem classificação';types.set(type,(types.get(type)||0)+1);if(r.grade!==null){if(!dates.has(r.day))dates.set(r.day,[]);dates.get(r.day).push(r.grade);}}
  return {rows,total:rows.length,recentCount:recent.length,activeDays,weeklyFrequency:activeDays/30*7,recentMean,overallMean:overall,recentGradedCount:recentGraded.length,gradedCount:graded.length,comparison:recentMean===null||overall===null?null:recentMean-overall,
   types:[...types].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'pt-BR')),
   scatter:graded.filter(r=>r.minutes>0).map(r=>({x:r.minutes,y:r.grade,row:r})),
   timeline:[...dates].sort(([a],[b])=>a.localeCompare(b)).map(([date,grades])=>({date,value:mean(grades),count:grades.length})),
   comments:rows.filter(r=>String(r.analysis||'').trim())};
 }
 return {number,day,summarize};
});
