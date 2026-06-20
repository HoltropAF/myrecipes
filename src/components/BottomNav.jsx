const TABS = [
  { id: 'recipes', label: 'Recipes', icon: '📖' },
  { id: 'cookbook', label: 'Cookbook', icon: '📚' },
  { id: 'shopping', label: 'List', icon: '🛒' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'mealprep', label: 'Meal Prep', icon: '🧺' },
]

export default function BottomNav({ active, onChange }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, display: 'flex', background: '#fffdf9',
      borderTop: '1px solid var(--line)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '10px 0 8px', border: 'none', background: 'none', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 19, opacity: active === tab.id ? 1 : 0.55 }}>{tab.icon}</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: active === tab.id ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
            fontWeight: active === tab.id ? 700 : 400,
          }}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
