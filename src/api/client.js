import axios from 'axios'

const API_BASE_URL = 'https://products.ikyam.in/crm_api'
// const API_BASE_URL = 'http://localhost:8000/crm_api'
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

// On a 401, try refreshing the access token once, then retry the request.
// If refresh also fails, clear auth and bounce to /login.
let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const auth = getStoredAuth()
      if (!auth?.refresh_token) {
        clearAuth()
        // window.location.href = '/login'
        return Promise.reject(error)
      }
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
        original.headers.Authorization = `Bearer ${refreshed.access_token}`
        return api(original)
      } catch (refreshError) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default api
