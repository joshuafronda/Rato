import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown'] as const

// Calls onIdle after `ms` with no tap or key press, while active. A guest who walks away
// mid-flow leaves the booth ready for the next one.
export function useIdleReset(active: boolean, onIdle: () => void, ms: number): void {
  const onIdleRef = useRef(onIdle)
  useEffect(() => {
    onIdleRef.current = onIdle
  }, [onIdle])

  useEffect(() => {
    if (!active) return
    let timer = window.setTimeout(() => onIdleRef.current(), ms)
    const restart = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => onIdleRef.current(), ms)
    }
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, restart)
    return () => {
      window.clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, restart)
    }
  }, [active, ms])
}
