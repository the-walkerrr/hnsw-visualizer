import { bruteForce, runSearch } from './algorithm'
import { edgesOnLayer, neighborsAt, nodesOnLayer } from './graph'
import type { Cand, Graph, NodeId, Params, Vec } from './types'

export interface LayerStat {
  layer: number
  nodes: number
  edges: number
  avgDegree: number
  maxDegree: number
}

export interface GraphStats {
  total: number
  live: number
  deleted: number
  topLayer: number
  layers: LayerStat[]
  edges: number
  /** Rough bytes for the whole index: vectors (dims x 4) plus 4 bytes per
   *  directed edge. The vectors dominate, which is why quantisation exists. */
  bytes: number
}

export function graphStats(g: Graph): GraphStats {
  const top = g.entry === null ? -1 : g.topLayer
  const layers: LayerStat[] = []
  let edges = 0
  let links = 0
  for (let lc = 0; lc <= Math.max(top, 0); lc++) {
    const ns = nodesOnLayer(g, lc)
    const es = edgesOnLayer(g, lc)
    const degrees = ns.map((n) => n.neighbors[lc].length)
    links += degrees.reduce((a, b) => a + b, 0)
    edges += es.length
    layers.push({
      layer: lc,
      nodes: ns.length,
      edges: es.length,
      avgDegree: ns.length ? degrees.reduce((a, b) => a + b, 0) / ns.length : 0,
      maxDegree: degrees.length ? Math.max(...degrees) : 0,
    })
  }
  let deleted = 0
  for (const n of g.nodes.values()) if (n.deleted) deleted += 1
  const dims = g.nodes.size ? [...g.nodes.values()][0].vec.length : 0
  return {
    total: g.nodes.size,
    live: g.nodes.size - deleted,
    deleted,
    topLayer: Math.max(top, 0),
    layers,
    edges,
    bytes: g.nodes.size * dims * 4 + links * 4,
  }
}

export interface Connectivity {
  /** Component sizes on the layer, largest first. */
  components: number[]
  /** Components a search can actually enter, given the layers above. */
  bridged: number
  /** Nodes in components no search can enter — unretrievable at any ef. */
  orphaned: number
}

/**
 * Connected components of one layer, and whether each one can be entered from
 * above.
 *
 * This is the property that explains why HNSW works on clustered data. Layer 0
 * is routinely *disconnected* — separate clusters form separate components —
 * and that is fine, because a search does not have to cross layer 0 to reach
 * them: it drops in from a sparser layer. A component with no node on the layer
 * above, though, is unreachable by any search: those vectors are in the index
 * and can never be returned.
 */
/** Component sizes of one layer's graph, largest first, plus the members. */
function componentsOf(g: Graph, layer: number): NodeId[][] {
  const seen = new Set<NodeId>()
  const out: NodeId[][] = []
  for (const start of nodesOnLayer(g, layer)) {
    if (seen.has(start.id)) continue
    const stack: NodeId[] = [start.id]
    const mine: NodeId[] = []
    seen.add(start.id)
    while (stack.length) {
      const x = stack.pop()!
      mine.push(x)
      for (const y of neighborsAt(g, x, layer)) {
        if (!seen.has(y)) {
          seen.add(y)
          stack.push(y)
        }
      }
    }
    out.push(mine)
  }
  return out.sort((a, b) => b.length - a.length)
}

/**
 * Which nodes a search can reach at all, computed the way the algorithm
 * actually descends: start at the entry point on the top layer, walk that
 * layer's edges, then use everything reached as the possible entry points for
 * the layer below, and repeat.
 *
 * Reachability is *recursive* — a component of layer 0 containing a layer-1
 * node is still sealed off if that layer-1 node sits in an unreachable
 * component of layer 1. Checking one layer up is not enough.
 */
export function reachableSets(g: Graph): Set<NodeId>[] {
  const sets: Set<NodeId>[] = []
  if (g.entry === null) return sets
  let frontier = new Set<NodeId>([g.entry])
  for (let lc = g.topLayer; lc >= 0; lc--) {
    const reached = new Set<NodeId>()
    const stack = [...frontier].filter((id) => {
      const n = g.nodes.get(id)
      return n !== undefined && n.level >= lc
    })
    for (const id of stack) reached.add(id)
    while (stack.length) {
      const x = stack.pop()!
      for (const y of neighborsAt(g, x, lc)) {
        if (!reached.has(y)) {
          reached.add(y)
          stack.push(y)
        }
      }
    }
    sets[lc] = reached
    // Everything reached here can serve as an entry point one layer down.
    frontier = reached
  }
  return sets
}

export function connectivity(g: Graph, layer: number): Connectivity {
  const comps = componentsOf(g, layer)
  const reached = reachableSets(g)[layer] ?? new Set<NodeId>()
  let bridged = 0
  let orphaned = 0
  for (const c of comps) {
    if (c.some((id) => reached.has(id))) bridged += 1
    else orphaned += c.length
  }
  return { components: comps.map((c) => c.length), bridged, orphaned }
}

export function degreeHistogram(g: Graph, layer: number): Array<{ bin: number; count: number }> {
  const counts = new Map<number, number>()
  for (const n of nodesOnLayer(g, layer)) {
    const d = n.neighbors[layer].length
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  const max = Math.max(0, ...counts.keys())
  return Array.from({ length: max + 1 }, (_, d) => ({ bin: d, count: counts.get(d) ?? 0 }))
}

export function levelHistogram(g: Graph): Array<{ bin: number; count: number }> {
  const counts = new Map<number, number>()
  for (const n of g.nodes.values()) counts.set(n.level, (counts.get(n.level) ?? 0) + 1)
  const max = Math.max(0, ...counts.keys())
  return Array.from({ length: max + 1 }, (_, l) => ({ bin: l, count: counts.get(l) ?? 0 }))
}

/** Fraction of the true top-k that the graph actually returned. */
export function recallAt(approx: Cand[], exact: Cand[]): number {
  if (exact.length === 0) return 1
  const truth = new Set(exact.map((c) => c.id))
  let hit = 0
  for (const c of approx) if (truth.has(c.id)) hit += 1
  return hit / exact.length
}

export interface BenchPoint {
  ef: number
  recall: number
  distCalls: number
  hops: number
  bruteForceDistCalls: number
}

/** Run the same query set at a range of efSearch values — the classic
 *  recall-versus-cost curve every ANN benchmark reports. */
export function efSweep(
  g: Graph,
  params: Params,
  queries: Vec[],
  k: number,
  efs: number[],
): BenchPoint[] {
  return efs.map((ef) => {
    let recall = 0
    let distCalls = 0
    let hops = 0
    let bf = 0
    for (const q of queries) {
      const { trace } = runSearch(g, { ...params, efSearch: ef }, q, k, false)
      recall += recallAt(trace.results, bruteForce(g, q, k, params))
      distCalls += trace.stats.distCalls
      hops += trace.stats.hops
      bf += trace.stats.bruteForceDistCalls
    }
    const n = Math.max(queries.length, 1)
    return {
      ef,
      recall: recall / n,
      distCalls: distCalls / n,
      hops: hops / n,
      bruteForceDistCalls: bf / n,
    }
  })
}
