import type { Trace } from '../hnsw/types'

/** Read only the current SEARCH-LAYER invocation, including minor events
 * skipped by Main steps. Never compare W across different layers or queries. */
export function searchQueues(trace: Trace | null, index: number) {
  if (!trace) return null
  let snapshotIndex = Math.min(index, trace.steps.length - 1)
  while (snapshotIndex >= 0) {
    const step = trace.steps[snapshotIndex]
    if (step.proc === 'search-layer' || (step.line === 'k6' && step.vis.query)) break
    snapshotIndex--
  }
  if (snapshotIndex < 0) return null
  let start = snapshotIndex
  while (start >= 0 && trace.steps[start].line !== 's2') start--
  if (start < 0) return null
  const snapshot = trace.steps[snapshotIndex]
  // Old saved traces predate the numeric metadata, but their generated s2
  // titles recorded the same capacity. Never infer it from today's settings.
  const capacity = snapshot.vis.searchEf ?? Number(trace.steps[start].title.match(/ef = (\d+)/)?.[1])
  const events = trace.steps.slice(start, snapshotIndex + 1).flatMap((step, offset) => {
    if (step.line !== 's13' && step.line !== 's12') return []
    const prior = trace.steps[start + offset - 1]
    return [{
      index: start + offset,
      step,
      rejected: step.line === 's12',
      dropped: step.line === 's13' ? prior.vis.dynamic.filter((id) => !step.vis.dynamic.includes(id)) : [],
    }]
  })
  return { snapshot, snapshotIndex, capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null, events }
}
