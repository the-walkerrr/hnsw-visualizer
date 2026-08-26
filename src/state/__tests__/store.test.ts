import { describe, expect, it } from 'vitest'
import { LESSONS } from '../../lessons/lessons'
import { graphStats } from '../../hnsw/metrics'
import { advance, initialState, reducer, type Action, type AppState, type ScriptOp } from '../store'

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const script = (state: AppState, ops: ScriptOp[]) => reducer(state, { type: 'script', ops })

describe('initial state', () => {
  it('builds a searchable index up front', () => {
    const s = initialState()
    expect(s.graph.nodes.size).toBe(48)
    expect(s.graph.entry).not.toBeNull()
    expect(s.trace).toBeNull()
  })
})

describe('operations through the reducer', () => {
  it('a search produces a trace with a result and does not change the graph', () => {
    const s = initialState()
    const after = script(s, [{ t: 'search', at: [500, 320] }])
    expect(after.trace?.op).toBe('search')
    expect(after.trace!.results.length).toBe(after.k)
    expect(after.trace!.exact.length).toBe(after.k)
    expect(after.graph).toBe(s.graph)
    expect(after.step).toBe(0)
    expect(after.log[0].label).toContain('Search')
  })

  it('an insert grows the graph and leaves a replayable trace', () => {
    const s = initialState()
    const after = script(s, [{ t: 'insert', at: [500, 320] }])
    expect(after.graph.nodes.size).toBe(49)
    const steps = after.trace!.steps
    expect(steps.length).toBeGreaterThan(3)
    // Snapshots must be independent copies, not aliases of the live graph.
    expect(steps[0].graph).not.toBe(after.graph)
    expect(steps[0].graph.nodes.size).toBeLessThanOrEqual(after.graph.nodes.size)
  })

  it('soft delete then restore round-trips', () => {
    const s = initialState()
    const deleted = script(s, [{ t: 'deleteNearest', at: [232, 172], mode: 'soft' }])
    expect(graphStats(deleted.graph).deleted).toBe(1)
    const id = [...deleted.graph.nodes.values()].find((n) => n.deleted)!.id
    const restored = reducer(deleted, { type: 'restoreNode', id })
    expect(graphStats(restored.graph).deleted).toBe(0)
    expect(restored.graph.nodes.size).toBe(s.graph.nodes.size)
  })

  it('hard delete removes a node and clears the selection', () => {
    const s = run(initialState(), { type: 'script', ops: [{ t: 'selectNearest', at: [232, 172] }] })
    const id = s.selected!
    const after = reducer(s, { type: 'deleteNode', id, mode: 'hard' })
    expect(after.graph.nodes.has(id)).toBe(false)
    expect(after.selected).toBeNull()
  })

  it('moving a node keeps the count and records an update trace', () => {
    const s = initialState()
    const id = [...s.graph.nodes.keys()][10]
    const after = reducer(s, { type: 'moveNode', id, to: [640, 500] })
    expect(after.graph.nodes.size).toBe(s.graph.nodes.size)
    expect(after.graph.nodes.get(id)!.vec).toEqual([640, 500])
    expect(after.trace?.op).toBe('update-reinsert')
  })

  it('a structural parameter change rebuilds over the same vectors in the same order', () => {
    const s = initialState()
    const before = [...s.graph.nodes.values()].sort((a, b) => a.seq - b.seq).map((n) => n.vec)
    const after = reducer(s, { type: 'setParams', patch: { M: 12 } })
    const now = [...after.graph.nodes.values()].sort((a, b) => a.seq - b.seq).map((n) => n.vec)
    expect(now).toEqual(before)
    expect(graphStats(after.graph).edges).toBeGreaterThan(graphStats(s.graph).edges)
  })

  it('a query-time parameter change does not touch the graph', () => {
    const s = initialState()
    const after = reducer(s, { type: 'setParams', patch: { efSearch: 64 } })
    expect(after.graph).toBe(s.graph)
    expect(after.params.efSearch).toBe(64)
  })

  it('clear empties the index without breaking a later search', () => {
    const s = script(initialState(), [{ t: 'clear' }, { t: 'search', at: [100, 100] }])
    expect(s.graph.nodes.size).toBe(0)
    expect(s.trace!.results).toEqual([])
  })
})

describe('playback', () => {
  it('coarse stepping skips minor steps, fine stepping does not', () => {
    const s = script(initialState(), [{ t: 'insert', at: [500, 320] }])
    const fine = { ...s, granularity: 'fine' as const }
    const coarse = { ...s, granularity: 'coarse' as const }
    const steps = s.trace!.steps
    expect(steps.some((x) => x.weight === 'minor')).toBe(true)
    expect(advance(fine, 0, 1)).toBe(1)
    expect(advance(coarse, 0, 4)).toBeGreaterThanOrEqual(advance(fine, 0, 4))
    expect(steps[advance(coarse, 0, 1)].weight).toBe('major')
  })

  it('ticking runs to the end and then stops itself', () => {
    let s = script(initialState(), [{ t: 'search', at: [500, 320] }])
    s = { ...s, playing: true, granularity: 'fine' }
    for (let i = 0; i < 2000 && s.playing; i++) s = reducer(s, { type: 'tick' })
    expect(s.playing).toBe(false)
    expect(s.step).toBe(s.trace!.steps.length - 1)
  })

  it('stepping never leaves the trace bounds', () => {
    const s = script(initialState(), [{ t: 'insert', at: [500, 320] }])
    expect(advance(s, 0, -5)).toBe(0)
    expect(advance(s, s.trace!.steps.length - 1, 5)).toBe(s.trace!.steps.length - 1)
  })
})

describe('lesson scripts', () => {
  it('every step of every lesson applies cleanly and leaves a usable state', () => {
    for (const [li, lesson] of LESSONS.entries()) {
      let s = initialState()
      for (const [si, step] of lesson.steps.entries()) {
        const where = `lesson ${li + 1} "${lesson.title}" step ${si + 1}`
        expect(() => {
          s = script(s, step.ops ?? [])
        }, where).not.toThrow()
        if (s.graph.nodes.size > 0) {
          expect(s.graph.entry, where).not.toBeNull()
          expect(s.graph.nodes.has(s.graph.entry!), where).toBe(true)
        }
        if (s.trace) {
          expect(s.step, where).toBeLessThan(s.trace.steps.length)
          expect(s.step, where).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('every "try this" button in every lesson applies cleanly', () => {
    for (const [li, lesson] of LESSONS.entries()) {
      for (const [si, step] of lesson.steps.entries()) {
        let s = script(initialState(), step.ops ?? [])
        for (const block of step.blocks) {
          if (block.t !== 'try') continue
          const where = `lesson ${li + 1} step ${si + 1}: "${block.text.slice(0, 40)}…"`
          expect(() => {
            s = script(s, block.ops)
          }, where).not.toThrow()
          expect(s.graph.nodes.size, where).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('lesson tab and view ops reference real panels', () => {
    const tabs = new Set(['build', 'params', 'code', 'node', 'metrics', 'lab'])
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        const ops = [
          ...(step.ops ?? []),
          ...step.blocks.flatMap((b) => (b.t === 'try' ? b.ops : [])),
        ]
        for (const op of ops) {
          if (op.t === 'tab') expect(tabs.has(op.tab)).toBe(true)
          if (op.t === 'view' && op.layer !== undefined) expect(op.layer).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})

describe('lesson isolation', () => {
  it('a lesson that pins parameters is unaffected by earlier fiddling', () => {
    // Arrive at the hierarchy lesson after cranking M up in the Params tab.
    let s = reducer(initialState(), { type: 'setParams', patch: { M: 24, Mmax: 24, Mmax0: 48, mL: 0.3 } })
    const layersBefore = s.graph.topLayer
    const hierarchyLesson = LESSONS[2].steps[0]
    s = script(s, hierarchyLesson.ops ?? [])
    expect(s.params.M).toBe(5)
    expect(s.params.mL).toBeCloseTo(1 / Math.log(5), 6)
    // A squashed hierarchy would contradict the lesson's own text.
    expect(s.graph.topLayer).toBeGreaterThanOrEqual(layersBefore)
  })

  it('lessons that describe a specific picture all pin their parameters', () => {
    for (const i of [0, 2, 6, 7]) {
      const ops = LESSONS[i].steps[0].ops ?? []
      expect(
        ops.some((o) => o.t === 'params' && o.patch.M !== undefined),
        `lesson ${i + 1} must pin M`,
      ).toBe(true)
    }
  })
})

describe('explicit lesson selection', () => {
  it('re-picking the current lesson bumps the epoch so its setup re-applies', () => {
    const s = initialState()
    const again = reducer(s, { type: 'setLesson', lesson: s.lesson })
    expect(again.lesson).toBe(s.lesson)
    expect(again.lessonStep).toBe(0)
    expect(again.lessonEpoch).toBe(s.lessonEpoch + 1)
  })

  it('stepping within a lesson does not bump the epoch', () => {
    const s = initialState()
    expect(reducer(s, { type: 'lessonStep', delta: 1 }).lessonEpoch).toBe(s.lessonEpoch)
  })
})

describe('stale ids from a mid-trace snapshot', () => {
  it('dragging a node that the committed graph no longer has', () => {
    const base = initialState()
    const victim = base.graph.entry!
    // Hard delete leaves the canvas showing snapshots in which the node still exists.
    const s = reducer(base, { type: 'deleteNode', id: victim, mode: 'hard' })
    expect(s.graph.nodes.has(victim)).toBe(false)
    expect(() => reducer(s, { type: 'moveNode', id: victim, to: [500, 300] })).not.toThrow()
  })

  it('restoring a node that the committed graph no longer has', () => {
    const base = initialState()
    const victim = base.graph.entry!
    const s = reducer(base, { type: 'deleteNode', id: victim, mode: 'hard' })
    expect(() => reducer(s, { type: 'restoreNode', id: victim })).not.toThrow()
  })
})
