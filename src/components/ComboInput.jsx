import { useState } from 'react'

export default function ComboInput({ value, onChange, suggestions = [], placeholder }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--line)',
          background: 'var(--card)', color: 'var(--charcoal)', fontFamily: 'var(--font-body)', fontSize: 14,
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, marginTop: 4,
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8,
          boxShadow: '0 8px 20px rgba(42,36,32,0.12)', overflow: 'hidden', maxHeight: 160, overflowY: 'auto',
        }}>
          {suggestions
            .filter(s => !value || s.toLowerCase().includes(value.toLowerCase()))
            .map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 11px',
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)',
                }}
              >{s}</button>
            ))}
        </div>
      )}
    </div>
  )
}
