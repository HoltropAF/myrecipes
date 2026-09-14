import { useMemo, useState } from 'react'
import { useT } from '../lib/i18n'
import { supabase } from '../lib/supabase'
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
  onSelect, onCreateCollection, onCollectionsChanged, isGuest = false,
}) {
  const { t } = useT()
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addSelectedIds, setAddSelectedIds] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const saved = collections.find(
    c => (c.name || '').trim().toLowerCase() === t('collections.dopamineMenu').toLowerCase()
  )

  const memberIds = saved ? (collectionRecipeMap[saved.id] || new Set()) : new Set()

  const items = useMemo(() => {
    if (saved) {
      return recipes.filter(r => memberIds.has(r.id)).map(recipe => ({ recipe, stat: cookStats[recipe.id] || {} }))
    }
    return deriveDopamineMenu(recipes, cookStats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, collectionRecipeMap, recipes, cookStats])

  // A saved collection is worth showing (with just the + tile) even while
  // empty, so there's a way to add its very first recipe. An un-saved,
  // derived suggestion with nothing in it isn't worth a shelf at all.
  if (!saved && items.length === 0) return null

  const addCandidates = recipes
    .filter(r => !memberIds.has(r.id))
    .filter(r => !addQuery.trim() || r.title.toLowerCase().includes(addQuery.trim().toLowerCase()))
    .slice(0, 60)

  const toggleAddSelected = (id) => {
    setAddSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const closeAddPicker = () => {
    setShowAddPicker(false)
    setAddQuery('')
    setAddSelectedIds(new Set())
    setError('')
  }

  const handleAddRecipes = async () => {
    if (!saved || !addSelectedIds.size) return
    setBusy(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('collection_recipes')
        .insert([...addSelectedIds].map(recipe_id => ({ collection_id: saved.id, recipe_id })))
      if (insertError) throw insertError
      closeAddPicker()
      await onCollectionsChanged?.()
    } catch (err) {
      setError(err.message || t('mealPrep.dopamineAddError'))
    } finally {
      setBusy(false)
    }
  }

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
        {saved && !isGuest && (
          <button
            onClick={() => setShowAddPicker(true)}
            style={{
              flex: 'none', width: 96, height: 96, borderRadius: 10, cursor: 'pointer',
              border: '2px dashed var(--line)', background: 'none', color: 'var(--charcoal-soft)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              fontFamily: 'var(--font-mono)', fontSize: 10.5,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
            {t('mealPrep.dopamineAddTile')}
          </button>
        )}
      </div>

      {showAddPicker && (
        <div onMouseDown={e => e.target === e.currentTarget && closeAddPicker()} style={addSheetBackdropStyle}>
          <section style={addSheetStyle} role="dialog" aria-modal="true" aria-labelledby="dopamine-add-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h2 id="dopamine-add-title" style={{ margin: 0, flex: 1, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--tomato-deep)' }}>
                {t('mealPrep.dopamineAddTitle')}
              </h2>
              <button onClick={closeAddPicker} aria-label={t('mealPrep.close')} style={{ width: 30, height: 30, border: 0, background: 'none', color: 'var(--charcoal-soft)', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <input
              autoFocus type="text" value={addQuery} onChange={e => setAddQuery(e.target.value)}
              placeholder={t('recipesView.addToGroupSearch')}
              style={addSearchStyle}
            />
            <div style={{ display: 'grid', gap: 6, marginTop: 10, marginBottom: 14, maxHeight: '45dvh', overflowY: 'auto' }}>
              {addCandidates.map(r => {
                const selected = addSelectedIds.has(r.id)
                return (
                  <button key={r.id} onClick={() => toggleAddSelected(r.id)} style={{ ...addRowStyle, borderColor: selected ? 'var(--tomato)' : 'var(--line)' }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 99, flexShrink: 0, display: 'grid', placeItems: 'center',
                      border: `1.5px solid ${selected ? 'var(--tomato)' : 'var(--line)'}`,
                      background: selected ? 'var(--tomato)' : 'transparent', color: '#fffdf9', fontSize: 12, fontWeight: 700,
                    }}>{selected ? '✓' : ''}</span>
                    {r.photo_url ? (
                      <img src={r.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'var(--parchment-dim)', fontSize: 18 }}>🍽</span>
                    )}
                    <b style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>{r.title}</b>
                  </button>
                )
              })}
              {!addCandidates.length && <div style={{ textAlign: 'center', padding: 16, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--charcoal-soft)' }}>{t('recipesView.noMatch')}</div>}
            </div>
            {error && <div role="alert" style={{ fontSize: 12.5, color: 'var(--tomato-deep)', marginBottom: 10 }}>{error}</div>}
            <button
              onClick={handleAddRecipes} disabled={busy || !addSelectedIds.size}
              style={{ ...addConfirmButtonStyle, opacity: busy || !addSelectedIds.size ? 0.5 : 1 }}
            >
              {busy ? t('mergeRecipes.merging') : t('recipesView.addToGroupConfirm')(addSelectedIds.size)}
            </button>
          </section>
        </div>
      )}

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

const addSheetBackdropStyle = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(38, 25, 22, 0.38)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }
const addSheetStyle = { width: '100%', maxWidth: 480, maxHeight: '85dvh', overflowY: 'auto', boxSizing: 'border-box', background: 'var(--card)', borderRadius: '22px 22px 0 0', padding: '18px 20px calc(20px + env(safe-area-inset-bottom))', boxShadow: '0 -12px 40px rgba(55, 23, 18, 0.18)' }
const addSearchStyle = { width: '100%', boxSizing: 'border-box', minHeight: 42, padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--parchment)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14 }
const addRowStyle = { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 7, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--parchment)', color: 'var(--charcoal)', cursor: 'pointer', boxSizing: 'border-box' }
const addConfirmButtonStyle = { width: '100%', minHeight: 44, border: 0, borderRadius: 10, background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
