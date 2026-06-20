-- myrecipes initial schema

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  category text,            -- top-level folder, e.g. "Desserts"
  subcategory text,         -- subfolder, e.g. "Cakes"
  servings int,
  prep_minutes int,
  cook_minutes int,
  ingredients jsonb not null default '[]',   -- [{id, name, amount, unit}]
  steps jsonb not null default '[]',         -- [{id, title, content, timer_seconds}]
  notes text,
  photo_url text,
  source text,               -- e.g. "imported from Canva", url, or freetext
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meal_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  planned_date date not null,
  meal_slot text,            -- breakfast/lunch/dinner/snack
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table recipes enable row level security;
alter table meal_plan enable row level security;

create policy "Users manage their own recipes"
  on recipes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own meal plan"
  on meal_plan for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_recipes_user on recipes(user_id);
create index if not exists idx_recipes_category on recipes(category);
create index if not exists idx_meal_plan_user_date on meal_plan(user_id, planned_date);
