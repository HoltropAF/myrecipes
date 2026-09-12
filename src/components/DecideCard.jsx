import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../lib/i18n'
import { suggestForNow, shufflePick } from '../lib/suggest'
import { parseHaveList } from '../lib/fridgeMatch'
import { relativeDayLabel } from '../lib/dateUtils'
import { useBackLayer } from '../lib/useBackLayer'
import { supabase } from '../lib/supabase'
import { rememberRecipesForPlanning } from '../lib/mealPlanning'

// "What am I making tonight" — one suggestion from the clock and the cook log,
// and a shuffle for when you don't like the answer.
//
// Sits above the cookbook rather than replacing it: browsing stays exactly where
// it was, this is just a faster way in.
export default function DecideCard({ recipes, cookStats = {}, onSelect, homeCompact = false, isGuest = false }) {
  const { t } = useT()
  const [shuffled, setShuffled] = useState(null)
  const [ingredients, setIngredients] = useState('')
  const [showIngredients, setShowIngredients] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [showMealTypes, setShowMealTypes] = useState(false)
  const [emptyMealType, setEmptyMealType] = useState('')
  const [compactMealType, setCompactMealType] = useState('')
  const [compactSuggestion, setCompactSuggestion] = useState(null)
  const [compactAccepted, setCompactAccepted] = useState(false)
  const [addingToList, setAddingToList] = useState(false)
  const [addedToList, setAddedToList] = useState(false)
  const [compactError, setCompactError] = useState('')
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

  const handleCompactChoice = (mealType, exclude = null) => {
    const candidates = recipes.filter(recipe => matchesMealType(recipe, mealType))
    const { recipe } = shufflePick(candidates, { exclude })
    if (!recipe) {
      setEmptyMealType(mealType)
      return
    }
    setEmptyMealType('')
    setCompactMealType(mealType)
    setCompactSuggestion(recipe)
    setCompactAccepted(false)
    setAddedToList(false)
    setCompactError('')
  }

  const closeCompactPicker = () => {
    setShowMealTypes(false)
    setCompactSuggestion(null)
    setCompactAccepted(false)
    setEmptyMealType('')
    setCompactError('')
  }

  const addCompactSuggestionToList = async () => {
    const rows = ingredientRows(compactSuggestion)
    if (!rows.length) {
      setCompactError('This recipe has no ingredients to add yet.')
      return
    }
    if (isGuest) {
      setCompactError('Sign in to add ingredients to your shopping list.')
      return
    }
    setAddingToList(true)
    setCompactError('')
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) {
      setCompactError('Please sign in again, then try once more.')
      setAddingToList(false)
      return
    }
    const { error } = await supabase.from('shopping_list').insert(
      rows.map(row => ({ ...row, user_id: userId, recipe_id: compactSuggestion.id }))
    )
    setAddingToList(false)
    if (error) {
      setCompactError('The ingredients could not be added. Please try again.')
      return
    }
    await rememberRecipesForPlanning([compactSuggestion.id])
    setAddedToList(true)
  }

  if (homeCompact) {
    return (
      <>
        <button className="decide-home-row" onClick={() => { setShowMealTypes(true); setCompactSuggestion(null); setCompactAccepted(false) }}>
          <span className="decide-home-row__icon" aria-hidden="true"><DinnerBellIcon /></span>
          <span className="decide-home-row__copy">
            <b>{t('decide.compactTitle', "Can't decide?")}</b>
            <small>{t('decide.compactHint', 'Let the cookbook choose for you')}</small>
          </span>
          <span className="decide-home-row__arrow" aria-hidden="true">&gt;</span>
        </button>
        {showMealTypes && createPortal(
          <div className="decide-meal-picker" role="presentation" onClick={closeCompactPicker}>
            <section role="dialog" aria-modal="true" aria-labelledby="meal-picker-title" onClick={event => event.stopPropagation()}>
              <button className="decide-meal-picker__close" onClick={closeCompactPicker} aria-label={t('decide.closePicker', 'Close')}>×</button>
              {!compactSuggestion ? <>
                <h3 id="meal-picker-title">{t('decide.pickMealType', 'What kind of recipe?')}</h3>
                <p>{t('decide.pickMealHint', 'Choose one and the cookbook will surprise you.')}</p>
                <div className="decide-meal-picker__choices">
                  <button onClick={() => handleCompactChoice('dinner')}>{t('decide.dinner', 'Dinner')}<span>&gt;</span></button>
                  <button onClick={() => handleCompactChoice('breakfastLunch')}>{t('decide.breakfastLunch', 'Breakfast / lunch')}<span>&gt;</span></button>
                  <button onClick={() => handleCompactChoice('drink')}>{t('decide.drink', 'Drink')}<span>&gt;</span></button>
                </div>
              </> : <>
                <h3 id="meal-picker-title">How about this?</h3>
                <article className="decide-meal-picker__suggestion">
                  {compactSuggestion.photo_url ? <img src={compactSuggestion.photo_url} alt="" /> : <span className="decide-meal-picker__placeholder">🍽</span>}
                  <div><b>{compactSuggestion.title}</b><small>{compactSuggestion.total_minutes ? `${compactSuggestion.total_minutes} min` : compactSuggestion.category || 'From your cookbook'}</small></div>
                </article>
                {!compactAccepted ? <div className="decide-meal-picker__decision">
                  <button className="is-secondary" onClick={() => handleCompactChoice(compactMealType, compactSuggestion.id)}>Another one</button>
                  <button onClick={() => setCompactAccepted(true)}>Yes, this one</button>
                </div> : <div className="decide-meal-picker__accepted">
                  <p>Lovely. What would you like to do?</p>
                  <button onClick={addCompactSuggestionToList} disabled={addingToList || addedToList}>{addedToList ? '✓ Added to shopping list' : addingToList ? 'Adding…' : 'Add ingredients to shopping list'}</button>
                  <button className="is-secondary" onClick={() => { closeCompactPicker(); onSelect(compactSuggestion) }}>Open recipe</button>
                  <button className="is-link" onClick={() => handleCompactChoice(compactMealType, compactSuggestion.id)}>Actually, show another</button>
                </div>}
              </>}
              {emptyMealType && <small className="decide-meal-picker__empty">{t('decide.noCategoryRecipes', 'You do not have a recipe in that category yet.')}</small>}
              {compactError && <small className="decide-meal-picker__empty">{compactError}</small>}
            </section>
          </div>,
          document.body
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

function ingredientRows(recipe) {
  if (!recipe) return []
  let groups = recipe.ingredients
  if (typeof groups === 'string') {
    try { groups = JSON.parse(groups) } catch { groups = [] }
  }
  if (!Array.isArray(groups)) return []
  return groups.flatMap(group => {
    const items = Array.isArray(group?.items) ? group.items : (group?.name ? [group] : [])
    return items.filter(item => String(item?.name || '').trim()).map(item => ({
      name: String(item.name).trim(), amount: item.amount ?? null, unit: item.unit ?? null, checked: false,
    }))
  })
}

function matchesMealType(recipe, mealType) {
  const label = `${recipe.category || ''} ${recipe.subcategory || ''}`.trim().toLowerCase()
  if (!label || /household|huishouden/.test(label)) return false
  const breakfastLunch = /breakfast|brunch|lunch|ontbijt|sandwich/.test(label)
  const drink = /drink|beverage|cocktail|mocktail|drank/.test(label)
  if (mealType === 'breakfastLunch') return breakfastLunch
  if (mealType === 'drink') return drink
  if (mealType === 'dinner') return !breakfastLunch && !drink && !/dessert|baking|cake|sweet|snack|appetizer/.test(label)
  return false
}

function DinnerBellIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 15h18M5 15a7 7 0 0 1 14 0M12 6V4M2 15h20v2H2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
