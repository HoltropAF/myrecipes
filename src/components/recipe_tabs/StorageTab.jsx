import { useEffect, useState } from 'react'
import { useT } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'

export default function StorageTab({ recipe, isGuest = false }) {
  const { t } = useT()
  const [note, setNote] = useState(recipe.notes || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => setNote(recipe.notes || ''), [recipe.id, recipe.notes])
  // Must match the render guard below, which treats undefined as "no value" too.
  // Checking only against null made this true for every recipe that has never
  // had the freezer flag set, so the tab rendered completely empty.
  const hasFreezerInfo = recipe.freezer_friendly !== null && recipe.freezer_friendly !== undefined
  const hasContent = hasFreezerInfo || note || recipe.source || !isGuest

  const saveNote = async () => {
    if (isGuest) { setEditing(false); return }
    setSaving(true)
    setError('')
    const { error: updateError } = await supabase.from('recipes').update({ notes: note.trim() || null, updated_at: new Date().toISOString() }).eq('id', recipe.id)
    setSaving(false)
    if (updateError) { setError('Could not save this note.'); return }
    setEditing(false)
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {recipe.freezer_friendly !== null && recipe.freezer_friendly !== undefined && (
        <section style={cardStyle}>
          <SectionLabel>{t('storageTab.freezerLabel')}</SectionLabel>
          <div style={{
            background: recipe.freezer_friendly ? 'var(--sage-light)' : 'var(--parchment-dim)',
            borderRadius: 9, padding: '11px 13px',
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)',
          }}>
            {recipe.freezer_friendly ? t('storageTab.freezesWell') : t('storageTab.notFreezer')}
          </div>
        </section>
      )}

      {(note || editing || !isGuest) && (
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel>{t('storageTab.notesLabel')}</SectionLabel>
            {!editing && <button onClick={() => setEditing(true)} style={editButtonStyle}>Edit</button>}
          </div>
          {editing ? <>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add storage, reheating or freezer notes…" rows={5} style={textareaStyle} />
            {error && <div style={{ color: 'var(--tomato)', fontSize: 12, marginTop: 6 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 8 }}>
              <button onClick={() => { setNote(recipe.notes || ''); setEditing(false) }} style={editButtonStyle}>Cancel</button>
              <button onClick={saveNote} disabled={saving} style={saveButtonStyle}>{saving ? 'Saving…' : 'Save note'}</button>
            </div>
          </> : <div style={noteStyle}>{note || 'No storage notes yet.'}</div>}
        </section>
      )}

      {recipe.source && (
        <section style={cardStyle}>
          <SectionLabel>{t('storageTab.sourceLabel')}</SectionLabel>
          <a href={recipe.source} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--tomato-deep)' }}>
            {recipe.source} ↗
          </a>
        </section>
      )}

      {!hasContent && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', textAlign: 'center', padding: '30px 0' }}>
          {t('storageTab.noInfo')}
        </div>
      )}
    </div>
  )
}

const cardStyle = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 13 }
const noteStyle = { background: 'var(--sage-light)', borderRadius: 10, padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.5 }
const textareaStyle = { width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 12px', background: 'var(--parchment-dim)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5 }
const editButtonStyle = { border: 0, background: 'transparent', color: 'var(--tomato-deep)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
const saveButtonStyle = { border: 0, borderRadius: 8, padding: '7px 10px', background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
    }}>{children}</div>
  )
}
