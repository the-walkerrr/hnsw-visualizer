import { useMemo, useState } from 'react'
import { DEFAULT_PARAMS, bruteForce, buildIndex, runSearch } from '../../hnsw/algorithm'
import { emptyGraph } from '../../hnsw/graph'
import { efSweep, graphStats, recallAt } from '../../hnsw/metrics'
import { preset } from '../../hnsw/presets'
import type { Graph, Params, Vec } from '../../hnsw/types'
import { useApp } from '../../state/store'
import { BarChart, LineChart } from '../Charts'

const EFS = [1, 2, 4, 8, 16, 32, 64, 128]
const MS = [2, 4, 6, 8, 12, 16, 24]
const QUERY_COUNT = 24

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

export function LabPanel() {
  const { params, graph, dataset, k } = useApp()
  const [efRows, setEfRows] = useState<ReturnType<typeof efSweep> | null>(null)
  const [mRows, setMRows] = useState<Row[] | null>(null)
  const [ruleRows, setRuleRows] = useState<Array<{ rule: string; recall: number; distCalls: number }> | null>(
    null,
  )
  const [busy, setBusy] = useState<string | null>(null)

  const queries = useMemo(() => preset('uniform').make(QUERY_COUNT, 20250826), [])
  const vectors = useMemo(
    () => [...graph.nodes.values()].sort((a, b) => a.seq - b.seq).map((n) => n.vec),
    [graph],
  )

  const run = (name: string, fn: () => void) => {
    setBusy(name)
    // Let the button paint its disabled state before the main thread blocks.
    window.setTimeout(() => {
      fn()
      setBusy(null)
    }, 16)
  }

  return (
    <div className="pane-scroll">
      <p className="hint" style={{ marginTop: 0 }}>
        Every experiment here rebuilds real indexes over the {vectors.length} vectors currently on
        the canvas and runs {QUERY_COUNT} fixed random queries at k = {k}, scoring recall against an
        exact scan. Nothing is faked or interpolated.
      </p>

      <div className="section-title">The recall dial: ef<sub>search</sub></div>
      <button
        className="iconbtn primary"
        disabled={busy !== null || vectors.length < 8}
        onClick={() => run('ef', () => setEfRows(efSweep(graph, params, queries, k, EFS)))}
      >
        {busy === 'ef' ? 'running…' : 'run ef sweep'}
      </button>
      {efRows && (
        <>
          <LineChart
            title="Recall@k vs efSearch"
            note="one query set, one graph — only the beam width changes"
            points={efRows.map((r) => ({ x: r.ef, y: r.recall }))}
            xScale="ordinal"
            yMax={1}
            yFormat={(v) => `${(v * 100).toFixed(0)}%`}
          />
          {efRows[0].recall > 0.9 && (
            <div className="note warn">
              Recall is already {(efRows[0].recall * 100).toFixed(0)}% at ef = 1, so there is no
              knee here — and that is worth understanding rather than tuning away.{' '}
              <b>Two dimensions flatter this algorithm enormously.</b> A greedy walk in 2-D almost
              always lands on the true nearest neighbour, because a point has few directions to hide
              in; ef is the dial that saves you in <i>high</i> dimensions, where distances concentrate
              and a greedy walk goes wrong all the time. On this canvas the honest way to see the
              curve move is to make the graph worse: drop M to 2 in the Tune tab (≈86% → 91% on
              clusters), or switch to the two-moons or spiral shape, where the manifold does the
              work high dimensionality would.
            </div>
          )}
          <LineChart
            title="Distance computations vs efSearch"
            note="lower is better"
            points={efRows.map((r) => ({ x: r.ef, y: r.distCalls }))}
            xScale="ordinal"
            color="var(--orange)"
            rule={{
              at: efRows[0]?.bruteForceDistCalls ?? 0,
              label: `exact scan = ${Math.round(efRows[0]?.bruteForceDistCalls ?? 0)}`,
            }}
          />
          {efRows[efRows.length - 1].distCalls > (efRows[0]?.bruteForceDistCalls ?? 0) && (
            <div className="note">
              Notice where the orange line crosses the dashed one: at high ef this index costs{' '}
              <b>more</b> than comparing against every vector. Graph indexes only pay off at scale —
              with {vectors.length} vectors, brute force is the better algorithm.
            </div>
          )}
          <p className="hint">
            Two charts, not one with two axes: recall is a fraction and cost is a count, and
            plotting them on a shared scale would invent a relationship that is not there. Read them
            together — recall saturates long before cost does, and the knee is where you want to
            operate.
          </p>
        </>
      )}

      <div className="section-title">Edge budget: M</div>
      <button
        className="iconbtn primary"
        disabled={busy !== null || vectors.length < 8}
        onClick={() =>
          run('m', () =>
            setMRows(
              MS.map((M) => {
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
        {busy === 'm' ? 'building 7 indexes…' : 'run M sweep'}
      </button>
      {mRows && (
        <>
          <LineChart
            title="Recall@k vs M"
            note="each point is a freshly built index"
            points={mRows.map((r) => ({ x: r.key, y: r.recall }))}
            xScale="ordinal"
            yMax={1}
            yFormat={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <LineChart
            title="Edges in the graph vs M"
            note="memory scales with this, not with recall"
            points={mRows.map((r) => ({ x: r.key, y: r.edges }))}
            xScale="ordinal"
            color="var(--orange)"
          />
          <table className="table">
            <thead>
              <tr>
                <th>M</th>
                <th>recall</th>
                <th>dist/query</th>
                <th>avg deg L0</th>
                <th>edges</th>
              </tr>
            </thead>
            <tbody>
              {mRows.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}</td>
                  <td>{(r.recall * 100).toFixed(0)}%</td>
                  <td>{Math.round(r.distCalls)}</td>
                  <td>{r.avgDegree.toFixed(1)}</td>
                  <td>{r.edges}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">
            Recall flattens out well before the edge count does. Past the knee you are paying memory
            and build time for nothing — which is why M = 16 shows up as a default so often.
          </p>
        </>
      )}

      <div className="section-title">Selection rule: heuristic vs simple</div>
      <button
        className="iconbtn primary"
        disabled={busy !== null || vectors.length < 8}
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
        {busy === 'rule' ? 'building 2 indexes…' : 'compare selection rules'}
      </button>
      {ruleRows && (
        <>
          <BarChart
            title="Recall@k by neighbour-selection rule"
            note={`${dataset.id} dataset · same vectors, same order, same M`}
            horizontal
            format={(v) => `${(v * 100).toFixed(0)}%`}
            bars={ruleRows.map((r) => ({
              label: r.rule,
              value: r.recall,
              color: r.rule === 'heuristic' ? 'var(--blue)' : 'var(--orange)',
            }))}
          />
          <p className="hint">
            The gap is widest on clustered data and nearly nil on a uniform cloud — switch the
            dataset in the Build tab and run it again. The heuristic's whole job is to keep the
            bridges between clusters, and a uniform cloud has no bridges to keep.
          </p>
        </>
      )}

      <div className="section-title">Reference defaults</div>
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
            <td>M</td>
            <td>{params.M}</td>
            <td>16 (12–48)</td>
          </tr>
          <tr>
            <td>Mmax0</td>
            <td>{params.Mmax0}</td>
            <td>2M</td>
          </tr>
          <tr>
            <td>efConstruction</td>
            <td>{params.efConstruction}</td>
            <td>100–500</td>
          </tr>
          <tr>
            <td>efSearch</td>
            <td>{params.efSearch}</td>
            <td>tuned per query, 50–400</td>
          </tr>
          <tr>
            <td>mL</td>
            <td>{params.mL.toFixed(2)}</td>
            <td>1/ln(M)</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">
        The defaults on this canvas ({DEFAULT_PARAMS.M}, {DEFAULT_PARAMS.efConstruction}) are
        deliberately tiny so the graph stays legible. Do not read them as recommendations.
      </p>
    </div>
  )
}
