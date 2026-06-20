import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export default function QuickLogCook({ recipes, onClose, onLogged }) {
  const [step, setStep] = useState('pick') // 'pick' | 'log'
  const [query, setQuery] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [thumbs, setThumbs] = useState(null)
  const [notes, setNotes] = useState('')
  const [variantLabel, setVariantLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return recipes.slice(0, 8)
    const q = query.trim().toLowerCase()
    return recipes.filter(r => r.title.toLowerCase().includes(q)).slice(0, 8)
  }, [recipes, query])

  const pickRecipe = (r) => {
    setSelectedRecipe(r)
    setStep('log')
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    if (!user_id) { setSaving(false); return }

    await supabase.from('cook_log').insert({
      user_id,
      recipe_id: selectedRecipe.id,
      cooked_date: date,
      thumbs,
      notes: notes.trim() || null,
      variant_label: variantLabel || null,
    })
    setSaving(false)
    onLogged?.()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(42,36,32,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: 'var(--parchment)', borderRadius: '20px 20px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))', maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto 16px' }} />

        {step === 'pick' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 14 }}>
              Which recipe did you cook?
            </h2>
            <input
              autoFocus
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search recipes…"
              style={{
                width: '100%', padding: '11px 13px', borderRadius: 9, border: '1px solid var(--line)',
                background: '#fffdf9', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 15,
                marginBottom: 14, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.length === 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--charcoal-soft)', textAlign: 'center', padding: '20px 0' }}>
                  No recipes match.
                </div>
              )}
              {filtered.map(r => (
                <button
                  key={r.id} onClick={() => pickRecipe(r)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10,
                    border: '1px solid var(--line)', background: '#fffdf9', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {r.photo_url && <img src={r.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover' }} />}
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--charcoal)' }}>{r.title}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'log' && selectedRecipe && (
          <>
            <button onClick={() => setStep('pick')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, marginBottom: 10, display: 'block' }}>
              ‹ Change recipe
            </button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--tomato-deep)', marginBottom: 14 }}>
              {selectedRecipe.title}
            </h2>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
              <span style={labelTextStyle}>date</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </label>

            {(selectedRecipe.variants || []).length > 0 && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                <span style={labelTextStyle}>which version?</span>
                <select value={variantLabel} onChange={e => setVariantLabel(e.target.value)} style={inputStyle}>
                  <option value="">Origineel</option>
                  {selectedRecipe.variants.map(v => <option key={v.id} value={v.label}>{v.label}</option>)}
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

            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
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
          </>
        )}
      </div>
    </div>
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
const saveBtnStyle = {
  width: '100%', padding: '12px 0', borderRadius: 9, border: 'none',
  background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
}
