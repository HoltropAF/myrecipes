import { useState, useMemo } from 'react'
import { useT } from '../lib/i18n'
import { rankByFridge, parseHaveList } from '../lib/fridgeMatch'

export default function WhatCanIMake({ recipes, onSelect }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')

  const haveIngredients = useMemo(() => parseHaveList(input), [input])

  const { makeable, missingOne, missingTwo } = useMemo(
    () => rankByFridge(recipes, haveIngredients),
    [recipes, haveIngredients]
  )

  const totalResults = makeable.length + missingOne.length + missingTwo.length

  // Remove one term by rewriting the box, so the text field stays the single
  // source of truth rather than keeping a parallel list in state.
  const removeTerm = (index) => {
    const parts = input.split(',')
    let seen = -1
    const kept = parts.filter(part => {
      if (parseHaveList(part).length === 0) return true
      seen += 1
      return seen !== index
    })
    setInput(kept.join(',').replace(/^\s*,\s*/, ''))
  }

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
          {haveIngredients.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {haveIngredients.map((term, i) => (
                <button
                  key={term}
                  onClick={() => removeTerm(i)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                    border: '1px solid var(--sage)', background: 'var(--sage-light)',
                    color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 11,
                  }}
                >{term}<span style={{ opacity: 0.7 }}>✕</span></button>
              ))}
            </div>
          )}

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)', marginBottom: totalResults > 0 ? 10 : 0 }}>
            {t('whatCanIMake.hint')}
          </div>

          {haveIngredients.length > 0 && totalResults === 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
              {t('whatCanIMake.noMatch')}
            </div>
          )}

          <ResultGroup
            label={t('whatCanIMake.makeableNow')}
            tone="sage"
            results={makeable}
            onSelect={onSelect}
            t={t}
          />
          <ResultGroup
            label={t('whatCanIMake.missingOne')}
            tone="amber"
            results={missingOne}
            onSelect={onSelect}
            t={t}
          />
          <ResultGroup
            label={t('whatCanIMake.missingTwo')}
            tone="muted"
            results={missingTwo}
            onSelect={onSelect}
            t={t}
          />
        </div>
      )}
    </div>
  )
}

const TONES = {
  sage:  { border: 'var(--sage)',  text: 'var(--sage)' },
  amber: { border: 'var(--tomato)', text: 'var(--tomato-deep)' },
  muted: { border: 'var(--line)',  text: 'var(--charcoal-soft)' },
}

function ResultGroup({ label, tone, results, onSelect, t }) {
  if (results.length === 0) return null
  const colours = TONES[tone] || TONES.muted

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--charcoal-soft)', marginBottom: 5,
      }}>{label} · {results.length}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {results.map(({ recipe, missing }) => (
          <button
            key={recipe.id}
            onClick={() => onSelect(recipe)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '10px 12px', borderRadius: 9,
              border: `1px solid ${colours.border}`,
              background: 'var(--parchment)', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, flexShrink: 0,
              color: colours.text, minWidth: 26, textAlign: 'center',
            }}>
              {missing.length === 0 ? t('whatCanIMake.allBadge') : `−${missing.length}`}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: 'var(--charcoal)' }}>
                {recipe.title}
              </span>
              {/* Naming what's missing is the whole point — "one mango away"
                  beats any score. */}
              {missing.length > 0 && (
                <span style={{
                  display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10.5,
                  color: 'var(--charcoal-soft)', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{missing.join(' · ')}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
