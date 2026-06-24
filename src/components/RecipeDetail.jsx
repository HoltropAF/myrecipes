import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { scaleAmount } from '../lib/ingredientParser'
import { DEMO_COOK_LOG } from '../lib/demoData'
import CookingMode from './CookingMode'
import CookLogSection from './CookLogSection'
import InfoTab from './recipe_tabs/InfoTab'
import IngredientsTab from './recipe_tabs/IngredientsTab'
import StepsTab from './recipe_tabs/StepsTab'
import StorageTab from './recipe_tabs/StorageTab'

const TABS = [
  { id: 'info', label: 'Info' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'steps', label: 'Steps' },
  { id: 'cooklog', label: 'Log' },
  { id: 'storage', label: 'Notes' },
]

// A palette of subtly differing card shades, like colored index dividers in a real binder.
// Defined per-theme since the light parchment shades would clash against a dark background.
const TAB_SHADES_LIGHT = ['#fffdf9', '#fdf6ec', '#fbf1e4', '#f8ecdb', '#f5e7d2']
const TAB_SHADES_DARK = ['#2a221c', '#2e2620', '#322a23', '#362e26', '#3a3229']

export default function RecipeDetail({ recipe, onClose, onEdit, onDelete, unitSystem = 'metric', onToggleUnitSystem, isGuest = false }) {
  const variants = recipe.variants || []
  const [activeTab, setActiveTab] = useState('info')
  const [activeVariant, setActiveVariant] = useState('main')
  const [servings, setServings] = useState(recipe.servings || null)
  const [addedToList, setAddedToList] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState(new Set())
  const [showCookingMode, setShowCookingMode] = useState(false)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const check = () => setCompact(window.innerWidth <= 360)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleIngredientChecked = (id) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const active = activeVariant === 'main'
    ? { ingredients: recipe.ingredients || [], steps: recipe.steps || [] }
    : (variants.find(v => v.id === activeVariant) || { ingredients: [], steps: [] })

  const baseServings = recipe.servings || null

  const handleAddToShoppingList = async () => {
    const rows = active.ingredients.flatMap(group =>
      group.items
        .filter(item => item.name.trim())
        .map(item => {
          const scaled = baseServings && servings ? scaleAmount(item.amount, baseServings, servings) : item.amount
          return { name: item.name, amount: scaled, unit: item.unit, checked: false }
        })
    )
    if (rows.length === 0) return

    if (isGuest) {
      setAddedToList(true)
      setTimeout(() => setAddedToList(false), 2000)
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    if (!user_id) return
    await supabase.from('shopping_list').insert(rows.map(r => ({ ...r, user_id, recipe_id: recipe.id })))
    setAddedToList(true)
    setTimeout(() => setAddedToList(false), 2000)
  }

  if (showCookingMode) {
    return (
      <CookingMode
        recipe={recipe}
        steps={active.steps}
        unitSystem={unitSystem}
        onClose={() => setShowCookingMode(false)}
      />
    )
  }

  const activeTabIndex = TABS.findIndex(t => t.id === activeTab)
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  const TAB_SHADES = isDark ? TAB_SHADES_DARK : TAB_SHADES_LIGHT

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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
            {onEdit && <button onClick={() => onEdit(recipe)} style={navBtnStyle}>Edit</button>}
            {onDelete && <button onClick={() => onDelete(recipe)} style={{ ...navBtnStyle, color: 'var(--tomato)' }}>Delete</button>}
          </div>
        </div>

        {/* Title — always visible, independent of active tab */}
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, color: 'var(--tomato-deep)', lineHeight: 1.2 }}>
            {recipe.title}
          </h1>
          {recipe.tagline && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal-soft)', marginTop: 2 }}>{recipe.tagline}</div>
          )}
        </div>

        {/* Cookbook-divider style tab bar */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, overflowX: 'auto', paddingBottom: 0 }}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: isActive ? TABS.length + 1 : TABS.length - i,
                  marginLeft: i === 0 ? 0 : (compact ? -6 : -10),
                  padding: isActive
                    ? (compact ? '8px 12px 9px' : '10px 18px 11px')
                    : (compact ? '7px 10px 8px' : '8px 16px 9px'),
                  borderRadius: '10px 10px 0 0',
                  border: '1px solid var(--line)',
                  borderBottom: isActive ? `1px solid ${TAB_SHADES[i % TAB_SHADES.length]}` : '1px solid var(--line)',
                  background: TAB_SHADES[i % TAB_SHADES.length],
                  color: isActive ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: compact ? (isActive ? 12.5 : 11.5) : (isActive ? 14 : 13),
                  cursor: 'pointer',
                  transform: isActive ? 'translateY(0)' : 'translateY(4px)',
                  boxShadow: isActive ? '0 -2px 8px rgba(42,36,32,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >{tab.label}</button>
            )
          })}
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 20px 100px',
        background: TAB_SHADES[activeTabIndex % TAB_SHADES.length],
      }}>
        {activeTab === 'info' && (
          <InfoTab
            recipe={recipe} variants={variants} activeVariant={activeVariant} onVariantChange={setActiveVariant}
          />
        )}
        {activeTab === 'ingredients' && (
          <IngredientsTab
            ingredients={active.ingredients} baseServings={baseServings} servings={servings} unitSystem={unitSystem}
            onServingsChange={setServings}
            variants={variants} activeVariant={activeVariant} onVariantChange={setActiveVariant}
            checkedIngredients={checkedIngredients} onToggleChecked={toggleIngredientChecked}
            onAddToShoppingList={handleAddToShoppingList} addedToList={addedToList}
          />
        )}
        {activeTab === 'steps' && (
          <StepsTab steps={active.steps} unitSystem={unitSystem} onStartCooking={() => setShowCookingMode(true)} />
        )}
        {activeTab === 'cooklog' && (
          <CookLogSection
            recipeId={recipe.id} variants={variants} isGuest={isGuest}
            demoEntries={isGuest ? DEMO_COOK_LOG.filter(e => e.recipe_id === recipe.id) : null}
          />
        )}
        {activeTab === 'storage' && (
          <StorageTab recipe={recipe} />
        )}
      </div>
    </div>
  )
}

const navBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
}
