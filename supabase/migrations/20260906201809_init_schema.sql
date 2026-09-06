-- Oral evaluation system: schema, RLS and signup domain restriction.
-- Every table is owned by one teacher (auth.users). Teachers never share data.

create extension if not exists pgcrypto;

-- Signup is limited to the school domain. The client validates first for a
-- friendly message; this trigger is the real enforcement.
create or replace function public.enforce_signup_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@institutocolon.mx' then
    raise exception 'Solo se permiten correos @institutocolon.mx';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_email_domain on auth.users;
create trigger enforce_signup_email_domain
  before insert on auth.users
  for each row execute function public.enforce_signup_email_domain();

-- ---------------------------------------------------------------- tables

create table public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, name)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  group_label text,
  created_at timestamptz not null default now()
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  title text not null,
  color text not null check (color in (
    'red', 'orange', 'amber', 'green', 'teal',
    'sky', 'blue', 'violet', 'pink', 'slate'
  )),
  notes text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  content text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  applied_at timestamptz not null default now(),
  completed_at timestamptz
);

-- No row means the question is unanswered.
create table public.item_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  is_correct boolean not null,
  student_answer_text text,
  updated_at timestamptz not null default now(),
  unique (session_id, item_id)
);

-- Scores are calculated from item_responses. A row here exists only when the
-- teacher overrides that calculation, so the row itself is the override flag.
create table public.section_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  correct_count int not null check (correct_count >= 0),
  total_count int not null check (total_count >= 0),
  updated_at timestamptz not null default now(),
  unique (session_id, section_id)
);

create index on public.students (teacher_id);
create index on public.evaluations (teacher_id);
create index on public.sections (evaluation_id);
create index on public.items (section_id);
create index on public.sessions (teacher_id);
create index on public.sessions (evaluation_id);
create index on public.sessions (student_id);
create index on public.item_responses (session_id);
create index on public.item_responses (item_id);
create index on public.section_scores (session_id);

-- ------------------------------------------------------------------- RLS

alter table public.students enable row level security;
alter table public.evaluations enable row level security;
alter table public.sections enable row level security;
alter table public.items enable row level security;
alter table public.sessions enable row level security;
alter table public.item_responses enable row level security;
alter table public.section_scores enable row level security;

create policy "own students" on public.students
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "own evaluations" on public.evaluations
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "own sessions" on public.sessions
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "own sections" on public.sections
  for all to authenticated
  using (exists (
    select 1 from public.evaluations e
    where e.id = sections.evaluation_id and e.teacher_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.evaluations e
    where e.id = sections.evaluation_id and e.teacher_id = (select auth.uid())
  ));

create policy "own items" on public.items
  for all to authenticated
  using (exists (
    select 1 from public.sections s
    join public.evaluations e on e.id = s.evaluation_id
    where s.id = items.section_id and e.teacher_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.sections s
    join public.evaluations e on e.id = s.evaluation_id
    where s.id = items.section_id and e.teacher_id = (select auth.uid())
  ));

create policy "own item responses" on public.item_responses
  for all to authenticated
  using (exists (
    select 1 from public.sessions se
    where se.id = item_responses.session_id and se.teacher_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.sessions se
    where se.id = item_responses.session_id and se.teacher_id = (select auth.uid())
  ));

create policy "own section scores" on public.section_scores
  for all to authenticated
  using (exists (
    select 1 from public.sessions se
    where se.id = section_scores.session_id and se.teacher_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.sessions se
    where se.id = section_scores.session_id and se.teacher_id = (select auth.uid())
  ));
