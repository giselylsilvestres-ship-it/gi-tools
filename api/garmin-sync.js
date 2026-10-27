import { timingSafeEqual } from 'node:crypto';

const GARMIN = 'https://personal.connectapi.garmin.com';
export const config = { maxDuration: 60 };

export function previousDate(now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
  return new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function dailyRow(userId, date, summary, sleep, hrv) {
  const day = summary?.data?.find(item => item.calendarDate === date);
  if (!day) throw new Error('Garmin has no daily summary for requested date');
  const dto = sleep?.dailySleepDTO ?? sleep;
  if (dto?.calendarDate && dto.calendarDate !== date) throw new Error('Garmin sleep date mismatch');
  return {
    user_id: userId, date,
    sleep_score: number(dto?.sleepScores?.overall?.value),
    sleep_minutes: number(dto?.sleepTimeSeconds) === null ? null : Math.round(dto.sleepTimeSeconds / 60),
    hrv: number(hrv?.hrvSummary?.lastNightAvg),
    calories_total: number(day.calories?.burnedTotal ?? day.totalKilocalories),
    calories_resting: number(day.calories?.burnedResting ?? day.bmrKilocalories),
    calories_active: number(day.calories?.burnedActive ?? day.activeKilocalories),
    raw_data: { summary, sleep, hrv },
    synced_at: new Date().toISOString()
  };
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Upstream ${new URL(url).hostname} returned HTTP ${response.status}`);
  return response;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const { CRON_SECRET, GARMIN_API_KEY, GARMIN_USER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!CRON_SECRET) return res.status(503).json({ ok: false, error: 'Missing CRON_SECRET' });
  const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
  const supplied = Buffer.from(req.headers.authorization || '');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const date = req.query?.date ?? previousDate();
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    return res.status(400).json({ ok: false, error: 'date must be a valid YYYY-MM-DD' });
  }
  const missing = Object.entries({ GARMIN_API_KEY, GARMIN_USER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })
    .filter(([, value]) => !value?.trim()).map(([key]) => key);
  if (missing.length) return res.status(503).json({ ok: false, error: 'Missing environment variables', missing });
  try {
    // Garmin's official Personal API exchanges an ApiKey for a plain-text bearer token.
    const token = (await (await request(`${GARMIN}/personalapitoken-service/personal-api/personal-api-key/token`, {
      method: 'POST', headers: { Authorization: `ApiKey ${GARMIN_API_KEY.trim()}`, Accept: '*/*' }
    })).text()).trim();
    if (!token) throw new Error('Garmin returned an empty token');
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
    // Fetch all sources before writing; upstream errors must never erase an existing row.
    const [summary, sleep, hrv] = await Promise.all([
      `/usersummary-service/v2/dailysummaries?startDate=${date}&endDate=${date}`,
      `/sleep-service/sleep/dailySleep?date=${date}`,
      `/hrv-service/hrv/${date}`
    ].map(async path => {
      const response = await request(`${GARMIN}${path}`, { headers });
      const body = await response.text();
      if (!body.trim()) return null; // Garmin returns 204 when an optional metric is unavailable.
      try { return JSON.parse(body); }
      catch { throw new Error(`Invalid Garmin JSON at ${path.split('?')[0]}`); }
    }));
    const row = dailyRow(GARMIN_USER_ID.trim(), date, summary, sleep, hrv);
    const saved = await (await request(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/garmin_daily?on_conflict=user_id,date&select=id,date,synced_at`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(row)
    })).json();
    if (saved.length !== 1 || saved[0].date !== date) throw new Error('Supabase did not confirm the saved row');
    return res.status(200).json({ ok: true, date, id: saved[0].id, synced_at: saved[0].synced_at });
  } catch (error) {
    // Never log upstream bodies, tokens, credentials or personal health payloads.
    console.error('Garmin sync failed:', error.message);
    return res.status(502).json({ ok: false, date, error: error.message });
  }
}
