-- Search students by name while ignoring accents and case, so "Sofia" finds
-- "Sofía" and the teacher does not create a duplicate.

create extension if not exists unaccent with schema extensions;

-- Generated columns need an immutable function; extensions.unaccent is not.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

alter table public.students
  add column search_name text
  generated always as (lower(public.immutable_unaccent(name))) stored;

create index students_teacher_search_name_idx
  on public.students (teacher_id, search_name);
