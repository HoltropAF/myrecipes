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
