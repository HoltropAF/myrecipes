import './meal-prep.css'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import DopamineShelf from '../DopamineShelf'
import { useBackLayer } from '../../lib/useBackLayer'
import { PLANNER_BACKLOG_NAME, PLANNER_BACKLOG_NOTE, rememberRecipesForPlanning } from '../../lib/mealPlanning'
import { assignmentDates, mealOnDay, readDayNotes } from '../../lib/mealAssignments'
import MealDayPicker from '../MealDayPicker'
import MealNotePicker from '../MealNotePicker'

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

export default function MealPrepView({ recipes, onSelectRecipe, isGuest = false, demoMealGroups = null, demoShoppingRecipeIds = [], cookStats = {}, collections = [], collectionRecipeMap = {}, onCollectionsChanged }) {
  const { t, lang } = useT()
  const [weekStart, setWeekStart] = useState(startOfWeek)
  const [focusedDayIndex, setFocusedDayIndex] = useState(() => (new Date().getDay() + 6) % 7)
  const [groups, setGroups] = useState(() => isGuest ? (demoMealGroups || []) : [])
  const [shoppingIds, setShoppingIds] = useState(() => new Set(isGuest ? demoShoppingRecipeIds : []))
  const [pickerRecipe, setPickerRecipe] = useState(null)
  const [pickerDay, setPickerDay] = useState(null)
  const [recipePickerOpen, setRecipePickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useBackLayer(!!pickerRecipe, () => setPickerRecipe(null), 'day-picker')
  useBackLayer(!!pickerDay, () => setPickerDay(null), 'meal-note')
  useBackLayer(recipePickerOpen, () => setRecipePickerOpen(false), 'recipe-picker')

  useEffect(() => {
    let cancelled = false
    if (isGuest) {
      Promise.resolve().then(() => { if (!cancelled) setGroups(demoMealGroups || []) })
      return () => { cancelled = true }
    }
    Promise.all([
      supabase.from('meal_groups').select('id, user_id, name, notes, recipe_ids, created_at').order('created_at', { ascending: false }),
      supabase.from('shopping_list').select('recipe_id').not('recipe_id', 'is', null),
    ]).then(([groupResult, shoppingResult]) => {
      if (cancelled) return
      if (groupResult.error || shoppingResult.error) {
        setError(lang === 'nl' ? 'Je weekmenu kon niet worden geladen. Probeer het zo opnieuw.' : 'Your meal plan could not be loaded. Try again shortly.')
        return
      }
      const loadedGroups = groupResult.data || []
      const loadedShoppingIds = [...new Set((shoppingResult.data || []).map(row => row.recipe_id).filter(Boolean))]
      setGroups(loadedGroups)
      setShoppingIds(new Set(loadedShoppingIds))
      // A recipe is planning intent, not disposable shopping-list state. Remember
      // every recipe encountered on the list in a small persistent planner inbox.
      const knownIds = new Set(loadedGroups.flatMap(group => group.recipe_ids || []))
      const newlySeen = loadedShoppingIds.filter(id => !knownIds.has(id))
      if (newlySeen.length) rememberForLater(newlySeen, loadedGroups, setGroups)
    })
    return () => { cancelled = true }
  }, [isGuest, demoMealGroups, lang])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekGroup = groups.find(group => group.name === weekName(weekStart) && isPlannerWeek(group))
  const assignments = useMemo(() => readAssignments(weekGroup?.notes), [weekGroup?.notes])
  const dayNotes = useMemo(() => readDayNotes(weekGroup?.notes), [weekGroup?.notes])
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
  const shoppingToPlan = recipes.filter(recipe => shoppingIds.has(recipe.id) && !assignmentDates(assignments[recipe.id]).length)
  const otherWaiting = waiting.filter(recipe => !shoppingToPlan.some(shoppingRecipe => shoppingRecipe.id === recipe.id))

  const startPlanning = async recipe => {
    setRecipePickerOpen(false)
    // Closing this useBackLayer-managed picker calls history.back()
    // asynchronously to consume its history entry; opening the day picker
    // (also useBackLayer) pushes its own entry synchronously, so without
    // this delay the deferred back() pops that entry right back off.
    setTimeout(() => setPickerRecipe(recipe), 0)
    if (isGuest) {
      const backlog = groups.find(group => group.notes === PLANNER_BACKLOG_NOTE)
      if (!(backlog?.recipe_ids || []).includes(recipe.id)) {
        const next = { ...(backlog || { id: 'guest-planner-backlog', name: PLANNER_BACKLOG_NAME, notes: PLANNER_BACKLOG_NOTE }), recipe_ids: [...(backlog?.recipe_ids || []), recipe.id] }
        setGroups(old => backlog ? old.map(group => group.id === backlog.id ? next : group) : [next, ...old])
      }
      return
    }
    await rememberForLater([recipe.id], groups, setGroups)
  }

  const saveWeek = async (next, nextDayNotes = dayNotes) => {
    if (saving) return
    setSaving(true); setError('')
    const recipe_ids = Object.keys(next)
    const notes = `${WEEK_PREFIX}${JSON.stringify({ assignments: next, dayNotes: nextDayNotes })}`
    if (isGuest) {
      const row = { ...(weekGroup || { id: `guest-week-${dateKey(weekStart)}`, name: weekName(weekStart) }), recipe_ids, notes }
      setGroups(old => weekGroup ? old.map(group => group.id === weekGroup.id ? row : group) : [row, ...old])
      setPickerRecipe(null); setPickerDay(null); setSaving(false); return
    }
    let result
    if (weekGroup) {
      result = await supabase.from('meal_groups').update({ recipe_ids, notes }).eq('id', weekGroup.id).select('id, user_id, name, notes, recipe_ids, created_at').single()
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError(t('mealPrep.saveError')); setSaving(false); return }
      result = await supabase.from('meal_groups').insert({ user_id: user.id, name: weekName(weekStart), recipe_ids, notes }).select('id, user_id, name, notes, recipe_ids, created_at').single()
    }
    if (result.error) { setError(t('mealPrep.saveError')); setSaving(false); return }
    else setGroups(old => weekGroup ? old.map(group => group.id === weekGroup.id ? result.data : group) : [result.data, ...old])
    setPickerRecipe(null); setPickerDay(null); setSaving(false)
  }

  const saveAssignment = (recipe, selectedDates) => {
    const next = { ...assignments }, dates = assignmentDates(selectedDates)
    if (dates.length) next[recipe.id] = dates; else delete next[recipe.id]
    return saveWeek(next)
  }

  const today = dateKey(new Date())
  const scheduled = days.flatMap(day => [...Object.entries(assignments)
    .filter(([, value]) => assignmentDates(value).includes(dateKey(day)))
    .map(([id]) => ({ day, recipe: recipesById.get(id), leftover: mealOnDay(assignments, id, dateKey(day)).leftover })),
    ...(dayNotes[dateKey(day)] ? [{ day, note: dayNotes[dateKey(day)] }] : [])]).filter(item => item.recipe || item.note)
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  const focusedDay = days[focusedDayIndex]
  const focusedMeals = scheduled.filter(item => dateKey(item.day) === dateKey(focusedDay))

  return <div className="meal-planner">
    <div className="meal-planner__hero">
    <header className="meal-planner__heading"><div><span className="meal-planner__eyebrow">{t('mealPrep.title')}</span><h1>{lang === 'nl' ? 'Een dag tegelijk.' : 'One day at a time.'}</h1><p>{lang === 'nl' ? 'Een klein plan. Een rustigere week.' : 'A small plan. A calmer week.'}</p></div></header>
    <div className="meal-planner__week">
      <button type="button" className="meal-planner__arrow" aria-label={t('mealPrep.previousWeek')} onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
      <div><strong>{dateKey(weekStart) === dateKey(startOfWeek()) ? t('mealPrep.thisWeek') : (lang === 'nl' ? 'Weekmenu' : 'Your week')}</strong><small>{weekLabel}</small></div>
      <button type="button" className="meal-planner__arrow" aria-label={t('mealPrep.nextWeek')} onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
    </div>
    <div className="meal-planner__day-strip" aria-label={lang === 'nl' ? 'Kies een dag' : 'Choose a day'}>{days.map((day, index) => <button type="button" key={dateKey(day)} aria-pressed={focusedDayIndex === index} onClick={() => setFocusedDayIndex(index)}><span>{day.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'narrow' })}</span><strong>{day.getDate()}</strong><i aria-hidden="true" style={{ opacity: scheduled.some(item => dateKey(item.day) === dateKey(day)) ? 1 : 0 }} /></button>)}</div>
    </div>
    <div className="meal-planner__actions"><button type="button" onClick={() => setRecipePickerOpen(true)}>＋ {lang === 'nl' ? 'Recept toevoegen' : 'Add a recipe'}</button><button type="button" onClick={() => { setError(''); setPickerDay(focusedDay) }}>＋ {lang === 'nl' ? 'Ander plan' : 'Other plan'}</button></div>
    {error && <div role="alert" className="meal-planner__error">{error}</div>}
    <div className="meal-planner__focus-label">{focusedDay.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    <section className="meal-planner__focus">
      {focusedMeals.length ? focusedMeals.map(({ recipe, leftover, note }) => <div key={recipe?.id || 'note'} className="meal-planner__focus-meal">
        <span className="meal-planner__eyebrow">{note ? (lang === 'nl' ? 'ANDER PLAN' : 'OTHER PLAN') : leftover ? (lang === 'nl' ? 'RESTJES · NIET OPNIEUW KOKEN' : 'LEFTOVERS · NO COOKING') : (lang === 'nl' ? 'VANDAAG KOKEN' : 'COOK TODAY')}</span>
        <h2>{note || recipe.title}</h2>
        <p>{note ? (lang === 'nl' ? 'Een avond buiten de keuken.' : 'A night away from the kitchen.') : leftover ? (lang === 'nl' ? 'Het eten is al geregeld.' : 'Dinner is already taken care of.') : (lang === 'nl' ? 'Maak genoeg voor je geplande dagen.' : 'Make enough for your planned days.')}</p>
        <div className="meal-planner__focus-buttons">{recipe && <button type="button" onClick={() => onSelectRecipe?.(recipe)}>{lang === 'nl' ? 'Recept bekijken' : 'View recipe'}</button>}<button type="button" onClick={() => { setError(''); if (recipe) setPickerRecipe(recipe); else setPickerDay(focusedDay) }}>{lang === 'nl' ? 'Plan wijzigen' : 'Change this plan'}</button></div>
      </div>) : <div className="meal-planner__focus-meal"><span className="meal-planner__eyebrow">{lang === 'nl' ? 'NOG NIETS GEPLAND' : 'NOT PLANNED'}</span><h2>{lang === 'nl' ? 'Ruimte voor iets lekkers.' : 'Room for something good.'}</h2><p>{lang === 'nl' ? 'Kies een recept of maak een ander plan.' : 'Choose a recipe or add another plan.'}</p><button type="button" onClick={() => { setError(''); setPickerDay(focusedDay) }}>{lang === 'nl' ? 'Deze dag plannen' : 'Plan this day'}</button></div>}
    </section>
    <details className="meal-planner__fold"><summary>{lang === 'nl' ? 'De rest van je week' : 'The rest of your week'}</summary>
    <div className="meal-planner__agenda">{days.filter(day => dateKey(day) !== dateKey(focusedDay)).map(day => {
      const key = dateKey(day), meals = scheduled.filter(item => dateKey(item.day) === key), isToday = key === today
      const openDay = () => { setError(''); setPickerDay(day) }
      return <section key={key} className={`meal-planner__day${isToday ? ' meal-planner__day--today' : ''}`} aria-label={day.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}>
        <button type="button" className="meal-planner__date" onClick={openDay} aria-label={lang === 'nl' ? `Plan voor ${day.toLocaleDateString('nl-NL')}` : `Plan for ${day.toLocaleDateString('en-GB')}`}><small>{day.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'short' })}</small><strong>{day.getDate()}</strong></button>
        <div className="meal-planner__day-content">
          {isToday && <div className="meal-planner__day-label">{lang === 'nl' ? 'VANDAAG' : 'TODAY'}</div>}
          {!meals.length ? <button type="button" className="meal-planner__empty-day" onClick={openDay}><span>{lang === 'nl' ? 'Nog niets gepland' : 'Leave a little room'}</span><span aria-hidden="true">＋</span></button> : <>
            {meals.map(({ recipe, leftover, note }) => note ? <button key="note" type="button" className="meal-planner__note" onClick={openDay}><span aria-hidden="true">↗</span><span><strong>{note}</strong><small>{lang === 'nl' ? 'ANDER PLAN · WIJZIGEN' : 'OTHER PLAN · TAP TO EDIT'}</small></span></button> : <div key={recipe.id} className={`meal-planner__meal${leftover ? ' meal-planner__meal--leftover' : ''}`}><span className="meal-planner__meal-type">{leftover ? (lang === 'nl' ? 'RESTJES · NIET OPNIEUW KOKEN' : 'LEFTOVERS · NO COOKING') : (lang === 'nl' ? 'VANDAAG KOKEN' : 'COOK TODAY')}</span><RecipeCard recipe={recipe} shopping={shoppingIds.has(recipe.id)} onOpen={() => onSelectRecipe?.(recipe)} onPlan={() => setPickerRecipe(recipe)} t={t} /></div>)}
            {!dayNotes[key] && <div className="meal-planner__day-label"><span /><button type="button" onClick={openDay}>{lang === 'nl' ? '＋ Ander plan' : '＋ Other plan'}</button></div>}
          </>}
        </div>
      </section>
    })}</div>
    </details>
    {shoppingToPlan.length > 0 && <details className="meal-planner__inbox"><summary><span><strong>{lang === 'nl' ? 'Van je boodschappenlijst' : 'From your shopping list'}</strong><small>{lang === 'nl' ? 'Deze recepten zijn klaar om in te plannen' : 'These recipes are ready to plan'}</small></span><b className="meal-planner__count">{shoppingToPlan.length}</b></summary><div className="meal-planner__inbox-items">{shoppingToPlan.map(recipe => <div className="meal-planner__inbox-item" key={recipe.id}><RecipeCard compact recipe={recipe} shopping onOpen={() => onSelectRecipe?.(recipe)} onPlan={() => startPlanning(recipe)} t={t} /></div>)}</div></details>}
    <details className="meal-planner__fold"><summary>{t('mealPrep.waiting')} <span>{otherWaiting.length}</span></summary><div className="meal-planner__fold-body">{!otherWaiting.length ? <p style={monoStyle}>{t('mealPrep.nothingWaiting')}</p> : otherWaiting.map(recipe => <div className="meal-planner__waiting-row" key={recipe.id}><RecipeCard compact recipe={recipe} shopping={shoppingIds.has(recipe.id)} onOpen={() => onSelectRecipe?.(recipe)} onPlan={() => setPickerRecipe(recipe)} t={t} /></div>)}</div></details>
    <details className="meal-planner__fold"><summary>{lang === 'nl' ? 'Inspiratie & favorieten' : 'Inspiration & favourites'}</summary><div className="meal-planner__fold-body"><DopamineShelf recipes={recipes} cookStats={cookStats} collections={collections} collectionRecipeMap={collectionRecipeMap} onSelect={onSelectRecipe} onCreateCollection={null} isGuest={isGuest} onCollectionsChanged={onCollectionsChanged} /></div></details>
    {pickerRecipe && <MealDayPicker recipe={pickerRecipe} days={days} assignedDate={assignments[pickerRecipe.id]} initialDate={dateKey(focusedDay)} saving={saving} onChoose={selected => saveAssignment(pickerRecipe, selected)} onClose={() => setPickerRecipe(null)} error={error} />}
    {pickerDay && <MealNotePicker key={dateKey(pickerDay)} day={pickerDay} days={days} onDayChange={setPickerDay} value={dayNotes[dateKey(pickerDay)] || ''} saving={saving} error={error} onClose={() => setPickerDay(null)} onSave={text => {
      const nextNotes = { ...dayNotes }
      if (text) nextNotes[dateKey(pickerDay)] = text; else delete nextNotes[dateKey(pickerDay)]
      return saveWeek(assignments, nextNotes)
    }} />}
    {recipePickerOpen && <RecipePicker recipes={recipes} plannedIds={plannedIds} onChoose={startPlanning} onClose={() => setRecipePickerOpen(false)} />}
  </div>
}

async function rememberForLater(recipeIds, currentGroups, setGroups) {
  const backlog = currentGroups.find(group => group.notes === PLANNER_BACKLOG_NOTE)
  const nextIds = [...new Set([...(backlog?.recipe_ids || []), ...recipeIds])]
  if (nextIds.length === (backlog?.recipe_ids || []).length) return
  const result = await rememberRecipesForPlanning(recipeIds)
  if (!result.error) setGroups(old => backlog ? old.map(group => group.id === backlog.id ? result.data : group) : [result.data, ...old])
}

function RecipePicker({ recipes, plannedIds, onChoose, onClose }) {
  const [query, setQuery] = useState('')
  const shown = recipes.filter(recipe => !query.trim() || `${recipe.title} ${recipe.category || ''}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 40)
  return <div onMouseDown={event => event.target === event.currentTarget && onClose()} style={sheetBackdropStyle}>
    <section style={pickerSheetStyle} role="dialog" aria-modal="true" aria-labelledby="recipe-picker-title">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1 }}><h2 id="recipe-picker-title" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--tomato-deep)' }}>Add a recipe</h2><p style={{ margin: '4px 0 12px', ...monoStyle }}>Tap one, then choose its day.</p></div><button onClick={onClose} aria-label="Close" style={closeButtonStyle}>×</button></div>
      <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search recipes…" style={searchStyle} />
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {shown.map(recipe => <button key={recipe.id} onClick={() => onChoose(recipe)} style={pickerRecipeStyle}>
          {recipe.photo_url ? <img src={recipe.photo_url} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'var(--parchment-dim)' }}><FoodIcon /></span>}
          <span style={{ minWidth: 0, textAlign: 'left' }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', fontSize: 14 }}>{recipe.title}</b><small style={monoStyle}>{plannedIds.has(recipe.id) ? 'Already saved · choose or change day' : (recipe.total_minutes ? `${recipe.total_minutes} min` : 'Save to meal plan')}</small></span><span style={{ marginLeft: 'auto', color: 'var(--tomato-deep)', fontSize: 20 }}>&gt;</span>
        </button>)}
        {!shown.length && <div style={emptyStyle}>No recipes found.</div>}
      </div>
    </section>
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

const FoodIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11h16M5 11a7 7 0 0 1 14 0M3 11h18v2H3zM12 4V2M6 17h12M8 13l-2 4M16 13l2 4" /></svg>
const monoStyle = { fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--charcoal-soft)', marginTop: 2 }
const emptyStyle = { padding: 16, border: '1px dashed var(--line)', borderRadius: 12, textAlign: 'center', background: 'var(--card)', fontSize: 13, color: 'var(--charcoal-soft)', lineHeight: 1.5 }
const planButtonStyle = { border: '1px solid var(--tomato)', borderRadius: 8, padding: '6px 9px', background: 'none', color: 'var(--tomato-deep)', fontWeight: 650, fontSize: 11.5, cursor: 'pointer', flexShrink: 0 }
const sheetBackdropStyle = { position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', background: 'rgba(42,36,32,.58)' }
const pickerSheetStyle = { width: '100%', maxHeight: '78dvh', overflowY: 'auto', boxSizing: 'border-box', padding: '18px 20px 32px', borderRadius: '18px 18px 0 0', background: 'var(--card)' }
const closeButtonStyle = { width: 34, height: 34, border: 0, background: 'none', color: 'var(--charcoal-soft)', fontSize: 23, cursor: 'pointer' }
const searchStyle = { width: '100%', boxSizing: 'border-box', minHeight: 42, padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--parchment)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14 }
const pickerRecipeStyle = { width: '100%', display: 'grid', gridTemplateColumns: '46px minmax(0,1fr) 16px', alignItems: 'center', gap: 10, padding: 7, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--parchment)', color: 'var(--charcoal)', cursor: 'pointer' }
