import { fireEvent, screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as chatService from '../services/chatService'
import * as documentService from '../services/documentService'
import { renderPage } from '../test/renderPage'
import ChatPage from './ChatPage'

vi.mock('../services/chatService', () => ({
  askQuestion: vi.fn(),
  listConversations: vi.fn(),
  getMessages: vi.fn(),
  deleteConversation: vi.fn(),
}))
vi.mock('../services/documentService', () => ({ listDocuments: vi.fn() }))

const QUESTION = 'How many days of annual leave do employees get?'
const readyDoc = { id: 1, original_filename: 'Employee_Handbook.pdf', status: 'ready', chunk_count: 4 }
const userMessage = { id: 10, role: 'user', content: QUESTION, sources: [], found: null, standalone_question: null, created_at: '2026-11-22T10:00:00Z' }
const answer = {
  id: 11,
  role: 'assistant',
  content: 'Employees get 18 days of paid annual leave per year [1].',
  sources: [{ number: 1, document_id: 1, filename: 'Employee_Handbook.pdf', page: 1, snippet: 'Full-time employees receive 18 days of paid annual leave.' }],
  found: true,
  standalone_question: null,
  created_at: '2026-11-22T10:00:01Z',
}
const conversation = { id: 7, title: QUESTION, created_at: '2026-11-22T10:00:00Z', updated_at: '2026-11-22T10:00:01Z' }
const askResult = (assistantMessage) => ({
  conversation_id: 7,
  conversation_title: QUESTION,
  user_message: userMessage,
  assistant_message: assistantMessage,
})

function renderChat(at = '/chat') {
  renderPage(
    <>
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/chat/:conversationId" element={<ChatPage />} />
    </>,
    { at },
  )
}

async function ask(question) {
  const input = await screen.findByLabelText('Your question')
  fireEvent.change(input, { target: { value: question } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('ChatPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    documentService.listDocuments.mockResolvedValue([readyDoc])
    chatService.listConversations.mockResolvedValueOnce([]).mockResolvedValue([conversation])
    chatService.getMessages.mockResolvedValue([userMessage, answer])
  })

  it('points new users to the upload page when they have no documents', async () => {
    documentService.listDocuments.mockResolvedValue([])

    renderChat()

    expect(await screen.findByText('Upload a document to get started')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Upload documents' })).toHaveAttribute('href', '/documents')
    expect(screen.getByLabelText('Your question')).toBeDisabled()
  })

  it('asks a question and shows the answer with clickable citations and sources', async () => {
    chatService.askQuestion.mockResolvedValue(askResult(answer))
    renderChat()

    await ask(QUESTION)

    expect(await screen.findByText(/Employees get 18 days/)).toBeInTheDocument()
    expect(chatService.askQuestion).toHaveBeenCalledWith(QUESTION, null)
    expect(screen.getByRole('link', { name: 'Source 1' })).toHaveAttribute('href', '#source-11-1')
    expect(screen.getByText('Employee_Handbook.pdf')).toBeInTheDocument()
    expect(screen.getByText('· Page 1')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: new RegExp(QUESTION.replace('?', '\\?')) })).toHaveAttribute('href', '/chat/7')
  })

  it('shows the "not found" answer instead of a made-up one', async () => {
    chatService.askQuestion.mockResolvedValue(
      askResult({ ...answer, content: "I couldn't find this in your documents.", found: false, sources: [] }),
    )
    renderChat()

    await ask('What is the dress code?')

    expect(await screen.findByText("I couldn't find this in your documents.")).toBeInTheDocument()
    expect(screen.queryByText('Sources')).not.toBeInTheDocument()
  })

  it('shows the error and lets the user try the same question again', async () => {
    chatService.askQuestion
      .mockRejectedValueOnce({ response: { status: 429, data: { detail: 'The AI service is busy right now. Try again in a minute.' } } })
      .mockResolvedValueOnce(askResult(answer))
    renderChat()

    await ask(QUESTION)
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText(/Employees get 18 days/)).toBeInTheDocument()
    expect(chatService.askQuestion).toHaveBeenCalledTimes(2)
    expect(chatService.askQuestion).toHaveBeenLastCalledWith(QUESTION, null)
  })

  it('opens a saved conversation and shows how a follow-up was understood', async () => {
    const followUp = { ...answer, id: 13, standalone_question: 'Can new employees use annual leave during probation?' }
    chatService.listConversations.mockReset().mockResolvedValue([conversation])
    chatService.getMessages.mockResolvedValue([userMessage, answer, { ...userMessage, id: 12, content: 'Can I use it during probation?' }, followUp])

    renderChat('/chat/7')

    expect(await screen.findByText('Searched for: “Can new employees use annual leave during probation?”')).toBeInTheDocument()
    expect(chatService.getMessages).toHaveBeenCalledWith('7')
    expect(screen.getByRole('heading', { name: QUESTION })).toBeInTheDocument()
  })
})
