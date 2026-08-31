import { DEFAULT_PARAMS } from '../../hnsw/algorithm'
import { METRIC_LABEL, METRIC_NOTE } from '../../hnsw/metric'
import type { Metric } from '../../hnsw/types'
import { useApp, useDispatch } from '../../state/store'

function Slider({ id, label, value, min, max, step = 1, hint, format, onChange }: { id: string; label: string; value: number; min: number; max: number; step?: number; hint: string; format?: (v: number) => string; onChange: (v: number) => void }) {
  const update = (raw: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(raw) ? raw : min)))
  return <div className="field"><div className="field-head"><label htmlFor={id}>{label}</label><input className="number-control" type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={format ? format(value) : value} onChange={(e) => update(Number(e.target.value))}/></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))}/><p className="hint">{hint}</p></div>
}

export function ParamsPanel() {
  const { params } = useApp()
  const dispatch = useDispatch()
  const set = (patch: Partial<typeof params>) => dispatch({ type: 'setParams', patch })
  const reset = () => dispatch({ type: 'setParams', patch: { ...DEFAULT_PARAMS } })

  return <div className="pane-scroll">
    <div className="panel-intro with-action"><div><h2>Tune the index</h2><p>Build-time changes rebuild the current vectors. Query-time changes do not.</p></div><button className="button ghost compact" onClick={reset}>Defaults</button></div>
    <div className="section-title"><span>Graph structure</span><em>rebuilds</em></div>
    <Slider id="param-M" label="Connections per insertion (M)" value={params.M} min={2} max={24} hint="Higher values improve connectivity but increase memory and build cost." onChange={(M) => set({ M, Mmax: M, Mmax0: M * 2, mL: 1 / Math.log(Math.max(M, 2)) })}/>
    <Slider id="efc" label="Construction beam (efConstruction)" value={params.efConstruction} min={1} max={200} hint="How broadly insertion searches for useful neighbors." onChange={(efConstruction) => set({ efConstruction })}/>
    <Slider id="mL" label="Layer multiplier (mL)" value={params.mL} min={0.1} max={2} step={0.01} format={(v) => v.toFixed(2)} hint={`Paper-derived value for M ${params.M}: ${(1 / Math.log(Math.max(params.M, 2))).toFixed(2)}.`} onChange={(mL) => set({ mL })}/>
    <div className="field"><div className="field-head"><label htmlFor="metric">Distance metric</label></div><select id="metric" value={params.metric} onChange={(e) => set({ metric: e.target.value as Metric })}>{(Object.keys(METRIC_LABEL) as Metric[]).map((metric) => <option key={metric} value={metric}>{METRIC_LABEL[metric]}</option>)}</select><p className="hint">{METRIC_NOTE[params.metric]}</p></div>

    <div className="section-title"><span>Query time</span><em>instant</em></div>
    <Slider id="param-efs" label="Search beam (efSearch)" value={params.efSearch} min={1} max={200} hint="Higher values inspect more candidates: slower, with better recall." onChange={(efSearch) => set({ efSearch })}/>

    <details className="advanced-details"><summary>Advanced graph construction</summary><div className="details-body">
      <Slider id="Mmax" label="Maximum degree above L0" value={params.Mmax} min={params.M} max={32} hint={`Cannot be lower than M (${params.M}).`} onChange={(Mmax) => set({ Mmax })}/>
      <Slider id="Mmax0" label="Maximum degree at L0" value={params.Mmax0} min={params.M} max={64} hint="Layer zero is usually allowed twice the degree of upper layers." onChange={(Mmax0) => set({ Mmax0 })}/>
      <Slider id="seed" label="Level RNG seed" value={params.seed} min={1} max={200} hint="Reproduce or vary random layer assignments." onChange={(seed) => set({ seed })}/>
      <div className="field"><span className="field-label">Neighbor selection</span><div className="segmented full" role="group" aria-label="Selection rule">{(['heuristic', 'simple'] as const).map((rule) => <button key={rule} aria-pressed={params.neighborRule === rule} onClick={() => set({ neighborRule: rule })}>{rule}</button>)}</div><p className="hint">{params.neighborRule === 'heuristic' ? 'Diversifies directions to preserve long-range routes.' : 'Keeps only the nearest candidates; simpler, but easier to trap in clusters.'}</p></div>
      <label className="checkline"><input type="checkbox" checked={params.extendCandidates} onChange={(e) => set({ extendCandidates: e.target.checked })}/><span><b>Extend candidates</b><small>Include neighbors of candidates in the selection pool.</small></span></label>
      <label className="checkline"><input type="checkbox" checked={params.keepPrunedConnections} onChange={(e) => set({ keepPrunedConnections: e.target.checked })}/><span><b>Keep pruned connections</b><small>Fill unused degree slots with the nearest rejected candidates.</small></span></label>
    </div></details>
  </div>
}
