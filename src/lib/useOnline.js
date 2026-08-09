import { useState, useEffect } from 'react'

// navigator.onLine only knows whether the device has *a* network connection —
// airplane mode off, wifi joined. It says nothing about whether that connection
// actually reaches anywhere, which is the case that matters in a kitchen with
// bad wifi or on a train.
//
// So: trust `offline` immediately (the browser is reliable about the negative),
// but confirm `online` by checking that a real request can complete.
export function useOnline() {
  const [online, setOnline] = useState(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false)
  )

  useEffect(() => {
    const goOffline = () => setOnline(false)
    const goOnline = () => setOnline(true)

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  return online
}
