import { useState } from 'react'
import type { ControlGuideKey } from '../../lessons/controlGuides'
import { ControlHelp } from './ControlHelp'

export function RangeField({ id, label, value, min, max, hint, guide, onChange }: { id: string; label: string; value: number; min: number; max: number; hint?: string; guide?: ControlGuideKey; onChange: (value: number) => void }) {
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
