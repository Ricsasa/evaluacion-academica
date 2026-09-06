-- A student is evaluated once per evaluation. Applying the same evaluation
-- again reopens the session that already exists.

-- Keep the first session of each pair and remove the later duplicates.
delete from public.sessions s
using public.sessions keep
where s.evaluation_id = keep.evaluation_id
  and s.student_id = keep.student_id
  and (keep.applied_at, keep.id) < (s.applied_at, s.id);

alter table public.sessions
  add constraint sessions_one_per_student_and_evaluation
  unique (evaluation_id, student_id);
