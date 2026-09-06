import { useApp } from '../state/store'
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
    body: 'See its connections, or drag it to a new place.',
  },
}

export function Explainer({ onOpenExplanation }: { onOpenExplanation?: () => void }) {
  const { trace, step, tool, rightTab } = useApp()
  const current = trace?.steps[step]

  if (!current || !trace) {
    const hint = TOOL_HINT[tool] ?? TOOL_HINT.search
    return (
      <div className="explainer idle">
        <div className="head">
          <span className="step-marker">Ready</span>
          <h3>{hint.headline}</h3>
        </div>
        <p>{hint.body}</p>
        {onOpenExplanation && (
          <button className="learn-link" onClick={onOpenExplanation}>
            Learn the basics →
          </button>
        )}
      </div>
    )
  }

  const dot = (id: number | undefined) => id === undefined ? 'this dot' : `dot ${current.graph.nodes.get(id)?.label ?? id}`
  const searchCopy: Record<string, { title: string; detail: string }> = {
    k2: { title: current.graph.entry === null ? 'No dots to search yet.' : 'Start at the top of the map.', detail: current.graph.entry === null ? 'Add some dots in Explore first.' : 'Every search starts at the same dot on the highest layer. From here, it looks for routes toward your target.' },
    s2: { title: `Search layer ${current.vis.layer}.`, detail: current.vis.layer === 0 ? 'This layer holds every dot. Keep several possible matches in play to explore the area around your target.' : 'Use the shortcuts on this layer to get closer to your target.' },
    s9: { title: `Follow the connections from ${dot(current.vis.current)}.`, detail: 'This is the closest dot still waiting to be checked. Look at its neighbors for a better match.' },
    s10: { title: `Skip ${dot(current.vis.considering)}.`, detail: 'It was already checked on this layer. Skipping it avoids going around in circles.' },
    s13: { title: `Keep ${dot(current.vis.considering)} as a possible match.`, detail: 'It is close enough to join the best matches so far, or there is still room. Its connections can lead to more matches.' },
    s12: { title: `Skip ${dot(current.vis.considering)}.`, detail: 'The list of possible matches is full, and every dot on it is closer. Continue along the other routes.' },
    s8: { title: 'Stop exploring this layer.', detail: 'The next dot waiting to be checked is farther away than the matches already kept. The search stops here to save work.' },
    s15: { title: `Finished checking layer ${current.vis.layer}.`, detail: current.vis.layer === 0 ? 'The search has a shortlist. Next, return the closest matches from it.' : 'Keep the closest dot found here as the starting point for the next layer.' },
    k4: { title: 'Move down one layer.', detail: 'Use the best position found so far. The next layer has more dots for a closer look.' },
    k6: { title: `Found ${current.vis.results.length} matches.`, detail: 'Green rings mark the returned dots. Open Results to compare them with the true closest matches.' },
  }
  const copy = trace.op === 'search' && rightTab !== 'code' ? searchCopy[current.line] : undefined
  return (
    <div className="explainer">
      <div className="head">
        <span className="step-marker">{step + 1}</span>
        <h3>{copy?.title ?? current.title}</h3>
        <span className="trace-meta">{current.distCalls} distance checks</span>
      </div>
      <p><RichText text={copy?.detail ?? current.detail} /></p>
    </div>
  )
}
