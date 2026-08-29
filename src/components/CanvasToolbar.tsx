import { useApp, useDispatch, useShownLayer, useViewGraph } from '../state/store'

// Compact labels with the full explanation on hover: the legend sits inside the
// canvas, so every row it takes is a row the graph loses.
const LEGEND: Array<[string, string, string]> = [
  ['--c-query', 'q', 'the query point (crosshair)'],
  ['--c-entry', 'entry', 'entry point — every search starts here'],
  ['--c-current', 'now', 'the node whose neighbours are being scanned right now'],
  ['--c-cand', 'in C', 'a queued candidate, still to be expanded'],
  ['--c-w', 'in W', 'currently one of the ef best found (outer ring)'],
  ['--c-result', 'result', 'returned to the caller, or an edge just created'],
]

export function CanvasToolbar() {
  const { viewMode, tool, trace } = useApp()
  const graph = useViewGraph()
  const { layer } = useShownLayer()
  const dispatch = useDispatch()
  const top = graph.entry === null ? 0 : graph.topLayer
  const toolHint =
    tool === 'insert'
      ? 'Insert: click a spot to place a new vector there.'
      : 'Search: click a spot to find its nearest stored neighbours.'

  return (
    <>
      <div className="canvas-overlay tl">
        <div className="segmented" role="group" aria-label="View">
          {(['stack', 'layer'] as const).map((m) => (
            <button
              key={m}
              aria-pressed={viewMode === m}
              title={
                m === 'stack'
                  ? 'All layers at once, as stacked planes'
                  : 'One layer at a time, straight on'
              }
              onClick={() => dispatch({ type: 'setViewMode', mode: m })}
            >
              {m === 'stack' ? 'all layers' : 'single layer'}
            </button>
          ))}
        </div>
        {viewMode === 'layer' && (
          <div className="segmented" role="group" aria-label="Layer">
            {Array.from({ length: top + 1 }, (_, i) => top - i).map((l) => (
              <button
                key={l}
                aria-pressed={layer === l}
                onClick={() => dispatch({ type: 'setLayer', layer: l })}
              >
                L{l}
              </button>
            ))}
          </div>
        )}
        {viewMode === 'layer' && trace && (
          <span className="chip" title="While an operation is loaded the view follows the step">
            follows trace
          </span>
        )}
      </div>

      <div className="canvas-overlay tr">
        <div className="tool-selector" role="group" aria-label="Tool">
          {(['search', 'insert'] as const).map((t) => (
            <button
              key={t}
              className={`tool-btn${tool === t ? ' active' : ''}`}
              aria-pressed={tool === t}
              onClick={() => dispatch({ type: 'setTool', tool: t })}
              title={
                t === 'search'
                  ? 'Search: Click canvas to find nearest vectors'
                  : 'Insert: Click canvas to add a new vector'
              }
            >
              <span className="tool-icon">
                {t === 'search' ? '🔍' : '➕'}
              </span>
              <span className="tool-label">
                {t === 'search' ? 'Search' : 'Insert'}
              </span>
            </button>
          ))}
        </div>
        <div className="toolbar-hint">{toolHint}</div>
      </div>

      <div className="canvas-overlay bl">
        <div className="legend">
          {LEGEND.map(([v, label, title]) => (
            <span key={label} title={title}>
              <i style={{ background: `var(${v})` }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
