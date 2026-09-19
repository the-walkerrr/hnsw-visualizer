import { useState, type ReactNode } from 'react'

/** Two small chart primitives, built to the house rules: one measure per axis,
 *  a single series per chart (so no legend is needed — the title names it),
 *  recessive grid, thin marks, and a hover layer on every chart. */

export function ChartShell({
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
