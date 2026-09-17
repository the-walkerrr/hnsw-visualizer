/** The paper's pseudocode, line-addressable so the player can highlight the
 *  exact line the visualisation is executing. Algorithms 1–5 are from
 *  Malkov & Yashunin 2016; delete/update document this visualizer's demo
 *  strategies because the paper does not define those operations. */

export interface CodeLine {
  key: string
  indent: number
  text: string
  /** Shown when the reader hovers the line. */
  note?: string
}

export interface Listing {
  id: string
  title: string
  subtitle: string
  lines: CodeLine[]
}

export const LISTINGS: Listing[] = [
  {
    id: 'insert',
    title: 'INSERT',
    subtitle: 'Algorithm 1 — a search that stops to make friends',
    lines: [
      { key: 'i1', indent: 0, text: 'INSERT(NEW_NODE, TARGET_CONNECTIONS, MAX_CONNECTIONS_UPPER, MAX_CONNECTIONS_BASE, BUILD_WIDTH, LAYER_MULTIPLIER)' },
      { key: 'i1-cap', indent: 1, text: 'CONNECTION_LIMIT(CURRENT_LAYER) ← MAX_CONNECTIONS_BASE on layer 0; otherwise MAX_CONNECTIONS_UPPER', note: 'Layer 0 usually allows more links.' },
      { key: 'i2', indent: 1, text: 'ENTRY_POINTS ← ENTRY_POINT;  INDEX_TOP_LAYER ← level of ENTRY_POINT', note: 'Every insert starts where every search starts.' },
      { key: 'i3', indent: 1, text: 'NEW_NODE_TOP_LAYER ← random level using LAYER_MULTIPLIER', note: 'A coin flip, not a property of the data.' },
      { key: 'i4', indent: 1, text: 'for CURRENT_LAYER ← INDEX_TOP_LAYER … NEW_NODE_TOP_LAYER+1   ▹ phase 1: zoom in' },
      { key: 'i5', indent: 2, text: 'BEST_CANDIDATES ← SEARCH-LAYER(NEW_NODE, ENTRY_POINTS, SEARCH_WIDTH = 1, CURRENT_LAYER)' },
      { key: 'i6', indent: 2, text: 'ENTRY_POINTS ← nearest element of BEST_CANDIDATES to NEW_NODE' },
      { key: 'i7', indent: 1, text: 'for CURRENT_LAYER ← min(INDEX_TOP_LAYER, NEW_NODE_TOP_LAYER) … 0   ▹ phase 2: connect' },
      { key: 'i8', indent: 2, text: 'BEST_CANDIDATES ← SEARCH-LAYER(NEW_NODE, ENTRY_POINTS, BUILD_WIDTH, CURRENT_LAYER)' },
      { key: 'i9', indent: 2, text: 'SELECTED_NEIGHBORS ← SELECT-NEIGHBORS(NEW_NODE, BEST_CANDIDATES, TARGET_CONNECTIONS, CURRENT_LAYER)' },
      { key: 'i10', indent: 2, text: 'add bidirectional edges NEW_NODE ↔ SELECTED_NEIGHBORS on CURRENT_LAYER' },
      { key: 'i11', indent: 2, text: 'for each NEIGHBOR ∈ SELECTED_NEIGHBORS' },
      { key: 'i12', indent: 3, text: 'if |neighbourhood(NEIGHBOR, CURRENT_LAYER)| > CONNECTION_LIMIT(CURRENT_LAYER)' },
      { key: 'i13', indent: 4, text: 'neighbourhood(NEIGHBOR, CURRENT_LAYER) ← SELECT-NEIGHBORS(NEIGHBOR, neighbourhood(NEIGHBOR, CURRENT_LAYER), CONNECTION_LIMIT(CURRENT_LAYER), CURRENT_LAYER)' },
      { key: 'i14', indent: 2, text: 'ENTRY_POINTS ← BEST_CANDIDATES', note: 'The whole candidate list is carried down, not just the best.' },
      { key: 'i15', indent: 1, text: 'if NEW_NODE_TOP_LAYER > INDEX_TOP_LAYER: ENTRY_POINT ← NEW_NODE' },
    ],
  },
  {
    id: 'search-layer',
    title: 'SEARCH-LAYER',
    subtitle: 'Algorithm 2 — candidate search inside one layer',
    lines: [
      { key: 's1', indent: 0, text: 'SEARCH-LAYER(QUERY, ENTRY_POINTS, SEARCH_WIDTH, CURRENT_LAYER)' },
      { key: 's2', indent: 1, text: 'VISITED_NODES ← ENTRY_POINTS;  CANDIDATES_TO_CHECK ← ENTRY_POINTS;  BEST_CANDIDATES ← ENTRY_POINTS', note: 'Start both candidate lists and the visited set with the entry points.' },
      { key: 's5', indent: 1, text: 'while |CANDIDATES_TO_CHECK| > 0' },
      { key: 's6', indent: 2, text: 'CURRENT_CANDIDATE ← nearest element of CANDIDATES_TO_CHECK; remove it from CANDIDATES_TO_CHECK' },
      { key: 's7', indent: 2, text: 'FARTHEST_BEST_CANDIDATE ← furthest element of BEST_CANDIDATES from QUERY' },
      { key: 's8', indent: 2, text: 'if distance(CURRENT_CANDIDATE, QUERY) > distance(FARTHEST_BEST_CANDIDATE, QUERY): break', note: 'The early exit that makes HNSW fast.' },
      { key: 's9', indent: 2, text: 'for each NEIGHBOR ∈ neighbourhood(CURRENT_CANDIDATE, CURRENT_LAYER)' },
      { key: 's10', indent: 3, text: 'if NEIGHBOR ∉ VISITED_NODES' },
      { key: 's11', indent: 4, text: 'VISITED_NODES ← VISITED_NODES ∪ {NEIGHBOR}; FARTHEST_BEST_CANDIDATE ← furthest element of BEST_CANDIDATES' },
      { key: 's12', indent: 4, text: 'if distance(NEIGHBOR, QUERY) < distance(FARTHEST_BEST_CANDIDATE, QUERY) or |BEST_CANDIDATES| < SEARCH_WIDTH' },
      { key: 's13', indent: 5, text: 'CANDIDATES_TO_CHECK ← CANDIDATES_TO_CHECK ∪ {NEIGHBOR}; BEST_CANDIDATES ← BEST_CANDIDATES ∪ {NEIGHBOR}' },
      { key: 's14', indent: 5, text: 'if |BEST_CANDIDATES| > SEARCH_WIDTH: remove furthest from BEST_CANDIDATES' },
      { key: 's15', indent: 1, text: 'return BEST_CANDIDATES' },
    ],
  },
  {
    id: 'select-neighbors',
    title: 'SELECT-NEIGHBORS',
    subtitle: 'Algorithms 3 & 4 — which candidates deserve an edge',
    lines: [
      { key: 'n1', indent: 0, text: 'SELECT-NEIGHBORS-SIMPLE(TARGET, INPUT_CANDIDATES, TARGET_CONNECTIONS)' },
      { key: 'n2', indent: 1, text: 'return TARGET_CONNECTIONS nearest elements of INPUT_CANDIDATES to TARGET' },
      { key: 'h1', indent: 0, text: 'SELECT-NEIGHBORS-HEURISTIC(TARGET, INPUT_CANDIDATES, TARGET_CONNECTIONS, CURRENT_LAYER, EXTEND_CANDIDATES, KEEP_PRUNED_CONNECTIONS)' },
      { key: 'h2', indent: 1, text: 'SELECTED_NEIGHBORS ← ∅; WORKING_CANDIDATES ← INPUT_CANDIDATES' },
      { key: 'h3', indent: 1, text: 'if EXTEND_CANDIDATES: add candidate neighbors to WORKING_CANDIDATES' },
      { key: 'h4', indent: 1, text: 'REJECTED_CANDIDATES ← ∅' },
      { key: 'h5', indent: 1, text: 'while |WORKING_CANDIDATES| > 0 and |SELECTED_NEIGHBORS| < TARGET_CONNECTIONS' },
      { key: 'h6', indent: 2, text: 'CANDIDATE ← nearest element of WORKING_CANDIDATES to TARGET; remove it from WORKING_CANDIDATES' },
      { key: 'h7', indent: 2, text: 'if CANDIDATE is closer to TARGET than to any SELECTED_NEIGHBOR' },
      { key: 'h8', indent: 3, text: 'add CANDIDATE to SELECTED_NEIGHBORS', note: 'The candidate covers a direction nothing else covers.' },
      { key: 'h9', indent: 2, text: 'else add CANDIDATE to REJECTED_CANDIDATES', note: 'The distance test treats this direction as redundant; it does not guarantee an existing route.' },
      { key: 'h10', indent: 1, text: 'if KEEP_PRUNED_CONNECTIONS' },
      { key: 'h11', indent: 2, text: 'remove nearest from REJECTED_CANDIDATES; add it to SELECTED_NEIGHBORS until TARGET_CONNECTIONS is reached' },
      { key: 'h12', indent: 1, text: 'return SELECTED_NEIGHBORS' },
    ],
  },
  {
    id: 'knn-search',
    title: 'NEAREST-NEIGHBOR-SEARCH',
    subtitle: 'Algorithm 5 — coarse to fine, top layer to layer 0',
    lines: [
      { key: 'k1', indent: 0, text: 'NEAREST-NEIGHBOR-SEARCH(QUERY, NUM_RESULTS_REQUESTED, SEARCH_WIDTH)' },
      { key: 'k2', indent: 1, text: 'ENTRY_POINTS ← ENTRY_POINT; INDEX_TOP_LAYER ← top layer' },
      { key: 'k3', indent: 1, text: 'for CURRENT_LAYER ← INDEX_TOP_LAYER … 1' },
      { key: 'k4', indent: 2, text: 'BEST_CANDIDATES ← SEARCH-LAYER(QUERY, ENTRY_POINTS, SEARCH_WIDTH = 1, CURRENT_LAYER); ENTRY_POINTS ← nearest of BEST_CANDIDATES' },
      { key: 'k5', indent: 1, text: 'BEST_CANDIDATES ← SEARCH-LAYER(QUERY, ENTRY_POINTS, SEARCH_WIDTH, 0)' },
      { key: 'k6', indent: 1, text: 'return NUM_RESULTS_REQUESTED nearest from BEST_CANDIDATES, skipping tombstones' },
    ],
  },
  {
    id: 'delete',
    title: 'DELETE',
    subtitle: 'Not in the paper — strategies used by this visualizer',
    lines: [
      { key: 'd1', indent: 0, text: 'SOFT-DELETE(NODE_TO_DELETE)          ▹ this visualizer keeps links' },
      { key: 'd2', indent: 1, text: 'mark NODE_TO_DELETE deleted; keep every edge for routing' },
      { key: 'd3', indent: 1, text: 'filter NODE_TO_DELETE out of every result list' },
      { key: 'd4', indent: 0, text: 'HARD-DELETE(NODE_TO_DELETE)          ▹ reclaim, then repair' },
      { key: 'd5', indent: 1, text: 'for CURRENT_LAYER ← level(NODE_TO_DELETE) … 0' },
      { key: 'd5-cap', indent: 2, text: 'CONNECTION_LIMIT(CURRENT_LAYER) ← MAX_CONNECTIONS_BASE on layer 0; otherwise MAX_CONNECTIONS_UPPER' },
      { key: 'd6', indent: 2, text: 'AFFECTED_NEIGHBORS ← neighbourhood(NODE_TO_DELETE, CURRENT_LAYER)' },
      { key: 'd7', indent: 2, text: 'remove NODE_TO_DELETE from each AFFECTED_NEIGHBOR on CURRENT_LAYER' },
      { key: 'd8', indent: 2, text: 'for each AFFECTED_NEIGHBOR' },
      { key: 'd9', indent: 3, text: 'reselect its neighborhood from current and AFFECTED_NEIGHBORS using CONNECTION_LIMIT(CURRENT_LAYER)' },
      { key: 'd10', indent: 1, text: 'remove NODE_TO_DELETE from the graph' },
      { key: 'd11', indent: 1, text: 'if NODE_TO_DELETE was ENTRY_POINT: ENTRY_POINT ← highest-level survivor' },
    ],
  },
  {
    id: 'update',
    title: 'UPDATE',
    subtitle: 'Two demo strategies with different search scopes',
    lines: [
      { key: 'u1', indent: 0, text: 'UPDATE-BY-REINSERT(NODE_TO_UPDATE, UPDATED_VECTOR)   ▹ broader search, more work' },
      { key: 'u2', indent: 1, text: 'HARD-DELETE(NODE_TO_UPDATE); INSERT(UPDATED_VECTOR)' },
      { key: 'u3', indent: 0, text: 'UPDATE-IN-PLACE(NODE_TO_UPDATE, UPDATED_VECTOR)     ▹ local pool, less work' },
      { key: 'u4', indent: 1, text: 'vector(NODE_TO_UPDATE) ← UPDATED_VECTOR' },
      { key: 'u5', indent: 1, text: 'for CURRENT_LAYER ← level(NODE_TO_UPDATE) … 0' },
      { key: 'u6', indent: 2, text: 'LOCAL_CANDIDATES ← 2-hop neighbourhood of NODE_TO_UPDATE on CURRENT_LAYER' },
      { key: 'u7', indent: 2, text: 'neighbourhood(NODE_TO_UPDATE, CURRENT_LAYER) ← SELECT-NEIGHBORS(NODE_TO_UPDATE, LOCAL_CANDIDATES, TARGET_CONNECTIONS, CURRENT_LAYER); re-link' },
    ],
  },
]

const BY_PREFIX: Record<string, string> = {
  i: 'insert',
  s: 'search-layer',
  n: 'select-neighbors',
  h: 'select-neighbors',
  k: 'knn-search',
  d: 'delete',
  u: 'update',
}

export function listingIdForLine(key: string): string {
  return BY_PREFIX[key[0]] ?? 'insert'
}

export function listingById(id: string): Listing {
  return LISTINGS.find((l) => l.id === id) ?? LISTINGS[0]
}
