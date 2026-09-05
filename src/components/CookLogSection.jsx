import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'
import { todayLocalISO } from '../lib/dateUtils'
import CookLogForm from './CookLogForm'

export default function CookLogSection({ recipeId, variants = [], isGuest = false, demoEntries = [], onLogged }) {
  const { t } = useT()
  const [remoteEntries, setRemoteEntries] = useState(null)
  const [guestEntries, setGuestEntries] = useState(demoEntries)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(todayLocalISO)
  const [thumbs, setThumbs] = useState(null)
  const [notes, setNotes] = useState('')
  const [variantLabel, setVariantLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editNotes, setEditNotes] = useState('')

  const load = async () => {
    if (isGuest) return
    const { data } = await supabase.from('cook_log').select('*').eq('recipe_id', recipeId).order('cooked_date', { ascending: false })
    setRemoteEntries(data || [])
  }
  useEffect(() => {
    if (isGuest) return
    let cancelled = false
    supabase.from('cook_log').select('*').eq('recipe_id', recipeId).order('cooked_date', { ascending: false })
      .then(({ data }) => { if (!cancelled) setRemoteEntries(data || []) })
    return () => { cancelled = true }
  }, [recipeId, isGuest])

  const entries = isGuest ? guestEntries : (remoteEntries || [])
  const loading = !isGuest && remoteEntries === null
  const noteEntries = entries.filter(entry => entry.notes?.trim())
  const withoutNotes = entries.length - noteEntries.length
  const downCount = entries.filter(entry => entry.thumbs === 'down').length

  const handleSave = async () => {
    setSaving(true); setError(null)
    const { data } = await supabase.auth.getUser()
    const userId = data?.user?.id
    if (!userId) { setError(t('cookLog.notSignedIn')); setSaving(false); return }
    const { error: insertError } = await supabase.from('cook_log').insert({ user_id: userId, recipe_id: recipeId, cooked_date: date, thumbs, notes: notes.trim() || null, variant_label: variantLabel || null })
    setSaving(false)
    if (insertError) { setError(t('cookLog.saveError')); return }
    setShowForm(false); setThumbs(null); setNotes(''); setVariantLabel(''); setDate(todayLocalISO()); load(); onLogged?.()
  }

  const saveEditedNote = async entry => {
    const value = editNotes.trim()
    if (isGuest) { setGuestEntries(rows => rows.map(row => row.id === entry.id ? { ...row, notes: value || null } : row)); setEditingId(null); return }
    setSaving(true); setError(null)
    const { error: updateError } = await supabase.from('cook_log').update({ notes: value || null }).eq('id', entry.id)
    setSaving(false)
    if (updateError) { setError(t('cookLog.saveError')); return }
    setEditingId(null); load(); onLogged?.()
  }

  return <div>
    <section style={summaryStyle}>
      <h2 style={titleStyle}>Cooking history</h2>
      <p style={copyStyle}>Only written memories are listed. Quick reactions are counted together.</p>
      <div style={factsStyle}>
        <SummaryFact value={entries.length} label="total cooks" />
        <SummaryFact value={withoutNotes} label="without notes" />
        <SummaryFact value={downCount} label="thumbs down" />
      </div>
    </section>

    {showForm && <div style={{ background: 'var(--parchment-dim)', borderRadius: 12, padding: 14, margin: '12px 0' }}>
      <CookLogForm date={date} setDate={setDate} variants={variants} variantLabel={variantLabel} setVariantLabel={setVariantLabel} thumbs={thumbs} setThumbs={setThumbs} notes={notes} setNotes={setNotes} onSave={handleSave} saving={saving} error={error} />
    </div>}

    {!loading && noteEntries.length > 0 && <>
      <div style={sectionLabelStyle}>Notes &amp; memories</div>
      <div style={historyCardStyle}>{noteEntries.map((entry, index) => <article key={entry.id} style={{ ...entryStyle, borderTop: index ? '1px solid var(--line)' : 0 }}>
          <DateBadge value={entry.cooked_date} />
          <div style={{ minWidth: 0 }}>
            <div style={entryHeadStyle}><strong style={entryTitleStyle}>{entry.variant_label || 'Dinner at home'}{entry.thumbs ? ` · Thumbs ${entry.thumbs}` : ''}</strong>{editingId !== entry.id && <button onClick={() => { setEditingId(entry.id); setEditNotes(entry.notes || '') }} style={textBtnStyle}>Edit note</button>}</div>
            {editingId === entry.id ? <textarea value={editNotes} onChange={event => setEditNotes(event.target.value)} rows={3} style={textareaStyle} /> : <div style={noteStyle}>{entry.notes}</div>}
            {editingId === entry.id && <div style={editActionsStyle}><button onClick={() => setEditingId(null)} style={textBtnStyle}>Cancel</button><button onClick={() => saveEditedNote(entry)} disabled={saving} style={saveNoteButtonStyle}>Save note</button></div>}
          </div>
      </article>)}</div>
    </>}
    {!loading && entries.length === 0 && !showForm && <div style={{ ...copyStyle, textAlign: 'center', padding: 24 }}>{isGuest ? t('cookLog.emptyGuest') : t('cookLog.emptyUser')}</div>}
    {error && <div style={{ color: 'var(--tomato)', fontSize: 12, marginTop: 8 }}>{error}</div>}
    {!isGuest && <button onClick={() => setShowForm(value => !value)} style={wideButtonStyle}>{showForm ? t('cookLog.cancel') : '+ Log another cook'}</button>}
  </div>
}

function SummaryFact({ value, label }) { return <div style={factStyle}><b>{value}</b><small>{label}</small></div> }
function DateBadge({ value }) { const date = new Date(`${value}T00:00:00`); return <span style={dateBadgeStyle}><b style={{ fontSize: 17 }}>{date.getDate()}</b><small style={{ fontFamily: 'var(--font-mono)', fontSize: 8 }}>{date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</small></span> }
const summaryStyle = { padding: 14, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)' }
const titleStyle = { margin: 0, fontFamily: 'var(--font-display)', color: 'var(--tomato-deep)', fontSize: 20 }
const copyStyle = { margin: '3px 0 0', fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)', fontSize: 10.5, lineHeight: 1.4 }
const factsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginTop: 12 }
const factStyle = { minHeight: 48, padding: '7px 4px', borderRadius: 9, background: 'var(--parchment-dim)', display: 'grid', placeItems: 'center', alignContent: 'center', color: 'var(--tomato-deep)', fontFamily: 'var(--font-display)', fontSize: 17 }
const sectionLabelStyle = { margin: '15px 2px 7px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)', textTransform: 'uppercase', letterSpacing: '.08em' }
const historyCardStyle = { overflow: 'hidden', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)', boxShadow: '0 4px 14px rgba(70,35,35,.06)' }
const entryStyle = { display: 'grid', gridTemplateColumns: '43px 1fr', gap: 10, alignItems: 'center', padding: '12px 13px', background: 'transparent' }
const dateBadgeStyle = { width: 43, height: 45, paddingTop: 5, boxSizing: 'border-box', borderRadius: 8, background: 'var(--parchment-dim)', color: 'var(--tomato-deep)', textAlign: 'center', display: 'grid', alignContent: 'center', fontFamily: 'var(--font-display)' }
const entryHeadStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
const entryTitleStyle = { color: 'var(--charcoal)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }
const noteStyle = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', marginTop: 4, lineHeight: 1.45 }
const textareaStyle = { width: '100%', boxSizing: 'border-box', marginTop: 6, padding: 8, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--parchment-dim)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 13 }
const textBtnStyle = { background: 'none', border: 0, color: 'var(--tomato-deep)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }
const editActionsStyle = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 7 }
const saveNoteButtonStyle = { height: 30, padding: '0 11px', border: 0, borderRadius: 7, background: 'var(--tomato-deep)', color: '#fffaf3', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }
const wideButtonStyle = { width: '100%', height: 40, marginTop: 12, border: 0, borderRadius: 9, background: 'var(--tomato-deep)', color: '#fffaf3', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
