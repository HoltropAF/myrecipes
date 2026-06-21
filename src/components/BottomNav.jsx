import { useEffect, useState } from 'react'

const TABS = [
  { id: 'recipes', label: 'Recipes', icon: '📖' },
  { id: 'shopping', label: 'List', icon: '🛒' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'mealprep', label: 'Meal Prep', icon: '🧺' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function BottomNav({ active, onChange }) {
  // Narrow phones (≤360px, e.g. older/small Android) get a tighter layout so 5 tabs
  // never wrap or overflow — smaller icon, smaller label, tighter padding.
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const check = () => setCompact(window.innerWidth <= 360)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{
      position: 'sticky', bottom: 0, display: 'flex', background: 'var(--card)',
      borderTop: '1px solid var(--line)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: compact ? '8px 0 6px' : '10px 0 8px', border: 'none', background: 'none', cursor: 'pointer',
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: compact ? 16 : 19, opacity: active === tab.id ? 1 : 0.55 }}>{tab.icon}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: compact ? 9 : 10,
            color: active === tab.id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
            fontWeight: active === tab.id ? 700 : 400,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
          }}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
