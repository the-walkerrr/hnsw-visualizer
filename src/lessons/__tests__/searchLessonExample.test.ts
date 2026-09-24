import { describe, expect, it } from 'vitest'
import { nodesOnLayer } from '../../hnsw/graph'
import { SEARCH_LESSON_GRAPH, lessonDistance, searchLessonExample } from '../searchLessonExample'

describe('search lesson narrative', () => {
  it('descends from the four-landmark overview into P in the twenty-product graph', () => {
    const { trace, frames } = searchLessonExample()
    expect(SEARCH_LESSON_GRAPH.nodes.size).toBe(20)
    expect(nodesOnLayer(SEARCH_LESSON_GRAPH, 1).map(n => n.label)).toEqual(['A', 'F', 'K', 'P'])
    expect(trace.steps.find(s => s.line === 'k4')?.vis.dynamic).toEqual([15])
    expect(frames[0].vis.entryPoints).toEqual([15])
    expect(lessonDistance(15).toFixed(1)).toBe('7.6')
  })

  it('shows admission, rejection, and an evicted answer still waiting for exploration', () => {
    const { frames } = searchLessonExample()
    expect(frames.find(s => s.line === 's13' && s.vis.considering === 16)).toBeDefined()
    expect(frames.find(s => s.line === 's12' && s.vis.considering === 9)).toBeDefined()
    const replaced = frames.find(s => s.line === 's13' && s.vis.considering === 17)!
    expect(replaced.vis.dynamic).not.toContain(16)
    expect(replaced.vis.candidates).toContain(16)
    expect(frames.every(s => s.vis.dynamic.length <= 3)).toBe(true)
  })

  it('stops at the displayed Q > S comparison and returns two of three kept nodes', () => {
    const { trace, frames } = searchLessonExample()
    const stopIndex = frames.findIndex(s => s.line === 's8')
    expect(stopIndex).toBeGreaterThan(0)
    expect(frames[stopIndex - 1].vis.candidates).toEqual([16])
    const kept = frames[stopIndex].vis.dynamic
    const worst = kept.reduce((a, b) => lessonDistance(a) > lessonDistance(b) ? a : b)
    expect(worst).toBe(18)
    expect(lessonDistance(16).toFixed(1)).toBe('5.3')
    expect(lessonDistance(worst).toFixed(1)).toBe('5.0')
    expect(frames.some(s => s.line === 's9' && s.vis.current === 16)).toBe(false)
    expect(trace.results.map(n => n.id)).toEqual([17, 19])
    expect(trace.results).toEqual(trace.exact)
    expect(frames.at(-1)?.line).toBe('k6')
    expect(frames.at(-1)?.vis.dynamic).toHaveLength(3)
  })
})
