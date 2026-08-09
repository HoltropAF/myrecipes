-- myrecipes — database schema
--
-- Run this once against a fresh Supabase project (SQL Editor → New query → paste → Run).
-- Also create a PUBLIC storage bucket named `recipe-photos` (Storage → New bucket).
--
-- Regenerated 2026-08-09 directly from the live database, which had drifted well
-- ahead of the previous hand-maintained version (it was missing the collections
-- tables, ingredient_tags.id/reviewed/substitutes, user_preferences.language and
-- several recipes columns). If you change the schema in the Supabase dashboard,
-- update this file too — the setup wizard in public/setup.html points new
-- deployers straight at it.

-- ============================================================
-- TABLES
-- ============================================================

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
    -- alternate full versions: [{id, label, ingredients, steps}]
  notes                 text,                    -- freeform storage/prep notes shown on Notes tab
  photo_url             text,
  source                text,                    -- e.g. URL, "imported from Canva", or freetext
  freezer_friendly      boolean,                 -- true = freezes well, false = not recommended, null = unknown
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

-- meal_groups: a batch of recipes planned together (a meal-prep week).
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

-- ============================================================
-- INDEXES
-- ============================================================
-- Covering indexes for the foreign keys used in per-recipe lookups.
create index if not exists idx_shopping_list_recipe_id on shopping_list(recipe_id);
create index if not exists idx_cook_log_recipe_id      on cook_log(recipe_id);

-- ============================================================
-- VIEWS
-- ============================================================
-- IMPORTANT: both views are declared `security_invoker = true`. A Postgres view
-- otherwise executes with its owner's privileges, which means row level security
-- on `recipes` does NOT apply and every user's recipe titles and ingredient names
-- become readable by any holder of the anon key.

-- recipe_ingredient_tags: per-ingredient allergen detail.
-- Matches each recipe's ingredient names against the canonical_name lookup via ILIKE.
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

-- recipe_computed_tags: one row per recipe with aggregated allergen tags and diet flags.
-- Live view — recalculates automatically whenever ingredients change.
create or replace view recipe_computed_tags
with (security_invoker = true) as
with matched as (
  select distinct recipe_id, title, tag
  from recipe_ingredient_tags,
       unnest(tags) as tag
)
select
  r.id as recipe_id,
  r.title,
  coalesce(
    array_agg(distinct m.tag) filter (where m.tag is not null),
    '{}'::text[]
  ) as allergen_tags,
  not exists (
    select 1 from matched m2
    where m2.recipe_id = r.id
      and m2.tag in ('meat','fish','shellfish','dairy','egg')
  ) as is_vegan,
  not exists (
    select 1 from matched m2
    where m2.recipe_id = r.id
      and m2.tag in ('meat','fish','shellfish')
  ) as is_vegetarian,
  not exists (
    select 1 from matched m2
    where m2.recipe_id = r.id
      and m2.tag = 'meat'
  ) as is_pescatarian_or_better
from recipes r
left join matched m on m.recipe_id = r.id
group by r.id, r.title;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Note the `(select auth.uid())` form: wrapping it in a subquery lets Postgres
-- evaluate it once per statement instead of once per row (see commit 002527b).

alter table recipes            enable row level security;
alter table shopping_list      enable row level security;
alter table cook_log           enable row level security;
alter table user_preferences   enable row level security;
alter table meal_groups        enable row level security;
alter table collections        enable row level security;
alter table collection_recipes enable row level security;
alter table ingredient_tags    enable row level security;

create policy "Users manage their own recipes" on recipes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own shopping list" on shopping_list
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own cook log" on cook_log
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own preferences" on user_preferences
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own meal groups" on meal_groups
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "users_own_collections" on collections
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "users_own_collection_recipes" on collection_recipes
  for all
  using (collection_id in (select id from collections where user_id = (select auth.uid())))
  with check (collection_id in (select id from collections where user_id = (select auth.uid())));

-- ingredient_tags is the shared dictionary described above: every signed-in user
-- can read it and correct it, and corrections apply instance-wide. If you deploy
-- an instance with users who should not be able to edit it, drop the write policy
-- and curate the table yourself.
create policy "Authenticated users can read ingredient_tags" on ingredient_tags
  for select to authenticated using (true);

create policy "Authenticated users can write ingredient_tags" on ingredient_tags
  for all to authenticated using (true) with check (true);
