import type { Cand, Graph, HNode, NodeId, Params, Vec } from './types'
import { MAX_LAYERS } from './constants'

export function emptyGraph(): Graph {
  return { nodes: new Map(), entry: null, topLayer: 0, nextId: 0, nextSeq: 0 }
}

/** Structural clone. Vectors are immutable, so they are shared. */
export function cloneGraph(g: Graph): Graph {
  const nodes = new Map<NodeId, HNode>()
  for (const [id, n] of g.nodes) {
    nodes.set(id, { ...n, neighbors: n.neighbors.map((l) => l.slice()) })
  }
  return { nodes, entry: g.entry, topLayer: g.topLayer, nextId: g.nextId, nextSeq: g.nextSeq }
}

export function node(g: Graph, id: NodeId): HNode {
  const n = g.nodes.get(id)
  if (!n) throw new Error(`node ${id} is not in the graph`)
  return n
}

export function neighborsAt(g: Graph, id: NodeId, layer: number): NodeId[] {
  const n = g.nodes.get(id)
  if (!n || layer > n.level) return []
  return n.neighbors[layer]
}

export function nodesOnLayer(g: Graph, layer: number): HNode[] {
  const out: HNode[] = []
  for (const n of g.nodes.values()) if (n.level >= layer) out.push(n)
  return out
}

export function liveNodes(g: Graph): HNode[] {
  return [...g.nodes.values()].filter((n) => !n.deleted)
}

/** Undirected edge list of one layer, de-duplicated. */
export function edgesOnLayer(g: Graph, layer: number): Array<[NodeId, NodeId]> {
  const seen = new Set<string>()
  const out: Array<[NodeId, NodeId]> = []
  for (const n of g.nodes.values()) {
    if (n.level < layer) continue
    for (const m of n.neighbors[layer]) {
      const key = n.id < m ? `${n.id}:${m}` : `${m}:${n.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push([n.id, m])
    }
  }
  return out
}

export function addNode(g: Graph, vec: Vec, level: number, label?: string, id?: NodeId): HNode {
  const nid = id ?? g.nextId
  const n: HNode = {
    id: nid,
    vec,
    label: label ?? String(g.nextSeq),
    level,
    neighbors: Array.from({ length: level + 1 }, () => [] as NodeId[]),
    deleted: false,
    seq: g.nextSeq,
  }
  g.nodes.set(nid, n)
  g.nextId = Math.max(g.nextId, nid + 1)
  g.nextSeq += 1
  return n
}

export function link(g: Graph, a: NodeId, b: NodeId, layer: number): void {
  const na = node(g, a)
  const nb = node(g, b)
  if (!na.neighbors[layer].includes(b)) na.neighbors[layer].push(b)
  if (!nb.neighbors[layer].includes(a)) nb.neighbors[layer].push(a)
}

export function unlink(g: Graph, a: NodeId, b: NodeId, layer: number): void {
  const na = g.nodes.get(a)
  const nb = g.nodes.get(b)
  if (na && layer <= na.level) na.neighbors[layer] = na.neighbors[layer].filter((x) => x !== b)
  if (nb && layer <= nb.level) nb.neighbors[layer] = nb.neighbors[layer].filter((x) => x !== a)
}

/** Highest-level surviving node, used when the entry point is deleted. */
export function highestNode(g: Graph): HNode | null {
  let best: HNode | null = null
  for (const n of g.nodes.values()) {
    if (!best || n.level > best.level || (n.level === best.level && n.seq < best.seq)) best = n
  }
  return best
}

export function degreeCap(p: Params, layer: number): number {
  return layer === 0 ? p.Mmax0 : p.Mmax
}

/** l = ⌊−ln(U(0,1)) · mL⌋ — a geometric distribution, so each layer up holds
 *  roughly 1/M of the layer below it. */
export function randomLevel(rng: () => number, mL: number): number {
  const u = Math.max(rng(), 1e-12)
  return Math.min(MAX_LAYERS - 1, Math.floor(-Math.log(u) * mL))
}

export const byDistAsc = (a: Cand, b: Cand) => a.dist - b.dist || a.id - b.id
