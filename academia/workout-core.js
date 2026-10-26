/* Shared, deterministic workout rules. No DOM, network, or storage. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.Gym=factory()})(globalThis,()=>{
  const copy=x=>JSON.parse(JSON.stringify(x));
  const id=()=>globalThis.crypto.randomUUID();
  const number=x=>x===''||x==null?null:Number(String(x).replace(',','.'));
  function set(seed={}){return {id:id(),type:'normal',weight:null,reps:null,targetReps:'10',done:false,drops:[],...seed}}
  function exercise(seed={}){return {id:id(),exerciseId:null,name:'Exercício',imageUrl:null,restSeconds:90,supersetId:null,notes:'',sets:[set(),set(),set()],...seed}}
  const steps=s=>[s,...(s.drops||[])];
  const done=s=>steps(s).every(x=>x.done);
  const valid=s=>(s.weight==null||(Number.isFinite(s.weight)&&s.weight>=0&&s.weight<=10000))&&(s.reps==null||(Number.isInteger(s.reps)&&s.reps>0&&s.reps<=1000));
  const allSets=w=>w.exercises.flatMap(e=>e.sets);
  function stats(w){const sets=allSets(w),completed=sets.filter(done);return {total:sets.length,done:completed.length,volume:sets.reduce((n,s)=>n+steps(s).filter(x=>x.done).reduce((v,x)=>v+(x.weight||0)*(x.reps||0),0),0),steps:sets.flatMap(steps).filter(x=>x.done).length}}
  function normalizeGroups(exercises){const groups={};exercises.forEach(e=>{if(e.supersetId)(groups[e.supersetId]??=[]).push(e)});Object.values(groups).filter(g=>g.length<2).forEach(g=>g[0].supersetId=null);return exercises}
  function next(w,exerciseId,setIndex){const ex=w.exercises.find(e=>e.id===exerciseId),members=ex.supersetId?w.exercises.filter(e=>e.supersetId===ex.supersetId):[ex];const pending=members.find(e=>e.sets[setIndex]&&!done(e.sets[setIndex]));if(pending)return {rest:false,exerciseId:pending.id,setIndex};const more=allSets(w).some(s=>!done(s));const following=members.find(e=>e.sets[setIndex+1]&&!done(e.sets[setIndex+1]));return {rest:more,seconds:members.at(-1).restSeconds,exerciseId:following?.id,setIndex:setIndex+1}}
  function fromLinks(links,catalog){return links.map(l=>{const e=catalog.find(e=>e.id===l.exercise_id);return exercise({id:l.id,exerciseId:e?.id||null,name:e?.name||l.name,imageUrl:e?.image_url||l.image_url,sets:Array.from({length:Math.min(20,Math.max(1,l.sets||3))},()=>set({targetReps:l.reps||'10'}))})})}
  function fromLegacy(rows,links,catalog){return rows.map(r=>{const l=links.find(l=>l.id===r.exercise_id||l.exercise_id===r.exercise_id),e=catalog.find(e=>e.id===(l?.exercise_id||r.exercise_id));return exercise({exerciseId:e?.id||null,name:r.exercise_name,imageUrl:e?.image_url,legacy:true,sets:[set({weight:number(r.weight),reps:null,targetReps:r.reps,done:false})],legacySummary:`${r.sets} × ${r.reps} · ${r.weight??'—'} kg · ${r.completed?'concluído':'parcial'}`})})}
  function previousValue(history,exerciseId,index,drop,field){
    if(!exerciseId)return null;
    for(const workout of history){
      const e=workout.exercises.find(e=>e.exerciseId===exerciseId);if(!e?.sets.length)continue;
      const s=e.sets[Math.min(index,e.sets.length-1)],step=drop===null?s:s?.drops?.[drop];
      const value=step?.[field];if(value!=null&&Number.isFinite(value))return value;
    }
    return null;
  }
  function suggestedReps(target){
    if(target==null)return null;
    const text=String(target).trim();
    if(/(?:\d\s*(?:s|seg(?:undo)?s?|min(?:uto)?s?)\b|segundos|minutos)/i.test(text))return null;
    const match=text.match(/^(\d+)(?:\s*(?:[-–—]|a)\s*(\d+))?(?=$|\s|[·(])/i);
    if(!match)return null;const value=Number(match[2]||match[1]);return Number.isInteger(value)&&value>0&&value<=1000?value:null;
  }
  function prefill(w,history){
    w.exercises.forEach(e=>e.sets.forEach((s,i)=>steps(s).forEach((step,j)=>{
      if(step.done)return;
      const drop=j===0?null:j-1;
      for(const field of ['weight','reps'])if(step[field]==null&&!step[field+'Edited'])step[field]=previousValue(history,e.exerciseId,i,drop,field)??(field==='reps'?suggestedReps(s.targetReps):null);
    })));
    return w;
  }
  function setWeight(e,setIndex,drop,value){
    const source=drop===null?e.sets[setIndex]:e.sets[setIndex].drops[drop];
    source.weight=value;source.weightEdited=true;
    for(let i=setIndex+1;i<e.sets.length;i++){
      const s=e.sets[i];if((s.type==='warmup')!==(e.sets[setIndex].type==='warmup'))continue;
      const step=drop===null?s:s.drops[drop];
      if(step&&!step.done&&!step.weightEdited)step.weight=value;
    }
  }
  function start(template,history=[]){
    const w=copy(template);w.version=3;w.status='active';w.startedAt=new Date().toISOString();w.finishedAt=null;w.restEnd=null;w.elapsedSeconds=0;w.notes='';
    w.exercises.forEach(e=>e.sets.forEach((s,i)=>steps(s).forEach((step,j)=>{
      const drop=j===0?null:j-1;step.done=false;delete step.weightEdited;delete step.repsEdited;
      for(const field of ['weight','reps'])step[field]=previousValue(history,e.exerciseId,i,drop,field)??step[field]??(field==='reps'?suggestedReps(s.targetReps):null);
    })));
    return w;
  }
  function validate(w){if(w.version!==3||!Array.isArray(w.exercises)||w.exercises.length>100)return 'Treino inválido.';if(!w.exercises.length)return 'Adicione pelo menos um exercício.';for(const e of w.exercises){if(!e.sets.length||e.sets.length>30)return 'Use entre 1 e 30 séries por exercício.';for(const s of e.sets){for(const step of steps(s))if(step.done&&!valid(step))return 'Confira os valores: carga de 0 a 10.000 kg e repetições inteiras de 1 a 1.000, ou deixe em branco.'}}return null}
  function template(w){const t=copy(w);t.exercises.forEach(e=>e.sets.forEach(s=>steps(s).forEach(x=>x.done=false)));return {version:3,name:t.name,exercises:t.exercises}}
  return {copy,id,number,set,exercise,steps,done,valid,stats,normalizeGroups,next,fromLinks,fromLegacy,previousValue,suggestedReps,prefill,setWeight,start,validate,template};
});
