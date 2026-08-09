import { useState, useEffect, useRef, useCallback } from 'react'

// Several timers at once — rice, oven and sauce — since one recipe step almost
// never maps to one thing you're waiting on.
//
// Each running timer stores the wall-clock time it ends at rather than a
// counter that gets decremented. Mobile browsers throttle background intervals
// aggressively, so a decrementing counter drifts badly the moment you switch
// apps; an end timestamp is correct whenever you look at it again.

export function remainingOf(timer) {
  if (!timer) return 0
  if (!timer.running) return timer.paused ?? 0
  return Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000))
}

export function useTimers(onFinish) {
  const [timers, setTimers] = useState({})
  const [, tick] = useState(0)
  const firedRef = useRef(new Set())
  const finishRef = useRef(onFinish)
  useEffect(() => { finishRef.current = onFinish }, [onFinish])

  const anyRunning = Object.values(timers).some(t => t.running)

  // One interval for every timer, and only while something is actually running.
  useEffect(() => {
    if (!anyRunning) return
    const iv = setInterval(() => tick(n => n + 1), 500)
    return () => clearInterval(iv)
  }, [anyRunning])

  // Which running timers have hit zero. Recomputed on each tick, and used as the
  // effect's dependency so the alarm doesn't run on every unrelated render.
  const dueIds = Object.values(timers)
    .filter(timer => timer.running && remainingOf(timer) === 0)
    .map(timer => timer.id)
    .join(',')

  // Ring once per timer, the first time it reaches zero. The alarm fires outside
  // the state updater — React may call an updater twice under StrictMode, which
  // would double-ring.
  useEffect(() => {
    if (!dueIds) return
    const fresh = dueIds.split(',').filter(id => !firedRef.current.has(id))
    if (fresh.length === 0) return
    fresh.forEach(id => firedRef.current.add(id))

    finishRef.current?.()

    setTimers(prev => {
      const next = { ...prev }
      for (const id of fresh) {
        if (next[id]) next[id] = { ...next[id], running: false, paused: 0, rang: true }
      }
      return next
    })
  }, [dueIds])

  const start = useCallback((id, label, seconds) => {
    if (!seconds || seconds <= 0) return
    firedRef.current.delete(id)
    setTimers(prev => ({
      ...prev,
      [id]: { id, label, total: seconds, endsAt: Date.now() + seconds * 1000, running: true, paused: null, rang: false },
    }))
  }, [])

  const toggle = useCallback((id) => {
    setTimers(prev => {
      const timer = prev[id]
      if (!timer) return prev
      if (timer.running) {
        return { ...prev, [id]: { ...timer, running: false, paused: remainingOf(timer) } }
      }
      // Restarting one that already rang begins from its full duration again.
      const resume = timer.paused && timer.paused > 0 ? timer.paused : timer.total
      firedRef.current.delete(id)
      return { ...prev, [id]: { ...timer, running: true, endsAt: Date.now() + resume * 1000, paused: null, rang: false } }
    })
  }, [])

  const addTime = useCallback((id, seconds) => {
    setTimers(prev => {
      const timer = prev[id]
      if (!timer) return prev
      firedRef.current.delete(id)
      if (timer.running) {
        return { ...prev, [id]: { ...timer, endsAt: timer.endsAt + seconds * 1000, rang: false } }
      }
      return { ...prev, [id]: { ...timer, paused: Math.max(0, (timer.paused ?? 0) + seconds), rang: false } }
    })
  }, [])

  const dismiss = useCallback((id) => {
    firedRef.current.delete(id)
    setTimers(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  return { timers, start, toggle, addTime, dismiss }
}

// A short double beep plus a vibration. No audio file to ship, and it works
// from a user gesture chain because the timer was started by a tap.
export function ringAlarm() {
  try {
    navigator.vibrate?.([300, 150, 300])
  } catch { /* unsupported */ }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    for (const offset of [0, 0.45]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.4)
    }
    setTimeout(() => ctx.close().catch(() => {}), 1200)
  } catch { /* audio blocked — the vibration and the visual state still fire */ }
}
