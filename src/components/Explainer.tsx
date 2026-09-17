import { useState } from 'react'
import { useApp, useDispatch } from '../state/store'
import { distance } from '../hnsw/metric'
import { RichText } from './RichText'

const TOOL_HINT: Record<string, { headline: string; body: string }> = {
  search: {
    headline: 'Click anywhere to find nearby dots.',
    body: 'The pink cross is your target. Follow the search down through the layers to the green matches.',
  },
  insert: {
    headline: 'Click anywhere to add a dot.',
    body: 'Watch it find neighbors and make connections to the map.',
  },
  select: {
    headline: 'Click a dot to look inside.',
    body: 'Moving a dot rebuilds its links and draws its highest layer again. Drag direction does not choose its layer.',
  },
}

export function Explainer({ onOpenExplanation, collapsed: controlledCollapsed, onCollapsedChange }: { onOpenExplanation?: () => void; collapsed?: boolean; onCollapsedChange?: (collapsed: boolean) => void }) {
  const { trace, step, tool, rightTab, params, selected } = useApp()
  const dispatch = useDispatch()
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const collapsed = controlledCollapsed ?? localCollapsed
  const setCollapsed = (next: boolean) => {
    if (onCollapsedChange) onCollapsedChange(next)
    else setLocalCollapsed(next)
  }
  const current = trace?.steps[step]
  const collapseButton = (
    <button
      className="explainer-collapse-toggle"
      aria-label={collapsed ? 'Expand explanation' : 'Collapse explanation'}
      aria-expanded={!collapsed}
      title={collapsed ? 'Expand explanation' : 'Collapse explanation'}
      onClick={() => setCollapsed(!collapsed)}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d={collapsed ? 'm5 12 5-5 5 5' : 'm5 8 5 5 5-5'}/></svg>
    </button>
  )

  if (!current || !trace) {
    const hint = TOOL_HINT[tool] ?? TOOL_HINT.search
    return (
      <div className={`explainer idle${collapsed ? ' collapsed' : ''}`}>
        <div className="head">
          {collapseButton}
          <span className="step-marker">Ready</span>
          <h3>{hint.headline}</h3>
        </div>
        {!collapsed && <p>{hint.body}</p>}
        {!collapsed && onOpenExplanation && (
          <button className="learn-link" onClick={onOpenExplanation}>
            Learn the basics →
          </button>
        )}
      </div>
    )
  }

  const dot = (id: number | undefined) => id === undefined ? 'this dot' : `dot ${current.graph.nodes.get(id)?.label ?? id}`
  const considered = current.graph.nodes.get(current.vis.considering!)
  const farthest = current.graph.nodes.get(current.vis.dynamic.at(-1)!)
  const query = current.vis.query
  const metric = current.vis.searchMetric ?? params.metric
  const rejectionComparison = considered && farthest && query
    ? `This dot is ${distance(considered.vec, query, metric).toFixed(2)} from the target—not closer than the farthest best candidate (${distance(farthest.vec, query, metric).toFixed(2)}).`
    : 'This dot is not closer to the target than the farthest best candidate.'
  const searchCopy: Record<string, { title: string; detail: string }> = {
    k2: { title: current.graph.entry === null ? 'No dots to search yet.' : 'Start at the top of the map.', detail: current.graph.entry === null ? 'Add some dots in Insert first.' : 'Every search starts at the same dot on the highest layer. From here, it looks for routes toward your target.' },
    s2: { title: `Search layer ${current.vis.layer}.`, detail: current.vis.layer === 0 ? `This layer holds every dot. Keep up to ${current.vis.searchEf ?? 1} possible matches in the shortlist while exploring their links.` : 'Use the shortcuts on this layer to get closer to your target.' },
    s9: { title: `Follow the connections from ${dot(current.vis.current)}.`, detail: 'This is the closest dot still waiting to be checked. Look at its neighbors for a better match.' },
    s10: { title: `Skip ${dot(current.vis.considering)}.`, detail: 'It was already checked on this layer. Skipping it avoids going around in circles.' },
    s13: { title: `Keep ${dot(current.vis.considering)} as a possible match.`, detail: 'There is room for this route, or it improves on the farthest dot currently kept. The search may check its connections next.' },
    s12: { title: `Skip ${dot(current.vis.considering)}.`, detail: `The best-found list is full. ${rejectionComparison} The search continues with its other open routes.` },
    s8: { title: 'Stop exploring this layer.', detail: 'The next dot waiting to be checked is farther away than the matches already kept. The search stops here to save work.' },
    s15: { title: `Finished checking layer ${current.vis.layer}.`, detail: current.vis.layer === 0 ? 'The search has a shortlist. Next, return the closest matches from it.' : 'Keep the closest dot found here as the starting point for the next layer.' },
    k4: { title: 'Move down one layer.', detail: 'Use the best position found so far. The next layer has more dots for a closer look.' },
    k6: { title: `Found ${current.vis.results.length} ${current.vis.results.length === 1 ? 'match' : 'matches'}.`, detail: 'Green rings mark the returned dots. Open Details to inspect the graph structure that supported this search.' },
  }
  const insertCopy: Record<string, { title: string; detail: string }> = {
    i2: { title: 'Begin at the top of the existing graph.', detail: 'The new dot will follow the same path as a normal search until it reaches a useful neighborhood.' },
    i3: { title: 'Choose which layers will contain the new dot.', detail: 'Most dots stay near the bottom. A random few also appear above it and become useful shortcuts.' },
    i6: { title: 'Move toward the new dot’s neighborhood.', detail: 'Follow the upper-layer shortcuts before making any new connections.' },
    i10: { title: 'Connect the new dot to useful nearby dots.', detail: 'The search found possible neighbors. Keep a small set of links that make the graph easy to navigate.' },
    i12: { title: 'Keep the connections within their limit.', detail: 'If an existing dot becomes crowded, remove a less useful link.' },
    i13: { title: 'Keep the connections within their limit.', detail: 'If an existing dot becomes crowded, remove a less useful link.' },
    i14: { title: 'Continue on the next layer.', detail: 'Use the neighborhood just found as the starting area below.' },
    i15: { title: 'The new dot is ready.', detail: 'It now belongs to the graph and can help later searches find their way.' },
    n2: { title: 'Choose the new dot’s links.', detail: 'Consider nearby dots first, while avoiding a group of links that all lead in the same direction.' },
    h2: { title: 'Compare the possible links.', detail: 'A useful connection should be close and should open a route that is not already covered.' },
    h3: { title: 'Look one step farther.', detail: 'Nearby connections can reveal another useful direction.' },
    h8: { title: `Keep ${dot(current.vis.considering)} as a neighbor.`, detail: 'This link adds a useful route to the graph.' },
    h9: { title: `Skip ${dot(current.vis.considering)} as a neighbor.`, detail: 'Another chosen link already covers this direction.' },
    h11: { title: 'Use an open connection slot.', detail: 'A previously skipped nearby dot can fill space that would otherwise remain empty.' },
    h12: { title: 'The new links are ready.', detail: 'The graph now has a small set of useful routes around this dot.' },
  }
  const insertionLevel = current.line === 'i3' && rightTab !== 'code'
  const inserted = current.graph.nodes.get(current.vis.focus!)
  const updateDone = trace.op === 'update-reinsert' && step === trace.steps.length - 1
  const movedId = selected ?? trace.steps[0]?.vis.focus
  const before = trace.steps[0]?.graph.nodes.get(movedId!)
  const after = current.graph.nodes.get(movedId!)
  const copy = rightTab !== 'code' ? searchCopy[current.line] ?? (trace.op === 'insert' ? insertCopy[current.line] : undefined) : undefined
  return (
    <div className={`explainer${collapsed ? ' collapsed' : ''}`}>
      <div className="head">
        {collapseButton}
        <span className="step-marker">{step + 1}</span>
        <h3>{updateDone ? 'Dot moved: position, links, and random level updated.' : copy?.title ?? current.title}</h3>
        <span className="trace-meta">{current.distCalls} distance checks</span>
      </div>
      {!collapsed && <p><RichText text={updateDone && before && after
        ? `Dot ${after.label} moved from [${before.vec.map(v => v.toFixed(1)).join(', ')}] to [${after.vec.map(v => v.toFixed(1)).join(', ')}]. Highest layer: ${before.level} → ${after.level}. Re-insertion draws the level again; position does not choose it.`
        : insertionLevel && inserted ? `A random draw put ${inserted.label} on layers 0 through ${inserted.level}. Upper layers contain fewer dots. This choice is independent of the dot’s numbers or meaning.`
        : copy?.detail ?? current.detail} /></p>}
      {!collapsed && insertionLevel && <details className="caption-detail"><summary>How the random level is calculated</summary><p><RichText text={current.detail}/></p></details>}
      {!collapsed && updateDone && <button className="learn-link" onClick={() => dispatch({ type: 'seek', index: Math.max(0, trace.steps.findIndex(s => s.line === 'i3')) })}>Inspect the new level decision →</button>}
    </div>
  )
}
