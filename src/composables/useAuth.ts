import { reactive, computed, readonly } from 'vue'

export interface AuthUser {
  id: number
  firstname: string
  surname: string
  email: string
  role: number | null
  is_staff: boolean
  marketing_opt_in?: boolean
  dob?: string | null
  permission_ids: number[]
  permissions: string[]
  home_team_id?: number | null
  team_ids?: number[]
  managed_team_ids?: number[]
}

interface AuthState {
  token: string | null
  user: AuthUser | null
}

const TOKEN_KEY = 'kgm_token'
const USER_KEY = 'kgm_user'

function loadStored(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    const user = raw ? (JSON.parse(raw) as AuthUser) : null
    if (!token || !user) return { token: null, user: null }
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

const state = reactive<AuthState>(loadStored())

function persist() {
  if (state.token && state.user) {
    localStorage.setItem(TOKEN_KEY, state.token)
    localStorage.setItem(USER_KEY, JSON.stringify(state.user))
  } else {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`)
  const res = await fetch(url, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  return data as T
}

interface LoginResponse {
  token: string
  user: AuthUser
}

interface RegisterResponse {
  ok: boolean
  email_sent: boolean
}

export function useAuth() {
  const isLoggedIn = computed(() => !!state.token && !!state.user)
  const isStaff = computed(() => !!state.user?.is_staff || (!!state.user && state.user.role != null))
  const user = computed(() => state.user)
  const token = computed(() => state.token)

function hasPerm(permission: string): boolean {
    return !!state.user?.permissions?.includes(permission)
  }

  function hasPermId(id: number): boolean {
    return !!state.user?.permission_ids?.includes(id)
  }

  async function login(email: string, password: string): Promise<void> {
    const data = await request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    state.token = data.token
    state.user = data.user
    persist()
  }

  async function register(firstname: string, surname: string, email: string, password: string, tos: boolean, marketing: boolean): Promise<void> {
    await request<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstname, surname, email, password, tos, marketing_opt_in: marketing }),
    })
  }

  async function resendVerification(email: string): Promise<void> {
    await request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async function verifyEmail(email: string, token: string): Promise<void> {
    await request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, token }),
    })
  }

  async function forgotPassword(email: string): Promise<void> {
    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async function resetPassword(token: string, password: string): Promise<void> {
    await request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  }

  async function checkResetToken(token: string): Promise<boolean> {
    const data = await request<{ valid: boolean }>(
      `/api/auth/check-reset-token?token=${encodeURIComponent(token)}`
    )
    return data.valid
  }

  function updateUser(partial: Partial<AuthUser>) {
    if (!state.user) return
    state.user = { ...state.user, ...partial }
    persist()
  }

  async function refreshMe(): Promise<void> {
    if (!state.token) return
    const data = await request<{ user: AuthUser }>('/api/auth/me')
    state.user = { ...state.user, ...data.user }
    persist()
  }

  function logout() {
    state.token = null
    state.user = null
    persist()
  }

  return {
    state: readonly(state),
    isLoggedIn,
    isStaff,
    user,
    token,
    hasPerm,
    hasPermId,
    login,
    register,
    resendVerification,
    verifyEmail,
    forgotPassword,
    resetPassword,
    checkResetToken,
    updateUser,
    refreshMe,
    logout,
    request,
  }
}