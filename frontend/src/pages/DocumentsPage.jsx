import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DocumentTable from '../components/documents/DocumentTable'
import UploadDropzone from '../components/documents/UploadDropzone'
import UploadProgressList from '../components/documents/UploadProgressList'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Icon from '../components/ui/Icon'
import { useToast } from '../hooks/useToast'
import { deleteDocument, listDocuments, uploadDocument } from '../services/documentService'
import { getErrorMessage } from '../services/errors'
import { validateFile } from '../utils/fileValidation'
import { pluralize } from '../utils/format'

export default function DocumentsPage() {
  const { showToast } = useToast()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [uploads, setUploads] = useState([]) // files currently uploading/processing
  const [notices, setNotices] = useState([]) // dismissible error banners
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const nextKey = useRef(1)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setDocuments(await listDocuments())
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  function addNotice(title, message) {
    setNotices((current) => [...current, { key: nextKey.current++, title, message }])
  }

  async function uploadOne(file) {
    const key = nextKey.current++
    const setProgress = (progress) =>
      setUploads((current) => current.map((u) => (u.key === key ? { ...u, progress } : u)))
    setUploads((current) => [...current, { key, name: file.name, progress: 0 }])

    try {
      const doc = await uploadDocument(file, setProgress)
      setDocuments((current) => [doc, ...current])
      if (doc.status === 'ready') {
        showToast(`${doc.original_filename} is ready to search · ${pluralize(doc.chunk_count, 'chunk')}`)
      } else {
        addNotice(`${doc.original_filename} couldn't be processed`, doc.error_message)
      }
    } catch (error) {
      addNotice(null, getErrorMessage(error))
    } finally {
      setUploads((current) => current.filter((u) => u.key !== key))
    }
  }

  async function handleFiles(files) {
    const valid = []
    for (const file of files) {
      const problem = validateFile(file)
      if (problem) addNotice(null, problem)
      else valid.push(file)
    }
    // One at a time: kinder to the free-tier Gemini rate limit than parallel uploads.
    for (const file of valid) {
      await uploadOne(file)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await deleteDocument(pendingDelete.id)
      setDocuments((current) => current.filter((d) => d.id !== pendingDelete.id))
      showToast(`${pendingDelete.original_filename} was deleted`)
      setPendingDelete(null)
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const readyDocuments = documents.filter((d) => d.status === 'ready')
  const readyChunks = readyDocuments.reduce((sum, d) => sum + d.chunk_count, 0)

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[28px] font-semibold">Documents</h1>
            <p className="text-[15px] text-slate-500">
              {loading ? 'Loading…' : `${pluralize(documents.length, 'document')} · ${pluralize(readyChunks, 'chunk')} ready to search`}
            </p>
          </div>
          {readyDocuments.length > 0 && (
            <Link
              to="/chat"
              className="flex h-11 items-center gap-2 rounded-[10px] bg-indigo-600 px-[18px] text-[15px] font-semibold text-white hover:bg-indigo-700"
            >
              <Icon name="chat" className="size-[18px]" />
              Ask a question
            </Link>
          )}
        </div>

        <UploadDropzone onFiles={handleFiles} />

        {notices.map((notice) => (
          <Alert
            key={notice.key}
            tone="error"
            title={notice.title}
            onDismiss={() => setNotices((current) => current.filter((n) => n.key !== notice.key))}
          >
            {notice.message}
          </Alert>
        ))}

        <UploadProgressList uploads={uploads} />

        {loadError ? (
          <Alert
            tone="error"
            title="Couldn't load your documents"
            action={
              <Button variant="secondary" onClick={loadDocuments} className="h-9 px-3 text-sm">
                Try again
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : (
          <DocumentTable documents={documents} loading={loading} onDelete={setPendingDelete} />
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.original_filename}?`}
        confirmLabel="Delete document"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        This removes the file
        {pendingDelete?.chunk_count ? ` and its ${pluralize(pendingDelete.chunk_count, 'indexed chunk')}` : ''}, so future
        answers can&apos;t use it. Past chats keep their old answers.
      </ConfirmDialog>
    </div>
  )
}
