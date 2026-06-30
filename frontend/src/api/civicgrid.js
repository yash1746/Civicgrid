/**
 * CivicGrid — Axios API Client
 */
import axios from 'axios'
import useStore from '../store/useStore.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
})

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = useStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Issues ────────────────────────────────────────────────────
export const reportIssue = (formData) =>
  api.post('/api/v1/issues/report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // Vision processing can take time
  })

export const getNearbyIssues = (lat, lng, radius = 1000, category = null) =>
  api.get('/api/v1/issues/nearby', { params: { lat, lng, radius_m: radius, category } })

export const getIssue = (id) => api.get(`/api/v1/issues/${id}`)

export const updateIssueStatus = (id, status) =>
  api.patch(`/api/v1/issues/${id}/status`, new URLSearchParams({ new_status: status }))

export const submitProofOfWork = (issueId, formData) =>
  api.post(`/api/v1/issues/${issueId}/proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })

// ── Users ─────────────────────────────────────────────────────
export const login = (email, password) => {
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)
  return api.post('/api/v1/users/login', params)
}

export const register = (data) => api.post('/api/v1/users/register', data)
export const googleLogin = (googleToken, role = 'citizen', mode = 'login') => api.post('/api/v1/users/google', { google_token: googleToken, role, mode })
export const getMe = () => api.get('/api/v1/users/me')
export const getMyIssues = () => api.get('/api/v1/users/me/issues')

// ── Resolver ──────────────────────────────────────────────────
export const getWorkQueue = (lat, lng) =>
  api.get('/api/v1/resolver/queue', { params: lat && lng ? { lat, lng } : {} })

export const acceptIssue = (id) => api.post(`/api/v1/resolver/issues/${id}/accept`)

export const queryChatbot = (text, imageBase64 = null) => api.post('/api/v1/chatbot/query', { text, image_base64: imageBase64 })

export default api
