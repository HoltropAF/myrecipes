import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { scaleAmount } from '../lib/ingredientParser'
import { DEMO_COOK_LOG } from '../lib/demoData'
import { useT } from '../lib/i18n'
import CookingMode from './CookingMode'
import CookLogSection from './CookLogSection'
import InfoTab from './recipe_tabs/InfoTab'
import IngredientsTab from './recipe_tabs/IngredientsTab'
import StepsTab from './recipe_tabs/StepsTab'
import StorageTab from './recipe_tabs/StorageTab'

// A palette of subtly differing card shades, like colored index dividers in a real binder.
// Defined per-theme since the light parchment shades would clash against a dark background.
const TAB_SHADES_LIGHT = ['#fffdf9', '#fdf6ec', '#fbf1e4', '#f8ecdb', '#f5e7d2']
const TAB_SHADES_DARK = ['#2a221c', '#2e2620', '#322a23', '#362e26', '#3a3229']

export default function RecipeDetail({ recipe, onClose, onEdit, onDelete, unitSystem = 'metric', onToggleUnitSystem, isGuest = false, collections = [], collectionRecipeMap = {}, onCollectionsChanged }) {
  const { t } = useT()

  const TABS = [
    { id: 'info',        label: t('recipeTabs.info') },
    { id: 'ingredients', label: t('recipeTabs.ingredients') },
    { id: 'steps',       label: t('recipeTabs.steps') },
    { id: 'cooklog',     label: t('recipeTabs.log') },
    { id: 'storage',     label: t('recipeTabs.storage') },
  ]

  const variants = recipe.variants || []
  const [activeTab, setActiveTab] = useState('info')
  const [activeVariant, setActiveVariant] = useState('main')
  const [servings, setServings] = useState(recipe.servings || null)
  const [addedToList, setAddedToList] = useState(false)
  const [showCollectionPicker, setShowCollectionPicker] = useState(false)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState(() => {
    try {
      const raw = localStorage.getItem(`recipe_check_${recipe.id}`)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch { return new Set() }
  })
  const [showCookingMode, setShowCookingMode] = useState(false)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const check = () => setCompact(window.innerWidth <= 360)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`recipe_check_${recipe.id}`)
      setCheckedIngredients(raw ? new Set(JSON.parse(raw)) : new Set())
    } catch { setCheckedIngredients(new Set()) }
  }, [recipe.id])

  const toggleIngredientChecked = (id) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem(`recipe_check_${recipe.id}`, JSON.stringify([...next])) } catch {}
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
          <button onClick={onClose} style={navBtnStyle}>{t('recipeDetail.back')}</button>
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
            {!isGuest && (
              <button onClick={() => setShowCollectionPicker(true)} title="Collections" style={{ ...navBtnStyle, fontSize: 18, lineHeight: 1, padding: '4px 6px' }}>
                {collections.some(c => (collectionRecipeMap[c.id] || new Set()).has(recipe.id)) ? '📚' : '🔖'}
              </button>
            )}
            {!isGuest && (
              <button onClick={() => setShowPlanPicker(true)} title="Add to meal plan" style={{ ...navBtnStyle, fontSize: 18, lineHeight: 1, padding: '4px 6px' }}>📅</button>
            )}
            {onEdit && <button onClick={() => onEdit(recipe)} style={navBtnStyle}>{t('recipeDetail.edit')}</button>}
            {onDelete && <button onClick={() => onDelete(recipe)} style={{ ...navBtnStyle, color: 'var(--tomato)' }}>{t('recipeDetail.delete')}</button>}
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

      {showCollectionPicker && (
        <CollectionPicker
          recipeId={recipe.id}
          collections={collections}
          collectionRecipeMap={collectionRecipeMap}
          onChanged={onCollectionsChanged}
          onClose={() => setShowCollectionPicker(false)}
        />
      )}
      {showPlanPicker && (
        <PlanPicker
          recipeId={recipe.id}
          onClose={() => setShowPlanPicker(false)}
        />
      )}
    </div>
  )
}

function CollectionPicker({ recipeId, collections, collectionRecipeMap, onChanged, onClose }) {
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📚')

  const toggle = async (col) => {
    if (busy) return
    setBusy(true)
    const inCollection = (collectionRecipeMap[col.id] || new Set()).has(recipeId)
    if (inCollection) {
      await supabase.from('collection_recipes').delete()
        .eq('collection_id', col.id).eq('recipe_id', recipeId)
    } else {
      await supabase.from('collection_recipes').insert({ collection_id: col.id, recipe_id: recipeId })
    }
    await onChanged?.()
    setBusy(false)
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: newCol } = await supabase.from('collections')
        .insert({ user_id: user.id, name, emoji: newEmoji }).select().single()
      if (newCol) {
        await supabase.from('collection_recipes').insert({ collection_id: newCol.id, recipe_id: recipeId })
      }
      await onChanged?.()
    }
    setCreating(false)
    setNewName('')
    setBusy(false)
  }

  const EMOJIS = ['📚','✨','❤️','🌟','🍝','🔥','🌿','🎉','🧁','☕','🥗','🍜']

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(42,36,32,0.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--card)', width: '100%', borderRadius: '16px 16px 0 0', padding: '20px 20px 40px', maxHeight: '70dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--charcoal)' }}>Collections</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--charcoal-soft)' }}>✕</button>
        </div>

        {collections.length === 0 && !creating && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)', marginBottom: 14 }}>No collections yet.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {collections.map(col => {
            const checked = (collectionRecipeMap[col.id] || new Set()).has(recipeId)
            return (
              <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(col)} style={{ width: 18, height: 18, accentColor: 'var(--tomato)', flexShrink: 0 }} />
                <span style={{ fontSize: 18 }}>{col.emoji}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', flex: 1 }}>{col.name}</span>
              </label>
            )
          })}
        </div>

        {creating ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)} style={{
                  fontSize: 18, border: newEmoji === e ? '2px solid var(--tomato)' : '2px solid transparent',
                  background: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 4px',
                }}>{e}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="Collection name"
                style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--line)', fontFamily: 'var(--font-body)', fontSize: 13, background: 'var(--parchment)', color: 'var(--charcoal)', outline: 'none' }}
              />
              <button onClick={handleCreate} disabled={busy || !newName.trim()} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Create
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} style={{ marginTop: 14, padding: '10px 0', borderRadius: 9, border: '1px dashed var(--line)', background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', width: '100%' }}>
            + New collection
          </button>
        )}
      </div>
    </div>
  )
}

function PlanPicker({ recipeId, onClose }) {
  const [groups, setGroups] = useState([])
  const [adding, setAdding] = useState(null)
  const [added, setAdded] = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('meal_groups').select('id, name, recipe_ids').eq('user_id', user.id).order('created_at', { ascending: false })
      setGroups(data || [])
    }
    load()
  }, [])

  const addToGroup = async (group) => {
    if (adding) return
    setAdding(group.id)
    const current = group.recipe_ids || []
    if (!current.includes(recipeId)) {
      await supabase.from('meal_groups').update({ recipe_ids: [...current, recipeId] }).eq('id', group.id)
    }
    setAdded(group.id)
    setAdding(null)
    setTimeout(onClose, 800)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(42,36,32,0.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--card)', width: '100%', borderRadius: '16px 16px 0 0', padding: '20px 20px 40px', maxHeight: '60dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--charcoal)' }}>Add to meal plan</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--charcoal-soft)' }}>✕</button>
        </div>

        {groups.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
            No meal plan weeks yet — create one in the Meal Prep tab first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => addToGroup(group)}
                disabled={!!adding}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)',
                  background: added === group.id ? 'var(--sage-light)' : 'var(--parchment)',
                  cursor: adding ? 'default' : 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', fontWeight: 600 }}>{group.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
                  {added === group.id ? '✓ Added' : `${(group.recipe_ids || []).length} recipes`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const navBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
}
