import { useEffect, useRef } from 'react'

let layerSequence = 0

/**
 * Give state-driven screens and sheets a real browser-history layer.
 * Android back gestures then remove only the top layer. Closing a layer with
 * its visible close button also consumes the matching history entry.
 */
export function useBackLayer(active, onBack, name = 'layer') {
  const tokenRef = useRef(null)
  const onBackRef = useRef(onBack)
  useEffect(() => { onBackRef.current = onBack }, [onBack])

  useEffect(() => {
    if (!active) return undefined

    const token = tokenRef.current || `mr-${name}-${++layerSequence}`
    tokenRef.current = token
    const currentLayers = history.state?.mrLayers || []
    if (!currentLayers.includes(token)) {
      history.pushState({ ...history.state, mrLayers: [...currentLayers, token] }, '')
    }

    const handlePopState = event => {
      const remainingLayers = event.state?.mrLayers || []
      if (!remainingLayers.includes(token)) onBackRef.current()
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      const liveLayers = history.state?.mrLayers || []
      if (liveLayers.includes(token)) history.back()
    }
  }, [active, name])
}
