import { useId, useState } from 'react'
import Icon from './Icon'

/** Label + input + error message, wired together for screen readers. */
export default function TextField({ label, error, type = 'text', revealable = false, describedBy, ...inputProps }) {
  const id = useId()
  const errorId = `${id}-error`
  const [revealed, setRevealed] = useState(false)
  const inputType = revealable && revealed ? 'text' : type
  const describedByIds = [error ? errorId : null, describedBy].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative flex">
        <input
          id={id}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds}
          className={`h-11 w-full rounded-[10px] border bg-white px-3.5 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-indigo-600 focus:outline-2 focus:outline-offset-1 focus:outline-indigo-600 ${
            error ? 'border-red-600' : 'border-slate-300'
          } ${revealable ? 'pr-16' : ''}`}
          {...inputProps}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute top-1 right-1 h-9 rounded-lg px-3 text-[13px] font-medium text-indigo-700 hover:bg-indigo-50"
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-[13px] text-red-700">
          <Icon name="alert" className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
