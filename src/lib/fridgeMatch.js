import { normalizeName } from './ingredientParser'
import { isAlwaysStocked } from './aisles'

// Ranking recipes by how close you are to being able to cook them.
//
// The old scoring counted how many of your ingredients a recipe used, which
// rewarded long recipes: a recipe needing twenty things scored well for
// containing onion. What you actually want to know at 18:00 is the opposite —
// what is *missing*.
//
// Pantry staples are excluded from "missing" because nobody is blocked on salt,
// and counting them would make almost every recipe look two items away.

/** The ingredients of a recipe that a shopper would actually have to have. */
export function significantIngredients(recipe) {
  const seen = new Map()
  for (const group of recipe.ingredients || []) {
    for (const item of group.items || []) {
      const raw = (item?.name || '').trim()
      if (!raw) continue
      const key = normalizeName(raw)
      if (!key || key.length < 2) continue
      if (isAlwaysStocked(key)) continue
      if (!seen.has(key)) seen.set(key, raw)
    }
  }
  return [...seen.entries()].map(([key, label]) => ({ key, label }))
}

/**
 * Does having `have` mean you have `ingredientKey`?
 *
 * Prefix matching on word tokens, not raw substring. Substring matching in both
 * directions looked convenient and was wrong: "prei" contains "ei", so owning
 * leeks convinced the app you had eggs. Prefixes still handle the Dutch
 * compounds that matter — "kip" covers "kipfilet" — while a suffix collision
 * like ei/prei no longer counts.
 *
 * Short terms (under three characters) must match exactly, since a two-letter
 * prefix matches far too much.
 */
export function covers(have, ingredientKey) {
  if (have === ingredientKey) return true
  for (const token of ingredientKey.split(/\s+/)) {
    if (token === have) return true
    if (have.length >= 3 && token.startsWith(have)) return true
    if (token.length >= 3 && have.startsWith(token)) return true
  }
  return false
}

/**
 * Bucket recipes by how many significant ingredients are missing.
 *
 * Returns { makeable, missingOne, missingTwo }, each newest-first within the
 * bucket and capped, plus the missing labels so the UI can name them — "you're
 * one mango away" is far more useful than a score.
 */
export function rankByFridge(recipes, haveList, { limitPerBucket = 6 } = {}) {
  const haves = haveList.filter(Boolean)
  if (haves.length === 0) return { makeable: [], missingOne: [], missingTwo: [] }

  const scored = []
  for (const recipe of recipes) {
    const needed = significantIngredients(recipe)
    if (needed.length === 0) continue

    const missing = needed.filter(ing => !haves.some(have => covers(have, ing.key)))
    const matched = needed.length - missing.length
    // A recipe you happen to share nothing with isn't "two away", it's unrelated.
    if (matched === 0) continue

    scored.push({
      recipe,
      matched,
      total: needed.length,
      missing: missing.map(ing => ing.label),
    })
  }

  // Fewer missing first; then more overlap; then the shorter recipe, since
  // among equals the simpler one is the better suggestion.
  const order = (a, b) =>
    a.missing.length - b.missing.length ||
    b.matched - a.matched ||
    a.total - b.total

  const bucket = (n) => scored.filter(s => s.missing.length === n).sort(order).slice(0, limitPerBucket)

  return { makeable: bucket(0), missingOne: bucket(1), missingTwo: bucket(2) }
}

/** Split the raw input box into normalised, de-duplicated search terms. */
export function parseHaveList(input) {
  const out = []
  for (const chunk of String(input || '').split(/[,\n]/)) {
    const key = normalizeName(chunk.trim())
    // normalizeName strips descriptors outright, so "verse" becomes "" — and an
    // empty needle matches every recipe.
    if (key && key.length > 1 && !out.includes(key)) out.push(key)
  }
  return out
}
