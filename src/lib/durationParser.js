// Finds cooking durations in step text so a step can offer a timer without the
// author having to fill one in by hand.
//
// Bilingual on purpose: recipes here are mostly Dutch with some English, and the
// same trap applies as in ingredient normalisation — English-only rules break on
// Dutch wording. "20 minuten", "1 uur", "een half uur", "20-25 min", "1½ uur".

const UNIT_SECONDS = {
  sec: 1, secs: 1, second: 1, seconds: 1,
  sec_nl: 1, seconde: 1, seconden: 1,
  min: 60, mins: 60, minute: 60, minutes: 60, minuut: 60, minuten: 60,
  hour: 3600, hours: 3600, hr: 3600, hrs: 3600, uur: 3600, uren: 3600,
}

// Written-out quantities that show up constantly in Dutch recipes.
const WORD_QUANTITIES = {
  een: 1, één: 1, 'n': 1, a: 1, an: 1, one: 1,
  anderhalf: 1.5, anderhalve: 1.5,
  twee: 2, two: 2, drie: 3, three: 3, vier: 4, four: 4, vijf: 5, five: 5,
  tien: 10, ten: 10, kwartier: 0.25, // "kwartier" handled specially below
}

const UNIT_WORDS = Object.keys(UNIT_SECONDS).filter(u => u !== 'sec_nl').join('|')

// "20 minuten", "1,5 uur", "20-25 min", "1 1/2 hour"
const NUMERIC = new RegExp(
  String.raw`(\d+(?:[.,]\d+)?(?:\s*[-–—]\s*\d+(?:[.,]\d+)?)?)\s*(${UNIT_WORDS})\b`,
  'i'
)

// "een half uur", "anderhalf uur", "een kwartier", "half an hour"
const WORDY = new RegExp(
  String.raw`\b(een|één|anderhal(?:f|ve)|twee|drie|vier|vijf|tien|half|halve|a|an|one|two|three)\s+(half\s+|halve\s+)?(${UNIT_WORDS})\b`,
  'i'
)

const KWARTIER = /\b(een\s+)?kwartier\b/i

/**
 * Return the duration in whole seconds found in `text`, or null.
 * A range takes the upper bound — an under-run timer is more annoying in a
 * kitchen than one that rings slightly late.
 */
export function detectDurationSeconds(text) {
  if (typeof text !== 'string' || !text) return null

  if (KWARTIER.test(text)) return 15 * 60

  const numeric = text.match(NUMERIC)
  if (numeric) {
    const raw = numeric[1].replace(',', '.')
    const parts = raw.split(/[-–—]/).map(s => Number(s.trim())).filter(Number.isFinite)
    const value = parts.length ? Math.max(...parts) : null
    const unit = UNIT_SECONDS[numeric[2].toLowerCase()]
    if (value && unit) return Math.round(value * unit)
  }

  const wordy = text.match(WORDY)
  if (wordy) {
    const base = WORD_QUANTITIES[wordy[1].toLowerCase()] ?? 1
    const halved = wordy[2] ? 0.5 : 1
    const unit = UNIT_SECONDS[wordy[3].toLowerCase()]
    if (unit) return Math.round(base * halved * unit)
  }

  return null
}

/** "1:05:00" / "20:00" — for display on a running clock. */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** "20 min" / "1 u 30" — compact label for a chip. */
export function formatDurationShort(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}u ${m}` : `${h}u`
  return `${m} min`
}

/** Accepts "20", "1:30", "1u30" from the wizard's timer field. Returns seconds or null. */
export function parseTimerInput(raw) {
  if (raw === null || raw === undefined) return null
  const text = String(raw).trim().toLowerCase()
  if (!text) return null

  const clock = text.match(/^(\d+)\s*[:u]\s*(\d+)$/)
  if (clock) {
    const [, a, b] = clock
    return Number(a) * 3600 + Number(b) * 60
  }
  const detected = detectDurationSeconds(text)
  if (detected) return detected

  const plain = Number(text.replace(',', '.'))
  // A bare number in this field means minutes — that's what people type.
  return Number.isFinite(plain) && plain > 0 ? Math.round(plain * 60) : null
}
