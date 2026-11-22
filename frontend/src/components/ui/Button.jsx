import Icon from './Icon'

const BASE =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-[18px] text-[15px] transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed'

const VARIANTS = {
  primary: 'bg-indigo-600 font-semibold text-white hover:bg-indigo-700',
  secondary: 'border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50',
  danger: 'bg-red-600 font-semibold text-white hover:bg-red-700',
  ghost: 'font-medium text-slate-600 hover:bg-slate-100',
}

/**
 * `loading` disables the button and shows a spinner, so a double click
 * can't send the same request twice.
 */
export default function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...props }) {
  const isDisabled = disabled || loading
  let look = VARIANTS[variant]
  if (loading && variant === 'primary') look = 'bg-indigo-500 font-semibold text-white'
  else if (isDisabled) look = 'bg-slate-200 font-semibold text-slate-500'

  return (
    <button type="button" disabled={isDisabled} className={`${BASE} ${look} ${className}`} {...props}>
      {loading && <Icon name="spinner" className="size-4" strokeWidth={2.5} />}
      {children}
    </button>
  )
}
