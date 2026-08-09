import { useState, useMemo, useRef } from 'react'
import { useT } from '../../lib/i18n'
import { CATEGORY_ORDER } from './AllRecipesView'

// Categories as a filter bar rather than a folder you walk into.
//
// Replaces the two-screen model — a list of nine categories, then a page per
// category. At around sixty recipes, thirty of them in one category, that second
// screen was a tap collecting no information: a scrollable list on the way to a
// scrollable list. Selecting a chip filters in place, so the recipes are always
// on screen and switching category is one tap rather than back-then-forward.
//
// It also removes a browser-history entry that had to be pushed by hand, which
// is the mechanism behind the back-gesture bug fixed in an earlier commit.

export default function CategoryBar({
  recipes, onSelect, onAdd, defaultOpenCategory,
  compactMode = false, cookCounts = {}, renderRecipe, onActiveChange,
}) {
  const { t } = useT()
  const [active, setActive] = useState(defaultOpenCategory || null)
  const [activeSub, setActiveSub] = useState(null)
  const [showEmpty, setShowEmpty] = useState(false)
  const barRef = useRef(null)

  // Counts come from the recipes actually visible, so they stay honest while a
  // search or a filter is narrowing things.
  const { byCategory, filled, empties } = useMemo(() => {
    const map = new Map()
    for (const recipe of recipes) {
      const cat = recipe.category || t('stats.uncategorized')
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(recipe)
    }
    const order = (name) => {
      const i = CATEGORY_ORDER.indexOf(name)
      return i === -1 ? CATEGORY_ORDER.length : i
    }
    const present = [...map.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    // Categories in the editorial order that hold nothing right now. Kept
    // visible-on-request so the structure doesn't silently disappear.
    const missing = CATEGORY_ORDER.filter(c => !map.has(c))
    return { byCategory: map, filled: present, empties: missing }
  }, [recipes, t])

  // Derived, not synced. A search can empty the selected category, and changing
  // category invalidates the selected subcategory — both are facts this render
  // can work out, so neither needs an effect correcting state afterwards.
  const current = active && byCategory.has(active) ? active : null

  const subcategories = useMemo(() => {
    if (!current) return []
    const counts = new Map()
    for (const recipe of byCategory.get(current) || []) {
      if (!recipe.subcategory) continue
      counts.set(recipe.subcategory, (counts.get(recipe.subcategory) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [current, byCategory])

  const currentSub = subcategories.some(([name]) => name === activeSub) ? activeSub : null

  const shown = useMemo(() => {
    let list = current ? (byCategory.get(current) || []) : recipes
    if (currentSub) list = list.filter(r => r.subcategory === currentSub)
    return list
  }, [current, currentSub, byCategory, recipes])

  const selectCategory = (name, el) => {
    setActive(name)
    setActiveSub(null)
    // Reported from the handler rather than an effect so the parent isn't
    // updated during render. Lets "add a recipe" prefill the category you're
    // looking at — the behaviour b494257 restored last time this view changed.
    onActiveChange?.(name)
    // Keep the chip you just tapped in view; without this the bar can leave the
    // active chip off-screen after a scroll.
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }

  return (
    <div>
      <div
        ref={barRef}
        style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}
      >
        <Chip
          active={current === null}
          onClick={e => selectCategory(null, e.currentTarget)}
          label={t('recipesView.allChip')}
          count={recipes.length}
        />
        {filled.map(cat => (
          <Chip
            key={cat}
            active={current === cat}
            onClick={e => selectCategory(cat, e.currentTarget)}
            label={cat}
            count={(byCategory.get(cat) || []).length}
          />
        ))}
        {empties.length > 0 && (
          <button
            onClick={() => setShowEmpty(v => !v)}
            style={{
              flexShrink: 0, padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
              border: '1px dashed var(--line)', background: 'none',
              color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11,
            }}
          >{t('recipesView.emptyCategories')(empties.length)}</button>
        )}
      </div>

      {showEmpty && empties.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {empties.map(cat => (
            <button
              key={cat}
              onClick={() => onAdd?.({ category: cat, subcategory: null })}
              disabled={!onAdd}
              style={{
                padding: '4px 10px', borderRadius: 99, cursor: onAdd ? 'pointer' : 'default',
                border: '1px dashed var(--line)', background: 'none',
                color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 10.5,
              }}
            >{cat}{onAdd ? ' +' : ''}</button>
          ))}
        </div>
      )}

      {subcategories.length > 0 && (
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          <SubChip active={!currentSub} onClick={() => setActiveSub(null)} label={t('recipesView.allChip')} />
          {subcategories.map(([name, count]) => (
            <SubChip
              key={name}
              active={currentSub === name}
              onClick={() => setActiveSub(currentSub === name ? null : name)}
              label={`${name} ${count}`}
            />
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', padding: '14px 2px' }}>
          {t('recipesView.noneHere')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}>
          {shown.map(recipe => renderRecipe(recipe, { compactMode, cookStat: cookCounts[recipe.id], onSelect }))}
        </div>
      )}
    </div>
  )
}

function Chip({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, display: 'inline-flex', alignItems: 'baseline', gap: 5,
        padding: '6px 13px', borderRadius: 99, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'var(--tomato)' : 'var(--card)',
        color: active ? 'var(--card)' : 'var(--charcoal)',
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: active ? 700 : 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: active ? 'rgba(255,253,249,0.75)' : 'var(--charcoal-soft)',
      }}>{count}</span>
    </button>
  )
}

function SubChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--sage)' : 'var(--line)'}`,
        background: active ? 'var(--sage-light)' : 'none',
        color: active ? 'var(--sage)' : 'var(--charcoal-soft)',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      }}
    >{label}</button>
  )
}
