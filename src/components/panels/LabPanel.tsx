import { useMemo, useState } from 'react'
import { DEFAULT_PARAMS, bruteForce, buildIndex, runSearch } from '../../hnsw/algorithm'
import { emptyGraph } from '../../hnsw/graph'
import { efSweep, graphStats, recallAt } from '../../hnsw/metrics'
import { preset } from '../../hnsw/presets'
import type { Graph, Params, Vec } from '../../hnsw/types'
import { editsLocked, useApp } from '../../state/store'
import { BarChart, LineChart } from '../Charts'
import { ParameterLink } from '../ParameterLink'
import { followLearnReference } from '../../learnReferenceNavigation'

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
  const state = useApp()
  const { params, graph, dataset, k } = state
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
      <div className="panel-intro"><h2>Compare one setting</h2><p>Start with search effort. Predict whether keeping more possible answers will find more true matches, require more distance checks, or both.</p></div>
      <p className="hint">Each experiment uses the same {QUERY_COUNT} test targets on your {vectors.length} dots, asking for <ParameterLink name="k"/> = {k} matches. Recall is the share of true nearest matches found; distance checks measure work. <ParameterLink name="efSearch"/> keeps the graph fixed. The other experiments rebuild separate copies; your canvas stays unchanged.</p>
      {vectors.length < 8 && <p className="note">Add at least 8 dots in Insert to enable these comparisons. For a known miss with only four dots, use <a href="/learn#four-dot-search" data-learn-reference onClick={followLearnReference}>the guided example</a>.</p>}

      <div className="section-title">The recall dial: <ParameterLink name="efSearch"/></div>
      <button
        className="iconbtn primary"
        disabled={editsLocked(state) || busy !== null || vectors.length < 8}
        onClick={() => run('ef', () => setEfRows(efSweep(graph, params, queries, k, EFS)))}
      >
        {busy === 'ef' ? 'running…' : 'Compare search effort'}
      </button>
      {efRows && (
        <>
          <LineChart
            title="Recall@k vs efSearch" xTitle="efSearch" yTitle="Recall"
            note="same targets and graph; only shortlist capacity changes"
            points={efRows.map((r) => ({ x: r.ef, y: r.recall }))}
            xScale="ordinal"
            yMax={1}
            yFormat={(v) => `${(v * 100).toFixed(0)}%`}
          />
          {efRows[0].recall > 0.9 && (
            <div className="note warn">
              The first setting already finds {(efRows[0].recall * 100).toFixed(0)}% of true matches. If the recall line stays flat, extra effort found no additional correct answers for these targets. Compare the distance checks too. This result applies to this example; it does not promise that every query is easy. Try the <a href="/learn#four-dot-search" data-learn-reference onClick={followLearnReference}>four-dot detour</a> for an example where an extra slot helps.
            </div>
          )}
          <LineChart
            title="Distance computations vs efSearch" xTitle="efSearch" yTitle="Distance checks"
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
              Compare the orange line with the dashed exact-scan baseline. A tested setting used{' '}
              <b>more</b> distance checks than comparing against every vector:
              this measured run used more checks than an exact scan over {vectors.length} dots. This measures distance checks, not total running time.
            </div>
          )}
          <p className="hint">
            Read both charts: higher recall means more true matches; lower distance checks means less work. Prefer a setting that gives the accuracy you need without unnecessary checks. When <ParameterLink name="k"/> is greater than <ParameterLink name="efSearch"/>, this demo uses <ParameterLink name="k"/> slots, so the first settings may behave identically.
          </p>
        </>
      )}

      <div className="section-title">Edge budget: <ParameterLink name="M"/></div>
      <button
        className="iconbtn primary"
        disabled={editsLocked(state) || busy !== null || vectors.length < 8}
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
        {busy === 'm' ? 'building 7 indexes…' : 'Compare connection settings'}
      </button>
      {mRows && (
        <>
          <LineChart
            title="Recall@k vs M" xTitle="M" yTitle="Recall"
            note="each point is a freshly built index"
            points={mRows.map((r) => ({ x: r.key, y: r.recall }))}
            xScale="ordinal"
            yMax={1}
            yFormat={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <LineChart
            title="Edges in the graph vs M" xTitle="M" yTitle="Edges"
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
            {mRows.every(row => Math.round(row.recall * 100) === Math.round(mRows[0].recall * 100))
              ? 'At the displayed precision, every connection setting found the same share of true matches. No accuracy improvement is visible here; compare edge count and work. Whole percentages can hide smaller differences.'
              : 'Compare the gain in true matches against the number of links and distance checks. More links do not guarantee an improvement for every target.'}
            {' '}This comparison also resets <ParameterLink name="Mmax"/> to <ParameterLink name="M"/>, <ParameterLink name="Mmax0"/> to 2 × <ParameterLink name="M"/>, and <ParameterLink name="mL"/> to 1 / ln(<ParameterLink name="M"/>), so layer assignments can change.
          </p>
        </>
      )}

      <div className="section-title"><ParameterLink name="neighborRule" label="Selection rule"/>: heuristic vs simple</div>
      <button
        className="iconbtn primary"
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
        {busy === 'rule' ? 'building 2 indexes…' : 'compare selection rules'}
      </button>
      {ruleRows && (
        <>
          <BarChart
            title="Recall@k by neighbour-selection rule" labelTitle="Selection rule" valueTitle="Recall"
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
            The simple rule keeps the nearest candidates. The heuristic rule tries to keep different directions. Compare the measured results here; neither outcome is guaranteed for every dataset. Change the shape in Insert, then rerun.
          </p>
        </>
      )}

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
