import { useState, type ReactNode } from 'react'

/** Two small chart primitives, built to the house rules: one measure per axis,
 *  a single series per chart (so no legend is needed — the title names it),
 *  recessive grid, thin marks, and a hover layer on every chart. */

interface Frame {
  w: number
  h: number
  pad: { t: number; r: number; b: number; l: number }
}

const FRAME: Frame = { w: 320, h: 128, pad: { t: 8, r: 10, b: 20, l: 34 } }

function ChartShell({
  title,
  note,
  children,
  table,
}: {
  title: string
  note?: string
  children: ReactNode
  table?: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <div className="chart">
      <div className="chart-head">
        <h4>{title}</h4>
        {table ? (
          <button
            className="chip"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            title="Show the numbers"
          >
            {showTable ? 'chart' : 'table'}
          </button>
        ) : (
          note && <span>{note}</span>
        )}
      </div>
      {note && table && <div className="chart-head"><span>{note}</span></div>}
      {showTable && table ? table : children}
    </div>
  )
}

export interface Point {
  x: number
  y: number
}

export function LineChart({
  title,
  note,
  points,
  yMax,
  yFormat = (v: number) => String(Math.round(v)),
  xFormat = (v: number) => String(v),
  yTicks = 3,
  color = 'var(--blue)',
  rule,
  xScale = 'linear',
}: {
  title: string
  note?: string
  points: Point[]
  yMax?: number
  yFormat?: (v: number) => string
  xFormat?: (v: number) => string
  yTicks?: number
  color?: string
  /** A reference threshold drawn as a dashed line, e.g. the cost of an exact scan. */
  rule?: { at: number; label: string }
  /** 'ordinal' spaces the points evenly — right when x is a doubling sequence,
   *  where a linear axis crushes the low end into an unreadable smear. */
  xScale?: 'linear' | 'ordinal'
}) {
  const [hi, setHi] = useState<number | null>(null)
  const { w, h, pad } = FRAME
  if (points.length === 0) return <ChartShell title={title} note={note}><div className="empty">no data yet</div></ChartShell>
  const xs = points.map((p, i) => (xScale === 'ordinal' ? i : p.x))
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const top =
    yMax ?? (Math.max(...points.map((p) => p.y), rule?.at ?? 0) * 1.08 || 1)
  const px = (x: number) => pad.l + ((x - x0) / Math.max(x1 - x0, 1e-9)) * (w - pad.l - pad.r)
  const cx = (i: number) => px(xScale === 'ordinal' ? i : points[i].x)
  const py = (y: number) => h - pad.b - (y / top) * (h - pad.t - pad.b)
  const path = points
    .map((p, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${py(p.y).toFixed(1)}`)
    .join(' ')
  const active = hi === null ? null : points[hi]

  return (
    <ChartShell
      title={title}
      note={note}
      table={
        <table className="table">
          <thead>
            <tr>
              <th>x</th>
              <th>value</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.x}>
                <td>{xFormat(p.x)}</td>
                <td>{yFormat(p.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <svg viewBox={`0 0 ${w} ${h}`} onMouseLeave={() => setHi(null)}>
        <g className="grid">
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const v = (top * i) / yTicks
            return <line key={i} x1={pad.l} y1={py(v)} x2={w - pad.r} y2={py(v)} opacity={i === 0 ? 1 : 0.6} />
          })}
        </g>
        <g className="axis">
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const v = (top * i) / yTicks
            return (
              <text key={i} x={pad.l - 5} y={py(v) + 3} textAnchor="end">
                {yFormat(v)}
              </text>
            )
          })}
          {points.map((p, i) =>
            i === 0 || i === points.length - 1 || points.length <= 8 || i % 2 === 0 ? (
              <text key={p.x} x={cx(i)} y={h - pad.b + 12} textAnchor="middle">
                {xFormat(p.x)}
              </text>
            ) : null,
          )}
        </g>
        {rule && rule.at <= top && (
          <g>
            <line
              x1={pad.l}
              y1={py(rule.at)}
              x2={w - pad.r}
              y2={py(rule.at)}
              stroke="var(--text-3)"
              strokeWidth={1.2}
              strokeDasharray="4 4"
            />
            <text className="mark-label" x={w - pad.r} y={py(rule.at) - 4} textAnchor="end">
              {rule.label}
            </text>
          </g>
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={p.x}
            cx={cx(i)}
            cy={py(p.y)}
            r={hi === i ? 4.5 : 2.6}
            fill={color}
            stroke="var(--surface-1)"
            strokeWidth={2}
          />
        ))}
        {points.map((p, i) => (
          <rect
            key={`hit${p.x}`}
            x={cx(i) - 10}
            y={pad.t}
            width={20}
            height={h - pad.t - pad.b}
            fill="transparent"
            onMouseEnter={() => setHi(i)}
          />
        ))}
        {active && hi !== null && (
          <g>
            <line
              x1={cx(hi)}
              y1={pad.t}
              x2={cx(hi)}
              y2={h - pad.b}
              stroke="var(--line-strong)"
              strokeWidth={1}
            />
            <text
              className="mark-label"
              x={Math.min(cx(hi) + 6, w - pad.r - 40)}
              y={Math.max(py(active.y) - 7, pad.t + 8)}
            >
              {xFormat(active.x)} → {yFormat(active.y)}
            </text>
          </g>
        )}
      </svg>
    </ChartShell>
  )
}

export function BarChart({
  title,
  note,
  bars,
  format = (v: number) => String(Math.round(v)),
  color = 'var(--blue)',
  horizontal = false,
}: {
  title: string
  note?: string
  bars: Array<{ label: string; value: number; color?: string }>
  format?: (v: number) => string
  color?: string
  horizontal?: boolean
}) {
  const [hi, setHi] = useState<number | null>(null)
  if (bars.length === 0)
    return (
      <ChartShell title={title} note={note}>
        <div className="empty">no data yet</div>
      </ChartShell>
    )
  const max = Math.max(...bars.map((b) => b.value), 1)

  if (horizontal) {
    const rowH = 22
    const h = bars.length * rowH + 6
    const w = 320
    const labelW = 64
    return (
      <ChartShell title={title} note={note} table={<BarTable bars={bars} format={format} />}>
        <svg viewBox={`0 0 ${w} ${h}`} onMouseLeave={() => setHi(null)}>
          {bars.map((b, i) => {
            const len = (b.value / max) * (w - labelW - 52)
            return (
              <g key={b.label} onMouseEnter={() => setHi(i)}>
                <text x={labelW - 6} y={i * rowH + 15} textAnchor="end" className="mark-label">
                  {b.label}
                </text>
                <rect
                  x={labelW}
                  y={i * rowH + 5}
                  width={Math.max(len, 1.5)}
                  height={12}
                  rx={4}
                  fill={b.color ?? color}
                  opacity={hi === null || hi === i ? 1 : 0.55}
                />
                <text x={labelW + len + 6} y={i * rowH + 15} className="mark-label">
                  {format(b.value)}
                </text>
              </g>
            )
          })}
        </svg>
      </ChartShell>
    )
  }

  const { w, h, pad } = FRAME
  const slot = (w - pad.l - pad.r) / bars.length
  const bw = Math.max(Math.min(slot - 4, 26), 3)
  return (
    <ChartShell title={title} note={note} table={<BarTable bars={bars} format={format} />}>
      <svg viewBox={`0 0 ${w} ${h}`} onMouseLeave={() => setHi(null)}>
        <g className="grid">
          <line x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} />
        </g>
        <g className="axis">
          <text x={pad.l - 5} y={pad.t + 6} textAnchor="end">
            {format(max)}
          </text>
          <text x={pad.l - 5} y={h - pad.b + 3} textAnchor="end">
            0
          </text>
        </g>
        {bars.map((b, i) => {
          const bh = (b.value / max) * (h - pad.t - pad.b)
          const x = pad.l + i * slot + (slot - bw) / 2
          return (
            <g key={b.label} onMouseEnter={() => setHi(i)}>
              <rect
                x={x}
                y={h - pad.b - bh}
                width={bw}
                height={Math.max(bh, 0.8)}
                rx={Math.min(4, bw / 2)}
                fill={b.color ?? color}
                opacity={hi === null || hi === i ? 1 : 0.55}
              />
              <rect x={x - 2} y={pad.t} width={bw + 4} height={h - pad.t - pad.b} fill="transparent" />
              {(bars.length <= 12 || hi === i) && (
                <text className="mark-label" x={x + bw / 2} y={h - pad.b + 12} textAnchor="middle">
                  {b.label}
                </text>
              )}
              {hi === i && (
                <text
                  className="mark-label"
                  x={x + bw / 2}
                  y={h - pad.b - bh - 4}
                  textAnchor="middle"
                >
                  {format(b.value)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </ChartShell>
  )
}

function BarTable({
  bars,
  format,
}: {
  bars: Array<{ label: string; value: number }>
  format: (v: number) => string
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>bin</th>
          <th>value</th>
        </tr>
      </thead>
      <tbody>
        {bars.map((b) => (
          <tr key={b.label}>
            <td>{b.label}</td>
            <td>{format(b.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
