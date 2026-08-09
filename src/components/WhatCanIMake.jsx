import { useState, useMemo } from 'react'
import { normalizeName } from '../lib/ingredientParser'
import { useT } from '../lib/i18n'

export default function WhatCanIMake({ recipes, onSelect }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')

  // Filter *after* normalising, not before. normalizeName strips descriptor words
  // outright, so "fresh" or "verse" normalises to "" — and an empty needle makes
  // name.includes(have) true for every recipe.
  const haveIngredients = useMemo(
    () => input.split(',').map(s => normalizeName(s.trim())).filter(s => s.length > 0),
    [input]
  )

  const matches = useMemo(() => {
    if (haveIngredients.length === 0) return []
    const scored = recipes.map(r => {
      const recipeIngredientNames = (r.ingredients || [])
        .flatMap(g => g.items || [])
        .map(item => normalizeName(item.name || ''))
        .filter(name => name.length > 0)
      const matchCount = haveIngredients.filter(have =>
        recipeIngredientNames.some(name => name.includes(have) || have.includes(name))
      ).length
      return { recipe: r, matchCount }
    })
    return scored
      .filter(s => s.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 8)
  }, [recipes, haveIngredients])

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 18 }}>🥟</span>
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--charcoal)' }}>
          {t('whatCanIMake.heading')}
        </span>
        <span style={{
          color: 'var(--charcoal-soft)', fontSize: 13, transition: 'transform 0.15s ease',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block',
        }}>›</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={t('whatCanIMake.placeholder')}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
              background: 'var(--parchment)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14,
              boxSizing: 'border-box', marginBottom: 10,
            }}
          />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)', marginBottom: matches.length > 0 ? 10 : 0 }}>
            {t('whatCanIMake.hint')}
          </div>

          {haveIngredients.length > 0 && matches.length === 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
              {t('whatCanIMake.noMatch')}
            </div>
          )}

          {matches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {matches.map(({ recipe, matchCount }) => (
                <button
                  key={recipe.id}
                  onClick={() => onSelect(recipe)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
                    background: 'var(--parchment)', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--charcoal)' }}>{recipe.title}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sage)', flexShrink: 0 }}>
                    {t('whatCanIMake.matchCount')(matchCount, haveIngredients.length)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
