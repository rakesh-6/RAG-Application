import Icon from '../ui/Icon'

export default function UploadProgressList({ uploads }) {
  if (uploads.length === 0) return null
  return (
    <section aria-label="Uploads in progress" className="flex flex-col gap-4 rounded-[14px] border border-slate-200 bg-white px-5 py-4">
      {uploads.map((upload) => {
        const processing = upload.progress >= 100
        return (
          <div key={upload.key} className="flex flex-col gap-2.5">
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate font-medium">{upload.name}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-slate-600">
                {processing ? (
                  <>
                    <Icon name="spinner" className="size-3.5" strokeWidth={2.5} />
                    Processing: reading text and creating embeddings…
                  </>
                ) : (
                  `Uploading · ${upload.progress}%`
                )}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Upload progress for ${upload.name}`}
              aria-valuenow={upload.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className={`h-full rounded-full transition-[width] ${processing ? 'bg-amber-500 motion-safe:animate-pulse' : 'bg-indigo-600'}`}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}
