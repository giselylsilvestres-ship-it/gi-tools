import {timingSafeEqual} from 'node:crypto';
// Garmin Personal API v1 (official OpenAPI): explicit units and UTC timestamps.
export const n=(v,min=0,max=Infinity)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
const first=(...v)=>v.find(x=>x!==null&&x!==undefined)??null;
export function iso(v){if(v===null||v===undefined||v==='')return null;const ms=typeof v==='number'?v:Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(v)?v:v+'Z');return Number.isFinite(ms)?new Date(ms).toISOString():null;}
export const localDate=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
export const shiftDate=(d,days)=>new Date(Date.parse(d+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const minutes=v=>n(v)===null?null:v/60;
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const minimum=a=>a.length?Math.min(...a):null;
const maximum=a=>a.length?Math.max(...a):null;
export function sanitize(v){if(Array.isArray(v))return v.map(sanitize);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!/(?:bodyWeight|bodyMass|bodyFat|muscleMass|boneMass|bodyComposition|^weight$|^bmi$)/i.test(k)).map(([k,x])=>[k,sanitize(x)]));return v;}
export function normalize(userId,date,sources,now=new Date()){
 const payload=k=>sources[k]?.payload;
 const day=payload('summary')?.data?.find(x=>x.calendarDate===date);
 if(!day)throw Error('Garmin has no daily summary for requested date');
 const direct=payload('sleep')?.dailySleepDTO??payload('sleep');
 const sleep=direct?.calendarDate===date&&n(direct.sleepTimeSeconds)!==null?direct:(payload('sleep_range')||[]).find(x=>x.calendarDate===date)??null;
 const hrvDirect=payload('hrv')?.hrvSummary;
 const range=payload('hrv_range');const hrvs=Array.isArray(range)?range:range?.hrvSummaries||[];
 const hs=(hrvDirect?.calendarDate===date||hrvDirect&&!hrvDirect.calendarDate)?hrvDirect:hrvs.find(x=>x.calendarDate===date)??null;
 const start=iso(sleep?.sleepStartTimestampGMT),end=iso(sleep?.sleepEndTimestampGMT);
 const samples=[];
 function points(rows,metric,source,min,max){for(const raw of rows||[]){const observed=iso(raw?.[0]),value=n(raw?.[1],min,max);if(observed&&value!==null)samples.push({user_id:userId,date:localDate(observed),metric,source,observed_at:observed,value,raw_data:raw});}}
 for(const k of ['previous_heart_rate','heart_rate'])points(payload(k)?.heartRateValues,'heart_rate','daily_heart_rate',1,300);
 for(const k of ['previous_spo2','spo2']){
  points(payload(k)?.spO2SingleValues,'spo2','spo2_single',1,100);
  points(payload(k)?.spO2HourlyAverages,'spo2','spo2_hourly',1,100);
 }
 for(const r of payload('body_battery')||[])points(r.bodyBatteryValuesArray,'body_battery','body_battery',0,100);
 for(const r of payload('hrv')?.hrvReadings||[]){const t=iso(r.readingTimeGMT),v=n(r.hrvValue,1);if(t&&v!==null)samples.push({user_id:userId,date:localDate(t),metric:'hrv',source:'hrv',observed_at:t,value:v,raw_data:r});}
 const unique=[...new Map(samples.map(p=>[`${p.metric}:${p.source}:${p.observed_at}`,p])).values()];
 const night=metric=>start&&end?unique.filter(p=>p.metric===metric&&p.observed_at>=start&&p.observed_at<=end):[];
 const hrNight=night('heart_rate').map(p=>p.value);
 const bbNight=night('body_battery').sort((a,b)=>a.observed_at.localeCompare(b.observed_at));
 // Body Battery is sampled extrema per interval, not interpolated to the sleep boundaries.
 const bbStart=bbNight[0]?.value??null,bbEnd=bbNight.at(-1)?.value??null;
 const bbDay=unique.filter(p=>p.metric==='body_battery'&&p.date===date).map(p=>p.value);
 const stress=day.stress||{},intensity=day.intensityMinutes||{};
 const sourceStatus=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,{http_status:v.status,available:v.payload!==null&&v.payload!==undefined}]));
 const daily={user_id:userId,date,sleep_start:start,sleep_end:end,
  sleep_score:n(sleep?.sleepScores?.overall?.value,0,100),sleep_minutes:n(sleep?.sleepTimeSeconds)===null?null:Math.round(sleep.sleepTimeSeconds/60),
  sleep_deep_minutes:minutes(sleep?.deepSleepSeconds),sleep_light_minutes:minutes(sleep?.lightSleepSeconds),sleep_rem_minutes:minutes(sleep?.remSleepSeconds),sleep_awake_minutes:minutes(sleep?.awakeSleepSeconds),
  sleep_restless_moments:n(sleep?.restlessMomentsCount??sleep?.restlessMoments),sleep_awakenings:n(sleep?.awakeCount),
  hrv:n(hs?.lastNightAvg,1),hrv_5min_high:n(hs?.lastNight5MinHigh,1),hrv_status:hs?.status??null,hrv_baseline:hs?.baseline??null,
  resting_heart_rate:first(n(day.heartRate?.restingValue,1),n(payload('heart_rate')?.restingHeartRate,1)),
  sleep_heart_rate_avg:first(n(sleep?.avgHeartRate,1),avg(hrNight)),sleep_heart_rate_min:minimum(hrNight),
  sleep_spo2_avg:n(sleep?.averageSpO2Value,1,100),sleep_spo2_min:n(sleep?.lowestSpO2Value,1,100),
  sleep_respiration_avg:n(sleep?.averageRespirationValue,1),sleep_respiration_min:n(sleep?.lowestRespirationValue,1),
  body_battery_sleep_start:bbStart,body_battery_sleep_end:bbEnd,body_battery_sleep_charge:bbStart===null||bbEnd===null?null:bbEnd-bbStart,
  body_battery_max:first(n(day.bodyBattery?.maxValue,0,100),maximum(bbDay)),body_battery_min:first(n(day.bodyBattery?.minValue,0,100),minimum(bbDay)),
  stress_avg:n(stress.avgLevel,0,100),sleep_stress_avg:n(sleep?.avgSleepStress,0,100),
  stress_rest_minutes:n(stress.restDurationInMillis)===null?null:stress.restDurationInMillis/60000,
  stress_low_minutes:n(stress.lowStressDurationInMillis)===null?null:stress.lowStressDurationInMillis/60000,
  stress_medium_minutes:n(stress.mediumStressDurationInMillis)===null?null:stress.mediumStressDurationInMillis/60000,
  stress_high_minutes:n(stress.highStressDurationInMillis)===null?null:stress.highStressDurationInMillis/60000,
  steps:n(day.movement?.steps?.value??day.totalSteps),distance_meters:n(day.movement?.steps?.distanceInMeters??day.totalDistanceMeters),
  calories_total:n(day.calories?.burnedTotal??day.totalKilocalories),calories_resting:n(day.calories?.burnedResting??day.bmrKilocalories),calories_active:n(day.calories?.burnedActive??day.activeKilocalories),
  intensity_moderate_minutes:n(intensity.moderate),intensity_vigorous_minutes:n(intensity.vigorous),
  is_partial:date>=localDate(now),source_status:sourceStatus,
  raw_data:{version:2,summary:day,sleep,hrv_summary:hs,source_payloads:'garmin_raw',sleep_date_convention:'wake-up calendarDate (Garmin)',derived:{sleep_heart_rate_avg:!n(sleep?.avgHeartRate,1)&&hrNight.length?'mean of available HR samples in sleep window':'Garmin avgHeartRate',body_battery_sleep:'first/last available sample inside sleep window; not interpolated',body_battery_sleep_start_at:bbNight[0]?.observed_at??null,body_battery_sleep_end_at:bbNight.at(-1)?.observed_at??null},unavailable:{sleep_restless_moments:'Not in current Personal API DailySleepDTO; never substituted with awakeCount',hrv:hs?null:'Garmin returned no HRV for this date'}},synced_at:now.toISOString()};
 const activities=(payload('activities')||[]).filter(a=>a.activityId!==null&&a.activityId!==undefined).map(a=>{
  const detail=payload('activity_'+a.activityId),summary=detail?.summaryDTO||{};
  const zones=Object.fromEntries([1,2,3,4,5].map(z=>[String(z),n(a['hrTimeInZone_'+z])]).filter(([,v])=>v!==null));
  return {user_id:userId,activity_id:String(a.activityId),date,activity_type:a.activityType?.typeKey??detail?.activityTypeDTO?.typeKey??null,name:a.activityName??detail?.activityName??null,
   started_at:iso(a.startTimeGMT??summary.startTimeGMT??a.beginTimestamp),duration_seconds:first(n(a.duration),n(summary.duration)),calories:first(n(a.calories),n(summary.calories)),
   heart_rate_avg:first(n(a.averageHR,1),n(summary.averageHR,1)),heart_rate_max:first(n(a.maxHR,1),n(summary.maxHR,1)),heart_rate_zones:zones,
   training_load:first(n(a.activityTrainingLoad),n(summary.activityTrainingLoad)),training_effect_aerobic:first(n(a.aerobicTrainingEffect),n(summary.trainingEffect)),training_effect_anaerobic:first(n(a.anaerobicTrainingEffect),n(summary.anaerobicTrainingEffect)),raw_data:sanitize({list:a,detail}),synced_at:now.toISOString()};
 });
 return {daily:sanitize(daily),samples:unique,activities,sources:Object.entries(sources).map(([source,v])=>({source,raw_data:sanitize(v)}))};
}

export const config={maxDuration:300};
const GARMIN='https://personal.connectapi.garmin.com';
export const previousDate=(now=new Date())=>shiftDate(localDate(now),-1);
export function validDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;}
export function dailyRow(userId,date,summary,sleep,hrv,sleepSummaries){return normalize(userId,date,Object.fromEntries(Object.entries({summary,sleep,hrv,sleep_range:sleepSummaries}).map(([k,v])=>[k,{status:200,payload:v??null}]))).daily;}
async function response(url,options={}){
 const r=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error(`${new URL(url).hostname} HTTP ${r.status}`);return r;
}
export async function collect(date,token){
 const previous=shiftDate(date,-1),headers={Authorization:'Bearer '+token,Accept:'application/json'};
 async function get(path){
  const r=await fetch(GARMIN+path,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
  if([204,404].includes(r.status))return {status:r.status,payload:null};
  if(!r.ok)throw Error('Garmin '+path.split('?')[0]+' HTTP '+r.status);
  const text=await r.text();try{return {status:r.status,payload:text.trim()?JSON.parse(text):null};}catch{throw Error('Invalid Garmin JSON at '+path.split('?')[0]);}
 }
 const paths={summary:`/usersummary-service/v2/dailysummaries?startDate=${date}&endDate=${date}`,
  sleep:`/sleep-service/sleep/dailySleep?date=${date}`,sleep_range:`/sleep-service/sleep/dailySleepSummariesByDate?startDate=${previous}&endDate=${date}`,
  hrv:`/hrv-service/hrv/${date}`,hrv_range:`/hrv-service/hrv/daily/${previous}/${date}`,
  heart_rate:`/wellness-service/wellness/dailyHeartRate?date=${date}`,previous_heart_rate:`/wellness-service/wellness/dailyHeartRate?date=${previous}`,
  spo2:`/wellness-service/wellness/daily/spo2acclimation/${date}`,previous_spo2:`/wellness-service/wellness/daily/spo2acclimation/${previous}`,
  body_battery:`/wellness-service/wellness/bodyBattery/reports/daily?startDate=${previous}&endDate=${date}&chunks=288`,
  heart_rate_zones:'/biometric-service/heartRateZones/v2'};
 const sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([name,path])=>[name,await get(path)])));
 const activities=[];
 for(let start=0;start<1000;start+=100){
  const page=await get(`/activitylist-service/activities/search/activities?startDate=${date}&endDate=${date}&start=${start}&limit=100`);
  if(page.payload!==null&&!Array.isArray(page.payload))throw Error('Invalid Garmin activity list');
  if(page.payload===null){if(start===0)sources.activities=page;else throw Error('Incomplete Garmin activity pagination');break;}
  activities.push(...page.payload);sources.activities={status:200,payload:activities};if(page.payload.length<100)break;
  if(start===900)throw Error('Activity pagination limit exceeded');
 }
 // Bounded fan-out; activity payloads contain no exercise-workout or body-composition requests.
 let index=0;await Promise.all(Array.from({length:Math.min(4,activities.length)},async()=>{
  while(index<activities.length){const a=activities[index++];if(!/^\d+$/.test(String(a.activityId)))throw Error('Invalid Garmin activity ID');sources['activity_'+a.activityId]=await get('/activity-service/activity/'+a.activityId);}
 }));
 return sources;
}
export async function syncDate(date,token,env=process.env){
 const sources=await collect(date,token),bundle=normalize(env.GARMIN_USER_ID.trim(),date,sources);
 const r=await response(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/garmin_apply_sync',{
  method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({p_daily:bundle.daily,p_samples:bundle.samples,p_activities:bundle.activities,p_sources:bundle.sources})
 });
 const saved=await r.json();if(saved.date!==date||!saved.id)throw Error('Supabase did not confirm saved day');
 return {...saved,metrics:{sleep_minutes:bundle.daily.sleep_minutes,hrv:bundle.daily.hrv,hrv_available:bundle.daily.hrv!==null},is_partial:bundle.daily.is_partial};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Method not allowed'});}
 const {CRON_SECRET,GARMIN_API_KEY,GARMIN_USER_ID,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}=process.env;
 if(!CRON_SECRET)return res.status(503).json({ok:false,error:'Missing CRON_SECRET'});
 const expected=Buffer.from('Bearer '+CRON_SECRET),supplied=Buffer.from(req.headers.authorization||'');
 if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return res.status(401).json({ok:false,error:'Unauthorized'});
 const missing=Object.entries({GARMIN_API_KEY,GARMIN_USER_ID,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}).filter(([,v])=>!v?.trim()).map(([k])=>k);
 if(missing.length)return res.status(503).json({ok:false,error:'Missing environment variables',missing});
 const date=req.query?.date??previousDate();if(!validDate(date))return res.status(400).json({ok:false,error:'date must be a valid YYYY-MM-DD'});
 const count=req.query?.days===undefined?(req.query?.date?1:3):Number(req.query.days);
 if(!Number.isInteger(count)||count<1||count>7)return res.status(400).json({ok:false,error:'days must be 1 through 7'});
 const results=[];
 try{
  const token=(await(await response(GARMIN+'/personalapitoken-service/personal-api/personal-api-key/token',{method:'POST',headers:{Authorization:'ApiKey '+GARMIN_API_KEY.trim(),Accept:'*/*'}})).text()).trim();
  if(!token)throw Error('Garmin returned empty token');
  for(let i=0;i<count;i++)results.push(await syncDate(shiftDate(date,-i),token));
  return res.status(200).json({ok:true,date,results});
 }catch(error){console.error('Garmin sync failed:',error.message);return res.status(502).json({ok:false,date,error:error.message,completed_dates:results.map(r=>r.date)});}
}
