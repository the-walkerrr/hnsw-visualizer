import { useApp, useDispatch } from '../state/store'

export function Transport() {
  const { trace, step, playing } = useApp()
  const dispatch = useDispatch()
  const total = trace?.steps.length ?? 0
  const atEnd = total === 0 || step >= total - 1
  const label = trace ? trace.title : 'No replay yet — run a sample action or click the canvas'

  return (
    <div className="transport">
      <button
        className="iconbtn"
        title="Previous step (←)"
        aria-label="Previous step"
        disabled={!trace || step === 0}
        onClick={() => dispatch({ type: 'stepBy', delta: -1 })}
      >
        ◀
      </button>
      <button
        className="iconbtn primary"
        title={playing ? 'Pause (space)' : 'Play (space)'}
        aria-label={playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
        disabled={!trace}
        onClick={() => dispatch({ type: playing ? 'pause' : 'play' })}
      >
        {playing ? '❚❚' : atEnd ? '↻' : '▶'}
      </button>
      <button
        className="iconbtn"
        title="Next step (→)"
        aria-label="Next step"
        disabled={!trace || atEnd}
        onClick={() => dispatch({ type: 'stepBy', delta: 1 })}
      >
        ▶
      </button>
      <button
        className="iconbtn"
        title="Jump to the end"
        aria-label="Jump to the last step"
        disabled={!trace}
        onClick={() => dispatch({ type: 'seek', index: total - 1 })}
      >
        ⏭
      </button>

      <span className="transport-label" title={label}>
        {label}
      </span>

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
        step {total ? step + 1 : 0}/{total}
      </span>

      <button
        className="iconbtn"
        title="Clear the trace and go back to the plain graph"
        aria-label="Clear trace"
        disabled={!trace}
        onClick={() => dispatch({ type: 'closeTrace' })}
      >
        ✕
      </button>
    </div>
  )
}
