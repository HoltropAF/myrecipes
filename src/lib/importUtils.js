// Reading a backup file produced by exportFullBackup.
//
// The export has existed since the beginning with no way to read it back in,
// which made "Export a full backup" a promise the app could not keep. It also
// makes a "delete everything" option safe enough to offer.
//
// Two decisions worth stating:
//
//  * IDs from the file are preserved. Recipes are referenced by id from
//    cook_log, shopping_list, meal_groups.recipe_ids and collection_recipes,
//    so remapping them would mean rewriting five relationships and getting one
//    wrong silently orphans data. Keeping the ids means a restore into an empty
//    account is exact, and a merge is idempotent — importing the same file
//    twice changes nothing the second time.
//
//  * user_id is always rewritten to the importing user. A backup carries the
//    original owner's id, and RLS would reject every row otherwise.

export const IMPORT_TABLES = [
  'recipes', 'cook_log', 'shopping_list', 'meal_groups', 'collections', 'collection_recipes',
]

// Rows are inserted parents-first so foreign keys always resolve.
const INSERT_ORDER = [
  'recipes', 'collections', 'collection_recipes', 'cook_log', 'shopping_list', 'meal_groups',
]

// collection_recipes is a join table: it has no id and no user_id of its own,
// and is protected by a policy that checks the parent collection's owner.
const OWNED_BY_USER = new Set(['recipes', 'cook_log', 'shopping_list', 'meal_groups', 'collections'])

export class ImportError extends Error {}

/**
 * Parse and sanity-check a backup file. Throws ImportError with a message meant
 * to be shown to the user.
 */
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportError('That file isn\'t valid JSON. Pick a myrecipes backup file.')
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ImportError('That file doesn\'t look like a myrecipes backup.')
  }
  if (data.app && data.app !== 'myrecipes') {
    throw new ImportError(`That backup is from "${data.app}", not myrecipes.`)
  }
  if (!Array.isArray(data.recipes)) {
    throw new ImportError('That file has no recipes in it, so there is nothing to import.')
  }

  const counts = {}
  for (const table of IMPORT_TABLES) {
    counts[table] = Array.isArray(data[table]) ? data[table].length : 0
  }

  return {
    data,
    counts,
    exportedAt: typeof data.exported_at === 'string' ? data.exported_at : null,
    // Version 1 files predate collections; that's fine, they just import fewer tables.
    version: Number(data.version) || 1,
    hasPreferences: !!data.preferences,
  }
}

/** How many of the file's recipes aren't already in this account, by id and then by title. */
export function summariseAgainst(parsed, existingRecipes) {
  const byId = new Set(existingRecipes.map(r => r.id))
  const byTitle = new Set(existingRecipes.map(r => (r.title || '').trim().toLowerCase()))

  let newCount = 0
  let sameId = 0
  let sameTitle = 0
  for (const recipe of parsed.data.recipes) {
    if (recipe?.id && byId.has(recipe.id)) { sameId++; continue }
    if (byTitle.has((recipe?.title || '').trim().toLowerCase())) { sameTitle++; continue }
    newCount++
  }
  return { newCount, sameId, sameTitle, willDelete: existingRecipes.length - sameId }
}

function prepareRows(table, rows, userId) {
  return (rows || [])
    .filter(row => row && typeof row === 'object')
    .map(row => {
      const clean = { ...row }
      // Never trust a timestamp column the DB owns.
      delete clean.created_at_server
      if (OWNED_BY_USER.has(table)) clean.user_id = userId
      return clean
    })
}

/**
 * Write a parsed backup into the account.
 *
 * mode 'merge'   — upsert; existing rows with the same id are overwritten,
 *                  everything else is left alone.
 * mode 'replace' — delete this user's rows first, then insert. Destructive by
 *                  design, and the caller is expected to have said so clearly.
 *
 * onProgress(step, done, total) is called so the UI can show what's happening;
 * a large cookbook takes a few seconds.
 */
export async function importBackup(supabase, userId, parsed, { mode = 'merge', onProgress } = {}) {
  if (!userId) throw new ImportError('You need to be signed in to import a backup.')
  if (mode !== 'merge' && mode !== 'replace') throw new ImportError(`Unknown import mode "${mode}".`)

  const report = { inserted: {}, deleted: {}, mode }

  if (mode === 'replace') {
    // Children first so nothing is orphaned mid-way. recipes cascades to
    // cook_log and collection_recipes, but being explicit keeps the counts
    // honest and the order obvious.
    for (const table of ['shopping_list', 'meal_groups', 'cook_log', 'collections', 'recipes']) {
      onProgress?.(`clearing ${table}`, 0, 1)
      const { error, count } = await supabase
        .from(table).delete({ count: 'exact' }).eq('user_id', userId)
      if (error) throw new ImportError(`Could not clear ${table}: ${error.message}`)
      report.deleted[table] = count ?? 0
    }
  }

  for (const table of INSERT_ORDER) {
    const rows = prepareRows(table, parsed.data[table], userId)
    report.inserted[table] = 0
    if (rows.length === 0) continue

    // Chunked so a big cookbook doesn't hit the request size limit.
    const CHUNK = 100
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK)
      onProgress?.(table, i, rows.length)
      const query = supabase.from(table)
      const { error } = mode === 'merge'
        ? await query.upsert(slice, {
            onConflict: table === 'collection_recipes' ? 'collection_id,recipe_id' : 'id',
            ignoreDuplicates: false,
          })
        : await query.insert(slice)
      if (error) throw new ImportError(`Could not import ${table}: ${error.message}`)
      report.inserted[table] += slice.length
    }
    onProgress?.(table, rows.length, rows.length)
  }

  if (parsed.data.preferences && typeof parsed.data.preferences === 'object') {
    const prefs = { ...parsed.data.preferences, user_id: userId, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('user_preferences').upsert(prefs)
    // Preferences are the least important thing in the file — a failure here
    // must not make the user think their recipes didn't land.
    report.preferencesRestored = !error
  }

  return report
}
