// Tests for merging the shared allergen dictionary with one person's own words.

import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeDictionary } from '../src/lib/dictionaryMerge.js'

const shared = [
  { id: 's1', canonical_name: 'pesto', tags: ['dairy'], reviewed: true },
  { id: 's2', canonical_name: 'boter', tags: ['dairy'], reviewed: true },
  { id: 's3', canonical_name: 'nieuw', tags: [], reviewed: false },
]

test('without personal words the shared list comes through as is', () => {
  const rows = mergeDictionary(shared, [])
  assert.deepEqual(rows.map(r => r.key), ['boter', 'nieuw', 'pesto'])
  assert.ok(rows.every(r => r.inShared && !r.mine))
  assert.equal(rows.find(r => r.key === 'nieuw').reviewed, false)
})

test('a personal override replaces the tags but remembers the shared ones', () => {
  const pesto = mergeDictionary(shared, [{ canonical_name: 'pesto', tags: ['dairy', 'nuts'] }]).find(r => r.key === 'pesto')
  assert.deepEqual(pesto.tags, ['dairy', 'nuts'])
  assert.deepEqual(pesto.sharedTags, ['dairy'])
  assert.equal(pesto.id, 's1')
  assert.equal(pesto.mine, true)
  assert.equal(pesto.inShared, true)
  assert.equal(pesto.reviewed, true)
})

test('a personal word that is not on the shared list is added, case-insensitively matched', () => {
  const rows = mergeDictionary(shared, [{ canonical_name: 'tahini', tags: ['nuts'] }, { canonical_name: 'boter', tags: [] }])
  const tahini = rows.find(r => r.key === 'tahini')
  assert.equal(tahini.inShared, false)
  assert.equal(tahini.id, null)
  assert.equal(tahini.sharedTags, null)
  assert.equal(rows.filter(r => r.key === 'boter').length, 1)
  assert.deepEqual(rows.map(r => r.key), ['boter', 'nieuw', 'pesto', 'tahini'])
  assert.deepEqual(mergeDictionary([{ id: 'x', canonical_name: 'Feta', tags: ['dairy'], reviewed: true }], [{ canonical_name: 'feta', tags: [] }])[0].tags, [])
})
