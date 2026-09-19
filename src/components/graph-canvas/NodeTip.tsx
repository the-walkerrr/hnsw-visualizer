import { distance } from '../../hnsw/metric'
import type { Graph, HNode, Step } from '../../hnsw/types'
import { f1 } from './format'
import type { Hover } from './GraphCanvas'

export function NodeTip({
  node,
  graph,
  hover,
  step,
  metric,
}: {
  node: HNode
  graph: Graph
  hover: Hover
  step: Step | null
  metric: 'euclidean' | 'manhattan' | 'cosine'
}) {
  const q = step?.vis.query
  const deg = node.neighbors.map((l) => l.length)
  return (
    <div
      className="node-tip"
      style={{
        left: Math.max(6, hover.sx + 14),
        top: Math.max(6, hover.sy - 10),
      }}
    >
      <b>{node.label}</b> {node.deleted && <span className="chip warn">tombstoned</span>}
      {graph.entry === node.id && <span className="chip accent">entry point</span>}
      <dl>
        <dt>vector</dt>
        <dd>
          [{node.vec[0].toFixed(0)}, {node.vec[1].toFixed(0)}]
        </dd>
        <dt>top layer</dt>
        <dd>{node.level}</dd>
        <dt>degree / layer</dt>
        <dd>{deg.join(' · ')}</dd>
        {q && (
          <>
            <dt>distance to query</dt>
            <dd>{f1(distance(q, node.vec, metric))}</dd>
          </>
        )}
      </dl>
    </div>
  )
}
