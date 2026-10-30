begin;
alter table public.gym_trainings add column is_archived boolean not null default false;
alter table public.gym_sheets add column is_archived boolean not null default false;
comment on column public.gym_trainings.is_archived is 'Inactive programs stay editable and retain session history; separate from legacy is_active flag.';
comment on column public.gym_sheets.is_archived is 'Inactive routines are excluded from new daily planning without deleting history.';
create or replace function public.gym_check_plan_availability() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if NEW.sheet_id is not distinct from OLD.sheet_id and NEW.user_id is not distinct from OLD.user_id and NEW.plan_date is not distinct from OLD.plan_date then return NEW; end if;
 end if;
 perform 1 from public.gym_sheets s join public.gym_trainings t on t.id=s.training_id and t.user_id=s.user_id
 where s.id=NEW.sheet_id and s.user_id=NEW.user_id and not s.is_archived and not t.is_archived for share of s,t;
 if not found then raise exception 'INACTIVE_OR_INVALID_SHEET'; end if;
 return NEW;
end $$;
revoke all on function public.gym_check_plan_availability() from public,anon;
create trigger gym_plan_availability before insert or update on public.gym_plans for each row execute function public.gym_check_plan_availability();
create or replace function public.gym_swap_planned_sheet(p_date date,p_sheet_id uuid,p_workout jsonb,p_revision integer)
returns public.gym_sessions language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); previous public.gym_sessions; selected_sheet public.gym_sheets; result public.gym_sessions;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select s.* into selected_sheet from public.gym_sheets s join public.gym_trainings t on t.id=s.training_id and t.user_id=s.user_id
 where s.id=p_sheet_id and s.user_id=uid and not s.is_archived and not t.is_archived for share of s,t;
 if not found then raise exception 'INACTIVE_OR_INVALID_SHEET'; end if;
 select * into previous from public.gym_sessions where user_id=uid and session_date=p_date for update;
 if found then
  if previous.revision is distinct from p_revision then raise exception 'WORKOUT_CONFLICT'; end if;
  if previous.completed or previous.workout_data is null
   or jsonb_path_exists(previous.workout_data,'$.exercises[*].sets[*] ? (@.done == true)')
   or jsonb_path_exists(previous.workout_data,'$.exercises[*].sets[*].drops[*] ? (@.done == true)')
   or exists(select 1 from public.gym_session_exercises where session_id=previous.id and user_id=uid)
  then raise exception 'WORKOUT_ALREADY_STARTED'; end if;
 elsif p_revision is distinct from 0 then raise exception 'WORKOUT_CONFLICT'; end if;
 if (p_workout->>'status') is distinct from 'active' then raise exception 'INVALID_WORKOUT'; end if;
 select * into result from public.gym_save_workout(p_date,p_sheet_id,selected_sheet.training_id,p_workout,p_revision);
 insert into public.gym_plans(user_id,plan_date,sheet_id) values(uid,p_date,p_sheet_id)
 on conflict(user_id,plan_date) do update set sheet_id=excluded.sheet_id;
 return result;
end $$;
revoke all on function public.gym_swap_planned_sheet(date,uuid,jsonb,integer) from public,anon;
grant execute on function public.gym_swap_planned_sheet(date,uuid,jsonb,integer) to authenticated;
commit;