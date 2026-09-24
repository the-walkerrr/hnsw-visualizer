import { DEFAULT_PARAMS, runSearch } from '../hnsw/algorithm'
import { addNode, emptyGraph, link } from '../hnsw/graph'
import { distance } from '../hnsw/metric'
import type { Vec } from '../hnsw/types'

// A teaching graph, with real distances and the application's real search trace.
// Positions are in vector units; the diagrams draw ten pixels per unit.
export const SEARCH_LESSON_QUERY: Vec = [49, 24.5]
export const SEARCH_LANDMARKS = [0, 5, 10, 15]
export const SEARCH_LESSON_GRAPH = emptyGraph()
const positions: Vec[] = [
  [10.5, 9], [6.5, 6.5], [14.5, 5.5], [7.5, 12.5], [15, 12],
  [38.5, 8.5], [37, 5.5], [47, 6], [46, 11.5], [36.5, 13],
  [18, 24.5], [12.5, 21], [13, 28], [22, 29], [24, 21.5],
  [41.5, 23], [45, 21], [48.5, 22], [44.5, 26.7], [51.5, 28.5],
]
positions.forEach((vec, id) => {
  addNode(SEARCH_LESSON_GRAPH, vec, SEARCH_LANDMARKS.includes(id) ? 1 : 0, String.fromCharCode(65 + id))
})
// Keep the bottom entry's discovery order explicit: Q, T, then distant J/O.
const edges: [number, number][] = [
  [15, 16], [15, 19], [19, 18], [19, 17], [16, 17], [17, 18],
  [0, 1], [0, 2], [0, 3], [0, 4], [1, 3], [2, 4],
  [5, 6], [5, 7], [5, 8], [5, 9], [7, 8], [6, 9],
  [10, 11], [10, 12], [10, 13], [10, 14], [11, 12], [13, 14],
  [4, 9], [3, 11], [14, 15], [9, 15],
]
edges.forEach(([a, b]) => link(SEARCH_LESSON_GRAPH, a, b, 0))
SEARCH_LANDMARKS.forEach((a, i) => {
  SEARCH_LANDMARKS.slice(i + 1).forEach(b => link(SEARCH_LESSON_GRAPH, a, b, 1))
})
SEARCH_LESSON_GRAPH.entry = 0
SEARCH_LESSON_GRAPH.topLayer = 1

export function lessonDistance(id: number) {
  return distance(SEARCH_LESSON_GRAPH.nodes.get(id)!.vec, SEARCH_LESSON_QUERY, 'euclidean')
}

export function searchLessonExample(efSearch = 3) {
  const { trace } = runSearch(SEARCH_LESSON_GRAPH, {
    ...DEFAULT_PARAMS, metric: 'euclidean', efSearch,
  }, SEARCH_LESSON_QUERY, 2)
  return {
    trace,
    frames: trace.steps.filter(step => step.vis.layer === 0 &&
      ['s2', 's9', 's12', 's13', 's8', 'k6'].includes(step.line)),
  }
}
