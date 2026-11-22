import { render } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthContext } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'

/** A logged-in user by default; override any field, e.g. fakeAuth({ isAuthenticated: false }). */
export function fakeAuth(overrides = {}) {
  return {
    user: { id: 1, email: 'alice@example.com', created_at: '2026-11-22T10:00:00Z' },
    isAuthenticated: true,
    isLoading: false,
    sessionExpired: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }
}

/** Render <Route> elements inside the same providers the real app uses, starting at the URL `at`. */
export function renderPage(routes, { at = '/', auth = fakeAuth() } = {}) {
  return render(
    <AuthContext.Provider value={auth}>
      <ToastProvider>
        <MemoryRouter initialEntries={[at]}>
          <Routes>{routes}</Routes>
        </MemoryRouter>
      </ToastProvider>
    </AuthContext.Provider>,
  )
}
