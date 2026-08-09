// The "cookbook binder divider" tab bar — overlapping, staggered, shaded tabs.
// Introduced in 8607c87 (2026-06-21) for RecipeDetail and reused verbatim by
// SettingsView in e54e851; this is the shared implementation both now use.
//
// Deliberately no emoji: structural navigation is plain, emoji are for decoration
// and user content only.

// A palette of subtly differing card shades, like coloured index dividers in a
// real binder. Defined per-theme since the light parchment shades would clash
// against a dark background.
export const TAB_SHADES_LIGHT = ['#fffdf9', '#fdf6ec', '#fbf1e4', '#f8ecdb', '#f5e7d2']
export const TAB_SHADES_DARK  = ['#2a221c', '#2e2620', '#322a23', '#362e26', '#3a3229']

// Not a hook despite reading the DOM — it holds no state, so it stays a plain
// function and can safely be called after an early return.
// Read at render time: the theme lives in App, so any theme change re-renders
// the whole tree anyway.
export function getTabShades() {
  const isDark = typeof document !== 'undefined'
    && document.documentElement.getAttribute('data-theme') === 'dark'
  return isDark ? TAB_SHADES_DARK : TAB_SHADES_LIGHT
}

// Background shade for the content panel below the bar, so it reads as the same
// sheet of paper as its divider.
export function tabBackground(shades, activeIndex) {
  return shades[(activeIndex < 0 ? 0 : activeIndex) % shades.length]
}

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
