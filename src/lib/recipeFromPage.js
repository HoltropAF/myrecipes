// Turns a recipe web page into a filled-in recipe template, without AI.
//
// Most recipe sites and food blogs publish their recipe a second time inside the
// page as schema.org "Recipe" data (JSON-LD), mainly so search engines can show
// it. This reads that data and writes it out in the same plain-text template the
// import screen already previews and saves (docs/recipe-template.txt), so the
// person still checks everything before anything is stored.
//
// The dish photo and any step photos come along as links to the site's own
// pictures; they are shown from there, not copied.
//
// Pages without that data (Instagram, TikTok, YouTube, Pinterest, many video
// pages) return null; the import screen then offers the chatbot route instead.

import { parseIngredientLine } from './ingredientParser.js'

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', frac12: '½', frac14: '¼', frac34: '¾', deg: '°' }

/** HTML entities decoded, tags stripped, whitespace collapsed, no template delimiters. */
export function cleanText(value) {
  if (value == null) return ''
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Every JSON-LD block on the page, parsed; broken blocks are skipped. */
function jsonLdBlocks(html) {
  const blocks = []
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(re)) {
    const raw = match[1].trim().replace(/^<!--/, '').replace(/-->$/, '').replace(/^\/\*<!\[CDATA\[\*\//, '').replace(/\/\*\]\]>\*\/$/, '')
    try { blocks.push(JSON.parse(raw)) } catch { /* not every site writes valid JSON */ }
  }
  return blocks
}

const isRecipe = node => {
  const type = node?.['@type']
  return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe'
}

/** The first Recipe object anywhere in the JSON-LD (arrays, @graph, mainEntity). */
export function findRecipeData(html) {
  const queue = jsonLdBlocks(html)
  while (queue.length) {
    const node = queue.shift()
    if (!node || typeof node !== 'object') continue
    if (Array.isArray(node)) { queue.push(...node); continue }
    if (isRecipe(node)) return node
    for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement']) {
      if (node[key] && typeof node[key] === 'object') queue.push(node[key])
    }
  }
  return null
}

/** ISO 8601 duration ("PT1H30M", "P0DT45M") to whole minutes, or null. */
export function durationMinutes(value) {
  const m = typeof value === 'string' && value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i)
  if (!m) return null
  const minutes = Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0) + Math.round(Number(m[4] || 0) / 60)
  return minutes > 0 ? minutes : null
}

function servingsFrom(yieldValue) {
  const first = Array.isArray(yieldValue) ? yieldValue.find(v => /\d/.test(String(v))) : yieldValue
  const m = String(first ?? '').match(/\d+/)
  const n = m ? Number(m[0]) : 0
  return n >= 1 && n <= 1000 ? n : null
}

/**
 * The first usable picture link in a schema.org image value: a string, an
 * ImageObject ({ url }), or a list of either. Relative links are resolved
 * against the page. Returns null for anything that isn't http(s).
 */
export function imageUrl(value, base) {
  const pick = v => {
    if (!v) return null
    if (typeof v === 'string') return v
    if (Array.isArray(v)) { for (const x of v) { const u = pick(x); if (u) return u } return null }
    if (typeof v === 'object') return pick(v.url || v.contentUrl)
    return null
  }
  const raw = pick(value)
  if (!raw) return null
  try {
    const url = new URL(raw.trim(), base)
    return ['http:', 'https:'].includes(url.protocol) ? url.href.replace(/\|/g, '%7C') : null
  } catch { return null }
}

// Steps as [{ group, items: [{ text, image }] }]; image is a step photo link or null.
function stepGroups(instructions, base) {
  const groups = [{ group: null, items: [] }]
  const add = (text, image = null) => { const t = cleanText(text); if (t) groups.at(-1).items.push({ text: t, image: imageUrl(image, base) }) }
  const walk = node => {
    if (!node) return
    if (typeof node === 'string') {
      // A single block of text: one step per line, or the whole text as one step.
      node.split(/\r?\n|<br\s*\/?>|<\/p>/i).forEach(line => add(line))
      return
    }
    if (Array.isArray(node)) { node.forEach(walk); return }
    const type = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
    if (type.includes('HowToSection')) {
      groups.push({ group: cleanText(node.name) || null, items: [] })
      walk(node.itemListElement)
      return
    }
    if (node.itemListElement) { walk(node.itemListElement); return }
    add(node.text || node.name, node.image)
  }
  walk(instructions)
  return groups.filter(g => g.items.length)
}

const formatAmount = amount => {
  if (amount == null || !(amount > 0)) return ''
  return String(Math.round(amount * 1000) / 1000)
}

/**
 * Read the recipe from a page's HTML. Returns
 * { title, template, ingredientCount, stepCount } or null when the page has no
 * usable recipe data (no name, no ingredients or no steps).
 */
export function recipeTemplateFromHtml(html, pageUrl) {
  const data = findRecipeData(String(html || ''))
  if (!data) return null
  const title = cleanText(data.name)
  const ingredients = (Array.isArray(data.recipeIngredient) ? data.recipeIngredient : Array.isArray(data.ingredients) ? data.ingredients : [])
    .map(cleanText).filter(Boolean)
  const steps = stepGroups(data.recipeInstructions, pageUrl)
  if (!title || !ingredients.length || !steps.length) return null

  let description = cleanText(data.description)
  if (description.length > 140) description = description.slice(0, 137).replace(/\s+\S*$/, '') + '…'
  const minutes = durationMinutes(data.totalTime) || ((durationMinutes(data.prepTime) || 0) + (durationMinutes(data.cookTime) || 0)) || null
  const servings = servingsFrom(data.recipeYield)
  const source = cleanText(typeof data.url === 'string' && /^https?:\/\//.test(data.url) ? data.url : pageUrl)

  const ingredientLines = ingredients.map(text => {
    const row = parseIngredientLine(text) || { amount: null, unit: null, name: text }
    const name = cleanText(row.name) || text
    return [formatAmount(row.amount), row.unit || '', name, row.note ? cleanText(row.note) : null].filter(v => v !== null).join(' | ')
  })
  const photo = imageUrl(data.image, pageUrl)
  let number = 0
  let stepPhotos = 0
  const stepLines = steps.flatMap(g => [
    ...(g.group ? [`[${g.group}]`] : []),
    ...g.items.map(({ text, image }) => {
      if (image) stepPhotos++
      return `${++number}. ${text}${image ? ` | photo: ${image}` : ''}`
    }),
  ])

  const template = [
    '--- RECIPE ---',
    `Name: ${title}`,
    `Short description: ${description}`,
    `Servings: ${servings ?? ''}`,
    `Total time (minutes): ${minutes ?? ''}`,
    'Category:',
    'Subcategory:',
    'Tags (separate with commas):',
    `Source (link or description): ${source}`,
    `Photo (link): ${photo ?? ''}`,
    'Fridge storage:',
    'Freezer friendly (yes/no):',
    'Reheating:',
    'Prep ahead:',
    '',
    'INGREDIENTS',
    ...ingredientLines,
    '',
    'STEPS',
    ...stepLines,
    '--- END RECIPE ---',
    '',
  ].join('\n')

  return { title, template, ingredientCount: ingredientLines.length, stepCount: number, hasPhoto: !!photo, stepPhotoCount: stepPhotos }
}
