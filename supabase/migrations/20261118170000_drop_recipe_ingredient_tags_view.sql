-- recipe_ingredient_tags was a debugging view that nothing in the app reads;
-- recipe_computed_tags (a table filled by triggers) replaced it.
drop view if exists recipe_ingredient_tags;
