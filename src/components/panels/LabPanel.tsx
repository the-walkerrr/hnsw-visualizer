import { useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_PARAMS, bruteForce, buildIndex, runSearch } from '../../hnsw/algorithm'
import { emptyGraph } from '../../hnsw/graph'
import { efSweep, graphStats, recallAt } from '../../hnsw/metrics'
import { preset } from '../../hnsw/presets'
import type { Graph, Params, Vec } from '../../hnsw/types'
import { editsLocked, useApp } from '../../state/store'
import { BarChart, LineChart } from '../Charts'
import { ParameterLink } from '../ParameterLink'
import { selectionRuleSummary, type RuleMeasurement } from './selectionRuleSummary'

const EFS = [1, 2, 4, 8, 16, 32, 64, 128]
const MS = [2, 4, 6, 8, 12, 16, 24]
const QUERY_COUNT = 24
const percent = (value: number) => `${(value * 100).toFixed(1)}%`

interface Row {
  key: number
  recall: number
  distCalls: number
  avgDegree: number
  edges: number
}

function measure(graph: Graph, params: Params, queries: Vec[], k: number) {
  let recall = 0
  let cost = 0
  for (const q of queries) {
    const { trace } = runSearch(graph, params, q, k, false)
    recall += recallAt(trace.results, bruteForce(graph, q, k, params))
    cost += trace.stats.distCalls
  }
  return { recall: recall / queries.length, distCalls: cost / queries.length }
}

function ExperimentSetup({ changes, fixed, measures }: { changes: string; fixed: string; measures: string }) {
  return <dl className="experiment-setup">
    <div><dt>Changes</dt><dd>{changes}</dd></div>
    <div><dt>Stays fixed</dt><dd>{fixed}</dd></div>
    <div><dt>Measure</dt><dd>{measures}</dd></div>
  </dl>
}

function Conclusion({ children }: { children: ReactNode }) {
  return <div className="experiment-conclusion" aria-live="polite"><span>CONCLUSION FROM THIS RUN</span><p>{children}</p></div>
}

export function LabPanel() {
  const state = useApp()
  const { params, graph, dataset, k } = state
  const [efRows, setEfRows] = useState<ReturnType<typeof efSweep> | null>(null)
  const [mRows, setMRows] = useState<Row[] | null>(null)
  const [ruleRows, setRuleRows] = useState<RuleMeasurement[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const queries = useMemo(() => preset('uniform').make(QUERY_COUNT, 20250826), [])
  const vectors = useMemo(
    () => [...graph.nodes.values()].sort((a, b) => a.seq - b.seq).map((n) => n.vec),
    [graph],
  )
  const efValues = useMemo(() => [...new Set([...EFS, params.efSearch])].sort((a, b) => a - b), [params.efSearch])
  const mValues = useMemo(() => [...new Set([...MS, params.M])].sort((a, b) => a - b), [params.M])

  const run = (name: string, fn: () => void) => {
    setBusy(name)
    // Let the button paint its disabled state before the main thread blocks.
    window.setTimeout(() => {
      fn()
      setBusy(null)
    }, 16)
  }

  const efCurrent = efRows?.find((row) => row.ef === params.efSearch)
  const efBest = efRows?.reduce((best, row) => row.recall > best.recall ? row : best)
  const mCurrent = mRows?.find((row) => row.key === params.M)
  const mBest = mRows?.reduce((best, row) => row.recall > best.recall || (row.recall === best.recall && row.edges < best.edges) ? row : best)
  const heuristic = ruleRows?.find((row) => row.rule === 'heuristic')
  const simple = ruleRows?.find((row) => row.rule === 'simple')

  return (
    <div className="pane-scroll">
      <div className="panel-intro"><p className="section-kicker">Experiments</p><h2>Change one decision. Measure the trade-off.</h2><p>Each experiment states what changes, what stays fixed, and the question its charts answer.</p></div>
      <div className="experiment-key" aria-label="How to read experiment measurements">
        <div><b>Recall@k ↑</b><span>Share of the true nearest matches found. Higher is better.</span></div>
        <div><b>Checks/query ↓</b><span>Average distance calculations per target. Lower is less work.</span></div>
        <div><b>Graph edges ↓</b><span>Stored links in the rebuilt index. Fewer generally means less memory.</span></div>
      </div>
      <p className="experiment-common">All runs use the same {QUERY_COUNT} test targets on your {vectors.length} dots and request <ParameterLink name="k"/> = {k} matches. Experiments never replace the graph on your canvas.</p>
      {vectors.length < 8 && <p className="note">Add at least 8 dots in Insert to enable these comparisons.</p>}

      <section className="experiment-block" aria-labelledby="experiment-ef-title">
        <header><span>EXPERIMENT 1 · QUERY TIME</span><h3 id="experiment-ef-title">Does more search effort improve recall?</h3><p>Run the same queries through the same graph while changing only the number of best candidates retained during layer-0 search.</p></header>
        <ExperimentSetup
          changes={`efSearch = ${efValues.join(', ')}. Current: ${params.efSearch}.`}
          fixed={`Graph, links, vectors, metric (${params.metric}), k (${k}), and query set.`}
          measures="Recall@k and average distance checks per query."
        />
        <button
          className="button primary compact experiment-run"
          disabled={editsLocked(state) || busy !== null || vectors.length < 8}
          onClick={() => run('ef', () => setEfRows(efSweep(graph, params, queries, k, efValues)))}
        >
          {busy === 'ef' ? `Running ${efValues.length} searches…` : `Run ${efValues.length}-value comparison`}
        </button>
        {efRows && <div className="experiment-results">
          <LineChart
            title="Accuracy as search effort increases" xTitle="efSearch (candidate slots)" yTitle="Recall@k (% true)"
            note="outlined point = current setting"
            points={efRows.map((r) => ({ x: r.ef, y: r.recall }))}
            xScale="ordinal"
            yMax={1}
            yFormat={(v) => `${(v * 100).toFixed(0)}%`}
            highlightX={params.efSearch}
          />
          <LineChart
            title="Work as search effort increases" xTitle="efSearch (candidate slots)" yTitle="Checks / query (count)"
            note="dashed line = exact scan"
            points={efRows.map((r) => ({ x: r.ef, y: r.distCalls }))}
            xScale="ordinal"
            color="var(--orange)"
            highlightX={params.efSearch}
            rule={{
              at: efRows[0]?.bruteForceDistCalls ?? 0,
              label: `exact scan = ${Math.round(efRows[0]?.bruteForceDistCalls ?? 0)}`,
            }}
          />
          {efCurrent && efBest && <Conclusion>
            Current <ParameterLink name="efSearch"/> = {params.efSearch} achieved <b>{percent(efCurrent.recall)} recall</b> with <b>{Math.round(efCurrent.distCalls)} checks/query</b>. The best measured recall was <b>{percent(efBest.recall)}</b>, first reached at efSearch = {efBest.ef} with {Math.round(efBest.distCalls)} checks/query. {Math.abs(efBest.recall - efCurrent.recall) < 0.0001 ? 'More search effort did not improve accuracy for these targets.' : `The measured accuracy gain over the current setting was ${((efBest.recall - efCurrent.recall) * 100).toFixed(1)} percentage points.`}
          </Conclusion>}
          <p className="experiment-caveat">If <ParameterLink name="k"/> exceeds <ParameterLink name="efSearch"/>, the effective candidate capacity is k, so early values can be identical. The exact-scan line is a distance-check reference, not elapsed time.</p>
        </div>}
      </section>

      <section className="experiment-block" aria-labelledby="experiment-m-title">
        <header><span>EXPERIMENT 2 · BUILD TIME</span><h3 id="experiment-m-title">Do more connections buy better searches?</h3><p>Build a separate index for each connection budget, then run the same query set against every rebuilt copy.</p></header>
        <ExperimentSetup
          changes={`M = ${mValues.join(', ')}. Current: ${params.M}. Each run also uses Mmax = M, Mmax0 = 2M, and mL = 1/ln(M).`}
          fixed={`Vectors and insertion order, metric (${params.metric}), efSearch (${params.efSearch}), k (${k}), and query set.`}
          measures="Recall@k, average search work, average L0 degree, and total graph edges."
        />
        <button
          className="button primary compact experiment-run"
          disabled={editsLocked(state) || busy !== null || vectors.length < 8}
          onClick={() =>
            run('m', () =>
              setMRows(
                mValues.map((M) => {
                const p: Params = {
                  ...params,
                  M,
                  Mmax: M,
                  Mmax0: M * 2,
                  mL: 1 / Math.log(Math.max(M, 2)),
                }
                const g = buildIndex(emptyGraph(), p, vectors)
                const s = graphStats(g)
                const m = measure(g, p, queries, k)
                return {
                  key: M,
                  recall: m.recall,
                  distCalls: m.distCalls,
                  avgDegree: s.layers[0]?.avgDegree ?? 0,
                  edges: s.edges,
                }
                }),
              ),
            )
          }
        >
          {busy === 'm' ? `Building ${mValues.length} indexes…` : `Build and compare ${mValues.length} indexes`}
        </button>
        {mRows && <div className="experiment-results">
          <LineChart
            title="Accuracy by connection budget" xTitle="M (links / new node)" yTitle="Recall@k (% true)"
            note="outlined point = current setting"
            points={mRows.map((r) => ({ x: r.key, y: r.recall }))}
            xScale="ordinal"
            yMax={1}
            yFormat={(v) => `${(v * 100).toFixed(0)}%`}
            highlightX={params.M}
          />
          <LineChart
            title="Index size by connection budget" xTitle="M (links / new node)" yTitle="Edges (undirected links)"
            note="more edges generally use more memory"
            points={mRows.map((r) => ({ x: r.key, y: r.edges }))}
            xScale="ordinal"
            color="var(--orange)"
            highlightX={params.M}
          />
          <table className="table experiment-table">
            <caption>All measurements for the rebuilt indexes</caption>
            <thead>
              <tr>
                <th>M</th><th>Recall@k</th><th>Checks/query</th><th>Avg L0 degree</th><th>Edges</th>
              </tr>
            </thead>
            <tbody>
              {mRows.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}{r.key === params.M ? ' · current' : ''}</td>
                  <td>{percent(r.recall)}</td>
                  <td>{Math.round(r.distCalls)}</td>
                  <td>{r.avgDegree.toFixed(1)}</td>
                  <td>{r.edges}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {mCurrent && mBest && <Conclusion>
            Current <ParameterLink name="M"/> = {params.M} produced <b>{percent(mCurrent.recall)} recall</b>, {mCurrent.edges} edges, and {Math.round(mCurrent.distCalls)} checks/query. The best measured recall was <b>{percent(mBest.recall)}</b> at M = {mBest.key}, using {mBest.edges} edges. {mRows.every((row) => Math.abs(row.recall - mRows[0].recall) < 0.0001) ? 'Recall was flat here, so the larger indexes bought no measured accuracy gain for these targets.' : 'Compare that accuracy gain with the added links and search work before choosing a larger M.'}
          </Conclusion>}
          <p className="experiment-caveat">This is a conventional connection-budget family, not a pure M-only test: the degree caps and layer multiplier change with M as listed above. Rebuilding can also change random layer assignments.</p>
        </div>}
      </section>

      <section className="experiment-block" aria-labelledby="experiment-rule-title">
        <header><span>EXPERIMENT 3 · LINK CHOICE</span><h3 id="experiment-rule-title">Nearest links or diverse directions?</h3><p>Build the same vectors twice. Simple keeps the nearest candidates; Heuristic may trade a close link for a route in a different direction.</p></header>
        <ExperimentSetup
          changes={`Neighbor selection rule: heuristic versus simple. Current: ${params.neighborRule}.`}
          fixed={`Vectors and order, M (${params.M}), all other build settings, efSearch (${params.efSearch}), k (${k}), and query set.`}
          measures="Recall@k and average distance checks per query."
        />
        <button
          className="button primary compact experiment-run"
          disabled={editsLocked(state) || busy !== null || vectors.length < 8}
          onClick={() =>
            run('rule', () =>
              setRuleRows(
                (['heuristic', 'simple'] as const).map((rule) => {
                const p: Params = { ...params, neighborRule: rule }
                const g = buildIndex(emptyGraph(), p, vectors)
                const m = measure(g, p, queries, k)
                return { rule, ...m }
                }),
              ),
            )
          }
        >
          {busy === 'rule' ? 'Building 2 indexes…' : 'Build and compare both rules'}
        </button>
        {ruleRows && <div className="experiment-results">
          <BarChart
            title="Accuracy by neighbor-selection rule" labelTitle="Selection rule" valueTitle="Recall@k (% true)"
            note={`${dataset.id} vectors · current rule: ${params.neighborRule}`}
            horizontal
            format={(v) => `${(v * 100).toFixed(0)}%`}
            bars={ruleRows.map((r) => ({
              label: r.rule,
              value: r.recall,
              color: r.rule === 'heuristic' ? 'var(--blue)' : 'var(--orange)',
            }))}
          />
          <BarChart
            title="Search work by neighbor-selection rule" labelTitle="Selection rule" valueTitle="Checks / query (count)"
            note="same queries · lower is less work"
            horizontal
            format={(value) => value.toFixed(1)}
            bars={ruleRows.map((r) => ({
              label: r.rule,
              value: r.distCalls,
              color: r.rule === 'heuristic' ? 'var(--blue)' : 'var(--orange)',
            }))}
          />
          {heuristic && simple && <Conclusion>
            {selectionRuleSummary(heuristic, simple)}
          </Conclusion>}
          <p className="experiment-caveat">This result describes the current vectors and targets, not a universal winner. Change the dataset shape in Insert and rerun to see when diverse links matter.</p>
        </div>}
      </section>

      <details className="advanced-details"><summary>Advanced reference defaults</summary><div className="section-title">Reference defaults</div>
      <table className="table">
        <thead>
          <tr>
            <th>parameter</th>
            <th>here</th>
            <th>typical production</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><ParameterLink name="M"/></td>
            <td>{params.M}</td>
            <td>16 (12–48)</td>
          </tr>
          <tr>
            <td><ParameterLink name="Mmax0"/></td>
            <td>{params.Mmax0}</td>
            <td>2M</td>
          </tr>
          <tr>
            <td><ParameterLink name="efConstruction"/></td>
            <td>{params.efConstruction}</td>
            <td>100–500</td>
          </tr>
          <tr>
            <td><ParameterLink name="efSearch"/></td>
            <td>{params.efSearch}</td>
            <td>tuned per query, 50–400</td>
          </tr>
          <tr>
            <td><ParameterLink name="mL"/></td>
            <td>{params.mL.toFixed(2)}</td>
            <td>1/ln(M)</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">
        The defaults on this canvas ({DEFAULT_PARAMS.M}, {DEFAULT_PARAMS.efConstruction}) are
        deliberately tiny so the graph stays legible. Do not read them as recommendations.
      </p></details>
    </div>
  )
}
