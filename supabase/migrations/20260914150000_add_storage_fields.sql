-- StorageTab.jsx and the recipe wizard's extras step both read/write these,
-- but the columns were never actually created, so saving failed with
-- "Could not find the 'fridge_storage' column of 'recipes' in the schema cache".
alter table recipes
  add column if not exists fridge_storage text,
  add column if not exists reheat_instructions text,
  add column if not exists prep_ahead text;
