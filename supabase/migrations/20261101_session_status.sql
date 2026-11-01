-- Run once in the existing project's SQL Editor. Keeps all rows and RLS policies.
alter table public.study_sessions
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'submitted'));
