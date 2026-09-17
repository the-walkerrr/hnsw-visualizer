import type { Trace } from '../hnsw/types'

/** Reconstruct the local candidate selection used by an in-place update.
 * Unlike a reinsert, this operation never enters SEARCH-LAYER and therefore
 * has no W/C beam. Its useful live state is the fixed two-hop pool and the
 * SELECT-NEIGHBORS decision being made from that pool. */
export function inPlaceUpdateCandidates(trace: Trace | null, index: number) {
  if (!trace || trace.op !== 'update-in-place' || trace.steps.length === 0) return null
  const snapshotIndex = Math.min(Math.max(index, 0), trace.steps.length - 1)
  const snapshot = trace.steps[snapshotIndex]
  const target = trace.steps.find((step) => step.line === 'u4')?.vis.focus
  let start = snapshotIndex
  while (start >= 0 && trace.steps[start].line !== 'u6') start--

  if (start < 0) {
    return {
      snapshot,
      snapshotIndex,
      target,
      layer: null,
      pool: [],
      selected: [],
      rejected: [],
      complete: false,
    }
  }

  const poolStep = trace.steps[start]
  const layer = poolStep.vis.layer
  let selection = null as Trace['steps'][number] | null
  let complete = false
  for (let i = start + 1; i <= snapshotIndex; i++) {
    const step = trace.steps[i]
    if (step.proc !== 'select-neighbors' || step.vis.focus !== target || step.vis.layer !== layer) continue
    selection = step
    if (step.line === 'h12' || step.line === 'n2') complete = true
  }

  const selected = selection?.vis.accepted ?? []
  const explicitlyRejected = selection?.vis.rejected ?? []
  const pool = [...new Set([...poolStep.vis.accepted, ...selected, ...explicitlyRejected])]
  const rejected = complete
    ? pool.filter((id) => !selected.includes(id))
    : explicitlyRejected.filter((id) => !selected.includes(id))

  return { snapshot, snapshotIndex, target, layer, pool, selected, rejected, complete }
}

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
  const capacity = snapshot.vis.searchEf ?? Number(trace.steps[start].title.match(/(?:SEARCH_WIDTH|ef) = (\d+)/)?.[1])
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
