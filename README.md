# HNSW Explorer

An interactive, step-by-step visualization of **Hierarchical Navigable Small World** graphs —
the index behind nearly every vector database. Insert, search, delete, update, tune the
parameters, and measure what it all costs, one algorithm step at a time.

```
npm install
npm run dev      # http://localhost:5173
npm test         # algorithm invariants, connectivity, reducer, projection, render smoke
npm run build    # static output in dist/, relative base — deploy anywhere
```

## What it does

Vectors are 2-D points on the canvas, so **distance is literally the number of pixels between
two dots**. Everything else is the real algorithm: Algorithms 1–5 of Malkov & Yashunin (2016),
implemented line for line, with every distance computation counted.

| Capability | Where |
|---|---|
| Insert, with the two-phase descent and the neighbour-selection heuristic | click with the **insert** tool |
| Nearest-neighbor search, with a configurable search width and early-exit condition | click with the **search** tool |
| Soft delete (tombstone) and restore | **Inspect** tab |
| Hard delete with neighbour repair and entry-point promotion | **Node** tab → hard delete |
| Update, both by re-insert and in place | drag a node with the **select** tool |
| Parameter tuning — target connections, connection limits, build/search widths, layer multiplier, metric, selection rule | **Insert** and **Search** tabs |
| Layer, node, edge, connectivity, and tombstone details | **Details** tab |
| 10 guided lessons from "why not brute force" to "what breaks in production" | left panel |

Every operation is recorded as a **trace**: a list of steps, each carrying its own immutable
graph snapshot, the pseudocode line being executed, and a plain-English explanation of *why*.
The transport bar under the canvas plays, steps, scrubs and rewinds it; `coarse` hides the
per-neighbour bookkeeping, `fine` shows every single comparison.

## Reading the canvas

- **all layers** — the layers as stacked planes, highest at the top, dashed verticals joining
  the copies of one vector. This is the view that makes the hierarchy click.
- **Camera** — scroll to zoom (about the cursor), drag empty space to pan, shift-drag to orbit the
  stack, and the buttons under the tool selector do the same. Keys: `+` `-` `0` for zoom and fit,
  `[` `]` to spin, `,` `.` to tilt. A press that does not move is still a click, so insert and
  search work exactly as before. Layer separation is sized to the current angle, so planes never
  overlap however far you spin, and a head-on view stays compact.
- **single layer** — one plane, straight on, full detail. While a trace is loaded the view
  follows whichever layer the current step is working on.
- Colour is always paired with a shape or a label: `QUERY` is a crosshair, the entry point has a
  double ring, members of `BEST_CANDIDATES` get an outer ring, and tombstones are hatched and dashed.

## Layout

```
src/
  hnsw/                  the algorithm — no React, no DOM, unit-tested
    algorithm.ts         Algorithms 1-5 + delete/update, instrumented step by step
    graph.ts             graph model, cloning, degree caps, level assignment
    candlist.ts          the distance-ordered candidate sets used for BEST_CANDIDATES and CANDIDATES_TO_CHECK
    metric.ts            euclidean / manhattan / cosine
    metrics.ts           recall, cost, histograms, the SEARCH_WIDTH sweep
    pseudocode.ts        the paper's listings, line-addressable
    presets.ts           dataset shapes (clusters, ring, two moons, spiral, …)
  state/                 one reducer; every button and every lesson emits the same ops
  components/            canvas, projection, transport, charts, panels
  lessons/lessons.ts     the guided track, as data
```

The algorithm layer knows nothing about React: `runInsert`, `runSearch`, `runHardDelete`,
`runUpdate` each take a graph and return a new graph plus a trace. That is why the tests can
assert on graph invariants (edge symmetry, degree caps, entry-point validity, recall) directly.

## Notes on fidelity

- Defaults here (`TARGET_CONNECTIONS = 5`, `BUILD_WIDTH = 12`) are deliberately tiny so the graph stays
  readable. Production values are much larger — see the parameter reference in Learn.
- Deletion and update are not in the paper. This app implements what production libraries
  actually do (tombstones by default; hard delete with neighbour repair; `updatePoint`-style
  in-place update) and the lessons are explicit about the trade-offs.
- Degree caps are enforced after *every* operation that can add a reverse edge — insert,
  delete repair and in-place update alike — not just during insert. `MAX_CONNECTIONS_UPPER` and
  `MAX_CONNECTIONS_BASE` are held at or above `TARGET_CONNECTIONS`, because Algorithm 1 re-selects
  a new node's *neighbours* on overflow but never the new node itself, so a lower limit would be
  violated by the very next insert.
- **Layer 0 is routinely disconnected, and that is not a fault.** Separate clusters form separate
  components; a search reaches them by dropping in from a sparser layer, not by crossing layer 0.
  What matters is whether a search can *enter* each component, and that is recursive — everything
  reached on one layer becomes the possible entry points for the next. The Details tab's `parts`
  column reports this, and warns when vectors are sealed off (unretrievable at any `SEARCH_WIDTH`). The
  structural prediction matches empirical retrievability exactly; there is a test asserting it.
- Level assignment is seeded, so the same seed always produces the same graph.
- **Two dimensions flatter the algorithm.** A greedy walk in 2-D nearly always finds the true
  nearest neighbour, so recall here sits near 100% even at `SEARCH_WIDTH = 1` and the recall/search-width
  curve looks almost flat — in 768 dimensions it is steep, and a wider search is what rescues recall.
  Learn says so on screen rather than letting the flat curve mislead.

## Reference

Yu. A. Malkov, D. A. Yashunin, *Efficient and robust approximate nearest neighbor search using
Hierarchical Navigable Small World graphs*, arXiv:1603.09320 (2016).
