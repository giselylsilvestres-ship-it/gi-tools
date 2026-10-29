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
