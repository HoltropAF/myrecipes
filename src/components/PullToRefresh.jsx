import { useState, useRef } from 'react'

/**
 * Wraps scrollable content with a pull-to-refresh gesture. Only triggers when
 * the wrapped content is scrolled to the very top, so it doesn't fight normal scrolling.
 */
export default function PullToRefresh({ onRefresh, children, style }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const containerRef = useRef(null)
  const THRESHOLD = 70

  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY
    } else {
      startY.current = null
    }
  }

  const handleTouchMove = (e) => {
    if (startY.current === null || refreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 100))
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > THRESHOLD && !refreshing) {
      setRefreshing(true)
      setPullDistance(50)
      await onRefresh()
      setRefreshing(false)
    }
    setPullDistance(0)
    startY.current = null
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', ...style }}
    >
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: pullDistance, overflow: 'hidden', transition: refreshing ? 'none' : 'height 0.2s ease',
      }}>
        <div style={{
          fontSize: 20,
          animation: refreshing ? 'gyoza-spin 1s linear infinite' : 'none',
          transform: refreshing ? 'none' : `rotate(${pullDistance * 3}deg)`,
          opacity: Math.min(pullDistance / THRESHOLD, 1),
        }}>🥟</div>
        <style>{`@keyframes gyoza-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
      {children}
    </div>
  )
}
