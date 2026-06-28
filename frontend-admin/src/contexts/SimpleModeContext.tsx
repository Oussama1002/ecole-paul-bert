import { createContext, useContext, useMemo, type ReactNode } from 'react'

type SimpleModeContextValue = {
  simpleMode: boolean
  ready: boolean
  canToggle: boolean
  setSimpleMode: (value: boolean) => Promise<void>
}

const SimpleModeContext = createContext<SimpleModeContextValue | null>(null)

/**
 * Simple mode has been removed — users always see the full feature set.
 * This context is kept as a stable shim so existing call sites that still
 * read `simpleMode` keep compiling; `simpleMode` is permanently `false`
 * and the toggle is hidden (`canToggle: false`).
 */
export function SimpleModeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<SimpleModeContextValue>(
    () => ({
      simpleMode: false,
      ready: true,
      canToggle: false,
      setSimpleMode: async () => {
        /* no-op — simple mode is disabled globally */
      },
    }),
    []
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
