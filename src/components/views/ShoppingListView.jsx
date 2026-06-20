import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Normalize an ingredient name for merging: lowercase, strip common descriptors
function normalizeName(name) {
  let n = name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(rode?|witte?|grote?|kleine?|fijne?|verse?|gedroogde?|fresh|finely|chopped|diced|sliced|minced)\b/g, '')
    .replace(/[,.]/g, '')
    .trim()
  // Singularize common plural patterns, while protecting words that are already
  // singular and just happen to end in 's' (e.g. "kaas", "ananas", "asperges" stays as-is
  // since stripping would give the wrong singular anyway for short Dutch words).
  if (n.length > 4) {
    if (/[^aeiou]oes$/.test(n)) n = n.slice(0, -2)       // tomatoes -> tomato, potatoes -> potato
    else if (/[a-z]s$/.test(n) && !/[aeiou]s$/.test(n)) n = n.slice(0, -1) // onions -> onion, eggs -> egg
  }
  return n
}

export default function ShoppingListView({ userId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [manualInput, setManualInput] = useState('')

  const loadItems = async () => {
    setLoading(true)
    const { data } = await supabase.from('shopping_list').select('*').order('created_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const toggleChecked = async (item) => {
    await supabase.from('shopping_list').update({ checked: !item.checked }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
  }

  const addManualItem = async () => {
    if (!manualInput.trim()) return
    const { data, error } = await supabase.from('shopping_list').insert({
      user_id: userId, name: manualInput.trim(), amount: null, unit: null, recipe_id: null,
    }).select().single()
    if (!error) {
      setItems(prev => [...prev, data])
      setManualInput('')
    }
  }

  const clearChecked = async () => {
    const checkedIds = items.filter(i => i.checked).map(i => i.id)
    if (checkedIds.length === 0) return
    await supabase.from('shopping_list').delete().in('id', checkedIds)
    setItems(prev => prev.filter(i => !i.checked))
  }

  const removeItem = async (item) => {
    await supabase.from('shopping_list').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  // Group + merge by normalized name
  const grouped = {}
  for (const item of items) {
    const key = normalizeName(item.name)
    if (!grouped[key]) grouped[key] = { displayName: item.name, amount: 0, unit: item.unit, hasAmount: false, ids: [], checked: true }
    const g = grouped[key]
    g.ids.push(item.id)
    if (!item.checked) g.checked = false
    if (item.amount !== null && item.unit === g.unit) {
      g.amount += item.amount
      g.hasAmount = true
    } else if (item.amount !== null && !g.hasAmount) {
      g.amount = item.amount
      g.unit = item.unit
      g.hasAmount = true
    }
  }
  const mergedList = Object.values(grouped)

  const checkedCount = items.filter(i => i.checked).length

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>
        Boodschappenlijst
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text" value={manualInput} onChange={e => setManualInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addManualItem()}
          placeholder="Add an item…"
          style={{
            flex: 1, padding: '11px 13px', borderRadius: 9, border: '1px solid var(--line)',
            background: '#fffdf9', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 15,
          }}
        />
        <button onClick={addManualItem} style={{
          padding: '0 16px', borderRadius: 9, border: 'none', background: 'var(--tomato)',
          color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>Add</button>
      </div>

      {loading ? (
        <Empty>loading…</Empty>
      ) : mergedList.length === 0 ? (
        <Empty>Your list is empty. Add items above, or add ingredients from a recipe.</Empty>
      ) : (
        <>
          <div style={{ background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            {mergedList.map((g, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                borderBottom: i < mergedList.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <button
                  onClick={() => g.ids.forEach(id => toggleChecked(items.find(it => it.id === id)))}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                    border: `2px solid ${g.checked ? 'var(--sage)' : 'var(--line)'}`,
                    background: g.checked ? 'var(--sage)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fffdf9', fontSize: 13,
                  }}
                >{g.checked ? '✓' : ''}</button>
                <div style={{
                  flex: 1, fontFamily: 'var(--font-body)', fontSize: 15,
                  color: g.checked ? 'var(--charcoal-soft)' : 'var(--charcoal)',
                  textDecoration: g.checked ? 'line-through' : 'none',
                }}>
                  {g.hasAmount && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--tomato-deep)', fontWeight: 600, marginRight: 6 }}>
                      {Number.isInteger(g.amount) ? g.amount : g.amount.toFixed(1)}{g.unit ? ` ${g.unit}` : ''}
                    </span>
                  )}
                  {g.displayName}
                </div>
                <button
                  onClick={() => g.ids.forEach(id => removeItem({ id }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal-soft)', fontSize: 16, padding: '0 4px' }}
                >×</button>
              </div>
            ))}
          </div>

          {checkedCount > 0 && (
            <button onClick={clearChecked} style={{
              width: '100%', padding: '11px 0', borderRadius: 9, border: '1px solid var(--line)',
              background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>Clear {checkedCount} checked item{checkedCount !== 1 ? 's' : ''}</button>
          )}
        </>
      )}
    </div>
  )
}

function Empty({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13, textAlign: 'center', padding: '40px 0', lineHeight: 1.6 }}>
      {children}
    </div>
  )
}
