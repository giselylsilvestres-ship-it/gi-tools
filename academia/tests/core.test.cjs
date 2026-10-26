const {test}=require('node:test');const assert=require('node:assert/strict');const G=require('../workout-core.js');
const complete=seed=>G.set({weight:10,reps:10,done:true,...seed});
test('drops retain independent weights, reps and completion across JSON round trip',()=>{const s=complete({type:'drop',drops:[{id:'d1',weight:8,reps:7,done:true},{id:'d2',weight:5,reps:6,done:false}]});const w={version:3,exercises:[G.exercise({sets:[s]})]};assert.equal(G.done(s),false);assert.equal(G.stats(w).volume,156);const restored=JSON.parse(JSON.stringify(w));assert.deepEqual(restored.exercises[0].sets[0].drops,s.drops);s.drops[1].done=true;assert.equal(G.done(s),true);assert.equal(G.stats(w).volume,186)});
test('superset A1 does not rest, B1 rests, then returns to A2',()=>{const a=G.exercise({id:'a',supersetId:'group',sets:[complete(),G.set()]}),b=G.exercise({id:'b',supersetId:'group',restSeconds:120,sets:[G.set(),G.set()]});const w={exercises:[a,b]};assert.deepEqual(G.next(w,'a',0),{rest:false,exerciseId:'b',setIndex:0});b.sets[0].done=true;assert.deepEqual(G.next(w,'b',0),{rest:true,seconds:120,exerciseId:'a',setIndex:1})});
test('superset waits for every drop and handles unequal set counts',()=>{const a=G.exercise({id:'a',supersetId:'g',sets:[complete({drops:[{done:false,weight:5,reps:4}]})]}),b=G.exercise({id:'b',supersetId:'g',sets:[complete(),G.set()]});assert.equal(G.next({exercises:[a,b]},'b',0).rest,false);a.sets[0].drops[0].done=true;assert.equal(G.next({exercises:[a,b]},'b',0).rest,true)});
test('blank load/reps and zero kg are valid; entered values must remain valid',()=>{for(const s of [complete({weight:0}),complete({weight:null,reps:null})])assert.equal(G.valid(s),true);for(const s of [complete({weight:10001}),complete({reps:1.5}),complete({weight:-1}),complete({reps:0})])assert.equal(G.valid(s),false)});
test('starting routine copies previous loads by exact set/drop, clears all completion, preserves template',()=>{const old=G.exercise({exerciseId:'x',sets:[complete({drops:[{weight:3,reps:5,done:true}]})]});const t={version:3,name:'A',exercises:[G.exercise({exerciseId:'x',sets:[G.set({type:'drop',drops:[{weight:1,reps:2,done:false}]})]})]};const w=G.start(t,[{exercises:[old]}]);assert.equal(w.exercises[0].sets[0].weight,10);assert.equal(w.exercises[0].sets[0].done,false);assert.equal(w.exercises[0].sets[0].drops[0].weight,3);assert.equal(w.exercises[0].sets[0].drops[0].done,false);assert.equal(t.exercises[0].sets[0].weight,null)});
test('legacy aggregate never fabricates individual completed sets',()=>{const [e]=G.fromLegacy([{exercise_id:'link',exercise_name:'Leg',sets:3,reps:'8–12',weight:20,completed:true}],[{id:'link',exercise_id:'catalog'}],[{id:'catalog'}]);assert.equal(e.exerciseId,'catalog');assert.equal(e.legacy,true);assert.equal(e.sets[0].done,false);assert.equal(e.sets[0].reps,null)});
test('removing a superset member dissolves an orphan group',()=>{const e=G.exercise({supersetId:'orphan'});G.normalizeGroups([e]);assert.equal(e.supersetId,null)});

test('new load becomes default for later series without replacing manual or completed loads',()=>{
 const e=G.exercise({sets:[G.set(),G.set({weight:20,weightEdited:true}),complete({weight:15}),G.set({weight:12}),G.set({type:'warmup',weight:5})]});
 G.setWeight(e,0,null,18);assert.deepEqual(e.sets.map(s=>s.weight),[18,20,15,18,5]);
 G.setWeight(e,0,null,19);assert.equal(e.sets[3].weight,19);
});
test('propagation keeps drop stages independent',()=>{
 const make=()=>G.set({type:'drop',weight:12,drops:[{weight:8},{weight:4}]});const e=G.exercise({sets:[make(),make()]});
 G.setWeight(e,0,null,15);assert.deepEqual(e.sets.map(s=>s.drops.map(d=>d.weight)),[[8,4],[8,4]]);
 G.setWeight(e,0,0,9);assert.equal(e.sets[1].drops[0].weight,9);assert.equal(e.sets[1].drops[1].weight,4);
});
test('prefill skips blank recent records, reads earlier loads, and respects explicitly cleared values',()=>{
 const e=G.exercise({exerciseId:'x',sets:[G.set(),G.set({weight:null,weightEdited:true})]});const w={exercises:[e]};
 const history=[{exercises:[G.exercise({exerciseId:'x',sets:[G.set()]})]},{exercises:[G.exercise({exerciseId:'x',sets:[complete({weight:17})]})]}];
 G.prefill(w,history);assert.equal(e.sets[0].weight,17);assert.equal(e.sets[1].weight,null);
});
test('blank completion survives validation and never fabricates volume',()=>{
 const w={version:3,exercises:[G.exercise({sets:[G.set({done:true})]})]};assert.equal(G.validate(w),null);assert.equal(G.stats(w).done,1);assert.equal(G.stats(w).volume,0);
});

test('prefill never rewrites a completed blank series',()=>{const w={exercises:[G.exercise({exerciseId:'x',sets:[G.set({done:true})]})]};G.prefill(w,[{exercises:[G.exercise({exerciseId:'x',sets:[complete()]})]}]);assert.equal(w.exercises[0].sets[0].weight,null)});

test('rep targets suggest real integers without treating seconds or prose as repetitions',()=>{
 for(const [text,value] of [['10',10],['8–12 · progredindo carga',12],['8-12',12],['8 a 12',12],['10 cada perna',10],['10 · drop na última',10],['30 segundos',null],['30s',null],['1 min',null],['até a falha',null],['3x10',null]])assert.equal(G.suggestedReps(text),value,text);
});
test('new and resumed sets fill numeric reps, prefer history, and preserve explicit blanks',()=>{
 const template={name:'A',exercises:[G.exercise({exerciseId:'x',sets:[G.set({targetReps:'8–12'}),G.set({targetReps:'10 cada perna'})]})]};const w=G.start(template);assert.deepEqual(w.exercises[0].sets.map(s=>s.reps),[12,10]);
 const hist=[{exercises:[G.exercise({exerciseId:'x',sets:[complete({reps:9}),complete({reps:8})]})]}];assert.deepEqual(G.start(template,hist).exercises[0].sets.map(s=>s.reps),[9,8]);
 w.exercises[0].sets[0].reps=null;w.exercises[0].sets[1].reps=null;w.exercises[0].sets[1].repsEdited=true;G.prefill(w,[]);assert.deepEqual(w.exercises[0].sets.map(s=>s.reps),[12,null]);
});
