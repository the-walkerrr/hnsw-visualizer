import { useState } from 'react'
import { edgesOnLayer } from '../hnsw/graph'
import { distance } from '../hnsw/metric'
import { EF_GRAPH, EF_QUERY, efSearchExample } from '../lessons/efSearchExample'

const runs = [efSearchExample(1), efSearchExample(2)]
const edges = edgesOnLayer(EF_GRAPH, 0)
const nodes = [...EF_GRAPH.nodes.values()]
const label = (id: number) => EF_GRAPH.nodes.get(id)!.label
const dist = (id: number) => distance(EF_GRAPH.nodes.get(id)!.vec, EF_QUERY, 'euclidean')
const displayDistance = (id: number) => Number(dist(id).toFixed(1))

function CandidateList({ ids, name, ef, capacity }: { ids: number[]; name: string; ef: number; capacity?: number }) {
  return <div className="ef-list"><div className="ef-list-heading"><b>{name}</b>{capacity && <span>{ids.length} / {capacity} slots</span>}</div>
    <ol aria-label={`${name}, efSearch ${ef}`}>
      {ids.map((id) => <li key={id}><b>{label(id)}</b><span>{displayDistance(id)}</span></li>)}
      {capacity && Array.from({ length: capacity - ids.length }, (_, i) => <li className="ef-slot-empty" key={`empty-${i}`}>empty</li>)}
      {!capacity && ids.length === 0 && <li className="ef-slot-empty">empty</li>}
    </ol>
  </div>
}

function SearchRun({ ef, run }: { ef: number; run: ReturnType<typeof efSearchExample> }) {
  const [index, setIndex] = useState(0)
  const step = run.frames[index]
  const previous = run.frames[Math.max(0, index - 1)]
  const done = step.line === 'k6'
  const expanding = step.line === 's9' ? step.vis.current : undefined
  const measured = step.vis.visited
  const considered = step.line === 's12' || step.line === 's13' ? step.vis.considering : undefined
  const result = label(run.trace.results[0].id)
  let title = 'Start with S in both lists'
  let detail = `S is the entry point, ${displayDistance(0)} units from q. The best-so-far list has ${ef} slot${ef === 1 ? '' : 's'}.`
  if (expanding !== undefined) {
    title = `Expand ${label(expanding)}: inspect its links`
    detail = `Take ${label(expanding)} out of the to-check queue. Its distance (${displayDistance(expanding)}) is no worse than the farthest kept dot (${displayDistance(step.vis.dynamic.at(-1)!)}), so check its unmeasured neighbors. It stays in best so far.`
  } else if (considered !== undefined) {
    const worst = previous.vis.dynamic.at(-1)!
    const removed = previous.vis.dynamic.filter((id) => !step.vis.dynamic.includes(id))
    const hadRoom = previous.vis.dynamic.length < ef
    title = `${step.line === 's12' ? 'Reject' : 'Keep'} ${label(considered)} at distance ${displayDistance(considered)}`
    detail = step.line === 's12'
      ? `The list is full. ${label(considered)} (${displayDistance(considered)}) is farther than ${label(worst)} (${displayDistance(worst)}), so it joins neither list. Its links will not be explored; T stays hidden.`
      : `${hadRoom ? 'There is a spare slot, so accept it.' : `It beats the farthest kept dot, ${label(worst)} (${displayDistance(worst)}).`} Add it to both lists.${removed.length ? ` Remove ${removed.map(label).join(', ')} from best so far to stay within ${ef} slots.` : ''}`
  } else if (done) {
    title = `Queue empty: return ${result}`
    detail = ef === 1
      ? 'Only A was expanded after S. B was measured but rejected, so T was never discovered. Return A, the best dot found; the true nearest is T.'
      : 'Keeping B let the search inspect B’s link to T. Return T, the closest of the two kept dots, because k = 1. A remains in the shortlist but is not returned.'
  }

  return <section className="ef-run" aria-label={`Search with efSearch ${ef}`}>
    <header><h4>efSearch = {ef}</h4><span>k = 1 · layer 0</span></header>
    <svg viewBox="0 0 380 255" role="img" aria-labelledby={`ef-title-${ef} ef-desc-${ef}`}>
      <title id={`ef-title-${ef}`}>Same graph, efSearch {ef}: {title}</title>
      <desc id={`ef-desc-${ef}`}>Edges S–A, S–B, B–T. Query q is closest to T. Distances to q: S 280, A 100, B 175, T about 44.7. {detail}</desc>
      <g className="visual-edge">{edges.map(([a, b]) => {
        const av = EF_GRAPH.nodes.get(a)!.vec
        const bv = EF_GRAPH.nodes.get(b)!.vec
        return <line key={`${a}-${b}`} x1={av[0]} y1={av[1]} x2={bv[0]} y2={bv[1]} className={expanding === a || expanding === b ? 'ef-active-edge' : undefined} />
      })}</g>
      {nodes.map((n) => {
        const isResult = done && step.vis.results.includes(n.id)
        const inBest = step.vis.dynamic.includes(n.id)
        const current = expanding === n.id || considered === n.id
        const status = isResult ? 'returned' : current ? (step.line === 's12' ? 'rejected' : 'checking') : inBest ? 'kept' : measured.includes(n.id) ? 'measured' : 'unseen'
        const below = n.label === 'T' || n.label === 'B'
        return <g key={n.id} className={`ef-node ef-node-${status}`} transform={`translate(${n.vec[0]} ${n.vec[1]})`}>
          {inBest && <circle className="ef-kept-ring" r="17" />}
          <circle r="11" /><text className="ef-node-name" y="4" textAnchor="middle">{n.label}</text>
          <text className="ef-distance" y={below ? 34 : -28} textAnchor="middle">d = {displayDistance(n.id)}</text>
          <text className="ef-node-status" y={below ? 47 : -44} textAnchor="middle">{n.label === 'S' && index === 0 ? 'entry' : status}</text>
        </g>
      })}
      <g className="query-mark"><path d="M313 83l14 14m0-14-14 14" /></g><text className="ef-query-label" x="334" y="75">q</text>
    </svg>
    <div className="ef-lists"><CandidateList ids={step.vis.dynamic} name="Best so far · W" ef={ef} capacity={ef} /><CandidateList ids={step.vis.candidates} name="To check · C" ef={ef} /></div>
    <div className="ef-step" aria-live="polite" aria-atomic="true"><b>{title}</b><p>{detail}</p></div>
    <div className="ef-progress"><span>{step.distCalls} distance checks</span><span>Step {index + 1} / {run.frames.length}</span></div>
    <div className="ef-buttons"><button className="button compact" aria-label={`Previous step, efSearch ${ef}`} disabled={index === 0} onClick={() => setIndex(index - 1)}>← Back</button><button className="button compact" onClick={() => setIndex(done ? 0 : run.frames.length - 1)}>{done ? 'Restart' : 'Show result'}</button><button className="button compact primary" aria-label={`Next step, efSearch ${ef}`} disabled={done} onClick={() => setIndex(index + 1)}>Next →</button></div>
  </section>
}

export function EfSearchVisual() {
  return <figure className="ef-demo">
    <figcaption><b>One extra slot keeps a useful detour open.</b><p>A fixed, four-dot graph. Both searches start at S, use the same query q, and request one result. Only efSearch changes. Step forward to inspect the decisions.</p></figcaption>
    <div className="ef-runs">{runs.map((run, i) => <SearchRun key={i} ef={i + 1} run={run} />)}</div>
    <p className="ef-demo-note">Numbers are straight-line distances to q; smaller is better. All distances are shown for teaching, but “unseen” dots have not been measured by that search yet. Purple rings show dots kept in W. Orange links belong to the dot being expanded. Both lists are shown nearest first. The search can return to an earlier branch; there is no A–B edge.</p>
    <div className="ef-outcome"><b>What changes in this example?</b><p>With efSearch = 1, the search measures {runs[0].trace.stats.distCalls} dots and returns A. With efSearch = 2, it measures {runs[1].trace.stats.distCalls} dots and returns T, the exact nearest neighbor. The graph and its edges stay identical.</p></div>
  </figure>
}
