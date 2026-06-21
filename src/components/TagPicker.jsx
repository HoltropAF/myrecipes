import { useState } from 'react'

export default function TagPicker({ tags, setTags, existingTags = [] }) {
  const [input, setInput] = useState('')

  const addTag = (tag) => {
    const clean = tag.trim()
    if (!clean || tags.includes(clean)) return
    setTags([...tags, clean])
    setInput('')
  }

  const removeTag = (tag) => setTags(tags.filter(t => t !== tag))

  const suggestions = existingTags.filter(t => !tags.includes(t) && (!input || t.toLowerCase().includes(input.toLowerCase())))

  return (
    <div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {tags.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99,
              background: 'var(--sage-light)', color: 'var(--sage)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
            }}>
              {tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sage)', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text" value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); addTag(input) }
        }}
        placeholder="Type a tag and press Enter…"
        style={{
          width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14, boxSizing: 'border-box',
        }}
      />

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {suggestions.slice(0, 10).map(tag => (
            <button
              key={tag} onClick={() => addTag(tag)}
              style={{
                padding: '5px 10px', borderRadius: 99, border: '1px solid var(--line)', background: 'var(--parchment-dim)',
                color: 'var(--charcoal)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
              }}
            >+ {tag}</button>
          ))}
        </div>
      )}
    </div>
  )
}
