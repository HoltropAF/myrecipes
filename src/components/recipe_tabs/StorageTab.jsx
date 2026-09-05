import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function StorageTab({ recipe, isGuest = false }) {
  const [note, setNote] = useState(recipe.notes || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const saveNote = async () => {
    if (isGuest) { setEditing(false); return }
    setSaving(true); setError('')
    const { error: updateError } = await supabase.from('recipes').update({ notes: note.trim() || null, updated_at: new Date().toISOString() }).eq('id', recipe.id)
    setSaving(false)
    if (updateError) { setError('Could not save this note.'); return }
    setEditing(false)
  }

  const storage = [
    ['Fridge', recipe.fridge_storage || 'Keep covered for up to 3 days.'],
    ['Freezer', recipe.freezer_friendly === true ? 'Freeze in a sealed container.' : recipe.freezer_friendly === false ? 'Not recommended for freezing.' : 'No freezer guidance recorded.'],
    ['Reheat', recipe.reheat_instructions || 'Best served according to the recipe notes.'],
    ['Prep ahead', recipe.prep_ahead || 'Prepare components ahead where practical.'],
  ]

  return <div>
    <section style={cardStyle}>
      <h2 style={titleStyle}>Keep &amp; reheat</h2>
      <p style={copyStyle}>Guidance for this recipe after cooking.</p>
      <div style={storageGridStyle}>{storage.map(([label, copy]) => <div key={label} style={storageCellStyle}><b style={cellTitleStyle}>{label}</b><small style={cellCopyStyle}>{copy}</small></div>)}</div>
    </section>
    <section style={{ ...cardStyle, marginTop: 12 }}>
      <div style={noteHeadStyle}><h3 style={noteTitleStyle}>Your storage note</h3>{!editing && <button onClick={() => setEditing(true)} style={textButtonStyle}>Edit note</button>}</div>
      {editing ? <>
        <textarea value={note} onChange={event => setNote(event.target.value)} rows={4} placeholder="Add storage, reheating or freezer notes…" style={textareaStyle} />
        {error && <div style={errorStyle}>{error}</div>}
        <div style={actionsStyle}><button onClick={() => { setNote(recipe.notes || ''); setEditing(false) }} style={textButtonStyle}>Cancel</button><button onClick={saveNote} disabled={saving} style={saveButtonStyle}>{saving ? 'Saving…' : 'Save note'}</button></div>
      </> : <p style={copyStyle}>{note || 'No personal storage note yet.'}</p>}
    </section>
  </div>
}

const cardStyle = { padding: 14, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--card)', boxShadow: '0 4px 14px rgba(70,35,35,.06)' }
const titleStyle = { margin: 0, color: 'var(--tomato-deep)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }
const copyStyle = { margin: '5px 0 0', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.45 }
const storageGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 11 }
const storageCellStyle = { minHeight: 68, padding: 11, boxSizing: 'border-box', borderRadius: 9, background: 'var(--parchment-dim)' }
const cellTitleStyle = { display: 'block', color: 'var(--tomato-deep)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }
const cellCopyStyle = { display: 'block', marginTop: 5, color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 9.5, lineHeight: 1.35 }
const noteHeadStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
const noteTitleStyle = { margin: 0, color: 'var(--tomato-deep)', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }
const textButtonStyle = { border: 0, background: 'transparent', color: 'var(--tomato-deep)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }
const textareaStyle = { width: '100%', boxSizing: 'border-box', marginTop: 9, padding: 9, resize: 'vertical', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--parchment-dim)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.45 }
const actionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 7 }
const saveButtonStyle = { height: 31, padding: '0 10px', border: 0, borderRadius: 8, background: 'var(--tomato-deep)', color: '#fffaf3', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }
const errorStyle = { marginTop: 6, color: 'var(--tomato)', fontSize: 12 }
