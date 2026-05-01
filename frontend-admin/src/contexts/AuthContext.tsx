import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import { getStoredToken, setStoredToken } from '../api/client'
import type { AuthUser } from '../types/api'

type AuthContextValue = {
  user: AuthUser | null
  permissionCodes: string[]
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  hasPermission: (code: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [permissionCodes, setPermissionCodes] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  const applySession = useCallback((me: authApi.MeData | authApi.LoginData) => {
    setUser(me.user)
    setPermissionCodes(me.permission_codes ?? [])
  }, [])

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setReady(true)
      return
    }
    authApi
      .fetchMe()
      .then(applySession)
      .catch(() => {
        setStoredToken(null)
        setUser(null)
        setPermissionCodes([])
      })
      .finally(() => setReady(true))
  }, [applySession])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login({ email, password })
      applySession(data)
    },
    [applySession]
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setPermissionCodes([])
  }, [])

  const refreshMe = useCallback(async () => {
    const me = await authApi.fetchMe()
    applySession(me)
  }, [applySession])

  const hasPermission = useCallback(
    (code: string) => {
      if (user?.role?.code === 'super_admin') {
        return true
      }
      return permissionCodes.includes(code)
    },
    [user?.role?.code, permissionCodes]
  )

  const value = useMemo(
    () => ({
      user,
      permissionCodes,
      ready,
      login,
      logout,
      refreshMe,
      hasPermission,
    }),
    [
      user,
      permissionCodes,
      ready,
      login,
      logout,
      refreshMe,
      hasPermission,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
