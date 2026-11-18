-- Security hardening (2026-11-18).
--
-- 1. The tag-recompute functions run with owner rights (security definer) and were
--    callable by anyone through /rest/v1/rpc, even without signing in. They leak
--    nothing, but recompute_recipe_tags_for_word(word, null) rescans every recipe,
--    so repeated calls could waste database time. Only the triggers need them.
--    The recipes trigger runs as the signed-in user, so it becomes security
--    definer itself; triggers fire regardless of EXECUTE rights.
-- 2. The recipe-photos bucket gets the same limits the app already checks in the
--    browser, so nobody can upload other file types or huge files through the API.

alter function public.recompute_recipe_tags_trigger() security definer set search_path = public;
alter function public.guard_dictionary_edit() set search_path = public;

revoke execute on function public.recompute_recipe_tags(uuid) from public, anon, authenticated;
revoke execute on function public.recompute_recipe_tags_for_word(text, uuid) from public, anon, authenticated;
revoke execute on function public.recompute_recipe_tags_trigger() from public, anon, authenticated;
revoke execute on function public.recompute_tags_on_dictionary_change() from public, anon, authenticated;
revoke execute on function public.recompute_tags_on_my_word_change() from public, anon, authenticated;
revoke execute on function public.guard_dictionary_edit() from public, anon, authenticated;
-- The app asks this one whether to show the dictionary editor; signed-in users only.
revoke execute on function public.can_edit_dictionary() from public, anon;
grant execute on function public.can_edit_dictionary() to authenticated;

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'recipe-photos';
