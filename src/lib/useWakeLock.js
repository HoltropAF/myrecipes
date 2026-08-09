import { useEffect, useRef } from 'react'

// Keeps the screen on while Cooking Mode is open. Needs no permission prompt —
// the browser grants it to a visible page and drops it automatically when the
// tab is hidden, which is why we re-acquire on visibilitychange.
//
// Unsupported on some browsers (notably older iOS Safari); it fails silently
// there rather than breaking the screen it's attached to.
export function useWakeLock(active) {
  const lockRef = useRef(null)

  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        lockRef.current = lock
        // The browser drops the lock on its own when the page is hidden; clear
        // our handle so the visibility handler knows to ask again.
        lock.addEventListener('release', () => { lockRef.current = null })
      } catch { /* denied or unsupported — cooking still works, screen may dim */ }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !lockRef.current) acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      lockRef.current?.release?.().catch(() => {})
      lockRef.current = null
    }
  }, [active])
}
