const GENERIC_ERROR = 'Something went wrong. Please try again.'

/** Turn an Axios error into a sentence we can show the user. */
export function getErrorMessage(error, fallback = GENERIC_ERROR) {
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
    return "Can't reach the server. Check your connection and that the backend is running."
  }

  const { status, data } = error.response
  // 500 means a bug on our side: its details are not useful (or safe) to show.
  if (status === 500) return fallback

  const detail = data?.detail
  if (typeof detail === 'string') return detail
  // FastAPI validation errors (422) are a list: show the first one.
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '')
  return fallback
}
