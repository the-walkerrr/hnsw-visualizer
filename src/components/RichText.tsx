import type { ReactNode } from 'react'
import { CONTROL_GUIDES, type ControlGuideKey } from '../lessons/controlGuides'
import { ParameterLink } from './ParameterLink'

function isParameter(value: string): value is ControlGuideKey {
  return value in CONTROL_GUIDES
}

/** Minimal inline formatter: **bold**, `code`, and *emphasis*. Enough for the
 *  lesson copy without pulling in a markdown dependency. */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|_[^_]+_)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) {
      const value = tok.slice(1, -1)
      out.push(isParameter(value) ? <ParameterLink key={i++} name={value}/> : <code key={i++}>{value}</code>)
    }
    else out.push(<em key={i++}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
