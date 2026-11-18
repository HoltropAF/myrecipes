// Tests for the pure text helpers: pasted ingredients and steps, amounts and
// scaling, unit and temperature conversion, timers found in step text, and the
// supermarket aisle sorter. These break silently when edited, so pin them down.

import test from 'node:test'
import assert from 'node:assert/strict'
import { parseIngredientLine, parseIngredientBlock, formatAmount, scaleAmount, normalizeName } from '../src/lib/ingredientParser.js'
import { parseStepBlock } from '../src/lib/stepParser.js'
import { convertIngredient, convertStepTemperatures, formatConvertedAmount } from '../src/lib/unitConverter.js'
import { detectDurationSeconds } from '../src/lib/durationParser.js'
import { classifyAisle } from '../src/lib/aisles.js'

const pick = ({ amount, unit, name, note }) => ({ amount, unit, name, ...(note ? { note } : {}) })

test('ingredient lines: amount, unit and name in Dutch and English', () => {
  assert.deepEqual(pick(parseIngredientLine('300g kip')), { amount: 300, unit: 'g', name: 'kip' })
  assert.deepEqual(pick(parseIngredientLine('2 uien')), { amount: 2, unit: null, name: 'uien' })
  assert.deepEqual(pick(parseIngredientLine('1 blok boursin')), { amount: 1, unit: 'blok', name: 'boursin' })
  assert.deepEqual(pick(parseIngredientLine('2 eetlepel olie')), { amount: 2, unit: 'el', name: 'olie' })
  assert.deepEqual(pick(parseIngredientLine('1 1/2 cups flour')), { amount: 1.5, unit: 'cup', name: 'flour' })
  assert.deepEqual(pick(parseIngredientLine('1,5 kg aardappels')), { amount: 1.5, unit: 'kg', name: 'aardappels' })
  assert.deepEqual(pick(parseIngredientLine('zout naar smaak')), { amount: null, unit: null, name: 'zout naar smaak' })
  assert.equal(parseIngredientLine('   '), null)
})

test('ingredient ranges keep the midpoint and remember what was written', () => {
  assert.deepEqual(pick(parseIngredientLine('2-3 teentjes knoflook')), { amount: 2.5, unit: 'teen', name: 'knoflook', note: '2–3' })
})

test('a pasted block becomes one row per non-empty line', () => {
  const rows = parseIngredientBlock('300 g kip\n\n2 uien\npeper')
  assert.equal(rows.length, 3)
  assert.deepEqual(rows.map(r => r.name), ['kip', 'uien', 'peper'])
  assert.notEqual(rows[0].id, rows[1].id)
})

test('amounts display and scale consistently', () => {
  assert.equal(formatAmount(0.75), '0.75')
  assert.equal(formatAmount(1 / 3), '0.33')
  assert.equal(formatAmount(4), '4')
  assert.equal(formatAmount(null), '')
  assert.equal(scaleAmount(300, 4, 2), 150)
  assert.equal(scaleAmount(null, 4, 2), null)
  assert.equal(scaleAmount(3, 0, 2), 3)
})

test('ingredient names are normalised for merging the shopping list', () => {
  assert.equal(normalizeName('Garlic cloves, finely chopped'), 'garlic')
  assert.equal(normalizeName('ui, gesnipperd'), 'ui')
  assert.equal(normalizeName('tomatoes'), 'tomato')
  assert.equal(normalizeName('onions'), 'onion')
  assert.equal(normalizeName('kaas'), 'kaas')
})

test('pasted steps lose their numbering', () => {
  const steps = parseStepBlock('1. Snijd de kip\n2) Bak de ui\n\nServeer')
  assert.deepEqual(steps.map(s => s.content), ['Snijd de kip', 'Bak de ui', 'Serveer'])
  assert.ok(steps.every(s => s.timer_seconds === null))
})

test('units convert between metric and US, counts stay as they are', () => {
  assert.deepEqual(
    (({ amount, unit }) => ({ amount, unit }))(convertIngredient({ amount: 1, unit: 'cups' }, 'metric')),
    { amount: 235, unit: 'ml' },
  )
  assert.equal(convertIngredient({ amount: 500, unit: 'g' }, 'us').unit, 'oz')
  const garlic = { amount: 2, unit: 'teen', name: 'knoflook' }
  assert.equal(convertIngredient(garlic, 'us'), garlic)
  assert.equal(convertIngredient({ amount: '200', unit: 'g' }, 'us').unit, 'oz')
})

test('converted amounts show common fractions', () => {
  assert.equal(formatConvertedAmount(0.5), '½')
  assert.equal(formatConvertedAmount(1.25), '1¼')
  assert.equal(formatConvertedAmount(2), '2')
})

test('oven temperatures in step text follow the unit setting', () => {
  assert.equal(convertStepTemperatures('Verwarm de oven voor op 200°C.', 'us'), 'Verwarm de oven voor op 392°F.')
  assert.equal(convertStepTemperatures('Bake at 180 graden', 'us'), 'Bake at 356°F')
  assert.equal(convertStepTemperatures('Bake at 400°F', 'metric'), 'Bake at 204°C')
  assert.equal(convertStepTemperatures('Bake at 400°F', 'us'), 'Bake at 400°F')
})

test('timers are found in Dutch and English step text', () => {
  assert.equal(detectDurationSeconds('Laat 20 minuten sudderen'), 20 * 60)
  assert.equal(detectDurationSeconds('Simmer for 20-25 min'), 25 * 60)
  assert.equal(detectDurationSeconds('Bak 1,5 uur in de oven'), 90 * 60)
  assert.equal(detectDurationSeconds('Laat een half uur rusten'), 30 * 60)
  assert.equal(detectDurationSeconds('Laat een kwartier trekken'), 15 * 60)
  assert.equal(detectDurationSeconds('Snijd de ui'), null)
})

test('shopping items land in the right supermarket aisle', () => {
  assert.equal(classifyAisle('pita brood'), 'brood')
  assert.equal(classifyAisle('6 eieren'), 'zuivel')
  assert.equal(classifyAisle('feta'), 'zuivel')
  assert.equal(classifyAisle('verse koriander'), 'kruiden')
  assert.equal(classifyAisle('2 uien'), 'groente')
  assert.equal(classifyAisle(''), 'overig')
})
