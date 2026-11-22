import { useRef, useState } from 'react'
import Icon from '../ui/Icon'

const MAX_HEIGHT_PX = 200

/** Enter sends, Shift+Enter adds a new line. The box grows with the text. */
export default function ChatInput({ onSend, disabled = false, busy = false, placeholder }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)
  const canSend = !disabled && !busy && value.trim().length > 0

  function resize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }

  function submit(event) {
    event?.preventDefault()
    if (!canSend) return
    onSend(value.trim())
    setValue('')
    requestAnimationFrame(resize)
  }

  return (
    <form onSubmit={submit} className="shrink-0 border-t border-slate-200 bg-white px-4 pt-4 pb-5 md:px-8">
      <div className="mx-auto flex max-w-[860px] flex-col gap-2">
        <label htmlFor="chat-question" className="sr-only">
          Your question
        </label>
        <div
          className={`flex items-end gap-2.5 rounded-[14px] border py-2 pr-2 pl-4 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-indigo-600 ${
            disabled ? 'border-slate-200 bg-slate-50' : 'border-slate-300 bg-white'
          }`}
        >
          <textarea
            id="chat-question"
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            maxLength={2000}
            placeholder={placeholder}
            onChange={(event) => {
              setValue(event.target.value)
              resize()
            }}
            onKeyDown={(event) => {
              // isComposing: don't send while typing with an input method (e.g. Hindi, Japanese).
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event)
            }}
            className="min-h-7 flex-1 resize-none bg-transparent py-2 text-base leading-normal text-slate-900 outline-none placeholder:text-slate-500 disabled:text-slate-500 md:text-[15px]"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send question"
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Icon name="send" className="size-[18px]" />
          </button>
        </div>
        <p className="hidden text-center text-xs text-slate-500 sm:block">
          Answers come only from your uploaded documents. Enter to send, Shift + Enter for a new line.
        </p>
      </div>
    </form>
  )
}
