/** The paper's pseudocode, line-addressable so the player can highlight the
 *  exact line the visualisation is executing. Algorithms 1–5 are from
 *  Malkov & Yashunin 2016; the delete/update listings are the conventions
 *  production implementations settled on, since the paper never covers them. */

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
      { key: 'i1', indent: 0, text: 'INSERT(q, M, Mmax, efConstruction, mL)' },
      { key: 'i2', indent: 1, text: 'ep ← enter point;  L ← level of ep', note: 'Every insert starts where every search starts.' },
      { key: 'i3', indent: 1, text: 'l ← ⌊−ln(unif(0,1)) · mL⌋', note: 'A coin flip, not a property of the data.' },
      { key: 'i4', indent: 1, text: 'for lc ← L … l+1                     ▹ phase 1: zoom in' },
      { key: 'i5', indent: 2, text: 'W ← SEARCH-LAYER(q, ep, ef = 1, lc)' },
      { key: 'i6', indent: 2, text: 'ep ← nearest element of W to q' },
      { key: 'i7', indent: 1, text: 'for lc ← min(L, l) … 0               ▹ phase 2: connect' },
      { key: 'i8', indent: 2, text: 'W ← SEARCH-LAYER(q, ep, efConstruction, lc)' },
      { key: 'i9', indent: 2, text: 'neighbors ← SELECT-NEIGHBORS(q, W, M, lc)' },
      { key: 'i10', indent: 2, text: 'add bidirectional edges q ↔ neighbors on lc' },
      { key: 'i11', indent: 2, text: 'for each e ∈ neighbors' },
      { key: 'i12', indent: 3, text: 'if |neighbourhood(e, lc)| > Mmax' },
      { key: 'i13', indent: 4, text: 'neighbourhood(e,lc) ← SELECT-NEIGHBORS(e, neighbourhood(e,lc), Mmax, lc)' },
      { key: 'i14', indent: 2, text: 'ep ← W', note: 'The whole beam is carried down, not just the best.' },
      { key: 'i15', indent: 1, text: 'if l > L: enter point ← q' },
    ],
  },
  {
    id: 'search-layer',
    title: 'SEARCH-LAYER',
    subtitle: 'Algorithm 2 — beam search inside one layer',
    lines: [
      { key: 's1', indent: 0, text: 'SEARCH-LAYER(q, ep, ef, lc)' },
      { key: 's2', indent: 1, text: 'v ← ep;  C ← ep;  W ← ep', note: 'v = visited, C = candidates, W = the ef best found.' },
      { key: 's5', indent: 1, text: 'while |C| > 0' },
      { key: 's6', indent: 2, text: 'c ← nearest element of C to q;  remove c from C' },
      { key: 's7', indent: 2, text: 'f ← furthest element of W to q' },
      { key: 's8', indent: 2, text: 'if dist(c, q) > dist(f, q): break', note: 'The early exit that makes HNSW fast.' },
      { key: 's9', indent: 2, text: 'for each e ∈ neighbourhood(c, lc)' },
      { key: 's10', indent: 3, text: 'if e ∉ v' },
      { key: 's11', indent: 4, text: 'v ← v ∪ {e};  f ← furthest element of W' },
      { key: 's12', indent: 4, text: 'if dist(e, q) < dist(f, q) or |W| < ef' },
      { key: 's13', indent: 5, text: 'C ← C ∪ {e};  W ← W ∪ {e}' },
      { key: 's14', indent: 5, text: 'if |W| > ef: remove furthest from W' },
      { key: 's15', indent: 1, text: 'return W' },
    ],
  },
  {
    id: 'select-neighbors',
    title: 'SELECT-NEIGHBORS',
    subtitle: 'Algorithms 3 & 4 — which candidates deserve an edge',
    lines: [
      { key: 'n1', indent: 0, text: 'SELECT-NEIGHBORS-SIMPLE(q, C, M)' },
      { key: 'n2', indent: 1, text: 'return M nearest elements of C to q' },
      { key: 'h1', indent: 0, text: 'SELECT-NEIGHBORS-HEURISTIC(q, C, M, lc, extendCandidates, keepPruned)' },
      { key: 'h2', indent: 1, text: 'R ← ∅;  W ← C' },
      { key: 'h3', indent: 1, text: 'if extendCandidates: W ← W ∪ neighbourhood(e,lc) for e ∈ C' },
      { key: 'h4', indent: 1, text: 'Wd ← ∅                              ▹ discarded' },
      { key: 'h5', indent: 1, text: 'while |W| > 0 and |R| < M' },
      { key: 'h6', indent: 2, text: 'e ← nearest element of W to q;  remove e from W' },
      { key: 'h7', indent: 2, text: 'if e is closer to q than to any element of R' },
      { key: 'h8', indent: 3, text: 'R ← R ∪ {e}', note: 'e covers a direction nothing else covers.' },
      { key: 'h9', indent: 2, text: 'else Wd ← Wd ∪ {e}', note: 'Reachable in one extra hop — the edge would be wasted.' },
      { key: 'h10', indent: 1, text: 'if keepPruned' },
      { key: 'h11', indent: 2, text: 'while |Wd| > 0 and |R| < M: R ← R ∪ {nearest of Wd}' },
      { key: 'h12', indent: 1, text: 'return R' },
    ],
  },
  {
    id: 'knn-search',
    title: 'K-NN-SEARCH',
    subtitle: 'Algorithm 5 — coarse to fine, top layer to layer 0',
    lines: [
      { key: 'k1', indent: 0, text: 'K-NN-SEARCH(q, K, ef)' },
      { key: 'k2', indent: 1, text: 'ep ← enter point;  L ← top layer' },
      { key: 'k3', indent: 1, text: 'for lc ← L … 1' },
      { key: 'k4', indent: 2, text: 'W ← SEARCH-LAYER(q, ep, ef = 1, lc);  ep ← nearest of W' },
      { key: 'k5', indent: 1, text: 'W ← SEARCH-LAYER(q, ep, ef, 0)' },
      { key: 'k6', indent: 1, text: 'return K nearest of W, skipping tombstones' },
    ],
  },
  {
    id: 'delete',
    title: 'DELETE',
    subtitle: 'Not in the paper — what implementations actually do',
    lines: [
      { key: 'd1', indent: 0, text: 'SOFT-DELETE(x)                       ▹ the default everywhere' },
      { key: 'd2', indent: 1, text: 'mark x deleted; keep every edge for routing' },
      { key: 'd3', indent: 1, text: 'filter x out of every result list' },
      { key: 'd4', indent: 0, text: 'HARD-DELETE(x)                       ▹ reclaim, then repair' },
      { key: 'd5', indent: 1, text: 'for lc ← level(x) … 0' },
      { key: 'd6', indent: 2, text: 'A ← neighbourhood(x, lc)' },
      { key: 'd7', indent: 2, text: 'remove x from neighbourhood(e, lc) for e ∈ A' },
      { key: 'd8', indent: 2, text: 'for each e ∈ A' },
      { key: 'd9', indent: 3, text: 'neighbourhood(e,lc) ← SELECT-NEIGHBORS(e, neighbourhood(e,lc) ∪ A, Mmax, lc)' },
      { key: 'd10', indent: 1, text: 'remove x from the graph' },
      { key: 'd11', indent: 1, text: 'if x was the enter point: enter point ← highest-level survivor' },
    ],
  },
  {
    id: 'update',
    title: 'UPDATE',
    subtitle: 'Two strategies, very different guarantees',
    lines: [
      { key: 'u1', indent: 0, text: "UPDATE-BY-REINSERT(x, q′)             ▹ correct, expensive" },
      { key: 'u2', indent: 1, text: 'HARD-DELETE(x);  INSERT(q′)' },
      { key: 'u3', indent: 0, text: "UPDATE-IN-PLACE(x, q′)               ▹ cheap, degrades" },
      { key: 'u4', indent: 1, text: 'vector(x) ← q′' },
      { key: 'u5', indent: 1, text: 'for lc ← level(x) … 0' },
      { key: 'u6', indent: 2, text: 'cand ← 2-hop neighbourhood of x on lc' },
      { key: 'u7', indent: 2, text: 'neighbourhood(x,lc) ← SELECT-NEIGHBORS(x, cand, M, lc); re-link' },
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
