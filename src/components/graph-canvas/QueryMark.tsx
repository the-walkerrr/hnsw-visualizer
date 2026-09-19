import type { Vec } from '../../hnsw/types'
import type { GraphLabelScale } from '../../state/store'
import type { Projector } from '../project'

export function QueryMark({ at, layer, proj, zoom, labelScale }: { at: Vec; layer: number; proj: Projector; zoom: number; labelScale: GraphLabelScale }) {
  const [x, y] = proj.to(at, layer)
  const s = proj.nodeR * 1.8
  const invZoom = 1 / Math.max(zoom, 0.0001)
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`scale(${invZoom})`} stroke="var(--c-query)" strokeWidth={2.4}>
        <line x1={-s} y1={0} x2={s} y2={0} />
        <line x1={0} y1={-s} x2={0} y2={s} />
        <circle cx={0} cy={0} r={proj.nodeR * 1.15} fill="var(--c-query)" stroke="none" />
        <text
          x={s + 3}
          y={s + 3}
          fontSize={12 * labelScale}
          fontFamily="var(--mono)"
          fill="var(--c-query)"
          stroke="none"
          fontWeight={600}
        >
          target
        </text>
      </g>
    </g>
  )
}
