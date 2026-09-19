import { useApp } from '../../state/store'

const LEGEND: Array<[string, string, string]> = [
  ['--c-query', 'target', 'Your search point'], ['--c-entry', 'start', 'Search starting point'],
  ['--c-current', 'checking now', 'Dot being checked'], ['--c-cand', 'still to check', 'Dots waiting to be checked'],
  ['--c-w', 'best found', 'Closest dots found so far'], ['--c-result', 'matches', 'Returned matches'],
]

export function TraceLegend() {
  const { trace } = useApp()
  if (!trace) return <div className="legend" aria-label="Graph key"><span>Dot = item · line = link · label = item ID</span></div>
  const items = trace.op === 'search' ? LEGEND : [
    ['--c-query', 'new / moved dot', 'The vector being added or moved'],
    ...LEGEND.slice(1, 5), ['--c-result', 'chosen links', 'Neighbors selected for a connection'], ['--c-reject', 'rejected', 'Candidate or link not kept'],
  ]
  return <div className="legend" aria-label="Trace legend">{items.map(([color, label, title]) => <span key={label} title={title}><i style={{ background: `var(${color})` }} />{label}</span>)}</div>
}
