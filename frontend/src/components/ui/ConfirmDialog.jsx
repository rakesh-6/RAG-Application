import { useEffect, useRef } from 'react'
import Button from './Button'

/**
 * Uses the browser's built-in <dialog>: showModal() traps keyboard focus inside,
 * Esc closes it, and focus returns to the button that opened it.
 */
export default function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, loading = false }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    // Fallback to the plain `open` attribute where showModal() doesn't exist (e.g. the test environment).
    if (open && !dialog.open) {
      if (dialog.showModal) dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    if (!open && dialog.open) {
      if (dialog.close) dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault() // let React state decide when it closes
        if (!loading) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[440px] rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      {open && (
        <div className="flex flex-col gap-3">
          <h2 id="confirm-dialog-title" className="font-display text-lg font-semibold">
            {title}
          </h2>
          <div className="text-sm leading-relaxed text-slate-600">{children}</div>
          <div className="mt-1 flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onCancel} disabled={loading} autoFocus>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
