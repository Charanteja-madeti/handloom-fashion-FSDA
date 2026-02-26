const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const ACCESS_TOKEN_STORAGE_KEY = 'auth_token'
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token'
const CURRENT_USER_STORAGE_KEY = 'user'
const IS_AUTH_STORAGE_KEY = 'isAuth'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed')
  }

  return data
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

export function getCurrentUser() {
  const userValue = localStorage.getItem(CURRENT_USER_STORAGE_KEY)

  if (!userValue) {
    return null
  }

  try {
    return JSON.parse(userValue)
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return Boolean(getAccessToken()) && localStorage.getItem(IS_AUTH_STORAGE_KEY) === 'true'
}

export function saveSession({ token, refreshToken, user }) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user))
  localStorage.setItem(IS_AUTH_STORAGE_KEY, 'true')
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
  localStorage.removeItem(IS_AUTH_STORAGE_KEY)
}

export async function signupUser({ name, email, password }) {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export async function loginUser({ email, password }) {
  const data = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  if (data?.token && data?.refreshToken && data?.user) {
    const normalizedEmail = data.user.email?.trim().toLowerCase()
    const role = normalizedEmail === 'admin@handloom.com' ? 'admin' : 'user'
    saveSession({
      token: data.token,
      refreshToken: data.refreshToken,
      user: { ...data.user, role },
    })
  }

  return data
}

export async function logoutUser() {
  const refreshToken = getRefreshToken()

  if (refreshToken) {
    try {
      await request('/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
    }
  }

  clearSession()
}
