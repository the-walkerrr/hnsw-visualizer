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
  const { trace, step, tool, rightTab, params, selected, guided } = useApp()
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
    ? `This dot is ${distance(considered.vec, query, metric).toFixed(2)} from the target—not closer than W’s farthest dot (${distance(farthest.vec, query, metric).toFixed(2)}).`
    : 'This dot is not closer to the target than W’s farthest dot.'
  const searchCopy: Record<string, { title: string; detail: string }> = {
    k2: { title: current.graph.entry === null ? 'No dots to search yet.' : 'Start at the top of the map.', detail: current.graph.entry === null ? 'Add some dots in Insert first.' : guided ? 'This example has only layer 0. Start at S (Slow drums). A is Acoustic guitar, B is Brass band, T is Trumpet solo; the pink target is the new song. Predict which linked song will be checked next, then press Next.' : 'Every search starts at the same dot on the highest layer. From here, it looks for routes toward your target.' },
    s2: { title: `Search layer ${current.vis.layer}.`, detail: current.vis.layer === 0 ? `This layer holds every dot. Keep up to ${current.vis.searchEf ?? 1} possible matches in the shortlist while exploring their links.` : 'Use the shortcuts on this layer to get closer to your target.' },
    s9: { title: `Follow the connections from ${dot(current.vis.current)}.`, detail: 'This is the closest dot still waiting to be checked. Look at its neighbors for a better match.' },
    s10: { title: `Skip ${dot(current.vis.considering)}.`, detail: 'It was already checked on this layer. Skipping it avoids going around in circles.' },
    s13: { title: `Keep ${dot(current.vis.considering)} as a possible match.`, detail: current.detail },
    s12: { title: `Skip ${dot(current.vis.considering)}.`, detail: `W (best so far) is full (${current.vis.dynamic.length}/${current.vis.searchEf ?? current.vis.dynamic.length}). ${rejectionComparison} W stays unchanged, and this dot is not added to C (to check). The search continues with other neighbors and queued dots.` },
    s8: { title: 'Stop exploring this layer.', detail: 'The next dot waiting to be checked is farther away than the matches already kept. The search stops here to save work.' },
    s15: { title: `Finished checking layer ${current.vis.layer}.`, detail: current.vis.layer === 0 ? 'The search has a shortlist. Next, return the closest matches from it.' : 'Keep the closest dot found here as the starting point for the next layer.' },
    k4: { title: 'Move down one layer.', detail: 'Use the best position found so far. The next layer has more dots for a closer look.' },
    k6: { title: `Found ${current.vis.results.length} ${current.vis.results.length === 1 ? 'match' : 'matches'}.`, detail: 'Green rings mark the returned dots. Open Results to compare them with the true closest matches.' },
  }
  const insertionLevel = current.line === 'i3' && rightTab !== 'code'
  const inserted = current.graph.nodes.get(current.vis.focus!)
  const updateDone = trace.op === 'update-reinsert' && step === trace.steps.length - 1
  const movedId = selected ?? trace.steps[0]?.vis.focus
  const before = trace.steps[0]?.graph.nodes.get(movedId!)
  const after = current.graph.nodes.get(movedId!)
  const copy = trace.op === 'search' && rightTab !== 'code' ? searchCopy[current.line] : undefined
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
      {!collapsed && guided && step === trace.steps.length - 1 && <button className="learn-link" onClick={() => dispatch({ type: 'setRightTab', tab: params.efSearch === 1 ? 'params' : 'metrics' })}>{params.efSearch === 1 ? 'Next: set efSearch to 2, then rerun this target →' : 'Compare the results: why did keeping B help? →'}</button>}
    </div>
  )
}
