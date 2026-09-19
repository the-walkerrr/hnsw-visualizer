import { useState } from 'react'
import type { ControlGuideKey } from '../../lessons/controlGuides'
import { ControlHelp } from './ControlHelp'
import { numericFeedbackMatches, type NumericFeedback } from './numericFeedback'

export function Slider({ id, label, value, min, max, step = 1, hint, guide, format, feedback, onFeedback, onChange }: { id: string; label: string; value: number; min: number; max: number; step?: number; hint: string; guide: ControlGuideKey; format?: (v: number) => string; feedback?: NumericFeedback; onFeedback: (feedback: NumericFeedback | null) => void; onChange: (v: number) => void }) {
  const display = format ? format(value) : String(value)
  const [draft, setDraft] = useState(display)
  const [editing, setEditing] = useState(false)
  const message = feedback && numericFeedbackMatches(feedback.target, value, min, max, step) ? feedback.message : ''
  const commit = () => {
    if (draft === display) return
    const raw = Number(draft)
    const clamped = Math.min(max, Math.max(min, Number.isFinite(raw) ? raw : min))
    const next = Number((Math.round(clamped / step) * step).toFixed(4))
    const corrected = draft.trim() === '' || next !== raw
    onFeedback(corrected ? { message: `Adjusted to ${next}. Allowed range: ${min}–${max}, step ${step}.`, target: { value: next, min, max, step } } : null)
    setDraft(String(next)); if (next !== value) onChange(next)
  }
  return <div className="field"><div className="field-head"><label htmlFor={id}>{label}</label><input className="number-control" type="number" aria-label={`${label} value`} aria-describedby={`${id}-feedback`} min={min} max={max} step={step} value={editing ? draft : display} onFocus={() => { setEditing(true); setDraft(display) }} onChange={(e) => setDraft(e.target.value)} onBlur={() => { commit(); setEditing(false) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}/></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => { onFeedback(null); onChange(Number(e.target.value)) }}/><p className="hint">{hint}</p><p id={`${id}-feedback`} className="hint" role="status">{message}</p><ControlHelp guide={guide}/></div>
}
