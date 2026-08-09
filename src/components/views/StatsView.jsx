import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import LoadingGyoza from '../LoadingGyoza'
import { useT } from '../../lib/i18n'
import { daysBetween, relativeDayLabel } from '../../lib/dateUtils'

// dateUtils formats the shape; i18n supplies the words.
const relativeLabels = (t) => ({
  today: t('relative.today'),
  yesterday: t('relative.yesterday'),
  days: (n) => t('relative.days')(n),
  weeks: (n) => t('relative.weeks')(n),
  months: (n) => t('relative.months')(n),
  years: (n) => t('relative.years')(n),
})

export default function StatsView({ recipes, isGuest = false, demoCookLog = null, onSelectRecipe }) {
  const { t, lang } = useT()
  // null means "not fetched yet". Guest data arrives as a prop, so it is read
  // during render rather than copied into state by an effect.
  const [remoteLog, setRemoteLog] = useState(null)

  useEffect(() => {
    if (isGuest) return
    let cancelled = false
    supabase.from('cook_log').select('*').then(({ data }) => {
      if (!cancelled) setRemoteLog(data || [])
    })
    return () => { cancelled = true }
  }, [isGuest])

  const cookLog = isGuest ? (demoCookLog || []) : (remoteLog || [])
  const loading = !isGuest && remoteLog === null

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
      const cat = r.category || t('stats.uncategorized')
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }
    const categoryList = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

    const FORGOTTEN_AFTER_DAYS = 120
    const forgotten = recipes
      .map(recipe => {
        const entries = cookLog.filter(e => e.recipe_id === recipe.id)
        if (entries.length === 0) return null
        const up = entries.filter(e => e.thumbs === 'up').length
        const down = entries.filter(e => e.thumbs === 'down').length
        if (up === 0 || down >= up) return null
        const last = entries.reduce((a, e) => (e.cooked_date > a ? e.cooked_date : a), '')
        const days = daysBetween(last)
        if (days === null || days < FORGOTTEN_AFTER_DAYS) return null
        return { recipe, up, last, days }
      })
      .filter(Boolean)
      .sort((a, b) => b.days - a.days)
      .slice(0, 5)

    const totalCooks = cookLog.length
    const totalRecipes = recipes.length
    const triedCount = recipes.filter(r => countByRecipe[r.id]).length
    const neverCooked = recipes.filter(r => !countByRecipe[r.id]).length

    return { mostCooked, topRated, forgotten, categoryList, totalCooks, totalRecipes, triedCount, neverCooked }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, cookLog, lang])

  if (loading) {
    return <div style={{ padding: '0 20px 100px' }}><LoadingGyoza label={t('stats.loading')} /></div>
  }

  const maxCategoryCount = Math.max(...stats.categoryList.map(([, c]) => c), 1)

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }}>{t('stats.title')}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        <Tile value={stats.totalRecipes} label={t('stats.tileRecipes')} />
        <Tile value={stats.totalCooks} label={t('stats.tileCooks')} />
        <Tile value={stats.triedCount} label={t('stats.tileTried')} />
        <Tile value={stats.neverCooked} label={t('stats.tileNever')} />
      </div>

      {stats.totalCooks === 0 && !isGuest && (
        <div style={{
          background: 'var(--sage-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.5,
        }}>
          🥟 {t('stats.emptyHint')}
        </div>
      )}

      <SectionLabel>{t('stats.byCategory')}</SectionLabel>
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
          <SectionLabel>{t('stats.mostCooked')}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {stats.mostCooked.map(({ recipe, count }, i) => (
              <RankRow key={recipe.id} rank={i + 1} title={recipe.title} value={`${count}×`} />
            ))}
          </div>
        </>
      )}

      {stats.forgotten.length > 0 && (
        <>
          <SectionLabel>{t('stats.forgotten')}</SectionLabel>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', marginTop: -4, marginBottom: 8 }}>
            {t('stats.forgottenDesc')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {stats.forgotten.map(({ recipe, up, last }) => (
              <button
                key={recipe.id}
                onClick={() => onSelectRecipe?.(recipe)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
                  padding: '10px 12px', cursor: onSelectRecipe ? 'pointer' : 'default',
                }}
              >
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {recipe.title}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', flexShrink: 0 }}>
                  {'👍'} {up} · {relativeDayLabel(last, relativeLabels(t))}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {stats.topRated.length > 0 && (
        <>
          <SectionLabel>{t('stats.topRated')}</SectionLabel>
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
