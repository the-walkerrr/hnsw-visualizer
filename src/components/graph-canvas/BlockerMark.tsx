import type { GraphLabelScale } from '../../state/store'

export function BlockerMark({ a, b, labelScale }: { a: [number, number] | null; b: [number, number] | null; labelScale: GraphLabelScale }) {
  if (!a || !b) return null
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  return (
    <g>
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke="var(--c-reject)"
        strokeWidth={1.8}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={mx}
        y={my - 4}
        fontSize={12 * labelScale}
        fontWeight={700}
        fill="var(--c-reject)"
        textAnchor="middle"
      >
        ✕
      </text>
    </g>
  )
}
