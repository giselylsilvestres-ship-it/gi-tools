/* Shared, deterministic workout rules. No DOM, network, or storage. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.Gym=factory()})(globalThis,()=>{
  const copy=x=>JSON.parse(JSON.stringify(x));
  const id=()=>globalThis.crypto.randomUUID();
  const number=x=>x===''||x==null?null:Number(String(x).replace(',','.'));
  function set(seed={}){return {id:id(),type:'normal',weight:null,reps:null,targetReps:'10',done:false,drops:[],...seed}}
  function exercise(seed={}){return {id:id(),exerciseId:null,name:'Exercício',imageUrl:null,restSeconds:90,supersetId:null,notes:'',sets:[set(),set(),set()],...seed}}
  const steps=s=>[s,...(s.drops||[])];
  const done=s=>steps(s).every(x=>x.done);
  const valid=s=>s.weight!==null&&Number.isFinite(s.weight)&&s.weight>=0&&Number.isInteger(s.reps)&&s.reps>0&&s.reps<=1000;
  const allSets=w=>w.exercises.flatMap(e=>e.sets);
  function stats(w){const sets=allSets(w),completed=sets.filter(done);return {total:sets.length,done:completed.length,volume:sets.reduce((n,s)=>n+steps(s).filter(x=>x.done).reduce((v,x)=>v+(x.weight||0)*(x.reps||0),0),0),steps:sets.flatMap(steps).filter(x=>x.done).length}}
  function normalizeGroups(exercises){const groups={};exercises.forEach(e=>{if(e.supersetId)(groups[e.supersetId]??=[]).push(e)});Object.values(groups).filter(g=>g.length<2).forEach(g=>g[0].supersetId=null);return exercises}
  function next(w,exerciseId,setIndex){const ex=w.exercises.find(e=>e.id===exerciseId),members=ex.supersetId?w.exercises.filter(e=>e.supersetId===ex.supersetId):[ex];const pending=members.find(e=>e.sets[setIndex]&&!done(e.sets[setIndex]));if(pending)return {rest:false,exerciseId:pending.id,setIndex};const more=allSets(w).some(s=>!done(s));const following=members.find(e=>e.sets[setIndex+1]&&!done(e.sets[setIndex+1]));return {rest:more,seconds:members.at(-1).restSeconds,exerciseId:following?.id,setIndex:setIndex+1}}
  function fromLinks(links,catalog){return links.map(l=>{const e=catalog.find(e=>e.id===l.exercise_id);return exercise({id:l.id,exerciseId:e?.id||null,name:e?.name||l.name,imageUrl:e?.image_url||l.image_url,sets:Array.from({length:Math.min(20,Math.max(1,l.sets||3))},()=>set({targetReps:l.reps||'10'}))})})}
  function fromLegacy(rows,links,catalog){return rows.map(r=>{const l=links.find(l=>l.id===r.exercise_id||l.exercise_id===r.exercise_id),e=catalog.find(e=>e.id===(l?.exercise_id||r.exercise_id));return exercise({exerciseId:e?.id||null,name:r.exercise_name,imageUrl:e?.image_url,legacy:true,sets:[set({weight:number(r.weight),reps:null,targetReps:r.reps,done:false})],legacySummary:`${r.sets} × ${r.reps} · ${r.weight??'—'} kg · ${r.completed?'concluído':'parcial'}`})})}
  function start(template,history=[]){const w=copy(template);w.version=3;w.status='active';w.startedAt=new Date().toISOString();w.finishedAt=null;w.restEnd=null;w.elapsedSeconds=0;w.notes='';w.exercises.forEach(e=>{const prev=history.map(w=>w.exercises.find(p=>p.exerciseId&&p.exerciseId===e.exerciseId)).find(Boolean);e.sets.forEach((s,i)=>{const p=prev?.sets[i];s.done=false;s.weight=p?.weight??s.weight;s.reps=p?.reps??s.reps;s.drops.forEach((d,j)=>{d.done=false;d.weight=p?.drops[j]?.weight??d.weight;d.reps=p?.drops[j]?.reps??d.reps})})});return w}
  function validate(w){if(w.version!==3||!Array.isArray(w.exercises)||w.exercises.length>100)return 'Treino inválido.';if(!w.exercises.length)return 'Adicione pelo menos um exercício.';for(const e of w.exercises){if(!e.sets.length||e.sets.length>30)return 'Use entre 1 e 30 séries por exercício.';for(const s of e.sets){for(const step of steps(s))if(step.done&&!valid(step))return 'Preencha carga (zero para peso corporal) e repetições antes de concluir a série.'}}return null}
  function template(w){const t=copy(w);t.exercises.forEach(e=>e.sets.forEach(s=>steps(s).forEach(x=>x.done=false)));return {version:3,name:t.name,exercises:t.exercises}}
  return {copy,id,number,set,exercise,steps,done,valid,stats,normalizeGroups,next,fromLinks,fromLegacy,start,validate,template};
});
