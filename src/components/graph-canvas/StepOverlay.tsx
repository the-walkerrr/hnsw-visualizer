import type { Graph, NodeId, Step } from '../../hnsw/types'
import type { GraphLabelScale } from '../../state/store'
import type { Projector } from '../project'
import { BlockerMark } from './BlockerMark'
import { DistLine } from './DistLine'

/** Step-specific decoration: dropped edges (which no longer exist in the
 *  snapshot), the "why was this pruned" line, and the beam radius. */
export function StepOverlay({
  graph,
  layer,
  proj,
  step,
  beam,
  labelScale,
}: {
  graph: Graph
  layer: number
  proj: Projector
  step: Step
  beam: number | null
  labelScale: GraphLabelScale
}) {
  const v = step.vis
  const pos = (id: NodeId) => {
    const n = graph.nodes.get(id)
    return n ? proj.to(n.vec, layer) : null
  }
  return (
    <g fill="none">
      {beam !== null && v.query && !proj.stacked && (
        <circle
          cx={proj.to(v.query, layer)[0]}
          cy={proj.to(v.query, layer)[1]}
          r={beam}
          stroke="var(--c-w)"
          strokeWidth={1.2}
          strokeDasharray="5 5"
          opacity={0.7}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {v.removedEdges.map(([a, b], i) => {
        const p = pos(a)
        const q = pos(b)
        if (!p || !q) return null
        return (
          <line
            key={`r${i}`}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            stroke="var(--c-reject)"
            strokeWidth={2}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {v.blocker !== undefined && v.considering !== undefined && (
        <BlockerMark a={pos(v.considering)} b={pos(v.blocker)} labelScale={labelScale} />
      )}
      {v.current !== undefined && v.query && (
        <DistLine a={proj.to(v.query, layer)} b={pos(v.current)} />
      )}
    </g>
  )
}
