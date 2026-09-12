import { useState } from 'react'
import { DEFAULT_PARAMS } from '../../hnsw/algorithm'
import { WORLD } from '../../hnsw/constants'
import { liveNodes } from '../../hnsw/graph'
import { METRIC_LABEL, METRIC_NOTE } from '../../hnsw/metric'
import { PRESETS, type PresetId } from '../../hnsw/presets'
import { makeRng } from '../../hnsw/rng'
import type { Metric } from '../../hnsw/types'
import { editsLocked, useApp, useDispatch, useScript } from '../../state/store'
import type { ControlGuideKey } from '../../lessons/controlGuides'
import { ControlHelp } from './ControlHelp'

function Slider({ id, label, value, min, max, step = 1, hint, guide, format, onChange }: { id: string; label: string; value: number; min: number; max: number; step?: number; hint: string; guide: ControlGuideKey; format?: (v: number) => string; onChange: (v: number) => void }) {
  const display = format ? format(value) : String(value)
  const [draft, setDraft] = useState(display)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const commit = () => {
    if (draft === display) return
    const raw = Number(draft)
    const clamped = Math.min(max, Math.max(min, Number.isFinite(raw) ? raw : min))
    const next = Number((Math.round(clamped / step) * step).toFixed(4))
    setMessage(draft.trim() === '' || next !== raw ? `Adjusted to ${next}. Allowed range: ${min}–${max}, step ${step}.` : '')
    setDraft(String(next)); if (next !== value) onChange(next)
  }
  return <div className="field"><div className="field-head"><label htmlFor={id}>{label}</label><input className="number-control" type="number" aria-label={`${label} value`} aria-describedby={`${id}-feedback`} min={min} max={max} step={step} value={editing ? draft : display} onFocus={() => { setEditing(true); setDraft(display) }} onChange={(e) => setDraft(e.target.value)} onBlur={() => { commit(); setEditing(false) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}/></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => { setMessage(''); onChange(Number(e.target.value)) }}/><p className="hint">{hint}</p><p id={`${id}-feedback`} className="hint" role="status">{message}</p><ControlHelp guide={guide}/></div>
}

export function ParamsPanel() {
  const state = useApp()
  const { params } = state
  const dispatch = useDispatch()
  const script = useScript()
  const set = (patch: Partial<typeof params>) => dispatch({ type: 'setParams', patch })
  const reset = () => dispatch({ type: 'setParams', patch: { ...DEFAULT_PARAMS } })
  const vectorCount = liveNodes(state.graph).length
  const { dataset } = state
  const rebuild = (id = dataset.id, n = vectorCount || dataset.n) => script([{ t: 'preset', id, n, seed: dataset.seed }])
  const randomPoint = () => { const rng = makeRng((Date.now() ^ state.graph.nextSeq) >>> 0); return [40 + rng() * (WORLD.width - 80), 40 + rng() * (WORLD.height - 80)] as const }

  return <fieldset className="pane-scroll panel-fields" disabled={editsLocked(state)}>
    <div className="panel-intro with-action"><div><p className="section-kicker">Insert</p><h2>Build and add dots.</h2><p>Choose the dataset, then control how each new dot finds and keeps links.</p></div><button type="button" className="iconbtn square parameter-reset" aria-label="Reset parameters" title="Reset parameters" onClick={reset}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 7A6 6 0 1 0 16 11"/><path d="M15.5 3v4h-4"/></svg></button></div>
    <div className="field"><div className="field-head"><label htmlFor="preset">Shape</label></div><select id="preset" value={dataset.id} onChange={(e) => rebuild(e.target.value as PresetId)}>{PRESETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ControlHelp guide="dataset"/></div>
    <Slider id="count" label="Vectors" value={vectorCount} min={0} max={400} hint="Use 24–80 while learning so individual routes stay visible. Range: 0–400." guide="vectors" onChange={(n) => rebuild(dataset.id, n)}/>
    <div className="row dataset-actions"><button className="button secondary compact" onClick={() => script([{ t: 'tool', tool: 'insert' }, { t: 'insert', at: [...randomPoint()] }, { t: 'seek', to: 'end' }])}>Add one dot</button><button className="button ghost compact" disabled={!vectorCount} onClick={() => script([{ t: 'clear' }])}>Clear dots</button></div>
    <div className="section-title"><span>Connection settings</span><em>rebuilds</em></div>
    <Slider id="param-M" label="Connections (M)" value={params.M} min={2} max={24} hint={`Each new dot keeps up to ${params.M} chosen neighbors on every layer where it appears. On L0, it may later grow to ${params.M * 2} links as other dots connect back. Fewer useful candidates can mean fewer links. Changing M rebuilds the graph.`} guide="M" onChange={(M) => set({ M, Mmax: M, Mmax0: M * 2, mL: 1 / Math.log(Math.max(M, 2)) })}/>
    <Slider id="efc" label="Build effort (efConstruction)" value={params.efConstruction} min={1} max={200} hint="Possible neighbors considered while adding a dot." guide="efConstruction" onChange={(efConstruction) => set({ efConstruction })}/>
    <details className="advanced-details"><summary>Advanced settings <span>Optional</span></summary><div className="details-body">
    <Slider id="mL" label="Layer multiplier (mL)" value={params.mL} min={0.1} max={2} step={0.01} format={(v) => v.toFixed(2)} hint={`Usual value for M ${params.M}: ${(1 / Math.log(Math.max(params.M, 2))).toFixed(2)}.`} guide="mL" onChange={(mL) => set({ mL })}/>
    <div className="field"><div className="field-head"><label htmlFor="metric">Distance metric</label></div><select id="metric" value={params.metric} onChange={(e) => set({ metric: e.target.value as Metric })}>{(Object.keys(METRIC_LABEL) as Metric[]).map((metric) => <option key={metric} value={metric}>{METRIC_LABEL[metric]}</option>)}</select><p className="hint">{METRIC_NOTE[params.metric]}</p><ControlHelp guide="metric"/></div>

      <Slider id="Mmax" label="Maximum degree above L0" value={params.Mmax} min={params.M} max={32} hint={`Hard edge limit; cannot be lower than M (${params.M}).`} guide="Mmax" onChange={(Mmax) => set({ Mmax })}/>
      <Slider id="Mmax0" label="Maximum degree at L0" value={params.Mmax0} min={params.M} max={64} hint="Hard edge limit on the bottom layer; usually 2 × M." guide="Mmax0" onChange={(Mmax0) => set({ Mmax0 })}/>
      <Slider id="seed" label="Level random seed" value={params.seed} min={1} max={200} hint="A repeatable way to reshuffle random layer assignments." guide="seed" onChange={(seed) => set({ seed })}/>
      <div className="field"><span className="field-label">Neighbor selection</span><div className="segmented full" role="group" aria-label="Selection rule">{(['heuristic', 'simple'] as const).map((rule) => <button key={rule} aria-pressed={params.neighborRule === rule} onClick={() => set({ neighborRule: rule })}>{rule}</button>)}</div><p className="hint">{params.neighborRule === 'heuristic' ? 'Keeps edges pointing in different directions.' : 'Keeps only the nearest candidates.'}</p><ControlHelp guide="neighborRule"/></div>
      <div className="field switch-field"><label className="checkline"><input type="checkbox" checked={params.extendCandidates} onChange={(e) => set({ extendCandidates: e.target.checked })}/><span><b>Extend candidates</b><small>Also consider neighbors of candidates.</small></span></label><ControlHelp guide="extendCandidates"/></div>
      <div className="field switch-field"><label className="checkline"><input type="checkbox" checked={params.keepPrunedConnections} onChange={(e) => set({ keepPrunedConnections: e.target.checked })}/><span><b>Keep pruned connections</b><small>Use rejected candidates to fill empty edge slots.</small></span></label><ControlHelp guide="keepPrunedConnections"/></div>
    </div></details>
  </fieldset>
}
