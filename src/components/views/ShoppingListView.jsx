import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { normalizeName, formatAmount } from '../../lib/ingredientParser'
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadItems() }, [isGuest])

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

  // Delete a whole merged row in one request rather than one per underlying id.
  const removeGroup = async (ids) => {
    setItems(prev => prev.filter(i => !ids.includes(i.id)))
    if (isGuest) return
    await supabase.from('shopping_list').delete().in('id', ids)
  }

  // Tick or untick every underlying item, driving them all to the same state.
  // Toggling each one independently left mixed rows permanently unticked.
  const setGroupChecked = async (ids, checked) => {
    const affected = items.filter(i => ids.includes(i.id) && !!i.checked !== checked)
    if (affected.length === 0) return
    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, checked } : i))
    if (isGuest) return
    await supabase.from('shopping_list').update({ checked }).in('id', affected.map(i => i.id))
  }

  // Group + merge by normalized name. Amounts are totalled *per unit* — mixing
  // "200 g ui" with "2 ui" used to drop the second one entirely.
  const grouped = {}
  for (const item of items) {
    const key = normalizeName(item.name)
    if (!grouped[key]) grouped[key] = { displayName: item.name, byUnit: new Map(), ids: [], checked: true }
    const g = grouped[key]
    g.ids.push(item.id)
    if (!item.checked) g.checked = false
    const amount = Number(item.amount)
    if (item.amount !== null && Number.isFinite(amount)) {
      const unitKey = item.unit || ''
      g.byUnit.set(unitKey, (g.byUnit.get(unitKey) || 0) + amount)
    }
  }
  const mergedList = Object.values(grouped).map(g => ({
    ...g,
    amountLabel: [...g.byUnit.entries()]
      .map(([unit, total]) => `${formatAmount(total)}${unit ? ` ${unit}` : ''}`)
      .join(' + '),
  }))

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
              <SwipeToDelete key={g.ids.join('-')} onDelete={() => removeGroup(g.ids)}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderBottom: i < mergedList.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <button
                    onClick={() => setGroupChecked(g.ids, !g.checked)}
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
                      {g.amountLabel || '\u00A0'}
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
