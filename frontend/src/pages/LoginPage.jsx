import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import SlowServerHint from '../components/ui/SlowServerHint'
import TextField from '../components/ui/TextField'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../services/errors'

const STEPS = ['Upload PDF, DOCX or TXT files', 'Ask questions in plain language', 'Check every answer against its cited source']

export default function LoginPage() {
  const { login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = {}
    if (!email.includes('@')) errors.email = 'Enter a valid email address, like name@example.com'
    if (!password) errors.password = 'Enter your password'
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(location.state?.from ?? '/chat', { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      heading="Ask your documents. Get answers you can check."
      text="Upload PDFs, Word files and text notes. Every answer shows the document and page it came from, and says so when your files don't have the answer."
      panelFooter={
        <ol className="flex flex-col gap-3.5">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-white text-sm font-semibold text-indigo-700">
                {index + 1}
              </span>
              <span className="text-[15px] text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-[28px] font-semibold">Log in</h2>
          <p className="text-[15px] text-slate-500">Welcome back. Your documents and chats are waiting.</p>
        </div>

        {sessionExpired && !formError && (
          <Alert tone="info" icon="lock">
            Your session expired. Please log in again.
          </Alert>
        )}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          type="password"
          revealable
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />

        {formError && <Alert tone="error">{formError}</Alert>}

        <Button type="submit" loading={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
        <SlowServerHint active={submitting} />

        <p className="text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="font-medium text-indigo-700 hover:text-indigo-800">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
