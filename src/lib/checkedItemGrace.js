// Separate timers mean checking another item never restarts the first item's grace period.
export function createCheckedItemGrace(onChange, { setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const timers = new Map()
  const emit = () => onChange(new Set(timers.keys()))
  const cancel = ids => {
    for (const id of ids) {
      if (timers.has(id)) clearTimer(timers.get(id))
      timers.delete(id)
    }
    emit()
  }
  return {
    begin(ids) {
      for (const id of ids) {
        if (timers.has(id)) clearTimer(timers.get(id))
        timers.set(id, setTimer(() => { timers.delete(id); emit() }, 3000))
      }
      emit()
    },
    cancel,
    dispose() {
      for (const timer of timers.values()) clearTimer(timer)
      timers.clear()
    },
  }
}
