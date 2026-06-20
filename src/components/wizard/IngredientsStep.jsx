import { useState } from 'react'
import { parseIngredientBlock, formatIngredientRow } from '../../lib/ingredientParser'
import ComboInput from '../ComboInput'
import { titleStyle, labelTextStyle, inputStyle } from './TitleStep'

export default function IngredientsStep({ groups, setGroups, paste, setPaste, showGrouping, setShowGrouping, existingGroups }) {
  const handleParse = () => {
    const parsed = parseIngredientBlock(paste)
    if (parsed.length === 0) return
    setGroups(prev => {
      const next = [...prev]
      next[0] = { ...next[0], items: [...next[0].items, ...parsed] }
      return next
    })
    setPaste('')
  }

  const updateItem = (groupIdx, itemIdx, patch) => {
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[groupIdx].items[itemIdx] = { ...next[groupIdx].items[itemIdx], ...patch }
      return next
    })
  }

  const removeItem = (groupIdx, itemIdx) => {
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[groupIdx].items.splice(itemIdx, 1)
      return next
    })
  }

  const addManualRow = (groupIdx) => {
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, items: [...g.items] }))
      next[groupIdx].items.push({ id: `ing_${Date.now()}_${Math.random()}`, amount: null, unit: null, name: '' })
      return next
    })
  }

  const addGroup = () => {
    setGroups(prev => [...prev, { group: '', items: [] }])
  }

  const renameGroup = (groupIdx, name) => {
    setGroups(prev => {
      const next = [...prev]
      next[groupIdx] = { ...next[groupIdx], group: name }
      return next
    })
  }

  const totalItems = groups.reduce((s, g) => s + g.items.length, 0)

  return (
    <div>
      <h2 style={titleStyle}>What goes in it?</h2>

      <div style={{ marginBottom: 16 }}>
        <span style={labelTextStyle}>paste ingredients (one per line)</span>
        <textarea
          value={paste} onChange={e => setPaste(e.target.value)}
          placeholder={'300g kip\n1 ui\n4 tenen knoflook\nzout naar smaak'}
          rows={4}
          style={{ ...inputStyle, width: '100%', marginTop: 6, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 14 }}
        />
        <button
          onClick={handleParse} disabled={!paste.trim()}
          style={{
            marginTop: 8, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--tomato)',
            background: 'none', color: 'var(--tomato-deep)', fontFamily: 'var(--font-body)',
            fontWeight: 600, fontSize: 13, cursor: paste.trim() ? 'pointer' : 'default',
            opacity: paste.trim() ? 1 : 0.5,
          }}
        >Parse & add</button>
      </div>

      {totalItems > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map((group, gIdx) => (
            <div key={gIdx}>
              {showGrouping && (
                <div style={{ marginBottom: 8 }}>
                  <ComboInput
                    value={group.group || ''}
                    onChange={v => renameGroup(gIdx, v)}
                    suggestions={existingGroups}
                    placeholder={gIdx === 0 ? 'Group name (optional)' : 'Group name'}
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map((item, iIdx) => (
                  <IngredientRow
                    key={item.id}
                    item={item}
                    onChange={patch => updateItem(gIdx, iIdx, patch)}
                    onRemove={() => removeItem(gIdx, iIdx)}
                  />
                ))}
              </div>
              <button
                onClick={() => addManualRow(gIdx)}
                style={{
                  marginTop: 8, background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 12,
                }}
              >+ add row manually</button>
            </div>
          ))}
        </div>
      )}

      {!showGrouping && totalItems > 0 && (
        <button
          onClick={() => setShowGrouping(true)}
          style={{
            marginTop: 14, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 12, textDecoration: 'underline',
          }}
        >+ split into groups (e.g. "Voor serveren")</button>
      )}
      {showGrouping && (
        <button
          onClick={addGroup}
          style={{
            marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 12,
          }}
        >+ add another group</button>
      )}
    </div>
  )
}

function IngredientRow({ item, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="text" value={item.amount ?? ''} placeholder="—"
        onChange={e => onChange({ amount: e.target.value === '' ? null : parseFloat(e.target.value) || e.target.value })}
        style={{ ...inputStyle, width: 48, padding: '8px 6px', fontSize: 14, textAlign: 'center' }}
      />
      <input
        type="text" value={item.unit ?? ''} placeholder="unit"
        onChange={e => onChange({ unit: e.target.value || null })}
        style={{ ...inputStyle, width: 56, padding: '8px 6px', fontSize: 14, textAlign: 'center' }}
      />
      <input
        type="text" value={item.name} placeholder="ingredient"
        onChange={e => onChange({ name: e.target.value })}
        style={{ ...inputStyle, flex: 1, padding: '8px 10px', fontSize: 14 }}
      />
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato)', fontSize: 18, padding: '0 4px' }}
      >×</button>
    </div>
  )
}
