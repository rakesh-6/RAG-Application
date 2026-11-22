import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ChatEmptyState from '../components/chat/ChatEmptyState'
import ChatInput from '../components/chat/ChatInput'
import ConversationSidebar from '../components/chat/ConversationSidebar'
import { AssistantMessage, ThinkingIndicator, UserMessage } from '../components/chat/Messages'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Icon from '../components/ui/Icon'
import { useToast } from '../hooks/useToast'
import { askQuestion, deleteConversation, getMessages, listConversations } from '../services/chatService'
import { listDocuments } from '../services/documentService'
import { getErrorMessage } from '../services/errors'
import { pluralize } from '../utils/format'

export default function ChatPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [readyCount, setReadyCount] = useState(null) // null = still loading
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState(null)
  const [askError, setAskError] = useState(null) // { question, message }
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const justCreatedId = useRef(null) // skip reloading a conversation we just created
  const bottomRef = useRef(null)

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .catch((error) => showToast(getErrorMessage(error), 'error'))
      .finally(() => setConversationsLoading(false))
    listDocuments()
      .then((docs) => setReadyCount(docs.filter((d) => d.status === 'ready').length))
      .catch(() => setReadyCount(0))
  }, [showToast])

  useEffect(() => {
    setAskError(null)
    if (!conversationId) {
      setMessages([])
      return
    }
    if (justCreatedId.current === conversationId) {
      justCreatedId.current = null
      return
    }
    let cancelled = false
    setMessagesLoading(true)
    getMessages(conversationId)
      .then((data) => !cancelled && setMessages(data))
      .catch((error) => {
        if (cancelled) return
        showToast(getErrorMessage(error), 'error')
        navigate('/chat', { replace: true })
      })
      .finally(() => !cancelled && setMessagesLoading(false))
    return () => {
      cancelled = true // ignore a slow response if the user already opened another chat
    }
  }, [conversationId, navigate, showToast])

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, pendingQuestion, askError])

  async function send(question) {
    setAskError(null)
    setPendingQuestion(question)
    try {
      const result = await askQuestion(question, conversationId ? Number(conversationId) : null)
      setMessages((current) => [...current, result.user_message, result.assistant_message])
      const summary = {
        id: result.conversation_id,
        title: result.conversation_title,
        updated_at: result.assistant_message.created_at,
      }
      setConversations((current) => [summary, ...current.filter((c) => c.id !== summary.id)])
      if (!conversationId) {
        justCreatedId.current = String(result.conversation_id)
        navigate(`/chat/${result.conversation_id}`, { replace: true })
      }
    } catch (error) {
      setAskError({ question, message: getErrorMessage(error) })
    } finally {
      setPendingQuestion(null)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await deleteConversation(pendingDelete.id)
      setConversations((current) => current.filter((c) => c.id !== pendingDelete.id))
      if (String(pendingDelete.id) === conversationId) navigate('/chat', { replace: true })
      setPendingDelete(null)
      showToast('Conversation deleted')
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const activeTitle = conversations.find((c) => String(c.id) === conversationId)?.title ?? 'New chat'
  const noDocuments = readyCount === 0
  const isEmpty = messages.length === 0 && !pendingQuestion && !askError && !messagesLoading

  return (
    <div className="flex h-full">
      <ConversationSidebar
        conversations={conversations}
        loading={conversationsLoading}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onDelete={setPendingDelete}
      />

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Chat">
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-2 py-2 md:px-8 md:py-3.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open conversations"
            className="flex size-11 items-center justify-center rounded-[10px] text-slate-700 hover:bg-slate-100 md:hidden"
          >
            <Icon name="menu" className="size-[22px]" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-display text-lg font-semibold md:text-xl">{activeTitle}</h1>
          {readyCount !== null && (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] text-slate-600 sm:inline-flex">
              <Icon name="file" className="size-3.5" />
              Searching {pluralize(readyCount, 'ready document')}
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex min-h-full items-center justify-center px-6 py-12">
              {readyCount !== null && <ChatEmptyState readyCount={readyCount} onAsk={send} />}
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[860px] flex-col gap-7 px-4 py-7 md:px-8">
              {messagesLoading && (
                <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon name="spinner" className="size-4" /> Loading conversation…
                </p>
              )}
              {messages.map((message) =>
                message.role === 'user' ? (
                  <UserMessage key={message.id} content={message.content} />
                ) : (
                  <AssistantMessage key={message.id} message={message} documentCount={readyCount} />
                ),
              )}
              {pendingQuestion && (
                <>
                  <UserMessage content={pendingQuestion} />
                  <ThinkingIndicator />
                </>
              )}
              {askError && (
                <>
                  <UserMessage content={askError.question} />
                  <Alert
                    tone={askError.message.includes('busy') ? 'warning' : 'error'}
                    action={
                      <Button variant="secondary" onClick={() => send(askError.question)} className="h-9 shrink-0 px-3 text-sm">
                        Try again
                      </Button>
                    }
                  >
                    {askError.message}
                  </Alert>
                </>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <ChatInput
          onSend={send}
          busy={pendingQuestion !== null}
          disabled={noDocuments}
          placeholder={noDocuments ? 'Upload a document first to ask questions' : 'Ask a question about your documents…'}
        />
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this conversation?"
        confirmLabel="Delete conversation"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        “{pendingDelete?.title}” and all its messages will be deleted. Your documents are not affected.
      </ConfirmDialog>
    </div>
  )
}
