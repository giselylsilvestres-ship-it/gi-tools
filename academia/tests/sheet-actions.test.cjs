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
 window.supabase={createClient:()=>({from(table){let action='select',payload,filters=[],single=false;const q={select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return q},delete(){action='delete';return q},update(p){action='update';payload=p;return q},single(){single=true;return q},then(resolve){calls.push({table,action,filters});let rows=db[table].filter(r=>filters.every(([k,v])=>r[k]===v||k==='user_id'&&!r[k]));if(action==='delete'){db[table]=db[table].filter(r=>!rows.includes(r));if(table==='gym_sheets')db.gym_plans=db.gym_plans.filter(p=>!rows.some(s=>s.id===p.sheet_id));}if(action==='update')rows.forEach(r=>Object.assign(r,payload));return Promise.resolve({data:single?rows[0]:rows,error:null}).then(resolve)}};return q},rpc(){throw Error('Unexpected autosave')}})};
 window.ResizeObserver=class{observe(){}};window.requestAnimationFrame=()=>{};
const ctx=vm.createContext(window),run=s=>vm.runInContext(s,ctx);
for(const name of ['workout-core.js','app.js','workout.js','session-controls.js','week-planner.js']){let code=fs.readFileSync(root+name,'utf8');if(name==='app.js')code=code.replace("window.addEventListener('DOMContentLoaded',()=>init().catch(showLoadError));",'');run(code);}
(async()=>{
await run("user={id:'u'};load()");run("openTraining('t');openSheet('empty')");
assert(window.document.getElementById('deleteRoutine'));assert(window.document.getElementById('routineName'));
run("$('routineName').value='Ficha renomeada';$('routineName').oninput()");await run('saveRoutine()');assert.equal(window.db.gym_sheets[0].name,'Ficha renomeada');
run("openSheet('full')");await run('deleteRoutine()');assert(!window.db.gym_sheets.some(s=>s.id==='full'));
run("currentDate='2026-10-28';currentSheet=sheets[0];openSession()");assert(!window.document.getElementById('sheetModal').hidden);
run("sheets[0].routine_data={version:3,name:'Ficha renomeada',exercises:[Gym.exercise({name:'Agachamento'})]};openSession();clearTimeout(saveTimer)");
for(const id of ['deleteWorkoutRecord','editWorkoutSheet','changeWorkoutSheet'])assert.equal(window.document.getElementById(id).hidden,false,id);
run("savingWorkout=true");await window.document.getElementById('deleteWorkoutRecord').onclick();assert.equal(window.db.gym_plans.length,1);
run("savingWorkout=false;saveTimer=setTimeout(()=>{window.resurrected=true},100);pendingSave=true");await window.document.getElementById('deleteWorkoutRecord').onclick();await new Promise(r=>setTimeout(r,150));
assert.equal(window.db.gym_plans.length,0);assert(!window.resurrected);assert.equal(run('activeWorkout'),null);assert.equal(window.document.querySelector('[data-summary-day="2026-10-28"]'),null);assert.equal(window.db.gym_sheets.length,1);assert.equal(window.localStorage.getItem('gica-gym-v3:u:2026-10-28'),null);
// Swapping a scheduled sheet clears the previous day and opens the picker.
run("db.gym_plans=[{id:'p2',user_id:'u',plan_date:'2026-10-28',sheet_id:'empty'}]");await run('load()');run("currentDate='2026-10-28';currentSheet=sheets[0];openSession();clearTimeout(saveTimer)");await window.document.getElementById('changeWorkoutSheet').onclick();assert.equal(window.db.gym_plans.length,0);assert.equal(window.document.getElementById('sheetPicker').hidden,false);
// Recorded workouts are removed from history as well as the weekly summary.
run("db.gym_sessions=[{id:'s',user_id:'u',session_date:'2026-10-28',sheet_id:'empty',completed:true,workout_data:Gym.start(sheets[0].routine_data)}];db.gym_sessions[0].workout_data.status='finished';close('sheetPicker')");await run('load()');run("currentDate='2026-10-28';currentSheet=sheets[0];openSession();clearTimeout(saveTimer)");assert.equal(window.document.getElementById('changeWorkoutSheet').hidden,true);await window.document.getElementById('deleteWorkoutRecord').onclick();assert.equal(window.db.gym_sessions.length,0);assert.equal(window.document.querySelector('[data-history="s"]'),null);
console.log('PASS: edit/delete empty sheet; sheet actions from calendar; delete unsaved plan; in-flight save guard; pending timer cancelled; calendar and weekly list synchronized; original sheet preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
