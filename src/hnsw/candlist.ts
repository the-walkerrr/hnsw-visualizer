import type { Cand, NodeId } from './types'
import { byDistAsc } from './graph'

/** A distance-ordered candidate set.
 *
 *  A real implementation uses two binary heaps; the graphs here are small
 *  enough that a sorted array is both fast enough and far easier to read —
 *  and `items()` can hand the UI the whole queue in order, which a heap
 *  cannot do cheaply. */
export class CandList {
  private xs: Cand[] = []

  static from(cs: Cand[]): CandList {
    const l = new CandList()
    for (const c of cs) l.push(c)
    return l
  }

  get size(): number {
    return this.xs.length
  }

  has(id: NodeId): boolean {
    return this.xs.some((c) => c.id === id)
  }

  push(c: Cand): void {
    const i = this.xs.findIndex((x) => byDistAsc(c, x) < 0)
    if (i === -1) this.xs.push(c)
    else this.xs.splice(i, 0, c)
  }

  nearest(): Cand | undefined {
    return this.xs[0]
  }

  furthest(): Cand | undefined {
    return this.xs[this.xs.length - 1]
  }

  popNearest(): Cand | undefined {
    return this.xs.shift()
  }

  popFurthest(): Cand | undefined {
    return this.xs.pop()
  }

  items(): Cand[] {
    return this.xs.slice()
  }

  ids(): NodeId[] {
    return this.xs.map((c) => c.id)
  }
}
