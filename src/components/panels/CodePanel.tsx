import { useEffect, useRef } from 'react'
import { LISTINGS, listingIdForLine } from '../../hnsw/pseudocode'
import { useApp } from '../../state/store'

export function CodePanel() {
  const { trace, step } = useApp()
  const line = trace?.steps[step]?.line ?? null
  const activeListing = line ? listingIdForLine(line) : null
  const activeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [line])

  return (
    <div className="pane-scroll">
      <p className="hint" style={{ marginTop: 0 }}>
        Algorithms 1–5 exactly as they appear in Malkov &amp; Yashunin (2016). The highlighted line
        is the one the canvas is executing right now.
      </p>
      {LISTINGS.map((l) => (
        <div key={l.id}>
          <div className="code-title">
            <h4>{l.title}</h4>
            <span>{l.subtitle}</span>
          </div>
          <div className="code">
            {l.lines.map((ln) => {
              const active = ln.key === line
              return (
                <span
                  key={ln.key}
                  ref={active ? activeRef : undefined}
                  className={`ln${active ? ' active' : ''}${ln.indent === 0 ? ' head' : ''}`}
                  title={ln.note}
                >
                  {'  '.repeat(ln.indent)}
                  {ln.text}
                </span>
              )
            })}
          </div>
          {activeListing === l.id && (
            <p className="hint">Currently executing — line {line}.</p>
          )}
        </div>
      ))}
    </div>
  )
}
