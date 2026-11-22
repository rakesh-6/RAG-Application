import Icon from '../ui/Icon'

// Each status has an icon AND a word, so it never depends on color alone.
const STATUSES = {
  uploaded: { label: 'Queued', icon: 'clock', style: 'bg-slate-100 text-slate-600' },
  processing: { label: 'Processing', icon: 'spinner', style: 'bg-amber-50 text-amber-700' },
  ready: { label: 'Ready', icon: 'check', style: 'bg-green-50 text-green-700' },
  failed: { label: 'Failed', icon: 'x', style: 'bg-red-50 text-red-700' },
}

export default function StatusBadge({ status }) {
  const { label, icon, style } = STATUSES[status] ?? STATUSES.uploaded
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${style}`}>
      <Icon name={icon} className="size-3.5" strokeWidth={2.5} />
      {label}
    </span>
  )
}
