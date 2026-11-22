export default function SourceCard({ source, messageId }) {
  return (
    <div
      id={`source-${messageId}-${source.number}`}
      className="flex scroll-mt-4 flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 target:border-indigo-400 target:bg-indigo-50"
    >
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="font-semibold text-indigo-700">{source.number}</span>
        <span className="truncate font-semibold" title={source.filename}>
          {source.filename}
        </span>
        <span className="shrink-0 text-slate-600">· {source.page != null ? `Page ${source.page}` : 'No page numbers'}</span>
      </div>
      <p className="text-[13px] leading-relaxed text-slate-600">“{source.snippet}”</p>
    </div>
  )
}
