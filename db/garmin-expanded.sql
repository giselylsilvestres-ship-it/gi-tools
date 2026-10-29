-- Garmin Personal API expansion. Units: minutes, meters, bpm, ms (HRV), percent (SpO2).
begin;
alter table public.garmin_daily
 add column if not exists sleep_start timestamptz,
 add column if not exists sleep_end timestamptz,
 add column if not exists sleep_deep_minutes numeric,
 add column if not exists sleep_light_minutes numeric,
 add column if not exists sleep_rem_minutes numeric,
 add column if not exists sleep_awake_minutes numeric,
 add column if not exists sleep_restless_moments integer,
 add column if not exists sleep_awakenings integer,
 add column if not exists hrv_5min_high numeric,
 add column if not exists hrv_status text,
 add column if not exists hrv_baseline jsonb,
 add column if not exists resting_heart_rate numeric,
 add column if not exists sleep_heart_rate_avg numeric,
 add column if not exists sleep_heart_rate_min numeric,
 add column if not exists sleep_spo2_avg numeric,
 add column if not exists sleep_spo2_min numeric,
 add column if not exists sleep_respiration_avg numeric,
 add column if not exists sleep_respiration_min numeric,
 add column if not exists body_battery_sleep_start numeric,
 add column if not exists body_battery_sleep_end numeric,
 add column if not exists body_battery_sleep_charge numeric,
 add column if not exists body_battery_max numeric,
 add column if not exists body_battery_min numeric,
 add column if not exists stress_avg numeric,
 add column if not exists sleep_stress_avg numeric,
 add column if not exists stress_rest_minutes numeric,
 add column if not exists stress_low_minutes numeric,
 add column if not exists stress_medium_minutes numeric,
 add column if not exists stress_high_minutes numeric,
 add column if not exists distance_meters numeric,
 add column if not exists intensity_moderate_minutes numeric,
 add column if not exists intensity_vigorous_minutes numeric,
 add column if not exists steps integer,
 add column if not exists is_partial boolean,
 add column if not exists source_status jsonb;
create table if not exists public.garmin_samples(
 user_id uuid not null references auth.users(id) on delete cascade,
 date date not null, metric text not null check(metric in ('heart_rate','spo2','body_battery','hrv')),
 source text not null, observed_at timestamptz not null, value numeric not null, raw_data jsonb,
 synced_at timestamptz not null default now(), primary key(user_id,metric,source,observed_at)
);
create index if not exists garmin_samples_user_date on public.garmin_samples(user_id,date,metric);
create table if not exists public.garmin_activities(
 user_id uuid not null references auth.users(id) on delete cascade, activity_id text not null,
 date date not null, activity_type text, name text, started_at timestamptz, duration_seconds numeric, calories numeric,
 heart_rate_avg numeric, heart_rate_max numeric, heart_rate_zones jsonb, training_load numeric,
 training_effect_aerobic numeric, training_effect_anaerobic numeric, raw_data jsonb,
 synced_at timestamptz not null default now(), primary key(user_id,activity_id)
);
create index if not exists garmin_activities_user_date on public.garmin_activities(user_id,date);
create table if not exists public.garmin_raw(
 user_id uuid not null references auth.users(id) on delete cascade,date date not null,source text not null,
 raw_data jsonb not null,synced_at timestamptz not null default now(),primary key(user_id,date,source)
);
alter table public.garmin_samples enable row level security;
drop policy if exists owner_read on public.garmin_samples;
create policy owner_read on public.garmin_samples for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.garmin_samples from anon, authenticated;
grant select on public.garmin_samples to authenticated;
grant all on public.garmin_samples to service_role;
alter table public.garmin_activities enable row level security;
drop policy if exists owner_read on public.garmin_activities;
create policy owner_read on public.garmin_activities for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.garmin_activities from anon, authenticated;
grant select on public.garmin_activities to authenticated;
grant all on public.garmin_activities to service_role;
alter table public.garmin_raw enable row level security;
drop policy if exists owner_read on public.garmin_raw;
create policy owner_read on public.garmin_raw for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.garmin_raw from anon, authenticated;
grant select on public.garmin_raw to authenticated;
grant all on public.garmin_raw to service_role;
-- Archive legacy payloads before moving all new time series out of the daily row.
insert into public.garmin_raw(user_id,date,source,raw_data,synced_at)
 select user_id,date,'legacy',raw_data,synced_at from public.garmin_daily where raw_data is not null
 on conflict(user_id,date,source) do nothing;
create or replace function public.garmin_apply_sync(p_daily jsonb,p_samples jsonb,p_activities jsonb,p_sources jsonb)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare uid uuid:=(p_daily->>'user_id')::uuid; day date:=(p_daily->>'date')::date;
 r public.garmin_daily; saved_id uuid; sample_count integer; activity_count integer;
begin
 if uid is null or day is null then raise exception 'INVALID_GARMIN_DAY';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||day::text,0));
 select * into r from public.garmin_daily where user_id=uid and date=day;
 r:=jsonb_populate_record(r,jsonb_strip_nulls(p_daily));
 r.id:=coalesce(r.id,gen_random_uuid());r.user_id:=uid;r.date:=day;
 insert into public.garmin_daily select (r).* on conflict(user_id,date) do update set
 sleep_score=excluded.sleep_score,
 sleep_minutes=excluded.sleep_minutes,
 hrv=excluded.hrv,
 calories_total=excluded.calories_total,
 calories_resting=excluded.calories_resting,
 calories_active=excluded.calories_active,
 raw_data=excluded.raw_data,
 synced_at=excluded.synced_at,
 sleep_start=excluded.sleep_start,
 sleep_end=excluded.sleep_end,
 sleep_deep_minutes=excluded.sleep_deep_minutes,
 sleep_light_minutes=excluded.sleep_light_minutes,
 sleep_rem_minutes=excluded.sleep_rem_minutes,
 sleep_awake_minutes=excluded.sleep_awake_minutes,
 sleep_restless_moments=excluded.sleep_restless_moments,
 sleep_awakenings=excluded.sleep_awakenings,
 hrv_5min_high=excluded.hrv_5min_high,
 hrv_status=excluded.hrv_status,
 hrv_baseline=excluded.hrv_baseline,
 resting_heart_rate=excluded.resting_heart_rate,
 sleep_heart_rate_avg=excluded.sleep_heart_rate_avg,
 sleep_heart_rate_min=excluded.sleep_heart_rate_min,
 sleep_spo2_avg=excluded.sleep_spo2_avg,
 sleep_spo2_min=excluded.sleep_spo2_min,
 sleep_respiration_avg=excluded.sleep_respiration_avg,
 sleep_respiration_min=excluded.sleep_respiration_min,
 body_battery_sleep_start=excluded.body_battery_sleep_start,
 body_battery_sleep_end=excluded.body_battery_sleep_end,
 body_battery_sleep_charge=excluded.body_battery_sleep_charge,
 body_battery_max=excluded.body_battery_max,
 body_battery_min=excluded.body_battery_min,
 stress_avg=excluded.stress_avg,
 sleep_stress_avg=excluded.sleep_stress_avg,
 stress_rest_minutes=excluded.stress_rest_minutes,
 stress_low_minutes=excluded.stress_low_minutes,
 stress_medium_minutes=excluded.stress_medium_minutes,
 stress_high_minutes=excluded.stress_high_minutes,
 distance_meters=excluded.distance_meters,
 intensity_moderate_minutes=excluded.intensity_moderate_minutes,
 intensity_vigorous_minutes=excluded.intensity_vigorous_minutes,
 steps=excluded.steps,
 is_partial=excluded.is_partial,
 source_status=excluded.source_status returning id into saved_id;
 insert into public.garmin_samples(user_id,date,metric,source,observed_at,value,raw_data)
 select uid,x.date,x.metric,x.source,x.observed_at,x.value,x.raw_data
 from jsonb_to_recordset(p_samples) as x(date date,metric text,source text,observed_at timestamptz,value numeric,raw_data jsonb)
 on conflict(user_id,metric,source,observed_at) do update set value=excluded.value,raw_data=excluded.raw_data,synced_at=now();
 get diagnostics sample_count=row_count;
 insert into public.garmin_activities(user_id,activity_id,date,activity_type,name,started_at,duration_seconds,calories,heart_rate_avg,heart_rate_max,heart_rate_zones,training_load,training_effect_aerobic,training_effect_anaerobic,raw_data)
 select uid,x.activity_id,day,x.activity_type,x.name,x.started_at,x.duration_seconds,x.calories,x.heart_rate_avg,x.heart_rate_max,x.heart_rate_zones,x.training_load,x.training_effect_aerobic,x.training_effect_anaerobic,x.raw_data
 from jsonb_to_recordset(p_activities) as x(activity_id text,activity_type text,name text,started_at timestamptz,duration_seconds numeric,calories numeric,heart_rate_avg numeric,heart_rate_max numeric,heart_rate_zones jsonb,training_load numeric,training_effect_aerobic numeric,training_effect_anaerobic numeric,raw_data jsonb)
 on conflict(user_id,activity_id) do update set date=excluded.date,activity_type=excluded.activity_type,name=excluded.name,started_at=excluded.started_at,duration_seconds=excluded.duration_seconds,calories=excluded.calories,heart_rate_avg=excluded.heart_rate_avg,heart_rate_max=excluded.heart_rate_max,heart_rate_zones=excluded.heart_rate_zones,training_load=excluded.training_load,training_effect_aerobic=excluded.training_effect_aerobic,training_effect_anaerobic=excluded.training_effect_anaerobic,raw_data=excluded.raw_data,synced_at=now();
 get diagnostics activity_count=row_count;
 insert into public.garmin_raw(user_id,date,source,raw_data)
 select uid,day,x.source,x.raw_data from jsonb_to_recordset(p_sources) as x(source text,raw_data jsonb)
 on conflict(user_id,date,source) do update set raw_data=excluded.raw_data,synced_at=now();
 return jsonb_build_object('id',saved_id,'date',day,'samples',sample_count,'activities',activity_count);
end $$;
revoke all on function public.garmin_apply_sync(jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.garmin_apply_sync(jsonb,jsonb,jsonb,jsonb) to service_role;
commit;
