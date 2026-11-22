import apiClient from './apiClient'

export async function register(email, password) {
  const { data } = await apiClient.post('/auth/register', { email, password })
  return data
}

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  return data // { access_token, token_type, expires_in }
}

export async function getCurrentUser() {
  const { data } = await apiClient.get('/auth/me')
  return data
}
