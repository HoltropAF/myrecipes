import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import DopamineShelf from '../DopamineShelf'

// Placeholder, on purpose.
//
// The previous version of this page — saved groups, a group builder and four
// kinds of automatic suggestion — is in git history at 811ba1d and earlier, and
// is coming back in a different shape. It was doing several things at once and
// none of them well enough to keep while the rest of the app moved on.
//
// Deliberately still here:
//
//   * the Dopamine Menu shelf, the one part that earned its place
//   * a plain count of saved plans, so an emptied page cannot be mistaken for
//     lost data. Nothing has been deleted: meal_groups is untouched and "Add to
//     meal plan" on a recipe still writes to it exactly as before.
export default function MealPrepView({
  recipes, onSelectRecipe, isGuest = false, demoMealGroups = null,
  cookStats = {}, collections = [], collectionRecipeMap = {},
}) {
  const { t } = useT()
  const [groupCount, setGroupCount] = useState(null)

  useEffect(() => {
    if (isGuest) {
      setGroupCount((demoMealGroups || []).length)
      return
    }
    let cancelled = false
    supabase.from('meal_groups').select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (!cancelled) setGroupCount(count ?? 0) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest])

  return (
    <div style={{ padding: '0 20px 100px' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600,
        color: 'var(--tomato-deep)', marginBottom: 16,
      }}>{t('mealPrep.title')}</h1>

      <DopamineShelf
        recipes={recipes}
        cookStats={cookStats}
        collections={collections}
        collectionRecipeMap={collectionRecipeMap}
        onSelect={onSelectRecipe}
        onCreateCollection={null}
        isGuest={isGuest}
      />

      <div style={{
        border: '1px dashed var(--line)', borderRadius: 12, padding: '22px 18px',
        textAlign: 'center', background: 'var(--card)',
      }}>
        <div style={{ fontSize: 26, marginBottom: 8 }}>🧺</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 650,
          color: 'var(--charcoal)', marginBottom: 6,
        }}>{t('mealPrep.rebuildTitle')}</div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--charcoal-soft)',
          lineHeight: 1.55, maxWidth: 320, margin: '0 auto',
        }}>{t('mealPrep.rebuildBody')}</div>

        {groupCount > 0 && (
          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--sage)',
          }}>{t('mealPrep.plansSafe')(groupCount)}</div>
        )}
      </div>
    </div>
  )
}
