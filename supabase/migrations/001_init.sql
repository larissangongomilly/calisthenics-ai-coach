-- Account data for the app. Run once in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- One row per user. The app keeps working offline with localStorage and
-- merges this row with the local data when it syncs (see src/sync.js).
-- Body data (height, weight, birth year) is health data and is NOT stored here.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,  -- skills, history, practice days
  settings jsonb not null default '{}'::jsonb,  -- app settings
  profile jsonb not null default '{}'::jsonb,   -- name, photo, goal skill
  updated_at timestamptz not null default now()
);

-- Row level security: every user can only see and change their own row.
alter table public.user_data enable row level security;

drop policy if exists "Read own data" on public.user_data;
create policy "Read own data" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Insert own data" on public.user_data;
create policy "Insert own data" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own data" on public.user_data;
create policy "Update own data" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Deletes the signed-in user's account and, through "on delete cascade",
-- all of their data. Needed for in-app account deletion (App Store rule).
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
