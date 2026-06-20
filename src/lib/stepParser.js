// Parses pasted step text into structured rows, stripping any leading numbering
// e.g. "1. Snijd de kip" or "1) Snijd de kip" or just "Snijd de kip"

let idCounter = 0
const nextId = () => `step_${Date.now()}_${idCounter++}`

const LEADING_NUMBER = /^\s*(\d+)[.)]\s*/

export function parseStepLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return null
  const content = trimmed.replace(LEADING_NUMBER, '')
  return { id: nextId(), content, timer_seconds: null }
}

export function parseStepBlock(text) {
  return text
    .split('\n')
    .map(parseStepLine)
    .filter(Boolean)
}
