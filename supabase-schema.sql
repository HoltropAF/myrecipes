-- myrecipes — complete database setup
--
-- Run this once in a fresh Supabase project: SQL Editor → New query → paste → Run.
-- It creates every table, the security rules, the `recipe-photos` storage bucket
-- and a starter allergen dictionary, so nothing else needs setting up by hand.
-- It is safe to run again: existing tables and rows are left alone.
--
-- Rebuilt 2026-11-18 from the live database. It folds in everything that used
-- to need separate steps: the files in supabase/migrations/ (feedback, storage
-- notes, precomputed tags, recipe groups), the photo bucket and its policies,
-- and the ingredient dictionary. If you change the live schema, update this file
-- too; the setup wizard (public/setup.html) and the wiki's Setup guide use it.

-- ============================================================
-- TABLES
-- ============================================================

-- recipe_groups: linked versions of one dish, shown as one card in the list.
-- Reversible, unlike merging recipes into variants: ungrouping clears group_id.
create table if not exists recipe_groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- recipes: one row per recipe, all structured data stored as JSONB columns.
create table if not exists recipes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text not null,
  tagline               text,                    -- short subtitle, e.g. "Creamy pasta met boursin"
  category              text,                    -- top-level folder, e.g. "Main dishes"
  subcategory           text,                    -- subfolder, e.g. "Weeknight"
  servings              int,
  total_minutes         int,
  tags                  text[] not null default '{}',   -- user-defined labels, e.g. ["quick","freezes well"]
  ingredients           jsonb not null default '[]',
    -- grouped structure: [{group: string|null, items: [{id, name, amount, unit, note}]}]
    -- `amount` is numeric or null. Never store a string here — the Ingredients tab
    -- formats it numerically.
  steps                 jsonb not null default '[]',
    -- sectioned: [{group: string|null, items: [{id, content, timer_seconds}]}]
  variants              jsonb not null default '[]',
    -- alternate full versions: [{id, label, ingredients, steps, photo_url}]
  notes                 text,                    -- freeform notes, shown on the Storage tab
  photo_url             text,
  source                text,                    -- e.g. URL, "imported from Canva", or freetext
  freezer_friendly      boolean,                 -- true = freezes well, false = not recommended, null = unknown
  fridge_storage        text,                    -- Storage tab: how long it keeps in the fridge
  reheat_instructions   text,                    -- Storage tab: how to reheat
  prep_ahead            text,                    -- Storage tab: what can be prepared ahead
  group_id              uuid references recipe_groups(id) on delete set null,
  -- Nutrition columns are legacy: the feature was removed in f6c48ff (2026-06-24)
  -- and nothing in the app reads them. Kept so existing rows still restore cleanly.
  calories              numeric,
  protein_g             numeric,
  carbs_g               numeric,
  fat_g                 numeric,
  nutrition_is_estimate boolean not null default true,
  -- Legacy: the wishlist feature was removed in ef8f3fa (2026-06-24).
  wishlist              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- shopping_list: individual line items, optionally linked to a recipe.
create table if not exists shopping_list (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  recipe_id  uuid references recipes(id) on delete set null,
  name       text not null,
  amount     numeric,
  unit       text,
  checked    boolean not null default false,
  created_at timestamptz not null default now()
);

-- cook_log: each time a recipe is made. One entry per cook session.
-- NOTE the column is `cooked_date` (a local calendar date), not `cooked_at`.
create table if not exists cook_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  recipe_id     uuid references recipes(id) on delete cascade,
  cooked_date   date not null default current_date,
  thumbs        text check (thumbs in ('up','down')),  -- nullable = logged but not rated
  notes         text,
  variant_label text,          -- which variant was cooked, if any
  created_at    timestamptz not null default now()
);

-- user_preferences: per-user settings, one row per user.
create table if not exists user_preferences (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  unit_system        text not null default 'metric' check (unit_system in ('metric','us')),
  theme              text not null default 'auto'   check (theme in ('light','dark','auto')),
  language           text not null default 'en'     check (language in ('en','nl')),
  default_category   text,
  recipe_view_mode   text default 'folders' check (recipe_view_mode in ('list','folders')),
  recipe_search_mode text default 'title'   check (recipe_search_mode in ('title','ingredient')),
  compact_mode       boolean not null default false,
  pin_wishlist_first boolean not null default false,  -- legacy, see recipes.wishlist
  updated_at         timestamptz not null default now()
);

-- meal_groups: the week planner. Each planned week is one row; the planner's
-- "Recipes to plan" inbox is a row too (see src/lib/mealPlanning.js).
create table if not exists meal_groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  notes      text,
  recipe_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- collections: user-curated groupings of recipes ("Dopamine Menu", "Weeknight").
create table if not exists collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  emoji       text default '📚',
  created_at  timestamptz default now()
);

create table if not exists collection_recipes (
  collection_id uuid not null references collections(id) on delete cascade,
  recipe_id     uuid not null references recipes(id) on delete cascade,
  added_at      timestamptz default now(),
  primary key (collection_id, recipe_id)
);

-- ingredient_tags: shared lookup mapping canonical ingredient names to allergen /
-- content tags (meat, fish, shellfish, dairy, gluten, egg, nuts).
--
-- This is deliberately a SHARED dictionary, not per-user data: a correction to
-- "melk → dairy" should apply to everyone on the instance. Each self-hosted
-- deployment has its own Supabase project and therefore its own copy.
create table if not exists ingredient_tags (
  id             uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  tags           text[] not null default '{}',
  substitutes    jsonb not null default '[]',
  reviewed       boolean not null default false,  -- false = never looked at, true = confirmed
  created_at     timestamptz not null default now()
);

comment on table ingredient_tags is
  'Lookup table mapping canonical ingredient names to allergen/content tags. Shared across all users of an instance.';

-- recipe_computed_tags: one row per recipe with its allergen tags and diet flags,
-- filled by the triggers below. It used to be a live view, but matching every
-- ingredient against the whole dictionary on every read grew past the 8 s
-- statement timeout, so it is now computed once whenever something changes.
create table if not exists recipe_computed_tags (
  recipe_id                uuid primary key references recipes(id) on delete cascade,
  allergen_tags            text[] not null default '{}',
  is_vegan                 boolean not null default false,
  is_vegetarian            boolean not null default false,
  is_pescatarian_or_better boolean not null default false
);

-- app_feedback: the "Report something" notes from the Home tab.
create table if not exists app_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('bug', 'looks_wrong', 'idea')),
  message     text not null check (char_length(btrim(message)) between 1 and 4000),
  page        text not null default 'unknown',
  app_version text,
  context     jsonb not null default '{}'::jsonb,
  status      text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'closed')),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- UPGRADING AN OLDER DATABASE
-- ============================================================
-- `create table if not exists` leaves an existing table alone, so columns added
-- since a copy was first set up are added here. All of this does nothing on a
-- fresh database.
alter table recipes
  add column if not exists fridge_storage      text,
  add column if not exists reheat_instructions text,
  add column if not exists prep_ahead          text,
  add column if not exists group_id            uuid references recipe_groups(id) on delete set null;
alter table ingredient_tags
  add column if not exists substitutes jsonb   not null default '[]',
  add column if not exists reviewed    boolean not null default false;
alter table user_preferences
  add column if not exists language text not null default 'en';

-- Copies set up before September 2026 have recipe_computed_tags as a slow live
-- view; replace it with the table defined above.
do $$
begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'recipe_computed_tags') then
    drop view public.recipe_computed_tags;
    create table public.recipe_computed_tags (
      recipe_id                uuid primary key references public.recipes(id) on delete cascade,
      allergen_tags            text[] not null default '{}',
      is_vegan                 boolean not null default false,
      is_vegetarian            boolean not null default false,
      is_pescatarian_or_better boolean not null default false
    );
  end if;
end $$;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_recipes_user              on recipes(user_id);
create index if not exists idx_recipes_category          on recipes(category);
create index if not exists idx_recipes_tags              on recipes using gin (tags);
create index if not exists idx_shopping_list_user        on shopping_list(user_id);
create index if not exists idx_shopping_list_recipe_id   on shopping_list(recipe_id);
create index if not exists idx_cook_log_user_recipe      on cook_log(user_id, recipe_id);
create index if not exists idx_cook_log_date             on cook_log(user_id, cooked_date);
create index if not exists idx_cook_log_recipe_id        on cook_log(recipe_id);
create index if not exists idx_meal_groups_user          on meal_groups(user_id);
create index if not exists app_feedback_user_created_idx on app_feedback(user_id, created_at desc);

-- ============================================================
-- VIEWS
-- ============================================================
-- recipe_ingredient_tags: which dictionary entry matched which ingredient, for
-- debugging the allergen labels. Not used by the app itself.
-- `security_invoker = true` matters: without it the view runs with its owner's
-- rights, row level security on `recipes` would not apply, and every user's
-- recipe titles and ingredients would be readable with the public anon key.
create or replace view recipe_ingredient_tags
with (security_invoker = true) as
select
  r.id                as recipe_id,
  r.title,
  item->>'name'       as raw_ingredient,
  it.canonical_name,
  it.tags
from recipes r
cross join lateral jsonb_array_elements(r.ingredients) as ig
cross join lateral jsonb_array_elements(ig->'items')   as item
join ingredient_tags it
  on lower(item->>'name') ilike '%' || lower(it.canonical_name) || '%';

-- ============================================================
-- PRECOMPUTED ALLERGEN TAGS
-- ============================================================
-- security definer: this runs from a trigger fired by an ordinary user's
-- recipe insert/update, but recipe_computed_tags only grants that role
-- SELECT - without this the trigger's own write fails row level security.
create or replace function recompute_recipe_tags(p_recipe_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_tags  text[];
begin
  select user_id into v_owner from recipes where id = p_recipe_id;

  select coalesce(array_agg(distinct tag.tag), '{}')
  into v_tags
  from recipes r
    cross join lateral jsonb_array_elements(r.ingredients) grp(value)
    cross join lateral jsonb_array_elements(grp.value -> 'items') item(value)
    join (
      select m.canonical_name, m.tags
      from my_ingredient_tags m
      where m.user_id = v_owner
      union all
      select lower(it.canonical_name), it.tags
      from ingredient_tags it
      where not exists (
        select 1 from my_ingredient_tags m
        where m.user_id = v_owner and m.canonical_name = lower(it.canonical_name)
      )
    ) d on lower(item.value ->> 'name') ~ (
      '\m' || regexp_replace(d.canonical_name, '([.\\+*?()|\[\]{}^$])', '\\\1', 'g') || '\M'
    )
    cross join lateral unnest(d.tags) tag(tag)
  where r.id = p_recipe_id;

  insert into recipe_computed_tags (recipe_id, allergen_tags, is_vegan, is_vegetarian, is_pescatarian_or_better)
  values (
    p_recipe_id, v_tags,
    not (v_tags && array['meat','fish','shellfish','dairy','egg']),
    not (v_tags && array['meat','fish','shellfish']),
    not (v_tags && array['meat'])
  )
  on conflict (recipe_id) do update set
    allergen_tags = excluded.allergen_tags,
    is_vegan = excluded.is_vegan,
    is_vegetarian = excluded.is_vegetarian,
    is_pescatarian_or_better = excluded.is_pescatarian_or_better;
end;
$$;

create or replace function recompute_recipe_tags_trigger() returns trigger
language plpgsql as $$
begin
  perform recompute_recipe_tags(NEW.id);
  return NEW;
end;
$$;

drop trigger if exists trg_recompute_recipe_tags on recipes;
create trigger trg_recompute_recipe_tags
  after insert or update of ingredients on recipes
  for each row execute function recompute_recipe_tags_trigger();

-- ============================================================
-- WHO MAY CHANGE THE SHARED DICTIONARY, AND PERSONAL WORDS ON TOP OF IT
-- ============================================================
-- The shared ingredient_tags list can only be changed (adding words included)
-- by the people in dictionary_editors. While that list is empty everyone is an
-- editor, so a new copy works straight away. To lock it, add yourself (your id
-- is under Authentication → Users):
--   insert into dictionary_editors (user_id) values ('<your user id>');
-- Everyone else keeps their own words and overrides in my_ingredient_tags,
-- which only affect the labels on their own recipes. A change only recomputes
-- the recipes that contain the changed word.
create table if not exists dictionary_editors (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
-- No policies: the list is not readable or writable through the API.
alter table dictionary_editors enable row level security;

create or replace function can_edit_dictionary() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select auth.uid() is null
      or not exists (select 1 from dictionary_editors)
      or exists (select 1 from dictionary_editors where user_id = auth.uid());
$$;
grant execute on function can_edit_dictionary() to authenticated;

-- Raised as an error (rather than letting row level security silently skip the
-- row) so the app can tell the person why their change did not stick.
create or replace function guard_dictionary_edit() returns trigger
language plpgsql as $$
begin
  if not can_edit_dictionary() then
    raise exception 'Only dictionary editors can change or remove existing entries'
      using errcode = '42501';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_guard_dictionary_edit on ingredient_tags;
create trigger trg_guard_dictionary_edit
  before insert or update or delete on ingredient_tags
  for each row execute function guard_dictionary_edit();

-- Recompute the recipes whose ingredient names contain `p_word` as a whole word
-- (the same match recompute_recipe_tags uses).
drop function if exists recompute_recipe_tags_for_word(text);
create or replace function recompute_recipe_tags_for_word(p_word text, p_user uuid default null) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pattern text := '\m' || regexp_replace(lower(p_word), '([.\\+*?()|\[\]{}^$])', '\\\1', 'g') || '\M';
begin
  perform recompute_recipe_tags(r.id)
  from recipes r
  where (p_user is null or r.user_id = p_user)
    and exists (
      select 1
      from jsonb_array_elements(r.ingredients) grp(value)
        cross join lateral jsonb_array_elements(grp.value -> 'items') item(value)
      where lower(item.value ->> 'name') ~ v_pattern
    );
end;
$$;

create or replace function recompute_tags_on_dictionary_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP in ('UPDATE', 'DELETE') then
    perform recompute_recipe_tags_for_word(OLD.canonical_name);
  end if;
  if TG_OP in ('INSERT', 'UPDATE') and (TG_OP = 'INSERT' or NEW.canonical_name <> OLD.canonical_name) then
    perform recompute_recipe_tags_for_word(NEW.canonical_name);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_recompute_all_on_dictionary_change on ingredient_tags;
drop trigger if exists trg_recompute_on_dictionary_change on ingredient_tags;
create trigger trg_recompute_on_dictionary_change
  after insert or update of canonical_name, tags or delete on ingredient_tags
  for each row execute function recompute_tags_on_dictionary_change();

drop function if exists recompute_all_recipe_tags();

-- Personal words: your own tags for a word, used for your recipes only.
create table if not exists my_ingredient_tags (
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  canonical_name text not null check (canonical_name = lower(canonical_name) and length(btrim(canonical_name)) > 0),
  tags           text[] not null default '{}',
  updated_at     timestamptz not null default now(),
  primary key (user_id, canonical_name)
);
alter table my_ingredient_tags enable row level security;
drop policy if exists "Users manage their own ingredient tags" on my_ingredient_tags;
create policy "Users manage their own ingredient tags" on my_ingredient_tags
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on my_ingredient_tags to authenticated;

-- A change to someone's own word only touches their own recipes.
create or replace function recompute_tags_on_my_word_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP in ('UPDATE', 'DELETE') then
    perform recompute_recipe_tags_for_word(OLD.canonical_name, OLD.user_id);
  end if;
  if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and NEW.canonical_name <> OLD.canonical_name) then
    perform recompute_recipe_tags_for_word(NEW.canonical_name, NEW.user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_recompute_on_my_word_change on my_ingredient_tags;
create trigger trg_recompute_on_my_word_change
  after insert or update of canonical_name, tags or delete on my_ingredient_tags
  for each row execute function recompute_tags_on_my_word_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Note the `(select auth.uid())` form: wrapping it in a subquery lets Postgres
-- evaluate it once per statement instead of once per row (see commit 002527b).
-- Every policy is dropped first so this file can be run again safely.

alter table recipes              enable row level security;
alter table shopping_list        enable row level security;
alter table cook_log             enable row level security;
alter table user_preferences     enable row level security;
alter table meal_groups          enable row level security;
alter table collections          enable row level security;
alter table collection_recipes   enable row level security;
alter table recipe_groups        enable row level security;
alter table ingredient_tags      enable row level security;
alter table recipe_computed_tags enable row level security;
alter table app_feedback         enable row level security;

drop policy if exists "Users manage their own recipes" on recipes;
create policy "Users manage their own recipes" on recipes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own shopping list" on shopping_list;
create policy "Users manage their own shopping list" on shopping_list
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own cook log" on cook_log;
create policy "Users manage their own cook log" on cook_log
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own preferences" on user_preferences;
create policy "Users manage their own preferences" on user_preferences
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own meal groups" on meal_groups;
create policy "Users manage their own meal groups" on meal_groups
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users_own_collections" on collections;
create policy "users_own_collections" on collections
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users_own_collection_recipes" on collection_recipes;
create policy "users_own_collection_recipes" on collection_recipes
  for all
  using (collection_id in (select id from collections where user_id = (select auth.uid())))
  with check (collection_id in (select id from collections where user_id = (select auth.uid())));

drop policy if exists "Users manage their own recipe groups" on recipe_groups;
create policy "Users manage their own recipe groups" on recipe_groups
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on recipe_groups to authenticated;

-- ingredient_tags is the shared dictionary described above: every signed-in user
-- can read it and correct it, and corrections apply instance-wide. If you deploy
-- an instance with users who should not be able to edit it, drop the write policy
-- and curate the table yourself.
drop policy if exists "Authenticated users can read ingredient_tags" on ingredient_tags;
create policy "Authenticated users can read ingredient_tags" on ingredient_tags
  for select to authenticated using (true);

drop policy if exists "Authenticated users can write ingredient_tags" on ingredient_tags;
create policy "Authenticated users can write ingredient_tags" on ingredient_tags
  for all to authenticated using (true) with check (true);

-- Read-only for users; only the security-definer function above writes here.
drop policy if exists "Users read their own recipe tags" on recipe_computed_tags;
create policy "Users read their own recipe tags" on recipe_computed_tags
  for select using (exists (
    select 1 from recipes r where r.id = recipe_computed_tags.recipe_id and r.user_id = (select auth.uid())
  ));
grant select on recipe_computed_tags to authenticated, anon;

-- Feedback can be written and read back by its author, never changed.
revoke all on app_feedback from anon;
grant select, insert on app_feedback to authenticated;
drop policy if exists "Users can add their own feedback" on app_feedback;
create policy "Users can add their own feedback" on app_feedback
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can read their own feedback" on app_feedback;
create policy "Users can read their own feedback" on app_feedback
  for select to authenticated using ((select auth.uid()) = user_id);

-- ============================================================
-- PHOTO STORAGE
-- ============================================================
-- A public bucket: photos load from a long, unguessable URL without signing in.
-- Uploads go into a folder named after the user's id, and only that user can
-- add, replace or delete files in it.
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

drop policy if exists "Users upload their own recipe photos" on storage.objects;
create policy "Users upload their own recipe photos" on storage.objects
  for insert with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users update their own recipe photos" on storage.objects;
create policy "Users update their own recipe photos" on storage.objects
  for update using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their own recipe photos" on storage.objects;
create policy "Users delete their own recipe photos" on storage.objects
  for delete using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============================================================
-- STARTER ALLERGEN DICTIONARY
-- ============================================================
-- Dutch and English ingredient words with their allergen tags, plus a few
-- substitution tips. Correct or extend it in the app under Settings → Tags.
-- Existing entries are never overwritten.
insert into ingredient_tags (canonical_name, tags, substitutes, reviewed) select v.name, v.tags::text[], v.subs::jsonb, true from (values
('aardappel', '{}', '[]'),
('aardbeien', '{}', '[]'),
('agavesiroop', '{}', '[]'),
('all-purpose flour', '{gluten}', '[]'),
('amandelen', '{nuts}', '[]'),
('amandellikeur', '{nuts}', '[]'),
('amandelschaafsel', '{nuts}', '[]'),
('ananassap', '{}', '[]'),
('ancho peppers', '{}', '[]'),
('appelsap', '{}', '[]'),
('arbol peppers', '{}', '[]'),
('aubergine', '{}', '[]'),
('avocado', '{}', '[]'),
('bacon', '{meat}', '[]'),
('bakpoeder', '{gluten}', '[]'),
('basil', '{}', '[]'),
('basilicum', '{}', '[]'),
('basmatirijst', '{}', '[]'),
('basterdsuiker', '{}', '[]'),
('bay leaves', '{}', '[]'),
('beef chuck', '{meat}', '[]'),
('beef stock', '{}', '[]'),
('beenham', '{meat}', '[]'),
('black pepper', '{}', '[]'),
('bladerdeeg', '{gluten}', '[]'),
('bloem', '{gluten}', '[]'),
('blue curaçao', '{}', '[]'),
('bosui', '{}', '[]'),
('bosuien', '{}', '[]'),
('boter', '{dairy}', '[]'),
('botersla', '{}', '[]'),
('bouillon', '{}', '[]'),
('boursin', '{dairy}', '[]'),
('broccoli', '{}', '[]'),
('brood', '{gluten}', '[]'),
('brown sugar', '{}', '["1 cup white sugar + 1 tbsp molasses"]'),
('bruine suiker', '{}', '[]'),
('butter', '{dairy}', '["Neutral oil or margarine (equal amount, for cooking)", "Unsweetened applesauce (baking, use 3/4 the amount)"]'),
('cabbage', '{}', '[]'),
('cacaopoeder', '{}', '[]'),
('cannellini beans', '{}', '[]'),
('carpaccio', '{meat}', '[]'),
('cashewnoten', '{nuts}', '[]'),
('cashews', '{nuts}', '[]'),
('cayennepeper', '{}', '[]'),
('celery', '{}', '[]'),
('champignonroomsoep', '{dairy}', '[]'),
('cheddar kaas', '{dairy}', '[]'),
('cherry tomaatjes', '{}', '[]'),
('chicken', '{meat}', '[]'),
('chicken stock', '{meat}', '[]'),
('chili powder', '{}', '[]'),
('chilivlokken', '{}', '[]'),
('chocolate syrup', '{dairy}', '[]'),
('chorizo', '{meat}', '[]'),
('cilantro', '{}', '[]'),
('citroen', '{}', '[]'),
('citroengras', '{}', '[]'),
('cloves', '{}', '[]'),
('coconut milk', '{}', '[]'),
('coconut oil', '{}', '[]'),
('corn', '{}', '[]'),
('cornstarch', '{gluten}', '["2x the amount of all-purpose flour", "Arrowroot powder (equal amount)"]'),
('courgette', '{}', '[]'),
('couscous', '{gluten}', '[]'),
('cranberries', '{}', '[]'),
('cranberrysap', '{}', '[]'),
('cream', '{dairy}', '[]'),
('crème fraîche', '{dairy}', '[]'),
('cumin', '{}', '[]'),
('curry powder', '{}', '[]'),
('deeg voor hartige taart', '{gluten}', '[]'),
('dijon mosterd', '{}', '[]'),
('dille', '{}', '[]'),
('doenjang', '{gluten}', '[]'),
('doperwtjes', '{}', '[]'),
('droge witte wijn', '{}', '[]'),
('egg', '{egg}', '[]'),
('eggplant', '{}', '[]'),
('eggs', '{egg}', '["1 tbsp ground flaxseed + 3 tbsp water, rest 5 min (per egg)", "1/4 cup unsweetened applesauce (per egg, baking only)"]'),
('ei', '{egg}', '[]'),
('eidooiers', '{egg}', '[]'),
('eieren', '{egg}', '[]'),
('eiwit', '{egg}', '[]'),
('feta', '{dairy}', '[]'),
('filet american', '{meat}', '[]'),
('fish cake', '{fish}', '[]'),
('fish sauce', '{fish}', '[]'),
('flammkuchen deeg', '{gluten}', '[]'),
('flour', '{gluten}', '[]'),
('fried eggs', '{egg}', '["1 tbsp ground flaxseed + 3 tbsp water, rest 5 min (per egg)", "1/4 cup unsweetened applesauce (per egg, baking only)"]'),
('garlic', '{}', '[]'),
('garlic powder', '{}', '[]'),
('garnalen', '{shellfish}', '[]'),
('gehakt', '{meat}', '[]'),
('geitenkaas', '{dairy}', '[]'),
('gekookt ei', '{egg}', '[]'),
('gember', '{}', '[]'),
('gerookte kip', '{meat}', '[]'),
('gerookte paprikapoeder', '{}', '[]'),
('gerookte zalm', '{fish}', '[]'),
('gin', '{}', '[]'),
('ginger', '{}', '[]'),
('ginger ale', '{}', '[]'),
('gochugaru', '{}', '[]'),
('gochujang', '{gluten}', '[]'),
('gochujang paste', '{gluten}', '[]'),
('gouda kaas', '{dairy}', '[]'),
('greek yogurt', '{dairy}', '["Sour cream (equal amount)", "Plain yogurt (equal amount)"]'),
('green onions', '{}', '[]'),
('griekse yoghurt', '{dairy}', '[]'),
('groentebouillon', '{}', '[]'),
('grote ui', '{}', '[]'),
('ground beef', '{meat}', '[]'),
('ground turkey', '{meat}', '[]'),
('gruyère', '{dairy}', '[]'),
('guajillo peppers', '{}', '[]'),
('halfvolle melk', '{dairy}', '[]'),
('halloumi', '{dairy}', '[]'),
('ham', '{meat}', '[]'),
('hard-boiled eggs', '{egg}', '["1 tbsp ground flaxseed + 3 tbsp water, rest 5 min (per egg)", "1/4 cup unsweetened applesauce (per egg, baking only)"]'),
('heavy cream', '{dairy}', '["3/4 cup milk + 1/4 cup melted butter (per cup)", "Evaporated milk, undiluted"]'),
('hoisin', '{gluten}', '[]'),
('honey', '{}', '["Maple syrup (equal amount)", "Granulated sugar + splash of water"]'),
('honing', '{}', '[]'),
('honingmosterdsaus', '{egg}', '[]'),
('ijs', '{dairy}', '[]'),
('ijsbergsla', '{}', '[]'),
('ijsklontjes', '{}', '[]'),
('imitatie krab', '{shellfish}', '[]'),
('irish cream', '{dairy}', '[]'),
('italian sausage', '{meat}', '[]'),
('jalapeño', '{}', '[]'),
('kaas', '{dairy}', '[]'),
('kahlúa', '{}', '[]'),
('kaneel', '{}', '[]'),
('kaneelstokjes', '{}', '[]'),
('kerriepoeder', '{}', '[]'),
('kewpie mayonaise', '{egg}', '[]'),
('kidneybonen', '{}', '[]'),
('kikkererwten', '{}', '[]'),
('kimchi', '{}', '[]'),
('kip', '{meat}', '[]'),
('kipcorn', '{meat}', '[]'),
('kipfilet', '{meat}', '[]'),
('kipsate', '{meat}', '[]'),
('kipstukjes', '{meat}', '[]'),
('knoflook', '{}', '[]'),
('knoflookpoeder', '{}', '[]'),
('knolselderij', '{}', '[]'),
('kokosmelk', '{}', '[]'),
('komijnpoeder', '{}', '[]'),
('komijnzaad', '{}', '[]'),
('komkommer', '{}', '[]'),
('kookroom', '{dairy}', '[]'),
('kool', '{}', '[]'),
('koriander', '{}', '[]'),
('korianderpoeder', '{}', '[]'),
('korianderzaad', '{}', '[]'),
('krieltjes', '{}', '[]'),
('kruidnagels', '{}', '[]'),
('lange vingers', '{gluten,egg}', '[]'),
('lasagne all-uovo', '{gluten}', '[]'),
('lasagnebladen', '{gluten}', '[]'),
('laurierbladen', '{}', '[]'),
('lenteui', '{}', '[]'),
('lichte sojasaus', '{gluten}', '[]'),
('light soy sauce', '{gluten}', '[]'),
('lime', '{}', '[]'),
('limoen', '{}', '[]'),
('mais', '{}', '[]'),
('mais tortillas', '{gluten}', '[]'),
('maizena', '{}', '[]'),
('manchego kaas', '{dairy}', '[]'),
('mango', '{}', '[]'),
('maple syrup', '{}', '[]'),
('marjoram', '{}', '[]'),
('mascarpone', '{dairy}', '[]'),
('mayo', '{egg}', '[]'),
('mayonaise', '{egg}', '[]'),
('mayonnaise', '{egg}', '[]'),
('melk', '{dairy}', '[]'),
('milk', '{dairy}', '[]'),
('mirin', '{}', '[]'),
('mosterd', '{}', '[]'),
('mozzarella', '{dairy}', '[]'),
('mustard', '{}', '[]'),
('naanbrood', '{gluten}', '[]'),
('nootmuskaat', '{}', '[]'),
('oaxacan melting cheese', '{dairy}', '[]'),
('oesterzwammen', '{}', '[]'),
('olijfolie', '{}', '[]'),
('olive oil', '{}', '[]'),
('ontbijtspek', '{meat}', '[]'),
('oregano', '{}', '[]'),
('ossenworst', '{meat}', '[]'),
('palmsuiker', '{}', '[]'),
('paneermeel', '{gluten}', '[]'),
('panko', '{gluten}', '[]'),
('paprika', '{}', '[]'),
('paprikapoeder', '{}', '[]'),
('parelcouscous', '{gluten}', '[]'),
('parmaham', '{meat}', '[]'),
('parmesan cheese', '{dairy}', '["Pecorino Romano", "Grana Padano"]'),
('parmezaanse kaas', '{dairy}', '[]'),
('parsley', '{}', '[]'),
('passata', '{}', '[]'),
('pasta', '{gluten}', '[]'),
('pastrami', '{meat}', '[]'),
('peach', '{}', '[]'),
('peanut oil', '{}', '[]'),
('pear', '{}', '[]'),
('peper', '{}', '[]'),
('peterselie', '{}', '[]'),
('pijnboompitjes', '{nuts}', '[]'),
('pijnboompitten', '{nuts}', '[]'),
('pineapple juice', '{}', '[]'),
('pinto beans', '{}', '[]'),
('pistachenoten', '{nuts}', '[]'),
('pistachepasta', '{nuts}', '[]'),
('pitas', '{gluten}', '[]'),
('poedersuiker', '{}', '[]'),
('pompoen', '{}', '[]'),
('pompoenlasagnevellen', '{gluten}', '[]'),
('pork belly', '{meat}', '[]'),
('potato starch', '{}', '[]'),
('potatoes', '{}', '[]'),
('prei', '{}', '[]'),
('prosecco', '{}', '[]'),
('pure chocolade', '{}', '[]'),
('quichedeeg', '{gluten}', '[]'),
('radijs', '{}', '[]'),
('ramen noodles', '{gluten}', '[]'),
('red wine', '{}', '[]'),
('red wine vinegar', '{}', '[]'),
('rib-eye steak', '{meat}', '[]'),
('rice', '{}', '[]'),
('rice vinegar', '{}', '[]'),
('rijst', '{}', '[]'),
('rijstazijn', '{}', '[]'),
('rode bieten', '{}', '[]'),
('rode currypasta', '{}', '[]'),
('rode paprika', '{}', '[]'),
('rode peper', '{}', '[]'),
('rode ui', '{}', '[]'),
('roeryoghurt', '{dairy}', '[]'),
('roma tomatoes', '{}', '[]'),
('rookworst', '{meat}', '[]'),
('roomboter', '{dairy}', '[]'),
('roomsaus', '{dairy}', '[]'),
('roomsaus + benodigdheden', '{gluten,dairy}', '[]'),
('rosbief', '{meat}', '[]'),
('rosemary', '{}', '[]'),
('rozemarijn', '{}', '[]'),
('rucola', '{}', '[]'),
('runder carpaccio', '{meat}', '[]'),
('rundergehakt', '{meat}', '[]'),
('rundersukadelappen', '{meat}', '[]'),
('rundvlees', '{meat}', '[]'),
('salie', '{}', '[]'),
('salt', '{}', '[]'),
('sambal', '{}', '[]'),
('scallion', '{}', '[]'),
('scharreleieren', '{egg}', '[]'),
('schenkel', '{meat}', '[]'),
('selderij', '{}', '[]'),
('self-raising flour', '{gluten}', '["1 cup flour + 1.5 tsp baking powder + 1/4 tsp salt"]'),
('serrano peppers', '{}', '[]'),
('serranoham', '{meat}', '[]'),
('sesame oil', '{}', '[]'),
('sesame seeds', '{}', '[]'),
('sesamolie', '{}', '[]'),
('sesamzaad', '{}', '[]'),
('shallot', '{}', '["1/4 cup chopped onion (per shallot)", "2-3 green onions"]'),
('shiitake', '{}', '[]'),
('short rib', '{meat}', '[]'),
('shredded carrots', '{}', '[]'),
('shrimp', '{shellfish}', '[]'),
('sinaasappel', '{}', '[]'),
('sjalotten', '{}', '[]'),
('sla', '{}', '[]'),
('slagroom', '{dairy}', '[]'),
('smeltkaas', '{dairy}', '[]'),
('smoked bacon', '{meat}', '[]'),
('soda water', '{}', '[]'),
('sojasaus', '{gluten}', '[]'),
('sour cream', '{dairy}', '["Greek yogurt (equal amount)", "Crème fraîche (equal amount)"]'),
('soy sauce', '{gluten}', '[]'),
('spek', '{meat}', '[]'),
('spekjes', '{meat}', '[]'),
('spiced rum', '{}', '[]'),
('spinach', '{}', '[]'),
('spinazie', '{}', '[]'),
('spring onion', '{}', '[]'),
('spring roll wrappers', '{gluten}', '[]'),
('sprite', '{}', '[]'),
('steranijs', '{}', '[]'),
('stokbrood', '{gluten}', '[]'),
('sugar', '{}', '[]'),
('suiker', '{}', '[]'),
('tacoschelpen', '{gluten}', '[]'),
('tarwebloem', '{gluten}', '[]'),
('thai curry paste', '{}', '[]'),
('thyme', '{}', '[]'),
('tijm', '{}', '[]'),
('toasted sesame oil', '{}', '[]'),
('toasted sesame seeds', '{}', '[]'),
('tofu', '{}', '[]'),
('tomaat', '{}', '[]'),
('tomaten', '{}', '[]'),
('tomatenblokjes', '{}', '[]'),
('tomatenpuree', '{}', '[]'),
('tomatillos', '{}', '[]'),
('tomato paste', '{}', '[]'),
('tonijn', '{fish}', '[]'),
('tortilla chips', '{gluten}', '[]'),
('tortillachips', '{gluten}', '[]'),
('truffelmayonaise', '{egg}', '[]'),
('truffelolie', '{}', '[]'),
('ui', '{}', '[]'),
('uien', '{}', '[]'),
('vanilla ice cream', '{dairy}', '[]'),
('vanillesuiker', '{}', '[]'),
('vegetable oil', '{}', '[]'),
('veldsla', '{}', '[]'),
('vellen filodeeg', '{gluten}', '[]'),
('venkel', '{}', '[]'),
('vleestomaat', '{}', '[]'),
('vodka', '{}', '[]'),
('volkoren pitas', '{gluten}', '[]'),
('walnoten', '{nuts}', '[]'),
('water', '{}', '[]'),
('whipped cream', '{dairy}', '[]'),
('white fish', '{fish}', '[]'),
('white tea bags', '{}', '[]'),
('white vinegar', '{}', '[]'),
('winterpeen', '{}', '[]'),
('witte azijn', '{}', '[]'),
('witte rijst', '{}', '[]'),
('witte ui', '{}', '[]'),
('wodka', '{}', '[]'),
('woknoedels', '{gluten}', '[]'),
('wonton wrappers', '{gluten}', '[]'),
('worcestershire sauce', '{gluten}', '[]'),
('worcestershiresaus', '{gluten}', '[]'),
('wortel', '{}', '[]'),
('wrap', '{gluten}', '[]'),
('wraps', '{gluten}', '[]'),
('yoghurt', '{dairy}', '[]'),
('yukon gold potatoes', '{}', '[]'),
('zalm', '{fish}', '[]'),
('zalmfilet', '{fish}', '[]'),
('zelfrijzend bakmeel', '{gluten}', '[]'),
('zoete aardappel', '{}', '[]'),
('zongedroogde tomaten', '{}', '[]'),
('zonnebloemolie', '{}', '[]'),
('zout', '{}', '[]'),
('zwarte bonen', '{}', '[]'),
('zwarte peper', '{}', '[]')
) as v(name, tags, subs)
on conflict (canonical_name) do nothing;

-- Fill in tags for any recipe that has none yet (an upgraded older copy).
select recompute_recipe_tags(id) from recipes
where id not in (select recipe_id from recipe_computed_tags);
