import { useState } from 'react'
import { WORLD } from '../../hnsw/constants'
import { liveNodes } from '../../hnsw/graph'
import { makeRng } from '../../hnsw/rng'
import { editsLocked, useApp, useDispatch, useScript } from '../../state/store'
import { ControlHelp } from './ControlHelp'
import type { ControlGuideKey } from '../../lessons/controlGuides'

function RangeField({ id, label, value, min, max, hint, guide, onChange }: { id: string; label: string; value: number; min: number; max: number; hint: string; guide: ControlGuideKey; onChange: (value: number) => void }) {
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
  const { k, params } = state
  const vectorCount = liveNodes(state.graph).length
  const randomPoint = () => { const rng = makeRng((Date.now() ^ state.graph.nextSeq) >>> 0); return [40 + rng() * (WORLD.width - 80), 40 + rng() * (WORLD.height - 80)] as const }

  return <fieldset className="pane-scroll panel-fields" disabled={editsLocked(state)}>
    <div className="panel-intro"><p className="section-kicker">Search</p><h2>Find the closest dots.</h2><p>Choose the result count and search effort, then place a target.</p></div>
    {!vectorCount && <div className="note"><p>Add dots before searching.</p><button className="button secondary compact" onClick={() => dispatch({ type: 'setTool', tool: 'insert' })}>Open Insert →</button></div>}
    <RangeField id="k" label="Results requested (k)" value={k} min={1} max={20} hint="How many close matches do you want?" guide="k" onChange={(value) => dispatch({ type: 'setK', k: value })}/>
    <RangeField id="param-efs" label="Search effort (efSearch)" value={params.efSearch} min={1} max={200} hint="More possible matches in play. More work, often better answers." guide="efSearch" onChange={(efSearch) => dispatch({ type: 'setParams', patch: { efSearch } })}/>
    <button className="button primary run-search" disabled={!vectorCount} onClick={() => script([{ t: 'tool', tool: 'search' }, { t: 'search', at: [...randomPoint()] }])}>Choose a new target <span aria-hidden="true">→</span></button>
    {state.lastSearch && <button className="button secondary" onClick={() => dispatch({ type: 'rerunSearch' })}>Rerun this target</button>}
    <button className="advanced-link" onClick={() => dispatch({ type: 'startGuided' })}>Load the four-dot lesson (replaces this example)</button>
    <p className="search-next">{vectorCount ? 'Then press Play below the graph to watch it work.' : 'Open Insert to create or load dots.'}</p>
    {k > vectorCount && vectorCount > 0 && <p className="note" role="status">You requested {k} matches, but only {vectorCount} live {vectorCount === 1 ? 'dot is' : 'dots are'} available. At most {vectorCount} can be returned.</p>}
  </fieldset>
}
