import type { Graph } from '../../hnsw/types'
import type { Projector } from '../project'

export function Verticals({ graph, layer, proj }: { graph: Graph; layer: number; proj: Projector }) {
  return (
    <g stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 4" opacity={0.7}>
      {[...graph.nodes.values()]
        .filter((n) => n.level >= layer)
        .map((n) => {
          const a = proj.to(n.vec, layer)
          const b = proj.to(n.vec, layer - 1)
          return (
            <line
              key={n.id}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
    </g>
  )
}
