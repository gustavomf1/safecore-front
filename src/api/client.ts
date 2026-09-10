import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const baseURL = (import.meta.env.VITE_API_URL ?? '/api') as string

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const isAuthRoute =
    config.url?.includes('/auth/login') ||
    config.url?.includes('/auth/refresh') ||
    config.url?.includes('/auth/logout')

  const token = localStorage.getItem('safecore_token')
  if (token && !isAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---- Refresh token (M2): em 401, troca o access token e repete a requisição. ----
let isRefreshing = false
let waiters: Array<(token: string | null) => void> = []

function notifyWaiters(token: string | null) {
  waiters.forEach((cb) => cb(token))
  waiters = []
}

function fullLogout() {
  localStorage.removeItem('safecore_token')
  localStorage.removeItem('safecore_refresh_token')
  localStorage.removeItem('safecore_user')
  localStorage.removeItem('safecore_empresa')
  localStorage.removeItem('safecore_estabelecimento')
  localStorage.removeItem('safecore_empresa_filha')
  window.location.href = '/login'
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('safecore_refresh_token')
  if (!refreshToken) return null
  try {
    // axios "cru" (sem o interceptor) para não recursar
    const resp = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })
    const newToken = resp.data.token as string
    const newRefresh = resp.data.refreshToken as string
    localStorage.setItem('safecore_token', newToken)
    localStorage.setItem('safecore_refresh_token', newRefresh)
    return newToken
  } catch {
    return null
  }
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status
    const url = original?.url ?? ''

    const isAuthRoute =
      url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true

      if (isRefreshing) {
        // Aguarda o refresh em andamento e então repete.
        return new Promise((resolve, reject) => {
          waiters.push((token) => {
            if (token) {
              original.headers.Authorization = `Bearer ${token}`
              resolve(client(original))
            } else {
              reject(error)
            }
          })
        })
      }

      isRefreshing = true
      const newToken = await refreshAccessToken()
      isRefreshing = false
      notifyWaiters(newToken)

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      }
      fullLogout()
      return Promise.reject(error)
    }

    return Promise.reject(error)
  },
)

export default client
