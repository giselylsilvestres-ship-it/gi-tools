// Test/tool compatibility: keep the Vercel function self-contained (ESM→CJS runtime).
export {normalize,localDate,shiftDate,n,iso,sanitize} from '../api/garmin-sync.js';
