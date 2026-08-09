import { useMemo } from 'react'
import { useT } from '../lib/i18n'
import { relativeDayLabel } from '../lib/dateUtils'
import { deriveDopamineMenu } from '../lib/suggest'

// The Dopamine Menu — recipes that always make you happy to cook.
//
// The idea has been in the app since e54e851, but only as a hardcoded
// suggestion in the collections empty state: a name the app proposes and then
// forgets about. This gives it a real shelf.
//
// If a collection with that name exists it is used verbatim. If not, the shelf
// derives one from the cook log — repeatedly cooked and rated well is a decent
// definition of "always works" — and offers to save it as a real collection so
// it stops being a guess.

export default function DopamineShelf({
  recipes, cookStats = {}, collections = [], collectionRecipeMap = {},
  onSelect, onCreateCollection, isGuest = false,
}) {
  const { t } = useT()

  const saved = collections.find(
    c => (c.name || '').trim().toLowerCase() === t('collections.dopamineMenu').toLowerCase()
  )

  const items = useMemo(() => {
    if (saved) {
      const ids = collectionRecipeMap[saved.id] || new Set()
      return recipes.filter(r => ids.has(r.id)).map(recipe => ({ recipe, stat: cookStats[recipe.id] || {} }))
    }
    return deriveDopamineMenu(recipes, cookStats)
  }, [saved, collectionRecipeMap, recipes, cookStats])

  if (items.length === 0) return null

  const labels = {
    today: t('relative.today'), yesterday: t('relative.yesterday'),
    days: (n) => t('relative.days')(n), weeks: (n) => t('relative.weeks')(n),
    months: (n) => t('relative.months')(n), years: (n) => t('relative.years')(n),
  }

  return (
    <div style={{
      border: `1px ${saved ? 'solid' : 'dashed'} var(--tomato)`, borderRadius: 12,
      padding: '13px 14px', marginBottom: 22, background: 'var(--card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>
          {saved?.emoji ? `${saved.emoji} ` : '✨ '}{t('collections.dopamineMenu')}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)', marginLeft: 'auto', flexShrink: 0 }}>
          {items.length}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)', marginBottom: 11 }}>
        {saved ? t('mealPrep.dopamineSaved') : t('mealPrep.dopamineDerived')}
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {items.map(({ recipe, stat }) => (
          <button
            key={recipe.id}
            onClick={() => onSelect?.(recipe)}
            style={{
              flex: 'none', width: 96, background: 'none', border: 'none',
              padding: 0, cursor: 'pointer', textAlign: 'left',
            }}
          >
            {recipe.photo_url ? (
              <img src={recipe.photo_url} alt="" style={{ width: 96, height: 96, borderRadius: 10, objectFit: 'cover', display: 'block' }} />
            ) : (
              <span style={{
                width: 96, height: 96, borderRadius: 10, background: 'var(--parchment-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>🍽</span>
            )}
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 600,
              color: 'var(--charcoal)', marginTop: 5, lineHeight: 1.3,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>{recipe.title}</span>
            <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--charcoal-soft)', marginTop: 2 }}>
              {stat.lastCooked ? relativeDayLabel(stat.lastCooked, labels) : `${stat.count || 0}×`}
            </span>
          </button>
        ))}
      </div>

      {!saved && !isGuest && onCreateCollection && (
        <button
          onClick={() => onCreateCollection(t('collections.dopamineMenu'), items.map(i => i.recipe.id))}
          style={{
            marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 9,
            border: '1px solid var(--tomato)', background: 'none', color: 'var(--tomato-deep)',
            fontFamily: 'var(--font-body)', fontWeight: 650, fontSize: 12.5, cursor: 'pointer',
          }}
        >{t('mealPrep.dopamineSave')}</button>
      )}
    </div>
  )
}
