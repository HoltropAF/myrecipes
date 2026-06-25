import { useState, useEffect, useRef, useMemo } from 'react'
import { convertStepTemperatures } from '../lib/unitConverter'
import { useT } from '../lib/i18n'
import { supabase } from '../lib/supabase'

export default function CookingMode({ recipe, steps, unitSystem, onClose }) {
  const { t } = useT()

  const flatSteps = useMemo(() => {
    const out = []
    for (const group of steps || []) {
      for (const item of group.items || []) {
        out.push({ ...item, section: group.group })
      }
    }
    return out
  }, [steps])

  const [index, setIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef(null)

  // End-screen state
  const [showEndScreen, setShowEndScreen] = useState(false)
  const [endNotes, setEndNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const current = flatSteps[index]
  const isLast = index === flatSteps.length - 1
  const isFirst = index === 0

  useEffect(() => {
    clearInterval(intervalRef.current)
    setTimerRunning(false)
    setTimeLeft(current?.timer_seconds || null)
  }, [index, current?.timer_seconds])

  useEffect(() => {
    if (!timerRunning) return
    intervalRef.current = setInterval(() => {
      setTimeLeft(secs => {
        if (secs === null || secs <= 1) {
          clearInterval(intervalRef.current)
          setTimerRunning(false)
          return 0
        }
        return secs - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [timerRunning])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const goNext = () => setIndex(i => Math.min(i + 1, flatSteps.length - 1))
  const goBack = () => setIndex(i => Math.max(i - 1, 0))

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  }

  const handleLogCook = async () => {
    setSaving(true)
    const userId = await getUserId()
    if (userId) {
      await supabase.from('cook_log').insert({
        recipe_id: recipe.id,
        user_id: userId,
        notes: endNotes.trim() || null,
        cooked_at: new Date().toISOString(),
      })
    }
    setSaving(false)
    onClose()
  }

  const handleSaveToNotes = async () => {
    setSaving(true)
    const existing = recipe.notes || ''
    const separator = existing ? '\n\n—\n' : ''
    await supabase.from('recipes').update({ notes: existing + separator + endNotes.trim() }).eq('id', recipe.id)
    setSaving(false)
    onClose()
  }

  if (flatSteps.length === 0) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--parchment)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-body)', color: 'var(--charcoal-soft)' }}>{t('cookingMode.noSteps')}</div>
        <button onClick={onClose} style={closeBtnStyle}>{t('cookingMode.backToRecipe')}</button>
      </div>
    )
  }

  // End screen — shown after the last "Done" press
  if (showEndScreen) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--charcoal)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 20,
      }}>
        <div style={{ fontSize: 52, lineHeight: 1 }}>🍽</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--parchment)', textAlign: 'center' }}>
          {t('cookingMode.endTitle')}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'rgba(253,248,240,0.55)', textAlign: 'center' }}>
          {t('cookingMode.endHint')}
        </div>
        <textarea
          value={endNotes}
          onChange={e => setEndNotes(e.target.value)}
          placeholder={t('cookingMode.notesPlaceholder')}
          rows={4}
          style={{
            width: '100%', maxWidth: 440, padding: '12px 14px', borderRadius: 10,
            border: '1px solid rgba(253,248,240,0.2)', background: 'rgba(253,248,240,0.07)',
            color: 'var(--parchment)', fontFamily: 'var(--font-body)', fontSize: 14,
            resize: 'none', outline: 'none', lineHeight: 1.5,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 440 }}>
          <button
            onClick={handleLogCook} disabled={saving}
            style={{
              padding: '14px 0', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
              background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)',
              fontWeight: 700, fontSize: 15, opacity: saving ? 0.6 : 1,
            }}
          >{saving ? t('cookingMode.saving') : t('cookingMode.logCook')}</button>
          {endNotes.trim() && (
            <button
              onClick={handleSaveToNotes} disabled={saving}
              style={{
                padding: '13px 0', borderRadius: 12, border: '1px solid rgba(253,248,240,0.25)', cursor: saving ? 'default' : 'pointer',
                background: 'none', color: 'var(--parchment)', fontFamily: 'var(--font-body)',
                fontWeight: 600, fontSize: 14, opacity: saving ? 0.6 : 1,
              }}
            >{saving ? t('cookingMode.saving') : t('cookingMode.saveToNotes')}</button>
          )}
          <button
            onClick={onClose} disabled={saving}
            style={{
              padding: '13px 0', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
              background: 'none', color: 'rgba(253,248,240,0.4)', fontFamily: 'var(--font-body)',
              fontWeight: 600, fontSize: 14,
            }}
          >{t('cookingMode.skip')}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--charcoal)', display: 'flex', flexDirection: 'column', color: 'var(--parchment)' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--parchment)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: 0.8 }}>
          {t('cookingMode.exit')}
        </button>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, opacity: 0.6 }}>
          {index + 1} / {flatSteps.length}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, padding: '0 20px 8px' }}>
        {flatSteps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= index ? 'var(--tomato)' : 'rgba(253,248,240,0.15)',
          }} />
        ))}
      </div>

      {/* Step content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 28px', textAlign: 'center' }}>
        {current.section && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--tomato-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            {current.section}
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, lineHeight: 1.4, marginBottom: current.timer_seconds ? 28 : 0 }}>
          {convertStepTemperatures(current.content, unitSystem)}
        </div>

        {current.timer_seconds && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 700, color: timeLeft === 0 ? 'var(--tomato)' : 'var(--parchment)' }}>
              {formatTime(timeLeft ?? current.timer_seconds)}
            </div>
            <button
              onClick={() => setTimerRunning(r => !r)}
              style={{
                padding: '10px 22px', borderRadius: 99, border: 'none', cursor: 'pointer',
                background: timerRunning ? 'rgba(253,248,240,0.15)' : 'var(--tomato)',
                color: timerRunning ? 'var(--parchment)' : '#fffdf9',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
              }}
            >{timerRunning ? t('cookingMode.pause') : timeLeft === 0 ? t('cookingMode.restart') : t('cookingMode.startTimer')}</button>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 10, padding: '16px 20px calc(20px + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={goBack} disabled={isFirst} style={{ ...navBtnStyle, opacity: isFirst ? 0.3 : 1 }}>{t('cookingMode.back')}</button>
        {isLast ? (
          <button onClick={() => setShowEndScreen(true)} style={{ ...primaryNavBtnStyle, flex: 2 }}>{t('cookingMode.done')}</button>
        ) : (
          <button onClick={goNext} style={{ ...primaryNavBtnStyle, flex: 2 }}>{t('cookingMode.next')}</button>
        )}
      </div>
    </div>
  )
}

const navBtnStyle = {
  flex: 1, padding: '14px 0', borderRadius: 12, border: '1px solid rgba(253,248,240,0.25)',
  background: 'none', color: 'var(--parchment)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
}
const primaryNavBtnStyle = {
  padding: '14px 0', borderRadius: 12, border: 'none',
  background: 'var(--tomato)', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
}
const closeBtnStyle = {
  padding: '10px 18px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)',
  color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
}
