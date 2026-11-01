-- Adds account-scoped settings without changing existing sessions or policies.
create table if not exists public.user_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  primary key (user_id, key)
);
alter table public.user_settings enable row level security;
-- Idempotent: leave an existing policy with this name intact.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_settings' and policyname = 'Users manage own settings') then
    create policy "Users manage own settings" on public.user_settings
      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
grant select, insert, update, delete on public.user_settings to authenticated;
