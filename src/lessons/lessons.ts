import type { ScriptOp } from '../state/store'

export type Block =
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'note'; text: string; tone?: 'accent' | 'warn' | 'plain' }
  | { t: 'math'; text: string }
  | { t: 'try'; text: string; ops: ScriptOp[] }
  | { t: 'kv'; pairs: Array<[string, string]> }

export interface LessonStep {
  title: string
  /** Applied when the reader arrives on this step, so the canvas always matches the words. */
  ops?: ScriptOp[]
  blocks: Block[]
}

export interface Lesson {
  title: string
  summary: string
  steps: LessonStep[]
}

// Handy positions in the 1000×640 canvas for the clustered preset.
const MIDDLE: [number, number] = [500, 320]
const IN_CLUSTER: [number, number] = [232, 172]
const EDGE_OF_CLUSTER: [number, number] = [360, 250]
const FAR_CORNER: [number, number] = [905, 575]

const clusters = (n: number): ScriptOp => ({ t: 'preset', id: 'clusters', n, seed: 7 })

/** Lessons that describe a specific picture pin the parameters that produce it,
 *  so arriving from the Params tab with M = 24 cannot contradict the words. */
const TEACHING_PARAMS: ScriptOp = {
  t: 'params',
  patch: {
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
  },
}

export const LESSONS: Lesson[] = [
  {
    title: 'The problem HNSW solves',
    summary: 'k-nearest-neighbour search, why exact is too slow, and what "approximate" costs you.',
    steps: [
      {
        title: 'Finding the nearest vector',
        ops: [
          TEACHING_PARAMS,
          clusters(48),
          { t: 'tool', tool: 'search' },
          { t: 'view', mode: 'stack' },
          { t: 'k', k: 5 },
        ],
        blocks: [
          {
            t: 'p',
            text: 'Everything on this canvas is a **vector**. Here each one has two dimensions so you can see it as a dot, but the algorithm is identical for the 768- or 1536-dimensional embeddings a real system stores. The only operation it needs is a **distance** between two vectors.',
          },
          {
            t: 'p',
            text: 'The task is **k-nearest-neighbour search**: given a query vector `q`, return the `k` stored vectors closest to it. That is what powers semantic search, recommendations, deduplication, and retrieval for language models.',
          },
          {
            t: 'p',
            text: 'The obvious algorithm is to compare `q` against every stored vector and keep the best `k`. It is exactly right, trivially parallel, and completely impractical: cost grows linearly with the number of vectors, and each comparison touches every dimension.',
          },
          { t: 'math', text: 'exact scan  =  O(N · d)  distance computations per query' },
          {
            t: 'try',
            text: 'Click anywhere on the canvas to search. Then open the **Metrics** tab: it reports what the search actually cost versus what an exact scan would have cost.',
            ops: [{ t: 'search', at: MIDDLE }, { t: 'tab', tab: 'metrics' }],
          },
          {
            t: 'note',
            tone: 'accent',
            text: 'With 48 vectors an exact scan is 48 comparisons — nothing. At 100 million vectors it is 100 million comparisons per query, and that is the whole reason this algorithm exists.',
          },
        ],
      },
      {
        title: 'The trade: recall for speed',
        blocks: [
          {
            t: 'p',
            text: 'Nobody has found a way to make exact nearest-neighbour search sublinear in high dimensions — that is the **curse of dimensionality**, and it defeats every tree-based index (kd-trees, ball trees) once you pass roughly 20 dimensions. So practical systems give up exactness.',
          },
          {
            t: 'p',
            text: 'An **approximate** nearest neighbour index returns *probably* the right answers. The quality measure is **recall@k**: of the `k` true nearest neighbours, what fraction did you actually return?',
          },
          { t: 'math', text: 'recall@k  =  |returned ∩ true top-k|  /  k' },
          {
            t: 'p',
            text: 'HNSW is the graph-based answer, and it is the default in essentially every vector database — Qdrant, Weaviate, Milvus, Vespa, Elasticsearch, pgvector, Redis, Lucene — as well as in FAISS and the reference library hnswlib. Typical operating points reach 95–99% recall while touching a few hundred vectors out of millions.',
          },
          {
            t: 'p',
            text: 'The idea in one sentence: **build a graph where nearby vectors are linked, then walk it greedily downhill towards the query.** Everything else is detail about which edges to keep.',
          },
        ],
      },
    ],
  },

  {
    title: 'Greedy search, and where it fails',
    summary: 'Walk a proximity graph downhill. Then watch it get stuck, twice.',
    steps: [
      {
        title: 'Walking downhill',
        ops: [
          clusters(60),
          { t: 'params', patch: { efSearch: 1, M: 4, Mmax: 4, Mmax0: 8, neighborRule: 'simple' } },
          { t: 'view', mode: 'layer', layer: 0 },
          { t: 'tool', tool: 'search' },
          { t: 'k', k: 1 },
        ],
        blocks: [
          {
            t: 'p',
            text: 'Forget layers for a moment. Here is a single graph where each node links to its nearest few neighbours, and the search is the simplest thing imaginable: from wherever you are, step to the neighbour closest to `q`; if no neighbour is closer than you are, stop.',
          },
          {
            t: 'p',
            text: 'ef is pinned to 1, so this is a pure greedy walk — exactly `SEARCH-LAYER` with a beam of one. Watch the orange node move.',
          },
          {
            t: 'try',
            text: 'Search from the middle of the canvas, then step through it.',
            ops: [{ t: 'search', at: MIDDLE }, { t: 'seek', to: 'start' }],
          },
          {
            t: 'note',
            text: 'The stopping rule is the interesting part. The walk halts when the nearest unexpanded candidate is further away than the worst result already found — at that moment no remaining candidate can possibly improve the answer, so continuing is provably pointless.',
          },
        ],
      },
      {
        title: 'Failure one: the local minimum',
        blocks: [
          {
            t: 'p',
            text: 'Greedy walks get **trapped**. If every neighbour of the current node is further from `q` than the current node is, the walk stops — even when a much better vector sits just across a gap the graph has no edge across.',
          },
          {
            t: 'try',
            text: 'Query the far corner, where the graph is sparse and the clusters are elsewhere. Compare what came back with the true answer in the Metrics tab.',
            ops: [{ t: 'search', at: FAR_CORNER }, { t: 'tab', tab: 'metrics' }],
          },
          {
            t: 'p',
            text: 'There are two independent fixes, and HNSW uses both.',
          },
          {
            t: 'ul',
            items: [
              '**Widen the beam.** Keep the best `ef` candidates instead of one, so the search can carry on through a locally-worse node and still remember the good ones. That is what `ef` does.',
              '**Add long edges.** A graph with only short links is a lattice: getting anywhere takes a number of hops proportional to distance. Add a few long-range links and the number of hops collapses to roughly log N — a **navigable small world**. In HNSW those long edges are not special-cased at all: they are simply the edges of the sparse upper layers, where the nearest neighbour is already far away.',
            ],
          },
          {
            t: 'try',
            text: 'Same query, beam of 16 instead of 1. Usually the answer becomes exact — for maybe three times the distance computations.',
            ops: [{ t: 'params', patch: { efSearch: 16 } }, { t: 'search', at: FAR_CORNER }],
          },
        ],
      },
      {
        title: 'Failure two: hops cost time',
        blocks: [
          {
            t: 'p',
            text: 'A wide beam alone is not enough. On a graph of only short edges, reaching the right region takes many hops no matter how wide the beam, and every hop costs distance computations against every neighbour of the node you expand.',
          },
          {
            t: 'p',
            text: 'The predecessor of HNSW — Navigable Small World — solved this by mixing short and long edges in one flat graph. It worked, but it had an awkward property: on a flat graph, the long edges are wasted effort once you are close, and you cannot tell the search to stop using them.',
          },
          {
            t: 'p',
            text: '**HNSW\'s contribution is to separate the two scales into layers**, so the search uses long edges first and short edges last, and never mixes them. That is the next lesson.',
          },
        ],
      },
    ],
  },

  {
    title: 'Layers: a skip list for vectors',
    summary: 'Where the H in HNSW comes from, and why the level is a coin flip.',
    steps: [
      {
        title: 'The skip-list idea',
        ops: [
          TEACHING_PARAMS,
          clusters(60),
          { t: 'view', mode: 'stack' },
          { t: 'tool', tool: 'insert' },
        ],
        blocks: [
          {
            t: 'p',
            text: 'A skip list makes a sorted linked list searchable in log time by stacking sparser and sparser express lanes above it. You travel far on a high lane, drop down when you overshoot, and finish on the bottom lane, which contains everything.',
          },
          {
            t: 'p',
            text: 'HNSW is that idea for proximity graphs. **Layer 0 contains every vector.** Each layer above holds a random sample of the layer below, so its edges span much greater distances. A search starts at the top and drops down one layer at a time.',
          },
          {
            t: 'p',
            text: 'Look at the stacked view: the dashed vertical lines are the *same vector* appearing on several layers. A node on layer 2 also exists on layers 1 and 0, with different neighbours on each.',
          },
          {
            t: 'note',
            tone: 'accent',
            text: 'There is exactly one **entry point** — the highest node in the index, ringed in yellow. Every search and every insert begins there.',
          },
        ],
      },
      {
        title: 'The level is a coin flip',
        blocks: [
          {
            t: 'p',
            text: 'How high does a new vector reach? Not by any property of the data — by a random draw:',
          },
          { t: 'math', text: 'l = ⌊ −ln(U(0,1)) · mL ⌋        P(level ≥ l) = e^(−l / mL)' },
          {
            t: 'p',
            text: 'This is a geometric distribution. With `mL = 1/ln(M)`, each layer up is 1/M the size of the one below, so the layer count grows like `log_M(N)` and the top layers stay tiny.',
          },
          {
            t: 'try',
            text: 'Insert a few vectors and watch the rolled level in the explainer under the canvas. Most will be level 0; occasionally one jumps two layers and takes over as entry point.',
            ops: [
              { t: 'insert', at: IN_CLUSTER },
              { t: 'insert', at: EDGE_OF_CLUSTER },
              { t: 'insert', at: MIDDLE },
            ],
          },
          {
            t: 'p',
            text: 'Randomness here is not laziness — it is what keeps insertion cheap and lock-free-ish, and it makes the layer structure independent of insertion order. The **Metrics** tab plots the level histogram against the expected ratio.',
          },
          {
            t: 'note',
            tone: 'warn',
            text: 'Turn `mL` up in the Params tab and the index grows extra, nearly-empty layers: every search then pays for hops through layers that contain almost nothing. Turn it down to 0 and you are back to a single flat graph.',
          },
        ],
      },
    ],
  },

  {
    title: 'Insertion, line by line',
    summary: 'Two phases: travel with a beam of one, then connect with a beam of efConstruction.',
    steps: [
      {
        title: 'Phase 1 — zoom in',
        ops: [
          clusters(48),
          { t: 'params', patch: { efSearch: 8, efConstruction: 12, neighborRule: 'heuristic' } },
          { t: 'view', mode: 'stack' },
          { t: 'tab', tab: 'code' },
          { t: 'insert', at: EDGE_OF_CLUSTER },
          { t: 'seek', to: 'start' },
        ],
        blocks: [
          {
            t: 'p',
            text: 'An insert is a search that stops to make friends. First it rolls a level `l`. Then, on every layer **above** `l`, it does a plain greedy walk with `ef = 1` and creates no edges at all — the new node does not exist up there, so the only thing produced is a better starting point for the layer below.',
          },
          {
            t: 'try',
            text: 'Step forward through the trace and watch the **Code** tab: the highlighted line walks down `INSERT` and into `SEARCH-LAYER`.',
            ops: [{ t: 'seek', to: 'start' }],
          },
          {
            t: 'note',
            text: 'This is why insertion is cheap even in a huge index: the expensive wide search only happens on the handful of layers the node actually joins.',
          },
        ],
      },
      {
        title: 'Phase 2 — connect',
        blocks: [
          {
            t: 'p',
            text: 'From layer `min(L, l)` down to 0, the search widens to `ef = efConstruction`. Each layer produces a pool of candidates; `SELECT-NEIGHBORS` picks at most `M` of them, and the edges are made **bidirectional** — the new node can reach them, and searches arriving at them can reach the new node.',
          },
          {
            t: 'note',
            tone: 'warn',
            text: 'A one-directional edge would make the node invisible: searches would never arrive at it. Symmetry is not an implementation detail, it is a correctness requirement.',
          },
          {
            t: 'p',
            text: 'And unlike phase 1, the **whole** result list is handed down as the entry point set for the next layer, not just the best one. Starting the next beam search from several points at once is what keeps recall high near cluster boundaries.',
          },
          {
            t: 'try',
            text: 'Insert into the empty middle of the canvas — a node with candidates in several directions shows the selection step at its most interesting.',
            ops: [{ t: 'insert', at: MIDDLE }, { t: 'seek', to: 'start' }],
          },
        ],
      },
      {
        title: 'The part nobody expects: trimming',
        blocks: [
          {
            t: 'p',
            text: 'Because edges are bidirectional, an existing node gains an edge every time a newcomer picks it. Left alone, popular nodes would collect thousands of edges — so when a node exceeds its cap (`Mmax`, or `Mmax0` on layer 0) its neighbourhood is **re-selected from scratch** over all of its current edges.',
          },
          {
            t: 'p',
            text: 'Two consequences worth internalising:',
          },
          {
            t: 'ul',
            items: [
              'Inserting a node can make an **existing** node\'s neighbourhood worse. Its weakest edge gets dropped, and that edge might have been somebody\'s only bridge.',
              '**Insertion order changes the final graph.** Two indexes over identical data are not identical. This is normal and mostly harmless, but it means recall is a distribution, not a number.',
            ],
          },
          {
            t: 'try',
            text: 'Set a tight cap (M = 3) and insert repeatedly into one cluster. Red dashed lines are edges being dropped from nodes that went over budget.',
            ops: [
              { t: 'params', patch: { M: 3, Mmax: 3, Mmax0: 4 } },
              { t: 'insert', at: IN_CLUSTER },
              { t: 'insert', at: [244, 180] },
              { t: 'insert', at: [222, 186] },
            ],
          },
        ],
      },
    ],
  },

  {
    title: 'Choosing neighbours: the pruning heuristic',
    summary: 'Algorithm 4 — the single idea that makes HNSW work on clustered data.',
    steps: [
      {
        title: 'The naive rule, and what it costs',
        ops: [
          clusters(70),
          { t: 'params', patch: { neighborRule: 'simple', M: 5, Mmax: 5, Mmax0: 10 } },
          { t: 'view', mode: 'layer', layer: 0 },
          { t: 'tool', tool: 'insert' },
        ],
        blocks: [
          {
            t: 'p',
            text: 'The obvious way to pick `M` edges from a pool of candidates is to take the `M` nearest. That is `SELECT-NEIGHBORS-SIMPLE`, and it has a pathology: on clustered data, all `M` nearest neighbours of a node sit in the same dense blob, usually in the same *direction*.',
          },
          {
            t: 'p',
            text: 'The result is a graph made of tight cliques. Worse than being slow, it can leave whole regions **sealed off**. Reachability runs down the hierarchy: you enter the top layer at the entry point, walk that layer, and whatever you reach becomes the possible entry points for the layer below. A piece of layer 0 that nothing in that chain lands on cannot be entered by any search, at any ef, ever. Those vectors are in the index and unretrievable.',
          },
          {
            t: 'try',
            text: 'Look at the `parts` column in the Metrics tab — the number of disconnected pieces per layer, and a warning if any piece has no way in from above.',
            ops: [{ t: 'tab', tab: 'metrics' }],
          },
          {
            t: 'try',
            text: 'Insert a node between two clusters with the simple rule and look at where its edges go — all into one blob.',
            ops: [{ t: 'insert', at: [500, 200] }, { t: 'seek', to: 'end' }],
          },
        ],
      },
      {
        title: 'The heuristic: keep a candidate only if nothing already kept covers it',
        ops: [{ t: 'params', patch: { neighborRule: 'heuristic' } }],
        blocks: [
          {
            t: 'p',
            text: 'Algorithm 4 walks the candidates nearest-first and applies one test:',
          },
          {
            t: 'math',
            text: 'keep e  ⟺  dist(e, q) < dist(e, r)  for every r already kept',
          },
          {
            t: 'p',
            text: 'In words: **keep `e` only if `e` is closer to me than to any neighbour I already have.** If some existing neighbour `r` is closer to `e` than I am, then a search can reach `e` through `r` in one extra hop — the direct edge would be redundant, so spend the budget on an unexplored direction instead.',
          },
          {
            t: 'try',
            text: 'Same insertion, heuristic rule. Step through the selection: pruned candidates get a red ✕ line drawn to the neighbour that made them redundant.',
            ops: [{ t: 'insert', at: [500, 200] }, { t: 'seek', to: 'start' }],
          },
          {
            t: 'p',
            text: "The edges now fan out in different directions instead of piling into the nearest blob. That is a relative-neighbourhood-graph-like structure emerging without anyone computing one.",
          },
          {
            t: 'note',
            tone: 'accent',
            text: 'What the heuristic actually buys, measured on 250 clustered points at M = 3 — the two buttons below set up exactly this, so you can check every number on screen (they assume the default level seed — the seed slider reshuffles which nodes get lifted, and so the exact counts). **Simple rule:** layer 0 splits into 6 pieces and a search can enter only **1** of them; **118 of the 250 vectors are unretrievable at any ef**, and recall@10 is 40%. **Heuristic, same data, same M:** 3 pieces, **all** enterable, nothing stranded, recall@10 94%.',
          },
          {
            t: 'try',
            text: 'Set up the measurement: 250 clustered points, M = 3, **simple** rule. Watch the `parts` column and the warning in Metrics.',
            ops: [
              { t: 'params', patch: { M: 3, Mmax: 3, Mmax0: 6, neighborRule: 'simple' } },
              { t: 'preset', id: 'clusters', n: 250, seed: 9 },
              { t: 'view', mode: 'layer', layer: 0 },
              { t: 'tab', tab: 'metrics' },
            ],
          },
          {
            t: 'try',
            text: 'Now flip to the **heuristic** — same points, same M, same everything else.',
            ops: [
              { t: 'params', patch: { neighborRule: 'heuristic' } },
              { t: 'tab', tab: 'metrics' },
            ],
          },
          {
            t: 'p',
            text: 'Note what the mechanism is *not*. It is tempting to say the heuristic manufactures long cluster-to-cluster edges — it does not, and on this dataset it makes slightly **fewer** of them than the simple rule. HNSW\'s long-range links come from the **upper layers**, which are sparse by construction and so span large distances for free. The heuristic\'s job is different and less glamorous: keep each local neighbourhood pointed in several directions, so no region gets sealed off from the layer above it.',
          },
          {
            t: 'try',
            text: 'Measure it: the Lab tab builds one index per rule over these same vectors and scores recall on both.',
            ops: [{ t: 'tab', tab: 'lab' }],
          },
        ],
      },
      {
        title: 'The two switches on the heuristic',
        blocks: [
          {
            t: 'kv',
            pairs: [
              [
                'keepPrunedConnections',
                'If the diversity test rejects so much that fewer than M slots get filled, top up with the closest rejects. An under-connected node is a dead end for every future search, so this is on by default.',
              ],
              [
                'extendCandidates',
                'Add the neighbours-of-candidates to the pool before selecting. Costs distance computations on every insert and helps only on extremely clustered data. Off by default, in this app and in hnswlib.',
              ],
            ],
          },
          {
            t: 'try',
            text: 'Turn keepPrunedConnections off, rebuild, and check the layer-0 degree histogram in Metrics: a spike at low degrees appears.',
            ops: [
              { t: 'params', patch: { keepPrunedConnections: false } },
              { t: 'tab', tab: 'metrics' },
            ],
          },
          {
            t: 'note',
            text: 'Restore it before moving on — the rest of the lessons assume the defaults.',
          },
          {
            t: 'try',
            text: 'Restore defaults.',
            ops: [{ t: 'params', patch: { keepPrunedConnections: true } }],
          },
        ],
      },
    ],
  },

  {
    title: 'Search: ef is the whole dial',
    summary: 'One parameter you can change per query, and what it buys.',
    steps: [
      {
        title: 'Coarse to fine',
        ops: [
          clusters(80),
          { t: 'params', patch: { efSearch: 8, M: 5, Mmax: 5, Mmax0: 10, neighborRule: 'heuristic' } },
          { t: 'view', mode: 'stack' },
          { t: 'tool', tool: 'search' },
          { t: 'k', k: 5 },
          { t: 'search', at: [700, 480] },
          { t: 'seek', to: 'start' },
        ],
        blocks: [
          {
            t: 'p',
            text: 'A query runs `SEARCH-LAYER` once per layer. On every layer above 0 it uses `ef = 1`: a plain greedy walk, allowed to be wrong in detail, whose only job is to land in the right region cheaply.',
          },
          {
            t: 'p',
            text: 'On layer 0 — which contains everything — it uses `ef = efSearch`, keeping the best `ef` candidates found so far and expanding them nearest-first until the early-exit condition fires.',
          },
          {
            t: 'p',
            text: 'The violet dashed circle is the beam boundary: the distance to the *worst* of the current `ef` best. Anything outside it is rejected on sight and never expanded. As the search improves, the circle shrinks — that shrinking is the algorithm converging.',
          },
          {
            t: 'note',
            tone: 'accent',
            text: '`k` and `ef` are different things. `k` is how many results you want; `ef` is how many the search keeps in flight. `ef` must be at least `k`, and is usually much larger.',
          },
        ],
      },
      {
        title: 'The recall/cost curve',
        ops: [{ t: 'tab', tab: 'lab' }],
        blocks: [
          {
            t: 'p',
            text: '`efSearch` is the only parameter you can change **per query, at runtime, without touching the index**. Everything else is baked in at build time. So this is the dial an operator actually turns.',
          },
          {
            t: 'try',
            text: 'Run the ef sweep in the Lab tab: same graph, same 24 queries, ef from 1 to 128.',
            ops: [{ t: 'tab', tab: 'lab' }],
          },
          {
            t: 'p',
            text: 'The shape is always the same: recall climbs steeply, then saturates; cost keeps climbing linearly. You want to sit just past the knee. Doubling ef past that point buys fractions of a percent for double the latency.',
          },
          {
            t: 'p',
            text: 'Two useful facts about that curve in a real system: it moves with the dataset (clustered data needs more ef), and the cost axis is roughly proportional to your query latency, because distance computations dominate everything else.',
          },
          {
            t: 'note',
            tone: 'warn',
            text: 'Honest caveat about this canvas: **two dimensions flatter HNSW**. A greedy walk in 2-D nearly always finds the true nearest neighbour — there are too few directions for a better answer to hide in — so recall here starts around 90-100% even at ef = 1 and the curve looks almost flat. In 768 dimensions distances concentrate, a greedy walk goes wrong constantly, and ef is what rescues recall. Everything else on this canvas generalises; the *steepness of this particular curve* does not. To see it move here, make the graph worse: M = 2, or the two-moons and spiral shapes.',
          },
        ],
      },
    ],
  },

  {
    title: 'Deleting: tombstones and repair',
    summary: 'The paper does not cover deletion. Here is what implementations do, and what it costs.',
    steps: [
      {
        title: 'Soft delete — flag it and move on',
        ops: [
          TEACHING_PARAMS,
          clusters(60),
          { t: 'view', mode: 'layer', layer: 0 },
          { t: 'tool', tool: 'select' },
          { t: 'deleteNearest', at: IN_CLUSTER, mode: 'soft' },
        ],
        blocks: [
          {
            t: 'p',
            text: 'The default in every production HNSW implementation is not to delete anything. The node is marked deleted, keeps all of its edges, and is filtered out of result lists. Searches still walk **through** it.',
          },
          {
            t: 'p',
            text: 'That sounds like a hack, and it is the right call: it is O(1), it cannot corrupt the graph, and it preserves the routing structure the deleted node was part of.',
          },
          {
            t: 'ul',
            items: [
              'Cost: the vector still occupies memory and still costs a distance computation when walked through.',
              'Cost: tombstones **consume slots in the ef beam**. Delete 30% of your data and an `ef` of 100 is effectively an `ef` of 70.',
              'Cost: if the entry point is tombstoned, every search still starts there — fine for routing, but it can never be an answer.',
              'The space is reclaimed by a rebuild or a compaction, not by the delete.',
            ],
          },
          {
            t: 'try',
            text: 'Tombstone a whole cluster, then query into it. The results come from the neighbouring cluster, and the distance-computation count barely moves.',
            ops: [
              { t: 'deleteNearest', at: [220, 160], mode: 'soft' },
              { t: 'deleteNearest', at: [240, 180], mode: 'soft' },
              { t: 'deleteNearest', at: [200, 150], mode: 'soft' },
              { t: 'deleteNearest', at: [250, 150], mode: 'soft' },
              { t: 'search', at: IN_CLUSTER },
            ],
          },
        ],
      },
      {
        title: 'Hard delete — and the repair problem',
        ops: [
          TEACHING_PARAMS,
          clusters(60),
          { t: 'view', mode: 'layer', layer: 0 },
          { t: 'deleteNearest', at: EDGE_OF_CLUSTER, mode: 'hard' },
          { t: 'seek', to: 'start' },
        ],
        blocks: [
          {
            t: 'p',
            text: 'Actually removing a node means every edge into it disappears, which can leave its former neighbours under-connected — or cut off entirely if the removed node was their only bridge.',
          },
          {
            t: 'p',
            text: 'So each affected neighbour is **repaired**: its edge set is re-selected from its surviving neighbours plus the other nodes orphaned by the same deletion. Stitching the orphans to each other is a good guess, because they were all near the node that vanished.',
          },
          {
            t: 'try',
            text: 'Step through this hard delete. Red dashed lines are edges disappearing; green are the repair edges being stitched in.',
            ops: [{ t: 'seek', to: 'start' }],
          },
          {
            t: 'note',
            tone: 'warn',
            text: 'It is a heuristic, not a fix. The true nearest neighbours of a repaired node may be somewhere only the deleted node had a bridge to. Repeated hard deletes therefore **degrade recall permanently**, which is exactly why real systems prefer tombstones plus a periodic rebuild.',
          },
          {
            t: 'p',
            text: 'One more special case: deleting the entry point. A replacement has to be promoted — the highest-level survivor — and if that node sits in a corner of the space, every future search starts with a long walk.',
          },
          {
            t: 'try',
            text: 'Hard-delete the entry point (the yellow-ringed node) and read the last step of the trace.',
            ops: [{ t: 'tab', tab: 'node' }],
          },
        ],
      },
    ],
  },

  {
    title: 'Updating a vector',
    summary: 'Two strategies. One is correct, one is cheap.',
    steps: [
      {
        title: 'Delete and re-insert',
        ops: [
          TEACHING_PARAMS,
          clusters(60),
          { t: 'view', mode: 'layer', layer: 0 },
          { t: 'tool', tool: 'select' },
        ],
        blocks: [
          {
            t: 'p',
            text: 'A vector\'s edges encode **where it is**. Change the vector and every edge becomes a claim about a position it no longer occupies. Nothing detects this automatically: a stale node keeps answering queries about its old neighbourhood.',
          },
          {
            t: 'p',
            text: 'The safe strategy is delete + insert: hard-delete the node (repairing its neighbours), then insert the new vector as if it were new, with a full search for its neighbourhood.',
          },
          {
            t: 'try',
            text: 'With the select tool, drag a node from one cluster to another and step through it. Update mode is set to `reinsert` in the Build tab.',
            ops: [
              { t: 'updateNearest', at: IN_CLUSTER, to: [745, 465], mode: 'reinsert' },
              { t: 'seek', to: 'start' },
            ],
          },
          {
            t: 'p',
            text: 'It is correct and it is expensive — a delete with repairs plus a full insert. It also re-rolls the level, so the node may change its height in the index.',
          },
        ],
      },
      {
        title: 'In-place update, and when it breaks',
        blocks: [
          {
            t: 'p',
            text: 'The cheap strategy overwrites the vector and re-selects the node\'s edges from its **2-hop neighbourhood** only — no descent from the entry point, no level re-roll. That is roughly what `hnswlib`\'s `updatePoint` does.',
          },
          {
            t: 'try',
            text: 'Switch to in-place mode and move a node a *short* distance. The re-linking is local and sensible.',
            ops: [
              { t: 'updateNearest', at: IN_CLUSTER, to: [280, 210], mode: 'in-place' },
              { t: 'seek', to: 'start' },
            ],
          },
          {
            t: 'try',
            text: 'Now move a node **across** the canvas in-place. Its new neighbours are nowhere in the 2-hop pool, so it ends up connected to a region it no longer belongs to.',
            ops: [
              { t: 'updateNearest', at: [280, 210], to: [760, 470], mode: 'in-place' },
              { t: 'seek', to: 'end' },
            ],
          },
          {
            t: 'p',
            text: 'Then query near its new position: the node is often not returned at all, because no search that starts elsewhere can reach it. **Small nudges are safe. Large moves need a re-insert.**',
          },
          {
            t: 'try',
            text: 'Query where the node now sits and check the recall in Metrics.',
            ops: [{ t: 'search', at: [760, 470] }, { t: 'tab', tab: 'metrics' }],
          },
        ],
      },
    ],
  },

  {
    title: 'What actually breaks in production',
    summary: 'Parameters, memory, dimensionality, and the operational sharp edges.',
    steps: [
      {
        title: 'The five parameters, ranked by how much they matter',
        ops: [{ t: 'tab', tab: 'params' }],
        blocks: [
          {
            t: 'kv',
            pairs: [
              [
                'efSearch',
                'Query-time recall dial. Per query, no rebuild, immediate effect. Tune this first, always. 50–400 typical.',
              ],
              [
                'efConstruction',
                'Build-time beam width. Costs build time only — no extra memory, no extra query cost. The cheapest quality win there is. 100–500 typical.',
              ],
              [
                'M',
                'Edges per node. Drives memory and recall together. 16 is the usual default; 32–48 for high-dimensional or high-recall workloads; below 8 recall falls apart.',
              ],
              [
                'Mmax0',
                'Layer-0 degree cap, conventionally 2M. Layer 0 dominates memory because it holds every node.',
              ],
              [
                'mL',
                'Level decay. Leave it at 1/ln(M). It is the one parameter almost nobody should touch.',
              ],
            ],
          },
          {
            t: 'math',
            text: 'memory ≈ N · (d · 4 bytes  +  Mmax0 · 4 bytes  +  Σ_{l≥1} Mmax · 4 bytes · P(level ≥ l))',
          },
          {
            t: 'p',
            text: 'For 1M vectors of 768 float32 dimensions at M = 16, that is roughly 3 GB of vectors and 130 MB of graph. **The graph is cheap; the vectors are the problem** — which is why quantisation is usually layered underneath HNSW.',
          },
        ],
      },
      {
        title: 'Sharp edges',
        blocks: [
          {
            t: 'ul',
            items: [
              '**Dimensionality.** The log-ish query complexity holds for a fixed intrinsic dimension. As real dimensionality rises, distances concentrate, the graph needs bigger M, and recall at fixed ef drops. Nothing about HNSW escapes the curse of dimensionality — it just degrades gracefully. It also means this 2-D canvas makes the algorithm look better than it is: measured on these points, recall is near-perfect at almost any ef.',
              '**Clustered data.** Well-separated clusters are the hard case: the whole burden falls on the few bridge edges the selection heuristic managed to keep. Try the two-moons and spiral datasets in the Build tab.',
              '**Insertion order.** Because of the trimming step, order changes the graph. Bulk-loading in a random order is better than loading in a sorted or grouped order.',
              '**Deletions.** Tombstones dilute the ef beam; hard deletes degrade the graph. Both point at the same operational answer: rebuild periodically.',
              '**Filtered search.** Combining "nearest neighbours" with "where tenant = X" breaks the algorithm\'s assumptions: filtering during traversal can disconnect the graph, filtering afterwards can return nothing. Every vector database handles this differently and it is where most of their engineering goes.',
              '**Memory-resident by design.** HNSW traversal is a random-access pattern over the whole index. On disk, each hop is a seek — which is why disk-first systems (DiskANN, SPANN) use different structures.',
              '**No incremental deletes of the entry point path, no rebalancing.** The index has no maintenance operation other than "build a new one".',
            ],
          },
        ],
      },
      {
        title: 'Where to go next',
        blocks: [
          {
            t: 'p',
            text: 'The paper is short and readable: Yu. A. Malkov, D. A. Yashunin, *"Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs"* (arXiv:1603.09320, 2016). The pseudocode in the Code tab is Algorithms 1–5 from it, verbatim.',
          },
          {
            t: 'ul',
            items: [
              '**hnswlib** — the authors\' reference C++ implementation. Small enough to read in an afternoon; the source of most of the conventions this app follows (2M on layer 0, tombstones, `updatePoint`).',
              '**FAISS** `IndexHNSWFlat` — the same algorithm with a different memory layout, and the usual place to compose it with quantisation.',
              '**ann-benchmarks.com** — the standard recall-versus-throughput comparison across ANN libraries. The curves there are the same shape as the one in the Lab tab.',
              '**NSW (2014)** — the flat-graph predecessor, worth reading to see what the layers bought.',
              '**DiskANN / Vamana** — what to read once your index no longer fits in RAM.',
            ],
          },
          {
            t: 'note',
            tone: 'accent',
            text: 'Everything on this canvas runs the real algorithm — the same pseudocode, the same distance counting, the same degree caps and repair heuristics. The graphs are small so you can read them, not because anything was simplified.',
          },
        ],
      },
    ],
  },

  {
    title: 'Glossary',
    summary: 'Every term in one place.',
    steps: [
      {
        title: 'Terms',
        blocks: [
          {
            t: 'kv',
            pairs: [
              ['vector / element', 'One stored point. Here 2-D so it can be drawn; usually hundreds of dimensions.'],
              ['k-NN', 'The k stored vectors closest to a query.'],
              ['ANN', 'Approximate nearest neighbour: probably-right answers, sublinear cost.'],
              ['recall@k', 'Fraction of the true top-k that was actually returned. The quality metric.'],
              ['layer / level', 'Layer = one graph in the hierarchy. Level = the top layer a node was assigned.'],
              ['entry point', 'The single highest-level node. Every search and insert starts here.'],
              ['M', 'Edges a node creates for itself on insertion.'],
              ['Mmax / Mmax0', 'Degree caps above layer 0 / on layer 0. Mmax0 is conventionally 2M.'],
              ['efConstruction', 'Beam width while building. Build-time cost only.'],
              ['efSearch', 'Beam width while searching. The runtime recall dial.'],
              ['mL', 'Level-decay constant; 1/ln(M) is optimal.'],
              ['C', 'Candidate queue inside SEARCH-LAYER, popped nearest-first.'],
              ['W', 'The ef best elements found so far. The result set.'],
              ['v', 'Visited set — stops the walk revisiting nodes.'],
              ['greedy walk', 'ef = 1 search: always step to the closest neighbour, stop when none improves.'],
              ['local minimum', 'A node with no neighbour closer to q, where a greedy walk gets stuck.'],
              ['navigable small world', 'A graph where a greedy walk reaches any target in ~log N hops, thanks to a mix of short and long edges.'],
              ['selection heuristic', 'Algorithm 4: keep a candidate only if it is closer to me than to any neighbour I already kept.'],
              ['tombstone / soft delete', 'Mark deleted, keep the edges, filter from results.'],
              ['hard delete', 'Remove the node and repair its orphaned neighbours.'],
              ['distance computation', 'The unit of cost. Everything else is bookkeeping.'],
            ],
          },
        ],
      },
    ],
  },
]
