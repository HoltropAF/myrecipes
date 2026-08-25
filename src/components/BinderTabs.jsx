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
export default function BinderTabs({ tabs, activeId, onSelect, compact = false, style, recipeStyle = false }) {
  const shades = getTabShades()
  const recipeShades = [
    'color-mix(in srgb, var(--tomato) 14%, var(--card))',
    'color-mix(in srgb, var(--tomato) 21%, var(--card))',
    'color-mix(in srgb, var(--tomato) 30%, var(--card))',
    'color-mix(in srgb, var(--tomato) 48%, var(--card))',
    'color-mix(in srgb, var(--tomato) 68%, var(--card))',
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, overflow: 'hidden', ...style }}>
      {tabs.map((tab, i) => {
        const isActive = activeId === tab.id
        const shade = recipeStyle ? recipeShades[i % recipeShades.length] : shades[i % shades.length]
        const background = recipeStyle && isActive ? 'var(--tomato-deep)' : shade
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              flex: '1 1 0', minWidth: 0,
              position: 'relative',
              zIndex: isActive ? tabs.length + 1 : tabs.length - i,
              marginLeft: 0,
              height: recipeStyle ? (isActive ? 27 : 24) : undefined,
              padding: recipeStyle ? '0 2px' : (isActive
                ? (compact ? '5px 3px 6px' : '6px 8px 7px')
                : (compact ? '4px 3px 5px' : '5px 7px 6px')),
              borderRadius: recipeStyle ? '6px 6px 0 0' : '7px 7px 0 0',
              border: recipeStyle ? 0 : '1px solid var(--line)',
              borderBottom: recipeStyle ? 0 : (isActive ? `1px solid ${shade}` : '1px solid var(--line)'),
              background,
              color: recipeStyle
                ? (isActive || i === tabs.length - 1 ? '#fffaf3' : 'var(--charcoal-soft)')
                : (isActive ? 'var(--tomato-deep)' : 'var(--charcoal-soft)'),
              fontFamily: recipeStyle ? 'var(--font-mono)' : 'var(--font-display)', fontWeight: recipeStyle ? 700 : 600,
              fontSize: recipeStyle ? (compact ? 7.25 : 9) : (compact ? (isActive ? 10 : 9) : (isActive ? 12 : 11)),
              cursor: 'pointer',
              transform: recipeStyle ? 'none' : (isActive ? 'translateY(0)' : 'translateY(2px)'),
              boxShadow: isActive ? '0 -2px 7px color-mix(in srgb, var(--tomato-deep) 12%, transparent)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >{tab.label}</button>
        )
      })}
    </div>
  )
}
