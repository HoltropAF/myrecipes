import { significantIngredients, covers } from './fridgeMatch'
import { daysBetween, toLocalISO } from './dateUtils'

// Deciding, not browsing.
//
// With around sixty recipes you can read the whole cookbook in two minutes, so
// hierarchy is not the thing that's missing — picking is. Both entry points here
// answer "what am I making tonight" instead of "where is it filed".

// "Household" holds an all-purpose cleaner, not dinner. Any suggestion that
// could put it in front of someone at 18:00 is a bug, not an edge case.
const NON_FOOD_CATEGORIES = new Set(['Household'])

// Recently cooked things are exactly what you don't need suggesting.
const RECENTLY_COOKED_DAYS = 14

function isSuggestable(recipe) {
  return !!recipe && !NON_FOOD_CATEGORIES.has(recipe.category)
}

/** Recipes whose significant ingredients cover every term the user typed. */
export function filterByIngredients(recipes, haveList) {
  if (!haveList || haveList.length === 0) return recipes
  return recipes.filter(recipe => {
    const needed = significantIngredients(recipe).map(i => i.key)
    if (needed.length === 0) return false
    // Every term must appear — with one or two terms this reads as "using
    // these", which is what the box asks for.
    return haveList.every(have => needed.some(key => covers(have, key)))
  })
}

/**
 * A random pick, optionally narrowed.
 *
 * `exclude` keeps a repeated tap from landing on the same recipe twice, which
 * makes the shuffle feel broken even when it is behaving correctly.
 */
export function shufflePick(recipes, { haveList = [], exclude = null } = {}) {
  let pool = recipes.filter(isSuggestable)
  const narrowed = filterByIngredients(pool, haveList)
  // If the ingredients match nothing, say so rather than silently ignoring them.
  if (haveList.length > 0 && narrowed.length === 0) return { recipe: null, noMatch: true }
  pool = narrowed
  if (pool.length === 0) return { recipe: null, noMatch: false }
  if (pool.length > 1 && exclude) {
    const without = pool.filter(r => r.id !== exclude)
    if (without.length > 0) pool = without
  }
  return { recipe: pool[Math.floor(Math.random() * pool.length)], noMatch: false }
}

// Which categories suit the time of day. Deliberately soft — a preference that
// nudges the ranking, never a filter that hides things.
function preferredCategories(hour) {
  if (hour < 11) return ['Breakfast & Brunch']
  if (hour < 15) return ['Breakfast & Brunch', 'Salads', 'Soups', 'Sides']
  if (hour < 22) return ['Main dishes']
  return ['Appetizers & Snacks', 'Desserts']
}

/**
 * One suggestion for right now, from the clock and the cook log.
 *
 * Scored rather than filtered, so a small cookbook always produces something.
 * `reason` comes back with it because a suggestion you can't account for reads
 * as random — "you liked this and haven't made it since May" is the part that
 * makes it persuasive.
 */
export function suggestForNow(recipes, cookStats = {}, now = new Date()) {
  const pool = recipes.filter(isSuggestable)
  if (pool.length === 0) return null

  const hour = now.getHours()
  const day = now.getDay()
  const isWeeknight = day >= 1 && day <= 4
  const wantQuick = isWeeknight || hour >= 20
  const preferred = preferredCategories(hour)

  // Measured against the `now` we were handed, not the real clock — otherwise
  // the function silently disagrees with its own parameter and is untestable.
  const todayISO = toLocalISO(now)

  const scored = pool.map(recipe => {
    const stat = cookStats[recipe.id] || {}
    const daysSince = stat.lastCooked ? daysBetween(stat.lastCooked, todayISO) : null
    let score = 0
    const reasons = []

    // Weighted high on purpose: at 08:00 the time of day should beat a
    // well-liked dinner, or the suggestion stops being about now.
    if (preferred.includes(recipe.category)) score += 6

    if (wantQuick && recipe.total_minutes && recipe.total_minutes <= 40) {
      score += 2
      reasons.push({ key: 'quick', value: recipe.total_minutes })
    }
    if (recipe.total_minutes && recipe.total_minutes > 90) score -= 2

    const liked = (stat.up || 0) > (stat.down || 0)
    if (liked) {
      score += 2
      reasons.push({ key: 'liked', value: stat.up })
    }
    if ((stat.down || 0) > (stat.up || 0)) score -= 3

    if (daysSince === null && (stat.count || 0) === 0) {
      // Never made. Worth surfacing, but not over something you know you like.
      score += 1
      reasons.push({ key: 'untried' })
    } else if (daysSince !== null) {
      if (daysSince < RECENTLY_COOKED_DAYS) score -= 4
      else if (daysSince > 90) {
        score += 2
        reasons.push({ key: 'ages', value: daysSince })
      }
    }

    // Break ties randomly so the same recipe isn't the answer every evening.
    return { recipe, score: score + Math.random(), reasons }
  })

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  return { recipe: best.recipe, reasons: best.reasons.slice(0, 2) }
}

// Cooked again and again, and liked — a workable definition of "always makes me
// happy to cook" from data already in the log. Used as a stand-in until the user
// saves a real Dopamine Menu collection.
const DOPAMINE_MIN_COOKS = 2

export function deriveDopamineMenu(recipes, cookStats = {}, limit = 8) {
  return recipes
    .filter(isSuggestable)
    .map(recipe => {
      const stat = cookStats[recipe.id] || {}
      const up = stat.up || 0
      const down = stat.down || 0
      const count = stat.count || 0
      if (count < DOPAMINE_MIN_COOKS || up === 0 || down >= up) return null
      return { recipe, score: up * 2 + count, stat }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
