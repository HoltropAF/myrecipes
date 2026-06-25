import { useState, useMemo } from 'react'
import LoadingGyoza from '../LoadingGyoza'
import WhatCanIMake from '../WhatCanIMake'
import { MAIN_INGREDIENTS, MEAL_TYPES, ALLERGEN_LABELS, DIET_TAGS, getMainIngredientKeys } from '../../lib/recipeTags'
import { useT } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'

export const CATEGORY_ICONS = {
  'Breakfast & Brunch': '🍳', 'Appetizers & Snacks': '🥟', 'Soups & Salads': '🥗',
  'Main dishes': '🍽', 'Sides': '🍚', 'Desserts': '🍰', 'Baking': '🥐',
  'Drinks': '🍹', 'Household': '🧴', 'Soups': '🍲', 'Salads': '🥗',
}

const GRID_PLACEHOLDER_COLORS = ['#fde8d8','#e8f3e0','#e0eaf8','#f8e8f0','#f8f3e0','#e8f0f8','#f0e8f8']

export default function AllRecipesView({ recipes, loading, onSelect, onAdd, defaultOpenCategory, viewMode = 'folders', searchMode = 'title', compactMode = false, cookCounts = {}, collections = [], collectionRecipeMap = {}, onCollectionsChanged }) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [mealTypeFilter, setMealTypeFilter] = useState(null)
  const [proteinFilter, setProteinFilter] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)
  const [dietFilter, setDietFilter] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [lastOpenedFolder, setLastOpenedFolder] = useState(defaultOpenCategory ? { category: defaultOpenCategory, subcategory: null } : null)
  const [activeCollection, setActiveCollection] = useState(null)

  const allTags = useMemo(
    () => [...new Set(recipes.flatMap(r => r.tags || []))].sort(),
    [recipes]
  )

  const filtered = useMemo(() => {
    let base = recipes
    if (mealTypeFilter) {
      const mt = MEAL_TYPES.find(m => m.key === mealTypeFilter)
      if (mt) base = base.filter(r => mt.match(r))
    }
    if (proteinFilter) {
      base = base.filter(r => getMainIngredientKeys(r).includes(proteinFilter))
    }
    if (tagFilter) {
      base = base.filter(r => (r.tags || []).includes(tagFilter))
    }
    if (dietFilter) {
      const dt = DIET_TAGS.find(d => d.key === dietFilter)
      if (dt) base = base.filter(r => r[dt.field])
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      if (searchMode === 'ingredient') {
        base = base.filter(r => {
          const allIngredients = [
            ...(r.ingredients || []),
            ...(r.variants || []).flatMap(v => v.ingredients || []),
          ]
          return allIngredients.some(group => group.items.some(item => item.name.toLowerCase().includes(q)))
        })
      } else {
        base = base.filter(r =>
          r.title.toLowerCase().includes(q) ||
          (r.tagline || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.subcategory || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q) ||
          (r.tags || []).some(tag => tag.toLowerCase().includes(q))
        )
      }
    }
    const sorted = [...base]
    if (sortBy === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title))
    else if (sortBy === 'category') sorted.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
    else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return sorted
  }, [recipes, query, searchMode, sortBy, mealTypeFilter, proteinFilter, tagFilter, dietFilter])

  const activeFilterCount = [mealTypeFilter, proteinFilter, tagFilter, dietFilter].filter(Boolean).length

  // Apply collection filter on top of the search/sort filtered list
  const visibleRecipes = activeCollection
    ? filtered.filter(r => (collectionRecipeMap[activeCollection] || new Set()).has(r.id))
    : filtered

  const translatedMealTypes = MEAL_TYPES.map(m => ({ ...m, label: t(`mealTypes.${m.key}`) }))
  const translatedMainIngredients = MAIN_INGREDIENTS.map(m => ({ ...m, label: t(`mainIngredients.${m.key}`) }))
  const translatedDietTags = DIET_TAGS.map(d => ({ ...d, label: t(`diet.${d.key}`) }))

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)' }}>{t('recipesView.title')}</h1>
        {onAdd && <button onClick={() => onAdd(viewMode === 'folders' ? lastOpenedFolder : null)} style={addBtnStyle}>{t('recipesView.addBtn')}</button>}
      </div>

      <CollectionsBar
        collections={collections}
        collectionRecipeMap={collectionRecipeMap}
        activeId={activeCollection}
        onSelect={setActiveCollection}
        onChanged={onCollectionsChanged}
      />

      <WhatCanIMake recipes={recipes} onSelect={onSelect} />

      <input
        type="text" value={query} onChange={e => setQuery(e.target.value)}
        placeholder={searchMode === 'ingredient' ? t('recipesView.searchIngredientPlaceholder') : t('recipesView.searchPlaceholder')}
        style={{
          width: '100%', padding: '11px 13px', borderRadius: 9, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 15,
          marginBottom: 10, boxSizing: 'border-box',
        }}
      />

      {/* Filter toggle row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
        <button
          onClick={() => setShowFilters(f => !f)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
            border: `1px solid ${activeFilterCount > 0 ? 'var(--tomato)' : 'var(--line)'}`,
            background: activeFilterCount > 0 ? 'var(--tomato)' : 'var(--card)',
            color: activeFilterCount > 0 ? 'var(--card)' : 'var(--charcoal-soft)',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >{t('recipesView.filtersBtn')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</button>

        <select
          value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--card)',
            color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
            marginLeft: 'auto',
          }}
        >
          <option value="recent">{t('recipesView.sortRecent')}</option>
          <option value="name">{t('recipesView.sortName')}</option>
          <option value="category">{t('recipesView.sortCategory')}</option>
        </select>
      </div>

      {showFilters && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <FilterGroup
            label={t('recipesView.filterMealType')}
            options={translatedMealTypes}
            active={mealTypeFilter}
            onSelect={setMealTypeFilter}
          />
          <FilterGroup
            label={t('recipesView.filterMainIngredient')}
            options={translatedMainIngredients}
            active={proteinFilter}
            onSelect={setProteinFilter}
          />
          {allTags.length > 0 && (
            <FilterGroup
              label={t('recipesView.filterTags')}
              options={allTags.map(tag => ({ key: tag, label: tag }))}
              active={tagFilter}
              onSelect={setTagFilter}
            />
          )}
          <FilterGroup
            label={t('recipesView.filterDiet')}
            options={translatedDietTags}
            active={dietFilter}
            onSelect={setDietFilter}
          />
        </div>
      )}

      {loading ? (
        <LoadingGyoza label={t('recipesView.loadingLabel')} />
      ) : viewMode === 'folders' && !activeCollection ? (
        <FolderView
          recipes={visibleRecipes} onSelect={onSelect} onAdd={onAdd} defaultOpenCategory={defaultOpenCategory}
          lastOpened={lastOpenedFolder} setLastOpened={setLastOpenedFolder}
          compactMode={compactMode} cookCounts={cookCounts}
        />
      ) : visibleRecipes.length === 0 ? (
        <Empty>{query || activeFilterCount > 0 || activeCollection ? t('recipesView.noMatch') : t('recipesView.noRecipes')}</Empty>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {visibleRecipes.map(r => (
            <GridCard key={r.id} recipe={r} onClick={() => onSelect(r)} cookCount={cookCounts[r.id] || 0} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleRecipes.map(r => (
            <RecipeCard
              key={r.id} recipe={r} onClick={() => onSelect(r)}
              highlightIngredient={searchMode === 'ingredient' ? query : null}
              compactMode={compactMode} cookCount={cookCounts[r.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, options, active, onSelect }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => onSelect(active === opt.key ? null : opt.key)}
            style={{
              padding: '5px 11px', borderRadius: 99,
              border: `1px solid ${active === opt.key ? 'var(--tomato)' : 'var(--line)'}`,
              background: active === opt.key ? 'var(--tomato)' : 'var(--parchment-dim)',
              color: active === opt.key ? 'var(--card)' : 'var(--charcoal)',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >{opt.label}</button>
        ))}
      </div>
    </div>
  )
}

// Folder/cookbook browse mode — operates on the already-filtered recipe list
function FolderView({ recipes, onSelect, onAdd, defaultOpenCategory, lastOpened, setLastOpened, compactMode = false, cookCounts = {} }) {
  const { t } = useT()
  const [openCategories, setOpenCategories] = useState(() => defaultOpenCategory ? { [defaultOpenCategory]: true } : {})
  const [openSubcategories, setOpenSubcategories] = useState({})

  const tree = useMemo(() => {
    const map = {}
    for (const r of recipes) {
      const cat = r.category || 'Uncategorized'
      if (!map[cat]) map[cat] = { direct: [], subcategories: {} }
      if (r.subcategory) {
        if (!map[cat].subcategories[r.subcategory]) map[cat].subcategories[r.subcategory] = []
        map[cat].subcategories[r.subcategory].push(r)
      } else {
        map[cat].direct.push(r)
      }
    }
    return Object.entries(map).sort((a, b) => {
      const countA = a[1].direct.length + Object.values(a[1].subcategories).flat().length
      const countB = b[1].direct.length + Object.values(b[1].subcategories).flat().length
      return countB - countA
    })
  }, [recipes])

  const toggleCategory = (cat) => {
    setOpenCategories(prev => {
      const next = { ...prev, [cat]: !prev[cat] }
      if (next[cat]) setLastOpened({ category: cat, subcategory: null })
      return next
    })
  }
  const toggleSubcategory = (cat, subcat) => {
    const key = `${cat}::${subcat}`
    setOpenSubcategories(prev => {
      const next = { ...prev, [key]: !prev[key] }
      if (next[key]) setLastOpened({ category: cat, subcategory: subcat })
      return next
    })
  }

  if (tree.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13, marginBottom: 14 }}>
          {t('recipesView.noMatch')}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tree.map(([cat, { direct, subcategories }]) => {
        const totalCount = direct.length + Object.values(subcategories).flat().length
        const isOpen = !!openCategories[cat]
        const subEntries = Object.entries(subcategories).sort((a, b) => b[1].length - a[1].length)

        return (
          <div key={cat} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            <button
              onClick={() => toggleCategory(cat)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{CATEGORY_ICONS[cat] || '🍽'}</span>
              <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--charcoal)' }}>{cat}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', flexShrink: 0 }}>{totalCount}</span>
              <span style={{
                color: 'var(--charcoal-soft)', fontSize: 14, flexShrink: 0, transition: 'transform 0.15s ease',
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block',
              }}>›</span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--line)', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subEntries.map(([subcat, items]) => {
                  const subKey = `${cat}::${subcat}`
                  const subOpen = !!openSubcategories[subKey]
                  return (
                    <div key={subcat} style={{ background: 'var(--parchment-dim)', borderRadius: 10, overflow: 'hidden' }}>
                      <button
                        onClick={() => toggleSubcategory(cat, subcat)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--charcoal)' }}>{subcat}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)' }}>{items.length}</span>
                        <span style={{
                          color: 'var(--charcoal-soft)', fontSize: 12, transition: 'transform 0.15s ease',
                          transform: subOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block',
                        }}>›</span>
                      </button>
                      {subOpen && (
                        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {items.map(r => (
                            <RecipeCard key={r.id} recipe={r} onClick={() => onSelect(r)} compactMode={compactMode} cookCount={cookCounts[r.id] || 0} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {direct.length > 0 && subEntries.length > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                    {t('recipesView.other')} {cat.toLowerCase()}
                  </div>
                )}
                {direct.map(r => (
                  <RecipeCard key={r.id} recipe={r} onClick={() => onSelect(r)} compactMode={compactMode} cookCount={cookCounts[r.id] || 0} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function RecipeCard({ recipe: r, onClick, highlightIngredient, compactMode = false, cookCount = 0 }) {
  const { t } = useT()
  const matchedIngredient = highlightIngredient
    ? (r.ingredients || []).flatMap(g => g.items).find(item => item.name.toLowerCase().includes(highlightIngredient.trim().toLowerCase()))
    : null

  if (compactMode) {
    return (
      <div onClick={onClick} style={{
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.title}
          </div>
          {r.tagline && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--charcoal-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.tagline}
            </div>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--tomato-deep)', flexShrink: 0, fontWeight: 600 }}>
          {cookCount > 0 ? t('recipesView.cookedCount')(cookCount) : t('recipesView.notYetCooked')}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      {r.photo_url ? (
        <img src={r.photo_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: 8, flexShrink: 0, background: 'var(--parchment-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{CATEGORY_ICONS[r.category] || '🍽'}</div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--charcoal)' }}>
          {r.title}
        </div>
        {r.tagline && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal-soft)', marginTop: 2 }}>{r.tagline}</div>}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 5 }}>
          {matchedIngredient
            ? t('recipesView.contains')(matchedIngredient.name)
            : <>
                {(r.ingredients || []).reduce((s, g) => s + g.items.length, 0)} {t('recipesView.ingredients')} · {(r.steps || []).reduce((s, g) => s + g.items.length, 0)} {t('recipesView.steps')}
                {r.category ? ` · ${r.category}` : ''}
              </>
          }
        </div>
        {(r.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {r.tags.map(tag => (
              <span key={tag} style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sage)',
                background: 'var(--sage-light)', borderRadius: 99, padding: '2px 8px',
              }}>{tag}</span>
            ))}
          </div>
        )}
        {(r.allergen_tags?.length > 0 || r.is_vegan || r.is_vegetarian || r.is_pescatarian_or_better) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {r.is_vegan && <AllergenBadge diet>{t('diet.vegan')}</AllergenBadge>}
            {!r.is_vegan && r.is_vegetarian && <AllergenBadge diet>{t('diet.vegetarian')}</AllergenBadge>}
            {!r.is_vegan && !r.is_vegetarian && r.is_pescatarian_or_better && <AllergenBadge diet>{t('diet.pescatarian')}</AllergenBadge>}
            {(r.allergen_tags || []).map(tag => (
              <AllergenBadge key={tag}>{t(`allergens.${tag}`) || ALLERGEN_LABELS[tag] || tag}</AllergenBadge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const COLLECTION_EMOJIS = ['📚','✨','❤️','🌟','🍝','🔥','🌿','🎉','🧁','☕','🥗','🍜']

function CollectionsBar({ collections, collectionRecipeMap, activeId, onSelect, onChanged }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📚')
  const [busy, setBusy] = useState(false)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('collections').insert({ user_id: user.id, name, emoji: newEmoji })
      onChanged?.()
    }
    setCreating(false)
    setNewName('')
    setNewEmoji('📚')
    setBusy(false)
  }

  if (collections.length === 0 && !creating) {
    return (
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => { setCreating(true); setNewName('Dopamine Menu'); setNewEmoji('✨') }}
          style={{
            padding: '7px 14px', borderRadius: 99, border: '1px dashed var(--line)',
            background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)',
            fontSize: 12, cursor: 'pointer',
          }}
        >✨ Dopamine Menu</button>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {collections.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
          {collections.map(col => {
            const count = (collectionRecipeMap[col.id] || new Set()).size
            const isActive = activeId === col.id
            return (
              <button
                key={col.id}
                onClick={() => onSelect(isActive ? null : col.id)}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
                  border: `1px solid ${isActive ? 'var(--tomato)' : 'var(--line)'}`,
                  background: isActive ? 'var(--tomato)' : 'var(--card)',
                  color: isActive ? '#fffdf9' : 'var(--charcoal)',
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  display: 'flex', gap: 5, alignItems: 'center',
                }}
              >
                <span>{col.emoji}</span>
                <span>{col.name}</span>
                {count > 0 && <span style={{ opacity: 0.6, fontSize: 10, fontFamily: 'var(--font-mono)' }}>{count}</span>}
              </button>
            )
          })}
          <button
            onClick={() => { setCreating(true); setNewName(''); setNewEmoji('📚') }}
            style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 99,
              border: '1px dashed var(--line)', background: 'none',
              color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
            }}
          >+</button>
        </div>
      )}

      {creating && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {COLLECTION_EMOJIS.map(e => (
              <button key={e} onClick={() => setNewEmoji(e)} style={{
                fontSize: 18, border: newEmoji === e ? '2px solid var(--tomato)' : '2px solid transparent',
                background: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 4px',
              }}>{e}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="Collection name"
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontFamily: 'var(--font-body)', fontSize: 13, background: 'var(--parchment)', color: 'var(--charcoal)', outline: 'none' }}
            />
            <button onClick={handleCreate} disabled={busy || !newName.trim()} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>Create</button>
            <button onClick={() => setCreating(false)} style={{
              padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)',
              background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
            }}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

function GridCard({ recipe: r, onClick, cookCount = 0 }) {
  const placeholderColor = GRID_PLACEHOLDER_COLORS[r.title.charCodeAt(0) % GRID_PLACEHOLDER_COLORS.length]
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--card)' }}>
      {r.photo_url ? (
        <img src={r.photo_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          width: '100%', aspectRatio: '1', background: placeholderColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
        }}>{CATEGORY_ICONS[r.category] || '🍽'}</div>
      )}
      <div style={{ padding: '7px 9px 9px' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--charcoal)',
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3,
        }}>{r.title}</div>
        {cookCount > 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--tomato-deep)', marginTop: 3, fontWeight: 600 }}>×{cookCount}</div>
        )}
      </div>
    </div>
  )
}

function AllergenBadge({ children, diet = false }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, borderRadius: 99, padding: '2px 8px',
      color: diet ? 'var(--sage)' : 'var(--charcoal-soft)',
      background: diet ? 'var(--sage-light)' : 'var(--parchment-dim)',
    }}>{children}</span>
  )
}

function Empty({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
      {children}
    </div>
  )
}

const addBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--tomato)',
  color: 'var(--card)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
