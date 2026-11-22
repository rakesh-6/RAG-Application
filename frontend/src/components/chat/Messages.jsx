import { Link } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import Icon from '../ui/Icon'
import AnswerText from './AnswerText'
import SourceCard from './SourceCard'

function AssistantAvatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-indigo-50 text-indigo-600">
      <Icon name="logo" className="size-[18px]" />
    </span>
  )
}

export function UserMessage({ content }) {
  return (
    <div className="max-w-[80%] self-end rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-3 text-[15px] leading-normal whitespace-pre-wrap text-white">
      {content}
    </div>
  )
}

function NotFoundAnswer({ documentCount }) {
  return (
    <div className="flex flex-1 gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <Icon name="notFound" className="mt-0.5 size-5 shrink-0 text-amber-700" />
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold text-amber-900">I couldn&apos;t find this in your documents.</p>
        <p className="text-sm leading-relaxed text-amber-800">
          {documentCount ? `None of your ${documentCount} ready documents cover this, so I won't guess. ` : "I won't guess. "}
          Try rephrasing, or{' '}
          <Link to="/documents" className="font-semibold text-amber-900 underline">
            upload a document
          </Link>{' '}
          that covers it.
        </p>
      </div>
    </div>
  )
}

export function AssistantMessage({ message, documentCount }) {
  const { showToast } = useToast()

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(message.content)
      showToast('Answer copied')
    } catch {
      showToast("Couldn't copy. Select the text and copy it manually.", 'error')
    }
  }

  return (
    <article aria-label="Assistant answer" className="flex gap-3">
      <AssistantAvatar />
      {message.found === false ? (
        <NotFoundAnswer documentCount={documentCount} />
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          {message.standalone_question && (
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
              <Icon name="search" className="size-3.5 shrink-0" />
              Searched for: “{message.standalone_question}”
            </p>
          )}
          <AnswerText text={message.content} messageId={message.id} sourceNumbers={message.sources.map((s) => s.number)} />
          {message.sources.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-slate-600">Sources</p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-2.5">
                {message.sources.map((source) => (
                  <SourceCard key={source.number} source={source} messageId={message.id} />
                ))}
              </div>
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={copyAnswer}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-600 hover:bg-slate-50"
            >
              <Icon name="copy" className="size-3.5" />
              Copy
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

export function ThinkingIndicator() {
  return (
    <div role="status" className="flex items-center gap-3 pl-11 text-sm text-slate-600">
      <span className="flex gap-1" aria-hidden="true">
        <span className="size-[7px] rounded-full bg-indigo-400 motion-safe:animate-bounce" />
        <span className="size-[7px] rounded-full bg-indigo-500 motion-safe:animate-bounce [animation-delay:150ms]" />
        <span className="size-[7px] rounded-full bg-indigo-600 motion-safe:animate-bounce [animation-delay:300ms]" />
      </span>
      Searching your documents…
    </div>
  )
}
