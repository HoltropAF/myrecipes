import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import DopamineShelf from '../DopamineShelf'
import { useBackLayer } from '../../lib/useBackLayer'

const WEEK_PREFIX = 'myrecipes-week-v1:'
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (date, amount) => { const d = new Date(date); d.setDate(d.getDate() + amount); return d }
const startOfWeek = (date = new Date()) => { const d = new Date(date); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() || 7) + 1); return d }
const weekName = start => `Week of ${dateKey(start)}`
const isPlannerWeek = group => group?.notes?.startsWith(WEEK_PREFIX)
const readAssignments = notes => {
  if (!notes?.startsWith(WEEK_PREFIX)) return {}
  try { return JSON.parse(notes.slice(WEEK_PREFIX.length))?.assignments || {} } catch { return {} }
}

export default function MealPrepView({ recipes, onSelectRecipe, isGuest = false, demoMealGroups = null, cookStats = {}, collections = [], collectionRecipeMap = {} }) {
  const { t, lang } = useT()
  const [weekStart, setWeekStart] = useState(startOfWeek)
  const [groups, setGroups] = useState(() => isGuest ? (demoMealGroups || []) : [])
  const [shoppingIds, setShoppingIds] = useState(new Set())
  const [pickerRecipe, setPickerRecipe] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useBackLayer(!!pickerRecipe, () => setPickerRecipe(null), 'day-picker')

  useEffect(() => {
    if (isGuest) { setGroups(demoMealGroups || []); return }
    let cancelled = false
    Promise.all([
      supabase.from('meal_groups').select('id, user_id, name, notes, recipe_ids, created_at').order('created_at', { ascending: false }),
      supabase.from('shopping_list').select('recipe_id').not('recipe_id', 'is', null),
    ]).then(([groupResult, shoppingResult]) => {
      if (cancelled) return
      if (groupResult.error || shoppingResult.error) {
        setError(lang === 'nl' ? 'Je weekmenu kon niet worden geladen. Probeer het zo opnieuw.' : 'Your meal plan could not be loaded. Try again shortly.')
        return
      }
      setGroups(groupResult.data || [])
      setShoppingIds(new Set((shoppingResult.data || []).map(row => row.recipe_id).filter(Boolean)))
    })
    return () => { cancelled = true }
  }, [isGuest, demoMealGroups, lang])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekGroup = groups.find(group => group.name === weekName(weekStart) && isPlannerWeek(group))
  const assignments = useMemo(() => readAssignments(weekGroup?.notes), [weekGroup?.notes])
  const recipesById = useMemo(() => new Map(recipes.map(recipe => [recipe.id, recipe])), [recipes])
  const assignedAnywhereIds = useMemo(() => {
    const ids = new Set()
    groups.filter(isPlannerWeek).forEach(group => Object.keys(readAssignments(group.notes)).forEach(id => ids.add(id)))
    return ids
  }, [groups])
  const plannedIds = useMemo(() => {
    const ids = new Set()
    groups.forEach(group => (group.recipe_ids || []).forEach(id => ids.add(id)))
    return ids
  }, [groups])
  const waiting = useMemo(() => [...new Set([...shoppingIds, ...plannedIds])]
    .filter(id => !assignedAnywhereIds.has(id) && recipesById.has(id)).map(id => recipesById.get(id)),
  [shoppingIds, plannedIds, assignedAnywhereIds, recipesById])

  const saveAssignment = async (recipe, day) => {
    if (saving) return
    setSaving(true); setError('')
    const next = { ...assignments }
    if (day) next[recipe.id] = dateKey(day); else delete next[recipe.id]
    const recipe_ids = Object.keys(next)
    const notes = `${WEEK_PREFIX}${JSON.stringify({ assignments: next })}`
    if (isGuest) {
      const row = { ...(weekGroup || { id: `guest-week-${dateKey(weekStart)}`, name: weekName(weekStart) }), recipe_ids, notes }
      setGroups(old => weekGroup ? old.map(group => group.id === weekGroup.id ? row : group) : [row, ...old])
      setPickerRecipe(null); setSaving(false); return
    }
    let result
    if (weekGroup) {
      result = await supabase.from('meal_groups').update({ recipe_ids, notes }).eq('id', weekGroup.id).select('id, user_id, name, notes, recipe_ids, created_at').single()
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError(t('mealPrep.saveError')); setSaving(false); return }
      result = await supabase.from('meal_groups').insert({ user_id: user.id, name: weekName(weekStart), recipe_ids, notes }).select('id, user_id, name, notes, recipe_ids, created_at').single()
    }
    if (result.error) setError(t('mealPrep.saveError'))
    else setGroups(old => weekGroup ? old.map(group => group.id === weekGroup.id ? result.data : group) : [result.data, ...old])
    setPickerRecipe(null); setSaving(false)
  }

  const today = dateKey(new Date())
  const scheduled = days.flatMap(day => Object.entries(assignments)
    .filter(([, value]) => value === dateKey(day))
    .map(([id]) => ({ day, recipe: recipesById.get(id) }))).filter(item => item.recipe)
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  return <div style={{ padding: '0 20px 100px' }}>
    <h1 style={titleStyle}>{t('mealPrep.title')}</h1>
    <DopamineShelf recipes={recipes} cookStats={cookStats} collections={collections} collectionRecipeMap={collectionRecipeMap} onSelect={onSelectRecipe} onCreateCollection={null} isGuest={isGuest} />

    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <button aria-label={t('mealPrep.previousWeek')} onClick={() => setWeekStart(addDays(weekStart, -7))} style={arrowStyle}>‹</button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 650, fontSize: 17 }}>{t('mealPrep.thisWeek')}</div>
        <div style={monoStyle}>{weekLabel}</div>
      </div>
      <button aria-label={t('mealPrep.nextWeek')} onClick={() => setWeekStart(addDays(weekStart, 7))} style={arrowStyle}>›</button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 14 }}>
      {days.map(day => {
        const key = dateKey(day); const hasMeal = Object.values(assignments).includes(key); const isToday = key === today
        return <div key={key} style={{ padding: '7px 0 6px', borderRadius: 9, textAlign: 'center', border: `1px solid ${isToday ? 'var(--tomato)' : 'var(--line)'}`, background: hasMeal ? 'var(--sage-light)' : 'var(--card)' }}>
          <div style={{ ...monoStyle, fontSize: 8.5, color: isToday ? 'var(--tomato-deep)' : 'var(--charcoal-soft)', textTransform: 'uppercase' }}>{day.toLocaleDateString(undefined, { weekday: 'narrow' })}</div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{day.getDate()}</div>
        </div>
      })}
    </div>

    {error && <div role="alert" style={{ fontSize: 12.5, color: 'var(--tomato-deep)', marginBottom: 10 }}>{error}</div>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
      {scheduled.map(({ day, recipe }) => <div key={recipe.id} style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
        <div style={{ ...monoStyle, fontSize: 9, textAlign: 'center', textTransform: 'uppercase' }}>{day.toLocaleDateString(undefined, { weekday: 'short' })}<div style={{ fontFamily: 'var(--font-display)', color: 'var(--charcoal)', fontSize: 16, fontWeight: 650 }}>{day.getDate()}</div></div>
        <RecipeCard recipe={recipe} shopping={shoppingIds.has(recipe.id)} onOpen={() => onSelectRecipe?.(recipe)} onPlan={() => setPickerRecipe(recipe)} t={t} />
      </div>)}
      {!scheduled.length && <div style={emptyStyle}>{t('mealPrep.emptyWeek')}</div>}
    </div>

    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 650, margin: 0 }}>{t('mealPrep.waiting')}</h2>
      <span style={{ ...monoStyle, marginLeft: 'auto' }}>{waiting.length}</span>
    </div>
    <div style={{ border: '1px dashed var(--line)', borderRadius: 12, padding: waiting.length ? '4px 12px' : 14, background: 'var(--card)' }}>
      {!waiting.length ? <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--charcoal-soft)' }}>{t('mealPrep.nothingWaiting')}</div> : waiting.map((recipe, index) =>
        <div key={recipe.id} style={{ padding: '9px 0', borderTop: index ? '1px solid var(--line)' : 'none' }}><RecipeCard compact recipe={recipe} shopping={shoppingIds.has(recipe.id)} onOpen={() => onSelectRecipe?.(recipe)} onPlan={() => setPickerRecipe(recipe)} t={t} /></div>)}
    </div>
    {pickerRecipe && <DayPicker recipe={pickerRecipe} days={days} assignedDate={assignments[pickerRecipe.id]} saving={saving} onChoose={day => saveAssignment(pickerRecipe, day)} onClose={() => setPickerRecipe(null)} t={t} />}
  </div>
}

function RecipeCard({ recipe, shopping, compact, onOpen, onPlan, t }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, padding: compact ? 0 : 8, background: compact ? 'transparent' : 'var(--card)', border: compact ? 'none' : '1px solid var(--line)', borderRadius: compact ? 0 : 11 }}>
    <button onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
      {recipe.photo_url ? <img src={recipe.photo_url} alt="" style={{ width: compact ? 44 : 50, height: compact ? 44 : 50, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ width: compact ? 44 : 50, height: compact ? 44 : 50, borderRadius: 9, background: 'var(--parchment-dim)', display: 'grid', placeItems: 'center', color: 'var(--sage)', flexShrink: 0 }}><FoodIcon /></span>}
      <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</span><span style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>{shopping && <Badge>{t('mealPrep.groceriesAdded')}</Badge>}{!!recipe.total_minutes && <span style={{ ...monoStyle, fontSize: 9.5 }}>{recipe.total_minutes} min</span>}</span></span>
    </button>
    <button onClick={onPlan} style={planButtonStyle}>{compact ? t('mealPrep.plan') : t('mealPrep.change')}</button>
  </div>
}

const Badge = ({ children }) => <span style={{ padding: '3px 6px', borderRadius: 99, background: 'color-mix(in srgb, var(--mustard) 16%, var(--card))', fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 650 }}>{children}</span>

function DayPicker({ recipe, days, assignedDate, saving, onChoose, onClose, t }) {
  return <div onMouseDown={event => event.target === event.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(42,36,32,.58)', display: 'flex', alignItems: 'flex-end' }}>
    <div style={{ width: '100%', maxHeight: '72dvh', overflowY: 'auto', padding: '18px 20px 32px', borderRadius: '18px 18px 0 0', background: 'var(--card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 15 }}><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 650 }}>{t('mealPrep.chooseDay')}</div><div style={{ fontSize: 12.5, color: 'var(--charcoal-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</div></div><button onClick={onClose} aria-label={t('mealPrep.close')} style={{ border: 0, background: 'none', color: 'var(--charcoal-soft)', fontSize: 22, cursor: 'pointer' }}>×</button></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{days.map(day => { const key = dateKey(day); const selected = assignedDate === key; return <button key={key} onClick={() => onChoose(day)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${selected ? 'var(--tomato)' : 'var(--line)'}`, background: selected ? 'color-mix(in srgb, var(--tomato) 8%, var(--card))' : 'var(--parchment)', color: 'var(--charcoal)', cursor: saving ? 'default' : 'pointer', textAlign: 'left' }}><span style={{ ...monoStyle, width: 34, textTransform: 'uppercase', color: selected ? 'var(--tomato-deep)' : 'var(--charcoal-soft)' }}>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span><span style={{ fontSize: 14, fontWeight: 600 }}>{day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>{selected && <span style={{ marginLeft: 'auto', color: 'var(--tomato-deep)' }}>✓</span>}</button> })}</div>
      {assignedDate && <button onClick={() => onChoose(null)} disabled={saving} style={{ width: '100%', marginTop: 10, padding: 10, border: 0, background: 'none', color: 'var(--tomato-deep)', fontWeight: 650, cursor: 'pointer' }}>{t('mealPrep.removeFromWeek')}</button>}
    </div>
  </div>
}

const FoodIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11h16M5 11a7 7 0 0 1 14 0M3 11h18v2H3zM12 4V2M6 17h12M8 13l-2 4M16 13l2 4" /></svg>
const titleStyle = { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 16 }
const monoStyle = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)', marginTop: 2 }
const arrowStyle = { width: 36, height: 36, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--tomato-deep)', fontSize: 22, cursor: 'pointer', display: 'grid', placeItems: 'center' }
const emptyStyle = { padding: 16, border: '1px dashed var(--line)', borderRadius: 12, textAlign: 'center', background: 'var(--card)', fontSize: 13, color: 'var(--charcoal-soft)', lineHeight: 1.5 }
const planButtonStyle = { border: '1px solid var(--tomato)', borderRadius: 8, padding: '6px 9px', background: 'none', color: 'var(--tomato-deep)', fontWeight: 650, fontSize: 11.5, cursor: 'pointer', flexShrink: 0 }
