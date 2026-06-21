import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

export default function StatsView({ recipes }) {
  const [cookLog, setCookLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('cook_log').select('*').then(({ data }) => {
      setCookLog(data || [])
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => {
    const recipeById = Object.fromEntries(recipes.map(r => [r.id, r]))

    const countByRecipe = {}
    const upByRecipe = {}
    const downByRecipe = {}
    for (const entry of cookLog) {
      countByRecipe[entry.recipe_id] = (countByRecipe[entry.recipe_id] || 0) + 1
      if (entry.thumbs === 'up') upByRecipe[entry.recipe_id] = (upByRecipe[entry.recipe_id] || 0) + 1
      if (entry.thumbs === 'down') downByRecipe[entry.recipe_id] = (downByRecipe[entry.recipe_id] || 0) + 1
    }

    const mostCooked = Object.entries(countByRecipe)
      .map(([id, count]) => ({ recipe: recipeById[id], count }))
      .filter(x => x.recipe)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const topRated = Object.entries(upByRecipe)
      .map(([id, up]) => ({ recipe: recipeById[id], up, down: downByRecipe[id] || 0 }))
      .filter(x => x.recipe && x.up > (downByRecipe[x.recipe.id] || 0))
      .sort((a, b) => (b.up - b.down) - (a.up - a.down))
      .slice(0, 5)

    const byCategory = {}
    for (const r of recipes) {
      const cat = r.category || 'Uncategorized'
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }
    const categoryList = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString(undefined, { month: 'short' }), count: 0 })
    }
    const monthMap = Object.fromEntries(months.map(m => [m.key, m]))
    for (const entry of cookLog) {
      const key = entry.cooked_date.slice(0, 7)
      if (monthMap[key]) monthMap[key].count++
    }

    const totalCooks = cookLog.length
    const totalRecipes = recipes.length
    const wishlistCount = recipes.filter(r => r.wishlist).length
    const neverCooked = recipes.filter(r => !countByRecipe[r.id]).length

    return { mostCooked, topRated, categoryList, months, totalCooks, totalRecipes, wishlistCount, neverCooked }
  }, [recipes, cookLog])

  if (loading) {
    return <div style={{ padding: '0 20px 100px', fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 13 }}>loading stats…</div>
  }

  const maxMonthCount = Math.max(...stats.months.map(m => m.count), 1)
  const maxCategoryCount = Math.max(...stats.categoryList.map(([, c]) => c), 1)

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>Stats</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        <Tile value={stats.totalRecipes} label="recipes" />
        <Tile value={stats.totalCooks} label="cooks logged" />
        <Tile value={stats.wishlistCount} label="wishlist" />
        <Tile value={stats.neverCooked} label="never made" />
      </div>

      <SectionLabel>Cooking activity (last 6 months)</SectionLabel>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 14px 12px', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
          {stats.months.map(m => (
            <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', borderRadius: 4, background: m.count > 0 ? 'var(--tomato)' : 'var(--line)',
                height: Math.max(4, (m.count / maxMonthCount) * 64),
              }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {stats.mostCooked.length > 0 && (
        <>
          <SectionLabel>Most cooked</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {stats.mostCooked.map(({ recipe, count }, i) => (
              <RankRow key={recipe.id} rank={i + 1} title={recipe.title} value={`${count}×`} />
            ))}
          </div>
        </>
      )}

      {stats.topRated.length > 0 && (
        <>
          <SectionLabel>Top rated</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {stats.topRated.map(({ recipe, up, down }, i) => (
              <RankRow key={recipe.id} rank={i + 1} title={recipe.title} value={`👍 ${up}${down > 0 ? ` · 👎 ${down}` : ''}`} />
            ))}
          </div>
        </>
      )}

      <SectionLabel>Recipes by category</SectionLabel>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
        {stats.categoryList.map(([cat, count]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
            <div style={{ flex: 1, height: 8, background: 'var(--parchment-dim)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: 'var(--sage)', width: `${(count / maxCategoryCount) * 100}%` }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)', width: 20, textAlign: 'right' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Tile({ value, label }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--tomato-deep)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function RankRow({ rank, title, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)', width: 16, flexShrink: 0 }}>{rank}</span>
      <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--tomato-deep)', flexShrink: 0 }}>{value}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
    }}>{children}</div>
  )
}
