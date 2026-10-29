const assert=require('node:assert/strict');
const Gym=require('../workout-core.js');
const t=Date.parse('2026-10-28T12:00:00Z');
const w=Gym.start({version:3,name:'A',exercises:[Gym.exercise({name:'Agachamento'})]});
assert.equal(w.startedAt,null);assert.equal(Gym.elapsed(w,t+3600000),0);
Gym.toggleTimer(w,t);assert.equal(Gym.elapsed(w,t+65000),65);
Gym.toggleTimer(w,t+65000);assert.equal(w.startedAt,null);assert.equal(Gym.elapsed(w,t+600000),65);
Gym.toggleTimer(w,t+600000);assert.equal(Gym.elapsed(w,t+615000),80);
// Reloading a persisted running clock keeps counting from the explicitly requested start.
const reload=Gym.normalizeTimer(Gym.copy(w));assert.equal(Gym.elapsed(reload,t+620000),85);
Gym.pauseTimer(reload,t+620000);reload.status='finished';assert.equal(Gym.elapsed(reload,t+9999999),85);
const legacy=Gym.copy(w);delete legacy.timerVersion;legacy.startedAt='2026-10-01T00:00:00Z';legacy.elapsedSeconds=9999;
Gym.normalizeTimer(legacy);assert.equal(legacy.startedAt,null);assert.equal(Gym.elapsed(legacy,t),0);
legacy.exercises[0].sets[0].done=true;delete legacy.timerVersion;legacy.elapsedSeconds=120;Gym.normalizeTimer(legacy);assert.equal(Gym.elapsed(legacy,t),120);
const finished={...legacy,status:'finished',elapsedSeconds:300};delete finished.timerVersion;Gym.normalizeTimer(finished);assert.equal(Gym.elapsed(finished,t),300);
const neverStarted=Gym.start({version:3,name:'boxe',exercises:[Gym.exercise({name:'boxe',sets:[]})]});Gym.pauseTimer(neverStarted,t);neverStarted.status='finished';assert.equal(Gym.elapsed(neverStarted,t+999999),0);
console.log('PASS: no automatic start, start/pause/resume, persisted clock, finish freezes duration, legacy runaway clocks cleared, recorded durations preserved, completion without timer.');
