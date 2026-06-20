import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatIngredientRow, scaleAmount } from '../lib/ingredientParser'
import { convertIngredient, convertStepTemperatures, formatConvertedAmount } from '../lib/unitConverter'
import CookLogSection from './CookLogSection'
import NutritionSection from './NutritionSection'

export default function RecipeDetail({ recipe: initialRecipe, onClose, onEdit, onDelete, unitSystem = 'metric', onToggleUnitSystem }) {
  const [recipe, setRecipe] = useState(initialRecipe)
  const variants = recipe.variants || []
  const [activeTab, setActiveTab] = useState('main') // 'main' | variant.id
  const [servings, setServings] = useState(recipe.servings || null)
  const [addedToList, setAddedToList] = useState(false)
  const [wishlist, setWishlist] = useState(!!recipe.wishlist)
  const [togglingWishlist, setTogglingWishlist] = useState(false)

  const active = activeTab === 'main'
    ? { ingredients: recipe.ingredients || [], steps: recipe.steps || [] }
    : (variants.find(v => v.id === activeTab) || { ingredients: [], steps: [] })

  const baseServings = recipe.servings || null

  const handleToggleWishlist = async () => {
    setTogglingWishlist(true)
    const next = !wishlist
    const { error } = await supabase.from('recipes').update({ wishlist: next }).eq('id', recipe.id)
    if (!error) setWishlist(next)
    setTogglingWishlist(false)
  }

  const handleAddToShoppingList = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    if (!user_id) return

    const rows = active.ingredients.flatMap(group =>
      group.items
        .filter(item => item.name.trim())
        .map(item => {
          const scaled = baseServings && servings ? scaleAmount(item.amount, baseServings, servings) : item.amount
          return {
            user_id,
            recipe_id: recipe.id,
            name: item.name,
            amount: scaled,
            unit: item.unit,
            checked: false,
          }
        })
    )
    if (rows.length === 0) return
    await supabase.from('shopping_list').insert(rows)
    setAddedToList(true)
    setTimeout(() => setAddedToList(false), 2000)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#fffdf9', borderBottom: '1px solid var(--line)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={navBtnStyle}>‹ Back</button>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {onToggleUnitSystem && (
              <button
                onClick={onToggleUnitSystem}
                title="Switch units"
                style={{
                  background: 'var(--parchment-dim)', border: '1px solid var(--line)', borderRadius: 99,
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  color: 'var(--tomato-deep)', padding: '5px 10px',
                }}
              >{unitSystem === 'metric' ? 'g / ml' : 'cup / oz'}</button>
            )}
            <button
              onClick={handleToggleWishlist} disabled={togglingWishlist}
              title={wishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, lineHeight: 1, padding: 0 }}
            >{wishlist ? '⭐' : '☆'}</button>
            {onEdit && <button onClick={() => onEdit(recipe)} style={navBtnStyle}>Edit</button>}
            {onDelete && <button onClick={() => onDelete(recipe)} style={{ ...navBtnStyle, color: 'var(--tomato)' }}>Delete</button>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>
        {recipe.photo_url && (
          <img src={recipe.photo_url} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 240, objectFit: 'cover', marginBottom: 16 }} />
        )}

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, color: 'var(--tomato-deep)', lineHeight: 1.15, marginBottom: 4 }}>
          {recipe.title}
        </h1>
        {recipe.tagline && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal-soft)', marginBottom: 10 }}>{recipe.tagline}</div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          {recipe.category && <MetaChip>{recipe.category}{recipe.subcategory ? ` · ${recipe.subcategory}` : ''}</MetaChip>}
          {recipe.total_minutes && <MetaChip>⏱ {recipe.total_minutes} min</MetaChip>}
        </div>

        {/* Nutrition */}
        <SectionLabel>Nutrition</SectionLabel>
        <div style={{ marginBottom: 22 }}>
          <NutritionSection recipe={recipe} onUpdated={setRecipe} />
        </div>

        {/* Variant tabs */}
        {variants.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
            <TabButton active={activeTab === 'main'} onClick={() => setActiveTab('main')}>Origineel</TabButton>
            {variants.map(v => (
              <TabButton key={v.id} active={activeTab === v.id} onClick={() => setActiveTab(v.id)}>{v.label}</TabButton>
            ))}
          </div>
        )}

        {/* Servings adjuster */}
        {baseServings && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>servings</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
              <StepperBtn onClick={() => setServings(s => Math.max(1, (s || baseServings) - 1))}>−</StepperBtn>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, minWidth: 24, textAlign: 'center' }}>{servings || baseServings}</span>
              <StepperBtn onClick={() => setServings(s => (s || baseServings) + 1)}>+</StepperBtn>
            </div>
          </div>
        )}

        {/* Ingredients */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <SectionLabel>Ingredients</SectionLabel>
          <button onClick={handleAddToShoppingList} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: addedToList ? 'var(--sage)' : 'var(--tomato-deep)',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          }}>{addedToList ? '✓ Added' : '+ Add to list'}</button>
        </div>
        <div style={{ background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 12, padding: '6px 16px', marginBottom: 22 }}>
          {active.ingredients.length === 0 && <EmptyRow>No ingredients listed.</EmptyRow>}
          {active.ingredients.map((group, gi) => (
            <div key={gi} style={{ padding: '10px 0', borderBottom: gi < active.ingredients.length - 1 ? '1px solid var(--line)' : 'none' }}>
              {group.group && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{group.group}</div>
              )}
              {group.items.map(item => {
                let displayItem = item
                if (baseServings && servings) {
                  displayItem = { ...displayItem, amount: scaleAmount(displayItem.amount, baseServings, servings) }
                }
                displayItem = convertIngredient(displayItem, unitSystem)
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--charcoal)' }}>
                    {(displayItem.amount !== null || displayItem.unit) && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--tomato-deep)', fontWeight: 600, minWidth: 50, flexShrink: 0 }}>
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

        {/* Steps */}
        <SectionLabel>Steps</SectionLabel>
        <div style={{ marginBottom: 22 }}>
          {active.steps.length === 0 && <EmptyRow>No steps listed.</EmptyRow>}
          {active.steps.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 16 }}>
              {group.group && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{group.group}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map((step, si) => (
                  <div key={step.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 99, background: 'var(--tomato)', color: '#fffdf9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 1,
                    }}>{si + 1}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--charcoal)', lineHeight: 1.5 }}>
                      {convertStepTemperatures(step.content, unitSystem)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 22 }}>
          <CookLogSection recipeId={recipe.id} variants={variants} />
        </div>

        {recipe.notes && (
          <>
            <SectionLabel>Notes</SectionLabel>
            <div style={{
              background: 'var(--sage-light)', borderRadius: 10, padding: '12px 14px',
              fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.5,
            }}>{recipe.notes}</div>
          </>
        )}

        {recipe.source && (
          <div style={{ marginTop: 16 }}>
            <a href={recipe.source} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
              source ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function formatAmount(amount) {
  if (amount === null || amount === undefined) return ''
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1).replace(/\.0$/, '')
}

function MetaChip({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)',
      background: 'var(--parchment-dim)', borderRadius: 99, padding: '4px 10px',
    }}>{children}</span>
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

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '7px 14px', borderRadius: 99, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'var(--tomato)' : '#fffdf9',
        color: active ? '#fffdf9' : 'var(--charcoal-soft)',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
      }}
    >{children}</button>
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

const navBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
}
