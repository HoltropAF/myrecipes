-- Two changes to the shared ingredient dictionary (ingredient_tags).
--
-- 1. Who may change it. Every signed-in user could rewrite or delete any entry,
--    which on a shared instance means one careless edit changes the allergen
--    labels for everyone. Now anyone may still ADD a new word, but changing or
--    deleting an existing entry is limited to the people listed in
--    dictionary_editors. While that list is empty everyone stays an editor, so
--    a fresh self-hosted copy behaves exactly as before until its owner adds
--    themselves:  insert into dictionary_editors (user_id) values ('<your id>');
--    Edits made from the SQL editor (no signed-in user) are always allowed.
--
-- 2. What a change recomputes. The old statement-level trigger recomputed the
--    tags of every recipe of every user on each dictionary edit. Now a row-level
--    trigger recomputes only recipes with an ingredient that contains the word
--    that was added, changed or removed.

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
  before update or delete on ingredient_tags
  for each row execute function guard_dictionary_edit();

-- Recompute the recipes whose ingredient names contain `p_word` as a whole word
-- (the same match recompute_recipe_tags uses).
create or replace function recompute_recipe_tags_for_word(p_word text) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pattern text := '\m' || regexp_replace(lower(p_word), '([.\\+*?()|\[\]{}^$])', '\\\1', 'g') || '\M';
begin
  perform recompute_recipe_tags(r.id)
  from recipes r
  where exists (
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
