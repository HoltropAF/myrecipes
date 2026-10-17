import { useState } from 'react'
import { LanguageContext } from '../src/lib/i18n'
import { DEMO_RECIPES, DEMO_COOK_LOG, DEMO_MEAL_GROUPS } from '../src/lib/demoData'
import AllRecipesView from '../src/components/views/AllRecipesView'
import HomeView from '../src/components/views/HomeView'
import BottomNav from '../src/components/BottomNav'
import FloatingActionButton from '../src/components/FloatingActionButton'
import RecipeDetail from '../src/components/RecipeDetail'
import ShoppingListView from '../src/components/views/ShoppingListView'
import MealPrepView from '../src/components/views/MealPrepView'
import { parseRecipeTemplate } from '../src/lib/recipeTemplate'
import { recipeImportPrompt } from '../src/lib/recipeImportPrompt'
import template from '../docs/recipe-template.txt?raw'
import '../src/index.css'
import './mobile.css'

const sample = `--- RECIPE ---
Name: Roasted tomato pasta
Servings: 2
Total time (minutes): 25
Source (link or description): https://example.com/recipe
INGREDIENTS
200 | g | pasta
400 | g | cherry tomatoes
2 | tbsp | olive oil
2 | cloves | garlic
| | basil | to taste
STEPS
1. Roast tomatoes and garlic with olive oil at 200°C for 20 minutes.
2. Cook pasta in salted water, reserving some cooking water.
3. Toss everything together with basil and a splash of pasta water.
--- END RECIPE ---`

function ImportPreview({ onClose, onOpenRecipe }) {
  const [url, setUrl] = useState('')
  const [prompt, setPrompt] = useState('')
  const [text, setText] = useState('')
  const [paste, setPaste] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const preview = value => {
    try {
      const result = parseRecipeTemplate(value)
      if (result.errors.length) throw new Error(result.errors.join('\n'))
      setParsed(result); setError(''); setMessage('')
    } catch (err) { setError(err.message) }
  }
  return <main className="import-preview">
    <button className="import-back" onClick={onClose}>‹ &nbsp; My recipes</button>
    <div className="import-eyebrow">FROM SOMEWHERE GOOD</div>
    <h1>A new page<br />in your book.</h1>
    <p className="import-intro">That recipe you saved or sent to yourself.<br />Let’s give it a proper home.</p>
    <div className="import-stages"><span className={!parsed ? 'active' : ''}>1. Add a link</span><i /><span>2. Extract</span><i /><span className={parsed ? 'active' : ''}>3. Review</span></div>
    {!parsed && <>
      <label className="import-label" htmlFor="source-url">Recipe or video link</label>
      <input id="source-url" type="url" value={url} placeholder="Paste a link here…" onChange={e => { setUrl(e.target.value); setError(''); setPrompt(''); setMessage('') }} />
      <button className="import-primary" onClick={async () => {
        try {
          const next = recipeImportPrompt(url, template)
          setPrompt(next); setError('')
          try { await navigator.clipboard.writeText(next); setMessage('Prompt copied. Paste it into Codex or ChatGPT.') }
          catch { setMessage('Copy the prompt below into Codex or ChatGPT.') }
        } catch (err) { setError(err.message) }
      }}>Create recipe prompt ↗</button>
      <p className="import-help">Use the prompt in Codex or ChatGPT to extract your recipe.</p>
      <div className="import-services">{['Websites', 'Instagram', 'Pinterest', 'Videos'].map(s => <span key={s}>{s}</span>)}</div>
      {prompt && <label className="import-label">Your prompt<textarea readOnly rows={6} value={prompt} /></label>}
      <div className="import-existing"><h2>Already have the recipe?</h2><button className="import-secondary" onClick={() => setPaste(v => !v)}>Paste recipe or upload file</button>
        {paste && <div className="import-paste"><label className="import-label">Recipe template<textarea rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="Paste your completed recipe template…" /></label><label className="import-upload">Choose a .txt file<input aria-label="Recipe text file" type="file" accept=".txt,text/plain" onChange={async e => { const file = e.target.files[0]; if (file) { if (file.size > 500000) { setError('Use a file smaller than 500 KB.'); return } const value = await file.text(); setText(value); preview(value) } }} /></label><button className="import-primary" onClick={() => preview(text)}>Preview recipe</button></div>}
        <button className="import-sample" onClick={() => { setText(sample); preview(sample) }}>Try a sample recipe →</button>
      </div>
    </>}
    {parsed && <div className="import-review"><div className="import-eyebrow">REVIEW BEFORE SAVING</div>{parsed.recipes.map(r => <article key={r.id}><h2>{r.title}</h2><p className="import-help">{[r.servings && `${r.servings} servings`, r.total_minutes && `${r.total_minutes} minutes`].filter(Boolean).join(' · ')}</p><h3>Ingredients</h3>{r.ingredients.map((g, i) => <div key={i}>{g.group && <h4>{g.group}</h4>}{g.items.map(item => <label className="import-ingredient" key={item.id}><input type="checkbox" />{[item.amount, item.unit, item.name, item.note].filter(Boolean).join(' ')}</label>)}</div>)}<h3>Method</h3>{r.steps.map((g, i) => <div key={i}>{g.group && <h4>{g.group}</h4>}<ol>{g.items.map(item => <li key={item.id}>{item.content}</li>)}</ol></div>)}<p className="import-help">Source: {r.source}</p></article>)}<button className="import-primary" disabled={saved} onClick={() => { setSaved(true); setMessage('Preview complete. Your real cookbook has not been changed.') }}>{saved ? 'Recipe reviewed ✓' : 'Add to my recipe book'}</button>{saved && <button className="import-secondary" onClick={() => onOpenRecipe(parsed.recipes[0])}>Open recipe in the app layout</button>}<button className="import-sample" onClick={() => { setParsed(null); setSaved(false) }}>Back to import</button></div>}
    {error && <p className="import-error" role="alert">{error}</p>}
    {message && <p className="import-help" role="status">{message}</p>}
    <div className="import-preview-note">DESIGN PREVIEW · NO ACCOUNT CHANGES</div>
  </main>
}

const demoShopping = DEMO_RECIPES.filter(r => ['demo-gyoza', 'demo-caprese'].includes(r.id)).flatMap(r =>
  r.ingredients.flatMap(g => g.items.map(item => ({ ...item, id: `${r.id}-${item.id}`, recipe_id: r.id, checked: false })))
)

const demoPlannerGroups = (() => {
  const monday = new Date()
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1)
  const date = offset => {
    const day = new Date(monday)
    day.setDate(day.getDate() + offset)
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  }
  return [...DEMO_MEAL_GROUPS, {
    id: 'preview-week', name: `Week of ${date(0)}`, recipe_ids: ['demo-gyoza', 'demo-chili'],
    notes: `myrecipes-week-v1:${JSON.stringify({ assignments: { 'demo-gyoza': [date(1), date(2)], 'demo-chili': [date(3), date(4)] }, dayNotes: { [date(5)]: 'Eating out with friends' } })}`,
  }]
})()

export default function Preview() {
  const [tab, setTab] = useState(() => {
    const screen = new URLSearchParams(location.search).get('screen')
    return ['shopping', 'mealprep'].includes(screen) ? screen : 'recipes'
  })
  const [recipe, setRecipe] = useState(() => new URLSearchParams(location.search).get('screen') === 'ingredients' ? DEMO_RECIPES.find(r => r.id === 'demo-gyoza') : null)
  const [importing, setImporting] = useState(false)
  const [compact, setCompact] = useState(false)
  const [grouped, setGrouped] = useState(false)
  const [mergeMode, setMergeMode] = useState(false)
  const [message, setMessage] = useState('')
  const [units, setUnits] = useState('metric')
  const counts = Object.fromEntries(DEMO_RECIPES.map(r => {
    const entries = DEMO_COOK_LOG.filter(c => c.recipe_id === r.id)
    return [r.id, { count: entries.length, lastCooked: entries[0]?.cooked_on }]
  }))
  const select = selected => { setRecipe(selected); setMessage('') }
  const openImport = () => { setImporting(true); setMessage('') }
  return <LanguageContext.Provider value="en"><div className="preview-app">
    {importing ? <div className="preview-scroll"><ImportPreview onClose={() => setImporting(false)} onOpenRecipe={r => { setImporting(false); setRecipe(r) }} /></div> : recipe ? <div className="preview-scroll"><RecipeDetail recipe={recipe} onClose={() => setRecipe(null)} isGuest unitSystem={units} onToggleUnitSystem={() => setUnits(u => u === 'metric' ? 'imperial' : 'metric')} /></div> : <>
      <div className={`preview-scroll ${tab === 'home' ? 'preview-home' : ''}`}>
        {tab === 'recipes' && <AllRecipesView recipes={DEMO_RECIPES} loading={false} onSelect={select} cookCounts={counts} compactMode={compact} onCompactModeChange={setCompact} groupedView={grouped} onGroupedViewChange={setGrouped} mergeMode={mergeMode} onMergeModeChange={setMergeMode} isGuest={false} />}
        {tab === 'home' && <HomeView recipes={DEMO_RECIPES} cookStats={counts} onSelectRecipe={select} onAddRecipe={() => setMessage('This opens your existing add-recipe wizard.')} onImportRecipe={openImport} onLogCook={() => setMessage('This opens your existing cooking log.')} onOpenStats={() => setMessage('Your existing stats view stays the same.')} isGuest={false} />}
        {tab === 'shopping' && <ShoppingListView isGuest recipes={DEMO_RECIPES} demoItems={demoShopping} />}
        {tab === 'mealprep' && <MealPrepView recipes={DEMO_RECIPES} onSelectRecipe={select} isGuest demoMealGroups={demoPlannerGroups} demoShoppingRecipeIds={['demo-gyoza', 'demo-caprese']} cookStats={counts} />}
        {!['home', 'recipes', 'shopping', 'mealprep'].includes(tab) && <div className="preview-placeholder"><h1>Settings</h1><p>This preview focuses on recipes, shopping and meal prep.</p><button onClick={() => setTab('recipes')}>Back to recipes</button></div>}
      </div>
      {message && <button className="preview-message" onClick={() => setMessage('')}>{message} ×</button>}
      {tab !== 'home' && !(tab === 'recipes' && mergeMode) && <FloatingActionButton onAddRecipe={() => setMessage('This opens your existing add-recipe wizard.')} onImportRecipe={openImport} onGroupRecipes={() => { setTab('recipes'); setMergeMode(true) }} onLogCook={() => setMessage('This opens your existing cooking log.')} />}
      <BottomNav active={tab} onChange={value => { setTab(value); setMessage('') }} />
    </>}
  </div></LanguageContext.Provider>
}
