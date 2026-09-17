import { useState } from 'react'
import { liveNodes } from '../../hnsw/graph'
import { editsLocked, useApp, useDispatch } from '../../state/store'
import { ControlHelp } from './ControlHelp'
import type { ControlGuideKey } from '../../lessons/controlGuides'

function RangeField({ id, label, value, min, max, hint, guide, onChange }: { id: string; label: string; value: number; min: number; max: number; hint?: string; guide?: ControlGuideKey; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const commit = () => {
    const raw = Number(draft)
    const next = Math.min(max, Math.max(min, Math.round(Number.isFinite(raw) ? raw : min)))
    setMessage(draft.trim() === '' || next !== raw ? `Adjusted to ${next}. Enter a whole number from ${min} to ${max}.` : '')
    setDraft(String(next)); if (next !== value) onChange(next)
  }
  return <div className="field"><div className="field-head"><label htmlFor={id}>{label}</label><input className="number-control" type="number" aria-label={`${label} value`} aria-describedby={`${id}-feedback`} min={min} max={max} value={editing ? draft : String(value)} onFocus={() => { setEditing(true); setDraft(String(value)) }} onChange={(e) => setDraft(e.target.value)} onBlur={() => { commit(); setEditing(false) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}/></div><input id={id} type="range" min={min} max={max} value={value} onChange={(e) => { setMessage(''); onChange(Number(e.target.value)) }}/>{hint && <p className="hint">{hint} Range: {min}–{max}.</p>}<p id={`${id}-feedback`} className="hint" role="status">{message}</p>{guide && <ControlHelp guide={guide}/>}</div>
}

export function BuildPanel() {
  const state = useApp()
  const dispatch = useDispatch()
  const { k, params } = state
  const vectorCount = liveNodes(state.graph).length

  return <fieldset className="pane-scroll panel-fields" disabled={editsLocked(state)}>
    <div className="panel-intro"><p className="section-kicker">Search</p><h2>Find nearby dots.</h2><p>Choose how many results you want, then place a target on the graph.</p></div>
    {!vectorCount && <div className="note"><p>Add dots before searching.</p><button className="button secondary compact" onClick={() => dispatch({ type: 'setTool', tool: 'insert' })}>Open Insert →</button></div>}
    {!!vectorCount && state.tool !== 'search' && <div className="note canvas-tool-status"><p>Select Search above the graph to place a target.</p><button className="button secondary compact" onClick={() => dispatch({ type: 'setTool', tool: 'search' })}>Use Search tool</button></div>}
    <RangeField id="k" label="Number of results requested" value={k} min={1} max={20} onChange={(value) => dispatch({ type: 'setK', k: value })}/>
    <RangeField id="param-efs" label="Routes kept open" value={params.efSearch} min={1} max={200} hint="More routes can find better matches, but take more work." guide="efSearch" onChange={(efSearch) => dispatch({ type: 'setParams', patch: { efSearch } })}/>
    {k > vectorCount && vectorCount > 0 && <p className="note" role="status">You requested {k} matches, but only {vectorCount} live {vectorCount === 1 ? 'dot is' : 'dots are'} available. At most {vectorCount} can be returned.</p>}
  </fieldset>
}
