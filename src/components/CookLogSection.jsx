import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'
import { todayLocalISO } from '../lib/dateUtils'
import CookLogForm from './CookLogForm'

export default function CookLogSection({ recipeId, variants = [], isGuest = false, demoEntries = null, onLogged }) {
  const { t } = useT()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(todayLocalISO)
  const [thumbs, setThumbs] = useState(null)
  const [notes, setNotes] = useState('')
  const [variantLabel, setVariantLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    if (isGuest) {
      setEntries(demoEntries || [])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('cook_log')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('cooked_date', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [recipeId, isGuest])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    if (!user_id) {
      setError(t('cookLog.notSignedIn'))
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
      setError(t('cookLog.saveError'))
      return
    }
    setShowForm(false)
    setThumbs(null)
    setNotes('')
    setVariantLabel('')
    setDate(todayLocalISO())
    load()
    onLogged?.()
  }

  const handleDeleteEntry = async (id) => {
    const { error: deleteError } = await supabase.from('cook_log').delete().eq('id', id)
    if (deleteError) {
      setError(t('cookLog.saveError'))
      return
    }
    load()
    onLogged?.()
  }

  const upCount = entries.filter(e => e.thumbs === 'up').length
  const downCount = entries.filter(e => e.thumbs === 'down').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionLabel>{t('cookLog.title')} {entries.length > 0 && `· ${entries.length}x`}</SectionLabel>
        {!isGuest && (
          <button onClick={() => setShowForm(s => !s)} style={addBtnStyle}>
            {showForm ? t('cookLog.cancel') : t('cookLog.logCook')}
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: 'var(--parchment-dim)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <CookLogForm
            date={date} setDate={setDate}
            variants={variants}
            variantLabel={variantLabel} setVariantLabel={setVariantLabel}
            thumbs={thumbs} setThumbs={setThumbs}
            notes={notes} setNotes={setNotes}
            onSave={handleSave} saving={saving} error={error}
          />
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
          {isGuest ? t('cookLog.emptyGuest') : t('cookLog.emptyUser')}
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(entry => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
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
              {!isGuest && (
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal-soft)', fontSize: 15, flexShrink: 0 }}
                >×</button>
              )}
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

const addBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato-deep)',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
}
