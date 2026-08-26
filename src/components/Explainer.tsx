import { listingById, listingIdForLine } from '../hnsw/pseudocode'
import { useApp } from '../state/store'

const TOOL_HINT: Record<string, string> = {
  search: 'Click anywhere on the canvas to run a k-NN search from that point.',
  insert: 'Click anywhere to insert a new vector there and watch it wire itself in.',
  select: 'Click a node to inspect it. Drag it to move the vector and trigger an update.',
}

export function Explainer() {
  const { trace, step, tool, params, k } = useApp()
  const current = trace?.steps[step]

  if (!current || !trace) {
    return (
      <div className="explainer idle">
        <div className="head">
          <h3>Nothing running</h3>
          <span className="chip">
            ef<sub>search</sub> = {params.efSearch} · k = {k} · M = {params.M}
          </span>
        </div>
        <p>{TOOL_HINT[tool]}</p>
      </div>
    )
  }

  const listing = listingById(listingIdForLine(current.line))
  return (
    <div className="explainer">
      <div className="head">
        <h3>{current.title}</h3>
        <span className="chip accent">{listing.title}</span>
        {current.vis.layer !== null && <span className="chip">layer {current.vis.layer}</span>}
        <span className="chip" title="Distance computations charged so far">
          {current.distCalls} dist
        </span>
        {current.weight === 'minor' && <span className="chip">detail</span>}
      </div>
      <p>{current.detail}</p>
    </div>
  )
}
