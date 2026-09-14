import { useState, useMemo } from 'react'
import LoadingGyoza from '../LoadingGyoza'
import { CATEGORY_ICONS } from '../../lib/categories'
import { MAIN_INGREDIENTS, MEAL_TYPES, ALLERGEN_LABELS, DIET_TAGS, getMainIngredientKeys } from '../../lib/recipeTags'
import { useT } from '../../lib/i18n'
import { relativeDayLabel } from '../../lib/dateUtils'
import { supabase } from '../../lib/supabase'
import CollectionForm from '../CollectionForm'
import { DEFAULT_COLLECTION_EMOJI } from '../../lib/collectionEmojis'
import { useBackLayer } from '../../lib/useBackLayer'
import MergeRecipesSheet from '../MergeRecipesSheet'



// dateUtils formats the shape; i18n supplies the words.
const relativeLabels = (t) => ({
  today: t('relative.today'),
  yesterday: t('relative.yesterday'),
  days: (n) => t('relative.days')(n),
  weeks: (n) => t('relative.weeks')(n),
  months: (n) => t('relative.months')(n),
  years: (n) => t('relative.years')(n),
})

export default function AllRecipesView({ recipes, loading, onSelect, onAdd, searchMode = 'title', compactMode = false, onCompactModeChange, cookCounts = {}, collections = [], collectionRecipeMap = {}, onCollectionsChanged, isGuest = false, onRecipesChanged, recipeGroups = [] }) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [mealTypeFilter, setMealTypeFilter] = useState(null)
  const [proteinFilter, setProteinFilter] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)
  const [dietFilter, setDietFilter] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [activeCollection, setActiveCollection] = useState(null)
  const [mergeMode, setMergeMode] = useState(false)
  const [mergeSelectedIds, setMergeSelectedIds] = useState(new Set())
  const [showMergeSheet, setShowMergeSheet] = useState(false)
  const [groupedView, setGroupedView] = useState(false)
  const [openGroupId, setOpenGroupId] = useState(null)
  useBackLayer(showFilters, () => setShowFilters(false), 'recipe-filters')
  useBackLayer(showMergeSheet, () => setShowMergeSheet(false), 'merge-recipes')
  useBackLayer(!!openGroupId, () => setOpenGroupId(null), 'group-members')

  const toggleMergeMode = () => {
    setMergeMode(v => !v)
    setMergeSelectedIds(new Set())
  }
  const toggleMergeSelected = (id) => {
    setMergeSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const mergeSelectedRecipes = recipes.filter(r => mergeSelectedIds.has(r.id))

  const allTags = useMemo(
    () => [...new Set(recipes.flatMap(r => Array.isArray(r.tags) ? r.tags : []))].sort(),
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
    if (wishlistOnly) base = base.filter(r => r.wishlist)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      if (searchMode === 'ingredient') {
        base = base.filter(r => {
          const allIngredients = [
            ...(Array.isArray(r.ingredients) ? r.ingredients : []),
            ...(Array.isArray(r.variants) ? r.variants : []).flatMap(v => Array.isArray(v.ingredients) ? v.ingredients : []),
          ]
          return allIngredients.some(group => (Array.isArray(group?.items) ? group.items : []).some(item => String(item?.name || '').toLowerCase().includes(q)))
        })
      } else {
        base = base.filter(r =>
          String(r.title || '').toLowerCase().includes(q) ||
          (r.tagline || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.subcategory || '').toLowerCase().includes(q) ||
          (r.notes || '').toLowerCase().includes(q) ||
          (Array.isArray(r.tags) ? r.tags : []).some(tag => String(tag).toLowerCase().includes(q))
        )
      }
    }
    const sorted = [...base]
    if (sortBy === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title))
    else if (sortBy === 'category') sorted.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
    else if (sortBy === 'last-cooked') sorted.sort((a, b) => (cookCounts[b.id]?.lastCooked || '').localeCompare(cookCounts[a.id]?.lastCooked || ''))
    else if (sortBy === 'time') sorted.sort((a, b) => (a.total_minutes || Number.MAX_SAFE_INTEGER) - (b.total_minutes || Number.MAX_SAFE_INTEGER))
    else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return sorted
  }, [recipes, query, searchMode, sortBy, mealTypeFilter, proteinFilter, tagFilter, dietFilter, wishlistOnly, cookCounts])

  const activeFilterCount = [mealTypeFilter, proteinFilter, tagFilter, dietFilter, wishlistOnly].filter(Boolean).length

  // Apply collection filter on top of the search/sort filtered list
  const visibleRecipes = activeCollection
    ? filtered.filter(r => (collectionRecipeMap[activeCollection] || new Set()).has(r.id))
    : filtered

  // Grouping is purely a display arrangement — recipes are always fully
  // independent rows; this just clusters ones sharing a group_id into one
  // card. Skipped while merge-mode's own selection UI is active.
  const showGrouped = groupedView && !mergeMode
  const displayItems = useMemo(() => {
    if (!showGrouped) return visibleRecipes.map(r => ({ type: 'recipe', recipe: r }))
    const groupMap = new Map(recipeGroups.map(g => [g.id, g]))
    const seenGroups = new Set()
    const items = []
    for (const r of visibleRecipes) {
      const group = r.group_id && groupMap.get(r.group_id)
      if (!group) { items.push({ type: 'recipe', recipe: r }); continue }
      if (seenGroups.has(group.id)) continue
      seenGroups.add(group.id)
      items.push({ type: 'group', group, members: visibleRecipes.filter(x => x.group_id === group.id) })
    }
    return items
  }, [visibleRecipes, showGrouped, recipeGroups])
  const openGroup = openGroupId ? displayItems.find(item => item.type === 'group' && item.group.id === openGroupId) : null

  const translatedMealTypes = MEAL_TYPES.map(m => ({ ...m, label: t(`mealTypes.${m.key}`) }))
  const translatedMainIngredients = MAIN_INGREDIENTS.map(m => ({ ...m, label: t(`mainIngredients.${m.key}`) }))
  const translatedDietTags = DIET_TAGS.map(d => ({ ...d, label: t(`diet.${d.key}`) }))

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)' }}>{t('recipesView.title')}</h1>
        {onAdd && <button onClick={() => onAdd(null)} style={addBtnStyle}>{t('recipesView.addBtn')}</button>}
      </div>

      <CollectionsBar
        collections={collections}
        collectionRecipeMap={collectionRecipeMap}
        activeId={activeCollection}
        onSelect={setActiveCollection}
        onChanged={onCollectionsChanged}
      />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px 5px 13px',
        border: '1px solid var(--line)', borderRadius: 99, background: 'var(--card)',
        boxShadow: '0 5px 18px rgba(88, 31, 24, 0.07)', marginBottom: 10,
      }}>
        <SearchIcon />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder={searchMode === 'ingredient' ? t('recipesView.searchIngredientPlaceholder') : t('recipesView.searchPlaceholder')}
          style={{ minWidth: 0, flex: 1, padding: '8px 0', border: 0, outline: 0, background: 'transparent', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 15 }}
        />
        {query && <button onClick={() => setQuery('')} aria-label={t('recipesView.clearSearch')} style={iconButtonStyle}><CloseIcon /></button>}
        <button onClick={() => setShowFilters(true)} style={{ ...filterButtonStyle, background: activeFilterCount ? 'var(--tomato)' : 'var(--parchment-dim)', color: activeFilterCount ? '#fffdf9' : 'var(--charcoal)' }}>
          <FilterIcon />
          <span>{t('recipesView.filtersBtn')}</span>
          {activeFilterCount > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 99, display: 'grid', placeItems: 'center', background: '#fffdf9', color: 'var(--tomato-deep)', fontSize: 10 }}>{activeFilterCount}</span>}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={sortSelectStyle} aria-label={t('recipesView.sortLabel')}>
          <option value="recent">{t('recipesView.sortRecent')}</option>
          <option value="name">{t('recipesView.sortName')}</option>
          <option value="category">{t('recipesView.sortCategory')}</option>
          <option value="last-cooked">{t('recipesView.sortLastCooked')}</option>
          <option value="time">{t('recipesView.sortTime')}</option>
        </select>
        <button onClick={() => onCompactModeChange?.(!compactMode)} aria-pressed={compactMode} style={{ ...toolbarButtonStyle, background: compactMode ? 'var(--tomato)' : 'var(--card)', color: compactMode ? '#fffdf9' : 'var(--charcoal-soft)' }}>
          <RowsIcon /> <span>{t('recipesView.compact')}</span>
        </button>
        {!isGuest && (
          <button onClick={toggleMergeMode} aria-pressed={mergeMode} style={{ ...toolbarButtonStyle, background: mergeMode ? 'var(--tomato)' : 'var(--card)', color: mergeMode ? '#fffdf9' : 'var(--charcoal-soft)' }}>
            <span>{mergeMode ? t('recipesView.cancelMerge') : t('recipesView.mergeBtn')}</span>
          </button>
        )}
        {!isGuest && (
          <button onClick={() => setGroupedView(v => !v)} aria-pressed={groupedView} style={{ ...toolbarButtonStyle, background: groupedView ? 'var(--tomato)' : 'var(--card)', color: groupedView ? '#fffdf9' : 'var(--charcoal-soft)' }}>
            <span>{t('recipesView.groupedBtn')}</span>
          </button>
        )}
      </div>
      {mergeMode && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--charcoal-soft)', lineHeight: 1.5,
          border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, background: 'var(--card)',
        }}>
          {t('recipesView.mergeHint')}
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)', margin: '0 2px 12px' }}>
        {t('recipesView.resultCount')(visibleRecipes.length, recipes.length)}
      </div>

      {showFilters && (
        <div onClick={() => setShowFilters(false)} style={sheetBackdropStyle}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('recipesView.filtersBtn')} style={sheetStyle}>
            <div style={{ width: 38, height: 4, borderRadius: 99, background: 'var(--line)', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--tomato-deep)', fontSize: 22 }}>{t('recipesView.filtersBtn')}</h2>
              <button onClick={() => setShowFilters(false)} aria-label={t('recipesView.closeFilters')} style={iconButtonStyle}><CloseIcon /></button>
            </div>
            <button onClick={() => setWishlistOnly(v => !v)} aria-pressed={wishlistOnly} style={{ ...wishlistButtonStyle, borderColor: wishlistOnly ? 'var(--tomato)' : 'var(--line)', background: wishlistOnly ? 'var(--tomato)' : 'var(--parchment-dim)', color: wishlistOnly ? '#fffdf9' : 'var(--charcoal)' }}>
              <HeartIcon filled={wishlistOnly} /> {t('recipesView.wishlistOnly')}
            </button>
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
            <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, paddingTop: 12, background: 'var(--card)' }}>
              <button onClick={() => { setMealTypeFilter(null); setProteinFilter(null); setTagFilter(null); setDietFilter(null); setWishlistOnly(false) }} style={clearButtonStyle}>{t('recipesView.clearAll')}</button>
              <button onClick={() => setShowFilters(false)} style={showButtonStyle}>{t('recipesView.showResults')(visibleRecipes.length)}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingGyoza label={t('recipesView.loadingLabel')} />
      ) : visibleRecipes.length === 0 ? (
        <Empty>{query || activeFilterCount > 0 || activeCollection ? t('recipesView.noMatch') : t('recipesView.noRecipes')}</Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayItems.map(item => item.type === 'group' ? (
            <GroupCard key={`group-${item.group.id}`} group={item.group} members={item.members} onOpen={() => setOpenGroupId(item.group.id)} />
          ) : (
            <RecipeCard
              key={item.recipe.id} recipe={item.recipe}
              onClick={() => mergeMode ? toggleMergeSelected(item.recipe.id) : onSelect(item.recipe)}
              highlightIngredient={searchMode === 'ingredient' ? query : null}
              compactMode={compactMode} cookStat={cookCounts[item.recipe.id]}
              mergeMode={mergeMode} mergeSelected={mergeSelectedIds.has(item.recipe.id)}
            />
          ))}
        </div>
      )}

      {mergeMode && mergeSelectedIds.size >= 2 && (
        <button onClick={() => setShowMergeSheet(true)} style={mergeFabStyle}>
          {t('recipesView.mergeSelected')(mergeSelectedIds.size)}
        </button>
      )}

      {showMergeSheet && (
        <MergeRecipesSheet
          recipes={mergeSelectedRecipes}
          onClose={() => setShowMergeSheet(false)}
          onMerged={async () => {
            setShowMergeSheet(false)
            setMergeMode(false)
            setMergeSelectedIds(new Set())
            await onRecipesChanged?.()
          }}
        />
      )}

      {openGroup && (
        <GroupMembersSheet
          group={openGroup.group}
          members={openGroup.members}
          allRecipes={recipes}
          onClose={() => setOpenGroupId(null)}
          onOpenRecipe={recipe => { setOpenGroupId(null); onSelect(recipe) }}
          onUngrouped={async () => { setOpenGroupId(null); await onRecipesChanged?.() }}
          onMembersAdded={onRecipesChanged}
        />
      )}
    </div>
  )
}

function SearchIcon() { return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg> }
function FilterIcon() { return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10M10 18h4"/></svg> }
function RowsIcon() { return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg> }
function CloseIcon() { return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg> }
function HeartIcon({ filled }) { return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg> }
function MergeCheckbox({ selected }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 99, flexShrink: 0, display: 'grid', placeItems: 'center',
      border: `1.5px solid ${selected ? 'var(--tomato)' : 'var(--line)'}`,
      background: selected ? 'var(--tomato)' : 'transparent', color: '#fffdf9', fontSize: 12, fontWeight: 700,
    }}>{selected ? '✓' : ''}</span>
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

export function RecipeCard({ recipe: r, onClick, highlightIngredient, compactMode = false, cookStat, mergeMode = false, mergeSelected = false }) {
  const { t } = useT()
  const cookCount = cookStat?.count || 0
  // How long ago beats how many times when you're deciding what to cook —
  // "3 weeks ago" tells you something "7x" does not.
  const lastCooked = relativeDayLabel(cookStat?.lastCooked, relativeLabels(t))
  const ingredientGroups = Array.isArray(r.ingredients) ? r.ingredients : []
  const recipeTags = Array.isArray(r.tags) ? r.tags : []
  const matchedIngredient = highlightIngredient
    ? ingredientGroups.flatMap(g => Array.isArray(g?.items) ? g.items : []).find(item => String(item?.name || '').toLowerCase().includes(highlightIngredient.trim().toLowerCase()))
    : null

  if (compactMode) {
    return (
      <div onClick={onClick} style={{
        background: 'var(--card)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
        border: `1px solid ${mergeSelected ? 'var(--tomato)' : 'var(--line)'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
      }}>
        {mergeMode && <MergeCheckbox selected={mergeSelected} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.title}
          </div>
          {r.tagline && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--charcoal-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.tagline}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--tomato-deep)', fontWeight: 600 }}>
            {cookCount > 0 ? t('recipesView.cookedCount')(cookCount) : t('recipesView.notYetCooked')}
          </div>
          {lastCooked && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--charcoal-soft)', marginTop: 1 }}>
              {lastCooked}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
      border: `1px solid ${mergeSelected ? 'var(--tomato)' : 'var(--line)'}`,
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      {mergeMode && <MergeCheckbox selected={mergeSelected} />}
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
                {ingredientGroups.reduce((s, g) => s + (Array.isArray(g?.items) ? g.items.length : 0), 0)} {t('recipesView.ingredients')} · {(Array.isArray(r.steps) ? r.steps : []).reduce((s, g) => s + (Array.isArray(g?.items) ? g.items.length : 0), 0)} {t('recipesView.steps')}
                {r.variants?.length > 0 ? ` · ${t('recipesView.variants')(r.variants.length)}` : ''}
              </>
          }
        </div>
        {(r.category || lastCooked) && !matchedIngredient && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 2 }}>
            {[r.category, lastCooked ? t('recipesView.lastCooked')(lastCooked) : null].filter(Boolean).join(' · ')}
          </div>
        )}
        {recipeTags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {recipeTags.map(tag => (
              <span key={tag} style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--sage)',
                background: 'var(--sage-light)', borderRadius: 99, padding: '1px 6px',
              }}>{tag}</span>
            ))}
          </div>
        )}
        {(r.allergen_tags?.length > 0 || r.is_vegan || r.is_vegetarian || r.is_pescatarian_or_better) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {r.is_vegan && <AllergenBadge diet>{t('diet.vegan')}</AllergenBadge>}
            {!r.is_vegan && r.is_vegetarian && <AllergenBadge diet>{t('diet.vegetarian')}</AllergenBadge>}
            {!r.is_vegan && !r.is_vegetarian && r.is_pescatarian_or_better && <AllergenBadge diet>{t('diet.pescatarian')}</AllergenBadge>}
            {(r.allergen_tags || []).map(tag => (
              <AllergenBadge key={tag}>{t(`allergens.${tag}`, ALLERGEN_LABELS[tag] || tag)}</AllergenBadge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GroupCard({ group, members, onOpen }) {
  const { t } = useT()
  const photoMembers = members.filter(m => m.photo_url).slice(0, 3)
  return (
    <div onClick={onOpen} style={{
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
        {photoMembers.length > 0 ? photoMembers.map((m, i) => (
          <img key={m.id} src={m.photo_url} alt="" style={{
            position: 'absolute', width: 40, height: 40, borderRadius: 8, objectFit: 'cover',
            border: '2px solid var(--card)', left: i * 6, top: i * 6, zIndex: photoMembers.length - i,
          }} />
        )) : (
          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--parchment-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🍽</div>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--charcoal)' }}>{group.name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 4 }}>
          {t('recipesView.groupCount')(members.length)}
        </div>
      </div>
      <span style={{ color: 'var(--tomato-deep)', fontSize: 20 }}>&gt;</span>
    </div>
  )
}

function GroupMembersSheet({ group, members, allRecipes = [], onClose, onOpenRecipe, onUngrouped, onMembersAdded }) {
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addSelectedIds, setAddSelectedIds] = useState(new Set())

  const memberIds = new Set(members.map(m => m.id))
  const addCandidates = allRecipes
    .filter(r => !memberIds.has(r.id))
    .filter(r => !addQuery.trim() || r.title.toLowerCase().includes(addQuery.trim().toLowerCase()))
    .slice(0, 60)

  const handleUngroup = async () => {
    setBusy(true)
    setError('')
    try {
      const { error: updateError } = await supabase.from('recipes').update({ group_id: null }).in('id', members.map(m => m.id))
      if (updateError) throw updateError
      await supabase.from('recipe_groups').delete().eq('id', group.id)
      await onUngrouped?.()
    } catch (err) {
      setError(err.message || t('recipesView.ungroupError'))
      setBusy(false)
    }
  }

  const toggleAddSelected = (id) => {
    setAddSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddMembers = async () => {
    if (!addSelectedIds.size) return
    setBusy(true)
    setError('')
    try {
      const { error: updateError } = await supabase.from('recipes').update({ group_id: group.id }).in('id', [...addSelectedIds])
      if (updateError) throw updateError
      setShowAddPicker(false)
      setAddQuery('')
      setAddSelectedIds(new Set())
      await onMembersAdded?.()
    } catch (err) {
      setError(err.message || t('recipesView.addToGroupError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onMouseDown={e => e.target === e.currentTarget && onClose()} style={sheetBackdropStyle}>
      <section style={sheetStyle} role="dialog" aria-modal="true" aria-labelledby="group-members-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <h2 id="group-members-title" style={{ margin: 0, flex: 1, fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--tomato-deep)' }}>{group.name}</h2>
          <button onClick={onClose} aria-label={t('recipesView.closeFilters')} style={iconButtonStyle}><CloseIcon /></button>
        </div>

        {showAddPicker ? (
          <>
            <input
              autoFocus type="text" value={addQuery} onChange={e => setAddQuery(e.target.value)}
              placeholder={t('recipesView.addToGroupSearch')}
              style={groupSearchInputStyle}
            />
            <div style={{ display: 'grid', gap: 6, marginTop: 10, marginBottom: 14 }}>
              {addCandidates.map(r => {
                const selected = addSelectedIds.has(r.id)
                return (
                  <button key={r.id} onClick={() => toggleAddSelected(r.id)} style={{ ...groupMemberButtonStyle, borderColor: selected ? 'var(--tomato)' : 'var(--line)' }}>
                    <MergeCheckbox selected={selected} />
                    {r.photo_url ? (
                      <img src={r.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'var(--parchment-dim)', fontSize: 18 }}>🍽</span>
                    )}
                    <b style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>{r.title}</b>
                  </button>
                )
              })}
              {!addCandidates.length && <div style={{ textAlign: 'center', padding: 16, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--charcoal-soft)' }}>{t('recipesView.noMatch')}</div>}
            </div>
            {error && <div role="alert" style={{ fontSize: 12.5, color: 'var(--tomato-deep)', marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowAddPicker(false); setAddQuery(''); setAddSelectedIds(new Set()) }} disabled={busy} style={{ ...ungroupButtonStyle, flex: 1 }}>
                {t('recipesView.cancelMerge')}
              </button>
              <button onClick={handleAddMembers} disabled={busy || !addSelectedIds.size} style={{ ...confirmAddButtonStyle, flex: 2, opacity: busy || !addSelectedIds.size ? 0.5 : 1 }}>
                {busy ? t('mergeRecipes.merging') : t('recipesView.addToGroupConfirm')(addSelectedIds.size)}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {members.map(m => (
                <button key={m.id} onClick={() => onOpenRecipe(m)} style={groupMemberButtonStyle}>
                  {m.photo_url ? (
                    <img src={m.photo_url} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'var(--parchment-dim)', fontSize: 20 }}>🍽</span>
                  )}
                  <b style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>{m.title}</b>
                  <span style={{ color: 'var(--tomato-deep)', fontSize: 20 }}>&gt;</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddPicker(true)} style={{ ...groupMemberButtonStyle, justifyContent: 'center', color: 'var(--tomato-deep)', fontWeight: 700, marginBottom: 14 }}>
              {t('recipesView.addToGroupBtn')}
            </button>
            {error && <div role="alert" style={{ fontSize: 12.5, color: 'var(--tomato-deep)', marginBottom: 10 }}>{error}</div>}
            <button onClick={handleUngroup} disabled={busy} style={{ ...ungroupButtonStyle, opacity: busy ? 0.6 : 1 }}>
              {busy ? t('recipesView.ungrouping') : t('recipesView.ungroupBtn')}
            </button>
          </>
        )}
      </section>
    </div>
  )
}

function CollectionsBar({ collections, collectionRecipeMap, activeId, onSelect, onChanged }) {
  const { t } = useT()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState(DEFAULT_COLLECTION_EMOJI)
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
    setNewEmoji(DEFAULT_COLLECTION_EMOJI)
    setBusy(false)
  }

  if (collections.length === 0 && !creating) {
    return (
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => { setCreating(true); setNewName(t('collections.dopamineMenu')); setNewEmoji('✨') }}
          style={{
            padding: '7px 14px', borderRadius: 99, border: '1px dashed var(--line)',
            background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)',
            fontSize: 12, cursor: 'pointer',
          }}
        >✨ {t('collections.dopamineMenu')}</button>
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
          <CollectionForm
            name={newName} setName={setNewName}
            emoji={newEmoji} setEmoji={setNewEmoji}
            onCreate={handleCreate}
            onCancel={() => setCreating(false)}
            busy={busy}
            compactPadding
          />
        </div>
      )}
    </div>
  )
}

const GRID_PLACEHOLDER_COLORS = ['#fde8d8','#e8f3e0','#e0eaf8','#f8e8f0','#f8f3e0','#e8f0f8','#f0e8f8']

export function GridCard({ recipe: r, onClick, cookStat }) {
  const cookCount = cookStat?.count || 0
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
      fontFamily: 'var(--font-mono)', fontSize: 9, borderRadius: 99, padding: '1px 6px',
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

const iconButtonStyle = { width: 34, height: 34, border: 0, borderRadius: 99, background: 'transparent', color: 'var(--charcoal-soft)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }
const filterButtonStyle = { minHeight: 38, padding: '0 11px', border: 0, borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
const sortSelectStyle = { minWidth: 0, flex: 1, height: 36, padding: '0 10px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600 }
const toolbarButtonStyle = { height: 36, padding: '0 11px', borderRadius: 99, border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
const sheetBackdropStyle = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(38, 25, 22, 0.38)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingTop: 40 }
const sheetStyle = { width: '100%', maxWidth: 480, maxHeight: '82dvh', overflowY: 'auto', boxSizing: 'border-box', background: 'var(--card)', borderRadius: '22px 22px 0 0', padding: '10px 20px calc(18px + env(safe-area-inset-bottom))', boxShadow: '0 -12px 40px rgba(55, 23, 18, 0.18)' }
const wishlistButtonStyle = { width: '100%', padding: '10px 12px', marginBottom: 14, border: '1px solid', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const clearButtonStyle = { flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--parchment-dim)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer' }
const showButtonStyle = { flex: 1.5, minHeight: 44, borderRadius: 12, border: 0, background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer' }
const mergeFabStyle = {
  position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(78px + env(safe-area-inset-bottom))',
  zIndex: 90, padding: '13px 22px', borderRadius: 99, border: 0, background: 'var(--tomato)', color: '#fffdf9',
  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 8px 24px rgba(42,36,32,0.28)',
}
const groupMemberButtonStyle = { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 7, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--parchment)', color: 'var(--charcoal)', cursor: 'pointer', boxSizing: 'border-box' }
const ungroupButtonStyle = { width: '100%', minHeight: 44, border: '1px solid var(--tomato)', borderRadius: 10, background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
const groupSearchInputStyle = { width: '100%', boxSizing: 'border-box', minHeight: 42, padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--parchment)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14 }
const confirmAddButtonStyle = { minHeight: 44, border: 0, borderRadius: 10, background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
