// Uses the exact production handler and its authorization path. Run server-side only.
import handler from '../api/garmin-sync.js';
const date=process.argv[2]||'2026-10-29',days=process.argv[3]||'3';
let status;
await handler({method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET},query:{date,days}},
 {setHeader(){},status(s){status=s;return this;},json(result){console.log(JSON.stringify(result));if(status!==200||!result.ok)process.exitCode=1;}});
