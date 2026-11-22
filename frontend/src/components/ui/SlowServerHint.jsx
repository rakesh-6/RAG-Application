import { useDelayedFlag } from '../../hooks/useDelayedFlag'

const DELAY_MS = 5000

/**
 * The free hosting plan puts the backend to sleep when nobody uses it, and the first
 * request then takes up to a minute. After 5 seconds of waiting we explain why.
 */
export default function SlowServerHint({ active }) {
  const show = useDelayedFlag(active, DELAY_MS)
  if (!show) return null
  return (
    <p role="status" className="text-center text-sm leading-relaxed text-slate-600">
      The server is waking up after being idle (free hosting). This can take up to a minute.
    </p>
  )
}
