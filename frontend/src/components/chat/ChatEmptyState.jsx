import { Link } from 'react-router-dom'
import { pluralize } from '../../utils/format'
import Icon from '../ui/Icon'

const SUGGESTIONS = [
  'Summarize the main points of my documents',
  'What deadlines or dates are mentioned?',
  'What are the most important rules or requirements?',
  'Explain the key terms in simple words',
]

/** Shown when a chat has no messages yet. With no ready documents, it points to the upload page. */
export default function ChatEmptyState({ readyCount, onAsk }) {
  if (readyCount === 0) {
    return (
      <div className="flex max-w-[560px] flex-col items-center gap-5 text-center">
        <span className="flex size-16 items-center justify-center rounded-[18px] bg-indigo-50 text-indigo-600">
          <Icon name="upload" className="size-[30px]" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold">Upload a document to get started</h1>
          <p className="text-base leading-relaxed text-slate-600">
            I answer only from documents you upload, so there&apos;s nothing to search yet. Add a PDF, Word file or text
            file, and I&apos;ll read it in a few seconds.
          </p>
        </div>
        <Link
          to="/documents"
          className="flex h-12 items-center gap-2 rounded-xl bg-indigo-600 px-[22px] text-base font-semibold text-white hover:bg-indigo-700"
        >
          <Icon name="upload" className="size-[18px]" />
          Upload documents
        </Link>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-[18px] bg-indigo-50 text-indigo-600">
        <Icon name="chat" className="size-[30px]" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-semibold">Ask anything about your documents</h1>
        <p className="text-base text-slate-600">
          I&apos;ll search your {pluralize(readyCount, 'ready document')} and show where each answer comes from.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onAsk(suggestion)}
            className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-left text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
