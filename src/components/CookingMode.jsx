import { useState, useMemo, useCallback } from 'react'
import { convertStepTemperatures } from '../lib/unitConverter'
import { useT } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { todayLocalISO } from '../lib/dateUtils'
import { detectDurationSeconds, formatDuration } from '../lib/durationParser'
import { useTimers, remainingOf, ringAlarm } from '../lib/useTimers'
import { useWakeLock } from '../lib/useWakeLock'

export default function CookingMode({ recipe, steps, unitSystem, onClose, onLogged }) {
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

  // End-screen state
  const [showEndScreen, setShowEndScreen] = useState(false)
  const [endNotes, setEndNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Nobody wants to wipe their hands to wake the screen mid-recipe.
  useWakeLock(!showEndScreen)

  const { timers, start, toggle, addTime, dismiss } = useTimers(ringAlarm)

  const current = flatSteps[index]
  const isLast = index === flatSteps.length - 1
  const isFirst = index === 0

  // A step's timer is either one the author set explicitly, or a duration we
  // spotted in the text. Most existing recipes have no timer_seconds at all —
  // the wizard only started writing it recently.
  const stepSeconds = useMemo(() => {
    if (!current) return null
    return current.timer_seconds || detectDurationSeconds(current.content) || null
  }, [current])

  const stepTimerId = current?.id ? `step_${current.id}` : `step_${index}`
  const stepTimer = timers[stepTimerId]
  const stepRemaining = stepTimer ? remainingOf(stepTimer) : stepSeconds

  const startStepTimer = useCallback(() => {
    const label = current?.section || `${t('cookingMode.stepLabel')} ${index + 1}`
    start(stepTimerId, label, stepSeconds)
  }, [current, index, start, stepSeconds, stepTimerId, t])

  // Timers from other steps that are still counting — the whole point of
  // running several at once.
  const otherTimers = Object.values(timers).filter(timer => timer.id !== stepTimerId)

  const goNext = () => setIndex(i => Math.min(i + 1, flatSteps.length - 1))
  const goBack = () => setIndex(i => Math.max(i - 1, 0))

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  }

  const handleLogCook = async () => {
    setSaving(true)
    setError(null)
    const userId = await getUserId()
    if (!userId) {
      setError(t('cookLog.notSignedIn'))
      setSaving(false)
      return
    }
    const { error: insertError } = await supabase.from('cook_log').insert({
      recipe_id: recipe.id,
      user_id: userId,
      notes: endNotes.trim() || null,
      cooked_date: todayLocalISO(),
    })
    setSaving(false)
    if (insertError) {
      setError(t('cookLog.saveError'))
      return
    }
    onLogged?.()
    onClose()
  }

  const handleSaveToNotes = async () => {
    setSaving(true)
    setError(null)
    const existing = recipe.notes || ''
    const separator = existing ? '\n\n—\n' : ''
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ notes: existing + separator + endNotes.trim(), updated_at: new Date().toISOString() })
      .eq('id', recipe.id)
    setSaving(false)
    if (updateError) {
      setError(t('cookLog.saveError'))
      return
    }
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
        {error && (
          <div style={{
            width: '100%', maxWidth: 440, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(217,79,58,0.15)', border: '1px solid var(--tomato)',
            color: 'var(--parchment)', fontFamily: 'var(--font-body)', fontSize: 13, textAlign: 'center',
          }}>{error}</div>
        )}
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
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, lineHeight: 1.4, marginBottom: stepSeconds ? 28 : 0 }}>
          {convertStepTemperatures(current.content, unitSystem)}
        </div>

        {stepSeconds && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 700,
              color: stepTimer && stepRemaining === 0 ? 'var(--tomato)' : 'var(--parchment)',
            }}>
              {formatDuration(stepRemaining ?? stepSeconds)}
            </div>

            {/* The timer wasn't set by the author — say so, so a wrong guess is
                obviously a guess rather than something the recipe promised. */}
            {!current.timer_seconds && !stepTimer && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(253,248,240,0.45)' }}>
                {t('cookingMode.detectedTimer')}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => (stepTimer ? toggle(stepTimerId) : startStepTimer())}
                style={{
                  padding: '10px 22px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: stepTimer?.running ? 'rgba(253,248,240,0.15)' : 'var(--tomato)',
                  color: stepTimer?.running ? 'var(--parchment)' : '#fffdf9',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                }}
              >
                {stepTimer?.running
                  ? t('cookingMode.pause')
                  : stepTimer && stepRemaining === 0
                    ? t('cookingMode.restart')
                    : t('cookingMode.startTimer')}
              </button>
              {stepTimer && (
                <button
                  onClick={() => addTime(stepTimerId, 60)}
                  style={{
                    padding: '10px 14px', borderRadius: 99, cursor: 'pointer',
                    border: '1px solid rgba(253,248,240,0.25)', background: 'none',
                    color: 'var(--parchment)', fontFamily: 'var(--font-mono)', fontSize: 13,
                  }}
                >{t('cookingMode.addMinute')}</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timers started on other steps, still counting down */}
      {otherTimers.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(253,248,240,0.12)', padding: '10px 20px 2px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(253,248,240,0.4)', marginBottom: 7 }}>
            {t('cookingMode.alsoRunning')}
          </div>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 8 }}>
            {otherTimers.map(timer => {
              const left = remainingOf(timer)
              const done = left === 0
              return (
                <div
                  key={timer.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                    padding: '6px 8px 6px 11px', borderRadius: 99,
                    border: `1px solid ${done ? 'var(--tomato)' : 'rgba(253,248,240,0.25)'}`,
                    background: done ? 'rgba(193,67,47,0.22)' : 'none',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(253,248,240,0.75)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {timer.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: done ? 'var(--tomato-deep)' : 'var(--parchment)' }}>
                    {done ? t('cookingMode.timerDone') : formatDuration(left)}
                  </span>
                  <button
                    onClick={() => dismiss(timer.id)}
                    aria-label={t('cookingMode.dismissTimer')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(253,248,240,0.5)', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
                  >×</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
