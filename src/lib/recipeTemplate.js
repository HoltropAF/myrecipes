const fields = {
  Name: 'title', 'Short description': 'tagline', Servings: 'servings',
  'Total time (minutes)': 'total_minutes', Category: 'category', Subcategory: 'subcategory',
  'Tags (separate with commas)': 'tags', 'Source (link or description)': 'source',
}
export const titleKey = title => title.trim().toLocaleLowerCase().replace(/\s+/g, ' ')

// Deliberately strict: an unrecognised line is reported, never silently discarded.
export function parseRecipeTemplate(text) {
  if (text.length > 500000) throw new Error('Use a file smaller than 500 KB.')
  const recipes = []
  const errors = []
  let recipe = null, section = null, seen = new Set()
  const fail = (line, message) => errors.push(`Line ${line}: ${message}`)
  const groupFor = (key) => {
    if (!recipe[key].length) recipe[key].push({ group: null, items: [] })
    return recipe[key].at(-1)
  }
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim(), n = index + 1
    if (!line || line.startsWith('#')) return
    if (line === '--- RECIPE ---') {
      if (recipe) fail(n, 'Finish the previous recipe with --- END RECIPE ---.')
      recipe = { id: crypto.randomUUID(), title: '', tagline: null, servings: null, total_minutes: null,
        category: null, subcategory: null, tags: [], source: null, ingredients: [], steps: [], notes: '', variants: [] }
      section = null; seen = new Set()
      return
    }
    if (!recipe) { fail(n, 'Start with --- RECIPE --- (put instructions after #).'); return }
    if (line === '--- END RECIPE ---') {
      if (!recipe.title) fail(n, 'Name is required.')
      for (const key of ['ingredients', 'steps']) {
        recipe[key] = recipe[key].filter(g => g.items.length)
        if (!recipe[key].length) fail(n, `${recipe.title || 'Recipe'} needs ${key}.`)
      }
      recipes.push(recipe); recipe = null; section = null
      return
    }
    if (['INGREDIENTS', 'STEPS', 'NOTES', 'VARIATIONS (optional)'].includes(line)) {
      section = line
      return
    }
    if (!section) {
      const colon = line.indexOf(':')
      const label = line.slice(0, colon), value = line.slice(colon + 1).trim(), key = fields[label]
      if (colon < 0 || !key) { fail(n, 'Unknown field. Keep the labels from the template.'); return }
      if (seen.has(key)) fail(n, `The field ${label} occurs twice.`)
      seen.add(key)
      if (key === 'servings' || key === 'total_minutes') {
        if (value && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 2147483647)) fail(n, `${label} must be a positive whole number.`)
        recipe[key] = value ? Number(value) : null
      } else recipe[key] = key === 'tags' ? [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))] : value || null
      return
    }
    if (section === 'NOTES' || section === 'VARIATIONS (optional)') {
      if (section === 'VARIATIONS (optional)' && !seen.has('variationNotes')) {
        recipe.notes += '\n\nVariations:\n'; seen.add('variationNotes')
      }
      recipe.notes += (recipe.notes && !recipe.notes.endsWith('\n') ? '\n' : '') + line
      return
    }
    const key = section === 'INGREDIENTS' ? 'ingredients' : 'steps'
    if (/^\[.+\]$/.test(line)) { recipe[key].push({ group: line.slice(1, -1), items: [] }); return }
    if (key === 'ingredients') {
      const parts = line.split('|').map(s => s.trim())
      if (parts.length < 3 || parts.length > 4 || !parts[2]) { fail(n, 'Use amount | unit | ingredient | optional note.'); return }
      const [amount, unit, name, note] = parts
      if (amount && (!/^\d+(?:[.,]\d+)?$/.test(amount) || !Number.isFinite(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0)) {
        fail(n, 'Amount must be a positive number (for example 0.5), or blank.'); return
      }
      groupFor(key).items.push({ id: crypto.randomUUID(), amount: amount ? Number(amount.replace(',', '.')) : null, unit: unit || null, name, note: note || null })
    } else {
      const match = line.match(/^\d+[.)]\s*(.+)$/)
      if (!match) { fail(n, 'Write a numbered instruction, for example 1. Boil the water.'); return }
      groupFor(key).items.push({ id: crypto.randomUUID(), content: match[1], timer_seconds: null })
    }
  })
  if (recipe) errors.push('Finish the last recipe with --- END RECIPE ---.')
  if (!recipes.length) errors.push('The file contains no complete recipes.')
  if (recipes.length > 100) errors.push('Import at most 100 recipes at a time.')
  return { recipes, errors }
}

export function markTemplateDuplicates(recipes, existing) {
  const titles = new Set(existing.map(r => titleKey(r.title || '')))
  return recipes.map(recipe => {
    const key = titleKey(recipe.title || '')
    const duplicate = titles.has(key)
    titles.add(key)
    return { recipe, duplicate }
  })
}

export async function saveTemplateRecipes(client, recipes) {
  if (!recipes.length || recipes.length > 100) throw new Error('Choose between 1 and 100 recipes.')
  const { data, error: authError } = await client.auth.getUser()
  if (authError || !data?.user) throw new Error('Sign in before importing recipes.')
  // A single insert is atomic. Stable preview IDs prevent a retry from creating copies.
  const { error } = await client.from('recipes').insert(recipes.map(r => ({ ...r, user_id: data.user.id })))
  if (error) throw new Error(error.code === '23505'
    ? 'These recipes may already have been saved. Refresh your cookbook before trying again.'
    : `Could not import recipes: ${error.message}`)
  return recipes.length
}
