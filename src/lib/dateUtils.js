// Date helpers.
//
// Cook logs are stored in a `date` column, not a timestamp — the day you cooked
// something is a local-calendar fact, not an instant. `toISOString()` formats in
// UTC, so in Amsterdam (UTC+1/+2) anything cooked between midnight and 02:00 was
// being recorded as the previous day.

// Today's date as YYYY-MM-DD in the *browser's* timezone.
export function todayLocalISO() {
  return toLocalISO(new Date())
}

// Format a Date as YYYY-MM-DD in the browser's timezone.
export function toLocalISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Whole days between two YYYY-MM-DD strings, ignoring clocks entirely. */
export function daysBetween(fromISO, toISO = todayLocalISO()) {
  if (!fromISO) return null
  const from = new Date(`${fromISO}T00:00:00`)
  const to = new Date(`${toISO}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return Math.round((to - from) / 86400000)
}

/**
 * "today", "3 days ago", "5 weeks ago", "8 months ago".
 *
 * Rough on purpose: on a recipe card the useful signal is "recently" versus
 * "ages ago", and an exact date is noise at that size. `labels` comes from the
 * caller so this stays free of i18n imports.
 */
export function relativeDayLabel(fromISO, labels, toISO = todayLocalISO()) {
  const days = daysBetween(fromISO, toISO)
  if (days === null || days < 0) return null
  if (days === 0) return labels.today
  if (days === 1) return labels.yesterday
  if (days < 7) return labels.days(days)
  if (days < 60) return labels.weeks(Math.round(days / 7))
  if (days < 365) return labels.months(Math.round(days / 30))
  return labels.years(Math.max(1, Math.round(days / 365)))
}
