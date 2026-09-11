import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PARAMS,
  bruteForce,
  buildIndex,
  runHardDelete,
  runInsert,
  runSearch,
  runSoftDelete,
  runUpdate,
} from '../algorithm'
import { degreeCap, emptyGraph, neighborsAt, nodesOnLayer } from '../graph'
import { connectivity, reachableSets, recallAt } from '../metrics'
import { preset } from '../presets'
import type { Graph, Params, Vec } from '../types'

const params: Params = { ...DEFAULT_PARAMS, seed: 7 }

function build(n: number, id: 'clusters' | 'uniform' = 'uniform', p: Params = params): {
  graph: Graph
  vecs: Vec[]
} {
  const vecs = preset(id).make(n, 11)
  return { graph: buildIndex(emptyGraph(), p, vecs), vecs }
}

/** Undirected edges must stay undirected, or searches become one-way streets. */
function expectSymmetric(g: Graph) {
  for (const n of g.nodes.values()) {
    for (let lc = 0; lc <= n.level; lc++) {
      for (const m of n.neighbors[lc]) {
        expect(g.nodes.has(m), `edge to missing node ${m}`).toBe(true)
        const other = g.nodes.get(m)!
        expect(other.level, `${m} must exist on layer ${lc}`).toBeGreaterThanOrEqual(lc)
        expect(other.neighbors[lc], `${m} must link back to ${n.id} on ${lc}`).toContain(n.id)
      }
      expect(new Set(n.neighbors[lc]).size).toBe(n.neighbors[lc].length)
      expect(n.neighbors[lc]).not.toContain(n.id)
    }
  }
}

function expectDegreeCaps(g: Graph, p: Params) {
  for (const n of g.nodes.values()) {
    for (let lc = 0; lc <= n.level; lc++) {
      expect(n.neighbors[lc].length).toBeLessThanOrEqual(degreeCap(p, lc))
    }
  }
}

describe('graph invariants', () => {
  it('keeps edges symmetric and degrees capped while building', () => {
    const { graph } = build(120, 'clusters')
    expect(graph.nodes.size).toBe(120)
    expectSymmetric(graph)
    expectDegreeCaps(graph, params)
  })

  it('every node exists on layer 0 and layer sizes decay upwards', () => {
    const { graph } = build(200)
    expect(nodesOnLayer(graph, 0).length).toBe(200)
    for (let lc = 1; lc <= graph.topLayer; lc++) {
      expect(nodesOnLayer(graph, lc).length).toBeLessThanOrEqual(nodesOnLayer(graph, lc - 1).length)
    }
  })

  it('the entry point is always the highest-level node', () => {
    const { graph } = build(150)
    const top = Math.max(...[...graph.nodes.values()].map((n) => n.level))
    expect(graph.entry).not.toBeNull()
    expect(graph.nodes.get(graph.entry!)!.level).toBe(top)
    expect(graph.topLayer).toBe(top)
  })

  it('is reproducible for a fixed seed', () => {
    const a = build(60).graph
    const b = build(60).graph
    expect([...a.nodes.values()].map((n) => n.level)).toEqual(
      [...b.nodes.values()].map((n) => n.level),
    )
  })
})

describe('search', () => {
  it('finds the exact nearest neighbour on an easy dataset', () => {
    const { graph, vecs } = build(200)
    let hits = 0
    for (const q of vecs.slice(0, 40)) {
      const { trace } = runSearch(graph, params, q, 1, false)
      if (trace.results[0]?.dist === 0) hits += 1
    }
    // Querying with a point that is *in* the index should essentially always
    // return that point.
    expect(hits).toBeGreaterThanOrEqual(38)
  })

  it('reaches high recall@10 and costs far less than a full scan', () => {
    const { graph } = build(400, 'clusters')
    const queries = preset('uniform').make(30, 99)
    let recall = 0
    let cost = 0
    for (const q of queries) {
      const { trace } = runSearch(graph, { ...params, efSearch: 32 }, q, 10, false)
      recall += recallAt(trace.results, bruteForce(graph, q, 10, params))
      cost += trace.stats.distCalls
    }
    expect(recall / queries.length).toBeGreaterThan(0.9)
    expect(cost / queries.length).toBeLessThan(400)
  })

  it('recall increases monotonically-ish with efSearch', () => {
    const { graph } = build(300, 'clusters')
    const queries = preset('uniform').make(25, 5)
    const score = (ef: number) => {
      let r = 0
      for (const q of queries) {
        const { trace } = runSearch(graph, { ...params, efSearch: ef }, q, 10, false)
        r += recallAt(trace.results, bruteForce(graph, q, 10, params))
      }
      return r / queries.length
    }
    expect(score(64)).toBeGreaterThanOrEqual(score(2))
  })

  it('returns nothing for an empty index without throwing', () => {
    const { trace } = runSearch(emptyGraph(), params, [1, 2], 5)
    expect(trace.results).toEqual([])
    expect(trace.steps.length).toBeGreaterThan(0)
  })
})

describe('deletes', () => {
  it('soft delete hides a node from results but keeps it in the graph', () => {
    const { graph, vecs } = build(120)
    const victim = [...graph.nodes.values()].find((n) => n.neighbors[0].length > 0)!
    const after = runSoftDelete(graph, params, victim.id).graph
    expect(after.nodes.has(victim.id)).toBe(true)
    expect(after.nodes.get(victim.id)!.neighbors[0].length).toBe(victim.neighbors[0].length)
    const { trace } = runSearch(after, params, vecs[victim.seq] ?? victim.vec, 5, false)
    expect(trace.results.map((r) => r.id)).not.toContain(victim.id)
  })

  it('hard delete removes the node, repairs neighbours and keeps invariants', () => {
    let { graph } = build(150, 'clusters')
    const victims = [...graph.nodes.values()].slice(0, 20).map((n) => n.id)
    for (const id of victims) graph = runHardDelete(graph, params, id).graph
    expect(graph.nodes.size).toBe(130)
    for (const id of victims) expect(graph.nodes.has(id)).toBe(false)
    expectSymmetric(graph)
    expectDegreeCaps(graph, params)
  })

  it('promotes a new entry point when the entry point is hard-deleted', () => {
    const { graph } = build(100)
    const old = graph.entry!
    const after = runHardDelete(graph, params, old).graph
    expect(after.entry).not.toBe(old)
    expect(after.nodes.get(after.entry!)!.level).toBe(after.topLayer)
  })

  it('emptying the index by hard delete leaves no entry point', () => {
    let { graph } = build(12)
    for (const id of [...graph.nodes.keys()]) graph = runHardDelete(graph, params, id).graph
    expect(graph.nodes.size).toBe(0)
    expect(graph.entry).toBeNull()
  })

  it('leaves no node stranded without edges after repeated hard deletes', () => {
    let { graph } = build(120, 'clusters')
    for (const id of [...graph.nodes.keys()].slice(0, 30)) {
      graph = runHardDelete(graph, params, id).graph
    }
    const stranded = [...graph.nodes.values()].filter((n) => n.neighbors[0].length === 0)
    expect(stranded.length).toBe(0)
  })
})

describe('updates', () => {
  it('re-insert keeps the id and the invariants', () => {
    const { graph } = build(100)
    const id = [...graph.nodes.keys()][40]
    const after = runUpdate(graph, params, id, [500, 320], 'reinsert').graph
    expect(after.nodes.size).toBe(100)
    expect(after.nodes.get(id)!.vec).toEqual([500, 320])
    expectSymmetric(after)
    expectDegreeCaps(after, params)
  })

  it('in-place update rewires locally and keeps the invariants', () => {
    const { graph } = build(100)
    const id = [...graph.nodes.keys()][40]
    const before = graph.nodes.get(id)!.level
    const after = runUpdate(graph, params, id, [520, 300], 'in-place').graph
    expect(after.nodes.get(id)!.level).toBe(before)
    expectSymmetric(after)
    expectDegreeCaps(after, params)
  })
})

describe('tracing', () => {
  it('records a step-by-step trace whose graph snapshots are independent', () => {
    const { graph } = build(40)
    const { trace } = runInsert(graph, params, [400, 300], { label: 'q' })
    expect(trace.steps.length).toBeGreaterThan(5)
    const first = trace.steps[0]
    const last = trace.steps[trace.steps.length - 1]
    expect(neighborsAt(first.graph, first.vis.focus!, 0).length).toBe(0)
    expect(neighborsAt(last.graph, last.vis.focus!, 0).length).toBeGreaterThan(0)
    expect(trace.steps.every((s) => s.distCalls >= 0)).toBe(true)
  })

  it('charges every distance computation to the counter', () => {
    const { graph } = build(80)
    const { trace } = runSearch(graph, params, [300, 300], 5)
    expect(trace.stats.distCalls).toBeGreaterThan(0)
    expect(trace.stats.distCalls).toBeLessThan(trace.stats.bruteForceDistCalls * 2)
    expect(trace.stats.visited).toBeLessThanOrEqual(trace.stats.distCalls)
  })

  it('simple neighbour selection produces a measurably different graph', () => {
    const vecs = preset('clusters').make(150, 3)
    const h = buildIndex(emptyGraph(), { ...params, neighborRule: 'heuristic' }, vecs)
    const s = buildIndex(emptyGraph(), { ...params, neighborRule: 'simple' }, vecs)
    const edges = (g: Graph) =>
      [...g.nodes.values()].reduce((a, n) => a + n.neighbors[0].length, 0)
    expect(edges(h)).not.toBe(edges(s))
  })
})

describe('connectivity — the property that explains the heuristic', () => {
  // seed 42 is the app default, which is what the lesson's buttons leave in place
  const build = (rule: 'heuristic' | 'simple', M: number, seed = 42, n = 250) => {
    const p: Params = {
      ...params,
      seed,
      M,
      Mmax: M,
      Mmax0: 2 * M,
      mL: 1 / Math.log(5),
      neighborRule: rule,
    }
    const g = buildIndex(emptyGraph(), p, preset('clusters').make(n, 9))
    return { g, p, conn: connectivity(g, 0) }
  }

  it('the heuristic never strands a vector, across seeds and edge budgets', () => {
    for (const seed of [1, 7, 42, 99]) {
      for (const M of [3, 5, 8]) {
        const { conn } = build('heuristic', M, seed)
        expect(conn.orphaned, `seed ${seed} M=${M}`).toBe(0)
        expect(conn.bridged).toBe(conn.components.length)
      }
    }
  })

  it('a split layer 0 is normal — clusters form separate components', () => {
    // Somewhere in this range the clusters must show up as separate pieces;
    // which seed splits is incidental, that it happens is not.
    const anySplit = [1, 7, 42, 99].some((seed) => build('heuristic', 3, seed).conn.components.length > 1)
    expect(anySplit).toBe(true)
  })

  it('reachability is recursive, and predicts retrievability exactly', () => {
    const { g, p, conn } = build('simple', 3)
    const reached = reachableSets(g)[0]
    expect(reached.size + conn.orphaned).toBe(g.nodes.size)
    // Query every node at its own coordinates with a huge beam: nothing outside
    // the predicted reachable set can come back.
    let found = 0
    for (const n of g.nodes.values()) {
      const { trace } = runSearch(g, { ...p, efSearch: 400 }, n.vec, 1, false)
      if (trace.results[0]?.id === n.id) {
        found += 1
        expect(reached.has(n.id), `retrieved ${n.label} but predicted unreachable`).toBe(true)
      }
    }
    expect(found).toBeLessThan(g.nodes.size)
  })

  it('reproduces the figures quoted in lesson 5', () => {
    const simple = build('simple', 3)
    const heuristic = build('heuristic', 3)
    expect(simple.conn.components.length).toBe(6)
    expect(simple.conn.bridged).toBe(1)
    expect(simple.conn.orphaned).toBe(118)
    expect(heuristic.conn.components.length).toBe(3)
    expect(heuristic.conn.orphaned).toBe(0)

    const queries = preset('uniform').make(24, 20250826)
    const score = ({ g, p }: { g: Graph; p: Params }) => {
      let r = 0
      for (const q of queries) {
        const { trace } = runSearch(g, { ...p, efSearch: 32 }, q, 10, false)
        r += recallAt(trace.results, bruteForce(g, q, 10, p))
      }
      return Math.round((r / queries.length) * 100)
    }
    expect(score(simple)).toBe(40)
    expect(score(heuristic)).toBe(94)
  })

  it('a bigger edge budget connects layer 0 outright', () => {
    expect(build('heuristic', 12).conn.components.length).toBe(1)
  })
})

describe('decision narration', () => {
  it('distinguishes insertion connection results from query descent even with one slot', () => {
    const p = { ...params, efConstruction: 1 }
    let graph = runInsert(emptyGraph(), p, [100, 100], { level: 1 }).graph
    graph = runInsert(graph, p, [200, 200], { level: 1 }).graph
    const inserted = runInsert(graph, p, [150, 150], { level: 1 }).trace
    const returned = inserted.steps.filter(s => s.line === 's15')
    expect(returned.length).toBe(2)
    for (const step of returned) {
      expect(step.detail).toContain('possible connections, not final query results')
      expect(step.detail).not.toContain('nearest of these becomes')
    }
    const query = runSearch(graph, p, [150, 150], 1).trace
    expect(query.steps.find(s => s.line === 's15' && s.vis.layer === 1)!.detail).toContain('nearest of these becomes')
  })

  it('reports a spare slot when a farther candidate fills the last available slot', () => {
    const { graph } = build(24)
    const trace = runSearch(graph, { ...params, efSearch: 24 }, [500, 300], 1).trace
    const accepted = trace.steps.filter(s => s.line === 's13' && s.vis.searchEf === 24)
    expect(accepted.length).toBeGreaterThan(0)
    expect(accepted.at(-1)!.detail).toContain('spare slot')
  })
})
