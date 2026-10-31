import {createPublicKey,verify} from 'node:crypto';
import {localDate,shiftDate,syncDate,validDate} from './garmin-sync.js';

export const config={maxDuration:300};
const ISSUER='https://token.actions.githubusercontent.com';
const AUDIENCE='gi-tools-garmin-run-now';
const REPOSITORY='giselylsilvestres-ship-it/gi-tools';
const GARMIN='https://personal.connectapi.garmin.com';

const decodePart=value=>JSON.parse(Buffer.from(value,'base64url').toString('utf8'));

async function verifyGitHubOidc(token){
 if(!token||token.split('.').length!==3)return false;
 const [encodedHeader,encodedPayload,encodedSignature]=token.split('.');
 let header,payload;
 try{header=decodePart(encodedHeader);payload=decodePart(encodedPayload);}catch{return false;}
 if(header.alg!=='RS256'||!header.kid)return false;
 const now=Math.floor(Date.now()/1000);
 if(payload.iss!==ISSUER||payload.aud!==AUDIENCE||payload.exp<=now||payload.nbf>now+30)return false;
 if(payload.repository!==REPOSITORY||payload.ref!=='refs/heads/main'||payload.event_name!=='workflow_dispatch')return false;
 const jwks=await fetch(ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error('GitHub JWKS HTTP '+r.status);return r.json();});
 const jwk=jwks.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA');
 if(!jwk)return false;
 const key=createPublicKey({key:jwk,format:'jwk'});
 return verify('RSA-SHA256',Buffer.from(encodedHeader+'.'+encodedPayload),key,Buffer.from(encodedSignature,'base64url'));
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Method not allowed'});}
 try{
  const supplied=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!await verifyGitHubOidc(supplied))return res.status(401).json({ok:false,error:'Unauthorized GitHub Actions request'});
  const {GARMIN_API_KEY,GARMIN_USER_ID,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}=process.env;
  const missing=Object.entries({GARMIN_API_KEY,GARMIN_USER_ID,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}).filter(([,v])=>!v?.trim()).map(([k])=>k);
  if(missing.length)return res.status(503).json({ok:false,error:'Missing environment variables',missing});
  const date=req.query?.date??localDate(new Date());
  if(!validDate(date))return res.status(400).json({ok:false,error:'date must be a valid YYYY-MM-DD'});
  const count=req.query?.days===undefined?1:Number(req.query.days);
  if(!Number.isInteger(count)||count<1||count>7)return res.status(400).json({ok:false,error:'days must be 1 through 7'});
  const tokenResponse=await fetch(GARMIN+'/personalapitoken-service/personal-api/personal-api-key/token',{method:'POST',headers:{Authorization:'ApiKey '+GARMIN_API_KEY.trim(),Accept:'*/*'},redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!tokenResponse.ok)throw Error('Garmin token HTTP '+tokenResponse.status);
  const token=(await tokenResponse.text()).trim();
  if(!token)throw Error('Garmin returned empty token');
  const results=[];
  for(let i=0;i<count;i++)results.push(await syncDate(shiftDate(date,-i),token));
  return res.status(200).json({ok:true,date,results});
 }catch(error){console.error('Garmin run-now failed:',error.message);return res.status(502).json({ok:false,error:error.message});}
}
