create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  day text not null,
  workshop text not null,
  time_slot text not null,
  created_at timestamptz not null default now(),
  unique(day, workshop, time_slot)
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  team_name text not null,
  track_name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists registrations_unique_email_per_session
on public.registrations (session_id, email);

create table if not exists public.admins (
  email text primary key,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace view public.registrations_view as
select
  r.id,
  r.created_at,
  r.full_name,
  r.email,
  r.phone,
  r.team_name,
  r.track_name,
  s.workshop,
  s.day,
  s.time_slot
from public.registrations r
join public.sessions s on s.id = r.session_id;

insert into public.sessions (day, workshop, time_slot)
select d.day, w.workshop, t.time_slot
from (values ('Day 1'),('Day 2'),('Day 3')) as d(day)
cross join (values 
  ('09:00–10:00'),
  ('10:30–11:30'),
  ('12:00–13:00'),
  ('13:30–14:30'),
  ('15:00–16:00')
) as t(time_slot)
on conflict do nothing;

alter table public.sessions enable row level security;
alter table public.registrations enable row level security;
alter table public.admins enable row level security;

drop policy if exists "sessions_read_all" on public.sessions;
create policy "sessions_read_all"
on public.sessions for select
to anon, authenticated
using (true);

drop policy if exists "sessions_insert_all" on public.sessions;
create policy "sessions_insert_all"
on public.sessions for insert
to anon, authenticated
with check (true);

drop policy if exists "registrations_insert_all" on public.registrations;
create policy "registrations_insert_all"
on public.registrations for insert
to anon, authenticated
with check (true);

drop policy if exists "registrations_select_admins" on public.registrations;
create policy "registrations_select_admins"
on public.registrations for select
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.email = lower(auth.jwt() ->> 'email')
      and a.approved = true
  )
);

drop policy if exists "admins_self_request" on public.admins;
create policy "admins_self_request"
on public.admins for insert
to authenticated
with check (
  lower(email) = lower(auth.jwt() ->> 'email') and approved = false
);

drop policy if exists "admins_read_approved" on public.admins;
create policy "admins_read_approved"
on public.admins for select
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.email = lower(auth.jwt() ->> 'email')
      and a.approved = true
  )
);

drop policy if exists "admins_update_approved" on public.admins;
create policy "admins_update_approved"
on public.admins for update
to authenticated
using (
  exists (
    select 1 from public.admins a
    where a.email = lower(auth.jwt() ->> 'email')
      and a.approved = true
  )
)
with check (true);

create or replace function public.register_for_session(
  p_session_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_team_name text,
  p_track_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
  new_id uuid;
begin
  perform 1 from public.sessions where id = p_session_id for update;

  select count(*) into current_count
  from public.registrations
  where session_id = p_session_id;

  if current_count >= 20 then
    raise exception 'This session is FULL. Please choose another time.';
  end if;

  insert into public.registrations(session_id, full_name, email, phone, team_name, track_name)
  values (p_session_id, p_full_name, lower(p_email), p_phone, p_team_name, p_track_name)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.register_for_session(uuid, text, text, text, text, text) to anon, authenticated;

insert into public.admins(email, approved)
values ('YOUR_ADMIN_EMAIL_HERE', true)
on conflict (email) do update set approved = true;
