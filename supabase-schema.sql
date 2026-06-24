-- myrecipes — full database schema
-- Run this against a fresh Supabase project to set up all tables, views, and policies.
-- If adding to an existing project, scroll to the bottom for ALTER TABLE migration snippets.

-- ============================================================
-- CORE TABLES
-- ============================================================

-- recipes: one row per recipe, all structured data stored as JSONB columns.
create table if not exists recipes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade,
  title                 text not null,
  tagline               text,                    -- short subtitle, e.g. "Creamy pasta met boursin"
  category              text,                    -- top-level folder, e.g. "Main dishes"
  subcategory           text,                    -- subfolder, e.g. "Weeknight"
  servings              int,
  total_minutes         int,
  tags                  text[] not null default '{}',   -- user-defined labels, e.g. ["quick","freezes well"]
  ingredients           jsonb not null default '[]',
    -- grouped structure: [{group: string|null, items: [{id, name, amount, unit, note}]}]
    -- note: optional per-ingredient text hint, e.g. "Bij voorkeur Unox rookworst"
  steps                 jsonb not null default '[]',
    -- sectioned: [{group: string|null, items: [{id, content, timer_seconds}]}]
  variants              jsonb not null default '[]',
    -- alternate full versions: [{id, label, ingredients, steps}]
  notes                 text,                    -- freeform storage/prep notes shown on Notes tab
  photo_url             text,
  source                text,                    -- e.g. URL, "imported from Canva", or freetext
  freezer_friendly      boolean,                 -- true = freezes well, false = not recommended, null = unknown
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- shopping_list: individual line items, optionally linked to a recipe.
-- Smart merging of same-name items happens in the app at display time.
create table if not exists shopping_list (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  recipe_id  uuid references recipes(id) on delete set null,  -- null = manually added item
  name       text not null,
  amount     numeric,
  unit       text,
  checked    boolean not null default false,
  created_at timestamptz not null default now()
);

-- cook_log: each time a recipe is made. One entry per cook session.
create table if not exists cook_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  recipe_id    uuid references recipes(id) on delete cascade,
  cooked_date  date not null default current_date,
  thumbs       text check (thumbs in ('up','down')),  -- nullable = logged but not rated
  notes        text,
  variant_label text,          -- which variant was cooked, if any
  created_at   timestamptz not null default now()
);

-- user_preferences: per-user settings, one row per user.
create table if not exists user_preferences (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  unit_system       text not null default 'metric' check (unit_system in ('metric', 'us')),
  theme             text not null default 'auto' check (theme in ('light', 'dark', 'auto')),
  default_category  text,                  -- which cookbook category opens automatically
  recipe_view_mode  text not null default 'folders' check (recipe_view_mode in ('folders', 'list')),
  recipe_search_mode text not null default 'title' check (recipe_search_mode in ('title', 'ingredient')),
  compact_mode      boolean not null default false,
  updated_at        timestamptz not null default now()
);

-- meal_groups: user-curated bundles of recipes that go well together.
create table if not exists meal_groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  notes      text,
  recipe_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- ALLERGEN / DIET CLASSIFICATION
-- ============================================================

-- ingredient_tags: canonical ingredient names with allergen and diet classification tags.
-- Allowed tag values: meat, fish, shellfish, dairy, gluten, egg, nuts
-- This table is a shared lookup — populated manually or by an admin/AI process.
-- Example rows:
--   ('rundvlees', '{meat}')
--   ('kipfilet', '{meat}')
--   ('zalm', '{fish}')
--   ('mozzarella', '{dairy}')
--   ('pasta', '{gluten}')
--   ('ei', '{egg}')
--   ('amandelen', '{nuts}')
create table if not exists ingredient_tags (
  canonical_name text primary key,
  tags           text[] not null default '{}'
);

-- ============================================================
-- COMPUTED VIEWS
-- ============================================================

-- recipe_ingredient_tags: per-ingredient allergen detail.
-- Matches each recipe's ingredient names against the canonical_name lookup via ILIKE.
-- Use this view for debugging or granular per-ingredient display.
create or replace view recipe_ingredient_tags as
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
-- This is a live view — it recalculates automatically whenever ingredients change.
-- Query: SELECT * FROM recipe_computed_tags WHERE recipe_id = $id
create or replace view recipe_computed_tags as
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

alter table recipes          enable row level security;
alter table shopping_list    enable row level security;
alter table cook_log         enable row level security;
alter table user_preferences enable row level security;
alter table meal_groups      enable row level security;
alter table ingredient_tags  enable row level security;

create policy "Users manage their own recipes"
  on recipes for all
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own shopping list"
  on shopping_list for all
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own cook log"
  on cook_log for all
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own preferences"
  on user_preferences for all
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own meal groups"
  on meal_groups for all
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ingredient_tags is a shared lookup table — all authenticated users can read it.
create policy "Authenticated users can read ingredient_tags"
  on ingredient_tags for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_recipes_user            on recipes(user_id);
create index if not exists idx_recipes_category        on recipes(category);
create index if not exists idx_shopping_list_user      on shopping_list(user_id);
create index if not exists idx_shopping_list_recipe    on shopping_list(recipe_id);
create index if not exists idx_cook_log_user_recipe    on cook_log(user_id, recipe_id);
create index if not exists idx_cook_log_recipe         on cook_log(recipe_id);
create index if not exists idx_cook_log_date           on cook_log(user_id, cooked_date);
create index if not exists idx_meal_groups_user        on meal_groups(user_id);

-- ============================================================
-- MIGRATION — adding to an existing project
-- ============================================================
-- If you already have a project running an older version of the schema,
-- run just the relevant lines below instead of the full file above.

-- Add tags column to recipes (if missing):
-- alter table recipes add column if not exists tags text[] not null default '{}';

-- Add new user preference columns (if missing):
-- alter table user_preferences add column if not exists recipe_view_mode  text not null default 'folders';
-- alter table user_preferences add column if not exists recipe_search_mode text not null default 'title';
-- alter table user_preferences add column if not exists compact_mode      boolean not null default false;

-- Create ingredient_tags + views (if missing):
-- (copy the CREATE TABLE and CREATE VIEW blocks from above)
