import { distance } from '../../hnsw/metric'
import type { NodeId } from '../../hnsw/types'
import { useApp, useDispatch } from '../../state/store'
import { searchQueues } from '../searchQueues'
import { ParameterLink } from '../ParameterLink'
import { followLearnReference } from '../../learnReferenceNavigation'

export function QueuesPanel() {
  const state = useApp()
  const dispatch = useDispatch()
  const queues = searchQueues(state.trace, state.step)
  if (state.graph.nodes.size === 0) return <div className="pane-scroll"><h2>No dots to search</h2><p>Add a dot in Explore before starting a search. There are no replay steps yet.</p><button className="button secondary" onClick={() => dispatch({ type: 'setRightTab', tab: 'build' })}>Open Explore</button></div>
  if (!queues && state.trace && !state.trace.steps.some(step => step.line === 's2')) return <div className="pane-scroll"><h2>No neighbor search needed</h2><p>This operation has no search lists. Follow the explanation below the graph; the first dot can become the entry point without searching existing neighbors.</p></div>
  if (!queues) return <div className="pane-scroll"><div className="panel-intro"><h2>Inside the search</h2><p>Watch the best-so-far bucket (W) and the to-check queue (C) change with each step.</p></div><div className="empty"><b>{state.trace ? 'Waiting to enter a search layer' : 'No search to inspect yet'}</b><span>{state.trace ? 'Press Next or Play to initialize the lists.' : 'Run a search or insert a dot to see its live lists here.'}</span></div></div>

  const { snapshot, snapshotIndex, capacity, events } = queues
  const { graph, vis } = snapshot
  const metric = vis.searchMetric ?? state.params.metric
  const format = (id: NodeId) => {
    const node = graph.nodes.get(id)
    return node && vis.query ? distance(node.vec, vis.query, metric).toFixed(2) : '—'
  }
  const label = (id: NodeId) => graph.nodes.get(id)?.label ?? `#${id}`
  const full = capacity !== null && vis.dynamic.length >= capacity
  const returned = snapshot.line === 'k6'
  const current = snapshot.line === 's9' ? vis.current : undefined
  const considering = ['s12', 's13'].includes(snapshot.line) ? vis.considering : undefined
  const inactive = snapshotIndex !== state.step
  const queryOnBase = state.trace?.op === 'search' && vis.layer === 0

  const rows = (ids: NodeId[], kind: 'W' | 'C') => <ol className={`queue-list queue-list-${kind}`} aria-label={kind === 'W' ? 'W best-so-far nodes' : 'C to-check nodes'}>{ids.map((id, i) => <li key={id}>
    <button className="queue-node" onClick={() => dispatch({ type: 'select', id })} title={`Inspect dot ${label(id)}`}>{label(id)}</button>
    <span className="queue-distance">{format(id)}</span>
    <span className="queue-tag">{kind === 'W' ? (vis.results.includes(id) && returned ? 'result' : full && i === ids.length - 1 ? 'farthest' : 'kept') : (!vis.dynamic.includes(id) ? 'outside W' : i === 0 ? 'next' : 'queued')}</span>
  </li>)}</ol>

  return <div className="pane-scroll queues-panel">
    <div className="panel-intro"><p className="section-kicker">{inactive ? 'Last search snapshot' : returned ? 'Search complete' : `Live · layer ${vis.layer}`}</p><h2>Inside the search</h2><p>{queryOnBase ? <>Bottom layer · effective <ParameterLink name="efSearch"/></> : state.trace?.op === 'search' ? 'Upper layer · greedy search' : 'Neighbor search during insertion or update'}{capacity !== null ? ` = ${capacity}` : ''}.</p></div>
    {state.trace?.op === 'search' && <p className="queue-explanation">{queryOnBase ? <>W uses max(<ParameterLink name="efSearch"/>, <ParameterLink name="k"/>) slots to keep alternative routes for better accuracy, at the cost of more checks.</> : 'One slot keeps navigation fast: upper layers find a promising starting point for the layer below.'} <a href="/learn#w-per-layer" data-learn-reference onClick={followLearnReference}>Why these sizes?</a></p>}
    <p className="queue-explanation">Dot labels are item IDs, not distances. {metric === 'euclidean' && 'The dashed purple circle shows the farthest kept distance; it is not a boundary limiting where search can go. '}Distances are to {vis.queryLabel === 'q' ? 'the query' : 'the inserted or moved dot'}, nearest first. W has a capacity; C has no separate size limit.</p>
    <section className="queue-section" aria-label="Best so far W">
      <header><h3><i className="queue-key w">W</i> Best so far</h3><span className={full ? 'queue-full' : ''}>{vis.dynamic.length} / {capacity ?? '?'}{full ? ' · Full' : ' slots'}</span></header>
      {capacity !== null && <meter min={0} max={capacity} value={vis.dynamic.length} aria-label="W bucket occupancy" />}
      <p className="queue-caption">{full ? 'A closer dot replaces the farthest kept dot.' : 'There is room to accept more dots.'}</p>
      {rows(vis.dynamic, 'W')}
      {vis.dynamic.length > 0 && <p className="queue-threshold">Farthest kept distance: <b>{format(vis.dynamic.at(-1)!)}</b></p>}
    </section>
    <section className="queue-section" aria-label="To check C">
      <header><h3><i className="queue-key c">C</i> To check</h3><span>{vis.candidates.length} queued</span></header>
      {vis.candidates.length ? rows(vis.candidates, 'C') : <p className="queue-caption">{current !== undefined || considering !== undefined ? 'No other dots queued at this moment. Checking neighbors may add more.' : 'No dots waiting to be expanded.'}</p>}
      {(current !== undefined || considering !== undefined) && <p className="queue-caption">{current !== undefined ? `Expanding ${label(current)}. It has been removed from C; it can stay in W.` : `Just ${snapshot.line === 's12' ? 'rejected' : 'accepted'} ${label(considering!)}.`}</p>}
      {snapshot.line === 's8' && <p className="queue-stop">Stopped: the nearest pending dot exceeded W’s farthest distance. Its remaining links were not explored.</p>}
      {returned && <p className="queue-caption">Returned {vis.results.map(label).join(', ') || 'no eligible dots'} from W.</p>}
    </section>
    <section className="queue-section" aria-label="Bucket changes on this layer">
      <header><h3>Bucket changes</h3><span>This layer</span></header>
      <p className="queue-caption">Includes the neighbor decisions skipped by Main steps. Select a change to pause at that exact frame.</p>
      {events.length ? <ol className="queue-events">{events.slice().reverse().map((event) => <li key={event.index}>
        <button disabled={state.movingNode !== null} className={event.rejected ? 'queue-event rejected' : 'queue-event accepted'} onClick={() => dispatch({ type: 'seek', index: event.index })}>
          <span>Step {event.index + 1}</span>
          <b>{event.rejected ? 'Rejected' : 'Added'} {label(event.step.vis.considering!)} · {format(event.step.vis.considering!)}</b>
          <small>{event.rejected ? 'W was full; this dot was not closer. Not queued in C.' : event.dropped.length ? `Dropped ${event.dropped.map((id) => `${label(id)} (${format(id)})`).join(', ')} from W. Dropping from W does not remove a pending entry from C.` : 'Accepted into W and C; no eviction needed.'}</small>
        </button>
      </li>)}</ol> : <p className="queue-caption">No neighbor decisions yet.</p>}
    </section>
    <a className="control-deep-link" href="/learn#chapter-search" data-learn-reference onClick={followLearnReference}>How W and C work →</a>
  </div>
}
