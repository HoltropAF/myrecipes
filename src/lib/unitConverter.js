// Unit conversion between metric (g, ml, kg, l) and US customary (cups, oz, lb, tsp, tbsp).
// Conversions are approximate, using standard cooking conversion factors.

const METRIC_TO_US = {
  g: { factor: 0.035274, unit: 'oz' },
  kg: { factor: 2.20462, unit: 'lb' },
  ml: { factor: 0.00422675, unit: 'cup' },
  l: { factor: 4.22675, unit: 'cup' },
}

const US_TO_METRIC = {
  oz: { factor: 28.3495, unit: 'g' },
  lb: { factor: 453.592, unit: 'g' },
  cup: { factor: 236.588, unit: 'ml' },
  tsp: { factor: 4.92892, unit: 'ml' },
  tbsp: { factor: 14.7868, unit: 'ml' },
}

// Units that should never be converted (counts, descriptive units, Dutch volume words
// that don't map cleanly, etc.)
const UNCONVERTIBLE = new Set([
  'stuk', 'stuks', 'teen', 'el', 'tl', 'snufje', 'scheut', 'pot', 'pak', 'zak', 'blik', 'bak',
  'blok', 'stengel', 'kop',
])

export function convertIngredient(item, targetSystem) {
  // targetSystem: 'metric' | 'us'
  if (item.amount === null || item.amount === undefined || !item.unit) return item
  const unit = item.unit.toLowerCase()
  if (UNCONVERTIBLE.has(unit)) return item

  if (targetSystem === 'us' && METRIC_TO_US[unit]) {
    const { factor, unit: newUnit } = METRIC_TO_US[unit]
    return { ...item, amount: roundNice(item.amount * factor), unit: newUnit, _converted: true }
  }
  if (targetSystem === 'metric' && US_TO_METRIC[unit]) {
    const { factor, unit: newUnit } = US_TO_METRIC[unit]
    return { ...item, amount: roundNice(item.amount * factor), unit: newUnit, _converted: true }
  }
  return item
}

function roundNice(value) {
  if (value >= 100) return Math.round(value / 5) * 5 // round to nearest 5 for big numbers
  if (value >= 10) return Math.round(value)
  return Math.round(value * 4) / 4 // round to nearest quarter for small numbers (cups, oz)
}

// Convert oven temperatures mentioned in step text, e.g. "200°C" <-> "400°F", "180 graden" -> "356°F"
const CELSIUS_PATTERN = /(\d{2,3})\s*(?:°c|graden|degrees?\s*c)\b/gi
const FAHRENHEIT_PATTERN = /(\d{3})\s*(?:°f|degrees?\s*f)\b/gi

export function convertStepTemperatures(text, targetSystem) {
  if (targetSystem === 'us') {
    return text.replace(CELSIUS_PATTERN, (match, num) => {
      const f = Math.round((parseInt(num, 10) * 9 / 5) + 32)
      return `${f}°F`
    })
  } else {
    return text.replace(FAHRENHEIT_PATTERN, (match, num) => {
      const c = Math.round((parseInt(num, 10) - 32) * 5 / 9)
      return `${c}°C`
    })
  }
}

export function formatConvertedAmount(amount) {
  if (amount === null || amount === undefined) return ''
  if (Number.isInteger(amount)) return String(amount)
  // Show common fractions nicely for US units (0.25 -> 1/4, 0.5 -> 1/2, 0.75 -> 3/4)
  const fractions = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.33: '⅓', 0.67: '⅔' }
  const whole = Math.floor(amount)
  const frac = Math.round((amount - whole) * 100) / 100
  if (fractions[frac]) {
    return whole > 0 ? `${whole}${fractions[frac]}` : fractions[frac]
  }
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
