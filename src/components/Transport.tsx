import { useApp, useDispatch } from '../state/store'

export function Transport() {
  const { trace, step, playing, speed, granularity } = useApp()
  const dispatch = useDispatch()
  const total = trace?.steps.length ?? 0
  const atEnd = total === 0 || step >= total - 1

  return (
    <div className="transport">
      <button
        className="iconbtn"
        title="Jump to the first step"
        disabled={!trace}
        onClick={() => dispatch({ type: 'seek', index: 0 })}
      >
        ⏮
      </button>
      <button
        className="iconbtn"
        title="Previous step (←)"
        disabled={!trace || step === 0}
        onClick={() => dispatch({ type: 'stepBy', delta: -1 })}
      >
        ◀
      </button>
      <button
        className="iconbtn primary"
        title={playing ? 'Pause (space)' : 'Play (space)'}
        disabled={!trace}
        onClick={() => dispatch({ type: playing ? 'pause' : 'play' })}
      >
        {playing ? '❚❚' : atEnd ? '↻' : '▶'}
      </button>
      <button
        className="iconbtn"
        title="Next step (→)"
        disabled={!trace || atEnd}
        onClick={() => dispatch({ type: 'stepBy', delta: 1 })}
      >
        ▶
      </button>
      <button
        className="iconbtn"
        title="Jump to the end"
        disabled={!trace}
        onClick={() => dispatch({ type: 'seek', index: total - 1 })}
      >
        ⏭
      </button>

      <input
        className="scrub"
        type="range"
        min={0}
        max={Math.max(total - 1, 0)}
        value={step}
        disabled={!trace}
        aria-label="Step"
        onChange={(e) => dispatch({ type: 'seek', index: Number(e.target.value) })}
      />
      <span className="chip mono">
        {total ? step + 1 : 0}/{total}
      </span>

      <div className="segmented" role="group" aria-label="Step detail">
        {(['coarse', 'fine'] as const).map((g) => (
          <button
            key={g}
            aria-pressed={granularity === g}
            title={
              g === 'coarse'
                ? 'Skip the per-neighbour bookkeeping steps'
                : 'Show every single comparison'
            }
            onClick={() => dispatch({ type: 'setGranularity', g })}
          >
            {g}
          </button>
        ))}
      </div>

      <select
        aria-label="Playback speed"
        style={{ width: 'auto' }}
        value={speed}
        onChange={(e) => dispatch({ type: 'setSpeed', speed: Number(e.target.value) })}
      >
        {[1, 2, 3, 5, 8, 14].map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>

      <button
        className="iconbtn"
        title="Clear the trace and go back to the plain graph"
        disabled={!trace}
        onClick={() => dispatch({ type: 'closeTrace' })}
      >
        ✕
      </button>
    </div>
  )
}
