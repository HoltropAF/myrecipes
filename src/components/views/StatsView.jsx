import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import LoadingGyoza from '../LoadingGyoza'

export default function StatsView({ recipes, isGuest = false, demoCookLog = null }) {
  const [cookLog, setCookLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isGuest) {
      setCookLog(demoCookLog || [])
      setLoading(false)
      return
    }
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

    const totalCooks = cookLog.length
    const totalRecipes = recipes.length
    const triedCount = recipes.filter(r => countByRecipe[r.id]).length
    const neverCooked = recipes.filter(r => !countByRecipe[r.id]).length

    return { mostCooked, topRated, categoryList, totalCooks, totalRecipes, triedCount, neverCooked }
  }, [recipes, cookLog])

  if (loading) {
    return <div style={{ padding: '0 20px 100px' }}><LoadingGyoza label="loading stats…" /></div>
  }

  const maxCategoryCount = Math.max(...stats.categoryList.map(([, c]) => c), 1)

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>Stats</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        <Tile value={stats.totalRecipes} label="recipes" />
        <Tile value={stats.totalCooks} label="cooks logged" />
        <Tile value={stats.triedCount} label="recipes tried" />
        <Tile value={stats.neverCooked} label="never made" />
      </div>

      {stats.totalCooks === 0 && !isGuest && (
        <div style={{
          background: 'var(--sage-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.5,
        }}>
          🥟 Once you start logging cooks (tap the <strong>+</strong> button → "Log a cook"), this page fills up with your most-made and top-rated recipes.
        </div>
      )}

      <SectionLabel>Recipes by category</SectionLabel>
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 14px', marginBottom: 22 }}>
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
