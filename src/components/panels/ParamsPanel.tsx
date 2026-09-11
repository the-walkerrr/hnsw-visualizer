import { useState } from 'react'
import { DEFAULT_PARAMS } from '../../hnsw/algorithm'
import { METRIC_LABEL, METRIC_NOTE } from '../../hnsw/metric'
import type { Metric } from '../../hnsw/types'
import { editsLocked, useApp, useDispatch } from '../../state/store'
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
  const set = (patch: Partial<typeof params>) => dispatch({ type: 'setParams', patch })
  const reset = () => dispatch({ type: 'setParams', patch: { ...DEFAULT_PARAMS } })

  return <fieldset className="pane-scroll panel-fields" disabled={editsLocked(state)}>
    <div className="panel-intro with-action"><div><h2>Try one small change.</h2><p>Keep the same target and k. Change only search effort, then rerun to compare.</p></div><button className="button ghost compact" onClick={reset}>Reset</button></div>
    <Slider id="param-efs" label="Search effort (efSearch)" value={params.efSearch} min={1} max={200} hint="More possible matches in play. More work, often better answers." guide="efSearch" onChange={(efSearch) => set({ efSearch })}/>
    <button className="button primary" disabled={!state.lastSearch} onClick={() => dispatch({ type: 'rerunSearch' })}>Rerun this target</button>
    <p className="hint">{state.lastSearch ? `Target fixed at [${state.lastSearch.query.map(v => v.toFixed(1)).join(', ')}]. Finish the replay, then open Results for the before/after comparison.` : 'Run a search in Explore first, or load the four-dot lesson.'}</p>
    <div className="section-title"><span>Graph structure</span><em>rebuilds</em></div>
    <Slider id="param-M" label="Connections (M)" value={params.M} min={2} max={24} hint="Routes each new dot chooses. Changing M also resets the upper degree cap to M, the bottom cap to 2 × M, and mL to 1 / ln(M). This rebuild can change both links and layers." guide="M" onChange={(M) => set({ M, Mmax: M, Mmax0: M * 2, mL: 1 / Math.log(Math.max(M, 2)) })}/>
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
