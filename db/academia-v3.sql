-- Additive: old rows and the current production UI continue to work.
alter table public.gym_sheets add column if not exists routine_data jsonb;
alter table public.gym_sessions add column if not exists workout_data jsonb;
alter table public.gym_sessions add column if not exists revision integer not null default 0;

-- A single request commits all sets, drops, timer and notes together.
-- Optimistic revision prevents a stale phone/tab silently overwriting another.
create or replace function public.gym_save_workout(p_date date,p_sheet_id uuid,p_training_id uuid,p_workout jsonb,p_revision integer)
returns public.gym_sessions
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); result public.gym_sessions;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_revision is null or p_revision < 0 or p_date is null or (p_workout->>'version') is distinct from '3'
     or jsonb_typeof(p_workout->'exercises') is distinct from 'array'
     or jsonb_array_length(p_workout->'exercises') not between 1 and 100
     or coalesce(p_workout->>'status','') not in ('active','finished')
     or pg_column_size(p_workout)>1048576 then raise exception 'INVALID_WORKOUT'; end if;
  if p_sheet_id is not null and not exists(select 1 from public.gym_sheets s where s.id=p_sheet_id and s.user_id=uid and s.training_id=p_training_id) then raise exception 'INVALID_SHEET'; end if;
  insert into public.gym_sessions(user_id,session_date,sheet_id,training_id,workout_data,revision,completed,notes)
  values(uid,p_date,p_sheet_id,p_training_id,p_workout,1,p_workout->>'status'='finished',p_workout->>'notes')
  on conflict(user_id,session_date) do update set
    workout_data=excluded.workout_data,revision=gym_sessions.revision+1,
    completed=excluded.completed,notes=excluded.notes,sheet_id=excluded.sheet_id,
    training_id=excluded.training_id,updated_at=now()
  where gym_sessions.revision=p_revision
  returning * into result;
  if result.id is null then raise exception 'WORKOUT_CONFLICT'; end if;
  return result;
end $$;
revoke all on function public.gym_save_workout(date,uuid,uuid,jsonb,integer) from public,anon;
grant execute on function public.gym_save_workout(date,uuid,uuid,jsonb,integer) to authenticated;
