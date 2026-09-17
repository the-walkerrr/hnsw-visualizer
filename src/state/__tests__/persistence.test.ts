import { describe, expect, it } from 'vitest'
import { deserializeState, serializeState } from '../persistence'
import { initialState, reducer } from '../store'

describe('session persistence', () => {
  it('round-trips settings, graph maps, selection, and trace snapshots', () => {
    let state = reducer(initialState(), {
      type: 'script',
      ops: [
        { t: 'preset', id: 'clusters', n: 12, seed: 19 },
        { t: 'params', patch: { efSearch: 24 } },
        { t: 'selectNearest', at: [300, 200] },
        { t: 'search', at: [500, 320] },
      ],
    })
    state = { ...state, rightTab: 'node', viewMode: 'layer', graphLabelScale: 1.5, playing: true }

    const restored = deserializeState(serializeState(state))

    expect(restored).not.toBeNull()
    expect(restored!.playing).toBe(false)
    expect(restored!.params.efSearch).toBe(24)
    expect(restored!.selected).toBe(state.selected)
    expect(restored!.rightTab).toBe('node')
    expect(restored!.viewMode).toBe('layer')
    expect(restored!.graphLabelScale).toBe(1.5)
    expect(restored!.graph.nodes).toBeInstanceOf(Map)
    expect(restored!.graph.nodes.size).toBe(12)
    expect(restored!.trace?.steps[0].graph.nodes).toBeInstanceOf(Map)
  })

  it('ignores corrupt and incompatible saved state', () => {
    expect(deserializeState('not json')).toBeNull()
    expect(deserializeState('{"version":2,"state":{}}')).toBeNull()
  })

  it('never restores an unfinished pointer gesture', () => {
    const state = { ...initialState(), movingNode: 42 }
    expect(deserializeState(serializeState(state))!.movingNode).toBeNull()
  })

  it('preserves whether the graph contains manual edits', () => {
    const custom = reducer(initialState(), { type: 'script', ops: [{ t: 'insert', at: [120, 180] }] })
    expect(deserializeState(serializeState(custom))!.customGraph).toBe(true)
  })

  it('moves sessions saved on the removed Experiments tab back to Insert', () => {
    const envelope = JSON.parse(serializeState(initialState()))
    envelope.state.rightTab = 'lab'

    expect(deserializeState(JSON.stringify(envelope))!.rightTab).toBe('params')
  })

  it('moves sessions saved on Results to Details', () => {
    const envelope = JSON.parse(serializeState(initialState()))
    envelope.state.rightTab = 'metrics'

    expect(deserializeState(JSON.stringify(envelope))!.rightTab).toBe('details')
  })
})
