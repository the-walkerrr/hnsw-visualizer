import { useState } from 'react'
import { WORLD } from '../../hnsw/constants'
import { liveNodes } from '../../hnsw/graph'
import { PRESETS, type PresetId } from '../../hnsw/presets'
import { makeRng } from '../../hnsw/rng'
import { editsLocked, useApp, useDispatch, useScript } from '../../state/store'
import { ControlHelp } from './ControlHelp'

function RangeField({ id, label, value, min, max, hint, guide, onChange }: { id: string; label: string; value: number; min: number; max: number; hint: string; guide: 'vectors' | 'k'; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const commit = () => {
    const raw = Number(draft)
    const next = Math.min(max, Math.max(min, Math.round(Number.isFinite(raw) ? raw : min)))
    setMessage(draft.trim() === '' || next !== raw ? `Adjusted to ${next}. Enter a whole number from ${min} to ${max}.` : '')
    setDraft(String(next)); if (next !== value) onChange(next)
  }
  return <div className="field"><div className="field-head"><label htmlFor={id}>{label}</label><input className="number-control" type="number" aria-label={`${label} value`} aria-describedby={`${id}-feedback`} min={min} max={max} value={editing ? draft : String(value)} onFocus={() => { setEditing(true); setDraft(String(value)) }} onChange={(e) => setDraft(e.target.value)} onBlur={() => { commit(); setEditing(false) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}/></div><input id={id} type="range" min={min} max={max} value={value} onChange={(e) => { setMessage(''); onChange(Number(e.target.value)) }}/><p className="hint">{hint} Range: {min}–{max}.</p><p id={`${id}-feedback`} className="hint" role="status">{message}</p><ControlHelp guide={guide}/></div>
}

export function BuildPanel() {
  const state = useApp()
  const dispatch = useDispatch()
  const script = useScript()
  const { dataset, k } = state
  const [dataOpen, setDataOpen] = useState(state.graph.nodes.size === 0)
  const vectorCount = liveNodes(state.graph).length
  const rebuild = (id = dataset.id, n = vectorCount || dataset.n) => script([{ t: 'preset', id, n, seed: dataset.seed }])
  const randomPoint = () => { const rng = makeRng((Date.now() ^ state.graph.nextSeq) >>> 0); return [40 + rng() * (WORLD.width - 80), 40 + rng() * (WORLD.height - 80)] as const }

  return <fieldset className="pane-scroll panel-fields" disabled={editsLocked(state)}>
    <div className="panel-intro"><p className="section-kicker">Start here</p><h2>Find the closest dots.</h2><p>Choose a spot on the canvas, or let us pick one.</p></div>
    <button className="button primary run-search" disabled={!vectorCount} onClick={() => script([{ t: 'tool', tool: 'search' }, { t: 'search', at: [...randomPoint()] }])}>Choose a new target <span aria-hidden="true">→</span></button>
    {state.lastSearch && <button className="button secondary" onClick={() => dispatch({ type: 'rerunSearch' })}>Rerun this target</button>}
    <button className="advanced-link" onClick={() => dispatch({ type: 'startGuided' })}>Load the four-dot lesson (replaces this example)</button>
    <p className="search-next">{vectorCount ? 'Then press Play below the graph to watch it work.' : 'Add dots below to start searching.'}</p>
    {k > vectorCount && vectorCount > 0 && <p className="note" role="status">You requested {k} matches, but only {vectorCount} live {vectorCount === 1 ? 'dot is' : 'dots are'} available. At most {vectorCount} can be returned.</p>}
    <RangeField id="k" label="Results requested (k)" value={k} min={1} max={20} hint="How many close matches do you want?" guide="k" onChange={(value) => dispatch({ type: 'setK', k: value })}/>
    <details className="advanced-details" open={dataOpen || vectorCount === 0} onToggle={(e) => setDataOpen(e.currentTarget.open)}><summary>Change the dots <span>{vectorCount} dots</span></summary><div className="details-body">
    <div className="field"><div className="field-head"><label htmlFor="preset">Shape</label></div><select id="preset" value={dataset.id} onChange={(e) => rebuild(e.target.value as PresetId)}>{PRESETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ControlHelp guide="dataset"/></div>
    <RangeField id="count" label="Vectors" value={vectorCount} min={0} max={400} hint="Use 24–80 while learning so individual routes stay visible." guide="vectors" onChange={(n) => rebuild(dataset.id, n)}/>
    <div className="row"><button className="button secondary compact" onClick={() => script([{ t: 'tool', tool: 'insert' }, { t: 'insert', at: [...randomPoint()] }, { t: 'seek', to: 'end' }])}>Add one dot</button><button className="button ghost compact" onClick={() => script([{ t: 'clear' }])}>Clear dots</button></div>
    </div></details>
    <div className="explore-tip"><b>Curious about accuracy?</b><p>Change search effort in Tune, then choose Rerun this target to keep the comparison fair.</p><button className="advanced-link" onClick={() => dispatch({ type: 'setRightTab', tab: 'params' })}>Adjust search effort →</button></div>
  </fieldset>
}
