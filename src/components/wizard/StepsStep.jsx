import { useState } from 'react'
import { parseStepBlock } from '../../lib/stepParser'
import ComboInput from '../ComboInput'
import { titleStyle, inputStyle } from './TitleStep'
import { useT } from '../../lib/i18n'
import { detectDurationSeconds, formatDurationShort, parseTimerInput } from '../../lib/durationParser'

export default function StepsStep({ groups, setGroups, paste, setPaste }) {
  const { t } = useT()
  const COMMON_SECTIONS = t('stepsStep.commonSections')
  // `paste` is keyed by group index. It used to be one shared string, so typing
  // into section 2's box mirrored the text into section 1's box at the same time.
  const pasteFor = (groupIdx) => paste?.[groupIdx] || ''
  const setPasteFor = (groupIdx, value) => setPaste(prev => ({ ...prev, [groupIdx]: value }))

  const handleParse = (groupIdx) => {
    const parsed = parseStepBlock(pasteFor(groupIdx))
    if (parsed.length === 0) return
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[groupIdx].items.push(...parsed)
      return next
    })
    setPasteFor(groupIdx, '')
  }

  const updateItem = (gIdx, iIdx, patch) => {
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[gIdx].items[iIdx] = { ...next[gIdx].items[iIdx], ...patch }
      return next
    })
  }

  const removeItem = (gIdx, iIdx) => {
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[gIdx].items.splice(iIdx, 1)
      return next
    })
  }

  const addManualStep = (gIdx) => {
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[gIdx].items.push({ id: `step_${Date.now()}_${Math.random()}`, content: '', timer_seconds: null })
      return next
    })
  }

  const renameGroup = (gIdx, name) => {
    setGroups(prev => {
      const next = [...prev]
      next[gIdx] = { ...next[gIdx], group: name }
      return next
    })
  }

  const addSection = () => {
    setGroups(prev => [...prev, { group: '', items: [] }])
  }

  return (
    <div>
      <h2 style={titleStyle}>{t('stepsStep.heading')}</h2>

      {groups.map((group, gIdx) => (
        <div key={gIdx} style={{ marginBottom: 22 }}>
          <div style={{ marginBottom: 8 }}>
            <ComboInput
              value={group.group || ''}
              onChange={v => renameGroup(gIdx, v)}
              suggestions={COMMON_SECTIONS}
              placeholder={t('stepsStep.sectionPlaceholder')}
            />
          </div>

          {group.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {group.items.map((item, iIdx) => (
                <StepRow
                  key={item.id}
                  item={item}
                  number={iIdx + 1}
                  onChange={patch => updateItem(gIdx, iIdx, patch)}
                  onRemove={() => removeItem(gIdx, iIdx)}
                />
              ))}
            </div>
          )}

          {/* paste box per group */}
          <textarea
            value={pasteFor(gIdx)} onChange={e => setPasteFor(gIdx, e.target.value)}
            placeholder={'1. Snijd de kip\n2. Kook de pasta\n3. Bak de kip bruin'}
            rows={3}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleParse(gIdx)} disabled={!pasteFor(gIdx).trim()}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--tomato)',
                background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
                fontWeight: 600, fontSize: 13, cursor: pasteFor(gIdx).trim() ? 'pointer' : 'default',
                opacity: pasteFor(gIdx).trim() ? 1 : 0.5,
              }}
            >{t('stepsStep.parseBtn')}</button>
            <button
              onClick={() => addManualStep(gIdx)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            >{t('stepsStep.addManualBtn')}</button>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
      >{t('stepsStep.addSectionBtn')}</button>
    </div>
  )
}

// One step, with an optional timer. `timer_seconds` has been in the schema and
// rendered by Cooking Mode since the beginning, but nothing ever wrote it — so
// the timer was unreachable for every recipe anyone actually created.
function StepRow({ item, number, onChange, onRemove }) {
  const { t } = useT()
  const [timerText, setTimerText] = useState(
    item.timer_seconds ? String(Math.round(item.timer_seconds / 60)) : ''
  )
  const [showTimer, setShowTimer] = useState(!!item.timer_seconds)

  // If the step text already says "20 minuten", offer that rather than making
  // the author type it twice.
  const suggested = !item.timer_seconds ? detectDurationSeconds(item.content) : null

  const handleTimerText = (raw) => {
    setTimerText(raw)
    onChange({ timer_seconds: parseTimerInput(raw) })
  }

  const acceptSuggestion = () => {
    setShowTimer(true)
    setTimerText(String(Math.round(suggested / 60)))
    onChange({ timer_seconds: suggested })
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
      <div style={{
        width: 22, height: 22, borderRadius: 99, background: 'var(--tomato)', color: 'var(--card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 9,
      }}>{number}</div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <textarea
          value={item.content} onChange={e => onChange({ content: e.target.value })}
          rows={2}
          style={{ ...inputStyle, width: '100%', fontSize: 14, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {showTimer ? (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
                ⏱ {t('stepsStep.timerLabel')}
              </span>
              <input
                type="text" inputMode="decimal" value={timerText}
                onChange={e => handleTimerText(e.target.value)}
                placeholder="20"
                style={{ ...inputStyle, width: 62, padding: '5px 8px', fontSize: 13, textAlign: 'center' }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--charcoal-soft)' }}>
                {item.timer_seconds ? formatDurationShort(item.timer_seconds) : t('stepsStep.timerMinutes')}
              </span>
              <button
                onClick={() => { setShowTimer(false); setTimerText(''); onChange({ timer_seconds: null }) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
              >{t('stepsStep.removeTimer')}</button>
            </>
          ) : suggested ? (
            <button
              onClick={acceptSuggestion}
              style={{
                background: 'none', border: '1px dashed var(--sage)', borderRadius: 99, cursor: 'pointer',
                color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px',
              }}
            >{t('stepsStep.addSuggestedTimer')} {formatDurationShort(suggested)}</button>
          ) : (
            <button
              onClick={() => setShowTimer(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
            >{t('stepsStep.addTimer')}</button>
          )}
        </div>
      </div>

      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato)', fontSize: 18, padding: '8px 2px' }}
      >×</button>
    </div>
  )
}
