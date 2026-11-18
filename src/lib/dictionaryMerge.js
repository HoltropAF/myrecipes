// Merging the shared allergen dictionary with one person's own words, kept
// apart from dictionary.js so it can be tested without a Supabase client.

/**
 * Merge shared rows and personal rows into one list, one row per word.
 * Each row: { key, id, canonical_name, tags, reviewed, sharedTags, mine, inShared }
 * - `mine`: the person has their own tags for this word (an override or a new word)
 * - `inShared`: the word is also on the shared list (`sharedTags` holds its tags)
 */
export function mergeDictionary(shared = [], mine = []) {
  const byKey = new Map()
  for (const row of shared) {
    const key = row.canonical_name.toLowerCase()
    byKey.set(key, {
      key, id: row.id, canonical_name: row.canonical_name, tags: row.tags || [],
      reviewed: !!row.reviewed, sharedTags: row.tags || [], mine: false, inShared: true,
    })
  }
  for (const row of mine) {
    const key = row.canonical_name.toLowerCase()
    const base = byKey.get(key)
    byKey.set(key, {
      key, id: base?.id ?? null, canonical_name: base?.canonical_name ?? row.canonical_name,
      tags: row.tags || [], reviewed: true, sharedTags: base?.sharedTags ?? null,
      mine: true, inShared: !!base,
    })
  }
  return [...byKey.values()].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name))
}
