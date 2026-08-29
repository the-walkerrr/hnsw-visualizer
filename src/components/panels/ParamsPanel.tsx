import { METRIC_LABEL, METRIC_NOTE } from '../../hnsw/metric'
import type { Metric } from '../../hnsw/types'
import { useApp, useDispatch } from '../../state/store'

function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  hint,
  format,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  hint: string
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <span className="val">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="hint">{hint}</p>
    </div>
  )
}

export function ParamsPanel() {
  const { params } = useApp()
  const dispatch = useDispatch()
  const set = (patch: Partial<typeof params>) => dispatch({ type: 'setParams', patch })

  return (
    <div className="pane-scroll">
      <div className="note accent">
        These are the knobs that control how HNSW builds its graph. You don't need to touch these
        to get started — the defaults are good. Change them to see how they affect performance.
        <br /><br />
        <strong>Note:</strong> Changing graph-shaping parameters (M, caps, efConstruction, mL,
        metric) automatically rebuilds the index so you're always comparing apples to apples.
      </div>

      <div className="section-title">Graph shape (rebuilds on change)</div>
      <Slider
        id="M"
        label="M — connections per new vector"
        value={params.M}
        min={2}
        max={24}
        hint="How many connections each new vector makes when added. More connections = better search accuracy but uses more memory. The default (16) is a good balance for most uses."
        onChange={(M) =>
          set({ M, Mmax: M, Mmax0: M * 2, mL: 1 / Math.log(Math.max(M, 2)) })
        }
      />
      <Slider
        id="Mmax"
        label="Mmax — max connections above layer 0"
        value={params.Mmax}
        min={params.M}
        max={32}
        hint={`The maximum number of connections any vector can have (except at the base layer). When a vector gets too popular, its connections are pruned back to this limit. Cannot go below M = ${params.M}.`}
        onChange={(Mmax) => set({ Mmax })}
      />
      <Slider
        id="Mmax0"
        label="Mmax0 — max connections at layer 0"
        value={params.Mmax0}
        min={params.M}
        max={64}
        hint="The same connection limit, but for layer 0 — the base layer where every vector lives. It gets a higher limit because layer 0 does the most precise searching."
        onChange={(Mmax0) => set({ Mmax0 })}
      />
      <Slider
        id="efc"
        label="efConstruction — build quality"
        value={params.efConstruction}
        min={1}
        max={200}
        hint="How hard the algorithm searches for the best connections when building the graph. Higher = better quality graph, but slower to build. This doesn't affect search speed at all."
        onChange={(efConstruction) => set({ efConstruction })}
      />
      <Slider
        id="mL"
        label="mL — layer height probability"
        value={params.mL}
        min={0.1}
        max={2}
        step={0.05}
        format={(v) => v.toFixed(2)}
        hint={`Controls how many layers the index has. The paper's formula (1/ln(M)) is the sweet spot — currently ${(1 / Math.log(Math.max(params.M, 2))).toFixed(2)} for M = ${params.M}. Change it to see what happens with too many or too few layers.`}
        onChange={(mL) => set({ mL })}
      />
      <div className="field">
        <div className="field-head">
          <label htmlFor="metric">Distance metric</label>
        </div>
        <select
          id="metric"
          value={params.metric}
          onChange={(e) => set({ metric: e.target.value as Metric })}
        >
          {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
            <option key={m} value={m}>
              {METRIC_LABEL[m]}
            </option>
          ))}
        </select>
        <p className="hint">{METRIC_NOTE[params.metric]}</p>
      </div>

      <div className="section-title">Neighbor selection (rebuilds on change)</div>
      <div className="field">
        <div className="segmented" role="group" aria-label="Selection rule">
          {(['heuristic', 'simple'] as const).map((r) => (
            <button
              key={r}
              aria-pressed={params.neighborRule === r}
              onClick={() => set({ neighborRule: r })}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="hint">
          {params.neighborRule === 'heuristic'
            ? 'Algorithm 4: keep a candidate only if it is closer to the node than to any already-chosen neighbor. Spreads edges in all directions and creates the long-range links that make the graph navigable.'
            : 'Algorithm 3: just take the M nearest. On clustered data this leaves whole regions unreachable — try it to see the difference!'}
        </p>
      </div>
      <div className="checkline">
        <input
          id="extend"
          type="checkbox"
          checked={params.extendCandidates}
          onChange={(e) => set({ extendCandidates: e.target.checked })}
        />
        <label htmlFor="extend">
          extendCandidates
          <span className="hint" style={{ display: 'block' }}>
            Widen the candidate pool with the neighbors of candidates. Helps on very clustered data;
            costs extra distance computations everywhere else.
          </span>
        </label>
      </div>
      <div className="checkline">
        <input
          id="keep"
          type="checkbox"
          checked={params.keepPrunedConnections}
          onChange={(e) => set({ keepPrunedConnections: e.target.checked })}
        />
        <label htmlFor="keep">
          keepPrunedConnections
          <span className="hint" style={{ display: 'block' }}>
            If the heuristic can't fill M slots, top up with the closest rejects rather than leave
            the node under-connected. Turn it off and watch nodes end up with too few edges.
          </span>
        </label>
      </div>

      <div className="section-title">Query time (no rebuild needed)</div>
      <Slider
        id="efs"
        label="efSearch — accuracy dial"
        value={params.efSearch}
        min={1}
        max={200}
        hint="How wide the search beam is at query time. Low = fast but might miss results. High = slower but finds the true nearest neighbors. This is your accuracy dial — you can change it without rebuilding."
        onChange={(efSearch) => set({ efSearch })}
      />
      <Slider
        id="seed"
        label="Level RNG seed"
        value={params.seed}
        min={1}
        max={200}
        hint="Level assignment is random, so two indexes over identical data can differ. Change the seed to see how much of the graph's quality is luck."
        onChange={(seed) => set({ seed })}
      />
    </div>
  )
}
