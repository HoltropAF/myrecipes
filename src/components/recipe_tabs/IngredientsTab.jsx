import { useState } from 'react'
import { scaleAmount } from '../../lib/ingredientParser'
import { convertIngredient, formatConvertedAmount } from '../../lib/unitConverter'

export default function IngredientsTab({
  ingredients, baseServings, servings, unitSystem, onServingsChange,
  variants = [], activeVariant, onVariantChange,
  checkedIngredients, onToggleChecked, onAddToShoppingList, addedToList,
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const toggleGroup = (gi) => setCollapsedGroups(prev => ({ ...prev, [gi]: !prev[gi] }))

  return (
    <div>
      {/* Servings adjuster — first thing on this tab so scaling happens before reading amounts */}
      {baseServings && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>servings</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <StepperBtn onClick={() => onServingsChange(s => Math.max(1, (s || baseServings) - 1))}>−</StepperBtn>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, minWidth: 24, textAlign: 'center' }}>{servings || baseServings}</span>
            <StepperBtn onClick={() => onServingsChange(s => (s || baseServings) + 1)}>+</StepperBtn>
          </div>
        </div>
      )}

      {/* Version picker — mirrors the one on the Info tab, shown here too since ingredients change per version */}
      {variants.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <select
            value={activeVariant}
            onChange={e => onVariantChange(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--line)',
              background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)',
              fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}
          >
            <option value="main">Origineel</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionLabel>Ingredients</SectionLabel>
        <button onClick={onAddToShoppingList} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: addedToList ? 'var(--sage)' : 'var(--tomato-deep)',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
        }}>{addedToList ? '✓ Added' : '+ Add to list'}</button>
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '6px 16px' }}>
        {ingredients.length === 0 && <EmptyRow>No ingredients listed.</EmptyRow>}
        {ingredients.map((group, gi) => {
          const isCollapsed = !!collapsedGroups[gi]
          return (
            <div key={gi} style={{ padding: '10px 0', borderBottom: gi < ingredients.length - 1 ? '1px solid var(--line)' : 'none' }}>
              {group.group && (
                <button
                  onClick={() => toggleGroup(gi)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, marginBottom: isCollapsed ? 0 : 6, textAlign: 'left',
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
                return (
                  <div
                    key={item.id}
                    onClick={() => onToggleChecked(item.id)}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0', fontFamily: 'var(--font-body)', fontSize: 15,
                      color: isChecked ? 'var(--charcoal-soft)' : 'var(--charcoal)', cursor: 'pointer',
                      textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.6 : 1,
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: isChecked ? 'var(--charcoal-soft)' : 'var(--tomato-deep)', fontWeight: 600, minWidth: 50, flexShrink: 0, display: 'inline-block' }}>
                      {(displayItem.amount !== null || displayItem.unit)
                        ? `${formatConvertedAmount(displayItem.amount)}${displayItem.unit ? ` ${displayItem.unit}` : ''}`
                        : '\u00A0'}
                    </span>
                    <span>{item.name}</span>
                  </div>
                )
              })}
            </div>
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
