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
        Changing anything that shapes the graph — M, the caps, ef<sub>construction</sub>, mL, the
        metric or the selection rule — rebuilds the index from the same vectors in the same order,
        so you are always comparing like with like.
      </div>

      <div className="section-title">Graph shape (rebuilds)</div>
      <Slider
        id="M"
        label="M — edges per new node"
        value={params.M}
        min={2}
        max={24}
        hint="How many neighbours a node links to when it is inserted. The single most consequential knob: bigger M means better recall, more memory, and slower builds. Real systems use 12–48; small values here keep the picture readable."
        onChange={(M) =>
          set({ M, Mmax: M, Mmax0: M * 2, mL: 1 / Math.log(Math.max(M, 2)) })
        }
      />
      <Slider
        id="Mmax"
        label="Mmax — degree cap above layer 0"
        value={params.Mmax}
        min={params.M}
        max={32}
        hint={`A node may accumulate more edges than M as later nodes link to it. When it goes over this cap its neighbourhood is re-selected from scratch. It cannot go below M = ${params.M}: Algorithm 1 shrinks a new node's *neighbours*, never the new node itself, so a cap under M would be violated the moment a node is inserted.`}
        onChange={(Mmax) => set({ Mmax })}
      />
      <Slider
        id="Mmax0"
        label="Mmax0 — degree cap on layer 0"
        value={params.Mmax0}
        min={params.M}
        max={64}
        hint="Layer 0 holds every element and does all the fine-grained work, so it gets a bigger budget — conventionally 2M. It also dominates the index's memory footprint."
        onChange={(Mmax0) => set({ Mmax0 })}
      />
      <Slider
        id="efc"
        label="efConstruction — beam width while building"
        value={params.efConstruction}
        min={1}
        max={200}
        hint="How many candidates each insertion considers before choosing its M edges. Higher = better graph, slower build, no extra memory or query cost. This is the cheapest quality win available."
        onChange={(efConstruction) => set({ efConstruction })}
      />
      <Slider
        id="mL"
        label="mL — level decay"
        value={params.mL}
        min={0.1}
        max={2}
        step={0.05}
        format={(v) => v.toFixed(2)}
        hint={`Controls how tall the index gets: P(level ≥ l) = e^(−l/mL). The paper's optimum is 1/ln(M) = ${(1 / Math.log(Math.max(params.M, 2))).toFixed(2)} for M = ${params.M}, which makes each layer about 1/M the size of the one below. Turn it up to see a needlessly tall index.`}
        onChange={(mL) => set({ mL })}
      />
      <div className="field">
        <div className="field-head">
          <label htmlFor="metric">distance metric</label>
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

      <div className="section-title">Neighbour selection (rebuilds)</div>
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
            ? 'Algorithm 4: keep a candidate only if it is closer to the node than to any neighbour already kept. Spreads edges across directions and creates the long-range links that make the graph navigable.'
            : 'Algorithm 3: just take the M nearest. On clustered data this leaves whole regions unreachable — build a clustered dataset and compare the recall in the Lab tab.'}
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
            Widen the candidate pool with the neighbours of the candidates. Helps only on extremely
            clustered data; costs distance computations everywhere else.
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
            If the heuristic cannot fill M slots, top up with the closest rejects rather than leave
            the node under-connected. Turn it off and watch nodes end up with too few edges.
          </span>
        </label>
      </div>

      <div className="section-title">Query time (no rebuild)</div>
      <Slider
        id="efs"
        label="efSearch — beam width while searching"
        value={params.efSearch}
        min={1}
        max={200}
        hint="The recall dial you can turn at runtime, per query. ef = 1 is a plain greedy walk that gets stuck; ef = 200 explores far more of layer 0 and costs proportionally more. Nothing about the graph changes."
        onChange={(efSearch) => set({ efSearch })}
      />
      <Slider
        id="seed"
        label="level RNG seed"
        value={params.seed}
        min={1}
        max={200}
        hint="Level assignment is random, so two indexes over identical data can differ. Change the seed to see how much of the graph's quality is luck."
        onChange={(seed) => set({ seed })}
      />
    </div>
  )
}
