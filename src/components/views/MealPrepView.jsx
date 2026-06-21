import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { normalizeName } from '../../lib/ingredientParser'

// Pantry staples so common to almost every recipe that sharing them is meaningless
// for a "these go well together" suggestion (would otherwise pair nearly everything).
const PANTRY_STAPLES = new Set([
  'zout', 'peper', 'olijfolie', 'olie', 'water', 'suiker', 'boter', 'bloem',
  'salt', 'pepper', 'oil', 'sugar', 'butter', 'flour', 'ui', 'onion', 'knoflook', 'garlic',
])

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

  // Auto-suggest pairings: recipes that share 2+ significant ingredients
  const suggestions = useMemo(() => {
    const sets = recipes.map(r => ({ recipe: r, set: getIngredientSet(r) }))
    const pairs = []
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const shared = [...sets[i].set].filter(x => sets[j].set.has(x))
        if (shared.length >= 2) {
          pairs.push({ a: sets[i].recipe, b: sets[j].recipe, shared })
        }
      }
    }
    return pairs.sort((x, y) => y.shared.length - x.shared.length).slice(0, 8)
  }, [recipes])

  const handleDeleteGroup = async (id) => {
    await supabase.from('meal_groups').delete().eq('id', id)
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
          No groups yet — tap "+ New group" to bundle recipes together, or check the suggestions below.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {groups.map(g => (
            <GroupCard key={g.id} group={g} recipes={recipes} onSelectRecipe={onSelectRecipe} onDelete={() => handleDeleteGroup(g.id)} />
          ))}
        </div>
      )}

      {/* Auto-suggested pairings */}
      <SectionLabel>Suggested pairings</SectionLabel>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginBottom: 10, lineHeight: 1.5 }}>
        Recipes that share several ingredients — good candidates for a shared shopping trip.
      </div>
      {suggestions.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>No strong overlaps found yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suggestions.map((s, i) => (
            <div key={i} style={{ background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <button onClick={() => onSelectRecipe(s.a)} style={linkTitleStyle}>{s.a.title}</button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)' }}>+</span>
                <button onClick={() => onSelectRecipe(s.b)} style={linkTitleStyle}>{s.b.title}</button>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
                shared: {s.shared.slice(0, 5).join(', ')}{s.shared.length > 5 ? `, +${s.shared.length - 5} more` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
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

  const filtered = useMemo(() => {
    if (!query.trim()) return recipes.slice(0, 20)
    const q = query.trim().toLowerCase()
    return recipes.filter(r => r.title.toLowerCase().includes(q)).slice(0, 20)
  }, [recipes, query])

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSave = async () => {
    if (!name.trim() || selected.length === 0) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    await supabase.from('meal_groups').insert({
      user_id, name: name.trim(), notes: notes.trim() || null, recipe_ids: selected,
    })
    setSaving(false)
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
const linkTitleStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal)',
  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, textAlign: 'left', flex: 1,
}
