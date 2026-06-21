import { useState, useRef } from 'react'

/**
 * Wraps a row in swipe-to-delete behavior. Swipe left to reveal a delete action,
 * tap the revealed button or swipe far enough to trigger onDelete.
 */
export default function SwipeToDelete({ children, onDelete, deleteLabel = 'Delete' }) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startDragX = useRef(0)
  const THRESHOLD = -70
  const MAX_DRAG = -90

  const handleStart = (clientX) => {
    startX.current = clientX
    startDragX.current = dragX
    setDragging(true)
  }
  const handleMove = (clientX) => {
    const delta = clientX - startX.current
    let next = startDragX.current + delta
    if (next > 0) next = 0
    if (next < MAX_DRAG) next = MAX_DRAG
    setDragX(next)
  }
  const handleEnd = () => {
    setDragging(false)
    if (dragX < THRESHOLD) {
      onDelete()
    } else {
      setDragX(0)
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        background: 'var(--tomato)', paddingRight: 18,
      }}>
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', color: '#fffdf9', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >{deleteLabel}</button>
      </div>
      <div
        onTouchStart={e => handleStart(e.touches[0].clientX)}
        onTouchMove={e => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={e => handleStart(e.clientX)}
        onMouseMove={e => dragging && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={() => dragging && handleEnd()}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          background: 'var(--card)', position: 'relative', touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
