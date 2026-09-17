import { describe, expect, it } from 'vitest'
import { graphStats } from '../../hnsw/metrics'
import { advance, initialState, reducer, type Action, type AppState, type ScriptOp } from '../store'

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const script = (state: AppState, ops: ScriptOp[]) => reducer(state, { type: 'script', ops })
const seededState = () => script(initialState(), [{ t: 'preset', id: 'clusters', n: 48, seed: 7 }])

describe('initial state', () => {
  it('starts with an empty index ready for manual inserts', () => {
    const s = initialState()
    expect(s.graph.nodes.size).toBe(0)
    expect(s.graph.entry).toBeNull()
    expect(s.trace).toBeNull()
    expect(s.tool).toBe('insert')
    expect(s.customGraph).toBe(false)
  })
})

describe('operations through the reducer', () => {
  it('opens the fixed guided exercise without changing application defaults', () => {
    const defaults = initialState()
    const guided = reducer(defaults, { type: 'startGuided' })
    expect(guided.graph.nodes.size).toBe(8)
    expect(guided.params.efSearch).toBe(1)
    expect(guided.k).toBe(1)
    expect(guided.tool).toBe('search')
    expect(guided.viewMode).toBe('stack')
    expect(guided.rightTab).toBe('queues')
    expect(guided.trace?.op).toBe('search')
    expect(guided.step).toBe(0)
    expect(guided.playing).toBe(false)
    expect(initialState().params).toEqual(defaults.params)
  })
  it('a search produces a trace with a result and does not change the graph', () => {
    const s = seededState()
    const after = script(s, [{ t: 'search', at: [500, 320] }])
    expect(after.trace?.op).toBe('search')
    expect(after.trace!.results.length).toBe(after.k)
    expect(after.trace!.exact.length).toBe(after.k)
    expect(after.graph).toBe(s.graph)
    expect(after.step).toBe(0)
  })

  it('an insert grows the graph and leaves a replayable trace', () => {
    const s = initialState()
    const after = script(s, [{ t: 'insert', at: [500, 320] }])
    expect(after.graph.nodes.size).toBe(1)
    expect(after.graph.entry).not.toBeNull()
    expect(after.customGraph).toBe(true)
    const steps = after.trace!.steps
    expect(steps.length).toBeGreaterThan(1)
    // Snapshots must be independent copies, not aliases of the live graph.
    expect(steps[0].graph).not.toBe(after.graph)
    expect(steps[0].graph.nodes.size).toBeLessThanOrEqual(after.graph.nodes.size)
  })

  it('soft delete then restore round-trips', () => {
    const s = seededState()
    const deleted = script(s, [{ t: 'deleteNearest', at: [232, 172], mode: 'soft' }])
    expect(graphStats(deleted.graph).deleted).toBe(1)
    const id = [...deleted.graph.nodes.values()].find((n) => n.deleted)!.id
    const restored = reducer(deleted, { type: 'restoreNode', id })
    expect(graphStats(restored.graph).deleted).toBe(0)
    expect(restored.graph.nodes.size).toBe(s.graph.nodes.size)
  })

  it('hard delete removes a node and clears the selection', () => {
    const s = run(seededState(), { type: 'script', ops: [{ t: 'selectNearest', at: [232, 172] }] })
    const id = s.selected!
    const after = reducer(s, { type: 'deleteNode', id, mode: 'hard' })
    expect(after.graph.nodes.has(id)).toBe(false)
    expect(after.selected).toBeNull()
    expect(after.customGraph).toBe(true)
  })

  it('moving a node keeps the count and records an update trace', () => {
    const s = seededState()
    const id = [...s.graph.nodes.keys()][10]
    const after = reducer(s, { type: 'moveNode', id, to: [640, 500] })
    expect(after.graph.nodes.size).toBe(s.graph.nodes.size)
    expect(after.graph.nodes.get(id)!.vec).toEqual([640, 500])
    expect(after.trace?.op).toBe('update-reinsert')
    expect(after.customGraph).toBe(true)
    expect(after.step).toBe(after.trace!.steps.length - 1)
    expect(after.trace!.steps[after.step].graph.nodes.get(id)!.vec).toEqual([640, 500])
  })

  it('opens Live queues for both update strategies', () => {
    const seeded = seededState()
    const id = [...seeded.graph.nodes.keys()][10]
    for (const mode of ['reinsert', 'in-place'] as const) {
      const state = { ...seeded, updateMode: mode, rightTab: 'details' as const }
      const after = reducer(state, { type: 'moveNode', id, to: [640, 500] })
      expect(after.trace?.op).toBe(`update-${mode}`)
      expect(after.rightTab).toBe('queues')
    }
  })

  it('a structural parameter change rebuilds over the same vectors in the same order', () => {
    const s = seededState()
    const before = [...s.graph.nodes.values()].sort((a, b) => a.seq - b.seq).map((n) => n.vec)
    const after = reducer(s, { type: 'setParams', patch: { M: 12 } })
    const now = [...after.graph.nodes.values()].sort((a, b) => a.seq - b.seq).map((n) => n.vec)
    expect(now).toEqual(before)
    expect(graphStats(after.graph).edges).toBeGreaterThan(graphStats(s.graph).edges)
  })

  it('marks generated presets as replaceable and manual edits as custom', () => {
    const generated = seededState()
    expect(generated.customGraph).toBe(false)
    const edited = script(generated, [{ t: 'insert', at: [500, 320] }, { t: 'seek', to: 'end' }])
    expect(edited.customGraph).toBe(true)
    const replaced = script(edited, [{ t: 'preset', id: 'ring', n: 24, seed: 7 }])
    expect(replaced.customGraph).toBe(false)
  })

  it('a query-time parameter change does not touch the graph', () => {
    const s = initialState()
    const after = reducer(s, { type: 'setParams', patch: { efSearch: 64 } })
    expect(after.graph).toBe(s.graph)
    expect(after.params.efSearch).toBe(64)
  })

  it('changes graph text size without changing the graph', () => {
    const state = seededState()
    const after = reducer(state, { type: 'setGraphLabelScale', scale: 1.5 })
    expect(after.graphLabelScale).toBe(1.5)
    expect(after.graph).toBe(state.graph)
  })

  it('clear empties the index without breaking a later search', () => {
    const s = script(initialState(), [{ t: 'clear' }, { t: 'search', at: [100, 100] }])
    expect(s.graph.nodes.size).toBe(0)
    expect(s.trace).toBeNull()
    expect(s.tool).toBe('insert')
  })
})

describe('playback', () => {
  it('coarse stepping skips minor steps, fine stepping does not', () => {
    const s = script(seededState(), [{ t: 'insert', at: [500, 320] }])
    const fine = { ...s, granularity: 'fine' as const }
    const coarse = { ...s, granularity: 'coarse' as const }
    const steps = s.trace!.steps
    expect(steps.some((x) => x.weight === 'minor')).toBe(true)
    expect(advance(fine, 0, 1)).toBe(1)
    expect(advance(coarse, 0, 4)).toBeGreaterThanOrEqual(advance(fine, 0, 4))
    expect(steps[advance(coarse, 0, 1)].weight).toBe('major')
  })

  it('ticking runs to the end and then stops itself', () => {
    let s = script(seededState(), [{ t: 'search', at: [500, 320] }])
    s = { ...s, playing: true, granularity: 'fine' }
    for (let i = 0; i < 2000 && s.playing; i++) s = reducer(s, { type: 'tick' })
    expect(s.playing).toBe(false)
    expect(s.step).toBe(s.trace!.steps.length - 1)
  })

  it('stepping never leaves the trace bounds', () => {
    const s = script(seededState(), [{ t: 'insert', at: [500, 320] }])
    expect(advance(s, 0, -5)).toBe(0)
    expect(advance(s, s.trace!.steps.length - 1, 5)).toBe(s.trace!.steps.length - 1)
  })
})

describe('stale ids from a mid-trace snapshot', () => {
  it('dragging a node that the committed graph no longer has', () => {
    const base = seededState()
    const victim = base.graph.entry!
    // Hard delete leaves the canvas showing snapshots in which the node still exists.
    const s = reducer(base, { type: 'deleteNode', id: victim, mode: 'hard' })
    expect(s.graph.nodes.has(victim)).toBe(false)
    expect(() => reducer(s, { type: 'moveNode', id: victim, to: [500, 300] })).not.toThrow()
  })

  it('restoring a node that the committed graph no longer has', () => {
    const base = seededState()
    const victim = base.graph.entry!
    const s = reducer(base, { type: 'deleteNode', id: victim, mode: 'hard' })
    expect(() => reducer(s, { type: 'restoreNode', id: victim })).not.toThrow()
  })
})

describe('operation isolation', () => {
  const pendingSearch = () => script(seededState(), [{ t: 'search', at: [500, 320] }])

  it('rejects graph and parameter changes during both paused and playing replays', () => {
    for (const playing of [false, true]) {
      const state = { ...pendingSearch(), playing }
      const id = state.graph.entry!
      const conflicts: Action[] = [
        { type: 'moveNode', id, to: [100, 100] },
        { type: 'beginNodeMove', id },
        { type: 'deleteNode', id, mode: 'hard' },
        { type: 'restoreNode', id },
        { type: 'setParams', patch: { efSearch: 24 } },
        { type: 'setParams', patch: { M: 10 } },
        { type: 'setK', k: 2 },
        { type: 'setTool', tool: 'insert' },
        { type: 'setUpdateMode', mode: 'in-place' },
        { type: 'script', ops: [{ t: 'insert', at: [100, 100] }] },
        { type: 'script', ops: [{ t: 'search', at: [100, 100] }] },
        { type: 'script', ops: [{ t: 'clear' }, { t: 'preset', id: 'uniform', n: 12 }] },
      ]
      for (const action of conflicts) expect(reducer(state, action), `${action.type}, playing=${playing}`).toBe(state)
      expect(reducer(state, { type: 'select', id }).selected).toBe(id)
      expect(reducer(state, { type: 'setViewMode', mode: 'layer' }).viewMode).toBe('layer')
      expect(reducer(state, { type: 'stepBy', delta: 1 }).step).toBeGreaterThan(state.step)
    }
  })

  it('protects inserts and unlocks after finishing or explicitly ending the replay', () => {
    const inserted = script(seededState(), [{ t: 'insert', at: [500, 320] }])
    expect(reducer(inserted, { type: 'setTool', tool: 'search' })).toBe(inserted)
    const finished = reducer(inserted, { type: 'seek', index: inserted.trace!.steps.length - 1 })
    expect(reducer(finished, { type: 'setTool', tool: 'search' }).tool).toBe('search')
    const ended = reducer(inserted, { type: 'closeTrace' })
    expect(ended.graph).toBe(inserted.graph)
    expect(ended.trace).toBeNull()
    const next = script(ended, [{ t: 'search', at: [200, 200] }])
    expect(next.trace?.op).toBe('search')
    expect(next.rightTab).toBe('queues')
  })

  it('serializes a drag against playback and other operations, then releases its lock', () => {
    const state = seededState()
    const id = state.graph.entry!
    const dragging = reducer(state, { type: 'beginNodeMove', id })
    expect(dragging.movingNode).toBe(id)
    for (const action of [
      { type: 'play' }, { type: 'setViewMode', mode: 'layer' },
      { type: 'script', ops: [{ t: 'search', at: [100, 100] }] },
      { type: 'moveNode', id: [...state.graph.nodes.keys()].find((n) => n !== id)!, to: [100, 100] },
    ] as Action[]) expect(reducer(dragging, action)).toBe(dragging)
    const cancelled = reducer(dragging, { type: 'cancelNodeMove' })
    expect(cancelled.movingNode).toBeNull()
    expect(cancelled.graph).toBe(state.graph)
    const moved = reducer(dragging, { type: 'moveNode', id, to: [600, 400] })
    expect(moved.movingNode).toBeNull()
    expect(moved.graph.nodes.get(id)!.vec).toEqual([600, 400])
    expect(moved.step).toBe(moved.trace!.steps.length - 1)
    const replayed = reducer(moved, { type: 'play' })
    expect(reducer(replayed, { type: 'beginNodeMove', id })).toBe(replayed)
  })

  it('opens the panel that matches the selected canvas tool', () => {
    const state = { ...seededState(), rightTab: 'details' as const }
    expect(reducer(state, { type: 'setTool', tool: 'select' }).rightTab).toBe('node')
    expect(reducer(state, { type: 'setTool', tool: 'search' }).rightTab).toBe('build')
    expect(reducer(state, { type: 'setTool', tool: 'insert' }).rightTab).toBe('params')
  })

  it('clears a finished replay whenever a canvas tool is selected', () => {
    const inserted = script(seededState(), [
      { t: 'insert', at: [500, 320] },
      { t: 'seek', to: 'end' },
    ])
    for (const tool of ['search', 'insert', 'select'] as const) {
      const next = reducer(inserted, { type: 'setTool', tool })
      expect(next.graph).toBe(inserted.graph)
      expect(next.trace).toBeNull()
      expect(next.step).toBe(0)
      expect(next.playing).toBe(false)
    }
  })
})
