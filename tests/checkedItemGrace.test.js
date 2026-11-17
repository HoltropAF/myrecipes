// Tests for the shopping list's per-item undo grace period.

import test from 'node:test'
import assert from 'node:assert/strict'
import { createCheckedItemGrace } from '../src/lib/checkedItemGrace.js'

function fixture() {
  let now = 0, nextId = 0, visible = new Set()
  const timers = new Map()
  const grace = createCheckedItemGrace(ids => { visible = ids }, {
    setTimer: (callback, delay) => { const id = ++nextId; timers.set(id, { at: now + delay, callback }); return id },
    clearTimer: id => timers.delete(id),
  })
  return { grace, visible: () => [...visible], pending: () => timers.size, tick(ms) {
    now += ms
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback() }
  } }
}

test('a checked item stays visible for the full three-second undo window', () => {
  const f = fixture()
  f.grace.begin(['a'])
  f.tick(2999)
  assert.deepEqual(f.visible(), ['a'])
  f.tick(1)
  assert.deepEqual(f.visible(), [])
})

test('unchecking cancels hiding and a later check gets a fresh window', () => {
  const f = fixture()
  f.grace.begin(['a'])
  f.tick(2000)
  f.grace.cancel(['a'])
  assert.equal(f.pending(), 0)
  f.grace.begin(['a'])
  f.tick(1000)
  assert.deepEqual(f.visible(), ['a'])
  f.tick(2000)
  assert.deepEqual(f.visible(), [])
})

test('different rows have independent timers and merged IDs hide together', () => {
  const f = fixture()
  f.grace.begin(['a', 'b'])
  f.tick(1000)
  f.grace.begin(['c'])
  f.tick(2000)
  assert.deepEqual(f.visible(), ['c'])
  f.tick(1000)
  assert.deepEqual(f.visible(), [])
})

test('leaving the screen clears pending callbacks', () => {
  const f = fixture()
  f.grace.begin(['a', 'b'])
  f.grace.dispose()
  assert.equal(f.pending(), 0)
})
