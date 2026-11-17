// Sheet for choosing which day(s) of the week a recipe is planned for.

import { useState } from 'react'
import { assignmentDates } from '../lib/mealAssignments'
import { useT } from '../lib/i18n'

const keyFor = day => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`

export default function MealDayPicker({ recipe, days, assignedDate, initialDate, saving, onChoose, onClose, error }) {
  const { lang } = useT()
  const nl = lang === 'nl'
  const [selected, setSelected] = useState(() => new Set(assignmentDates(assignedDate || initialDate)))
  const dates = [...selected].sort()
  return <div onMouseDown={event => event.target === event.currentTarget && !saving && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(42,36,32,.58)', display: 'flex', alignItems: 'flex-end' }}>
    <section role="dialog" aria-modal="true" aria-labelledby="meal-days-title" style={{ width: '100%', maxHeight: '85dvh', overflowY: 'auto', padding: '18px 20px 0', borderRadius: '18px 18px 0 0', background: 'var(--card)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}><h2 id="meal-days-title" style={{ fontFamily: 'var(--font-display)', fontSize: 21, color: 'var(--tomato-deep)', margin: 0 }}>{nl ? 'Koken en restjes plannen' : 'Plan cooking & leftovers'}</h2><p style={{ fontFamily: 'var(--font-body)', fontSize: 13, marginTop: 5, color: 'var(--charcoal-soft)' }}>{recipe.title}</p></div>
        <button type="button" disabled={saving} onClick={onClose} aria-label={nl ? 'Sluiten' : 'Close'} style={{ width: 44, height: 44, border: 0, background: 'none', color: 'var(--charcoal-soft)', fontSize: 24 }}>×</button>
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.6, marginBottom: 14, color: 'var(--charcoal-soft)' }}>{nl ? 'Kies meerdere dagen. De eerste dag kook je; de volgende dagen zijn voor restjes. Pas de porties in het recept aan voor hoeveel je wilt maken.' : 'Choose one or more days. Cook on the first day; the following days are for leftovers. Adjust the recipe servings for how much you want to make.'}</p>
      <div style={{ display: 'grid', gap: 7 }}>{days.map(day => {
        const key = keyFor(day), checked = selected.has(key)
        return <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '10px 12px', borderRadius: 10, border: `1px solid ${checked ? 'var(--tomato)' : 'var(--line)'}`, background: checked ? 'var(--sage-light)' : 'var(--parchment)', color: 'var(--charcoal)', cursor: saving ? 'default' : 'pointer' }}>
          <input type="checkbox" checked={checked} disabled={saving} onChange={() => setSelected(old => { const next = new Set(old); if (next.has(key)) next.delete(key); else next.add(key); return next })} style={{ width: 20, height: 20, accentColor: 'var(--sage)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{day.toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          {checked && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sage)' }}>{key === dates[0] ? (nl ? 'Koken' : 'Cook') : (nl ? 'Restjes' : 'Leftovers')}</span>}
        </label>
      })}</div>
      <button type="button" disabled={saving} onClick={onClose} style={{ minHeight: 44, border: 0, background: 'none', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', fontSize: 12 }}>{nl ? 'Later plannen — bewaren voor later' : 'Plan later — keep it in my list'}</button>
      {assignmentDates(assignedDate).length > 0 && <button type="button" disabled={saving} onClick={() => onChoose([])} style={{ display: 'block', minHeight: 44, border: 0, background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontSize: 12 }}>{nl ? 'Uit deze week verwijderen' : 'Remove from this week'}</button>}
      {error && <p role="alert" style={{ color: 'var(--tomato-deep)', fontSize: 12 }}>{error}</p>}
      <div style={{ position: 'sticky', bottom: 0, padding: '12px 0 calc(16px + env(safe-area-inset-bottom, 0px))', background: 'var(--card)', display: 'flex', gap: 8 }}>
        <button type="button" disabled={saving} onClick={onClose} style={{ minHeight: 46, padding: '10px 15px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--parchment)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14 }}>{nl ? 'Annuleren' : 'Cancel'}</button>
        <button type="button" disabled={saving || dates.length === 0} onClick={() => onChoose(dates)} style={{ flex: 1, minHeight: 46, padding: '10px 12px', border: 0, borderRadius: 9, background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontSize: 14, opacity: saving || dates.length === 0 ? 0.5 : 1 }}>{saving ? (nl ? 'Opslaan…' : 'Saving…') : (nl ? `Dagen opslaan (${dates.length})` : `Save days (${dates.length})`)}</button>
      </div>
    </section>
  </div>
}
