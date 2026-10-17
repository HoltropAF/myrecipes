import test from 'node:test'
import assert from 'node:assert/strict'
import { assignmentDates, mealOnDay, readDayNotes } from '../src/lib/mealAssignments.js'

test('older single-day plans remain compatible', () => {
  assert.deepEqual(assignmentDates('2026-10-19'), ['2026-10-19'])
  assert.deepEqual(mealOnDay({ pasta: '2026-10-19' }, 'pasta', '2026-10-19'), { leftover: false, cookDate: '2026-10-19' })
})

test('multi-day plans cook once and show leftovers on subsequent dates', () => {
  const plans = { pasta: ['2026-10-21', '2026-10-19', '2026-10-20', '2026-10-20'] }
  assert.deepEqual(assignmentDates(plans.pasta), ['2026-10-19', '2026-10-20', '2026-10-21'])
  assert.equal(mealOnDay(plans, 'pasta', '2026-10-19').leftover, false)
  assert.equal(mealOnDay(plans, 'pasta', '2026-10-20').leftover, true)
  assert.equal(mealOnDay(plans, 'pasta', '2026-10-21').leftover, true)
  assert.equal(mealOnDay(plans, 'pasta', '2026-10-22'), null)
})

test('unplanned and malformed values do not create scheduled meals', () => {
  for (const value of [undefined, null, {}, '', ['bad', 12, null]]) assert.deepEqual(assignmentDates(value), [])
  assert.equal(mealOnDay({}, 'pasta', '2026-10-19'), null)
})

test('non-recipe plans coexist with cooking dates and tolerate older plans', () => {
  const assignments = { pasta: ['2026-10-19', '2026-10-20'] }
  const notes = `myrecipes-week-v1:${JSON.stringify({ assignments, dayNotes: { '2026-10-21': ' Eating out ', '2026-10-22': '', invalid: 'No date', '2026-10-23': 4 } })}`
  assert.deepEqual(readDayNotes(notes), { '2026-10-21': 'Eating out' })
  assert.equal(mealOnDay(assignments, 'pasta', '2026-10-20').leftover, true)
  for (const text of ['myrecipes-week-v1:{}', 'myrecipes-week-v1:bad', null, 'other notes']) assert.deepEqual(readDayNotes(text), {})
})
