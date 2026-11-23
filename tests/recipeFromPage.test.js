// Tests for reading a recipe web page's schema.org data into the import template.

import test from 'node:test'
import assert from 'node:assert/strict'
import { recipeTemplateFromHtml, durationMinutes, cleanText } from '../src/lib/recipeFromPage.js'
import { parseRecipeTemplate } from '../src/lib/recipeTemplate.js'

const page = (data) => `<html><head><title>x</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Blog"}</script>
<script type="application/ld+json">${JSON.stringify(data)}</script></head><body></body></html>`

const blogRecipe = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebPage', name: 'Shakshuka' },
    {
      '@type': ['Recipe', 'NewsArticle'],
      name: 'Shakshuka &amp; feta',
      description: 'Eggs poached in a spicy <b>tomato</b> sauce.',
      recipeYield: ['4', '4 servings'],
      prepTime: 'PT10M',
      cookTime: 'PT25M',
      url: 'https://example.com/shakshuka',
      recipeIngredient: ['2 el olijfolie', '1 rode paprika', '400 g tomatenblokjes', '3-4 eieren', 'zout | peper naar smaak'],
      recipeInstructions: [
        { '@type': 'HowToSection', name: 'Saus', itemListElement: [
          { '@type': 'HowToStep', text: 'Fruit de ui.' },
          { '@type': 'HowToStep', text: 'Voeg de tomaten toe en laat 10 minuten sudderen.' },
        ] },
        { '@type': 'HowToSection', name: 'Eieren', itemListElement: [{ '@type': 'HowToStep', text: 'Pocheer de eieren in de saus.' }] },
      ],
    },
  ],
}

test('a blog recipe in @graph becomes a valid template', () => {
  const result = recipeTemplateFromHtml(page(blogRecipe), 'https://example.com/page')
  assert.equal(result.title, 'Shakshuka & feta')
  assert.equal(result.ingredientCount, 5)
  assert.equal(result.stepCount, 3)
  const { recipes, errors } = parseRecipeTemplate(result.template)
  assert.deepEqual(errors, [])
  const r = recipes[0]
  assert.equal(r.title, 'Shakshuka & feta')
  assert.equal(r.tagline, 'Eggs poached in a spicy tomato sauce.')
  assert.equal(r.servings, 4)
  assert.equal(r.total_minutes, 35)
  assert.equal(r.source, 'https://example.com/shakshuka')
  assert.deepEqual(r.ingredients[0].items.slice(0, 3).map(i => [i.amount, i.unit, i.name]), [[2, 'el', 'olijfolie'], [1, null, 'rode paprika'], [400, 'g', 'tomatenblokjes']])
  assert.equal(r.ingredients[0].items[3].amount, 3.5)
  assert.equal(r.ingredients[0].items[4].name, 'zout / peper naar smaak')
  assert.deepEqual(r.steps.map(g => g.group), ['Saus', 'Eieren'])
  assert.equal(r.steps[0].items[1].content, 'Voeg de tomaten toe en laat 10 minuten sudderen.')
})

test('plain-string instructions, a totalTime and a text yield also work', () => {
  const result = recipeTemplateFromHtml(page({
    '@type': 'Recipe', name: 'Pancakes', totalTime: 'PT1H5M', recipeYield: 'Makes 12 pancakes',
    recipeIngredient: ['250 g flour', '2 eggs', '500 ml milk'],
    recipeInstructions: 'Whisk everything together.\nBake in a hot pan.',
  }), 'https://example.org/pancakes')
  const { recipes, errors } = parseRecipeTemplate(result.template)
  assert.deepEqual(errors, [])
  assert.equal(recipes[0].total_minutes, 65)
  assert.equal(recipes[0].servings, 12)
  assert.equal(recipes[0].source, 'https://example.org/pancakes')
  assert.deepEqual(recipes[0].steps[0].items.map(s => s.content), ['Whisk everything together.', 'Bake in a hot pan.'])
})

test('pages without usable recipe data give null', () => {
  assert.equal(recipeTemplateFromHtml('<html><body>No data here</body></html>', 'https://x.test'), null)
  assert.equal(recipeTemplateFromHtml(page({ '@type': 'Recipe', name: 'Empty', recipeIngredient: [] }), 'https://x.test'), null)
  assert.equal(recipeTemplateFromHtml('<script type="application/ld+json">{broken</script>', 'https://x.test'), null)
})

test('durations and text cleaning', () => {
  assert.equal(durationMinutes('PT1H30M'), 90)
  assert.equal(durationMinutes('P0DT45M'), 45)
  assert.equal(durationMinutes('PT0S'), null)
  assert.equal(durationMinutes('45 minutes'), null)
  assert.equal(cleanText('Crème&nbsp;fraîche &#38; <i>dill</i>'), 'Crème fraîche & dill')
})
