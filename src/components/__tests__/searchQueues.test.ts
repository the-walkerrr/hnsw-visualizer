import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS, runInsert, runSearch, buildIndex } from '../../hnsw/algorithm'
import { emptyGraph } from '../../hnsw/graph'
import { EF_GRAPH, EF_QUERY } from '../../lessons/efSearchExample'
import { searchQueues } from '../searchQueues'
import { preset } from '../../hnsw/presets'

describe('live search queues', () => {
  it('reports capacity and records eviction separately from rejection', () => {
    const wide = runSearch(EF_GRAPH, { ...DEFAULT_PARAMS, efSearch: 2 }, EF_QUERY, 1).trace
    const narrow = runSearch(EF_GRAPH, { ...DEFAULT_PARAMS, efSearch: 1 }, EF_QUERY, 1).trace
    const wideQueues = searchQueues(wide, wide.steps.length - 1)!
    const narrowQueues = searchQueues(narrow, narrow.steps.length - 1)!
    expect(wideQueues.capacity).toBe(2)
    expect(wideQueues.snapshot.vis.dynamic).toEqual([3, 1])
    expect(wideQueues.events.find((e) => e.step.vis.considering === 2)?.dropped).toEqual([0])
    expect(wideQueues.events.find((e) => e.step.vis.considering === 3)?.dropped).toEqual([2])
    const rejectedBridge = narrowQueues.events.find((e) => e.step.vis.considering === 2)!
    expect(rejectedBridge.rejected).toBe(true)
    expect(rejectedBridge.dropped).toEqual([])
    // Rewind to initialization: no future decisions may leak into the history.
    const start = wide.steps.findIndex((s) => s.line === 's2')
    expect(searchQueues(wide, start)!.events).toEqual([])
    expect(searchQueues(wide, 0)).toBeNull()
  })

  it('captures the effective k minimum and uses each layer’s own capacity', () => {
    const graph = buildIndex(emptyGraph(), DEFAULT_PARAMS, preset('clusters').make(48, 7))
    const search = runSearch(graph, { ...DEFAULT_PARAMS, efSearch: 2 }, EF_QUERY, 5).trace
    for (const step of search.steps.filter((s) => s.line === 's2')) {
      const queues = searchQueues(search, step.index)!
      expect(queues.capacity).toBe(step.vis.layer === 0 ? 5 : 1)
      expect(queues.events).toEqual([])
    }
    const insert = runInsert(graph, { ...DEFAULT_PARAMS, efConstruction: 12 }, [500, 300], { level: 0 }).trace
    const base = insert.steps.find((s) => s.line === 's2' && s.vis.layer === 0)!
    expect(searchQueues(insert, base.index)!.capacity).toBe(12)
  })
})
