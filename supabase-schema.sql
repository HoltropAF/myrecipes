-- myrecipes initial schema

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  tagline text,              -- short subtitle, e.g. "Creamy pasta met boursin"
  category text,             -- top-level folder, e.g. "Desserts"
  subcategory text,          -- subfolder, e.g. "Cakes"
  servings int,
  total_minutes int,         -- single rough time estimate (no prep/cook split in source docs)
  ingredients jsonb not null default '[]',  -- grouped: [{group, items:[{id,name,amount,unit}]}]
  steps jsonb not null default '[]',        -- sectioned: [{group, items:[{id,content,timer_seconds}]}]
  variants jsonb not null default '[]',     -- alternate full versions: [{id,label,ingredients,steps}]
  notes text,
  photo_url text,
  source text,                -- e.g. "imported from Canva", url, or freetext
  -- Nutrition: TOTAL for whole recipe; per-serving computed in app (total / servings)
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  nutrition_is_estimate boolean not null default true,  -- false once user edits/confirms manually
  -- Wishlist: "want to try", independent of cook_log history
  wishlist boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shopping list: individual line items, optionally linked to a recipe.
-- Smart merging of same-name items happens in the app at display time.
create table if not exists shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,  -- null = manually added item
  name text not null,
  amount numeric,
  unit text,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cook log: each time a recipe is cooked (like settracker's concert entries)
create table if not exists cook_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  cooked_date date not null default current_date,
  thumbs text check (thumbs in ('up','down')),  -- nullable: cooked but not rated yet
  notes text,
  variant_label text,   -- which variant was cooked, if applicable
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table recipes enable row level security;
alter table shopping_list enable row level security;
alter table cook_log enable row level security;

create policy "Users manage their own recipes"
  on recipes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own shopping list"
  on shopping_list for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own cook log"
  on cook_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_recipes_user on recipes(user_id);
create index if not exists idx_recipes_category on recipes(category);
create index if not exists idx_shopping_list_user on shopping_list(user_id);
create index if not exists idx_cook_log_user_recipe on cook_log(user_id, recipe_id);
create index if not exists idx_cook_log_date on cook_log(user_id, cooked_date);
