// Run only on the server with production environment variables. Never prints credentials or health payloads.
const base = 'https://personal.connectapi.garmin.com';
async function get(path, token) {
  const r = await fetch(base + path, {headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  if (!r.ok) throw new Error(path.split('?')[0]+' HTTP '+r.status);
  const text=await r.text();
  return text.trim()?JSON.parse(text):null;
}
const auth=await fetch(base+'/personalapitoken-service/personal-api/personal-api-key/token',{
  method:'POST',headers:{Authorization:'ApiKey '+process.env.GARMIN_API_KEY.trim()},signal:AbortSignal.timeout(15000)
});
if(!auth.ok) throw new Error('Garmin authentication HTTP '+auth.status);
const token=(await auth.text()).trim();
const [profile,sleeps,hrv,summaries]=await Promise.all([
  '/userprofile-service/userprofile/settings',
  '/sleep-service/sleep/dailySleepSummariesByDate?startDate=2026-10-01&endDate=2026-10-27',
  '/hrv-service/hrv/daily/2026-10-23/2026-10-27',
  '/usersummary-service/v2/dailysummaries?startDate=2026-10-01&endDate=2026-10-27'
].map(path=>get(path,token)));
const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
const url=process.env.SUPABASE_URL+'/rest/v1/garmin_daily?user_id=eq.'+encodeURIComponent(process.env.GARMIN_USER_ID.trim())+'&date=eq.2026-10-26';
const existing=await fetch(url+'&select=raw_data',{headers});
if(!existing.ok) throw new Error('Read diagnostic destination HTTP '+existing.status);
const rows=await existing.json();
if(rows.length!==1) throw new Error('Expected one diagnostic destination row');
const diagnostics={checked_at:new Date().toISOString(),profile:{displayName:profile?.displayName,timeZone:profile?.timeZone},sleep_range:sleeps,hrv_range:hrv,summary_dates:summaries?.data?.map(d=>({date:d.calendarDate,userProfilePk:d.userProfilePk,includesWellnessData:d.includesWellnessData,includesActivityData:d.includesActivityData}))};
const saved=await fetch(url,{method:'PATCH',headers,body:JSON.stringify({raw_data:{...rows[0].raw_data,diagnostics}})});
if(!saved.ok) throw new Error('Save diagnostics HTTP '+saved.status);
console.log('Garmin diagnostic completed; details saved privately in Supabase');
