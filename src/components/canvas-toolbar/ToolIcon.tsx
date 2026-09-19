import type { Tool } from '../../state/store'

export function ToolIcon({ tool }: { tool: Tool }) {
  if (tool === 'search') return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="4.5"/><path d="m11.5 11.5 4 4"/></svg>
  if (tool === 'insert') return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 3 9 8-5 1-2 5Z"/></svg>
}
