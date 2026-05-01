import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as settingsApi from '../api/appSettings'
import { useAuth } from './AuthContext'

type SimpleModeContextValue = {
  simpleMode: boolean
  ready: boolean
  canToggle: boolean
  setSimpleMode: (value: boolean) => Promise<void>
}

const SimpleModeContext = createContext<SimpleModeContextValue | null>(null)

const LOCAL_FALLBACK_KEY = 'paulbert_simple_mode'

export function SimpleModeProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth()
  const [simpleMode, setSimpleModeState] = useState<boolean>(() => {
    const stored = localStorage.getItem(LOCAL_FALLBACK_KEY)
    return stored === null ? true : stored === '1'
  })
  const [ready, setReady] = useState(false)

  const canToggle =
    user?.role?.code === 'super_admin' || user?.role?.code === 'admin'

  const loadFromServer = useCallback(async () => {
    try {
      const s = await settingsApi.fetchAppSettings()
      setSimpleModeState(s.simple_mode_enabled)
      localStorage.setItem(LOCAL_FALLBACK_KEY, s.simple_mode_enabled ? '1' : '0')
    } catch {
      // keep local fallback — offline or 401
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      setReady(true)
      return
    }
    void loadFromServer()
  }, [authReady, user, loadFromServer])

  const setSimpleMode = useCallback(
    async (value: boolean) => {
      // Optimistic update
      setSimpleModeState(value)
      localStorage.setItem(LOCAL_FALLBACK_KEY, value ? '1' : '0')
      if (canToggle) {
        try {
          const s = await settingsApi.updateAppSettings({ simple_mode_enabled: value })
          setSimpleModeState(s.simple_mode_enabled)
        } catch {
          // revert on failure
          await loadFromServer()
        }
      }
    },
    [canToggle, loadFromServer]
  )

  const value = useMemo(
    () => ({ simpleMode, ready, canToggle, setSimpleMode }),
    [simpleMode, ready, canToggle, setSimpleMode]
  )

  return (
    <SimpleModeContext.Provider value={value}>
      {children}
    </SimpleModeContext.Provider>
  )
}

export function useSimpleMode(): SimpleModeContextValue {
  const ctx = useContext(SimpleModeContext)
  if (!ctx) {
    throw new Error('useSimpleMode must be used within SimpleModeProvider')
  }
  return ctx
}
