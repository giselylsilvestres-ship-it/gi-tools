// Run: npm install --prefix /tmp/gi-gym-tests linkedom@0.18.12
// NODE_PATH=/tmp/gi-gym-tests/node_modules node academia/tests/sheet-actions.test.cjs
const {parseHTML}=require('linkedom');
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root=__dirname+'/../';
const {window}=parseHTML(fs.readFileSync(root+'index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,''));
const storage=new Map();Object.assign(window,{console,structuredClone,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k),key:i=>[...storage.keys()][i],get length(){return storage.size}},setTimeout,clearTimeout,setInterval:()=>{},confirm:()=>true,alert:()=>{},requestAnimationFrame:()=>{}});
window.HTMLElement.prototype.focus=function(){};
 window.GI_SUPABASE_URL='test';window.GI_SUPABASE_KEY='test';
 window.db={gym_trainings:[{id:'t',name:'Treino'}],gym_sheets:[{id:'empty',training_id:'t',name:'musculação'},{id:'full',training_id:'t',name:'A',routine_data:{version:3,name:'A',exercises:[]}}],gym_plans:[{id:'p',user_id:'u',plan_date:'2026-10-28',sheet_id:'empty'}],gym_sessions:[],gym_sheet_exercises:[],gym_exercise_catalog:[],gym_session_exercises:[]};window.calls=[];
 window.supabase={createClient:()=>({from(table){let action='select',payload,filters=[],single=false;const q={select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return q},delete(){action='delete';return q},update(p){action='update';payload=p;return q},single(){single=true;return q},then(resolve){calls.push({table,action,filters});let rows=db[table].filter(r=>filters.every(([k,v])=>r[k]===v||k==='user_id'&&!r[k]));if(action==='delete'){db[table]=db[table].filter(r=>!rows.includes(r));if(table==='gym_sheets')db.gym_plans=db.gym_plans.filter(p=>!rows.some(s=>s.id===p.sheet_id));}if(action==='update')rows.forEach(r=>Object.assign(r,payload));return Promise.resolve({data:single?rows[0]:rows,error:null}).then(resolve)}};return q},async rpc(name,args){
 calls.push({rpc:name,args});if(window.failSwap&&name==='gym_swap_planned_sheet')return {error:new Error('Simulated failure')};
 const date=args.p_date,old=db.gym_sessions.find(s=>s.session_date===date);
 const data={id:old?.id||'mock-session',user_id:'u',session_date:date,sheet_id:args.p_sheet_id,training_id:'t',revision:(old?.revision||0)+1,workout_data:structuredClone(args.p_workout),completed:args.p_workout.status==='finished'};
 db.gym_sessions=db.gym_sessions.filter(s=>s!==old).concat(data);
 if(name==='gym_swap_planned_sheet'){const plan=db.gym_plans.find(p=>p.plan_date===date);if(plan)plan.sheet_id=args.p_sheet_id;else db.gym_plans.push({plan_date:date,sheet_id:args.p_sheet_id});}
 return {data,error:null};
 }})};
 window.ResizeObserver=class{observe(){}};window.requestAnimationFrame=()=>{};
const ctx=vm.createContext(window),run=s=>vm.runInContext(s,ctx);
for(const name of ['workout-core.js','app.js','workout.js','session-controls.js','week-planner.js']){let code=fs.readFileSync(root+name,'utf8');if(name==='app.js')code=code.replace("window.addEventListener('DOMContentLoaded',()=>init().catch(showLoadError));",'');run(code);}
(async()=>{
await run("user={id:'u'};load()");run("openTraining('t');openSheet('empty')");
assert(window.document.getElementById('deleteRoutine'));assert(window.document.getElementById('routineName'));
run("$('routineName').value='Ficha renomeada';$('routineName').oninput()");await run('saveRoutine()');assert.equal(window.db.gym_sheets[0].name,'Ficha renomeada');
run("openSheet('full')");await run('deleteRoutine()');assert(!window.db.gym_sheets.some(s=>s.id==='full'));
run("currentDate='2026-10-28';currentSheet=sheets[0];openSession();clearTimeout(saveTimer)");assert(!window.document.getElementById('sessionModal').hidden);assert.equal(run('activeWorkout.activityOnly'),true);assert.equal(run('Gym.validate(activeWorkout)'),null);
run("sheets[0].routine_data={version:3,name:'Ficha renomeada',exercises:[Gym.exercise({name:'Agachamento'})]};openSession();clearTimeout(saveTimer)");
for(const id of ['deleteWorkoutRecord','editWorkoutSheet','changeWorkoutSheet'])assert.equal(window.document.getElementById(id).hidden,false,id);
assert.equal(window.document.querySelector('#workoutTimerToggle .timer-label').textContent,'Iniciar');assert.equal(run('activeWorkout.startedAt'),null);assert.equal(window.document.getElementById('workoutDuration').textContent,'0:00');
window.document.getElementById('workoutTimerToggle').onclick();assert(run('activeWorkout.startedAt'));assert.equal(window.document.querySelector('#workoutTimerToggle .timer-label').textContent,'Pausar');
window.document.getElementById('workoutTimerToggle').onclick();assert.equal(run('activeWorkout.startedAt'),null);assert.equal(window.document.querySelector('#workoutTimerToggle .timer-label').textContent,'Retomar');run('clearTimeout(saveTimer)');
run("savingWorkout=true");await window.document.getElementById('deleteWorkoutRecord').onclick();assert.equal(window.db.gym_plans.length,1);
run("savingWorkout=false;saveTimer=setTimeout(()=>{window.resurrected=true},100);pendingSave=true");await window.document.getElementById('deleteWorkoutRecord').onclick();await new Promise(r=>setTimeout(r,150));
assert.equal(window.db.gym_plans.length,0);assert(!window.resurrected);assert.equal(run('activeWorkout'),null);assert.equal(window.document.querySelector('[data-summary-day="2026-10-28"]'),null);assert.equal(window.db.gym_sheets.length,1);assert.equal(window.localStorage.getItem('gica-gym-v3:u:2026-10-28'),null);
// Merely opening or canceling the picker must not delete or change anything.
run("db.gym_plans=[{id:'p2',user_id:'u',plan_date:'2026-10-28',sheet_id:'empty'}];db.gym_sheets.push({id:'boxe',training_id:'t',name:'boxe'})");await run('load()');run("currentDate='2026-10-28';currentSheet=sheets[0];openSession();clearTimeout(saveTimer)");
const before=JSON.stringify(window.db);await window.document.getElementById('changeWorkoutSheet').onclick();assert.equal(JSON.stringify(window.db),before);run("close('sheetPicker')");assert.equal(JSON.stringify(window.db),before);assert.equal(window.document.getElementById('changeWorkoutSheet').textContent,'');
// Failed replacement keeps the old plan. Choosing boxe successfully replaces both views.
await window.document.getElementById('changeWorkoutSheet').onclick();window.document.querySelector('[data-training-pick]').onclick();
window.failSwap=true;await window.document.querySelector('[data-sheet-pick="boxe"]').onclick();assert.equal(window.db.gym_plans[0].sheet_id,'empty');assert.equal(window.document.getElementById('sheetPicker').hidden,false);
window.failSwap=false;await window.document.querySelector('[data-sheet-pick="boxe"]').onclick();run('clearTimeout(saveTimer)');assert.equal(window.db.gym_plans[0].sheet_id,'boxe');assert.equal(run('activeWorkout.name'),'boxe');assert.equal(run('activeWorkout.activityOnly'),true);assert.equal(window.document.getElementById('saveSession').textContent,'Marcar como feito');assert.equal(window.document.getElementById('changeWorkoutSheet').hidden,false);
await run('finishWorkout()');run('clearTimeout(saveTimer)');assert.equal(window.db.gym_sessions[0].completed,true);assert.equal(run('Gym.stats(activeWorkout).done'),0);assert(window.document.querySelector('[data-summary-day="2026-10-28"] .summary-status.done'));
// Recorded workouts are removed from history as well as the weekly summary.
run("db.gym_sessions=[{id:'s',user_id:'u',session_date:'2026-10-28',sheet_id:'empty',completed:true,workout_data:Gym.start(sheets[0].routine_data)}];db.gym_sessions[0].workout_data.status='finished';close('sheetPicker')");await run('load()');run("currentDate='2026-10-28';currentSheet=sheets[0];openSession();clearTimeout(saveTimer)");assert.equal(window.document.getElementById('changeWorkoutSheet').hidden,true);await window.document.getElementById('deleteWorkoutRecord').onclick();assert.equal(window.db.gym_sessions.length,0);assert.equal(window.document.querySelector('[data-history="s"]'),null);
run('clearTimeout(saveTimer)');
console.log('PASS: cancel-safe swap, replacement failure, boxe completion without sets;  edit/delete empty sheet; sheet actions from calendar; delete unsaved plan; in-flight save guard; pending timer cancelled; calendar and weekly list synchronized; original sheet preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
