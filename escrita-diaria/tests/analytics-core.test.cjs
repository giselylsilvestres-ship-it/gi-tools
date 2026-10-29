const test=require('node:test'),assert=require('node:assert/strict');const {summarize,day}=require('../analytics-core.js');
const now=new Date('2026-10-29T15:00Z');
const row=(createdAt,grade,extra={})=>({createdAt,grade,durationSeconds:600,analysis:'Comentário',writingType:'Narrativa',...extra});
test('30 local calendar days; unique-day frequency; missing grades excluded; general comparison',()=>{
 const s=summarize([row('2026-09-29T15:00Z',10),row('2026-09-30T03:00Z',6),row('2026-10-29T15:00Z',8),row('2026-10-29T16:00Z',null),row('2026-10-30T04:00Z',1)],now);
 assert.equal(s.total,4);assert.equal(s.recentCount,3);assert.equal(s.activeDays,2);assert.equal(s.weeklyFrequency,2/30*7);assert.equal(s.recentMean,7);assert.equal(s.overallMean,8);assert.equal(s.comparison,-1);
});
test('São Paulo midnight boundary and no invalid timestamps',()=>{assert.equal(day('2026-10-30T02:59:00Z'),'2026-10-29');assert.equal(day('2026-10-30T03:00:00Z'),'2026-10-30');assert.equal(summarize([row('invalid',9)],now).total,0);});
test('zero grade, multiple texts same day, decimal durations, comments newest first',()=>{
 const s=summarize([row('2026-10-27T15:00Z',0,{durationSeconds:0,writingType:'',analysis:''}),row('2026-10-28T15:00Z','8.5',{durationSeconds:630}),row('2026-10-28T16:00Z',7.5)],now);
 assert.equal(s.overallMean,16/3);assert.equal(s.scatter.length,2);assert.equal(s.scatter[0].x,10);assert.equal(s.timeline.length,2);assert.equal(s.timeline[1].value,8);assert.equal(s.timeline[1].count,2);assert.equal(s.types.find(t=>t.name==='Sem classificação').value,1);assert.equal(s.comments.length,2);assert.equal(s.comments[0].createdAt,'2026-10-28T16:00Z');
});
test('empty and single-point cases',()=>{const e=summarize([],now);assert.equal(e.total,0);assert.equal(e.recentMean,null);assert.equal(e.comparison,null);assert.equal(e.weeklyFrequency,0);const s=summarize([row('2026-10-28',5)],now);assert.equal(s.timeline.length,1);assert.equal(s.comparison,0);});
