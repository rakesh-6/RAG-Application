import { screen } from '@testing-library/react'
import { Route, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { fakeAuth, renderPage } from '../../test/renderPage'
import { ProtectedRoute } from './ProtectedRoute'

function LoginProbe() {
  const location = useLocation()
  return <p>Login page, came from {location.state?.from}</p>
}

function renderProtected(auth) {
  renderPage(
    <>
      <Route element={<ProtectedRoute />}>
        <Route path="/documents" element={<p>Private documents</p>} />
      </Route>
      <Route path="/login" element={<LoginProbe />} />
    </>,
    { at: '/documents', auth },
  )
}

describe('ProtectedRoute', () => {
  it('shows the page to a logged-in user', () => {
    renderProtected(fakeAuth())

    expect(screen.getByText('Private documents')).toBeInTheDocument()
  })

  it('sends a logged-out user to the login page and remembers where they were going', () => {
    renderProtected(fakeAuth({ user: null, isAuthenticated: false }))

    expect(screen.getByText('Login page, came from /documents')).toBeInTheDocument()
    expect(screen.queryByText('Private documents')).not.toBeInTheDocument()
  })

  it('waits while a saved login is being checked', () => {
    renderProtected(fakeAuth({ user: null, isAuthenticated: false, isLoading: true }))

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })
})
