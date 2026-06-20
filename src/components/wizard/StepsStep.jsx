import { parseStepBlock } from '../../lib/stepParser'
import ComboInput from '../ComboInput'
import { titleStyle, labelTextStyle, inputStyle } from './TitleStep'

const COMMON_SECTIONS = ['Bereiding', 'Bewaren', 'Invriezen', 'Ideeën voor restjes']

export default function StepsStep({ groups, setGroups, paste, setPaste }) {
  const handleParse = (groupIdx) => {
    const parsed = parseStepBlock(paste)
    if (parsed.length === 0) return
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[groupIdx].items.push(...parsed)
      return next
    })
    setPaste('')
  }

  const updateItem = (gIdx, iIdx, content) => {
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[gIdx].items[iIdx] = { ...next[gIdx].items[iIdx], content }
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
      <h2 style={titleStyle}>How do we make it?</h2>

      {groups.map((group, gIdx) => (
        <div key={gIdx} style={{ marginBottom: 22 }}>
          <div style={{ marginBottom: 8 }}>
            <ComboInput
              value={group.group || ''}
              onChange={v => renameGroup(gIdx, v)}
              suggestions={COMMON_SECTIONS}
              placeholder="Section name"
            />
          </div>

          {group.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {group.items.map((item, iIdx) => (
                <div key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 99, background: 'var(--tomato)', color: '#fffdf9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 9,
                  }}>{iIdx + 1}</div>
                  <textarea
                    value={item.content} onChange={e => updateItem(gIdx, iIdx, e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, flex: 1, fontSize: 14, resize: 'vertical' }}
                  />
                  <button
                    onClick={() => removeItem(gIdx, iIdx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato)', fontSize: 18, padding: '8px 2px' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* paste box per group */}
          <textarea
            value={paste} onChange={e => setPaste(e.target.value)}
            placeholder={'1. Snijd de kip\n2. Kook de pasta\n3. Bak de kip bruin'}
            rows={3}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleParse(gIdx)} disabled={!paste.trim()}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--tomato)',
                background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
                fontWeight: 600, fontSize: 13, cursor: paste.trim() ? 'pointer' : 'default',
                opacity: paste.trim() ? 1 : 0.5,
              }}
            >Parse & add</button>
            <button
              onClick={() => addManualStep(gIdx)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            >+ add step manually</button>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
      >+ add another section (e.g. "Bewaren")</button>
    </div>
  )
}
