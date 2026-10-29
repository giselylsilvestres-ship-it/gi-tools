# Garmin Personal API → Gica Tools

`api/garmin-sync.js` uses only the official Personal API and Vercel server environment variables. No user password, client secret exposure, weight/body-composition endpoints or Women's Health requests.

## Storage

- `garmin_daily`: unique `(user_id,date)`, daily aggregates. Sleep belongs to Garmin's **wake-up calendarDate**, not the date the person went to bed. UTC `sleep_start/end` preserve actual timestamps across midnight. `sleep_minutes` retains the original rounded integer; phase/awake durations are numeric minutes. HRV is milliseconds, heart rate bpm, SpO2 percent, respiration breaths/minute, distance meters, activity duration seconds, calories kcal.
- `garmin_samples`: unique user/metric/source/timestamp; heart rate, SpO2 (single readings and hourly averages identified separately), Body Battery and HRV readings. `date` is the point's local date in America/Sao_Paulo, while `observed_at` is UTC. Previous-day sources cover sleep crossing midnight.
- `garmin_activities`: unique user/Garmin activity ID; type, UTC start, duration, calories, average/max HR, seconds in each HR zone, Training Load and aerobic/anaerobic Training Effect when provided. No fabricated activities or weight/strength-set extraction.
- `garmin_raw`: complete sanitized source responses and HTTP status, including unavailable sources, outside the daily row. Existing payloads were archived with source `legacy`. `garmin_daily.raw_data` contains compact summary/sleep/HRV metadata and points to this archive. Explicit body-composition keys are excluded.

The `garmin_apply_sync` service-only RPC writes all four tables in one transaction. Reads require an authenticated owner under RLS. Repeating sync updates the same records; a null from Garmin does not erase a previously stored aggregate. HTTP 5xx/429, invalid JSON, authorization errors or incomplete activity pagination prevent writing that day. Optional 204/404 responses are recorded as unavailable, never converted to zero.

## Availability and derived values

- Daily sleep DTO or exact-date sleep-summary fallback supplies total sleep, Deep/Light/REM/Awake, score, awakenings, nocturnal SpO2, respiration and stress.
- HRV uses `hrvSummary`, then exact-date `hrvSummaries` fallback. Baseline JSON retains `balancedLow`, `balancedUpper`, `lowUpper` and `markerValue`. A 204 from both sources means the Personal API has no data; no value is estimated.
- `restless moments` is separate from `awakeCount`. Current official DailySleepDTO does not expose its count, so it remains null unless returned explicitly.
- Mean sleeping HR uses Garmin `avgHeartRate` when supplied, otherwise the mean of valid HR samples inside the sleep window. Minimum uses the available nocturnal samples.
- Body Battery is requested with 288 intervals/day. Garmin returns interval extrema, not an exact continuous series. Sleep-start/end values are the first/last available samples **within** that sleep window; their actual timestamps are in `raw_data.derived`. Charge is their difference. No interpolation or claim of exact boundary values.
- SpO2 source and resolution are retained per point; negative sentinels, nulls and invalid readings are excluded.
- Stress band durations use Garmin's reported milliseconds, converted to minutes.
- Current-day sync is marked `is_partial=true`; it must not be treated as a complete day in future baselines. The 7/30-day baseline and Recovery Score are future consumers, not computed in this change.

## Schedule, recovery and testing

The existing `vercel.json` cron is unchanged (04:00 UTC / 01:00 São Paulo). Without query parameters the job revisits yesterday and two preceding days to recover data finalized or uploaded late. An authorized `?date=YYYY-MM-DD&days=1..7` reprocesses that date and preceding dates. This does not collect tomorrow's sleep early; a night is stored against its wake-up date after Garmin supplies it.

Server-side reprocessing: `node scripts/garmin-backfill.mjs 2026-10-29 3`. It invokes the same authenticated handler using server environment variables. `node --test tests/garmin-sync.test.mjs` runs deterministic mapping, timezone, authorization and failure tests. Database validation additionally covers atomic rollback, repeated-point deduplication and null preservation.

Official references: https://developer.garmin.com/gc-developer-program/personal/swagger-docs/ and https://github.com/garmin/connect-personal-api-python . Flo → Apple Health requires a separate explicitly authorized integration; it is not queried here.
