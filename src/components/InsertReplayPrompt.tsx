import { useEffect, useState } from 'react'
import { useApp, useDispatch } from '../state/store'

const STORAGE_KEY = 'hnsw-insert-replay-prompt-seen'

function wasShownThisSession(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.sessionStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
}

function markShownThisSession(): void {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(STORAGE_KEY, 'true') } catch { /* Storage is optional. */ }
}

export function InsertReplayPrompt() {
  const { trace, step } = useApp()
  const dispatch = useDispatch()
  const finishedInsert = trace?.op === 'insert' && step === trace.steps.length - 1
  const [open, setOpen] = useState(() => !wasShownThisSession())

  useEffect(() => {
    if (open && finishedInsert) markShownThisSession()
  }, [finishedInsert, open])

  if (!open || !finishedInsert) return null

  const dismiss = () => setOpen(false)
  const watchExactSteps = () => {
    setOpen(false)
    dispatch({ type: 'setGranularity', g: 'fine' })
    dispatch({ type: 'play' })
  }

  return <aside className="insert-replay-prompt" role="status" aria-label="Insert complete">
    <button className="insert-replay-dismiss" type="button" aria-label="Dismiss insert replay tip" onClick={dismiss}>×</button>
    <p className="section-kicker">Node inserted</p>
    <strong>You’re seeing the finished graph.</strong>
    <p>The full replay is ready, including every search, link, and trim decision.</p>
    <button className="button primary compact" type="button" onClick={watchExactSteps}>Watch exact steps →</button>
  </aside>
}
