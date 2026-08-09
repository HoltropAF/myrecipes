import { useState, useEffect } from 'react'

// 360px is the app's design floor — older/small Android phones. Below it, the
// bottom nav and the binder tab bars switch to a tighter layout so five tabs
// never wrap or overflow.
//
// This check was copy-pasted verbatim in BottomNav, RecipeDetail and
// SettingsView; adding a fourth compact-aware component meant a fourth copy.
export const COMPACT_BREAKPOINT = 360

export function useCompact(breakpoint = COMPACT_BREAKPOINT) {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  )

  useEffect(() => {
    const check = () => setCompact(window.innerWidth <= breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return compact
}
