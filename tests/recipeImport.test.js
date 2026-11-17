// Tests for the recipe template parser, duplicate detection and AI import prompt.

import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRecipeTemplate, markTemplateDuplicates, saveTemplateRecipes } from '../src/lib/recipeTemplate.js'
import { recipeImportPrompt } from '../src/lib/recipeImportPrompt.js'

const fixture = `--- RECIPE ---
Name: Tomato pasta
Servings: 2
Total time (minutes): 20
Source (link or description): https://example.com/pasta
Freezer friendly (yes/no): no
INGREDIENTS
[Sauce]
0.5 | tbsp | olive oil | divided
200 | g | tomatoes
| | salt | to taste
STEPS
1. Cook the tomatoes for 10 minutes.
2. Toss with pasta.
NOTES
Pasta amount was not specified in the source.
--- END RECIPE ---`

test('extractor template preserves quantities, groups, uncertainty and source', () => {
  const { recipes: [r], errors } = parseRecipeTemplate('\uFEFF' + fixture.replaceAll('\n', '\r\n'))
  assert.deepEqual(errors, [])
  assert.equal(r.ingredients[0].group, 'Sauce')
  assert.equal(r.ingredients[0].items[0].amount, 0.5)
  assert.equal(r.ingredients[0].items[2].amount, null)
  assert.equal(r.freezer_friendly, false)
  assert.equal(r.source, 'https://example.com/pasta')
  assert.match(r.notes, /not specified/)
  assert.equal(r.steps[0].items.length, 2)
})

test('invalid and incomplete extraction cannot pass validation', () => {
  for (const text of [fixture.replace('Name: Tomato pasta', 'Name:'), fixture.replace('STEPS', 'DIRECTIONS'), fixture.replace('0.5 |', '1/2 |'), fixture.replace('Servings: 2', 'Servings: two'), fixture.replace('--- END RECIPE ---', ''), 'https://example.com/recipe']) {
    assert.ok(parseRecipeTemplate(text).errors.length, text)
  }
  assert.throws(() => parseRecipeTemplate('x'.repeat(500001)), /500 KB/)
  assert.ok(parseRecipeTemplate(Array(101).fill(fixture).join('\n')).errors.some(e => e.includes('100')))
})

test('duplicates include existing titles and repeats within the same file', () => {
  const { recipes } = parseRecipeTemplate(fixture + '\n' + fixture)
  assert.deepEqual(markTemplateDuplicates(recipes, []).map(e => e.duplicate), [false, true])
  assert.deepEqual(markTemplateDuplicates(recipes, [{ title: '  TOMATO   PASTA ' }]).map(e => e.duplicate), [true, true])
})

test('save uses signed-in ownership and preserves preview IDs', async () => {
  const { recipes } = parseRecipeTemplate(fixture)
  let inserted
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'current-user' } } }) },
    from: table => { assert.equal(table, 'recipes'); return { insert: async rows => { inserted = rows; return {} } } },
  }
  assert.equal(await saveTemplateRecipes(client, recipes), 1)
  assert.equal(inserted[0].user_id, 'current-user')
  assert.equal(inserted[0].id, recipes[0].id)
  client.auth.getUser = async () => ({ data: {} })
  await assert.rejects(saveTemplateRecipes(client, recipes), /Sign in/)
  await assert.rejects(saveTemplateRecipes(client, []), /between 1 and 100/)
})

test('save surfaces duplicate retry and other database failures', async () => {
  const { recipes } = parseRecipeTemplate(fixture)
  for (const [error, message] of [[{ code: '23505' }, /already have been saved/], [{ message: 'offline' }, /offline/]]) {
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) }, from: () => ({ insert: async () => ({ error }) }) }
    await assert.rejects(saveTemplateRecipes(client, recipes), message)
  }
})

test('prompt accepts social URLs and rejects non-web schemes and embedded credentials', () => {
  for (const url of ['https://www.instagram.com/reel/abc/', 'https://pin.it/abc', 'https://example.com/recipe']) {
    assert.ok(recipeImportPrompt(url, fixture).includes(url))
  }
  for (const url of ['javascript:alert(1)', 'file:///secret', 'nonsense', 'https://user:password@example.com']) {
    assert.throws(() => recipeImportPrompt(url, fixture))
  }
})
