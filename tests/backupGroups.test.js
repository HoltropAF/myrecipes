// Tests for restoring linked recipe groups from a backup.

import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareRows } from '../src/lib/importUtils.js'

test('restored groups and recipes are rewritten to the importing user', () => {
  const [group] = prepareRows('recipe_groups', [{ id: 'g1', user_id: 'someone-else', name: 'Curries' }], 'me')
  assert.equal(group.user_id, 'me')
  const [recipe] = prepareRows('recipes', [{ id: 'r1', user_id: 'someone-else', title: 'Dal', group_id: 'g1' }], 'me', new Set(['g1']))
  assert.equal(recipe.user_id, 'me')
  assert.equal(recipe.group_id, 'g1')
})

test('a recipe linked to a group that is not available is imported unlinked', () => {
  const [recipe] = prepareRows('recipes', [{ id: 'r1', title: 'Dal', group_id: 'missing' }], 'me', new Set())
  assert.equal(recipe.group_id, null)
  const [plain] = prepareRows('recipes', [{ id: 'r2', title: 'Soup', group_id: null }], 'me', new Set())
  assert.equal(plain.group_id, null)
})
