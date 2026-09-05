import { useState } from 'react'
import { scaleAmount } from '../../lib/ingredientParser'
import { convertIngredient, formatConvertedAmount } from '../../lib/unitConverter'
import { useT } from '../../lib/i18n'

export default function IngredientsTab({
  ingredients, baseServings, servings, unitSystem, onServingsChange,
  variants = [], activeVariant, onVariantChange,
  checkedIngredients, onToggleChecked, onAddToShoppingList, addedToList,
  recipeNotes = '', swappedIngredients, onSwappedIngredientsChange,
}) {
  const { t } = useT()
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [showSwaps, setShowSwaps] = useState(true)
  const toggleGroup = (gi) => setCollapsedGroups(prev => ({ ...prev, [gi]: !prev[gi] }))

  return (
    <div>
      {/* Servings adjuster — first thing on this tab so scaling happens before reading amounts */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 7, marginBottom: 12 }}>
      {baseServings && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '7px 9px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>{t('ingredientsTab.servings')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <StepperBtn onClick={() => onServingsChange(s => Math.max(1, (s || baseServings) - 1))}>−</StepperBtn>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, minWidth: 24, textAlign: 'center' }}>{servings || baseServings}</span>
            <StepperBtn onClick={() => onServingsChange(s => (s || baseServings) + 1)}>+</StepperBtn>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
        {/halloumi/i.test(recipeNotes || '') && (
        <button onClick={() => setShowSwaps(value => !value)} style={compactControlStyle}>
          {showSwaps ? 'Hide swaps' : 'Show swaps'}
        </button>
        )}
        {variants.length > 0 && (
          <select
            value={activeVariant}
            onChange={e => onVariantChange(e.target.value)}
            style={{
              maxWidth: 116, padding: '0 7px', borderRadius: 8, border: '1px solid var(--line)',
              background: 'var(--card)', color: 'var(--tomato-deep)', fontFamily: 'var(--font-mono)',
              fontWeight: 700, fontSize: 10, cursor: 'pointer',
            }}
          >
            <option value="main">{t('ingredientsTab.original')}</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        )}
      </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <SectionLabel>{t('ingredientsTab.label')}</SectionLabel>
        <button onClick={onAddToShoppingList} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: addedToList ? 'var(--sage)' : 'var(--tomato-deep)',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
        }}>{addedToList ? t('ingredientsTab.added') : t('ingredientsTab.addToList')}</button>
      </div>
      <div>
        {ingredients.length === 0 && <EmptyRow>{t('ingredientsTab.noIngredients')}</EmptyRow>}
        {ingredients.map((group, gi) => {
          const isCollapsed = !!collapsedGroups[gi]
          return (
            <section key={gi} style={{ marginBottom: 14, overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: group.group ? '0 13px 5px' : '5px 13px' }}>
              {group.group && (
                <button
                  onClick={() => toggleGroup(gi)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none',
                    minHeight: 38, cursor: 'pointer', padding: 0, marginBottom: isCollapsed ? 0 : 6, textAlign: 'left',
                  }}
                >
                  <span style={{
                    color: 'var(--sage)', fontSize: 11, transition: 'transform 0.15s ease',
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', display: 'inline-block',
                  }}>›</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {group.group} · {group.items.length}
                  </span>
                </button>
              )}
              {!isCollapsed && group.items.map(item => {
                let displayItem = item
                if (baseServings && servings) {
                  displayItem = { ...displayItem, amount: scaleAmount(displayItem.amount, baseServings, servings) }
                }
                displayItem = convertIngredient(displayItem, unitSystem)
                const isChecked = checkedIngredients.has(item.id)
                const hasHalloumiSwap = showSwaps && /serrano/i.test(item.name) && /halloumi/i.test(recipeNotes || '')
                const isSwapped = swappedIngredients?.has(item.id)
                return (
                  <div key={item.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <div
                    onClick={() => onToggleChecked(item.id)}
                    style={{
                    display: 'flex', alignItems: 'center', gap: 8, minHeight: 38, padding: '6px 0', fontFamily: 'var(--font-body)', fontSize: 14,
                      color: isChecked ? 'var(--charcoal-soft)' : 'var(--charcoal)', cursor: 'pointer',
                      textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.6 : 1,
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: isChecked ? 'var(--charcoal-soft)' : 'var(--tomato-deep)', fontWeight: 600, minWidth: 50, flexShrink: 0, display: 'inline-block' }}>
                      {(displayItem.amount !== null || displayItem.unit)
                        ? `${formatConvertedAmount(displayItem.amount)}${displayItem.unit ? ` ${displayItem.unit}` : ''}`
                        : '\u00A0'}
                    </span>
                    <span>
                      {item.name}
                      {item.note && (
                        <span style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--charcoal-soft)', marginLeft: 5 }}>— {item.note}</span>
                      )}
                    </span>
                  </div>
                  {hasHalloumiSwap && (
                    <aside style={{ minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '2px 0 7px 50px', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>
                      <span>&gt; <b>Vegetarian swap</b> · 200 g halloumi</span>
                      <button onClick={() => onSwappedIngredientsChange(prev => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} style={{ height: 24, padding: '0 8px', border: '1px solid var(--line)', borderRadius: 7, background: isSwapped ? 'var(--tomato)' : 'var(--parchment-dim)', color: isSwapped ? '#fffdf9' : 'var(--tomato-deep)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>{isSwapped ? 'Undo' : 'Replace'}</button>
                    </aside>
                  )}
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function StepperBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--parchment)',
        color: 'var(--tomato-deep)', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)',
      }}
    >{children}</button>
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

function EmptyRow({ children }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', padding: '10px 0' }}>{children}</div>
}

const compactControlStyle = { padding: '0 7px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--tomato-deep)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
