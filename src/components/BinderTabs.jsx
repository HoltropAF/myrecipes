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
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, overflowX: 'auto', ...style }}>
      {tabs.map((tab, i) => {
        const isActive = activeId === tab.id
        const shade = shades[i % shades.length]
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              flexShrink: 0,
              position: 'relative',
              zIndex: isActive ? tabs.length + 1 : tabs.length - i,
              marginLeft: i === 0 ? 0 : (compact ? -6 : -10),
              padding: isActive
                ? (compact ? '8px 12px 9px' : '10px 18px 11px')
                : (compact ? '7px 10px 8px' : '8px 16px 9px'),
              borderRadius: '10px 10px 0 0',
              border: '1px solid var(--line)',
              borderBottom: isActive ? `1px solid ${shade}` : '1px solid var(--line)',
              background: shade,
              color: isActive ? 'var(--tomato-deep)' : 'var(--charcoal-soft)',
              fontFamily: 'var(--font-display)', fontWeight: 600,
              fontSize: compact ? (isActive ? 12.5 : 11.5) : (isActive ? 14 : 13),
              cursor: 'pointer',
              transform: isActive ? 'translateY(0)' : 'translateY(4px)',
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
