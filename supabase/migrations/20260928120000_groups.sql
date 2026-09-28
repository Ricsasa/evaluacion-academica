-- Groups belong to the session, not to the evaluation: one evaluation is
-- applied to several groups, and the session keeps the group the student had
-- on that day. This migration only adds data; nothing is dropped.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, name)
);

create index on public.groups (teacher_id);

alter table public.groups enable row level security;

create policy "own groups" on public.groups
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

-- New tables are not exposed to the Data API without an explicit grant.
grant select, insert, update, delete on public.groups to authenticated;

-- Nullable, so every session that already exists stays valid.
alter table public.sessions
  add column group_id uuid references public.groups (id) on delete set null;

create index on public.sessions (group_id);

-- Backfill: every session applied before groups existed belongs to 3B. Each
-- teacher with sessions gets her own 3B group.
insert into public.groups (teacher_id, name)
select distinct teacher_id, '3B'
from public.sessions
on conflict (teacher_id, name) do nothing;

update public.sessions s
set group_id = g.id
from public.groups g
where g.teacher_id = s.teacher_id
  and g.name = '3B'
  and s.group_id is null;

-- evaluations.group_label is kept on purpose. The app no longer reads it.
-- Drop it in a later migration, after the backfill is verified in production.
