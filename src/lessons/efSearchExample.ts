import { DEFAULT_PARAMS, runSearch } from '../hnsw/algorithm'
import { addNode, emptyGraph, link } from '../hnsw/graph'
import type { Vec } from '../hnsw/types'

// A deliberately small, fixed layer-0 graph. Both demonstrations search this
// exact graph; positions are also the SVG coordinates, so distances match it.
export const EF_QUERY: Vec = [320, 90]
export const EF_GRAPH = emptyGraph()
addNode(EF_GRAPH, [40, 90], 0, 'S')
addNode(EF_GRAPH, [220, 90], 0, 'A')
addNode(EF_GRAPH, [180, 195], 0, 'B')
addNode(EF_GRAPH, [300, 130], 0, 'T')
EF_GRAPH.entry = 0
link(EF_GRAPH, 0, 1, 0)
link(EF_GRAPH, 0, 2, 0)
link(EF_GRAPH, 2, 3, 0)

export function efSearchExample(efSearch: number) {
  const { trace } = runSearch(EF_GRAPH, { ...DEFAULT_PARAMS, metric: 'euclidean', efSearch }, EF_QUERY, 1)
  return {
    trace,
    // Hide repeated-neighbor bookkeeping, but retain every decision that
    // changes a list, expands a node, or returns the result.
    frames: trace.steps.filter((step) => ['s2', 's9', 's12', 's13', 's8', 'k6'].includes(step.line)),
  }
}
