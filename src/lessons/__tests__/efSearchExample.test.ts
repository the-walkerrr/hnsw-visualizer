import { describe, expect, it } from 'vitest'
import { EF_GRAPH, EF_QUERY, efSearchExample } from '../efSearchExample'
import { distance } from '../../hnsw/metric'
import { edgesOnLayer } from '../../hnsw/graph'

describe('efSearch teaching example', () => {
  it('isolates efSearch on one graph: one slot rejects the bridge; two slots discover the true nearest', () => {
    const narrow = efSearchExample(1)
    const wide = efSearchExample(2)
    expect(edgesOnLayer(EF_GRAPH, 0)).toEqual([[0, 1], [0, 2], [2, 3]])
    expect(narrow.trace.results.map((c) => c.id)).toEqual([1]) // A
    expect(wide.trace.results.map((c) => c.id)).toEqual([3]) // T
    expect(narrow.trace.exact).toEqual(wide.trace.exact)
    expect(wide.trace.results).toEqual(wide.trace.exact)
    expect(narrow.frames.find((s) => s.line === 's12' && s.vis.considering === 2)).toBeDefined()
    expect(narrow.frames.some((s) => s.vis.visited.includes(3))).toBe(false)
    expect(wide.frames.find((s) => s.line === 's13' && s.vis.considering === 2)?.vis.dynamic).toEqual([1, 2])
    expect(wide.frames.some((s) => s.line === 's9' && s.vis.current === 2)).toBe(true)
    expect(narrow.trace.stats.distCalls).toBe(3)
    expect(wide.trace.stats.distCalls).toBe(4)
    for (const [ef, run] of [[1, narrow], [2, wide]] as const) {
      for (const step of run.frames) {
        expect(step.vis.dynamic.length).toBeLessThanOrEqual(ef)
        expect(edgesOnLayer(step.graph, 0)).toEqual(edgesOnLayer(EF_GRAPH, 0))
      }
    }
  })

  it('uses the displayed positions for the labeled distances and nearest answer', () => {
    const distances = [...EF_GRAPH.nodes.values()].map((n) => distance(n.vec, EF_QUERY, 'euclidean'))
    expect(distances.slice(0, 3)).toEqual([280, 100, 175])
    expect(distances[3]).toBeCloseTo(44.721, 3)
  })
})
