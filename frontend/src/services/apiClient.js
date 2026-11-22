import axios from 'axios'
import { clearToken, getToken } from './tokenStorage'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
export const AUTH_EXPIRED_EVENT = 'auth:expired'

// One Axios instance for the whole app, so every request gets the same base URL,
// timeout and login token.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000, // uploads are processed before the response comes back
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginAttempt = error.config?.url?.includes('/auth/login')
    // A 401 on any other request means the token expired or is invalid:
    // forget it and tell AuthContext, which sends the user back to the login page.
    if (error.response?.status === 401 && !isLoginAttempt && getToken()) {
      clearToken()
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)

export default apiClient
