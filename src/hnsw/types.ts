/** Core HNSW data model. Deliberately framework-free so it can be unit-tested. */

export type Vec = readonly number[]
export type NodeId = number

export type Metric = 'euclidean' | 'manhattan' | 'cosine'
export type NeighborRule = 'heuristic' | 'simple'

export interface HNode {
  id: NodeId
  vec: Vec
  label: string
  /** Top layer this node lives on. It exists on every layer 0..level. */
  level: number
  /** neighbors[lc] = out-edges on layer lc. Kept symmetric by construction. */
  neighbors: NodeId[][]
  /** Tombstone: still routable, never returned as a result. */
  deleted: boolean
  /** Insertion order, used for stable labels and colouring. */
  seq: number
}

export interface Graph {
  nodes: Map<NodeId, HNode>
  /** The single fixed entry point for every search. */
  entry: NodeId | null
  /** Level of the entry point == highest populated layer. */
  topLayer: number
  nextId: NodeId
  nextSeq: number
}

export interface Params {
  /** Target out-degree used when selecting neighbors for a new node. */
  M: number
  /** Degree cap on layers > 0. */
  Mmax: number
  /** Degree cap on layer 0 (conventionally 2*M). */
  Mmax0: number
  /** Size of the candidate beam while building. */
  efConstruction: number
  /** Size of the candidate beam while searching. */
  efSearch: number
  /** Level-decay constant. 1/ln(M) is the paper's optimum. */
  mL: number
  metric: Metric
  neighborRule: NeighborRule
  extendCandidates: boolean
  keepPrunedConnections: boolean
  /** Seed for the level-assignment RNG, so runs are reproducible. */
  seed: number
}

export interface Cand {
  id: NodeId
  dist: number
}

export type OpKind =
  | 'insert'
  | 'search'
  | 'soft-delete'
  | 'hard-delete'
  | 'restore'
  | 'update-reinsert'
  | 'update-in-place'

export type Proc =
  | 'insert'
  | 'search-layer'
  | 'select-neighbors'
  | 'knn-search'
  | 'delete'
  | 'update'

/** Everything the canvas needs to draw one frozen moment of the algorithm. */
export interface StepVis {
  /** The point being inserted / searched for. */
  query?: Vec
  queryLabel?: string
  /** Layer the action happens on (null = layer-agnostic bookkeeping). */
  layer: number | null
  /** Node currently being expanded. */
  current?: NodeId
  /** Node currently being weighed up. */
  considering?: NodeId
  /** Entry point(s) for the current layer. */
  entryPoints: NodeId[]
  visited: NodeId[]
  /** C — candidate queue. */
  candidates: NodeId[]
  /** W — the running result set / dynamic nearest list. */
  dynamic: NodeId[]
  /** Capacity and metric captured for this SEARCH-LAYER invocation. */
  searchEf?: number
  searchMetric?: Metric
  /** Final answer of the whole operation, once known. */
  results: NodeId[]
  /** Neighbors accepted by SELECT-NEIGHBORS. */
  accepted: NodeId[]
  /** Candidates pruned by the heuristic. */
  rejected: NodeId[]
  /** The already-kept neighbor that caused a prune (draws the "why"). */
  blocker?: NodeId
  newEdges: Array<[NodeId, NodeId]>
  removedEdges: Array<[NodeId, NodeId]>
  /** Node the step is about (level assignment, deletion, …). */
  focus?: NodeId
}

export interface Step {
  index: number
  op: OpKind
  proc: Proc
  /** Pseudocode line key to highlight, e.g. 's6'. */
  line: string
  /** Short imperative headline. */
  title: string
  /** Plain-English "why", shown under the canvas. */
  detail: string
  /** 'minor' steps can be skipped in coarse playback. */
  weight: 'major' | 'minor'
  /** Distance computations charged so far in this operation. */
  distCalls: number
  /** Immutable graph as it looked at this instant. */
  graph: Graph
  vis: StepVis
}

export interface OpStats {
  /** Distance computations — the currency of ANN search. */
  distCalls: number
  /** Nodes popped off the candidate queue (graph hops). */
  hops: number
  /** Distinct nodes whose distance was computed. */
  visited: number
  layersTouched: number
  /** distCalls a brute-force scan would have needed. */
  bruteForceDistCalls: number
}

export interface Trace {
  op: OpKind
  title: string
  steps: Step[]
  /** Result ids for a search, in rank order. */
  results: Cand[]
  /** Ground truth from an exact scan, for recall. */
  exact: Cand[]
  stats: OpStats
}
