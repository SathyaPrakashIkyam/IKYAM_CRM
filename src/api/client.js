import axios from 'axios'

// const API_BASE_URL = 'https://products.ikyam.in/crm_api'
const API_BASE_URL = 'http://localhost:8000/crm_api'
export const api = axios.create({ baseURL: API_BASE_URL })
export const WS_BASE_URL = API_BASE_URL.replace(/^https/, 'wss')

function getStoredAuth() {
  const raw = localStorage.getItem('ikyam_auth')
  return raw ? JSON.parse(raw) : null
}

export function storeAuth(auth) {
  localStorage.setItem('ikyam_auth', JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem('ikyam_auth')
  localStorage.removeItem('ikyam_company_id')
}

export function currentCompanyId() {
  return localStorage.getItem('ikyam_company_id')
}

export function setCurrentCompanyId(id) {
  localStorage.setItem('ikyam_company_id', id)
}

export function getAuthToken() {
  const auth = getStoredAuth()
  return auth?.token || auth?.access_token || ''
}

// Attach the bearer token to every outgoing request.
api.interceptors.request.use((config) => {
  const auth = getStoredAuth()
  const token = auth?.token || auth?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global Response Interceptor: Handles 2-hour session expiration and 401 "Not authenticated" errors
let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const detail = error.response?.data?.detail

    const isUnauthenticated =
      status === 401 ||
      detail === 'Not authenticated' ||
      detail === 'Could not validate credentials' ||
      (typeof detail === 'string' && detail.toLowerCase().includes('not authenticated'))

    if (isUnauthenticated) {
      if (original && !original._retry) {
        original._retry = true
        const auth = getStoredAuth()

        // If refresh token exists, attempt to refresh token once
        if (auth?.refresh_token) {
          try {
            if (!refreshPromise) {
              refreshPromise = axios
                .post(`${API_BASE_URL}/auth/refresh`, { refresh_token: auth.refresh_token })
                .then((res) => {
                  storeAuth(res.data)
                  refreshPromise = null
                  return res.data
                })
                .catch((err) => {
                  refreshPromise = null
                  throw err
                })
            }
            const refreshed = await refreshPromise
            const newToken = refreshed.token || refreshed.access_token
            if (newToken) {
              original.headers.Authorization = `Bearer ${newToken}`
              return api(original)
            }
          } catch (refreshError) {
            // Refresh attempt failed or refresh token expired
          }
        }
      }

      // Clear local authentication state and redirect immediately to login
      clearAuth()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default api
