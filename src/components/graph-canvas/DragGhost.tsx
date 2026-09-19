import type { Graph, NodeId, Vec } from '../../hnsw/types'
import type { Projector } from '../project'

export function DragGhost({
  graph,
  drag,
  proj,
  layer,
  zoom,
}: {
  graph: Graph
  drag: { id: NodeId; at: Vec; layer: number }
  proj: Projector
  layer: number
  zoom: number
}) {
  const n = graph.nodes.get(drag.id)
  if (!n) return null
  const a = proj.to(n.vec, layer)
  const b = proj.to(drag.at, layer)
  const invZoom = 1 / Math.max(zoom, 0.0001)
  return (
    <g>
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke="var(--c-query)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <g transform={`translate(${b[0]} ${b[1]})`}>
        <g transform={`scale(${invZoom})`}>
          <circle cx={0} cy={0} r={proj.nodeR + 2} fill="none" stroke="var(--c-query)" strokeWidth={2} />
        </g>
      </g>
    </g>
  )
}
