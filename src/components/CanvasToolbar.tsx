import { editsLocked, useApp, useDispatch, useShownLayer, useViewGraph, type Tool } from '../state/store'

const LEGEND: Array<[string, string, string]> = [
  ['--c-query', 'target', 'Your search point'], ['--c-entry', 'start', 'Search starting point'],
  ['--c-current', 'checking', 'Dot being checked'], ['--c-cand', 'to check', 'Dots waiting to be checked'],
  ['--c-w', 'best so far', 'Closest dots found so far'], ['--c-result', 'matches', 'Returned matches'],
]

export function TraceLegend() {
  const { trace } = useApp()
  if (!trace) return null
  return <div className="legend" aria-label="Trace legend">{LEGEND.map(([color, label, title]) => <span key={label} title={title}><i style={{ background: `var(${color})` }} />{label}</span>)}</div>
}

function ToolIcon({ tool }: { tool: Tool }) {
  if (tool === 'search') return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="4.5"/><path d="m11.5 11.5 4 4"/></svg>
  if (tool === 'insert') return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 3 9 8-5 1-2 5Z"/></svg>
}

export function CanvasToolbar() {
  const state = useApp()
  const { viewMode, tool, trace } = state
  const locked = editsLocked(state)
  const graph = useViewGraph()
  const { layer } = useShownLayer()
  const dispatch = useDispatch()
  const top = graph.entry === null ? 0 : graph.topLayer

  return <>
    <div className="canvas-overlay tl">
      <div className="segmented" role="group" aria-label="Graph view">
        <button aria-pressed={viewMode === 'stack'} onClick={() => dispatch({ type: 'setViewMode', mode: 'stack' })}>All layers</button>
        <button aria-pressed={viewMode === 'layer'} onClick={() => dispatch({ type: 'setViewMode', mode: 'layer' })}>One layer</button>
      </div>
      {viewMode === 'layer' && <div className="segmented layer-picker" role="group" aria-label="Visible layer">
        {Array.from({ length: top + 1 }, (_, i) => top - i).map((l) => <button key={l} aria-pressed={layer === l} onClick={() => dispatch({ type: 'setLayer', layer: l })}>L{l}</button>)}
      </div>}
      {viewMode === 'layer' && trace && <span className="trace-lock">Trace controls layer</span>}
    </div>

    <div className="canvas-overlay tr">
      <div className="tool-selector" role="group" aria-label="Canvas tool">
        {(['search', 'insert', 'select'] as const).map((item) => <button key={item} className="tool-btn" disabled={locked} aria-pressed={tool === item} onClick={() => dispatch({ type: 'setTool', tool: item })} title={locked ? 'Finish or end the current operation to change tools' : item === 'search' ? 'Place a query' : item === 'insert' ? 'Add a vector' : 'Inspect or move a node'}><ToolIcon tool={item}/><span>{item === 'select' ? 'Inspect' : item}</span></button>)}
      </div>
    </div>

  </>
}
