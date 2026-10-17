// Older plans contain one date string per recipe. New plans can hold several days.
export function assignmentDates(value) {
  const values = Array.isArray(value) ? value : [value]
  return [...new Set(values.filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort()
}

export function mealOnDay(assignments, recipeId, day) {
  const dates = assignmentDates(assignments[recipeId])
  const index = dates.indexOf(day)
  return index < 0 ? null : { leftover: index > 0, cookDate: dates[0] }
}

export function readDayNotes(notes) {
  if (typeof notes !== 'string' || !notes.startsWith('myrecipes-week-v1:')) return {}
  try {
    const value = JSON.parse(notes.slice('myrecipes-week-v1:'.length)).dayNotes
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([day, text]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && typeof text === 'string' && text.trim()).map(([day, text]) => [day, text.trim()]))
  } catch { return {} }
}
