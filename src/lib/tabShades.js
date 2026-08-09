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
