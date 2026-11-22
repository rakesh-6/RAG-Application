import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { AUTH_EXPIRED_EVENT } from '../services/apiClient'
import * as authService from '../services/authService'
import { clearToken, getToken, setToken } from '../services/tokenStorage'

export const AuthContext = createContext(null)

/** Holds the logged-in user for the whole app. Use it through the useAuth() hook. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // If a token is saved from an earlier visit, we must check it with the backend before
  // deciding whether to show the app or the login page.
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()))
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    if (!getToken()) return
    authService
      .getCurrentUser()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      setSessionExpired(true)
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [])

  const login = useCallback(async (email, password) => {
    const { access_token: accessToken } = await authService.login(email, password)
    setToken(accessToken)
    setUser(await authService.getCurrentUser())
    setSessionExpired(false)
  }, [])

  const register = useCallback(
    async (email, password) => {
      await authService.register(email, password)
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setSessionExpired(false)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, sessionExpired, login, register, logout }),
    [user, isLoading, sessionExpired, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
