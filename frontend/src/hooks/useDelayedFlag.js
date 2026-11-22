import { useEffect, useState } from 'react'

/** Becomes true once `active` has stayed true for `delayMs` (e.g. "this is taking a while"). */
export function useDelayedFlag(active, delayMs) {
  const [reached, setReached] = useState(false)

  useEffect(() => {
    if (!active) return undefined
    const timer = setTimeout(() => setReached(true), delayMs)
    return () => {
      clearTimeout(timer)
      setReached(false)
    }
  }, [active, delayMs])

  return active && reached
}
