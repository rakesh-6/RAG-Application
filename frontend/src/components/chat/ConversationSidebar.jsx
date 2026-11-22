import { Link, NavLink } from 'react-router-dom'
import { formatRelativeDate } from '../../utils/format'
import Icon from '../ui/Icon'

/** Desktop: a column on the left. Phone: a drawer that slides in over the chat. */
export default function ConversationSidebar({ conversations, loading, open, onClose, onDelete }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label="Conversations"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-4 border-r border-slate-200 bg-slate-50 p-4 transition-transform md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link
          to="/chat"
          onClick={onClose}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-indigo-200 bg-white text-[15px] font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          <Icon name="plus" className="size-[18px]" />
          New chat
        </Link>

        <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          <p className="mb-1 ml-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Recent</p>
          {loading && <p className="mx-2 text-sm text-slate-500">Loading…</p>}
          {!loading && conversations.length === 0 && (
            <p className="mx-2 text-sm leading-normal text-slate-500">Your conversations will appear here.</p>
          )}
          {conversations.map((conversation) => (
            <NavLink
              key={conversation.id}
              to={`/chat/${conversation.id}`}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center rounded-[10px] ${isActive ? 'bg-indigo-100' : 'hover:bg-slate-100'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5">
                    <span className={`truncate text-sm ${isActive ? 'font-semibold text-indigo-950' : 'font-medium text-slate-700'}`}>
                      {conversation.title}
                    </span>
                    <span className={`text-xs ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>
                      {formatRelativeDate(conversation.updated_at)}
                    </span>
                  </span>
                  {isActive && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault() // don't follow the NavLink
                        onDelete(conversation)
                      }}
                      aria-label={`Delete conversation: ${conversation.title}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-indigo-700 hover:bg-indigo-200"
                    >
                      <Icon name="trash" className="size-4" />
                    </button>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </aside>
    </>
  )
}
