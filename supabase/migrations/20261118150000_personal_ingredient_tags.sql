-- Personal allergen words on top of the shared dictionary.
--
-- The shared ingredient_tags list is now kept by its editors only (adding a
-- word included). Everyone else gets their own layer, my_ingredient_tags: words
-- they add, or their own tags for a shared word. A person's layer only affects
-- the labels on their own recipes, and the app tells them those labels are
-- their own responsibility.

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

-- Shared list: adding a word now also needs an editor.
drop trigger if exists trg_guard_dictionary_edit on ingredient_tags;
create trigger trg_guard_dictionary_edit
  before insert or update or delete on ingredient_tags
  for each row execute function guard_dictionary_edit();

-- A recipe's tags come from its owner's own words first, then the shared list
-- for every word the owner has not overridden.
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

-- Recompute the recipes containing `p_word`, optionally only one person's.
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
