import { useState } from 'react'

export default function FloatingActionButton({ onAddRecipe, onLogCook }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(42,36,32,0.25)' }}
        />
      )}

      <div style={{
        position: 'fixed', bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))', right: 20, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        {open && (
          <>
            <MenuItem label="Log a cook" icon="📝" onClick={() => { setOpen(false); onLogCook() }} />
            <MenuItem label="Add recipe" icon="🍳" onClick={() => { setOpen(false); onAddRecipe() }} />
          </>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: 56, height: 56, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: 'var(--tomato)', color: 'var(--card)', fontSize: 28, lineHeight: 1,
            boxShadow: '0 6px 18px rgba(193,67,47,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease',
          }}
        >+</button>
      </div>
    </>
  )
}

function MenuItem({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 99,
        border: '1px solid var(--line)', background: 'var(--card)', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(42,36,32,0.15)', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--charcoal)' }}>{label}</span>
    </button>
  )
}
