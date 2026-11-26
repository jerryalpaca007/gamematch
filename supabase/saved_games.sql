-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.

create table if not exists public.saved_games (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  steam_app_id bigint not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, steam_app_id)
);

-- Each person may only see and change their own rows
alter table public.saved_games enable row level security;

drop policy if exists "read own saves" on public.saved_games;
create policy "read own saves" on public.saved_games
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "add own saves" on public.saved_games;
create policy "add own saves" on public.saved_games
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "remove own saves" on public.saved_games;
create policy "remove own saves" on public.saved_games
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, delete on public.saved_games to authenticated;

-- CHECK (read the results): the games table should show rls = true, and its
-- only policies should be for SELECT. If rls is false, anyone holding the
-- public key can change your games.
select relname as table_name, relrowsecurity as rls
from pg_class where oid = 'public.games'::regclass;

select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'games';
