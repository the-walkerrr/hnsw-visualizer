import { replayInProgress, useApp, useDispatch } from '../state/store'

export function OperationNotice() {
  const state = useApp()
  const dispatch = useDispatch()
  if (state.movingNode !== null) return <div className="operation-notice" role="status"><b>Moving dot · release to finish, Esc to cancel.</b></div>
  if (!replayInProgress(state)) return null
  return <details className="operation-notice">
    <summary>{state.playing ? 'Replay running' : 'Replay paused'} · editing locked</summary>
    <p>Finish or end replay to edit. You can still inspect dots.</p>
    <div><button className="button compact" onClick={() => dispatch({ type: 'seek', index: state.trace!.steps.length - 1 })}>Finish</button><button className="button compact" onClick={() => dispatch({ type: 'closeTrace' })} title="Close the replay and keep the committed graph changes">End replay</button></div>
  </details>
}
