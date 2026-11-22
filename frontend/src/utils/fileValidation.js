// Same rules as the backend (document_service.py). Checking in the browser first
// gives instant feedback and avoids uploading a file the server will reject anyway.
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt']
export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 10

/** Returns an error message, or null when the file is fine. */
export function validateFile(file) {
  const dot = file.name.lastIndexOf('.')
  const extension = dot === -1 ? '' : file.name.slice(dot).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `${file.name} can't be uploaded. Use PDF, DOCX or TXT.`
  }
  if (file.size === 0) {
    return `${file.name} is empty.`
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${MAX_UPLOAD_MB} MB.`
  }
  return null
}
