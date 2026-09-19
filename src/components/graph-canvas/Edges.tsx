import { useMemo } from 'react'
import { edgesOnLayer } from '../../hnsw/graph'
import type { Graph, NodeId, Step } from '../../hnsw/types'
import type { Projector } from '../project'

const key = ([a, b]: [NodeId, NodeId]) => (a < b ? `${a}:${b}` : `${b}:${a}`)

export function Edges({
  graph,
  layer,
  proj,
  step,
}: {
  graph: Graph
  layer: number
  proj: Projector
  step: Step | null
}) {
  const edges = useMemo(() => edgesOnLayer(graph, layer), [graph, layer])
  const newKeys = new Set((step?.vis.newEdges ?? []).map(key))
  const current = step?.vis.current
  return (
    <g fill="none" strokeLinecap="round">
      {edges.map(([a, b]) => {
        const na = graph.nodes.get(a)
        const nb = graph.nodes.get(b)
        if (!na || !nb) return null
        const p = proj.to(na.vec, layer)
        const q = proj.to(nb.vec, layer)
        const isNew = newKeys.has(key([a, b]))
        const onCurrent = current !== undefined && (a === current || b === current)
        const stroke = isNew ? 'var(--c-result)' : onCurrent ? 'var(--c-current)' : 'var(--edge)'
        return (
          <line
            key={`${a}:${b}`}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            stroke={stroke}
            strokeWidth={isNew ? 2.8 : onCurrent ? 2.2 : 1.3}
            opacity={isNew || onCurrent ? 1 : 0.9}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </g>
  )
}
