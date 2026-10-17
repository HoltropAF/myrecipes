import { useState } from 'react'
import { useT } from '../lib/i18n'

export default function MealNotePicker({ day, days, onDayChange, value = '', saving, error, onSave, onClose }) {
  const { lang } = useT()
  const nl = lang === 'nl'
  const options = nl ? ['Uit eten', 'Afhalen / bezorgen', 'Bij vrienden eten', 'Restjes', 'Anders'] : ['Eating out', 'Takeaway', 'Dinner with friends', 'Leftovers', 'Other']
  const [text, setText] = useState(value || options[0])
  return <div onMouseDown={e => e.target === e.currentTarget && !saving && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(42,36,32,.58)', display: 'flex', alignItems: 'flex-end' }}>
    <section role="dialog" aria-modal="true" aria-labelledby="meal-note-title" style={{ width: '100%', maxHeight: '85dvh', overflowY: 'auto', background: 'var(--card)', padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))', borderRadius: '18px 18px 0 0' }}>
      <h2 id="meal-note-title" style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--tomato-deep)' }}>{nl ? 'Wat staat er op het menu?' : 'What’s the plan?'}</h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal-soft)', margin: '8px 0 16px' }}>{day.toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 16 }}>{nl ? 'Dag' : 'Day'}<select value={days.indexOf(day)} onChange={e => onDayChange(days[Number(e.target.value)])} disabled={saving} style={{ display: 'block', marginTop: 7, width: '100%', minHeight: 44, padding: 10, border: '1px solid var(--line)', borderRadius: 9, background: 'var(--parchment)', color: 'var(--charcoal)', fontSize: 14 }}>{days.map((choice, index) => <option key={index} value={index}>{choice.toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}</option>)}</select></label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{options.map(option => <button type="button" key={option} disabled={saving} aria-pressed={text === option} onClick={() => setText(option === options.at(-1) ? '' : option)} style={{ minHeight: 44, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 9, background: text === option ? 'var(--sage-light)' : 'var(--parchment)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)' }}>{option}</button>)}</div>
      <label style={{ display: 'block', margin: '18px 0', fontFamily: 'var(--font-body)', fontSize: 13 }}>{nl ? 'Je eigen plan' : 'Your plan'}<input value={text} onChange={e => setText(e.target.value)} disabled={saving} maxLength={200} placeholder={nl ? 'Bijvoorbeeld: verjaardag bij vrienden' : 'For example: birthday dinner with friends'} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 8, padding: 12, minHeight: 44, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--parchment)', color: 'var(--charcoal)', fontSize: 16 }} /></label>
      {error && <p role="alert" style={{ color: 'var(--tomato-deep)', fontSize: 12, marginBottom: 10 }}>{error}</p>}
      {value && <button type="button" disabled={saving} onClick={() => onSave('')} style={{ minHeight: 44, border: 0, background: 'none', color: 'var(--tomato-deep)', marginBottom: 10 }}>{nl ? 'Dit plan verwijderen' : 'Remove this plan'}</button>}
      <div style={{ display: 'flex', gap: 8 }}><button type="button" disabled={saving} onClick={onClose} style={{ minHeight: 46, padding: '10px 15px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--parchment)', color: 'var(--charcoal)' }}>{nl ? 'Annuleren' : 'Cancel'}</button><button type="button" disabled={saving || !text.trim()} onClick={() => onSave(text.trim())} style={{ flex: 1, minHeight: 46, border: 0, borderRadius: 9, background: 'var(--tomato)', color: '#fffdf9', opacity: saving || !text.trim() ? 0.5 : 1 }}>{saving ? (nl ? 'Opslaan…' : 'Saving…') : (nl ? 'Plan opslaan' : 'Save plan')}</button></div>
    </section>
  </div>
}
