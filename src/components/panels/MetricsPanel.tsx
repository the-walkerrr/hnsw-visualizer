import { useMemo } from 'react'
import { graphStats, recallAt } from '../../hnsw/metrics'
import { useApp, useViewGraph } from '../../state/store'
import { BarChart } from '../Charts'

const int = (v: number) => Math.round(v).toLocaleString()

export function MetricsPanel() {
  const { trace, params } = useApp()
  const graph = useViewGraph()
  const stats = useMemo(() => graphStats(graph), [graph])
  const recall = trace && trace.exact.length ? recallAt(trace.results, trace.exact) : null
  const speedup =
    trace && trace.stats.distCalls > 0
      ? trace.stats.bruteForceDistCalls / trace.stats.distCalls
      : null

  return (
    <div className="pane-scroll">
      <div className="section-title">Last operation</div>
      {!trace ? (
        <div className="empty">
          Run a search first. This panel will then compare HNSW against exact scan and show the speed/accuracy trade-off.
        </div>
      ) : (
        <>
          <dl className="kv">
            <dt>operation</dt>
            <dd>{trace.title}</dd>
            <dt>distance computations</dt>
            <dd>{int(trace.stats.distCalls)}</dd>
            <dt>exact scan would cost</dt>
            <dd>{int(trace.stats.bruteForceDistCalls)}</dd>
            <dt>nodes expanded</dt>
            <dd>{int(trace.stats.hops)}</dd>
            <dt>layers touched</dt>
            <dd>{trace.stats.layersTouched}</dd>
          </dl>
          {recall === null && (
            <div className="note">
              {trace.op === 'search' && graph.nodes.size === 0
                ? 'Add vectors and run the search again to measure recall and cost.'
                : <>This replay explains the operation. Run a <b>search</b> to unlock recall and exact-scan comparisons.</>}
            </div>
          )}
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
      </dl>

      <div className="section-title">Layers</div>
      <table className="table">
        <thead>
          <tr>
            <th>layer</th>
            <th>nodes</th>
            <th>edges</th>
            <th>avg deg</th>
          </tr>
        </thead>
        <tbody>
          {[...stats.layers].reverse().map((l) => {
            return (
              <tr key={l.layer}>
                <td>L{l.layer}</td>
                <td>{l.nodes}</td>
                <td>{l.edges}</td>
                <td>{l.avgDegree.toFixed(1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="hint">
        Sparse upper layers make long jumps. Dense lower layers finish the precise local search.
      </p>
    </div>
  )
}
