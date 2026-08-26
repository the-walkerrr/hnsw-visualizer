import { useEffect, useReducer, useRef, type ReactNode } from 'react'
import { DispatchCtx, StateCtx, initialState, reducer } from './store'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const { playing, speed } = state
  const timer = useRef<number | null>(null)

  // The playback clock. Each tick advances one step, honouring the
  // coarse/fine filter, and stops itself at the end of the trace.
  useEffect(() => {
    if (!playing) return
    timer.current = window.setInterval(() => dispatch({ type: 'tick' }), 1000 / speed)
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current)
    }
  }, [playing, speed])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}
