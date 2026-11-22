import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import SlowServerHint from '../components/ui/SlowServerHint'
import TextField from '../components/ui/TextField'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../services/errors'

// Same rules as the backend's RegisterRequest schema.
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains a letter', test: (p) => /[a-zA-Z]/.test(p) },
  { label: 'Contains a number', test: (p) => /\d/.test(p) },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = {}
    if (!email.includes('@')) errors.email = 'Enter a valid email address, like name@example.com'
    if (!PASSWORD_RULES.every((rule) => rule.test(password))) errors.password = 'Your password needs to meet all the rules below'
    if (confirm !== password) errors.confirm = "Passwords don't match"
    setFieldErrors(errors)
    setFormError('')
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await register(email.trim(), password)
      navigate('/chat', { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      heading="Your private library of answers."
      text="Your documents and chats belong to your account only. No one else can search them."
      panelFooter={
        <div className="flex max-w-[460px] items-start gap-3 rounded-xl bg-white p-4">
          <Icon name="alert" className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <p className="text-sm leading-relaxed text-slate-700">
            This demo uses Google Gemini&apos;s free tier. Don&apos;t upload private or confidential documents.
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-[28px] font-semibold">Create your account</h2>
          <p className="text-[15px] text-slate-500">It takes less than a minute.</p>
        </div>

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />

        <div className="flex flex-col gap-2">
          <TextField
            label="Password"
            type="password"
            revealable
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            describedBy="password-rules"
          />
          <ul id="password-rules" className="flex flex-col gap-1.5">
            {PASSWORD_RULES.map((rule) => {
              const passed = rule.test(password)
              return (
                <li key={rule.label} className={`flex items-center gap-2 text-[13px] ${passed ? 'text-green-700' : 'text-slate-500'}`}>
                  <Icon name={passed ? 'check' : 'circle'} className="size-4" strokeWidth={passed ? 2.5 : 2} />
                  {rule.label}
                  <span className="sr-only">{passed ? '(done)' : '(not yet)'}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={fieldErrors.confirm}
        />

        {formError && <Alert tone="error">{formError}</Alert>}

        <Button type="submit" loading={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <SlowServerHint active={submitting} />

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-700 hover:text-indigo-800">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
