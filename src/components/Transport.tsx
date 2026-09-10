import { useApp, useDispatch } from '../state/store'

export function Transport() {
  const { trace, step, playing, granularity, speed, movingNode } = useApp()
  const dispatch = useDispatch()
  const total = trace?.steps.length ?? 0
  const atEnd = total === 0 || step >= total - 1
  const label = trace?.title ?? 'Run a search to begin'

  return <div className="transport" aria-label="Trace playback">
    <fieldset className="transport-controls panel-fields" disabled={movingNode !== null}>
      <button className="iconbtn square" title="Previous step (←)" aria-label="Previous step" disabled={!trace || step === 0} onClick={() => dispatch({ type: 'stepBy', delta: -1 })}>‹</button>
      <button className="iconbtn square primary" title={playing ? 'Pause (space)' : 'Play (space)'} aria-label={playing ? 'Pause' : atEnd ? 'Replay' : 'Play'} disabled={!trace} onClick={() => dispatch({ type: playing ? 'pause' : 'play' })}>{playing ? 'Ⅱ' : atEnd ? '↻' : '▶'}</button>
      <button className="iconbtn square" title="Next step (→)" aria-label="Next step" disabled={!trace || atEnd} onClick={() => dispatch({ type: 'stepBy', delta: 1 })}>›</button>
    </fieldset>
    <div className="transport-track">
      <div className="transport-meta"><span className="transport-label" title={label}>{label}</span><span className="step-count">{total ? step + 1 : 0} / {total}</span></div>
      <input className="scrub" type="range" min={0} max={Math.max(total - 1, 0)} value={step} disabled={!trace || movingNode !== null} aria-label="Trace step" onChange={(e) => dispatch({ type: 'seek', index: Number(e.target.value) })}/>
    </div>
    <div className="transport-options">
      <details className="playback-settings"><summary aria-label="Playback settings" title="Playback settings">Settings</summary><div>
      <label>Steps<select value={granularity} onChange={(e) => dispatch({ type: 'setGranularity', g: e.target.value as 'coarse' | 'fine' })} aria-label="Replay detail" aria-describedby="replay-detail-help"><option value="coarse">Main steps</option><option value="fine">Every step</option></select></label>
      <div id="replay-detail-help" className="replay-detail-help">
        <p><b>Main steps:</b> Key actions, such as expanding a dot or moving between layers.</p>
        <p><b>Every step:</b> Also shows individual neighbor checks, including which dots are kept or skipped.</p>
        <p>Affects Play and the step arrows. The search result stays the same.</p>
      </div>
      <label>Speed<select value={speed} onChange={(e) => dispatch({ type: 'setSpeed', speed: Number(e.target.value) })} aria-label="Playback speed"><option value={1}>1×</option><option value={2}>2×</option><option value={3}>3×</option><option value={5}>5×</option><option value={8}>8×</option></select></label>
      </div></details>
      <button className="iconbtn square" title="Clear trace" aria-label="Clear trace" disabled={!trace || movingNode !== null} onClick={() => dispatch({ type: 'closeTrace' })}>×</button>
    </div>
  </div>
}
