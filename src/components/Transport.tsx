import { useApp, useDispatch } from '../state/store'

export function Transport() {
  const { trace, step, playing, granularity, speed } = useApp()
  const dispatch = useDispatch()
  const total = trace?.steps.length ?? 0
  const atEnd = total === 0 || step >= total - 1
  const label = trace?.title ?? 'Run an operation to create a trace'

  return <div className="transport" aria-label="Trace playback">
    <div className="transport-controls">
      <button className="iconbtn square" title="Previous step (←)" aria-label="Previous step" disabled={!trace || step === 0} onClick={() => dispatch({ type: 'stepBy', delta: -1 })}>‹</button>
      <button className="iconbtn square primary" title={playing ? 'Pause (space)' : 'Play (space)'} aria-label={playing ? 'Pause' : atEnd ? 'Replay' : 'Play'} disabled={!trace} onClick={() => dispatch({ type: playing ? 'pause' : 'play' })}>{playing ? 'Ⅱ' : atEnd ? '↻' : '▶'}</button>
      <button className="iconbtn square" title="Next step (→)" aria-label="Next step" disabled={!trace || atEnd} onClick={() => dispatch({ type: 'stepBy', delta: 1 })}>›</button>
    </div>
    <div className="transport-track">
      <div className="transport-meta"><span className="transport-label" title={label}>{label}</span><span className="step-count">{total ? step + 1 : 0} / {total}</span></div>
      <input className="scrub" type="range" min={0} max={Math.max(total - 1, 0)} value={step} disabled={!trace} aria-label="Trace step" onChange={(e) => dispatch({ type: 'seek', index: Number(e.target.value) })}/>
    </div>
    <div className="transport-options">
      <button className="text-control" disabled={!trace} onClick={() => dispatch({ type: 'setGranularity', g: granularity === 'coarse' ? 'fine' : 'coarse' })} title="Toggle between major steps and every algorithm detail">{granularity === 'coarse' ? 'Major steps' : 'Every step'}</button>
      <label className="speed-control"><span className="sr-only">Playback speed</span><select value={speed} onChange={(e) => dispatch({ type: 'setSpeed', speed: Number(e.target.value) })} disabled={!trace} aria-label="Playback speed"><option value={1}>1×</option><option value={2}>2×</option><option value={3}>3×</option><option value={5}>5×</option><option value={8}>8×</option></select></label>
      <button className="iconbtn square" title="Clear trace" aria-label="Clear trace" disabled={!trace} onClick={() => dispatch({ type: 'closeTrace' })}>×</button>
    </div>
  </div>
}
