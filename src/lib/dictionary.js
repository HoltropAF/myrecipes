// The allergen dictionary as one person sees it: the shared list
// (ingredient_tags, kept by dictionary editors) with that person's own words
// and overrides (my_ingredient_tags) on top. Editors write to the shared list;
// everyone else writes to their own layer, which only changes the labels on
// their own recipes (the database applies the same rule when it computes tags).

import { supabase, escapeLike } from './supabase.js'
import { mergeDictionary } from './dictionaryMerge.js'

export { mergeDictionary }

let editorCheck = null

/** Whether the signed-in person may change the shared list. Asked once per session. */
export function canEditDictionary() {
  if (!editorCheck) {
    editorCheck = supabase.rpc('can_edit_dictionary').then(({ data, error }) => !error && data === true)
  }
  return editorCheck
}

/** The whole dictionary for the Settings screen. */
export async function loadDictionary() {
  const [shared, mine] = await Promise.all([
    supabase.from('ingredient_tags').select('id, canonical_name, tags, reviewed').order('canonical_name'),
    supabase.from('my_ingredient_tags').select('canonical_name, tags'),
  ])
  if (shared.error) return { rows: [], error: shared.error }
  // A copy that has not run the newest setup script has no personal table yet;
  // carry on with the shared list alone.
  return { rows: mergeDictionary(shared.data || [], mine.error ? [] : mine.data || []), error: null }
}

/** One word, as the wizard's tag editor needs it. Unknown words come back empty. */
export async function lookupWord(name) {
  const key = name.trim().toLowerCase()
  const [shared, mine] = await Promise.all([
    supabase.from('ingredient_tags').select('id, canonical_name, tags, reviewed').ilike('canonical_name', escapeLike(key)).maybeSingle(),
    supabase.from('my_ingredient_tags').select('canonical_name, tags').eq('canonical_name', key).maybeSingle(),
  ])
  const [row] = mergeDictionary(shared.data ? [shared.data] : [], mine.data ? [mine.data] : [])
  return row || { key, id: null, canonical_name: key, tags: [], reviewed: false, sharedTags: null, mine: false, inShared: false }
}

/** Save the tags for a word. Returns { row, error } with the row as it now is. */
export async function saveWordTags(row, tags, isEditor) {
  if (isEditor) {
    const result = row.id
      ? await supabase.from('ingredient_tags').update({ tags, reviewed: true }).eq('id', row.id).select('id').single()
      : await supabase.from('ingredient_tags').insert({ canonical_name: row.key, tags, reviewed: true }).select('id').single()
    if (result.error) return { row, error: result.error }
    return { row: { ...row, id: result.data.id, tags, reviewed: true, sharedTags: tags, inShared: true }, error: null }
  }
  const { error } = await supabase
    .from('my_ingredient_tags')
    .upsert({ canonical_name: row.key, tags, updated_at: new Date().toISOString() }, { onConflict: 'user_id,canonical_name' })
  if (error) return { row, error }
  return { row: { ...row, tags, reviewed: true, mine: true }, error: null }
}

/** Add a new word: to the shared list for editors, to your own list for everyone else. */
export async function addWord(name, isEditor) {
  const key = name.trim().toLowerCase()
  if (isEditor) {
    const { data, error } = await supabase.from('ingredient_tags')
      .insert({ canonical_name: key, tags: [], reviewed: false }).select('id, canonical_name, tags, reviewed').single()
    if (error) return { row: null, error }
    return { row: mergeDictionary([data])[0], error: null }
  }
  const { error } = await supabase.from('my_ingredient_tags').upsert({ canonical_name: key, tags: [] }, { onConflict: 'user_id,canonical_name' })
  if (error) return { row: null, error }
  return { row: mergeDictionary([], [{ canonical_name: key, tags: [] }])[0], error: null }
}

/**
 * Remove a word. Your own tags are always removable (a shared word then falls
 * back to the shared tags); a shared word itself only by an editor.
 * Returns { row, error }: the row as it now is, or null when it is gone.
 */
export async function removeWord(row, isEditor) {
  if (row.mine) {
    const { error } = await supabase.from('my_ingredient_tags').delete().eq('canonical_name', row.key)
    if (error) return { row, error }
    if (!row.inShared) return { row: null, error: null }
    return { row: { ...row, tags: row.sharedTags || [], mine: false }, error: null }
  }
  if (!isEditor || !row.id) return { row, error: { code: '42501' } }
  const { error } = await supabase.from('ingredient_tags').delete().eq('id', row.id)
  return error ? { row, error } : { row: null, error: null }
}
