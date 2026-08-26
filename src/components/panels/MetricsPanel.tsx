import { useMemo } from 'react'
import { connectivity, degreeHistogram, graphStats, levelHistogram, recallAt } from '../../hnsw/metrics'
import { useApp, useViewGraph } from '../../state/store'
import { BarChart } from '../Charts'

const int = (v: number) => Math.round(v).toLocaleString()

export function MetricsPanel() {
  const { trace, params } = useApp()
  const graph = useViewGraph()
  const stats = useMemo(() => graphStats(graph), [graph])
  const levels = useMemo(() => levelHistogram(graph), [graph])
  const degrees = useMemo(() => degreeHistogram(graph, 0), [graph])
  const conn = useMemo(
    () =>
      Array.from({ length: stats.topLayer + 1 }, (_, lc) => ({ lc, ...connectivity(graph, lc) })),
    [graph, stats.topLayer],
  )
  const orphaned = conn.reduce((a, c) => a + (c.lc === 0 ? c.orphaned : 0), 0)
  const recall = trace && trace.exact.length ? recallAt(trace.results, trace.exact) : null
  const speedup =
    trace && trace.stats.distCalls > 0
      ? trace.stats.bruteForceDistCalls / trace.stats.distCalls
      : null

  return (
    <div className="pane-scroll">
      <div className="section-title">Last operation</div>
      {!trace ? (
        <div className="empty">Run a search or an insert to see what it cost.</div>
      ) : (
        <>
          <dl className="kv">
            <dt>operation</dt>
            <dd>{trace.title}</dd>
            <dt>distance computations</dt>
            <dd>{int(trace.stats.distCalls)}</dd>
            <dt>exact scan would cost</dt>
            <dd>{int(trace.stats.bruteForceDistCalls)}</dd>
            <dt>nodes expanded (hops)</dt>
            <dd>{int(trace.stats.hops)}</dd>
            <dt>distinct nodes measured</dt>
            <dd>{int(trace.stats.visited)}</dd>
            <dt>layers touched</dt>
            <dd>{trace.stats.layersTouched}</dd>
            <dt>recorded steps</dt>
            <dd>{int(trace.steps.length)}</dd>
          </dl>
          {recall !== null && (
            <>
              <div className="note accent">
                <b>Recall {(recall * 100).toFixed(0)}%</b> — of the {trace.exact.length} true nearest
                neighbours, the graph returned {Math.round(recall * trace.exact.length)}.
                {speedup !== null && (
                  <>
                    {' '}
                    It measured {int(trace.stats.distCalls)} distances instead of{' '}
                    {int(trace.stats.bruteForceDistCalls)} — {speedup.toFixed(1)}× fewer.
                  </>
                )}
                {recall < 1 && (
                  <>
                    {' '}
                    Raise ef<sub>search</sub> (currently {params.efSearch}) to close the gap.
                  </>
                )}
              </div>
              <BarChart
                title="Distance computations for this query"
                note="lower is better · same k, same answer set size"
                horizontal
                bars={[
                  { label: 'HNSW', value: trace.stats.distCalls, color: 'var(--blue)' },
                  {
                    label: 'exact scan',
                    value: trace.stats.bruteForceDistCalls,
                    color: 'var(--orange)',
                  },
                ]}
              />
              <table className="table">
                <thead>
                  <tr>
                    <th>rank</th>
                    <th>returned</th>
                    <th>dist</th>
                    <th>true</th>
                    <th>dist</th>
                  </tr>
                </thead>
                <tbody>
                  {trace.exact.map((e, i) => {
                    const got = trace.results[i]
                    const hit = got && trace.exact.some((x) => x.id === got.id)
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ color: hit ? undefined : 'var(--red)' }}>
                          {got ? (graph.nodes.get(got.id)?.label ?? got.id) : '—'}
                        </td>
                        <td>{got ? got.dist.toFixed(1) : '—'}</td>
                        <td>{graph.nodes.get(e.id)?.label ?? e.id}</td>
                        <td>{e.dist.toFixed(1)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      <div className="section-title">Index</div>
      <dl className="kv">
        <dt>vectors</dt>
        <dd>{int(stats.total)}</dd>
        <dt>live / tombstoned</dt>
        <dd>
          {int(stats.live)} / {int(stats.deleted)}
        </dd>
        <dt>top layer</dt>
        <dd>{stats.topLayer}</dd>
        <dt>undirected edges</dt>
        <dd>{int(stats.edges)}</dd>
        <dt title="Vectors (dims x 4 bytes) plus 4 bytes per directed edge — the graph is the cheap half">
          index memory (est.)
        </dt>
        <dd>{(stats.bytes / 1024).toFixed(1)} KiB</dd>
      </dl>
      {stats.deleted > 0 && (
        <div className="note warn">
          {stats.deleted} tombstone{stats.deleted === 1 ? '' : 's'} still take up space, still get
          walked through, and still consume slots in the ef beam. Past roughly 20% tombstones most
          systems trigger a rebuild.
        </div>
      )}

      <div className="section-title">Layers</div>
      <table className="table">
        <thead>
          <tr>
            <th>layer</th>
            <th>nodes</th>
            <th>edges</th>
            <th>avg deg</th>
            <th>parts</th>
          </tr>
        </thead>
        <tbody>
          {[...stats.layers].reverse().map((l) => {
            const c = conn.find((x) => x.lc === l.layer)
            return (
              <tr key={l.layer}>
                <td>L{l.layer}</td>
                <td>{l.nodes}</td>
                <td>{l.edges}</td>
                <td>{l.avgDegree.toFixed(1)}</td>
                <td
                  title={
                    c
                      ? `component sizes: ${c.components.join(', ')} — ${c.bridged} of ${c.components.length} can be entered from the layer above`
                      : ''
                  }
                  style={{ color: c && c.orphaned > 0 ? 'var(--red)' : undefined }}
                >
                  {c ? c.components.length : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className={orphaned > 0 ? 'note warn' : 'note'}>
        <b>parts</b> is the number of disconnected pieces of that layer. A split layer 0 is
        normal and not a fault: separate clusters form separate components, and a search does not
        have to cross layer 0 to reach them — it drops in from a sparser layer above. What matters
        is whether a search can <i>enter</i> each piece, and that runs down the whole hierarchy:
        you start at the entry point on the top layer, and everything reached on one layer becomes
        the possible entry points for the next. A piece nothing in that chain lands on is sealed
        off.
        {orphaned > 0 ? (
          <>
            {' '}
            Right now <b>{orphaned} vector{orphaned === 1 ? '' : 's'} sit in a sealed-off piece of
            layer 0</b> — no search can reach them, whatever ef you use, even querying their exact
            coordinates. That is what a too-small M, or the simple selection rule, does to
            clustered data.
          </>
        ) : (
          ' Every piece currently has one, so every vector is reachable.'
        )}
      </div>
      <p className="hint">
        Each layer should hold roughly 1/M of the one below it. That geometric decay is what makes
        the number of layers — and so the search cost — grow like log N.
      </p>

      <BarChart
        title="Nodes by assigned top level"
        note={`expected ratio ≈ 1 : ${Math.round(Math.exp(1 / params.mL))} per layer`}
        bars={levels.map((l) => ({ label: `L${l.bin}`, value: l.count }))}
      />
      <BarChart
        title="Degree distribution on layer 0"
        note={`cap Mmax0 = ${params.Mmax0}`}
        bars={degrees.map((d) => ({ label: String(d.bin), value: d.count }))}
      />
      <p className="hint">
        Nodes stacked at the cap mean the graph is saturated — raising Mmax0 would let it keep more
        of its good candidates. A spike at 0 or 1 means under-connected nodes, which are effectively
        invisible to searches.
      </p>
    </div>
  )
}
