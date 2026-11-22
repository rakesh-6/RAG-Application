import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient, { AUTH_EXPIRED_EVENT } from './apiClient'
import { getToken, setToken } from './tokenStorage'

// Replace the network with a fake "adapter" so we can control the response.
let lastRequest
const originalAdapter = apiClient.defaults.adapter

function respondWith(status, data = {}) {
  apiClient.defaults.adapter = async (config) => {
    lastRequest = config
    const response = { data, status, statusText: '', headers: {}, config }
    if (status >= 400) throw new AxiosError(`Request failed with status ${status}`, 'ERR_BAD_REQUEST', config, null, response)
    return response
  }
}

describe('apiClient', () => {
  const onExpired = vi.fn()

  beforeEach(() => window.addEventListener(AUTH_EXPIRED_EVENT, onExpired))
  afterEach(() => {
    window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
    onExpired.mockReset()
    apiClient.defaults.adapter = originalAdapter
  })

  it('sends the saved token on every request', async () => {
    setToken('my-token')
    respondWith(200)

    await apiClient.get('/documents')

    expect(lastRequest.headers.get('Authorization')).toBe('Bearer my-token')
  })

  it('sends no Authorization header when logged out', async () => {
    respondWith(200)

    await apiClient.get('/health')

    expect(lastRequest.headers.get('Authorization')).toBeUndefined()
  })

  it('logs the user out when the token is rejected (401)', async () => {
    setToken('expired-token')
    respondWith(401, { detail: 'Token has expired, please log in again' })

    await expect(apiClient.get('/documents')).rejects.toThrow()

    expect(getToken()).toBeNull()
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('treats a 401 from the login form as a wrong password, not an expired session', async () => {
    setToken('still-valid')
    respondWith(401, { detail: 'Incorrect email or password' })

    await expect(apiClient.post('/auth/login', {})).rejects.toThrow()

    expect(getToken()).toBe('still-valid')
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('keeps the session for other errors', async () => {
    setToken('my-token')
    respondWith(404, { detail: 'Document not found.' })

    await expect(apiClient.get('/documents/99')).rejects.toThrow()

    expect(getToken()).toBe('my-token')
  })
})
