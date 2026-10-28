import { createContext, useContext, type ReactNode } from 'react'
import { defaultEngine, type StorefrontEngine } from './registry'
const Context = createContext(defaultEngine)
export function EngineProvider({
  engine = defaultEngine,
  children,
}: {
  engine?: StorefrontEngine
  children: ReactNode
}) {
  return <Context.Provider value={engine}>{children}</Context.Provider>
}
export const useEngine = () => useContext(Context)
