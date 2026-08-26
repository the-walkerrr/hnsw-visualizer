import { describe, expect, it } from 'vitest'
import { WORLD } from '../../hnsw/constants'
import { DEFAULT_ORIENTATION, layerProjector, stackProjector } from '../project'

describe('stacked projection', () => {
  const proj = stackProjector(3, DEFAULT_ORIENTATION)
  const layers = [3, 2, 1, 0]

  it('round-trips a point on every layer back to the same vector and layer', () => {
    for (const layer of layers) {
      for (const v of [
        [0, 0],
        [500, 320],
        [WORLD.width, WORLD.height],
        [120, 610],
      ]) {
        const hit = proj.from(proj.to(v, layer), layers)
        expect(hit.layer, `layer ${layer} of ${v}`).toBe(layer)
        expect(hit.at[0]).toBeCloseTo(v[0], 6)
        expect(hit.at[1]).toBeCloseTo(v[1], 6)
      }
    }
  })

  it('never returns a point outside the data space', () => {
    for (const p of [
      [-9999, -9999],
      [9999, 9999],
      [0, -1000],
    ] as Array<[number, number]>) {
      const { at } = proj.from(p, layers)
      expect(at[0]).toBeGreaterThanOrEqual(0)
      expect(at[0]).toBeLessThanOrEqual(WORLD.width)
      expect(at[1]).toBeGreaterThanOrEqual(0)
      expect(at[1]).toBeLessThanOrEqual(WORLD.height)
    }
  })

  it('keeps the layer planes disjoint so nothing is drawn behind a plane', () => {
    const bottomOf = (l: number) => proj.to([0, WORLD.height], l)[1]
    const topOf = (l: number) => proj.to([0, 0], l)[1]
    for (const l of [1, 2, 3]) expect(bottomOf(l)).toBeLessThan(topOf(l - 1))
  })

  it('stacks higher layers above lower ones', () => {
    expect(proj.to([500, 320], 2)[1]).toBeLessThan(proj.to([500, 320], 0)[1])
  })

  it('round-trips at any yaw and tilt', () => {
    for (const yaw of [-2.4, -0.7, 0, 0.35, 1.2, 2.9]) {
      for (const pitch of [0.1, 0.26, 0.5]) {
        const p = stackProjector(3, { yaw, pitch })
        for (const layer of layers) {
          for (const v of [[0, 0], [500, 320], [WORLD.width, WORLD.height], [790, 90]]) {
            const hit = p.from(p.to(v, layer), layers)
            expect(hit.layer, `yaw ${yaw} pitch ${pitch} layer ${layer}`).toBe(layer)
            expect(hit.at[0]).toBeCloseTo(v[0], 5)
            expect(hit.at[1]).toBeCloseTo(v[1], 5)
          }
        }
      }
    }
  })

  it('keeps the horizontal scale fixed while spinning, so the view cannot pump', () => {
    const widths = new Set(
      [0, 0.4, 0.9, 1.6, 2.5].map((yaw) => stackProjector(3, { yaw, pitch: 0.26 }).viewBox.split(' ')[2]),
    )
    expect(widths.size).toBe(1)
  })

  it('separates the planes at every tilt and every yaw', () => {
    const corners: Array<[number, number]> = [
      [0, 0],
      [WORLD.width, 0],
      [WORLD.width, WORLD.height],
      [0, WORLD.height],
    ]
    for (const pitch of [0.1, 0.2, 0.3, 0.4, 0.5]) {
      for (const yaw of [0, 0.4, 0.79, 1.2, 2.2, -1.1]) {
        const p = stackProjector(3, { yaw, pitch })
        for (const l of [1, 2, 3]) {
          const lowest = Math.max(...corners.map((c) => p.to(c, l)[1]))
          const highest = Math.min(...corners.map((c) => p.to(c, l - 1)[1]))
          expect(lowest, `pitch ${pitch} yaw ${yaw} layer ${l}`).toBeLessThan(highest)
        }
      }
    }
  })
})

describe('single-layer projection', () => {
  it('is the identity, clamped to the data space', () => {
    const proj = layerProjector()
    expect(proj.to([123, 456], 0)).toEqual([123, 456])
    expect(proj.from([123, 456], [0]).at).toEqual([123, 456])
    expect(proj.from([-50, 9999], [2]).at).toEqual([0, WORLD.height])
    expect(proj.from([10, 10], [2]).layer).toBe(2)
  })
})
