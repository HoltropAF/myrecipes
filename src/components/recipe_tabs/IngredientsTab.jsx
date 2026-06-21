import { scaleAmount } from '../../lib/ingredientParser'
import { convertIngredient, formatConvertedAmount } from '../../lib/unitConverter'

export default function IngredientsTab({
  ingredients, baseServings, servings, unitSystem,
  checkedIngredients, onToggleChecked, onAddToShoppingList, addedToList,
}) {
  return (
    <div>
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
        {ingredients.map((group, gi) => (
          <div key={gi} style={{ padding: '10px 0', borderBottom: gi < ingredients.length - 1 ? '1px solid var(--line)' : 'none' }}>
            {group.group && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{group.group}</div>
            )}
            {group.items.map(item => {
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
                  {(displayItem.amount !== null || displayItem.unit) && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: isChecked ? 'var(--charcoal-soft)' : 'var(--tomato-deep)', fontWeight: 600, minWidth: 50, flexShrink: 0 }}>
                      {formatConvertedAmount(displayItem.amount)}{displayItem.unit ? ` ${displayItem.unit}` : ''}
                    </span>
                  )}
                  <span>{item.name}</span>
                </div>
              )
            })}
          </div>
        ))}
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

function EmptyRow({ children }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', padding: '10px 0' }}>{children}</div>
}
