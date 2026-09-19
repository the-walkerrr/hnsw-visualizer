import type { Graph, NodeId, Step, Vec } from '../../hnsw/types'
import type { GraphLabelScale } from '../../state/store'
import type { Projector } from '../project'

interface NodeSets {
  visited: Set<NodeId>
  cand: Set<NodeId>
  dyn: Set<NodeId>
  results: Set<NodeId>
  accepted: Set<NodeId>
  rejected: Set<NodeId>
}

export function Nodes({
  graph,
  layer,
  proj,
  step,
  sets,
  selected,
  labels,
  dragging,
  zoom,
  labelScale,
}: {
  graph: Graph
  layer: number
  proj: Projector
  step: Step | null
  sets: NodeSets
  selected: NodeId | null
  labels: boolean
  dragging: { id: NodeId; at: Vec; layer: number } | null
  zoom: number
  labelScale: GraphLabelScale
}) {
  const v = step?.vis
  const onLayer = [...graph.nodes.values()].filter((n) => n.level >= layer)
  const r = proj.nodeR
  const invZoom = 1 / Math.max(zoom, 0.0001)
  return (
    <g>
      {onLayer.map((n) => {
        const at = dragging?.id === n.id ? dragging.at : n.vec
        const [x, y] = proj.to(at, layer)
        const isCurrent = v?.current === n.id
        const isConsidering = v?.considering === n.id
        const isResult = sets.results.has(n.id)
        const isFocus = v?.focus === n.id
        const isEntry = graph.entry === n.id
        const inW = sets.dyn.has(n.id)
        const inC = sets.cand.has(n.id)
        const visited = sets.visited.has(n.id)
        const accepted = sets.accepted.has(n.id)
        const rejected = sets.rejected.has(n.id)

        let fill = 'var(--node-fill)'
        let stroke = 'var(--node)'
        let width = 1.4
        let radius = r
        if (visited) stroke = 'var(--c-visited)'
        if (inC) {
          stroke = 'var(--c-cand)'
          width = 1.9
        }
        if (accepted) {
          stroke = 'var(--c-result)'
          width = 2.2
        }
        if (rejected) {
          stroke = 'var(--c-reject)'
          width = 2
        }
        if (isResult) {
          fill = 'var(--c-result)'
          stroke = 'var(--c-result)'
        }
        if (isConsidering) {
          stroke = 'var(--c-current)'
          width = 2.2
        }
        if (isCurrent) {
          fill = 'var(--c-current)'
          stroke = 'var(--c-current)'
          radius = r + 1.6
        }
        const showLabel =
          labels ||
          isCurrent ||
          isConsidering ||
          isResult ||
          isFocus ||
          isEntry ||
          inW ||
          accepted ||
          rejected

        return (
          <g key={n.id}>
            <g transform={`translate(${x} ${y})`}>
              <g transform={`scale(${invZoom})`}>
                {inW && (
                  <circle
                    cx={0}
                    cy={0}
                    r={radius + 3.4}
                    fill="none"
                    stroke="var(--c-w)"
                    strokeWidth={1.6}
                  />
                )}
                {isEntry && (
                  <circle
                    cx={0}
                    cy={0}
                    r={radius + 6}
                    fill="none"
                    stroke="var(--c-entry)"
                    strokeWidth={2.2}
                  />
                )}
                {isFocus && (
                  <circle
                    cx={0}
                    cy={0}
                    r={radius + 8.5}
                    fill="none"
                    stroke="var(--c-query)"
                    strokeWidth={1.6}
                    strokeDasharray="3 3"
                  />
                )}
                {selected === n.id && (
                  <circle
                    cx={0}
                    cy={0}
                    r={radius + 5}
                    fill="none"
                    stroke="var(--text-1)"
                    strokeWidth={1.4}
                  />
                )}
                <circle
                  cx={0}
                  cy={0}
                  r={radius}
                  fill={n.deleted ? 'url(#tomb)' : fill}
                  stroke={stroke}
                  strokeWidth={width}
                  strokeDasharray={n.deleted ? '3 2' : undefined}
                  opacity={n.deleted ? 0.85 : 1}
                />
                {showLabel && (
                  <text
                    x={radius + 3}
                    y={-radius - 1}
                    fontSize={(proj.stacked ? 13 : 11) * labelScale}
                    fontFamily="var(--mono)"
                    fill={isCurrent || isResult || isFocus ? 'var(--text-1)' : 'var(--text-2)'}
                    fontWeight={isCurrent || isResult || isFocus || isEntry ? 600 : 400}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            </g>
          </g>
        )
      })}
    </g>
  )
}
