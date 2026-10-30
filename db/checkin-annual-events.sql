create table public.checkin_events (
id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
title text not null check(char_length(trim(title)) between 1 and 120),
kind text not null check(kind in ('birthday','relationship')),
event_date date not null, created_at timestamptz not null default now()
);
create index checkin_events_owner on public.checkin_events(user_id);
alter table public.checkin_events enable row level security;
create policy owner_events on public.checkin_events for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.checkin_events to authenticated;
