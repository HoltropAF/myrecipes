import { useEffect } from 'react'

export default function UndoToast({ message, onUndo, onDismiss, duration = 5000 }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(78px + env(safe-area-inset-bottom, 0px))', left: 16, right: 16, zIndex: 70,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      background: 'var(--charcoal)', color: 'var(--parchment)', borderRadius: 12, padding: '12px 16px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.25)', maxWidth: 480, margin: '0 auto',
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14 }}>{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          style={{ background: 'none', border: 'none', color: 'var(--tomato-deep)', fontWeight: 700, fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
        >Undo</button>
      )}
    </div>
  )
}
