import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { normalizeName } from '../../lib/ingredientParser'

// Pantry staples so common to almost every recipe that sharing them is meaningless
// for a "these go well together" suggestion (would otherwise pair nearly everything).
const PANTRY_STAPLES = new Set([
  'zout', 'peper', 'olijfolie', 'olie', 'water', 'suiker', 'boter', 'bloem',
  'salt', 'pepper', 'oil', 'sugar', 'butter', 'flour', 'ui', 'onion', 'knoflook', 'garlic',
])

// Main proteins / key ingredients worth grouping recipes by — "stock up on X, make these"
const MAIN_INGREDIENTS = [
  { key: 'kip', label: 'Chicken', match: /kipfilet|chicken breast|chicken fillet|\bkip\b|\bchicken\b/i },
  { key: 'rundvlees', label: 'Beef', match: /rundvlees|\bbeef\b|short rib|sukade|ground beef|gehakt/i },
  { key: 'varkensvlees', label: 'Pork', match: /pork belly|pork shoulder|\bspek\b|\bbacon\b|spekjes|ground pork/i },
  { key: 'zalm', label: 'Salmon', match: /\bzalm\b|\bsalmon\b/i },
  { key: 'tofu', label: 'Tofu', match: /\btofu\b/i },
  { key: 'kikkererwten', label: 'Chickpeas', match: /kikkererwten|chickpea/i },
  { key: 'kaas', label: 'Cheese', match: /\bkaas\b|\bcheese\b|mozzarella|feta|mascarpone/i },
  { key: 'pasta', label: 'Pasta', match: /\bpasta\b|tagliatelle|lasagne/i },
  { key: 'rijst', label: 'Rice', match: /\brijst\b|\brice\b/i },
  { key: 'aardappel', label: 'Potato', match: /aardappel|\bpotato/i },
]

function getIngredientSet(recipe) {
  const names = new Set()
  for (const group of recipe.ingredients || []) {
    for (const item of group.items || []) {
      const n = normalizeName(item.name)
      if (n.length > 2 && !PANTRY_STAPLES.has(n)) names.add(n)
    }
  }
  return names
}

function getMainIngredientKeys(recipe) {
  const allText = (recipe.ingredients || [])
    .flatMap(g => g.items || [])
    .map(item => item.name)
    .join(' | ')
  return MAIN_INGREDIENTS.filter(m => m.match.test(allText)).map(m => m.key)
}

const MIN_GROUP_SIZE = 3

function buildSuggestions(recipes) {
  // 1. By shared main ingredient/protein (3+ recipes)
  const byMain = []
  for (const main of MAIN_INGREDIENTS) {
    const matches = recipes.filter(r => getMainIngredientKeys(r).includes(main.key))
    if (matches.length >= MIN_GROUP_SIZE) {
      byMain.push({ type: 'ingredient', label: main.label, recipes: matches })
    }
  }

  // 2. By category + subcategory (3+ recipes)
  const catMap = {}
  for (const r of recipes) {
    const key = r.subcategory ? `${r.category} · ${r.subcategory}` : r.category
    if (!key) continue
    if (!catMap[key]) catMap[key] = []
    catMap[key].push(r)
  }
  const byCategory = Object.entries(catMap)
    .filter(([, list]) => list.length >= MIN_GROUP_SIZE)
    .map(([key, list]) => ({ type: 'category', label: key, recipes: list }))

  // 3. By shared distinctive ingredients across 3+ recipes (not just pairs)
  const sets = recipes.map(r => ({ recipe: r, set: getIngredientSet(r) }))
  const ingredientToRecipes = {}
  for (const { recipe, set } of sets) {
    for (const ing of set) {
      if (!ingredientToRecipes[ing]) ingredientToRecipes[ing] = []
      ingredientToRecipes[ing].push(recipe)
    }
  }
  const byIngredientOverlap = Object.entries(ingredientToRecipes)
    .filter(([, list]) => list.length >= MIN_GROUP_SIZE && list.length <= 8)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([ingredient, list]) => ({ type: 'overlap', label: ingredient, recipes: list }))

  // 4. Freezer batch-cook combos: freezer-friendly AND share a main ingredient (3+ recipes)
  const byFreezerBatch = []
  for (const main of MAIN_INGREDIENTS) {
    const matches = recipes.filter(r => r.freezer_friendly === true && getMainIngredientKeys(r).includes(main.key))
    if (matches.length >= MIN_GROUP_SIZE) {
      byFreezerBatch.push({ type: 'freezer', label: main.label, recipes: matches })
    }
  }

  return { byMain, byCategory, byIngredientOverlap, byFreezerBatch }
}

export default function MealPrepView({ recipes, onSelectRecipe }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)

  const loadGroups = async () => {
    setLoading(true)
    const { data } = await supabase.from('meal_groups').select('*').order('created_at', { ascending: false })
    setGroups(data || [])
    setLoading(false)
  }

  useEffect(() => { loadGroups() }, [])

  const { byMain, byCategory, byIngredientOverlap, byFreezerBatch } = useMemo(() => buildSuggestions(recipes), [recipes])

  const handleDeleteGroup = async (id) => {
    await supabase.from('meal_groups').delete().eq('id', id)
    loadGroups()
  }

  const saveSuggestionAsGroup = async (suggestion) => {
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    if (!user_id) return
    await supabase.from('meal_groups').insert({
      user_id,
      name: suggestionTitle(suggestion),
      recipe_ids: suggestion.recipes.map(r => r.id),
    })
    loadGroups()
  }

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)' }}>Meal Prep</h1>
        <button onClick={() => setShowBuilder(true)} style={addBtnStyle}>+ New group</button>
      </div>

      {showBuilder && (
        <GroupBuilder
          recipes={recipes}
          onClose={() => setShowBuilder(false)}
          onSaved={() => { setShowBuilder(false); loadGroups() }}
        />
      )}

      {/* Your saved groups */}
      <SectionLabel>Your groups</SectionLabel>
      {loading ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>loading…</div>
      ) : groups.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', marginBottom: 20 }}>
          No groups yet — tap "+ New group", or save one of the suggestions below.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {groups.map(g => (
            <GroupCard key={g.id} group={g} recipes={recipes} onSelectRecipe={onSelectRecipe} onDelete={() => handleDeleteGroup(g.id)} />
          ))}
        </div>
      )}

      {/* Freezer batch-cook combos */}
      {byFreezerBatch.length > 0 && (
        <SuggestionSection
          title="🧊 Batch-cook & freeze"
          description="These freeze well and share a main ingredient — cook once, freeze portions."
          suggestions={byFreezerBatch}
          onSelectRecipe={onSelectRecipe}
          onSave={saveSuggestionAsGroup}
        />
      )}

      {/* By shared protein/main ingredient */}
      {byMain.length > 0 && (
        <SuggestionSection
          title="🥩 Stock up on one ingredient"
          description="3 or more recipes built around the same main ingredient."
          suggestions={byMain}
          onSelectRecipe={onSelectRecipe}
          onSave={saveSuggestionAsGroup}
        />
      )}

      {/* By category */}
      {byCategory.length > 0 && (
        <SuggestionSection
          title="📂 Same category"
          description="A rotation of recipes from the same part of your cookbook."
          suggestions={byCategory}
          onSelectRecipe={onSelectRecipe}
          onSave={saveSuggestionAsGroup}
        />
      )}

      {/* By shared distinctive ingredients */}
      {byIngredientOverlap.length > 0 && (
        <SuggestionSection
          title="🛒 Shared shopping list"
          description="Recipes that all use the same less-common ingredient — buy once, use across meals."
          suggestions={byIngredientOverlap}
          onSelectRecipe={onSelectRecipe}
          onSave={saveSuggestionAsGroup}
        />
      )}

      {byMain.length === 0 && byCategory.length === 0 && byIngredientOverlap.length === 0 && byFreezerBatch.length === 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>
          No groupings of 3+ recipes found yet — add more recipes to unlock suggestions.
        </div>
      )}
    </div>
  )
}

function suggestionTitle(s) {
  if (s.type === 'ingredient') return `${s.label} recipes`
  if (s.type === 'freezer') return `${s.label} batch-cook & freeze`
  if (s.type === 'category') return s.label
  return `Recipes with ${s.label}`
}

function SuggestionSection({ title, description, suggestions, onSelectRecipe, onSave }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 10, lineHeight: 1.5 }}>
        {description}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{ background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--charcoal)' }}>
                {suggestionTitle(s)} <span style={{ color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>({s.recipes.length})</span>
              </div>
              <button onClick={() => onSave(s)} style={savePillStyle}>+ Save as group</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {s.recipes.map(r => (
                <button key={r.id} onClick={() => onSelectRecipe(r)} style={chipStyle}>{r.title}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GroupCard({ group, recipes, onSelectRecipe, onDelete }) {
  const groupRecipes = group.recipe_ids.map(id => recipes.find(r => r.id === id)).filter(Boolean)
  return (
    <div style={{ background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--charcoal)' }}>{group.name}</div>
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato)', fontSize: 16 }}>×</button>
      </div>
      {group.notes && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal-soft)', marginBottom: 8 }}>{group.notes}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {groupRecipes.map(r => (
          <button key={r.id} onClick={() => onSelectRecipe(r)} style={chipStyle}>{r.title}</button>
        ))}
      </div>
    </div>
  )
}

function GroupBuilder({ recipes, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState([])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return recipes.slice(0, 20)
    const q = query.trim().toLowerCase()
    return recipes.filter(r => r.title.toLowerCase().includes(q)).slice(0, 20)
  }, [recipes, query])

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSave = async () => {
    if (!name.trim() || selected.length === 0) return
    setSaving(true)
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    if (!user_id) {
      setError('Not signed in — please reload and try again.')
      setSaving(false)
      return
    }
    const { error: insertError } = await supabase.from('meal_groups').insert({
      user_id, name: name.trim(), notes: notes.trim() || null, recipe_ids: selected,
    })
    setSaving(false)
    if (insertError) {
      setError('Could not save — check your connection and try again.')
      return
    }
    onSaved()
  }

  return (
    <div style={{ background: 'var(--parchment-dim)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        <span style={labelTextStyle}>group name</span>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sunday batch cook" style={inputStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        <span style={labelTextStyle}>notes (optional)</span>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. makes 5 lunches" style={inputStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        <span style={labelTextStyle}>pick recipes ({selected.length} selected)</span>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" style={inputStyle} />
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
        {filtered.map(r => (
          <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fffdf9', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)' }}>{r.title}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={!name.trim() || selected.length === 0 || saving} style={saveBtnStyle}>
          {saving ? 'Saving…' : 'Save group'}
        </button>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
      </div>
      {error && (
        <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--tomato-deep)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
    }}>{children}</div>
  )
}

const addBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--tomato)',
  color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
const labelTextStyle = { fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)' }
const inputStyle = {
  padding: '9px 11px', borderRadius: 8, border: '1px solid var(--line)',
  background: '#fffdf9', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14, width: '100%', boxSizing: 'border-box',
}
const saveBtnStyle = {
  flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
  background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
const cancelBtnStyle = {
  flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid var(--line)',
  background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
}
const chipStyle = {
  padding: '6px 11px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--parchment-dim)',
  color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
const savePillStyle = {
  padding: '5px 10px', borderRadius: 99, border: '1px solid var(--sage)', background: 'none',
  color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
}
const linkTitleStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal)',
  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, textAlign: 'left', flex: 1,
}
