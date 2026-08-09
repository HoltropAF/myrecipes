import { useState, useMemo } from 'react'
import { useT } from '../lib/i18n'
import { suggestForNow, shufflePick } from '../lib/suggest'
import { parseHaveList } from '../lib/fridgeMatch'
import { relativeDayLabel } from '../lib/dateUtils'

// "What am I making tonight" — one suggestion from the clock and the cook log,
// and a shuffle for when you don't like the answer.
//
// Sits above the cookbook rather than replacing it: browsing stays exactly where
// it was, this is just a faster way in.
export default function DecideCard({ recipes, cookStats = {}, onSelect }) {
  const { t } = useT()
  const [shuffled, setShuffled] = useState(null)
  const [ingredients, setIngredients] = useState('')
  const [showIngredients, setShowIngredients] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [spinning, setSpinning] = useState(false)

  const haveList = useMemo(() => parseHaveList(ingredients), [ingredients])

  // Computed once per mount. Re-rolling on every render would mean the
  // suggestion changed under you whenever anything else on the screen did.
  const tonight = useMemo(
    () => suggestForNow(recipes, cookStats),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipes.length]
  )

  const shown = shuffled || tonight?.recipe
  if (!shown) return null

  const stat = cookStats[shown.id] || {}
  const labels = {
    today: t('relative.today'), yesterday: t('relative.yesterday'),
    days: (n) => t('relative.days')(n), weeks: (n) => t('relative.weeks')(n),
    months: (n) => t('relative.months')(n), years: (n) => t('relative.years')(n),
  }

  const handleShuffle = () => {
    setNoMatch(false)
    setSpinning(true)
    const { recipe, noMatch: missed } = shufflePick(recipes, {
      haveList,
      exclude: shown?.id,
    })
    // A beat before the answer. An instant result reads as arbitrary; a short
    // pause reads as the app having considered it.
    setTimeout(() => {
      setSpinning(false)
      if (missed) { setNoMatch(true); return }
      if (recipe) setShuffled(recipe)
    }, 420)
  }

  // Why this one — a suggestion you can't account for feels random.
  const reasonText = () => {
    if (shuffled) return t('decide.shuffled')
    const parts = (tonight?.reasons || []).map(r => {
      if (r.key === 'quick') return t('decide.reasonQuick')(r.value)
      if (r.key === 'liked') return t('decide.reasonLiked')(r.value)
      if (r.key === 'untried') return t('decide.reasonUntried')
      if (r.key === 'ages') return t('decide.reasonAges')
      return null
    }).filter(Boolean)
    if (parts.length === 0 && stat.lastCooked) {
      return t('decide.lastMade')(relativeDayLabel(stat.lastCooked, labels))
    }
    return parts.join(' · ')
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
      overflow: 'hidden', marginBottom: 16,
    }}>
      <div style={{ padding: '11px 14px 0' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '0.09em', color: 'var(--charcoal-soft)',
        }}>{shuffled ? t('decide.headingShuffle') : t('decide.heading')}</span>
      </div>

      <button
        onClick={() => onSelect(shown)}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, width: '100%',
          padding: '9px 14px 12px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          opacity: spinning ? 0.35 : 1, transition: 'opacity 0.18s ease',
        }}
      >
        {shown.photo_url ? (
          <img src={shown.photo_url} alt="" style={{ width: 52, height: 52, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <span style={{
            width: 52, height: 52, borderRadius: 9, flexShrink: 0, background: 'var(--parchment-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🍽</span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 650,
            color: 'var(--charcoal)', lineHeight: 1.25,
          }}>{shown.title}</span>
          <span style={{
            display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)',
            marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {shown.total_minutes ? `${shown.total_minutes} min · ` : ''}{reasonText()}
          </span>
        </span>
      </button>

      <div style={{ display: 'flex', gap: 7, padding: '0 14px 12px' }}>
        <button
          onClick={handleShuffle}
          disabled={spinning}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 9, cursor: spinning ? 'default' : 'pointer',
            border: '1px solid var(--tomato)', background: 'var(--tomato)', color: '#fffdf9',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
          }}
        >{spinning ? t('decide.shuffling') : t('decide.shuffle')}</button>
        <button
          onClick={() => setShowIngredients(v => !v)}
          style={{
            padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
            border: `1px solid ${haveList.length > 0 ? 'var(--sage)' : 'var(--line)'}`,
            background: haveList.length > 0 ? 'var(--sage-light)' : 'var(--card)',
            color: haveList.length > 0 ? 'var(--sage)' : 'var(--charcoal-soft)',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}
        >{haveList.length > 0 ? t('decide.usingCount')(haveList.length) : t('decide.using')}</button>
      </div>

      {showIngredients && (
        <div style={{ padding: '0 14px 12px' }}>
          <input
            type="text"
            value={ingredients}
            onChange={e => { setIngredients(e.target.value); setNoMatch(false) }}
            placeholder={t('decide.usingPlaceholder')}
            style={{
              width: '100%', padding: '8px 11px', borderRadius: 8, border: '1px solid var(--line)',
              background: 'var(--parchment)', color: 'var(--charcoal)',
              fontFamily: 'var(--font-body)', fontSize: 13, boxSizing: 'border-box', outline: 'none',
            }}
          />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)', marginTop: 5 }}>
            {noMatch ? t('decide.noMatch') : t('decide.usingHint')}
          </div>
        </div>
      )}
    </div>
  )
}
