import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function CookLogSection({ recipeId, variants = [] }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [thumbs, setThumbs] = useState(null)
  const [notes, setNotes] = useState('')
  const [variantLabel, setVariantLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cook_log')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('cooked_date', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [recipeId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    if (!user_id) {
      setError('Not signed in — please reload and try again.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('cook_log').insert({
      user_id,
      recipe_id: recipeId,
      cooked_date: date,
      thumbs,
      notes: notes.trim() || null,
      variant_label: variantLabel || null,
    })
    setSaving(false)
    if (insertError) {
      setError('Could not save — check your connection and try again.')
      return
    }
    setShowForm(false)
    setThumbs(null)
    setNotes('')
    setVariantLabel('')
    setDate(new Date().toISOString().slice(0, 10))
    load()
  }

  const handleDeleteEntry = async (id) => {
    await supabase.from('cook_log').delete().eq('id', id)
    load()
  }

  const upCount = entries.filter(e => e.thumbs === 'up').length
  const downCount = entries.filter(e => e.thumbs === 'down').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionLabel>Cook log {entries.length > 0 && `· ${entries.length}x`}</SectionLabel>
        <button onClick={() => setShowForm(s => !s)} style={addBtnStyle}>
          {showForm ? 'Cancel' : '+ Log a cook'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--parchment-dim)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
            <span style={labelTextStyle}>date</span>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              style={inputStyle}
            />
          </label>

          {variants.length > 0 && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
              <span style={labelTextStyle}>which version?</span>
              <select value={variantLabel} onChange={e => setVariantLabel(e.target.value)} style={inputStyle}>
                <option value="">Origineel</option>
                {variants.map(v => <option key={v.id} value={v.label}>{v.label}</option>)}
              </select>
            </label>
          )}

          <div style={{ marginBottom: 12 }}>
            <span style={labelTextStyle}>how was it?</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <ThumbButton active={thumbs === 'up'} onClick={() => setThumbs(thumbs === 'up' ? null : 'up')}>👍 Good</ThumbButton>
              <ThumbButton active={thumbs === 'down'} onClick={() => setThumbs(thumbs === 'down' ? null : 'down')}>👎 Not great</ThumbButton>
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
            <span style={labelTextStyle}>notes (optional)</span>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="What did you change, what would you do differently…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {error && (
            <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--tomato-deep)' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {!loading && entries.length > 0 && (upCount > 0 || downCount > 0) && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
          {upCount > 0 && <span>👍 {upCount}</span>}
          {downCount > 0 && <span>👎 {downCount}</span>}
        </div>
      )}

      {!loading && entries.length === 0 && !showForm && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)' }}>
          Not logged yet — tap "+ Log a cook" after you make it.
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(entry => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
              background: '#fffdf9', border: '1px solid var(--line)', borderRadius: 10,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{entry.thumbs === 'up' ? '👍' : entry.thumbs === 'down' ? '👎' : '·'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' }}>
                  {formatDate(entry.cooked_date)}{entry.variant_label ? ` · ${entry.variant_label}` : ''}
                </div>
                {entry.notes && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', marginTop: 3 }}>{entry.notes}</div>
                )}
              </div>
              <button
                onClick={() => handleDeleteEntry(entry.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal-soft)', fontSize: 15, flexShrink: 0 }}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{children}</div>
  )
}

function ThumbButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--tomato)' : 'var(--line)'}`,
        background: active ? 'var(--tomato)' : '#fffdf9',
        color: active ? '#fffdf9' : 'var(--charcoal)',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
      }}
    >{children}</button>
  )
}

const labelTextStyle = { fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--charcoal-soft)' }
const inputStyle = {
  padding: '9px 11px', borderRadius: 8, border: '1px solid var(--line)',
  background: '#fffdf9', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14, width: '100%', boxSizing: 'border-box',
}
const addBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
}
const saveBtnStyle = {
  width: '100%', padding: '10px 0', borderRadius: 9, border: 'none',
  background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
