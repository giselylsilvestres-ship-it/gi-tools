// Server-only endpoint diagnostics. Credentials and health payloads never go to logs.
const base='https://personal.connectapi.garmin.com';
const date=process.argv[2]||'2026-10-29';
const previous=new Date(Date.parse(date+'T12:00Z')-86400000).toISOString().slice(0,10);
const tokenResponse=await fetch(base+'/personalapitoken-service/personal-api/personal-api-key/token',{method:'POST',headers:{Authorization:'ApiKey '+process.env.GARMIN_API_KEY.trim()}});
if(!tokenResponse.ok)throw Error('Garmin auth HTTP '+tokenResponse.status);
const token=(await tokenResponse.text()).trim();
const paths={sleep:`/sleep-service/sleep/dailySleep?date=${date}`,sleep_range:`/sleep-service/sleep/dailySleepSummariesByDate?startDate=${previous}&endDate=${date}`,hrv:`/hrv-service/hrv/${date}`,hrv_range:`/hrv-service/hrv/daily/${previous}/${date}`,heart_rate:`/wellness-service/wellness/dailyHeartRate?date=${date}`,previous_heart_rate:`/wellness-service/wellness/dailyHeartRate?date=${previous}`,spo2:`/wellness-service/wellness/daily/spo2acclimation/${date}`,body_battery:`/wellness-service/wellness/bodyBattery/reports/daily?startDate=${previous}&endDate=${date}`,summary:`/usersummary-service/v2/dailysummaries?startDate=${date}&endDate=${date}`,activities:`/activitylist-service/activities/search/activities?startDate=${date}&endDate=${date}&limit=100&start=0`};
const sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([name,path])=>{try{const r=await fetch(base+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});const text=await r.text();return [name,{status:r.status,payload:r.ok&&text.trim()?JSON.parse(text):null}]}catch{return[name,{status:'error',payload:null}]}})));
const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
const url=process.env.SUPABASE_URL+'/rest/v1/garmin_daily?user_id=eq.'+encodeURIComponent(process.env.GARMIN_USER_ID.trim())+'&date=eq.2026-10-28';
const r=await fetch(url+'&select=raw_data',{headers});if(!r.ok)throw Error('Diagnostic destination read failed');const rows=await r.json();if(rows.length!==1)throw Error('Diagnostic destination not found');
const saved=await fetch(url,{method:'PATCH',headers,body:JSON.stringify({raw_data:{...rows[0].raw_data,expansion_probe:{date,checked_at:new Date().toISOString(),sources}}})});if(!saved.ok)throw Error('Diagnostic destination write failed');
console.log('Garmin diagnostic saved privately; '+Object.keys(sources).length+' sources checked.');
