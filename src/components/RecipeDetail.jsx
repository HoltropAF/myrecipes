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
import BinderTabs from './BinderTabs'
import { getTabShades, tabBackground } from '../lib/tabShades'
import { useCompact } from '../lib/useCompact'
import CollectionForm from './CollectionForm'
import { DEFAULT_COLLECTION_EMOJI } from '../lib/collectionEmojis'
import { useBackLayer } from '../lib/useBackLayer'

export default function RecipeDetail({ recipe, onClose, onEdit, onDelete, unitSystem = 'metric', onToggleUnitSystem, isGuest = false, collections = [], collectionRecipeMap = {}, onCollectionsChanged, onCookLogged }) {
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
  const [swappedIngredients, setSwappedIngredients] = useState(new Set())
  const [showCollectionPicker, setShowCollectionPicker] = useState(false)
  const [showPlanPicker, setShowPlanPicker] = useState(false)
  // Read once on mount. App keys this component on the recipe id, so opening a
  // different recipe remounts and re-reads rather than correcting state in an
  // effect after the first render has already shown the wrong ticks.
  const [checkedIngredients, setCheckedIngredients] = useState(() => {
    try {
      const raw = localStorage.getItem(`recipe_check_${recipe.id}`)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch { return new Set() }
  })
  const [showCookingMode, setShowCookingMode] = useState(false)
  const compact = useCompact()

  useBackLayer(showCollectionPicker, () => setShowCollectionPicker(false), 'collection-picker')
  useBackLayer(showPlanPicker, () => setShowPlanPicker(false), 'plan-picker')
  useBackLayer(showCookingMode, () => setShowCookingMode(false), 'cooking-mode')

  useEffect(() => {
    history.replaceState({ ...history.state, mrRecipeTab: 'info' }, '')
    const handlePopState = event => {
      if (event.state?.mrRecipeTab) setActiveTab(event.state.mrRecipeTab)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [recipe.id])

  const selectRecipeTab = tab => {
    if (tab === activeTab) return
    history.pushState({ ...history.state, mrRecipeTab: tab }, '')
    setActiveTab(tab)
  }

  const toggleIngredientChecked = (id) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(`recipe_check_${recipe.id}`, JSON.stringify([...next]))
      } catch { /* storage disabled — ticks last for this visit only */ }
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
        .filter(item => item.name.trim() && !checkedIngredients.has(item.id))
        .map(item => {
          if (swappedIngredients.has(item.id) && /serrano/i.test(item.name)) {
            return { name: 'halloumi', amount: 200, unit: 'g', checked: false }
          }
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
        onLogged={onCookLogged}
      />
    )
  }

  const activeTabIndex = TABS.findIndex(t => t.id === activeTab)
  const tabShades = getTabShades()

  return (
    <div style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', background: 'var(--parchment)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, zIndex: 5, background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '10px 14px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={onClose} style={navBtnStyle}>{t('recipeDetail.back')}</button>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {onToggleUnitSystem && (
              <button
                onClick={onToggleUnitSystem}
                title={t('collections.switchUnits')}
                style={{
                  background: 'var(--parchment-dim)', border: '1px solid var(--line)', borderRadius: 99,
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  color: 'var(--tomato-deep)', padding: '5px 10px',
                }}
              >{unitSystem === 'metric' ? 'g / ml' : 'cup / oz'}</button>
            )}
            {!isGuest && (
              <button onClick={() => setShowCollectionPicker(true)} title={t('collections.title')} style={{ ...navBtnStyle, fontSize: 18, lineHeight: 1, padding: '4px 6px' }}>
                {collections.some(c => (collectionRecipeMap[c.id] || new Set()).has(recipe.id)) ? '📚' : '🔖'}
              </button>
            )}
            {!isGuest && (
              <button onClick={() => setShowPlanPicker(true)} title={t('collections.addToPlan')} style={{ ...navBtnStyle, fontSize: 18, lineHeight: 1, padding: '4px 6px' }}>📅</button>
            )}
            {onEdit && <button onClick={() => onEdit(recipe, activeTab)} style={navBtnStyle}>{t('recipeDetail.edit')}</button>}
            {onDelete && <button onClick={() => onDelete(recipe)} style={{ ...navBtnStyle, color: 'var(--tomato)' }}>{t('recipeDetail.delete')}</button>}
          </div>
        </div>

        {/* Title — always visible, independent of active tab */}
        <div style={{ marginBottom: 9 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 23, color: 'var(--tomato-deep)', lineHeight: 1.15 }}>
            {recipe.title}
          </h1>
          {recipe.tagline && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)', marginTop: 3 }}>{recipe.tagline}</div>
          )}
        </div>

        {/* Cookbook-divider style tab bar */}
        <BinderTabs
          tabs={TABS}
          activeId={activeTab}
          onSelect={selectRecipeTab}
          compact={compact}
          style={{ paddingBottom: 0 }}
        />
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 14px 28px',
        background: tabBackground(tabShades, activeTabIndex),
      }}>
        {activeTab === 'info' && (
          <InfoTab
            recipe={recipe} variants={variants} activeVariant={activeVariant} onVariantChange={setActiveVariant}
            isGuest={isGuest}
          />
        )}
        {activeTab === 'ingredients' && (
          <IngredientsTab
            ingredients={active.ingredients} baseServings={baseServings} servings={servings} unitSystem={unitSystem}
            onServingsChange={setServings}
            variants={variants} activeVariant={activeVariant} onVariantChange={setActiveVariant}
            checkedIngredients={checkedIngredients} onToggleChecked={toggleIngredientChecked}
            onAddToShoppingList={handleAddToShoppingList} addedToList={addedToList}
            recipeNotes={recipe.notes} swappedIngredients={swappedIngredients} onSwappedIngredientsChange={setSwappedIngredients}
          />
        )}
        {activeTab === 'steps' && (
          <StepsTab steps={active.steps} unitSystem={unitSystem} onStartCooking={() => setShowCookingMode(true)} />
        )}
        {activeTab === 'cooklog' && (
          <CookLogSection
            recipeId={recipe.id} variants={variants} isGuest={isGuest}
            demoEntries={isGuest ? DEMO_COOK_LOG.filter(e => e.recipe_id === recipe.id) : null}
            onLogged={onCookLogged}
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
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState(DEFAULT_COLLECTION_EMOJI)

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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(42,36,32,0.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--card)', width: '100%', borderRadius: '16px 16px 0 0', padding: '20px 20px 40px', maxHeight: '70dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--charcoal)' }}>{t('collections.title')}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--charcoal-soft)' }}>✕</button>
        </div>

        {collections.length === 0 && !creating && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)', marginBottom: 14 }}>{t('collections.empty')}</div>
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
            <CollectionForm
              name={newName} setName={setNewName}
              emoji={newEmoji} setEmoji={setNewEmoji}
              onCreate={handleCreate}
              onCancel={() => setCreating(false)}
              busy={busy}
            />
          </div>
        ) : (
          <button onClick={() => setCreating(true)} style={{ marginTop: 14, padding: '10px 0', borderRadius: 9, border: '1px dashed var(--line)', background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', width: '100%' }}>
            {t('collections.newCollection')}
          </button>
        )}
      </div>
    </div>
  )
}

function PlanPicker({ recipeId, onClose }) {
  const { t } = useT()
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
    // Re-read immediately before writing. The list in state can be seconds old,
    // and writing the whole array back from stale state silently drops recipes
    // another device added to the same week in the meantime.
    const { data: fresh } = await supabase
      .from('meal_groups').select('recipe_ids').eq('id', group.id).maybeSingle()
    const current = fresh?.recipe_ids || group.recipe_ids || []
    if (!current.includes(recipeId)) {
      const next = [...current, recipeId]
      await supabase.from('meal_groups').update({ recipe_ids: next }).eq('id', group.id)
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, recipe_ids: next } : g))
    }
    setAdded(group.id)
    setAdding(null)
    setTimeout(onClose, 800)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(42,36,32,0.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--card)', width: '100%', borderRadius: '16px 16px 0 0', padding: '20px 20px 40px', maxHeight: '60dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--charcoal)' }}>{t('collections.addToPlan')}</div>
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
