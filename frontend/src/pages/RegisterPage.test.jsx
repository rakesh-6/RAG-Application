import { fireEvent, screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { fakeAuth, renderPage } from '../test/renderPage'
import RegisterPage from './RegisterPage'

function renderRegister(auth = fakeAuth({ user: null, isAuthenticated: false })) {
  renderPage(
    <>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/chat" element={<p>Chat page</p>} />
    </>,
    { at: '/register', auth },
  )
  return auth
}

function fill({ email = 'new@example.com', password = 'Test12345', confirm = password } = {}) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('RegisterPage', () => {
  it('ticks off password rules as the user types', () => {
    renderRegister()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abc' } })

    expect(screen.getByText('Contains a letter').closest('li')).toHaveTextContent('(done)')
    expect(screen.getByText('At least 8 characters').closest('li')).toHaveTextContent('(not yet)')
    expect(screen.getByText('Contains a number').closest('li')).toHaveTextContent('(not yet)')
  })

  it("doesn't submit when the passwords don't match", () => {
    const auth = renderRegister()

    fill({ confirm: 'Different123' })

    expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('creates the account and opens the chat', async () => {
    const auth = renderRegister(fakeAuth({ user: null, isAuthenticated: false, register: vi.fn().mockResolvedValue() }))

    fill()

    expect(await screen.findByText('Chat page')).toBeInTheDocument()
    expect(auth.register).toHaveBeenCalledWith('new@example.com', 'Test12345')
  })

  it("shows the server's message when the email is taken", async () => {
    const error = { response: { status: 409, data: { detail: 'An account with this email already exists' } } }
    renderRegister(fakeAuth({ user: null, isAuthenticated: false, register: vi.fn().mockRejectedValue(error) }))

    fill()

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists')
  })
})
