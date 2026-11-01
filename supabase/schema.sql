create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course text not null,
  description text not null default '',
  session_name text not null default '',
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now(),
  constraint study_sessions_time_order check (end_time > start_time)
);

alter table public.study_sessions enable row level security;

drop policy if exists "Users manage their own study sessions"
  on public.study_sessions;

create policy "Users manage their own study sessions"
  on public.study_sessions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.study_sessions
  to authenticated;


-- Also apply migrations/20261101_workspace_sync.sql for account settings sync.
