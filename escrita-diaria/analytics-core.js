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
  const uniqueDays=new Set(rows.map(r=>r.day)).size;
  const elapsedDays=rows.length?Math.round((Date.parse(today+'T12:00Z')-Date.parse(rows.at(-1).day+'T12:00Z'))/864e5)+1:0;
  const overallFrequency=elapsedDays?uniqueDays/elapsedDays*7:null;
  const timed=rows.filter(r=>r.minutes>0),totalMinutes=timed.reduce((s,r)=>s+r.minutes,0),totalWords=timed.reduce((s,r)=>s+Math.max(0,number(r.words)||0),0);
  const types=new Map(),dates=new Map();
  for(const r of rows){const type=String(r.writingType||'').trim()||'Sem classificação';if(!types.has(type))types.set(type,{count:0,grades:[]});const bucket=types.get(type);bucket.count++;if(r.grade!==null)bucket.grades.push(r.grade);if(r.grade!==null){if(!dates.has(r.day))dates.set(r.day,[]);dates.get(r.day).push(r.grade);}}
  return {uniqueDays,overallFrequency,frequencyComparison:overallFrequency===null?null:activeDays/30*7-overallFrequency,totalWords,totalMinutes,wordsPerMinute:totalMinutes?totalWords/totalMinutes:null,rows,total:rows.length,recentCount:recent.length,activeDays,weeklyFrequency:activeDays/30*7,recentMean,overallMean:overall,recentGradedCount:recentGraded.length,gradedCount:graded.length,comparison:recentMean===null||overall===null?null:recentMean-overall,
   types:[...types].map(([name,value])=>({name,value:value.count,average:mean(value.grades)})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'pt-BR')),
   scatter:graded.filter(r=>r.minutes>0&&number(r.words)!==null&&number(r.words)>=0).map(r=>({x:Number(r.words)/r.minutes,y:r.grade,row:r})),
   timeline:[...graded].reverse().map(r=>({date:r.day,value:r.grade,row:r})),
   comments:rows.filter(r=>String(r.analysis||'').trim())};
 }
 return {number,day,summarize};
});
