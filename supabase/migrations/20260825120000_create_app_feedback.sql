create table public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bug', 'looks_wrong', 'idea')),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  page text not null default 'unknown',
  app_version text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create index app_feedback_user_created_idx
  on public.app_feedback (user_id, created_at desc);

alter table public.app_feedback enable row level security;

revoke all on public.app_feedback from anon;
grant select, insert on public.app_feedback to authenticated;

create policy "Users can add their own feedback"
  on public.app_feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own feedback"
  on public.app_feedback
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
