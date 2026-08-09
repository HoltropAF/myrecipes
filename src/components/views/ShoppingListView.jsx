import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { normalizeName, formatAmount } from '../../lib/ingredientParser'
import { classifyAisle, isPantryStaple, AISLE_ORDER } from '../../lib/aisles'
import LoadingGyoza from '../LoadingGyoza'
import SwipeToDelete from '../SwipeToDelete'
import { useT } from '../../lib/i18n'

const GROUPING_KEY = 'mr_shopping_grouping_v1'

export default function ShoppingListView({ userId, isGuest = false, recipes = [] }) {
  const { t } = useT()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [manualInput, setManualInput] = useState('')
  // Remembered because it's a standing preference about how you shop, not a
  // per-visit choice — but kept local rather than in user_preferences, which is
  // a draft+Save screen and would make this a two-step toggle.
  const [grouping, setGrouping] = useState(() => {
    try { return localStorage.getItem(GROUPING_KEY) || 'aisle' } catch { return 'aisle' }
  })

  const changeGrouping = (next) => {
    setGrouping(next)
    try { localStorage.setItem(GROUPING_KEY, next) } catch { /* storage disabled */ }
  }

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
  const mergedList = useMemo(() => {
    const grouped = {}
    for (const item of items) {
      const key = normalizeName(item.name)
      if (!grouped[key]) {
        grouped[key] = {
          key,
          displayName: item.name,
          byUnit: new Map(),
          ids: [],
          recipeIds: new Set(),
          checked: true,
          aisle: classifyAisle(item.name),
          staple: isPantryStaple(key),
        }
      }
      const g = grouped[key]
      g.ids.push(item.id)
      if (item.recipe_id) g.recipeIds.add(item.recipe_id)
      if (!item.checked) g.checked = false
      const amount = Number(item.amount)
      if (item.amount !== null && Number.isFinite(amount)) {
        const unitKey = item.unit || ''
        g.byUnit.set(unitKey, (g.byUnit.get(unitKey) || 0) + amount)
      }
    }
    return Object.values(grouped).map(g => ({
      ...g,
      amountLabel: [...g.byUnit.entries()]
        .map(([unit, total]) => `${formatAmount(total)}${unit ? ` ${unit}` : ''}`)
        .join(' + '),
    }))
  }, [items])

  // Sections in the order you walk the shop. Pantry staples are pulled out of
  // their aisle into a dimmed group at the end — "zout" sitting between two
  // things you actually need to buy is noise.
  const sections = useMemo(() => {
    if (grouping === 'flat') {
      return [{ key: 'all', label: null, rows: mergedList, dimmed: false }]
    }
    const staples = mergedList.filter(row => row.staple)
    const rest = mergedList.filter(row => !row.staple)
    const byAisle = new Map()
    for (const row of rest) {
      if (!byAisle.has(row.aisle)) byAisle.set(row.aisle, [])
      byAisle.get(row.aisle).push(row)
    }
    const out = AISLE_ORDER
      .filter(key => byAisle.has(key))
      .map(key => ({ key, label: t(`shopping.aisle.${key}`, key), rows: byAisle.get(key), dimmed: false }))
    if (staples.length > 0) {
      out.push({ key: 'staples', label: t('shopping.aisle.staples'), rows: staples, dimmed: true })
    }
    return out
  }, [mergedList, grouping, t])

  const recipeTitle = (id) => recipes.find(r => r.id === id)?.title || null

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

      {!loading && mergedList.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['aisle', 'flat'].map(mode => (
            <button
              key={mode}
              onClick={() => changeGrouping(mode)}
              style={{
                padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                border: `1px solid ${grouping === mode ? 'var(--tomato)' : 'var(--line)'}`,
                background: grouping === mode ? 'var(--tomato)' : 'var(--card)',
                color: grouping === mode ? 'var(--card)' : 'var(--charcoal-soft)',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
              }}
            >{t(`shopping.grouping.${mode}`)}</button>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingGyoza label={t('shopping.loading')} />
      ) : mergedList.length === 0 ? (
        <Empty>{t('shopping.emptyState')}</Empty>
      ) : (
        <>
          {sections.map(section => (
            <div key={section.key} style={{ marginBottom: 14 }}>
              {section.label && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10.5, textTransform: 'uppercase',
                  letterSpacing: '0.09em', color: 'var(--charcoal-soft)',
                  marginBottom: 6, opacity: section.dimmed ? 0.7 : 1,
                }}>
                  {section.label}
                  {section.dimmed && (
                    <span style={{ textTransform: 'none', letterSpacing: 0 }}> · {t('shopping.probablyHave')}</span>
                  )}
                </div>
              )}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
                overflow: 'hidden', opacity: section.dimmed ? 0.6 : 1,
              }}>
                {section.rows.map((g, i) => {
                  const sources = [...g.recipeIds].map(recipeTitle).filter(Boolean)
                  return (
                    <SwipeToDelete key={g.key} onDelete={() => removeGroup(g.ids)}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                        borderBottom: i < section.rows.length - 1 ? '1px solid var(--line)' : 'none',
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
                          flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontSize: 15,
                          color: g.checked ? 'var(--charcoal-soft)' : 'var(--charcoal)',
                          textDecoration: g.checked ? 'line-through' : 'none',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--tomato-deep)', fontWeight: 600, minWidth: 44, flexShrink: 0, display: 'inline-block' }}>
                              {g.amountLabel || ' '}
                            </span>
                            <span>{g.displayName}</span>
                          </div>
                          {/* Which recipe put this on the list. recipe_id has
                              been stored since the beginning and never shown. */}
                          {sources.length > 0 && !g.checked && (
                            <div style={{
                              fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)',
                              marginTop: 2, marginLeft: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {sources.slice(0, 2).join(' · ')}
                              {sources.length > 2 && ` +${sources.length - 2}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </SwipeToDelete>
                  )
                })}
              </div>
            </div>
          ))}

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
