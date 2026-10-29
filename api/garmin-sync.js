import {timingSafeEqual} from 'node:crypto';
import {normalize,localDate,shiftDate} from '../lib/garmin-normalize.mjs';
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
