import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext'
import LoginPage from './LoginPage'

function renderLogin(authOverrides = {}) {
  const auth = { login: vi.fn(), sessionExpired: false, ...authOverrides }
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return auth
}

function fillAndSubmit(email, password) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('LoginPage', () => {
  it('checks the fields before calling the API', () => {
    const auth = renderLogin()

    fillAndSubmit('not-an-email', '')

    expect(screen.getByText('Enter a valid email address, like name@example.com')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(auth.login).not.toHaveBeenCalled()
  })

  it("shows the API's error message when login fails", async () => {
    const error = { response: { status: 401, data: { detail: 'Incorrect email or password' } } }
    const auth = renderLogin({ login: vi.fn().mockRejectedValue(error) })

    fillAndSubmit('alice@example.com', 'wrong-pass1')

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
    expect(auth.login).toHaveBeenCalledWith('alice@example.com', 'wrong-pass1')
  })

  it('tells the user when their session expired', () => {
    renderLogin({ sessionExpired: true })

    expect(screen.getByText('Your session expired. Please log in again.')).toBeInTheDocument()
  })

  describe('when the free server is asleep', () => {
    afterEach(() => vi.useRealTimers())

    it('explains the wait after 5 seconds', () => {
      vi.useFakeTimers()
      renderLogin({ login: vi.fn(() => new Promise(() => {})) }) // a request that hasn't answered yet

      fillAndSubmit('alice@example.com', 'password123')
      act(() => vi.advanceTimersByTime(4000))
      expect(screen.queryByText(/server is waking up/)).not.toBeInTheDocument()

      act(() => vi.advanceTimersByTime(1000))
      expect(screen.getByText(/server is waking up/)).toBeInTheDocument()
    })
  })
})
