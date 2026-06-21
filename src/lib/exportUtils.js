// Export utilities for backing up data and generating a printable cookbook.
// JSON backup: full data dump for re-import/disaster recovery.
// PDF cookbook: builds an HTML document and triggers the browser's native print-to-PDF,
// avoiding a heavy PDF library bundle and giving full control over print typography.

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportFullBackup(supabase, userId) {
  const [recipes, cookLog, shoppingList, mealGroups, preferences] = await Promise.all([
    supabase.from('recipes').select('*').then(r => r.data || []),
    supabase.from('cook_log').select('*').then(r => r.data || []),
    supabase.from('shopping_list').select('*').then(r => r.data || []),
    supabase.from('meal_groups').select('*').then(r => r.data || []),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle().then(r => r.data || null),
  ])

  const backup = {
    exported_at: new Date().toISOString(),
    app: 'myrecipes',
    version: 1,
    recipes,
    cook_log: cookLog,
    shopping_list: shoppingList,
    meal_groups: mealGroups,
    preferences,
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  downloadJSON(`myrecipes-backup-${dateStr}.json`, backup)
  return backup
}

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatIngredientLine(item) {
  const amount = item.amount !== null && item.amount !== undefined ? item.amount : ''
  const unit = item.unit || ''
  const parts = [amount, unit].filter(Boolean).join(' ')
  return parts ? `${escapeHtml(parts)} ${escapeHtml(item.name)}` : escapeHtml(item.name)
}

function recipeToHtml(recipe) {
  const metaBits = []
  if (recipe.servings) metaBits.push(`${recipe.servings} servings`)
  if (recipe.total_minutes) metaBits.push(`${recipe.total_minutes} min`)
  if (recipe.category) metaBits.push(escapeHtml(recipe.category) + (recipe.subcategory ? ` · ${escapeHtml(recipe.subcategory)}` : ''))

  const ingredientsHtml = (recipe.ingredients || []).map(group => `
    ${group.group ? `<div class="group-label">${escapeHtml(group.group)}</div>` : ''}
    <ul class="ingredients">
      ${group.items.map(item => `<li>${formatIngredientLine(item)}</li>`).join('')}
    </ul>
  `).join('')

  const stepsHtml = (recipe.steps || []).map(group => `
    ${group.group ? `<div class="group-label">${escapeHtml(group.group)}</div>` : ''}
    <ol class="steps">
      ${group.items.map(step => `<li>${escapeHtml(step.content)}</li>`).join('')}
    </ol>
  `).join('')

  const variantsHtml = (recipe.variants || []).length > 0 ? `
    <div class="variants-note">+ ${recipe.variants.length} variant${recipe.variants.length > 1 ? 's' : ''}: ${recipe.variants.map(v => escapeHtml(v.label)).join(', ')}</div>
  ` : ''

  const notesHtml = recipe.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(recipe.notes).replace(/\n/g, '<br>')}</div>` : ''

  return `
    <section class="recipe">
      <h2>${escapeHtml(recipe.title)}</h2>
      ${recipe.tagline ? `<div class="tagline">${escapeHtml(recipe.tagline)}</div>` : ''}
      ${metaBits.length > 0 ? `<div class="meta">${metaBits.join(' &nbsp;·&nbsp; ')}</div>` : ''}
      <div class="columns">
        <div class="col-ingredients">
          <h3>Ingredients</h3>
          ${ingredientsHtml || '<p class="empty">No ingredients listed.</p>'}
        </div>
        <div class="col-steps">
          <h3>Steps</h3>
          ${stepsHtml || '<p class="empty">No steps listed.</p>'}
        </div>
      </div>
      ${variantsHtml}
      ${notesHtml}
    </section>
  `
}

export function generateCookbookHtml(recipes) {
  // Group by category for a sensible table of contents / ordering
  const byCategory = {}
  for (const r of recipes) {
    const cat = r.category || 'Uncategorized'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(r)
  }
  const categories = Object.keys(byCategory).sort()

  const tocHtml = categories.map(cat => `
    <div class="toc-category">${escapeHtml(cat)}</div>
    <ul class="toc-list">
      ${byCategory[cat].map(r => `<li>${escapeHtml(r.title)}</li>`).join('')}
    </ul>
  `).join('')

  const recipesHtml = categories.map(cat => `
    <div class="category-divider"><h1>${escapeHtml(cat)}</h1></div>
    ${byCategory[cat].map(recipeToHtml).join('')}
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>My Recipes</title>
<style>
  @page { margin: 2cm 1.6cm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #2a2420;
    line-height: 1.5;
    max-width: 100%;
  }
  .cover {
    text-align: center;
    padding-top: 35vh;
    page-break-after: always;
  }
  .cover h1 { font-size: 42px; margin-bottom: 8px; color: #9c3525; }
  .cover .sub { font-family: Helvetica, Arial, sans-serif; font-size: 13px; color: #6b6258; }

  .toc { page-break-after: always; }
  .toc h1 { font-size: 24px; border-bottom: 2px solid #9c3525; padding-bottom: 8px; margin-bottom: 20px; }
  .toc-category { font-family: Helvetica, Arial, sans-serif; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #9c3525; margin-top: 16px; }
  .toc-list { margin: 4px 0 0; padding-left: 20px; font-size: 13px; columns: 2; }
  .toc-list li { margin-bottom: 2px; }

  .category-divider { page-break-before: always; padding-top: 10vh; }
  .category-divider h1 { font-size: 32px; color: #9c3525; border-bottom: 3px solid #c1432f; padding-bottom: 10px; }

  .recipe { page-break-inside: avoid; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 1px solid #e8ddc8; }
  .recipe h2 { font-size: 22px; margin-bottom: 2px; color: #2a2420; }
  .recipe .tagline { font-family: Helvetica, Arial, sans-serif; font-style: italic; color: #6b6258; font-size: 13px; margin-bottom: 6px; }
  .recipe .meta { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #6b6258; margin-bottom: 14px; }

  .columns { display: flex; gap: 28px; }
  .col-ingredients { flex: 0 0 35%; }
  .col-steps { flex: 1; }
  .recipe h3 { font-family: Helvetica, Arial, sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #c1432f; margin-bottom: 8px; }
  .group-label { font-family: Helvetica, Arial, sans-serif; font-size: 11px; font-weight: bold; color: #6b7c5e; margin: 8px 0 4px; }
  .ingredients { margin: 0 0 8px; padding-left: 18px; font-size: 13px; }
  .ingredients li { margin-bottom: 3px; }
  .steps { margin: 0 0 8px; padding-left: 20px; font-size: 13px; }
  .steps li { margin-bottom: 6px; }
  .empty { font-size: 12px; color: #6b6258; font-style: italic; }
  .variants-note { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #6b7c5e; margin-top: 10px; }
  .notes { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #6b6258; background: #f5ecdc; padding: 8px 12px; border-radius: 6px; margin-top: 10px; }

  @media print {
    .recipe { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="cover">
    <h1>My Recipes</h1>
    <div class="sub">${recipes.length} recipes · exported ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="toc">
    <h1>Contents</h1>
    ${tocHtml}
  </div>

  ${recipesHtml}
</body>
</html>`
}

export function exportCookbookPDF(recipes) {
  const html = generateCookbookHtml(recipes)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow pop-ups to export the cookbook PDF.')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}
