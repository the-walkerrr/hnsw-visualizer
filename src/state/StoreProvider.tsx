import { useEffect, useReducer, type ReactNode } from 'react'
import { loadPersistedState, savePersistedState } from './persistence'
import { DispatchCtx, StateCtx, initialState, reducer } from './store'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadPersistedState() ?? initialState())
  const { playing, speed } = state

  useEffect(() => {
    const timer = window.setTimeout(() => savePersistedState(state), 200)
    return () => window.clearTimeout(timer)
  }, [state])

  useEffect(() => {
    const saveLatest = () => savePersistedState(state)
    window.addEventListener('pagehide', saveLatest)
    return () => window.removeEventListener('pagehide', saveLatest)
  }, [state])

  // The playback clock. Each tick advances one step, honouring the
  // coarse/fine filter, and stops itself at the end of the trace.
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => dispatch({ type: 'tick' }), 1000 / speed)
    return () => window.clearInterval(timer)
  }, [playing, speed])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}
