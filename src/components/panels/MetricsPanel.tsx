import { useMemo } from 'react'
import { graphStats, recallAt } from '../../hnsw/metrics'
import { useApp, useViewGraph } from '../../state/store'
import { BarChart } from '../Charts'
import { ParameterLink } from '../ParameterLink'

const int = (v: number) => Math.round(v).toLocaleString()

export function MetricsPanel() {
  const { trace, params, k, comparison, lastSearch } = useApp()
  const requested = lastSearch?.k ?? k
  const graph = useViewGraph()
  const stats = useMemo(() => graphStats(graph), [graph])
  const recall = trace && trace.exact.length ? recallAt(trace.results, trace.exact) : null
  const speedup =
    trace && trace.stats.distCalls > 0
      ? trace.stats.bruteForceDistCalls / trace.stats.distCalls
      : null

  return (
    <div className="pane-scroll">
      <div className="panel-intro"><h2>How did the search do?</h2><p>Full search results, compared with checking every dot.</p></div>
      {comparison && <section className="note" aria-label="Same-target comparison"><h3>Same target, same dots, same <ParameterLink name="k"/></h3><table className="table"><thead><tr><th>Run</th><th><ParameterLink name="efSearch"/></th><th>True matches found</th><th>Checks</th></tr></thead><tbody>{(['before', 'after'] as const).map(name => <tr key={name}><th>{name}</th><td>{comparison[name].ef}</td><td>{comparison[name].found} / {comparison[name].total}</td><td>{comparison[name].checks}</td></tr>)}</tbody></table><p>{comparison.before.found === comparison.after.found ? 'Both runs found the same number of true matches. Extra effort did not improve that count for this target.' : 'The number of true matches changed because the search explored with a different shortlist capacity.'} No graph connections changed.</p></section>}
      {trace?.op === 'search' && requested > stats.live && <p className="note">Requested {requested} matches; only {stats.live} live {stats.live === 1 ? 'dot is' : 'dots are'} available.</p>}
      {!trace ? (
        <div className="empty">
          Run a search in Search to see your matches here.
        </div>
      ) : (
        <>
          <details className="advanced-details"><summary>Operation details</summary><dl className="kv details-body">
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
          </dl></details>
          {recall === null && (
            <div className="note">
              {trace.op === 'search' && graph.nodes.size === 0
                ? 'Add vectors and run the search again to measure recall and cost.'
                : <>This replay explains the operation. Run a <b>search</b> to unlock recall and exact-scan comparisons.</>}
            </div>
          )}
          {recall !== null && (
            <>
              <div className="result-score"><span>Closest matches found</span><strong>{Math.round(recall * trace.exact.length)} <small>of {trace.exact.length}</small></strong><p>{(recall * 100).toFixed(0)}% recall — the share of the true closest matches found.</p></div>
              <p className="result-explanation">{speedup !== null ? <>The search made <b>{int(trace.stats.distCalls)}</b> distance checks. Checking every dot takes <b>{int(trace.stats.bruteForceDistCalls)}</b>.</> : 'No distance checks were needed.'} {recall < 1 && <>Try a larger <ParameterLink name="efSearch"/> in Search (now {params.efSearch}), then search again.</>}</p>
              <BarChart
                title="Work done" labelTitle="Method" valueTitle="Distance checks"
                note="distance checks · fewer is faster"
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
              <details className="advanced-details"><summary>Compare individual matches</summary><table className="table">
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
              </table></details>
            </>
          )}
        </>
      )}

      <details className="advanced-details"><summary>Graph details <span>{stats.live} dots</span></summary><div className="details-body">
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
      </div></details>
    </div>
  )
}
