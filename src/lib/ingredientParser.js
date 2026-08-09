// Parses pasted ingredient text (one per line) into structured rows.
// Handles: "300g kip", "2 uien", "1 blok boursin", "zout naar smaak" (no amount)

const UNIT_WORDS = [
  'g', 'gram', 'gr', 'kg', 'kilo',
  'ml', 'l', 'liter',
  'tl', 'el', 'eetlepel', 'theelepel',
  'kop', 'kopjes', 'blik', 'blikje', 'pak', 'pakje', 'zakje', 'bakje', 'potje', 'blok',
  'teentje', 'teentjes', 'teen', 'tenen',
  'stuk', 'stuks', 'stengel', 'stengels',
  'snufje', 'scheutje', 'scheut',
  'tsp', 'tbsp', 'cup', 'cups', 'oz', 'lb',
]

const unitPattern = new RegExp(`^(${UNIT_WORDS.join('|')})\\b\\.?`, 'i')

let idCounter = 0
const nextId = () => `ing_${Date.now()}_${idCounter++}`

/**
 * Parse a single ingredient line into { id, amount, unit, name }
 * amount/unit are null if not detected (freeform line like "zout naar smaak")
 */
export function parseIngredientLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return null

  // A quantity is a mixed number ("1 1/2"), a fraction ("1/2"), or a decimal
  // ("1", "1.5", "1,5"). Optionally followed by a range end ("2-3", "1/2-1").
  const QUANTITY = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?`
  const numMatch = trimmed.match(
    new RegExp(String.raw`^(${QUANTITY})(?:\s*[-–—]\s*(${QUANTITY}))?\s*(.*)$`)
  )

  if (!numMatch) {
    // No leading number at all — freeform line, e.g. "zout naar smaak", "peper"
    return { id: nextId(), amount: null, unit: null, name: trimmed }
  }

  const [, rawLow, rawHigh, remainder] = numMatch
  let rest = remainder.trim()

  const low = parseQuantity(rawLow)
  const high = rawHigh ? parseQuantity(rawHigh) : null

  let amount = low
  let note = null
  if (high !== null && low !== null) {
    // Scaling needs a single number, so store the midpoint — but keep the range
    // the user actually wrote as a note instead of silently discarding it.
    amount = (low + high) / 2
    note = `${rawLow}–${rawHigh}`
  }
  if (!Number.isFinite(amount)) amount = null

  // Try to detect a unit word at the start of the rest
  const unitMatch = rest.match(unitPattern)
  let unit = null
  if (unitMatch) {
    unit = normalizeUnit(unitMatch[1])
    rest = rest.slice(unitMatch[0].length).trim()
  }

  const row = { id: nextId(), amount, unit, name: rest || trimmed }
  if (note) row.note = note
  return row
}

// "1 1/2" -> 1.5, "3/4" -> 0.75, "1,5" -> 1.5. Returns null if unparseable.
function parseQuantity(raw) {
  if (!raw) return null
  const text = raw.trim().replace(',', '.')
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    const [, whole, num, den] = mixed.map(Number)
    return den ? whole + num / den : whole
  }
  const fraction = text.match(/^(\d+)\/(\d+)$/)
  if (fraction) {
    const [, num, den] = fraction.map(Number)
    return den ? num / den : null
  }
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

function normalizeUnit(raw) {
  const u = raw.toLowerCase()
  const map = {
    gram: 'g', gr: 'g',
    kilo: 'kg',
    liter: 'l',
    eetlepel: 'el', theelepel: 'tl',
    kopjes: 'kop',
    cups: 'cup', tsps: 'tsp', tbsps: 'tbsp',
    blikje: 'blik', pakje: 'pak', zakje: 'zak', bakje: 'bak', potje: 'pot',
    teentje: 'teen', teentjes: 'teen', tenen: 'teen',
    stuks: 'stuk', stengels: 'stengel',
    scheutje: 'scheut',
  }
  return map[u] || u
}

/** Parse a full pasted block (one ingredient per line) into an array of rows */
export function parseIngredientBlock(text) {
  return text
    .split('\n')
    .map(parseIngredientLine)
    .filter(Boolean)
}

/** Format a row back to a display string, e.g. for editing/preview */
export function formatIngredientRow({ amount, unit, name }) {
  const parts = []
  const formatted = formatAmount(amount)
  if (formatted) parts.push(formatted)
  if (unit) parts.push(unit)
  parts.push(name)
  return parts.join(' ')
}

/**
 * Render an amount for display. Single source of truth so the same 0.75 doesn't
 * appear as "0.8" on one screen and "0.75" on another.
 */
export function formatAmount(value) {
  if (value === null || value === undefined || value === '') return ''
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) return String(value)
  if (Number.isInteger(amount)) return String(amount)
  return String(Math.round(amount * 100) / 100)
}

/** Scale an amount by a servings ratio, used for the adjustable-servings feature */
export function scaleAmount(amount, fromServings, toServings) {
  if (amount === null || amount === undefined || !fromServings) return amount
  return amount * (toServings / fromServings)
}

/**
 * Normalize an ingredient name for cross-recipe comparison (shopping list merging,
 * meal-prep pairing suggestions). Strips descriptors, prep instructions, and singularizes
 * common plurals while protecting words that are already singular and just happen to end
 * in 's' (e.g. "kaas", "ananas" — stripping would give the wrong result for short Dutch words).
 */
export function normalizeName(name) {
  let n = name.toLowerCase()
  // Drop parenthetical asides entirely, e.g. "(approx 1/4 of a cabbage)"
  n = n.replace(/\(.*?\)/g, '')
  // Drop everything after the first comma — this is almost always prep instruction
  // ("garlic cloves, finely chopped" -> "garlic cloves", "ui, gesnipperd" -> "ui")
  n = n.split(',')[0]
  // Strip common size/freshness/prep descriptor words anywhere in the remaining phrase
  n = n.replace(/\b(rode?|witte?|grote?|kleine?|middelgrote?|fijne?|verse?|gedroogde?|fresh|finely|chopped|diced|sliced|minced|grated|peeled|cooked|raw|whole|large|small|medium)\b/g, '')
  // Strip a trailing counting-noun like "cloves" once the modifier words are gone
  // ("garlic cloves" -> "garlic")
  n = n.replace(/\b(cloves?|leaves?|sprigs?|stalks?)\b\s*$/g, '')
  n = n.replace(/[.]/g, '').trim().replace(/\s+/g, ' ')
  if (n.length > 4) {
    if (/[^aeiou]oes$/.test(n)) n = n.slice(0, -2)       // tomatoes -> tomato, potatoes -> potato
    else if (/[a-z]s$/.test(n) && !/[aeiou]s$/.test(n)) n = n.slice(0, -1) // onions -> onion, eggs -> egg
  }
  return n
}
