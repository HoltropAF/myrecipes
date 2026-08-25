import { useState, useMemo } from 'react'
import { useT } from '../lib/i18n'
import { suggestForNow, shufflePick } from '../lib/suggest'
import { parseHaveList } from '../lib/fridgeMatch'
import { relativeDayLabel } from '../lib/dateUtils'
import { useBackLayer } from '../lib/useBackLayer'

// "What am I making tonight" — one suggestion from the clock and the cook log,
// and a shuffle for when you don't like the answer.
//
// Sits above the cookbook rather than replacing it: browsing stays exactly where
// it was, this is just a faster way in.
export default function DecideCard({ recipes, cookStats = {}, onSelect, homeCompact = false }) {
  const { t } = useT()
  const [shuffled, setShuffled] = useState(null)
  const [ingredients, setIngredients] = useState('')
  const [showIngredients, setShowIngredients] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [showMealTypes, setShowMealTypes] = useState(false)
  const [emptyMealType, setEmptyMealType] = useState('')
  useBackLayer(showIngredients, () => setShowIngredients(false), 'ingredient-match')
  useBackLayer(showMealTypes, () => setShowMealTypes(false), 'meal-types')

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

  const handleCompactChoice = (mealType) => {
    const categoryMatches = {
      dinner: ['dinner', 'main dish', 'main dishes'],
      breakfastLunch: ['breakfast', 'brunch', 'lunch', 'breakfast & brunch', 'breakfast/lunch'],
      drink: ['drink', 'drinks', 'beverage', 'beverages'],
    }
    const allowed = categoryMatches[mealType]
    const candidates = recipes.filter(recipe => {
      const category = (recipe.category || '').trim().toLowerCase()
      return allowed.some(name => category === name || category.includes(name))
    })
    const { recipe } = shufflePick(candidates)
    if (!recipe) {
      setEmptyMealType(mealType)
      return
    }
    setShowMealTypes(false)
    setEmptyMealType('')
    onSelect(recipe)
  }

  if (homeCompact) {
    return (
      <>
        <button className="decide-home-row" onClick={() => setShowMealTypes(true)}>
          <span className="decide-home-row__icon" aria-hidden="true"><DinnerBellIcon /></span>
          <span className="decide-home-row__copy">
            <b>{t('decide.compactTitle', "Can't decide?")}</b>
            <small>{t('decide.compactHint', 'Let the cookbook choose for you')}</small>
          </span>
          <span className="decide-home-row__arrow" aria-hidden="true">&gt;</span>
        </button>
        {showMealTypes && (
          <div className="decide-meal-picker" role="presentation" onClick={() => setShowMealTypes(false)}>
            <section role="dialog" aria-modal="true" aria-labelledby="meal-picker-title" onClick={event => event.stopPropagation()}>
              <button className="decide-meal-picker__close" onClick={() => setShowMealTypes(false)} aria-label={t('decide.closePicker', 'Close')}>×</button>
              <h3 id="meal-picker-title">{t('decide.pickMealType', 'What kind of recipe?')}</h3>
              <p>{t('decide.pickMealHint', 'Choose one and the cookbook will surprise you.')}</p>
              <div className="decide-meal-picker__choices">
                <button onClick={() => handleCompactChoice('dinner')}>{t('decide.dinner', 'Dinner')}<span>&gt;</span></button>
                <button onClick={() => handleCompactChoice('breakfastLunch')}>{t('decide.breakfastLunch', 'Breakfast / lunch')}<span>&gt;</span></button>
                <button onClick={() => handleCompactChoice('drink')}>{t('decide.drink', 'Drink')}<span>&gt;</span></button>
              </div>
              {emptyMealType && <small className="decide-meal-picker__empty">{t('decide.noCategoryRecipes', 'You do not have a recipe in that category yet.')}</small>}
            </section>
          </div>
        )}
      </>
    )
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

function DinnerBellIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 15h18M5 15a7 7 0 0 1 14 0M12 6V4M2 15h20v2H2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
