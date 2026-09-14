-- Lightweight, reversible alternative to merging recipes into variants:
-- recipes stay fully independent rows, just tagged with a shared group so
-- the list can optionally collapse them into one card. Unlike a merge,
-- nothing here is destructive - ungrouping just clears group_id.
create table if not exists recipe_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table recipe_groups enable row level security;

drop policy if exists "Users manage their own recipe groups" on recipe_groups;
create policy "Users manage their own recipe groups" on recipe_groups
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on recipe_groups to authenticated;

alter table recipes add column if not exists group_id uuid references recipe_groups(id) on delete set null;
