import { useState } from 'react'
import { ChartShell } from './ChartShell'
import { BarTable } from './BarTable'
import { FRAME } from './frame'

export function BarChart({
  title,
  note,
  bars,
  format = (v: number) => String(Math.round(v)),
  color = 'var(--blue)',
  horizontal = false,
  labelTitle = 'Category', valueTitle = 'Measurement',
}: {
  title: string
  note?: string
  bars: Array<{ label: string; value: number; color?: string }>
  format?: (v: number) => string
  color?: string
  labelTitle?: string
  valueTitle?: string
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
    const rowH = 25
    const plotTop = 18
    const h = bars.length * rowH + 58
    const w = 340
    const labelW = 76
    const plotRight = w - 54
    const axisY = plotTop + bars.length * rowH + 2
    return (
      <ChartShell title={title} note={note} table={<BarTable bars={bars} format={format} labelTitle={labelTitle} valueTitle={valueTitle} />}>
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${title}. Categories: ${labelTitle}. Horizontal axis: ${valueTitle}.`} onMouseLeave={() => setHi(null)}>
          <title>{title}</title>
          <desc>{valueTitle} compared across {labelTitle.toLowerCase()} categories.</desc>
          <g className="axis">
            <text className="axis-title" data-axis="y" x={labelW - 7} y={10} textAnchor="end">{labelTitle}</text>
            <line className="axis-line" x1={labelW} y1={axisY} x2={plotRight} y2={axisY} />
            <text x={labelW} y={axisY + 12} textAnchor="middle">0</text>
            <text x={plotRight} y={axisY + 12} textAnchor="end">{format(max)}</text>
            <text className="axis-title" data-axis="x" x={(labelW + plotRight) / 2} y={h - 3} textAnchor="middle">{valueTitle}</text>
          </g>
          {bars.map((b, i) => {
            const len = (b.value / max) * (plotRight - labelW)
            return (
              <g key={b.label} onMouseEnter={() => setHi(i)}>
                <text x={labelW - 7} y={plotTop + i * rowH + 15} textAnchor="end" className="mark-label">
                  {b.label}
                </text>
                <rect
                  x={labelW}
                  y={plotTop + i * rowH + 5}
                  width={Math.max(len, 1.5)}
                  height={13}
                  rx={3}
                  fill={b.color ?? color}
                  opacity={hi === null || hi === i ? 1 : 0.55}
                />
                <text x={labelW + len + 6} y={plotTop + i * rowH + 15} className="mark-label value-label">
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
    <ChartShell title={title} note={note} table={<BarTable bars={bars} format={format} labelTitle={labelTitle} valueTitle={valueTitle} />}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${title}. Horizontal axis: ${labelTitle}. Vertical axis: ${valueTitle}.`} onMouseLeave={() => setHi(null)}>
        <title>{title}</title>
        <desc>{valueTitle} compared across {labelTitle.toLowerCase()} categories.</desc>
        <g className="grid">
          <line x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} />
        </g>
        <g className="axis">
          <line className="axis-line" x1={pad.l} y1={pad.t} x2={pad.l} y2={h - pad.b} />
          <line className="axis-line" x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} />
          <text x={pad.l - 5} y={pad.t + 6} textAnchor="end">
            {format(max)}
          </text>
          <text x={pad.l - 5} y={h - pad.b + 3} textAnchor="end">
            0
          </text>
          <text className="axis-title" data-axis="x" x={(pad.l + w - pad.r) / 2} y={h - 4} textAnchor="middle">{labelTitle}</text>
          <text className="axis-title" data-axis="y" x={-(pad.t + h - pad.b) / 2} y={11} textAnchor="middle" transform="rotate(-90)">{valueTitle}</text>
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
