import { buildIndex, bruteForce, runSearch, DEFAULT_PARAMS } from '../hnsw/algorithm'
import { emptyGraph } from '../hnsw/graph'
import { makeRng } from '../hnsw/rng'
import type { Vec } from '../hnsw/types'

// A small, fixed dataset built once with the real HNSW build/search code, so the
// low-vs-high demonstration below reflects genuine algorithm behavior rather
// than a scripted animation. Seed and query were chosen because a width of 1–2
// misses the true nearest dot while 3+ finds it, with checks still climbing
// afterward — a realistic "too low misses it, too high just costs more" curve.
const SEED = 12
const DOT_COUNT = 26

function seedVecs(): Vec[] {
  const rng = makeRng(SEED)
  const vecs: Vec[] = []
  for (let i = 0; i < DOT_COUNT; i++) vecs.push([20 + rng() * 300, 20 + rng() * 180])
  return vecs
}

const PARAMS = {
  ...DEFAULT_PARAMS,
  M: 4,
  Mmax: 4,
  Mmax0: 8,
  efConstruction: 20,
  mL: 1 / Math.log(4),
  seed: SEED,
}

export const SEARCH_WIDTH_GRAPH = buildIndex(emptyGraph(), PARAMS, seedVecs())
export const SEARCH_WIDTH_QUERY: Vec = [41, 153]
export const SEARCH_WIDTH_MAX = 10
export const SEARCH_WIDTH_TRUTH = bruteForce(SEARCH_WIDTH_GRAPH, SEARCH_WIDTH_QUERY, 1, PARAMS)[0].id

export function searchWidthExample(width: number) {
  const { trace } = runSearch(SEARCH_WIDTH_GRAPH, { ...PARAMS, efSearch: width }, SEARCH_WIDTH_QUERY, 1)
  return {
    visited: trace.steps.at(-1)!.vis.visited as number[],
    result: trace.results[0].id,
  }
}
