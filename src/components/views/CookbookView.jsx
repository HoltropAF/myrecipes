import { useState, useMemo } from 'react'
import { RecipeCard } from './AllRecipesView'

const CATEGORY_ICONS = {
  'Breakfast & Brunch': '🍳', 'Appetizers & Snacks': '🥟', 'Soups & Salads': '🥗',
  'Main dishes': '🍽', 'Sides': '🍚', 'Desserts': '🍰', 'Baking': '🥐',
  'Drinks': '🍹', 'Household': '🧴',
}

export default function CookbookView({ recipes, onSelect, onAdd, defaultOpenCategory }) {
  const [openCategories, setOpenCategories] = useState(() => defaultOpenCategory ? { [defaultOpenCategory]: true } : {})
  const [openSubcategories, setOpenSubcategories] = useState({})
  const [lastOpened, setLastOpened] = useState(defaultOpenCategory ? { category: defaultOpenCategory, subcategory: null } : null)

  // Build a tree: { category: { direct: [recipes], subcategories: { name: [recipes] } } }
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
    // sort categories by total recipe count, descending
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

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)' }}>Cookbook</h1>
        <button onClick={() => onAdd(lastOpened)} style={addBtnStyle}>+ Add</button>
      </div>

      {tree.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
          No recipes yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tree.map(([cat, { direct, subcategories }]) => {
            const totalCount = direct.length + Object.values(subcategories).flat().length
            const isOpen = !!openCategories[cat]
            const subEntries = Object.entries(subcategories).sort((a, b) => b[1].length - a[1].length)

            return (
              <div key={cat} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Category toggle row */}
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

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--line)', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Subcategory toggles shown first */}
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

                    {/* Direct recipes (no subcategory) shown after, optionally under their own label
                        if this category also has subcategories, so they don't get confused with them */}
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
      )}
    </div>
  )
}

const addBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--tomato)',
  color: 'var(--card)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
