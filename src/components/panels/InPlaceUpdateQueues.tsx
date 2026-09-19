import { distance } from '../../hnsw/metric'
import type { Metric, NodeId, Step } from '../../hnsw/types'
import { followLearnReference } from '../../learnReferenceNavigation'

export function InPlaceUpdateQueues({
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
