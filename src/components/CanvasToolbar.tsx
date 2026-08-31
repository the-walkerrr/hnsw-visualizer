import { useApp, useDispatch, useShownLayer, useViewGraph, type Tool } from '../state/store'

const LEGEND: Array<[string, string, string]> = [
  ['--c-query', 'query', 'Query point'], ['--c-entry', 'entry', 'Search entry point'],
  ['--c-current', 'active', 'Node being expanded'], ['--c-cand', 'candidate', 'Queued candidate'],
  ['--c-w', 'beam', 'Current ef-best set'], ['--c-result', 'result', 'Returned neighbor'],
]

function ToolIcon({ tool }: { tool: Tool }) {
  if (tool === 'search') return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="4.5"/><path d="m11.5 11.5 4 4"/></svg>
  if (tool === 'insert') return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 3 9 8-5 1-2 5Z"/></svg>
}

export function CanvasToolbar() {
  const { viewMode, tool, trace } = useApp()
  const graph = useViewGraph()
  const { layer } = useShownLayer()
  const dispatch = useDispatch()
  const top = graph.entry === null ? 0 : graph.topLayer

  return <>
    <div className="canvas-overlay tl">
      <div className="segmented" role="group" aria-label="Graph view">
        <button aria-pressed={viewMode === 'stack'} onClick={() => dispatch({ type: 'setViewMode', mode: 'stack' })}>Hierarchy</button>
        <button aria-pressed={viewMode === 'layer'} onClick={() => dispatch({ type: 'setViewMode', mode: 'layer' })}>Single layer</button>
      </div>
      {viewMode === 'layer' && <div className="segmented layer-picker" role="group" aria-label="Visible layer">
        {Array.from({ length: top + 1 }, (_, i) => top - i).map((l) => <button key={l} aria-pressed={layer === l} onClick={() => dispatch({ type: 'setLayer', layer: l })}>L{l}</button>)}
      </div>}
      {viewMode === 'layer' && trace && <span className="trace-lock">Trace controls layer</span>}
    </div>

    <div className="canvas-overlay tr">
      <div className="tool-selector" role="group" aria-label="Canvas tool">
        {(['search', 'insert', 'select'] as const).map((item) => <button key={item} className="tool-btn" aria-pressed={tool === item} onClick={() => dispatch({ type: 'setTool', tool: item })} title={item === 'search' ? 'Place a query' : item === 'insert' ? 'Add a vector' : 'Inspect or move a node'}><ToolIcon tool={item}/><span>{item === 'select' ? 'Inspect' : item}</span></button>)}
      </div>
      <p className="toolbar-hint">{tool === 'search' ? 'Click to place a query' : tool === 'insert' ? 'Click to add a vector' : 'Click a node to inspect · drag to move'}</p>
    </div>

    {trace && <div className="canvas-overlay bl"><div className="legend" aria-label="Trace legend">{LEGEND.map(([color, label, title]) => <span key={label} title={title}><i style={{ background: `var(${color})` }} />{label}</span>)}</div></div>}
  </>
}
