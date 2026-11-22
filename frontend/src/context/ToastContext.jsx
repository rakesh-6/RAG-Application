import { createContext, useCallback, useMemo, useRef, useState } from 'react'
import Icon from '../components/ui/Icon'

export const ToastContext = createContext(null)

const TOAST_DURATION_MS = 5000
const TONES = {
  success: { box: 'border-green-200 bg-green-50 text-green-900', icon: 'check', iconColor: 'text-green-700' },
  error: { box: 'border-red-200 bg-red-50 text-red-900', icon: 'alert', iconColor: 'text-red-700' },
  info: { box: 'border-slate-200 bg-white text-slate-800', icon: 'info', iconColor: 'text-slate-600' },
}

/** Small pop-up messages in the corner ("Copied", "Leave_Policy.docx is ready"). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setToasts((current) => current.filter((t) => t.id !== id)), [])

  const showToast = useCallback(
    (message, tone = 'success') => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => dismiss(id), TOAST_DURATION_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-end gap-2 md:bottom-6">
        {toasts.map((toast) => {
          const tone = TONES[toast.tone] ?? TONES.info
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${tone.box}`}
            >
              <Icon name={tone.icon} className={`size-5 shrink-0 ${tone.iconColor}`} />
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="-m-2 flex size-9 items-center justify-center rounded-lg hover:bg-black/5"
              >
                <Icon name="x" className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
