import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as documentService from '../services/documentService'
import { renderPage } from '../test/renderPage'
import DocumentsPage from './DocumentsPage'

vi.mock('../services/documentService', () => ({
  listDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}))

const handbook = {
  id: 1,
  original_filename: 'Employee_Handbook.pdf',
  file_type: 'pdf',
  size_bytes: 6188,
  page_count: 3,
  chunk_count: 4,
  status: 'ready',
  error_message: null,
  created_at: '2026-11-22T10:00:00Z',
}
const blankScan = {
  ...handbook,
  id: 2,
  original_filename: 'Blank_Scan.pdf',
  chunk_count: 0,
  status: 'failed',
  error_message: "No readable text found. Scanned PDFs aren't supported yet.",
}

function renderDocuments() {
  renderPage(<Route path="/documents" element={<DocumentsPage />} />, { at: '/documents' })
}

async function chooseFiles(...files) {
  const input = await screen.findByLabelText('browse your computer')
  fireEvent.change(input, { target: { files } })
}

describe('DocumentsPage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('lists documents with their status and the reason a document failed', async () => {
    documentService.listDocuments.mockResolvedValue([handbook, blankScan])

    renderDocuments()

    expect(await screen.findByRole('cell', { name: 'Employee_Handbook.pdf' })).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText("No readable text found. Scanned PDFs aren't supported yet.")).toBeInTheDocument()
    expect(screen.getByText('2 documents · 4 chunks ready to search')).toBeInTheDocument()
  })

  it('rejects unsupported files in the browser without uploading them', async () => {
    documentService.listDocuments.mockResolvedValue([])
    renderDocuments()

    await chooseFiles(new File(['slides'], 'Slides.pptx'))

    expect(await screen.findByText("Slides.pptx can't be uploaded. Use PDF, DOCX or TXT.")).toBeInTheDocument()
    expect(documentService.uploadDocument).not.toHaveBeenCalled()
  })

  it('uploads a file, adds it to the table and confirms it is ready', async () => {
    documentService.listDocuments.mockResolvedValue([])
    documentService.uploadDocument.mockImplementation(async (file, onProgress) => {
      onProgress(100)
      return { ...handbook, id: 3, original_filename: file.name, file_type: 'txt', chunk_count: 2 }
    })
    renderDocuments()

    await chooseFiles(new File(['Annual leave is 18 days.'], 'Leave.txt', { type: 'text/plain' }))

    expect(await screen.findByText('Leave.txt is ready to search · 2 chunks')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Leave.txt' })).toBeInTheDocument()
  })

  it("shows the server's message when an upload is rejected", async () => {
    documentService.listDocuments.mockResolvedValue([])
    documentService.uploadDocument.mockRejectedValue({
      response: { status: 409, data: { detail: 'Leave.txt is already in your library.' } },
    })
    renderDocuments()

    await chooseFiles(new File(['Annual leave is 18 days.'], 'Leave.txt'))

    expect(await screen.findByText('Leave.txt is already in your library.')).toBeInTheDocument()
  })

  it('asks for confirmation, then deletes the document', async () => {
    documentService.listDocuments.mockResolvedValue([handbook])
    documentService.deleteDocument.mockResolvedValue()
    renderDocuments()

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Employee_Handbook.pdf' }))
    expect(screen.getByText('Delete Employee_Handbook.pdf?')).toBeInTheDocument()
    expect(documentService.deleteDocument).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete document' }))

    await waitFor(() => expect(documentService.deleteDocument).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Employee_Handbook.pdf was deleted')).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'Employee_Handbook.pdf' })).not.toBeInTheDocument()
  })

  it('offers a retry when the list fails to load', async () => {
    documentService.listDocuments.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce([handbook])
    renderDocuments()

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('cell', { name: 'Employee_Handbook.pdf' })).toBeInTheDocument()
  })
})
