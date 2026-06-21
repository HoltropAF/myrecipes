import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { scaleAmount } from '../lib/ingredientParser'
import CookingMode from './CookingMode'
import CookLogSection from './CookLogSection'
import InfoTab from './recipe_tabs/InfoTab'
import IngredientsTab from './recipe_tabs/IngredientsTab'
import StepsTab from './recipe_tabs/StepsTab'
import VersionsTab from './recipe_tabs/VersionsTab'
import StorageTab from './recipe_tabs/StorageTab'

const TABS = [
  { id: 'info', label: 'Info', icon: 'ℹ️' },
  { id: 'ingredients', label: 'Ingredients', icon: '🥕' },
  { id: 'steps', label: 'Steps', icon: '📝' },
  { id: 'versions', label: 'Versions', icon: '🔀' },
  { id: 'cooklog', label: 'Cook log', icon: '📅' },
  { id: 'storage', label: 'Storage', icon: '🧊' },
]

export default function RecipeDetail({ recipe: initialRecipe, onClose, onEdit, onDelete, unitSystem = 'metric', onToggleUnitSystem }) {
  const [recipe, setRecipe] = useState(initialRecipe)
  const variants = recipe.variants || []
  const visibleTabs = variants.length > 0 ? TABS : TABS.filter(t => t.id !== 'versions')
  const [activeTab, setActiveTab] = useState('info')
  const [servings, setServings] = useState(recipe.servings || null)
  const [addedToList, setAddedToList] = useState(false)
  const [wishlist, setWishlist] = useState(!!recipe.wishlist)
  const [togglingWishlist, setTogglingWishlist] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState(new Set())
  const [showCookingMode, setShowCookingMode] = useState(false)

  const toggleIngredientChecked = (id) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const baseServings = recipe.servings || null
  const ingredients = recipe.ingredients || []
  const steps = recipe.steps || []

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

    const rows = ingredients.flatMap(group =>
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

  if (showCookingMode) {
    return (
      <CookingMode
        recipe={recipe}
        steps={steps}
        unitSystem={unitSystem}
        onClose={() => setShowCookingMode(false)}
      />
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '14px 16px' }}>
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
            <button
              onClick={handleToggleWishlist} disabled={togglingWishlist}
              title={wishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, lineHeight: 1, padding: 0 }}
            >{wishlist ? '⭐' : '☆'}</button>
            {onEdit && <button onClick={() => onEdit(recipe)} style={navBtnStyle}>Edit</button>}
            {onDelete && <button onClick={() => onDelete(recipe)} style={{ ...navBtnStyle, color: 'var(--tomato)' }}>Delete</button>}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 99,
                border: `1px solid ${activeTab === tab.id ? 'var(--tomato)' : 'var(--line)'}`,
                background: activeTab === tab.id ? 'var(--tomato)' : 'var(--card)',
                color: activeTab === tab.id ? '#fffdf9' : 'var(--charcoal-soft)',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>
        {activeTab === 'info' && (
          <InfoTab
            recipe={recipe} servings={servings} baseServings={baseServings}
            onServingsChange={setServings} onUpdated={setRecipe}
          />
        )}
        {activeTab === 'ingredients' && (
          <IngredientsTab
            ingredients={ingredients} baseServings={baseServings} servings={servings} unitSystem={unitSystem}
            checkedIngredients={checkedIngredients} onToggleChecked={toggleIngredientChecked}
            onAddToShoppingList={handleAddToShoppingList} addedToList={addedToList}
          />
        )}
        {activeTab === 'steps' && (
          <StepsTab steps={steps} unitSystem={unitSystem} onStartCooking={() => setShowCookingMode(true)} />
        )}
        {activeTab === 'versions' && variants.length > 0 && (
          <VersionsTab recipe={recipe} variants={variants} unitSystem={unitSystem} />
        )}
        {activeTab === 'cooklog' && (
          <CookLogSection recipeId={recipe.id} variants={variants} />
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
