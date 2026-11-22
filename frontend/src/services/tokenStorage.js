// The JWT is kept in localStorage so a page refresh keeps you logged in.
// Trade-off: JavaScript can read it, so an XSS bug could steal it. React escapes
// all rendered text, and we never use dangerouslySetInnerHTML, which keeps that risk low.
const TOKEN_KEY = 'rag_access_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}
