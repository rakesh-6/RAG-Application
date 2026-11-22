import apiClient from './apiClient'

export async function listDocuments() {
  const { data } = await apiClient.get('/documents')
  return data
}

/** Upload one file. `onProgress` receives 0–100 while the bytes are being sent. */
export async function uploadDocument(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/documents', formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
  return data
}

export async function deleteDocument(documentId) {
  await apiClient.delete(`/documents/${documentId}`)
}
