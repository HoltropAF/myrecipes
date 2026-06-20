import { useState, useMemo } from 'react'
import { RecipeCard } from './AllRecipesView'

const CATEGORY_ICONS = {
  Pasta: '🍝', Tacos: '🌮', Curry: '🍛', Casserole: '🍲', Salade: '🥗',
  Noodles: '🍜', Flammkuchen: '🫓', Snacks: '🥟', Bijgerecht: '🍚',
  Kip: '🍗', 'Bao buns': '🥟', Drankjes: '🍹', Household: '🧴',
}

export default function CookbookView({ recipes, onSelect, onAdd }) {
  const [activeCategory, setActiveCategory] = useState(null)

  const categories = useMemo(() => {
    const map = {}
    for (const r of recipes) {
      const cat = r.category || 'Uncategorized'
      if (!map[cat]) map[cat] = []
      map[cat].push(r)
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length)
  }, [recipes])

  if (activeCategory) {
    const items = categories.find(([cat]) => cat === activeCategory)?.[1] || []
    return (
      <div style={{ padding: '0 20px 100px' }}>
        <button onClick={() => setActiveCategory(null)} style={backBtnStyle}>‹ Cookbook</button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>
          {CATEGORY_ICONS[activeCategory] || '🍽'} {activeCategory}
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(r => (
            <RecipeCard key={r.id} recipe={r} onClick={() => onSelect(r)} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)' }}>Cookbook</h1>
        <button onClick={onAdd} style={addBtnStyle}>+ Add</button>
      </div>

      {categories.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
          No recipes yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {categories.map(([cat, items]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 14px',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 26 }}>{CATEGORY_ICONS[cat] || '🍽'}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--charcoal)' }}>{cat}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>{items.length} recipe{items.length !== 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const addBtnStyle = {
  padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--tomato)',
  color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
}

const backBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, padding: '12px 0 8px', display: 'block',
}
