import { getTabShades } from '../lib/tabShades'

// The "cookbook binder divider" tab bar — overlapping, staggered, shaded tabs.
// Deliberately no emoji: structural navigation is plain.

/**
 * @param tabs      [{ id, label }]
 * @param activeId  id of the selected tab
 * @param onSelect  (id) => void
 * @param compact   true on narrow phones (≤360px) — see useCompact
 * @param style     extra styles for the bar container
 */
export default function BinderTabs({ tabs, activeId, onSelect, compact = false, style }) {
  const shades = getTabShades()

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, overflow: 'hidden', ...style }}>
      {tabs.map((tab, i) => {
        const isActive = activeId === tab.id
        const shade = shades[i % shades.length]
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              flex: '1 1 0', minWidth: 0,
              position: 'relative',
              zIndex: isActive ? tabs.length + 1 : tabs.length - i,
              marginLeft: 0,
              padding: isActive
                ? (compact ? '5px 3px 6px' : '6px 8px 7px')
                : (compact ? '4px 3px 5px' : '5px 7px 6px'),
              borderRadius: '7px 7px 0 0',
              border: '1px solid var(--line)',
              borderBottom: isActive ? `1px solid ${shade}` : '1px solid var(--line)',
              background: shade,
              color: isActive ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
              fontFamily: 'var(--font-display)', fontWeight: 600,
              fontSize: compact ? (isActive ? 10 : 9) : (isActive ? 12 : 11),
              cursor: 'pointer',
              transform: isActive ? 'translateY(0)' : 'translateY(2px)',
              boxShadow: isActive ? '0 -2px 8px rgba(42,36,32,0.08)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >{tab.label}</button>
        )
      })}
    </div>
  )
}
