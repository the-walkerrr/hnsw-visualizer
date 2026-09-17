import { distance } from '../../hnsw/metric'
import type { Metric, NodeId, Step } from '../../hnsw/types'
import { useApp, useDispatch } from '../../state/store'
import { inPlaceUpdateCandidates, searchQueues } from '../searchQueues'
import { followLearnReference } from '../../learnReferenceNavigation'

export function QueuesPanel() {
  const state = useApp()
  const dispatch = useDispatch()
  const queues = searchQueues(state.trace, state.step)
  const localUpdate = inPlaceUpdateCandidates(state.trace, state.step)
  if (state.graph.nodes.size === 0) return <div className="pane-scroll"><h2>No dots to search</h2><p>Add a dot in Insert before starting a search. There are no replay steps yet.</p><button className="button secondary" onClick={() => dispatch({ type: 'setTool', tool: 'insert' })}>Open Insert</button></div>
  if (localUpdate) {
    const { snapshot, snapshotIndex, target, layer, pool, selected, rejected, complete } = localUpdate
    return <InPlaceUpdateQueues
      step={snapshot}
      inactive={snapshotIndex !== state.step}
      target={target}
      layer={layer}
      pool={pool}
      selected={selected}
      rejected={rejected}
      complete={complete}
      capacity={state.params.M}
      metric={state.params.metric}
      onSelect={(id) => dispatch({ type: 'select', id })}
    />
  }
  if (!queues && state.trace && !state.trace.steps.some(step => step.line === 's2')) return <div className="pane-scroll"><h2>No neighbor search needed</h2><p>This operation has no search lists. Follow the explanation below the graph; the first dot can become the entry point without searching existing neighbors.</p></div>
  if (!queues) return <div className="pane-scroll"><div className="panel-intro"><h2>Inside the search</h2><p>Watch the best dots found and the routes still waiting to be checked.</p></div><div className="empty"><b>{state.trace ? 'Waiting to enter a search layer' : 'No search to inspect yet'}</b><span>{state.trace ? 'Press Next or Play to begin.' : 'Run a search or insert a dot to see its lists here.'}</span></div></div>

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

  const rows = (ids: NodeId[], kind: 'W' | 'C') => <ol className={`queue-list queue-list-${kind}`} aria-label={kind === 'W' ? 'Best candidate nodes' : 'Candidates waiting to be checked'}>{ids.map((id, i) => <li key={id}>
    <button className="queue-node" onClick={() => dispatch({ type: 'select', id })} title={`Inspect dot ${label(id)}`}>{label(id)}</button>
    <span className="queue-distance">{format(id)}</span>
    <span className="queue-tag">{kind === 'W' ? (vis.results.includes(id) && returned ? 'result' : full && i === ids.length - 1 ? 'farthest' : 'kept') : (!vis.dynamic.includes(id) ? 'not among best' : i === 0 ? 'next' : 'queued')}</span>
  </li>)}</ol>

  return <div className="pane-scroll queues-panel">
    <div className="panel-intro"><p className="section-kicker">{inactive ? 'Last search snapshot' : returned ? 'Search complete' : `Live · layer ${vis.layer}`}</p><h2>Inside the search</h2><p>{queryOnBase ? 'The bottom layer keeps several promising routes open' : state.trace?.op === 'search' ? 'An upper layer quickly finds a better starting area' : 'Finding neighbors for the inserted or moved dot'}{capacity !== null ? ` · ${capacity} slot${capacity === 1 ? '' : 's'}` : ''}.</p></div>
    <details className="panel-disclosure compact-disclosure"><summary><span>How to read these lists</span><small>Optional</small></summary><div className="panel-disclosure-body"><p className="queue-explanation">“Best found” remembers possible answers. “Still to check” remembers where the search may look next. Distances are measured from {vis.queryLabel === 'q' ? 'the target' : 'the inserted or moved dot'}; smaller is closer.</p><a href="/learn#chapter-search" data-learn-reference onClick={followLearnReference}>Review the search story →</a></div></details>
    <section className="queue-section" aria-label="Best candidates">
      <header><h3>Best found</h3><span className={full ? 'queue-full' : ''}>{vis.dynamic.length} / {capacity ?? '?'}{full ? ' · Full' : ' slots'}</span></header>
      {capacity !== null && <meter min={0} max={capacity} value={vis.dynamic.length} aria-label="Best-candidate capacity" />}
      <p className="queue-caption">{full ? 'A closer dot replaces the farthest kept dot.' : 'There is room to accept more dots.'}</p>
      {rows(vis.dynamic, 'W')}
      {vis.dynamic.length > 0 && <p className="queue-threshold">Farthest kept distance: <b>{format(vis.dynamic.at(-1)!)}</b></p>}
    </section>
    <section className="queue-section" aria-label="Routes still to check">
      <header><h3>Still to check</h3><span>{vis.candidates.length} queued</span></header>
      {vis.candidates.length ? rows(vis.candidates, 'C') : <p className="queue-caption">{current !== undefined || considering !== undefined ? 'No other dots queued at this moment. Checking neighbors may add more.' : 'No dots waiting to be expanded.'}</p>}
      {(current !== undefined || considering !== undefined) && <p className="queue-caption">{current !== undefined ? `Checking ${label(current)} now. It can still remain among the best dots found.` : `Just ${snapshot.line === 's12' ? 'skipped' : 'kept'} ${label(considering!)}.`}</p>}
      {snapshot.line === 's8' && <p className="queue-stop">Stopped: the nearest pending dot exceeded the farthest best-candidate distance. Its remaining links were not explored.</p>}
      {returned && <p className="queue-caption">Returned {vis.results.map(label).join(', ') || 'no eligible dots'} from the best dots found.</p>}
    </section>
    <section className="queue-section" aria-label="Bucket changes on this layer">
      <header><h3>Bucket changes</h3><span>This layer</span></header>
      <p className="queue-caption">Includes the neighbor decisions skipped by Main steps. Select a change to pause at that exact frame.</p>
      {events.length ? <ol className="queue-events">{events.slice().reverse().map((event) => <li key={event.index}>
        <button disabled={state.movingNode !== null} className={event.rejected ? 'queue-event rejected' : 'queue-event accepted'} onClick={() => dispatch({ type: 'seek', index: event.index })}>
          <span>Step {event.index + 1}</span>
          <b>{event.rejected ? 'Rejected' : 'Added'} {label(event.step.vis.considering!)} · {format(event.step.vis.considering!)}</b>
          <small>{event.rejected ? 'The best-found list was full and this dot was not closer, so the search skipped it.' : event.dropped.length ? `Removed ${event.dropped.map((id) => `${label(id)} (${format(id)})`).join(', ')} from the best-found list. Another route is still waiting.` : 'Kept in both lists; nothing needed to be removed.'}</small>
        </button>
      </li>)}</ol> : <p className="queue-caption">No neighbor decisions yet.</p>}
    </section>
    <a className="control-deep-link" href="/learn#chapter-search" data-learn-reference onClick={followLearnReference}>How the candidate lists work →</a>
  </div>
}

function InPlaceUpdateQueues({
  step,
  inactive,
  target,
  layer,
  pool,
  selected,
  rejected,
  complete,
  capacity,
  metric,
  onSelect,
}: {
  step: Step
  inactive: boolean
  target?: NodeId
  layer: number | null
  pool: NodeId[]
  selected: NodeId[]
  rejected: NodeId[]
  complete: boolean
  capacity: number
  metric: Metric
  onSelect: (id: NodeId) => void
}) {
  const query = step.vis.query
  const label = (id: NodeId) => step.graph.nodes.get(id)?.label ?? `#${id}`
  const format = (id: NodeId) => {
    const candidate = step.graph.nodes.get(id)
    return candidate && query ? distance(candidate.vec, query, metric).toFixed(2) : '—'
  }
  const nearestFirst = (ids: NodeId[]) => ids.slice().sort((a, b) => Number(format(a)) - Number(format(b)))
  const candidateRows = (ids: NodeId[], tag: string) => ids.length > 0
    ? <ol className="queue-list" aria-label={`${tag} update candidates`}>{nearestFirst(ids).map((id) => <li key={id}>
      <button className="queue-node" onClick={() => onSelect(id)} title={`Inspect dot ${label(id)}`}>{label(id)}</button>
      <span className="queue-distance">{format(id)}</span>
      <span className="queue-tag">{tag}</span>
    </li>)}</ol>
    : null

  const undecided = pool.filter((id) => !selected.includes(id) && !rejected.includes(id))
  const targetLabel = target === undefined ? 'the moved dot' : label(target)

  return <div className="pane-scroll queues-panel">
    <div className="panel-intro">
      <p className="section-kicker">{inactive ? 'Last update snapshot' : layer === null ? 'Update started' : complete ? `Layer ${layer} complete` : `Live · layer ${layer}`}</p>
      <h2>Inside the local repair</h2>
      <p>In-place update does not run the candidate-list search. It repairs {targetLabel} from nearby candidates instead.</p>
    </div>
    <p className="queue-explanation">The pool starts with the moved dot’s old one-hop neighbors plus their neighbors—the two-hop neighborhood. Distances are measured from {targetLabel}’s new position, nearest first.</p>
    {layer === null ? <div className="empty"><b>Ready to build the candidate pool</b><span>Press Next or Play. Each layer gets its own two-hop pool.</span></div> : <>
      <section className="queue-section" aria-label="In-place update candidate pool">
        <header><h3>Candidate pool</h3><span>{pool.length} nearby</span></header>
        <p className="queue-caption">These are the only dots considered for this local repair. A large move can leave the true new neighbors outside this pool.</p>
        {candidateRows(pool, 'candidate')}
      </section>
      <section className="queue-section" aria-label="Selected update neighbors">
        <header><h3>Selected neighbors</h3><span>{selected.length} / {capacity}</span></header>
        <meter min={0} max={capacity} value={selected.length} aria-label="Selected neighbor occupancy" />
        {candidateRows(selected, 'kept') ?? <p className="queue-caption">{complete ? 'No neighbor was selected on this layer.' : 'No candidate has been kept yet.'}</p>}
      </section>
      <section className="queue-section" aria-label="Rejected update candidates">
        <header><h3><i className="queue-key rejected">×</i> Rejected / not selected</h3><span>{rejected.length}{complete ? ' total' : ' so far'}</span></header>
        {candidateRows(rejected, 'rejected') ?? <p className="queue-caption">{complete ? 'Every candidate in the pool was selected.' : 'No candidate has been rejected yet.'}</p>}
        {!complete && undecided.length > 0 && <p className="queue-caption">{undecided.length} candidate{undecided.length === 1 ? ' is' : 's are'} still undecided.</p>}
      </section>
    </>}
    <a className="control-deep-link" href="/learn#update-in-place" data-learn-reference onClick={followLearnReference}>How in-place update works →</a>
  </div>
}
