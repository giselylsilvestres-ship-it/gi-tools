create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.checkin_note_migration_backup_20261030 as
select id,to_jsonb(d) as original_record from public.daily_checkins d;
revoke all on private.checkin_note_migration_backup_20261030 from public,anon,authenticated;
update public.daily_checkins set note=nullif(concat_ws(E'\n\n',
case when nullif(trim(coalesce(joy_reason,day_saver,'')),'') is not null then 'Felicidade: '||trim(coalesce(joy_reason,day_saver)) end,
nullif(trim(note),''),
case when cardinality(soul_states)>0 then 'Alma: '||array_to_string(soul_states,', ') end
),'');
do $$
begin
if exists(select 1 from public.daily_checkins d join private.checkin_note_migration_backup_20261030 b using(id)
where d.note is distinct from nullif(concat_ws(E'\n\n',
case when nullif(trim(coalesce(b.original_record->>'joy_reason',b.original_record->>'day_saver','')),'') is not null then 'Felicidade: '||trim(coalesce(b.original_record->>'joy_reason',b.original_record->>'day_saver')) end,
nullif(trim(b.original_record->>'note'),''),
case when jsonb_array_length(coalesce(b.original_record->'soul_states','[]'::jsonb))>0 then 'Alma: '||(select string_agg(v,', ' order by ord) from jsonb_array_elements_text(b.original_record->'soul_states') with ordinality a(v,ord)) end
),'')) then raise exception 'Note verification failed';end if;
end $$;
alter table public.daily_checkins drop column joy_reason,drop column day_saver,drop column soul_states,drop column mind_score,drop column soul_score;
