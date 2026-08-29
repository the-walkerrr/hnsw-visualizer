import { listingById, listingIdForLine } from '../hnsw/pseudocode'
import { useApp } from '../state/store'

const TOOL_HINT: Record<string, { headline: string; body: string }> = {
  search: {
    headline: 'Search mode: click the canvas to ask “what is closest here?”',
    body: 'HNSW starts from the entry point, makes long jumps on upper layers, then refines near the target on layer 0. It avoids checking most of the graph.',
  },
  insert: {
    headline: 'Insert mode: click the canvas to add a new vector',
    body: 'HNSW rolls a random height for the new vector, then searches each layer to find good neighbours. This is the easiest way to see how the hierarchy is built.',
  },
}

export function Explainer({ onOpenExplanation }: { onOpenExplanation?: () => void }) {
  const { trace, step, tool, params, k } = useApp()
  const current = trace?.steps[step]
  const total = trace?.steps.length ?? 0

  if (!current || !trace) {
    const hint = TOOL_HINT[tool] ?? TOOL_HINT.search
    return (
      <div className="explainer idle">
        <div className="head">
          <h3>{hint.headline}</h3>
          <span className="chip">
            ef = {params.efSearch} · k = {k} · M = {params.M}
          </span>
        </div>
        <p>{hint.body}</p>
        <div className="explainer-guide">
          <span>1. Click the canvas or run a sample action.</span>
          <span>2. Replay the steps just above this panel.</span>
          <span>3. Open Stats to compare HNSW with exact scan.</span>
        </div>
        {onOpenExplanation && (
          <button className="learn-link" onClick={onOpenExplanation}>
            New here? Read the beginner guide first →
          </button>
        )}
      </div>
    )
  }

  const listing = listingById(listingIdForLine(current.line))
  return (
    <div className="explainer">
      <div className="head">
        <h3>{current.title}</h3>
        <span className="chip accent">{listing.title}</span>
        <span className="chip">step {step + 1}/{total}</span>
        {current.vis.layer !== null && <span className="chip">layer {current.vis.layer}</span>}
        <span className="chip" title="Distance computations charged so far">
          {current.distCalls} dist
        </span>
        {current.weight === 'minor' && <span className="chip">detail</span>}
      </div>
      <p>{current.detail}</p>
      {onOpenExplanation && <button className="learn-link" onClick={onOpenExplanation}>See this in the full explanation →</button>}
    </div>
  )
}
