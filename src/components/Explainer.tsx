import { listingById, listingIdForLine } from '../hnsw/pseudocode'
import { useApp } from '../state/store'
import { RichText } from './RichText'

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
          <span className="step-marker">Ready</span>
          <h3>{hint.headline}</h3>
          <span className="trace-meta">ef {params.efSearch} · k {k} · M {params.M}</span>
        </div>
        <p>{hint.body}</p>
        {onOpenExplanation && (
          <button className="learn-link" onClick={onOpenExplanation}>
            Open the field guide →
          </button>
        )}
      </div>
    )
  }

  const listing = listingById(listingIdForLine(current.line))
  return (
    <div className="explainer">
      <div className="head">
        <span className="step-marker">{step + 1}</span>
        <h3>{current.title}</h3>
        <span className="trace-meta">{listing.title} · {step + 1}/{total}{current.vis.layer !== null ? ` · L${current.vis.layer}` : ''} · {current.distCalls} distances{current.weight === 'minor' ? ' · detail' : ''}</span>
      </div>
      <p><RichText text={current.detail} /></p>
      {onOpenExplanation && <button className="learn-link" onClick={onOpenExplanation}>See this in the full explanation →</button>}
    </div>
  )
}
