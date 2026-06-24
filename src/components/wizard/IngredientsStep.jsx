import { useState, useRef } from 'react'
import { parseIngredientBlock, formatIngredientRow } from '../../lib/ingredientParser'
import ComboInput from '../ComboInput'
import { titleStyle, labelTextStyle, inputStyle } from './TitleStep'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'

export default function IngredientsStep({ groups, setGroups, paste, setPaste, showGrouping, setShowGrouping, existingGroups }) {
  const { t } = useT()
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
      <h2 style={titleStyle}>{t('ingredientsStep.heading')}</h2>

      <div style={{ marginBottom: 16 }}>
        <span style={labelTextStyle}>{t('ingredientsStep.pasteLabel')}</span>
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
        >{t('ingredientsStep.parseBtn')}</button>
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
                    placeholder={gIdx === 0 ? t('ingredientsStep.groupNamePlaceholder0') : t('ingredientsStep.groupNamePlaceholder')}
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
              >{t('ingredientsStep.addManualBtn')}</button>
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
        >{t('ingredientsStep.splitGroups')}</button>
      )}
      {showGrouping && (
        <button
          onClick={addGroup}
          style={{
            marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 12,
          }}
        >{t('ingredientsStep.addGroup')}</button>
      )}
    </div>
  )
}

function IngredientRow({ item, onChange, onRemove }) {
  const { t } = useT()
  const [showNote, setShowNote] = useState(!!(item.note))
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)

  const handleNameChange = (value) => {
    onChange({ name: value })
    clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('ingredient_tags')
        .select('canonical_name, tags')
        .ilike('canonical_name', `%${value.trim()}%`)
        .limit(5)
      if (data?.length > 0) {
        setSuggestions(data)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)
  }

  const selectSuggestion = (canonical) => {
    onChange({ name: canonical })
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div>
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
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text" value={item.name} placeholder="ingredient"
            onChange={e => handleNameChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            style={{ ...inputStyle, width: '100%', padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8,
              zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden',
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={s.canonical_name}
                  onMouseDown={() => selectSuggestion(s.canonical_name)}
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 8,
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--line)' : 'none',
                    fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--charcoal)',
                  }}
                >
                  {s.canonical_name}
                  {s.tags?.length > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--charcoal-soft)' }}>
                      {s.tags.join(' · ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tomato)', fontSize: 18, padding: '0 4px', flexShrink: 0 }}
        >×</button>
      </div>

      {showNote ? (
        <input
          type="text" value={item.note ?? ''} placeholder={t('ingredientsStep.notePlaceholder')}
          onChange={e => onChange({ note: e.target.value || null })}
          style={{
            ...inputStyle, width: '100%', marginTop: 4, padding: '6px 10px', fontSize: 13,
            fontStyle: 'italic', color: 'var(--charcoal-soft)', boxSizing: 'border-box',
          }}
        />
      ) : (
        <button
          onClick={() => setShowNote(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--charcoal-soft)', fontFamily: 'var(--font-mono)', fontSize: 11,
            padding: '2px 0', marginTop: 2,
          }}
        >{t('ingredientsStep.addNote')}</button>
      )}
    </div>
  )
}
