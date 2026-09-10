import { CandList } from './candlist'
import {
  addNode,
  byDistAsc,
  cloneGraph,
  degreeCap,
  highestNode,
  link,
  liveNodes,
  neighborsAt,
  node,
  randomLevel,
  unlink,
} from './graph'
import { distance } from './metric'
import { makeRng } from './rng'
import type {
  Cand,
  Graph,
  NodeId,
  OpKind,
  OpStats,
  Params,
  Proc,
  Step,
  StepVis,
  Trace,
  Vec,
} from './types'

const uniq = (xs: NodeId[]) => [...new Set(xs)]
const f = (x: number) => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(1))
const pct = (x: number) => `${(x * 100).toFixed(0)}%`

function emptyVis(): StepVis {
  return {
    layer: null,
    entryPoints: [],
    visited: [],
    candidates: [],
    dynamic: [],
    results: [],
    accepted: [],
    rejected: [],
    newEdges: [],
    removedEdges: [],
  }
}

/**
 * One operation against one graph, recorded step by step.
 *
 * The algorithms below follow Malkov & Yashunin (2016), "Efficient and robust
 * approximate nearest neighbor search using Hierarchical Navigable Small World
 * graphs", algorithms 1–5, line for line. Every `emit` call names the
 * pseudocode line it is executing so the UI can highlight it.
 */
class Run {
  readonly graph: Graph
  readonly params: Params
  private steps: Step[] = []
  private op: OpKind
  private proc: Proc = 'insert'
  private vis: StepVis = emptyVis()
  private record: boolean
  private rng: () => number

  private distCalls = 0
  private hops = 0
  private visitedIds = new Set<NodeId>()
  private layersTouched = new Set<number>()
  private snapCache: Graph | null = null
  private dirty = true
  private bruteForceBaseline: number

  constructor(graph: Graph, params: Params, op: OpKind, record: boolean) {
    this.graph = cloneGraph(graph)
    this.params = params
    this.op = op
    this.record = record
    this.rng = makeRng((params.seed + graph.nextSeq * 2654435761) >>> 0)
    this.bruteForceBaseline = liveNodes(this.graph).length
  }

  // ---------------------------------------------------------------- plumbing

  private mutated(): void {
    this.dirty = true
  }

  private snapshot(): Graph {
    if (this.dirty || !this.snapCache) {
      this.snapCache = cloneGraph(this.graph)
      this.dirty = false
    }
    return this.snapCache
  }

  private nm(id: NodeId): string {
    return this.graph.nodes.get(id)?.label ?? `#${id}`
  }

  private nms(ids: NodeId[]): string {
    return ids.map((i) => this.nm(i)).join(', ') || '∅'
  }

  /** Every distance computation goes through here so the counter is honest. */
  private d(a: Vec, b: Vec): number {
    this.distCalls += 1
    return distance(a, b, this.params.metric)
  }

  private dTo(q: Vec, id: NodeId): number {
    return this.d(q, node(this.graph, id).vec)
  }

  private emit(
    line: string,
    title: string,
    detail: string,
    weight: 'major' | 'minor' = 'major',
    extra: Partial<StepVis> = {},
  ): void {
    if (!this.record) return
    const v: StepVis = { ...this.vis, ...extra }
    this.steps.push({
      index: this.steps.length,
      op: this.op,
      proc: this.proc,
      line,
      title,
      detail,
      weight,
      distCalls: this.distCalls,
      graph: this.snapshot(),
      vis: {
        ...v,
        entryPoints: [...v.entryPoints],
        visited: [...v.visited],
        candidates: [...v.candidates],
        dynamic: [...v.dynamic],
        results: [...v.results],
        accepted: [...v.accepted],
        rejected: [...v.rejected],
        newEdges: v.newEdges.map((e) => [...e] as [NodeId, NodeId]),
        removedEdges: v.removedEdges.map((e) => [...e] as [NodeId, NodeId]),
      },
    })
  }

  private clearSearchVis(): void {
    this.vis.current = undefined
    this.vis.considering = undefined
    this.vis.candidates = []
    this.vis.visited = []
    this.vis.dynamic = []
    this.vis.accepted = []
    this.vis.rejected = []
  }

  stats(): OpStats {
    return {
      distCalls: this.distCalls,
      hops: this.hops,
      visited: this.visitedIds.size,
      layersTouched: this.layersTouched.size,
      bruteForceDistCalls: this.bruteForceBaseline,
    }
  }

  trace(op: OpKind, title: string, results: Cand[], exact: Cand[]): Trace {
    return { op, title, steps: this.steps, results, exact, stats: this.stats() }
  }

  // ------------------------------------------------------- Algorithm 2: SEARCH-LAYER

  /**
   * Greedy best-first search restricted to one layer, keeping the `ef` closest
   * elements found so far. `ef = 1` makes it a plain greedy walk; larger `ef`
   * turns it into a beam search that can climb out of local minima.
   */
  private searchLayer(q: Vec, entryPoints: NodeId[], ef: number, lc: number, why: string): Cand[] {
    const prevProc = this.proc
    this.proc = 'search-layer'
    this.layersTouched.add(lc)
    this.vis.layer = lc
    this.vis.entryPoints = entryPoints.slice()
    this.vis.searchEf = ef
    this.vis.searchMetric = this.params.metric

    const visited = new Set<NodeId>(entryPoints)
    const C = new CandList()
    const W = new CandList()
    for (const ep of entryPoints) {
      const dist = this.dTo(q, ep)
      C.push({ id: ep, dist })
      W.push({ id: ep, dist })
      this.visitedIds.add(ep)
    }
    this.vis.visited = [...visited]
    this.vis.candidates = C.ids()
    this.vis.dynamic = W.ids()
    this.emit(
      's2',
      `SEARCH-LAYER on layer ${lc}, ef = ${ef}`,
      `${why} The visited set v, the candidate queue C and the result list W all start out as the entry point set {${this.nms(entryPoints)}}. ` +
        `W will never hold more than ef = ${ef} element${ef === 1 ? '' : 's'}, and that single number is the whole speed/accuracy dial.`,
    )

    while (C.size > 0) {
      const c = C.popNearest()!
      const furthest = W.furthest()!
      this.vis.candidates = C.ids()
      if (c.dist > furthest.dist) {
        this.vis.current = undefined
        this.emit(
          's8',
          `Stop: nearest candidate is further than the worst result`,
          `The closest thing left in C is ${this.nm(c.id)} at ${f(c.dist)}, but the *worst* entry already in W (${this.nm(furthest.id)}) is only ${f(furthest.dist)} away. ` +
            `C is ordered by distance, so none of the queued dots themselves can improve W. The search stops without checking their remaining links to save work. An unseen neighbour could still be closer: this is an approximate stopping rule, not proof of an exact answer.`,
        )
        break
      }
      this.hops += 1
      this.vis.current = c.id
      this.emit(
        's9',
        `Expand ${this.nm(c.id)} (${f(c.dist)} away)`,
        `${this.nm(c.id)} is the closest unexpanded candidate, and it is closer than W's worst entry (${f(furthest.dist)}), so it is worth looking at its neighbours. ` +
          `Only the edges of layer ${lc} are followed — the other layers do not exist as far as this call is concerned.`,
      )

      for (const e of neighborsAt(this.graph, c.id, lc)) {
        if (visited.has(e)) {
          this.emit(
            's10',
            `Skip ${this.nm(e)} — already visited`,
            `The visited set v is what stops the walk going round in circles; each node's distance is computed at most once per SEARCH-LAYER call.`,
            'minor',
            { considering: e },
          )
          continue
        }
        visited.add(e)
        this.visitedIds.add(e)
        const dist = this.dTo(q, e)
        const worst = W.furthest()!
        this.vis.visited = [...visited]
        if (dist < worst.dist || W.size < ef) {
          C.push({ id: e, dist })
          W.push({ id: e, dist })
          let evicted: Cand | undefined
          if (W.size > ef) evicted = W.popFurthest()
          this.vis.candidates = C.ids()
          this.vis.dynamic = W.ids()
          this.emit(
            's13',
            `Keep ${this.nm(e)} (${f(dist)})`,
            (W.size < ef && !evicted
              ? `W still has room (${W.size}/${ef}), so ${this.nm(e)} is kept no matter what. `
              : `${f(dist)} beats W's worst entry ${f(worst.dist)}, so ${this.nm(e)} is kept. `) +
              (evicted
                ? `W was full, so the furthest element ${this.nm(evicted.id)} (${f(evicted.dist)}) was dropped.`
                : `Nothing had to be evicted.`) +
              ` It also goes into C, which is how the frontier keeps moving.`,
            'minor',
            { considering: e },
          )
        } else {
          this.emit(
            's12',
            `Reject ${this.nm(e)} (${f(dist)})`,
            `W is already full with ef = ${ef} closer elements — its worst is ${f(worst.dist)} — so ${this.nm(e)} is not a result and, crucially, is *not* added to C either. The search never expands through it.`,
            'minor',
            { considering: e, rejected: [e] },
          )
        }
      }
      this.vis.current = undefined
    }

    const out = W.items()
    this.vis.dynamic = out.map((c) => c.id)
    this.vis.candidates = []
    this.emit(
      's15',
      `Layer ${lc} returns ${out.length} element${out.length === 1 ? '' : 's'}`,
      `W = {${this.nms(out.map((c) => c.id))}}. ${this.distCalls} distance computations charged so far in this operation. ` +
        (lc > 0
          ? `The nearest of these becomes the entry point one layer down — the long edges up here did the travelling, the short edges below will do the refining.`
          : `On layer 0 this list is the answer (after trimming to k).`),
    )
    this.proc = prevProc
    return out
  }

  // ------------------------------ Algorithms 3 & 4: SELECT-NEIGHBORS

  /**
   * Choose which of the found candidates actually become edges.
   *
   * `simple` keeps the M nearest. The `heuristic` keeps a candidate only if it
   * is closer to the base node than to any already-kept neighbour, which
   * spreads the edges out in direction instead of clustering them all on one
   * side — that is what keeps the graph *navigable* across cluster boundaries.
   */
  private selectNeighbors(
    baseId: NodeId,
    cands: Cand[],
    M: number,
    lc: number,
    why: string,
  ): NodeId[] {
    const prevProc = this.proc
    this.proc = 'select-neighbors'
    this.vis.layer = lc
    this.vis.focus = baseId
    this.vis.accepted = []
    this.vis.rejected = []

    if (this.params.neighborRule === 'simple') {
      const sorted = cands.slice().sort(byDistAsc)
      const keep = sorted.slice(0, M)
      const drop = sorted.slice(M)
      this.vis.accepted = keep.map((c) => c.id)
      this.vis.rejected = drop.map((c) => c.id)
      this.emit(
        'n2',
        `SELECT-NEIGHBORS-SIMPLE: keep the ${keep.length} nearest of ${cands.length}`,
        `${why} Simple selection takes the M = ${M} closest candidates and nothing else: {${this.nms(this.vis.accepted)}}. ` +
          `Cheap, but every edge tends to point into the same dense blob, which is exactly how a greedy walk gets trapped. Switch the rule to "heuristic" to see the difference.`,
      )
      this.proc = prevProc
      return keep.map((c) => c.id)
    }

    const W = CandList.from(cands)
    this.emit(
      'h2',
      `SELECT-NEIGHBORS-HEURISTIC over ${cands.length} candidates`,
      `${why} R starts empty and W holds every candidate, ordered by distance to ${this.nm(baseId)}. At most M = ${M} will survive.`,
    )

    if (this.params.extendCandidates) {
      const base = node(this.graph, baseId).vec
      const extra: Cand[] = []
      for (const c of cands) {
        for (const adj of neighborsAt(this.graph, c.id, lc)) {
          if (adj === baseId || W.has(adj) || extra.some((x) => x.id === adj)) continue
          extra.push({ id: adj, dist: this.d(base, node(this.graph, adj).vec) })
        }
      }
      for (const c of extra) W.push(c)
      this.emit(
        'h3',
        `extendCandidates: +${extra.length} second-hop candidates`,
        `The candidate pool is widened with the neighbours of the neighbours (${this.nms(extra.map((e) => e.id))}). ` +
          `It costs distance computations and usually only pays off on extremely clustered data — which is why it is off by default.`,
      )
    }

    const R: Cand[] = []
    const discarded: Cand[] = []
    while (W.size > 0 && R.length < M) {
      const e = W.popNearest()!
      let blocker: NodeId | undefined
      let blockerDist = 0
      for (const r of R) {
        const dr = this.d(node(this.graph, e.id).vec, node(this.graph, r.id).vec)
        if (dr < e.dist) {
          blocker = r.id
          blockerDist = dr
          break
        }
      }
      if (blocker === undefined) {
        R.push(e)
        this.vis.accepted = R.map((c) => c.id)
        this.emit(
          'h8',
          `Accept ${this.nm(e.id)} (${f(e.dist)})`,
          `${this.nm(e.id)} is closer to ${this.nm(baseId)} than it is to any neighbour already kept, so it covers a direction nothing else covers. R = {${this.nms(this.vis.accepted)}}.`,
          'minor',
          { considering: e.id },
        )
      } else {
        discarded.push(e)
        this.vis.rejected = discarded.map((c) => c.id)
        this.emit(
          'h9',
          `Prune ${this.nm(e.id)} — ${this.nm(blocker)} covers it`,
          `${this.nm(e.id)} sits ${f(e.dist)} from ${this.nm(baseId)} but only ${f(blockerDist)} from ${this.nm(blocker)}, which is already a neighbour. ` +
            `An edge there would be redundant: a search can reach ${this.nm(e.id)} in one extra hop via ${this.nm(blocker)}. Spending the edge budget on a new direction instead is what makes the graph navigable.`,
          'minor',
          { considering: e.id, blocker },
        )
      }
    }

    if (this.params.keepPrunedConnections && discarded.length > 0 && R.length < M) {
      while (discarded.length > 0 && R.length < M) {
        const c = discarded.shift()!
        R.push(c)
        this.vis.accepted = R.map((x) => x.id)
        this.vis.rejected = discarded.map((x) => x.id)
        this.emit(
          'h11',
          `Refill with pruned candidate ${this.nm(c.id)}`,
          `The heuristic ran out of "new direction" candidates before filling M = ${M} slots. keepPrunedConnections spends the leftover budget on the closest rejects rather than leaving the node under-connected — an under-connected node is a dead end for every future search.`,
          'minor',
        )
      }
    }

    this.emit(
      'h12',
      `Selected ${R.length} neighbour${R.length === 1 ? '' : 's'} for ${this.nm(baseId)}`,
      `Kept {${this.nms(R.map((c) => c.id))}}` +
        (discarded.length ? `, pruned {${this.nms(discarded.map((c) => c.id))}}.` : '.'),
    )
    this.proc = prevProc
    return R.map((c) => c.id)
  }

  /** Shrink any node that went over its degree cap, re-running the selection.
   *
   *  The paper only does this inside INSERT (lines 11–13), but *any* operation
   *  that adds a reverse edge can push a third party over the cap — the delete
   *  repair and the in-place update both do — so they all funnel through here. */
  private trim(
    ids: NodeId[],
    lc: number,
    reason: string,
    lines: { over: string; done: string } = { over: 'i12', done: 'i13' },
  ): void {
    const cap = degreeCap(this.params, lc)
    for (const e of ids) {
      const conns = neighborsAt(this.graph, e, lc).slice()
      if (conns.length <= cap) continue
      const base = node(this.graph, e).vec
      const cands = conns.map((x) => ({ id: x, dist: this.d(base, node(this.graph, x).vec) }))
      const caller = this.proc
      this.emit(
        lines.over,
        `${this.nm(e)} now has ${conns.length} edges — over the cap of ${cap}`,
        `${reason} Layer ${lc} allows at most ${cap} edges per node (Mmax${lc === 0 ? '0' : ''} = ${cap}). ` +
          `Rather than dropping the newest edge, HNSW re-runs the neighbour selection over all ${conns.length} of them, so the *set* stays well spread.`,
        'major',
        { focus: e },
      )
      const keep = this.selectNeighbors(
        e,
        cands,
        cap,
        lc,
        `Re-selecting ${this.nm(e)}'s own edge set from scratch.`,
      )
      this.proc = caller
      const dropped = conns.filter((x) => !keep.includes(x))
      for (const x of dropped) unlink(this.graph, e, x, lc)
      this.mutated()
      this.emit(
        lines.done,
        `Trimmed ${this.nm(e)}: dropped ${this.nms(dropped)}`,
        `Edges are undirected here, so ${this.nms(dropped)} lose this connection too. ` +
          `This is the one place where inserting a node can make an *existing* node's neighbourhood worse — and why insertion order affects the final graph.`,
        'major',
        { focus: e, removedEdges: dropped.map((x) => [e, x] as [NodeId, NodeId]) },
      )
    }
  }

  // ------------------------------------------------------- Algorithm 1: INSERT

  insert(vec: Vec, label?: string, forcedLevel?: number, id?: NodeId): NodeId {
    const p = this.params
    const level = forcedLevel ?? randomLevel(this.rng, p.mL)
    const n = addNode(this.graph, vec, level, label, id)
    this.mutated()
    this.proc = 'insert'
    this.vis = emptyVis()
    this.vis.query = vec
    this.vis.queryLabel = n.label
    this.vis.focus = n.id

    const layerOdds = Math.exp(-1 / p.mL)
    this.emit(
      'i3',
      `Roll a level for ${n.label} → ${level}`,
      `l = ⌊−ln(U(0,1)) · mL⌋ with mL = ${p.mL.toFixed(3)} came out as ${level}, so ${n.label} exists on layers 0…${level}. ` +
        `Each extra layer is only ${pct(layerOdds)} as likely as the one below, so roughly 1 node in ${Math.round(1 / layerOdds)} reaches layer 1, 1 in ${Math.round(1 / (layerOdds * layerOdds))} reaches layer 2, and so on. ` +
        `Nothing about the *data* decides this — the level is a coin flip, which is what keeps insertion cheap and the layer sizes exponentially decaying.`,
    )

    if (this.graph.entry === null) {
      this.graph.entry = n.id
      this.graph.topLayer = level
      this.mutated()
      this.emit(
        'i15',
        `${n.label} is the first element — it becomes the entry point`,
        `An empty index has no entry point, so ${n.label} simply becomes it. Every search from now on starts at the entry point on the top layer.`,
      )
      return n.id
    }

    const L = this.graph.topLayer
    let ep = [this.graph.entry]
    this.emit(
      'i2',
      `Enter at ${this.nm(this.graph.entry)} on layer ${L}`,
      `Insertion is just a search that stops to make friends. The top layer is ${L} and the fixed entry point is ${this.nm(this.graph.entry)}.` +
        (level > L
          ? ` ${n.label} rolled level ${level}, which is above the current top — it will take over as entry point at the end.`
          : ''),
    )

    // Phase 1 — pure navigation, no edges are created.
    for (let lc = L; lc > level; lc--) {
      const W = this.searchLayer(
        vec,
        ep,
        1,
        lc,
        `Phase 1 (zoom-in): ${n.label} does not live on layer ${lc}, so this is travel only.`,
      )
      ep = [W[0].id]
      this.proc = 'insert'
      this.emit(
        'i6',
        `Hand ${this.nm(ep[0])} down to layer ${lc - 1}`,
        `No edges were created on layer ${lc} — ${n.label} does not exist there. The only product of this layer is a better starting point: ${this.nm(ep[0])}. ` +
          `Coarse layers are sparse, so each hop covers a lot of ground for very few distance computations.`,
      )
    }

    // Phase 2 — search wide, then wire up.
    for (let lc = Math.min(L, level); lc >= 0; lc--) {
      const W = this.searchLayer(
        vec,
        ep,
        p.efConstruction,
        lc,
        `Phase 2 (connect): ${n.label} lives on layer ${lc}, so we need a *pool* of candidates, not just one.`,
      )
      this.proc = 'insert'
      const chosen = this.selectNeighbors(
        n.id,
        W,
        p.M,
        lc,
        `Layer ${lc}: ${W.length} candidates found, at most M = ${p.M} become edges.`,
      )
      this.proc = 'insert'
      for (const c of chosen) link(this.graph, n.id, c, lc)
      this.mutated()
      this.emit(
        'i10',
        `Connect ${n.label} ↔ ${this.nms(chosen)} on layer ${lc}`,
        `The edges are bidirectional: ${n.label} can reach them and, just as importantly, searches arriving at them can reach ${n.label}. ` +
          `A node nobody links back to is invisible to every future search.`,
        'major',
        { newEdges: chosen.map((c) => [n.id, c] as [NodeId, NodeId]), accepted: chosen },
      )
      this.trim(chosen, lc, `${n.label} just added an edge to it.`)
      ep = W.map((w) => w.id)
      if (lc > 0) {
        this.emit(
          'i14',
          `Carry all ${ep.length} candidates down to layer ${lc - 1}`,
          `Unlike phase 1, the *whole* result list W becomes the entry point set for the next layer down. Starting the next beam search from many points at once is what keeps recall high near cluster boundaries.`,
        )
      }
    }

    if (level > L) {
      this.graph.entry = n.id
      this.graph.topLayer = level
      this.mutated()
      this.emit(
        'i15',
        `${n.label} becomes the new entry point (layer ${level} > ${L})`,
        `${n.label} rolled higher than anything before it, so the index grew a new top layer and ${n.label} is now where every search begins. ` +
          `It has no neighbours up there yet — that is fine, the next high-rolling insert will link to it.`,
      )
    }
    this.clearSearchVis()
    return n.id
  }

  // -------------------------------------------------- Algorithm 5: K-NN-SEARCH

  search(q: Vec, k: number): Cand[] {
    this.proc = 'knn-search'
    this.vis = emptyVis()
    this.vis.query = q
    this.vis.queryLabel = 'q'

    if (this.graph.entry === null) {
      this.emit('k2', 'The index is empty', 'There is nothing to search. Add some vectors first.')
      return []
    }
    const L = this.graph.topLayer
    let ep = [this.graph.entry]
    this.emit(
      'k2',
      `Start at the entry point ${this.nm(this.graph.entry)}, layer ${L}`,
      `Every search starts at the same place: the single entry point on the top layer. There is no index over the layers — the graph *is* the index.`,
    )

    for (let lc = L; lc > 0; lc--) {
      const W = this.searchLayer(q, ep, 1, lc, `Coarse pass on layer ${lc}: ef = 1, plain greedy.`)
      ep = [W[0].id]
      this.proc = 'knn-search'
      this.emit(
        'k4',
        `Layer ${lc} → best so far ${this.nm(ep[0])}`,
        `With ef = 1 this is a pure greedy walk: keep stepping to whichever neighbour is closer to q, stop when no neighbour improves. ` +
          `On a sparse layer that lands in the right *region* in a handful of hops. It is allowed to be wrong in detail — the layers below fix that.`,
      )
    }

    const ef = Math.max(this.params.efSearch, k)
    const W = this.searchLayer(
      q,
      ep,
      ef,
      0,
      `The real search: layer 0 holds every element, and ef = ${ef}.`,
    )
    this.proc = 'knn-search'
    const live = W.filter((c) => !node(this.graph, c.id).deleted)
    const skipped = W.length - live.length
    const out = live.slice(0, k)
    this.vis.results = out.map((c) => c.id)
    this.vis.dynamic = W.map((c) => c.id)
    this.emit(
      'k6',
      `Answer: ${this.nms(out.map((c) => c.id))}`,
      `The top ${out.length} of W by distance. ` +
        (skipped > 0
          ? `${skipped} tombstoned element${skipped === 1 ? ' was' : 's were'} filtered out of the result list — they were still walked through, they just cannot be returned. That is the hidden cost of soft deletes: they eat into ef. `
          : '') +
        `Total cost: ${this.distCalls} distance computations against ${this.bruteForceBaseline} for an exact scan.`,
    )
    return out
  }

  // ------------------------------------------------------------ modifications

  softDelete(id: NodeId): void {
    this.proc = 'delete'
    this.vis = emptyVis()
    const n = node(this.graph, id)
    n.deleted = true
    this.mutated()
    this.vis.focus = id
    this.emit(
      'd2',
      `Tombstone ${n.label}`,
      `${n.label} keeps every edge it had and searches still walk through it — only the result filter changes. This is what production libraries (hnswlib, FAISS-HNSW, Qdrant, Weaviate) do by default, because it is O(1) and cannot break the graph. ` +
        `The price: the node still costs distance computations, still occupies slots in W, and the wasted space is only reclaimed by a rebuild or compaction.` +
        (this.graph.entry === id
          ? ` Note that ${n.label} is the entry point — a deleted entry point is fine, it is only a router, but every search now begins at a node that can never be an answer.`
          : ''),
    )
  }

  restore(id: NodeId): void {
    this.proc = 'delete'
    this.vis = emptyVis()
    const n = node(this.graph, id)
    n.deleted = false
    this.mutated()
    this.vis.focus = id
    this.emit(
      'd3',
      `Un-tombstone ${n.label}`,
      `Because a soft delete never touched the graph, undoing it is just clearing the flag. Nothing has to be re-linked.`,
    )
  }

  hardDelete(id: NodeId): void {
    this.proc = 'delete'
    this.vis = emptyVis()
    const n = node(this.graph, id)
    const label = n.label
    this.vis.focus = id
    this.emit(
      'd4',
      `Hard-delete ${label} (level ${n.level})`,
      `Actually removing a node is the hard case, and the paper does not cover it. Every edge into ${label} has to go, and each of its neighbours may be left with a hole — or, worse, cut off from the rest of the graph. So each affected neighbour gets repaired.`,
    )

    for (let lc = n.level; lc >= 0; lc--) {
      this.vis.layer = lc
      const affected = neighborsAt(this.graph, id, lc).slice()
      this.emit(
        'd6',
        `Layer ${lc}: ${affected.length} neighbour${affected.length === 1 ? '' : 's'} lose an edge`,
        `${this.nms(affected)} were connected to ${label} here. Removing the edges is the easy half.`,
        'major',
        { removedEdges: affected.map((a) => [id, a] as [NodeId, NodeId]), accepted: affected },
      )
      for (const a of affected) unlink(this.graph, id, a, lc)
      this.mutated()

      for (const e of affected) {
        const cap = degreeCap(this.params, lc)
        const pool = uniq([...neighborsAt(this.graph, e, lc), ...affected]).filter(
          (x) => x !== e && x !== id && this.graph.nodes.has(x),
        )
        const base = node(this.graph, e).vec
        const cands = pool.map((x) => ({ id: x, dist: this.d(base, node(this.graph, x).vec) }))
        const before = neighborsAt(this.graph, e, lc).slice()
        const keep = this.selectNeighbors(
          e,
          cands,
          cap,
          lc,
          `Repairing ${this.nm(e)}: candidates are its surviving neighbours plus the other nodes orphaned by ${label}.`,
        )
        this.proc = 'delete'
        const removed = before.filter((x) => !keep.includes(x))
        const added = keep.filter((x) => !before.includes(x))
        for (const x of removed) unlink(this.graph, e, x, lc)
        for (const x of keep) link(this.graph, e, x, lc)
        this.mutated()
        this.emit(
          'd9',
          `Repair ${this.nm(e)}: +${added.length} / −${removed.length} edge${added.length === 1 ? '' : 's'}`,
          `${label}'s other neighbours are the best guess at "who else is nearby", so they are offered to ${this.nm(e)} as replacements — this is how the orphans get stitched to each other. ` +
            `It is a heuristic: the true nearest neighbours of ${this.nm(e)} might be somewhere the deleted node was the only bridge to. Repeated hard deletes therefore slowly degrade recall, which is exactly why real systems prefer tombstones plus a periodic rebuild.`,
          'major',
          {
            focus: e,
            newEdges: added.map((x) => [e, x] as [NodeId, NodeId]),
            removedEdges: removed.map((x) => [e, x] as [NodeId, NodeId]),
          },
        )
        this.trim(added, lc, `The repair of ${this.nm(e)} gave it a new edge.`, {
          over: 'd9',
          done: 'd9',
        })
        this.proc = 'delete'
      }
    }

    this.graph.nodes.delete(id)
    this.mutated()
    this.vis.focus = undefined
    this.vis.layer = null
    this.emit('d10', `${label} removed from the graph`, `The memory is reclaimed; no tombstone is left behind.`)

    if (this.graph.entry === id) {
      const next = highestNode(this.graph)
      this.graph.entry = next ? next.id : null
      this.graph.topLayer = next ? next.level : 0
      this.mutated()
      this.emit(
        'd11',
        next ? `New entry point: ${this.nm(next.id)} (layer ${next.level})` : `The index is now empty`,
        next
          ? `${label} was the entry point, so a replacement is needed — the highest-level surviving node. The top layer of the index drops to ${next.level}. ` +
              `If that node happens to sit in a corner of the space, every future search starts with a long walk. Entry-point choice is a real operational concern.`
          : `The last element is gone, so there is no entry point.`,
        'major',
        { focus: next?.id },
      )
    }
  }

  updateInPlace(id: NodeId, vec: Vec): void {
    this.proc = 'update'
    this.vis = emptyVis()
    const n = node(this.graph, id)
    const old = n.vec
    n.vec = vec
    this.mutated()
    this.vis.focus = id
    this.vis.query = vec
    this.vis.queryLabel = n.label
    this.emit(
      'u4',
      `Move ${n.label} by ${f(distance(old, vec, this.params.metric))}`,
      `The vector is overwritten in place. Its edges are now stale: they describe where ${n.label} *used to be*. The cheap fix is to re-select its neighbours from its own local neighbourhood — no full search, no re-roll of its level.`,
    )

    for (let lc = n.level; lc >= 0; lc--) {
      this.vis.layer = lc
      const oneHop = neighborsAt(this.graph, id, lc).slice()
      const twoHop = uniq(oneHop.flatMap((x) => neighborsAt(this.graph, x, lc)))
      const pool = uniq([...oneHop, ...twoHop]).filter((x) => x !== id)
      const cands = pool.map((x) => ({ id: x, dist: this.d(vec, node(this.graph, x).vec) }))
      this.emit(
        'u6',
        `Layer ${lc}: ${pool.length} candidates from the 2-hop neighbourhood`,
        `Only nodes within two hops of the old position are considered (${this.nms(pool)}). ` +
          `That is the whole gamble of an in-place update: if the vector moved far, its true new neighbours are nowhere in this pool and the node ends up badly connected — invisible to searches that should find it. Small nudges are safe; large moves are not.`,
        'major',
        { accepted: pool },
      )
      const keep = this.selectNeighbors(id, cands, this.params.M, lc, `Re-selecting ${n.label}'s edges.`)
      this.proc = 'update'
      const removed = oneHop.filter((x) => !keep.includes(x))
      const added = keep.filter((x) => !oneHop.includes(x))
      for (const x of removed) unlink(this.graph, id, x, lc)
      for (const x of keep) link(this.graph, id, x, lc)
      this.mutated()
      this.emit(
        'u7',
        `Re-linked ${n.label} on layer ${lc}: +${added.length} / −${removed.length}`,
        `Reverse edges are updated too, so any neighbour that went over its cap gets trimmed next.`,
        'major',
        {
          newEdges: added.map((x) => [id, x] as [NodeId, NodeId]),
          removedEdges: removed.map((x) => [id, x] as [NodeId, NodeId]),
        },
      )
      this.trim(keep, lc, `${n.label} moved and re-linked to it.`, { over: 'u7', done: 'u7' })
      this.proc = 'update'
    }
    this.clearSearchVis()
  }
}

// --------------------------------------------------------------- public API

export interface RunResult {
  graph: Graph
  trace: Trace
}

export const DEFAULT_PARAMS: Params = {
  M: 5,
  Mmax: 5,
  Mmax0: 10,
  efConstruction: 12,
  efSearch: 8,
  mL: 1 / Math.log(5),
  metric: 'euclidean',
  neighborRule: 'heuristic',
  extendCandidates: false,
  keepPrunedConnections: true,
  seed: 42,
}

export function bruteForce(graph: Graph, q: Vec, k: number, params: Params): Cand[] {
  const out: Cand[] = []
  for (const n of graph.nodes.values()) {
    if (n.deleted) continue
    out.push({ id: n.id, dist: distance(q, n.vec, params.metric) })
  }
  return out.sort(byDistAsc).slice(0, k)
}

export function runInsert(
  graph: Graph,
  params: Params,
  vec: Vec,
  opts: { label?: string; level?: number; id?: NodeId; record?: boolean } = {},
): RunResult {
  const run = new Run(graph, params, 'insert', opts.record ?? true)
  const id = run.insert(vec, opts.label, opts.level, opts.id)
  const label = run.graph.nodes.get(id)?.label ?? String(id)
  return { graph: run.graph, trace: run.trace('insert', `Insert ${label}`, [], []) }
}

export function runSearch(
  graph: Graph,
  params: Params,
  q: Vec,
  k: number,
  record = true,
): RunResult {
  const run = new Run(graph, params, 'search', record)
  const results = run.search(q, k)
  const exact = bruteForce(graph, q, k, params)
  return { graph: run.graph, trace: run.trace('search', `Search k = ${k}`, results, exact) }
}

export function runSoftDelete(graph: Graph, params: Params, id: NodeId): RunResult {
  const run = new Run(graph, params, 'soft-delete', true)
  const label = run.graph.nodes.get(id)?.label ?? String(id)
  run.softDelete(id)
  return { graph: run.graph, trace: run.trace('soft-delete', `Tombstone ${label}`, [], []) }
}

export function runRestore(graph: Graph, params: Params, id: NodeId): RunResult {
  const run = new Run(graph, params, 'restore', true)
  const label = run.graph.nodes.get(id)?.label ?? String(id)
  run.restore(id)
  return { graph: run.graph, trace: run.trace('restore', `Restore ${label}`, [], []) }
}

export function runHardDelete(graph: Graph, params: Params, id: NodeId): RunResult {
  const run = new Run(graph, params, 'hard-delete', true)
  const label = run.graph.nodes.get(id)?.label ?? String(id)
  run.hardDelete(id)
  return { graph: run.graph, trace: run.trace('hard-delete', `Hard-delete ${label}`, [], []) }
}

export function runUpdate(
  graph: Graph,
  params: Params,
  id: NodeId,
  vec: Vec,
  mode: 'reinsert' | 'in-place',
): RunResult {
  const src = graph.nodes.get(id)
  const label = src?.label ?? String(id)
  if (mode === 'in-place') {
    const run = new Run(graph, params, 'update-in-place', true)
    run.updateInPlace(id, vec)
    return {
      graph: run.graph,
      trace: run.trace('update-in-place', `Update ${label} in place`, [], []),
    }
  }
  const run = new Run(graph, params, 'update-reinsert', true)
  run.hardDelete(id)
  run.insert(vec, label, undefined, id)
  return {
    graph: run.graph,
    trace: run.trace('update-reinsert', `Update ${label} by delete + re-insert`, [], []),
  }
}

/** Bulk build with recording off — used for presets, benchmarks and tests. */
export function buildIndex(graph: Graph, params: Params, vecs: Vec[], labels?: string[]): Graph {
  let g = graph
  vecs.forEach((v, i) => {
    g = runInsert(g, params, v, { label: labels?.[i], record: false }).graph
  })
  return g
}
