export function DistLine({ a, b }: { a: [number, number]; b: [number, number] | null }) {
  if (!b) return null
  return (
    <line
      x1={a[0]}
      y1={a[1]}
      x2={b[0]}
      y2={b[1]}
      stroke="var(--c-query)"
      strokeWidth={1.4}
      strokeDasharray="4 3"
      opacity={0.85}
      vectorEffect="non-scaling-stroke"
    />
  )
}
