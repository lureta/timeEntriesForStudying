-- Keeps existing sessions, categories, and RLS policies intact.
alter table public.study_sessions
  add column if not exists session_name text not null default '';
