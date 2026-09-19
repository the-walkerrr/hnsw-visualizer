import { useState } from 'react'
import { ChartShell } from './ChartShell'
import { FRAME } from './frame'

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
  highlightX,
  xTitle = 'Setting', yTitle = 'Measurement',
}: {
  title: string
  note?: string
  xTitle?: string
  yTitle?: string
  points: Point[]
  yMax?: number
  yFormat?: (v: number) => string
  xFormat?: (v: number) => string
  yTicks?: number
  color?: string
  /** A reference threshold drawn as a dashed line, e.g. the cost of an exact scan. */
  rule?: { at: number; label: string }
  /** Outline one tested value, normally the app's current setting. */
  highlightX?: number
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
              <th>{xTitle}</th>
              <th>{yTitle}</th>
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
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${title}. Horizontal axis: ${xTitle}. Vertical axis: ${yTitle}.`} onMouseLeave={() => setHi(null)}>
        <title>{title}</title>
        <desc>{yTitle} plotted against {xTitle}. {highlightX === undefined ? '' : `${highlightX} is the current setting.`}</desc>
        <g className="grid">
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const v = (top * i) / yTicks
            return <line key={i} x1={pad.l} y1={py(v)} x2={w - pad.r} y2={py(v)} opacity={i === 0 ? 1 : 0.6} />
          })}
        </g>
        <g className="axis">
          <line className="axis-line" x1={pad.l} y1={pad.t} x2={pad.l} y2={h - pad.b} />
          <line className="axis-line" x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} />
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
          <text className="axis-title" data-axis="x" x={(pad.l + w - pad.r) / 2} y={h - 4} textAnchor="middle">{xTitle}</text>
          <text className="axis-title" data-axis="y" x={-(pad.t + h - pad.b) / 2} y={11} textAnchor="middle" transform="rotate(-90)">{yTitle}</text>
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
          <g key={p.x}>
            {p.x === highlightX && <circle className="current-setting-ring" cx={cx(i)} cy={py(p.y)} r={7} fill="none" stroke={color} strokeWidth={1.5} />}
            <circle
              cx={cx(i)}
              cy={py(p.y)}
              r={hi === i ? 4.5 : 3}
              fill={color}
              stroke="var(--surface-1)"
              strokeWidth={2}
            />
          </g>
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
