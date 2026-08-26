import { WORLD } from './constants'
import { makeRng } from './rng'
import type { Vec } from './types'

export type PresetId = 'clusters' | 'uniform' | 'ring' | 'moons' | 'grid' | 'spiral'

export interface Preset {
  id: PresetId
  name: string
  blurb: string
  make: (n: number, seed: number) => Vec[]
}

const W = WORLD.width
const H = WORLD.height
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const pad = 40

function gauss(rng: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const point = (x: number, y: number): Vec => [
  clamp(x, pad, W - pad),
  clamp(y, pad, H - pad),
]

export const PRESETS: Preset[] = [
  {
    id: 'clusters',
    name: 'Clusters',
    blurb:
      'Four dense blobs with empty space between them — the shape real embeddings usually have, and the case where naive greedy search gets stuck.',
    make: (n, seed) => {
      const rng = makeRng(seed)
      const centres = [
        [W * 0.22, H * 0.26],
        [W * 0.78, H * 0.24],
        [W * 0.28, H * 0.76],
        [W * 0.74, H * 0.72],
      ]
      return Array.from({ length: n }, (_, i) => {
        const c = centres[i % centres.length]
        return point(c[0] + gauss(rng) * W * 0.06, c[1] + gauss(rng) * H * 0.08)
      })
    },
  },
  {
    id: 'uniform',
    name: 'Uniform',
    blurb: 'Points spread evenly. The friendliest possible case for a graph index.',
    make: (n, seed) => {
      const rng = makeRng(seed)
      return Array.from({ length: n }, () => point(pad + rng() * (W - 2 * pad), pad + rng() * (H - 2 * pad)))
    },
  },
  {
    id: 'ring',
    name: 'Ring',
    blurb:
      'A thin circle. Nearly every node sits on a one-dimensional manifold, so the graph is almost a cycle — long-range edges matter enormously here.',
    make: (n, seed) => {
      const rng = makeRng(seed)
      return Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rng() * 0.08
        const r = Math.min(W, H) * 0.36 + gauss(rng) * 10
        return point(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r)
      })
    },
  },
  {
    id: 'moons',
    name: 'Two moons',
    blurb:
      'Two interleaved crescents. Nearest neighbours in space are often on the other crescent — good for seeing recall break.',
    make: (n, seed) => {
      const rng = makeRng(seed)
      return Array.from({ length: n }, (_, i) => {
        const top = i % 2 === 0
        const t = rng() * Math.PI
        const r = Math.min(W, H) * 0.3
        const jx = gauss(rng) * 14
        const jy = gauss(rng) * 14
        return top
          ? point(W / 2 - r * Math.cos(t) + jx, H * 0.62 - r * Math.sin(t) + jy)
          : point(W / 2 + r * Math.cos(t) + jx, H * 0.38 + r * Math.sin(t) + jy)
      })
    },
  },
  {
    id: 'grid',
    name: 'Grid',
    blurb:
      'A regular lattice. Every node has an identical neighbourhood, which makes the neighbour-selection heuristic easy to reason about.',
    make: (n) => {
      const cols = Math.ceil(Math.sqrt((n * W) / H))
      const rows = Math.ceil(n / cols)
      const out: Vec[] = []
      for (let r = 0; r < rows && out.length < n; r++) {
        for (let c = 0; c < cols && out.length < n; c++) {
          out.push(
            point(
              pad + ((W - 2 * pad) * c) / Math.max(cols - 1, 1),
              pad + ((H - 2 * pad) * r) / Math.max(rows - 1, 1),
            ),
          )
        }
      }
      return out
    },
  },
  {
    id: 'spiral',
    name: 'Spiral',
    blurb:
      'Distance along the manifold is very different from distance across it — the classic way to embarrass an index.',
    make: (n, seed) => {
      const rng = makeRng(seed)
      return Array.from({ length: n }, (_, i) => {
        const t = (i / n) * Math.PI * 4.5
        const r = 24 + (t / (Math.PI * 4.5)) * Math.min(W, H) * 0.42
        return point(W / 2 + Math.cos(t) * r + gauss(rng) * 6, H / 2 + Math.sin(t) * r + gauss(rng) * 6)
      })
    },
  },
]

export function preset(id: PresetId): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]
}
