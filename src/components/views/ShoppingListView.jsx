import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { normalizeName } from '../../lib/ingredientParser'
import LoadingGyoza from '../LoadingGyoza'
import SwipeToDelete from '../SwipeToDelete'
import { useT } from '../../lib/i18n'

export default function ShoppingListView({ userId, isGuest = false }) {
  const { t } = useT()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [manualInput, setManualInput] = useState('')

  const loadItems = async () => {
    if (isGuest) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('shopping_list').select('*').order('created_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const toggleChecked = async (item) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
    if (isGuest) return
    await supabase.from('shopping_list').update({ checked: !item.checked }).eq('id', item.id)
  }

  const addManualItem = async () => {
    if (!manualInput.trim()) return
    if (isGuest) {
      setItems(prev => [...prev, { id: `guest-${Date.now()}`, name: manualInput.trim(), amount: null, unit: null, recipe_id: null, checked: false }])
      setManualInput('')
      return
    }
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
    setItems(prev => prev.filter(i => !i.checked))
    if (isGuest) return
    await supabase.from('shopping_list').delete().in('id', checkedIds)
  }

  const removeItem = async (item) => {
    setItems(prev => prev.filter(i => i.id !== item.id))
    if (isGuest) return
    await supabase.from('shopping_list').delete().eq('id', item.id)
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
        {t('shopping.title')}
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text" value={manualInput} onChange={e => setManualInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addManualItem()}
          placeholder={t('shopping.addPlaceholder')}
          style={{
            flex: 1, padding: '11px 13px', borderRadius: 9, border: '1px solid var(--line)',
            background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 15,
          }}
        />
        <button onClick={addManualItem} style={{
          padding: '0 16px', borderRadius: 9, border: 'none', background: 'var(--tomato)',
          color: 'var(--card)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>{t('shopping.addBtn')}</button>
      </div>

      {loading ? (
        <LoadingGyoza label={t('shopping.loading')} />
      ) : mergedList.length === 0 ? (
        <Empty>{t('shopping.emptyState')}</Empty>
      ) : (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            {mergedList.map((g, i) => (
              <SwipeToDelete key={i} onDelete={() => g.ids.forEach(id => removeItem({ id }))}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderBottom: i < mergedList.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <button
                    onClick={() => g.ids.forEach(id => toggleChecked(items.find(it => it.id === id)))}
                    style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                      border: `2px solid ${g.checked ? 'var(--sage)' : 'var(--line)'}`,
                      background: g.checked ? 'var(--sage)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--card)', fontSize: 13,
                    }}
                  >{g.checked ? '✓' : ''}</button>
                  <div style={{
                    flex: 1, fontFamily: 'var(--font-body)', fontSize: 15, display: 'flex', alignItems: 'baseline', gap: 6,
                    color: g.checked ? 'var(--charcoal-soft)' : 'var(--charcoal)',
                    textDecoration: g.checked ? 'line-through' : 'none',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--tomato-deep)', fontWeight: 600, minWidth: 44, flexShrink: 0, display: 'inline-block' }}>
                      {g.hasAmount ? `${Number.isInteger(g.amount) ? g.amount : g.amount.toFixed(1)}${g.unit ? ` ${g.unit}` : ''}` : '\u00A0'}
                    </span>
                    <span>{g.displayName}</span>
                  </div>
                </div>
              </SwipeToDelete>
            ))}
          </div>

          {checkedCount > 0 && (
            <button onClick={clearChecked} style={{
              width: '100%', padding: '11px 0', borderRadius: 9, border: '1px solid var(--line)',
              background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>{t('shopping.clearChecked')(checkedCount)}</button>
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
