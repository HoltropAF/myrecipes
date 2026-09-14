-- recipe_computed_tags started life as a live view (created outside this
-- migration history) that recomputed a regex match between every ingredient
-- of every recipe and the entire ingredient_tags dictionary on every single
-- read. With enough recipes and dictionary entries that exceeded the
-- authenticated role's 8s statement_timeout on every request, so the app
-- silently got zero allergen/diet tags back every time it loaded.
--
-- Replaced with a real table, computed once per recipe and refreshed only
-- when something that could change the answer actually changes: the
-- recipe's ingredients, or the ingredient_tags dictionary itself.

create table if not exists recipe_computed_tags (
  recipe_id uuid primary key references recipes(id) on delete cascade,
  allergen_tags text[] not null default '{}',
  is_vegan boolean not null default false,
  is_vegetarian boolean not null default false,
  is_pescatarian_or_better boolean not null default false
);

alter table recipe_computed_tags enable row level security;

drop policy if exists "Users read their own recipe tags" on recipe_computed_tags;
create policy "Users read their own recipe tags" on recipe_computed_tags
  for select using (exists (
    select 1 from recipes r where r.id = recipe_computed_tags.recipe_id and r.user_id = (select auth.uid())
  ));

grant select on recipe_computed_tags to authenticated, anon;

create or replace function recompute_recipe_tags(p_recipe_id uuid) returns void
language plpgsql as $$
declare
  v_tags text[];
begin
  select coalesce(array_agg(distinct tag.tag), '{}')
  into v_tags
  from recipes r
    cross join lateral jsonb_array_elements(r.ingredients) grp(value)
    cross join lateral jsonb_array_elements(grp.value -> 'items') item(value)
    join ingredient_tags it on lower(item.value ->> 'name') ~ (
      '\m' || regexp_replace(it.canonical_name, '([.\\+*?()|\[\]{}^$])', '\\\1', 'g') || '\M'
    )
    cross join lateral unnest(it.tags) tag(tag)
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

-- The dictionary is shared across all recipes, so a single change there can
-- affect any of them - recompute everything, not just one row.
create or replace function recompute_all_recipe_tags() returns trigger
language plpgsql as $$
begin
  perform recompute_recipe_tags(id) from recipes;
  return null;
end;
$$;

drop trigger if exists trg_recompute_all_on_dictionary_change on ingredient_tags;
create trigger trg_recompute_all_on_dictionary_change
  after insert or update or delete on ingredient_tags
  for each statement execute function recompute_all_recipe_tags();
