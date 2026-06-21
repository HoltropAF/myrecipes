import { useState, useMemo } from 'react'

export default function AllRecipesView({ recipes, loading, onSelect, onAdd }) {
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState('title') // 'title' | 'ingredient'
  const [wishlistOnly, setWishlistOnly] = useState(false)

  const filtered = useMemo(() => {
    let base = wishlistOnly ? recipes.filter(r => r.wishlist) : recipes
    if (!query.trim()) return base
    const q = query.trim().toLowerCase()
    if (searchMode === 'ingredient') {
      return base.filter(r => {
        const allIngredients = [
          ...(r.ingredients || []),
          ...(r.variants || []).flatMap(v => v.ingredients || []),
        ]
        return allIngredients.some(group => group.items.some(item => item.name.toLowerCase().includes(q)))
      })
    }
    return base.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.tagline || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q)
    )
  }, [recipes, query, searchMode, wishlistOnly])

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)' }}>All recipes</h1>
        <button onClick={onAdd} style={addBtnStyle}>+ Add</button>
      </div>

      {/* Search mode toggle */}
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
        placeholder={searchMode === 'ingredient' ? 'e.g. knoflook, kip…' : 'Search recipes…'}
        style={{
          width: '100%', padding: '11px 13px', borderRadius: 9, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 15,
          marginBottom: 10, boxSizing: 'border-box',
        }}
      />

      <button
        onClick={() => setWishlistOnly(w => !w)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
          border: `1px solid ${wishlistOnly ? 'var(--tomato)' : 'var(--line)'}`,
          background: wishlistOnly ? 'var(--tomato)' : 'var(--card)',
          color: wishlistOnly ? 'var(--card)' : 'var(--charcoal-soft)',
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 16,
        }}
      >⭐ Wishlist only</button>
      <br />

      {loading ? (
        <Empty>loading recipes…</Empty>
      ) : filtered.length === 0 ? (
        <Empty>{query ? 'No recipes match.' : 'No recipes yet — tap + Add to create one.'}</Empty>
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

export function RecipeCard({ recipe: r, onClick, highlightIngredient }) {
  const matchedIngredient = highlightIngredient
    ? (r.ingredients || []).flatMap(g => g.items).find(item => item.name.toLowerCase().includes(highlightIngredient.trim().toLowerCase()))
    : null

  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      {r.photo_url && (
        <img src={r.photo_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
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
