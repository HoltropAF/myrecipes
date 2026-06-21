import { useState, useMemo } from 'react'
import LoadingGyoza from '../LoadingGyoza'
import WhatCanIMake from '../WhatCanIMake'
import { MAIN_INGREDIENTS, MEAL_TYPES, getMainIngredientKeys } from '../../lib/recipeTags'

export const CATEGORY_ICONS = {
  'Breakfast & Brunch': '🍳', 'Appetizers & Snacks': '🥟', 'Soups & Salads': '🥗',
  'Main dishes': '🍽', 'Sides': '🍚', 'Desserts': '🍰', 'Baking': '🥐',
  'Drinks': '🍹', 'Household': '🧴',
}

export default function AllRecipesView({ recipes, loading, onSelect, onAdd, defaultOpenCategory }) {
  const [viewMode, setViewMode] = useState('list') // 'list' | 'folders'
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState('title') // 'title' | 'ingredient'
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [sortBy, setSortBy] = useState('recent')
  const [mealTypeFilter, setMealTypeFilter] = useState(null)
  const [proteinFilter, setProteinFilter] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [lastOpenedFolder, setLastOpenedFolder] = useState(defaultOpenCategory ? { category: defaultOpenCategory, subcategory: null } : null)

  const allTags = useMemo(
    () => [...new Set(recipes.flatMap(r => r.tags || []))].sort(),
    [recipes]
  )

  const filtered = useMemo(() => {
    let base = wishlistOnly ? recipes.filter(r => r.wishlist) : recipes
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
          (r.tags || []).some(t => t.toLowerCase().includes(q))
        )
      }
    }
    const sorted = [...base]
    if (sortBy === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title))
    else if (sortBy === 'category') sorted.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
    else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return sorted
  }, [recipes, query, searchMode, wishlistOnly, sortBy, mealTypeFilter, proteinFilter, tagFilter])

  const activeFilterCount = [mealTypeFilter, proteinFilter, tagFilter].filter(Boolean).length

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)' }}>Recipes</h1>
        {onAdd && <button onClick={() => onAdd(viewMode === 'folders' ? lastOpenedFolder : null)} style={addBtnStyle}>+ Add</button>}
      </div>

      <WhatCanIMake recipes={recipes} onSelect={onSelect} />

      {/* List / Folders toggle */}
      <div style={{ display: 'flex', background: 'var(--parchment-dim)', borderRadius: 10, padding: 3, marginBottom: 10, gap: 2 }}>
        {[['list', 'List'], ['folders', 'Cookbook']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
              background: viewMode === id ? 'var(--card)' : 'transparent',
              color: viewMode === id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
              boxShadow: viewMode === id ? '0 1px 3px rgba(42,36,32,0.12)' : 'none',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', background: 'var(--parchment-dim)', borderRadius: 10, padding: 3, marginBottom: 10, gap: 2 }}>
        {[['title', 'By name'], ['ingredient', 'By ingredient']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSearchMode(id)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
              background: searchMode === id ? 'var(--card)' : 'transparent',
              color: searchMode === id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
              boxShadow: searchMode === id ? '0 1px 3px rgba(42,36,32,0.12)' : 'none',
            }}
          >{label}</button>
        ))}
      </div>

      <input
        type="text" value={query} onChange={e => setQuery(e.target.value)}
        placeholder={searchMode === 'ingredient' ? 'e.g. knoflook, kip…' : 'Search recipes, notes, tags…'}
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
        >Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</button>

        <button
          onClick={() => setWishlistOnly(w => !w)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
            border: `1px solid ${wishlistOnly ? 'var(--tomato)' : 'var(--line)'}`,
            background: wishlistOnly ? 'var(--tomato)' : 'var(--card)',
            color: wishlistOnly ? 'var(--card)' : 'var(--charcoal-soft)',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >Wishlist</button>

        <select
          value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--card)',
            color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
          }}
        >
          <option value="recent">Recently added</option>
          <option value="name">Name (A–Z)</option>
          <option value="category">Category</option>
        </select>
      </div>

      {showFilters && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <FilterGroup
            label="Meal type"
            options={MEAL_TYPES}
            active={mealTypeFilter}
            onSelect={setMealTypeFilter}
          />
          <FilterGroup
            label="Main ingredient"
            options={MAIN_INGREDIENTS}
            active={proteinFilter}
            onSelect={setProteinFilter}
          />
          {allTags.length > 0 && (
            <FilterGroup
              label="Tags"
              options={allTags.map(t => ({ key: t, label: t }))}
              active={tagFilter}
              onSelect={setTagFilter}
            />
          )}
        </div>
      )}

      {loading ? (
        <LoadingGyoza label="loading recipes…" />
      ) : viewMode === 'folders' ? (
        <FolderView
          recipes={filtered} onSelect={onSelect} onAdd={onAdd} defaultOpenCategory={defaultOpenCategory}
          lastOpened={lastOpenedFolder} setLastOpened={setLastOpenedFolder}
        />
      ) : filtered.length === 0 ? (
        <Empty>{query || activeFilterCount > 0 ? 'No recipes match.' : 'No recipes yet — tap + Add to create one.'}</Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => (
            <RecipeCard key={r.id} recipe={r} onClick={() => onSelect(r)} highlightIngredient={searchMode === 'ingredient' ? query : null} />
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
function FolderView({ recipes, onSelect, onAdd, defaultOpenCategory, lastOpened, setLastOpened }) {
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
          No recipes match.
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
                            <RecipeCard key={r.id} recipe={r} onClick={() => onSelect(r)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {direct.length > 0 && subEntries.length > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                    Other {cat.toLowerCase()}
                  </div>
                )}
                {direct.map(r => (
                  <RecipeCard key={r.id} recipe={r} onClick={() => onSelect(r)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function RecipeCard({ recipe: r, onClick, highlightIngredient }) {
  const matchedIngredient = highlightIngredient
    ? (r.ingredients || []).flatMap(g => g.items).find(item => item.name.toLowerCase().includes(highlightIngredient.trim().toLowerCase()))
    : null

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
          {r.wishlist && <span style={{ marginRight: 5 }}>⭐</span>}{r.title}
        </div>
        {r.tagline && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal-soft)', marginTop: 2 }}>{r.tagline}</div>}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: 5 }}>
          {matchedIngredient
            ? `contains: ${matchedIngredient.name}`
            : <>
                {(r.ingredients || []).reduce((s, g) => s + g.items.length, 0)} ingredients · {(r.steps || []).reduce((s, g) => s + g.items.length, 0)} steps
                {r.category ? ` · ${r.category}` : ''}
              </>
          }
        </div>
        {(r.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {r.tags.map(t => (
              <span key={t} style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sage)',
                background: 'var(--sage-light)', borderRadius: 99, padding: '2px 8px',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
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
