import { useId, useState } from 'react'
import { MAX_UPLOAD_MB } from '../../utils/fileValidation'
import Icon from '../ui/Icon'

/** Drag-and-drop area with a real (visually hidden) file input, so it also works with the keyboard. */
export default function UploadDropzone({ onFiles }) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length > 0) onFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <section
      aria-label="Upload documents"
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-indigo-600 ${
        dragging ? 'border-indigo-600 bg-indigo-50' : 'border-indigo-300 bg-white'
      }`}
    >
      <span className="flex size-[52px] items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-600">
        <Icon name="upload" className="size-[26px]" />
      </span>
      <p className="text-base font-medium">
        Drag and drop files here, or{' '}
        <label htmlFor={inputId} className="cursor-pointer text-indigo-700 underline hover:text-indigo-800">
          browse your computer
        </label>
      </p>
      <input
        id={inputId}
        type="file"
        multiple
        accept=".pdf,.docx,.txt"
        className="sr-only"
        onChange={(event) => {
          if (event.target.files.length > 0) onFiles(Array.from(event.target.files))
          event.target.value = '' // allow choosing the same file again later
        }}
      />
      <p className="text-sm text-slate-500">PDF, DOCX or TXT · up to {MAX_UPLOAD_MB} MB each · scanned PDFs are not supported</p>
    </section>
  )
}
