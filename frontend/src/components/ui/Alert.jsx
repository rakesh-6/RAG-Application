import Icon from './Icon'

const TONES = {
  error: { box: 'border-red-200 bg-red-50', title: 'text-red-800', text: 'text-red-900', icon: 'alert', iconColor: 'text-red-700' },
  warning: { box: 'border-amber-200 bg-amber-50', title: 'text-amber-900', text: 'text-amber-900', icon: 'clock', iconColor: 'text-amber-700' },
  success: { box: 'border-green-200 bg-green-50', title: 'text-green-900', text: 'text-green-900', icon: 'check', iconColor: 'text-green-700' },
  info: { box: 'border-slate-200 bg-slate-100', title: 'text-slate-900', text: 'text-slate-700', icon: 'info', iconColor: 'text-slate-600' },
}

/** An in-page banner. Errors and warnings use role="alert" so screen readers announce them. */
export default function Alert({ tone = 'error', title, children, onDismiss, action, icon }) {
  const style = TONES[tone]
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${style.box}`}
    >
      <Icon name={icon ?? style.icon} className={`mt-0.5 size-5 shrink-0 ${style.iconColor}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && <p className={`text-sm font-semibold ${style.title}`}>{title}</p>}
        {children && <div className={`text-sm leading-relaxed ${style.text}`}>{children}</div>}
      </div>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 ${style.title}`}
        >
          <Icon name="x" className="size-4" />
        </button>
      )}
    </div>
  )
}
