import { useId, useState } from "react";
import { edgesOnLayer, neighborsAt } from "../../hnsw/graph";
import type { Step } from "../../hnsw/types";
import {
  SEARCH_LESSON_GRAPH as graph,
  SEARCH_LESSON_QUERY as query,
  SEARCH_LANDMARKS,
  lessonDistance,
  searchLessonExample,
} from "../../lessons/searchLessonExample";
import { Visual } from "./Visual";

const nodes = [...graph.nodes.values()];
const label = (id: number) => graph.nodes.get(id)!.label;
const score = (id: number) => lessonDistance(id).toFixed(1);
const byDistance = (ids: number[]) =>
  [...ids].sort((a, b) => lessonDistance(a) - lessonDistance(b));

// Keep the same coordinates in every panel. Only the vertical projection of
// a whole layer changes when it is stacked above the bottom graph.
function GraphDrawing({
  layer = 0,
  offset = 0,
  compressed = false,
  best = [],
  current,
  rejected,
  starts = false,
  labels = [],
  comparisons = false,
}: {
  layer?: number;
  offset?: number;
  compressed?: boolean;
  best?: number[];
  current?: number;
  rejected?: number;
  starts?: boolean;
  labels?: number[];
  comparisons?: boolean;
}) {
  const y = (v: number) => v * (compressed ? 5.5 : 10) + offset;
  const shown = nodes.filter((n) => n.level >= layer);
  return (
    <g>
      <g className="visual-edge">
        {edgesOnLayer(graph, layer).map(([a, b]) => {
          const av = graph.nodes.get(a)!.vec,
            bv = graph.nodes.get(b)!.vec;
          return (
            <line
              key={`${a}-${b}`}
              x1={av[0] * 10}
              y1={y(av[1])}
              x2={bv[0] * 10}
              y2={y(bv[1])}
            />
          );
        })}
      </g>
      {comparisons &&
        SEARCH_LANDMARKS.map((id) => {
          const v = graph.nodes.get(id)!.vec;
          return (
            <line
              key={id}
              className="search-distance-line"
              x1={v[0] * 10}
              y1={y(v[1])}
              x2={query[0] * 10}
              y2={y(query[1])}
            />
          );
        })}
      {shown.map((n) => {
        const state =
          n.id === rejected
            ? " rejected"
            : best.includes(n.id)
              ? " best"
              : starts && n.id === 0
                ? " poor"
                : "";
        return (
          <g key={n.id} className={`search-product${state}`}>
            {current === n.id && (
              <circle
                className="current-ring"
                cx={n.vec[0] * 10}
                cy={y(n.vec[1])}
                r={15}
              />
            )}
            <circle cx={n.vec[0] * 10} cy={y(n.vec[1])} r={7} />
            {(layer > 0 || labels.includes(n.id)) && (
              <text
                className={comparisons ? "search-node-distance" : undefined}
                x={n.vec[0] * 10}
                y={y(n.vec[1]) - 15}
                textAnchor="middle"
              >
                {n.label}
                {comparisons &&
                  ` · ${score(n.id)}${best.includes(n.id) ? " (closest)" : ""}`}
              </text>
            )}
          </g>
        );
      })}
      <g className="query-mark">
        <path d={`M${query[0] * 10 - 6} ${y(query[1]) - 6}l12 12m0-12-12 12`} />
      </g>
      <text
        className="search-query-label"
        x={query[0] * 10 + 13}
        y={y(query[1]) + 4}
      >
        query
      </text>
      {starts && (
        <>
          <text x={105} y={168} textAnchor="middle">
            A · poor start
          </text>
          <text x={385} y={310} textAnchor="middle">
            P · good start
          </text>
        </>
      )}
    </g>
  );
}

function StepControls({
  step,
  count,
  setStep,
  name,
}: {
  step: number;
  count: number;
  setStep: (step: number) => void;
  name: string;
}) {
  return (
    <div className="search-step-controls" role="group" aria-label={name}>
      <button
        className="button secondary"
        disabled={step === 0}
        onClick={() => setStep(step - 1)}
      >
        Back
      </button>
      <span>
        Step {step + 1} of {count}
      </span>
      <button
        className="button secondary"
        onClick={() => setStep(step === count - 1 ? 0 : step + 1)}
      >
        {step === count - 1 ? "Restart" : "Next →"}
      </button>
    </div>
  );
}

export function ProductGraphVisual({ starts = false }: { starts?: boolean }) {
  return (
    <Visual
      title={
        starts
          ? "Same graph, same query. Two very different starts."
          : "20 products · one query · an already-built graph"
      }
    >
      <svg
        className="search-lesson-graph"
        viewBox="0 0 600 345"
        role="img"
        aria-label={
          starts
            ? "The same twenty-node graph. A is far from the query; P starts near its cluster."
            : "Twenty product nodes in four loose clusters, connected by edges. A query cross sits near the lower-right cluster."
        }
      >
        <GraphDrawing
          starts={starts}
          best={starts ? [15] : []}
          labels={starts ? [0, 15] : []}
        />
      </svg>
    </Visual>
  );
}

const layerCopy = [
  [
    "Use a small overview",
    "A, F, K, and P also appear in the upper layer. Their positions hint at the regions below. Begin at the index’s stored entry point A. The same query is shown on both layers.",
  ],
  [
    "Compare the four landmarks",
    "Measure distance from the query to A and its three upper-layer neighbors. P is closest at 7.6, so move to P. In this tiny, fully connected upper layer, all four can be compared in one expansion.",
  ],
  [
    "Carry P down",
    "No upper-layer neighbor improves on P. Follow P down to the very same product in the bottom layer. P is now the starting point for a more careful search through nearby products.",
  ],
];

export function SearchLayersWalkthrough() {
  const [step, setStep] = useState(0);
  return (
    <Visual title="Choose a starting point, one layer at a time">
      <div className="search-step-copy" aria-live="polite">
        <h4>{layerCopy[step][0]}</h4>
        <p>{layerCopy[step][1]}</p>
      </div>
      <svg
        className="search-lesson-graph stacked"
        viewBox="0 0 650 535"
        role="img"
        aria-label={`${layerCopy[step][0]}. Two tilted layers, with dotted links connecting A, F, K, and P to the same nodes below.${step === 1 ? ` Distances to query: ${SEARCH_LANDMARKS.map((id) => `${label(id)} ${score(id)}`).join(", ")}; P is closest.` : ""}`}
      >
        <g transform="rotate(-7 315 255)">
          <path className="search-layer-plane" d="M35 34H575L610 192H70Z" />
          <path className="search-layer-plane" d="M35 314H575L610 472H70Z" />
          <text className="search-layer-name" x={45} y={23}>
            Upper layer · 4 landmarks
          </text>
          <text className="search-layer-name" x={45} y={303}>
            Bottom layer · all 20 products
          </text>
          {SEARCH_LANDMARKS.map((id) => {
            const v = graph.nodes.get(id)!.vec;
            const x = v[0] * 10,
              top = v[1] * 5.5 + 23,
              bottom = v[1] * 5.5 + 287;
            return (
              <line
                key={id}
                className={`search-layer-link${step === 2 && id === 15 ? " selected" : ""}`}
                x1={x}
                y1={top}
                x2={x}
                y2={bottom}
              />
            );
          })}
          <GraphDrawing
            layer={1}
            compressed
            offset={15}
            best={step > 0 ? [15] : []}
            current={step === 0 ? 0 : 15}
            comparisons={step === 1}
          />
          {step === 2 && (
            <>
              <path className="search-descent" d="M409 399.5l6 7 6-7" />
              <text className="search-descent-label" x={432} y={249}>
                same P ↓
              </text>
            </>
          )}
          <GraphDrawing
            compressed
            offset={295}
            best={step === 2 ? [15] : []}
            labels={SEARCH_LANDMARKS}
            current={step === 2 ? 15 : undefined}
          />
        </g>
      </svg>
      <StepControls
        step={step}
        count={3}
        setStep={setStep}
        name="Layer walkthrough"
      />
      {/*<figcaption>
        Dotted links connect the same product across layers.{" "}
        {step === 2
          ? "The green link carries the search down through P. "
          : step === 1
            ? "Numbers beside the upper nodes show distance to the query; orange dashed lines show those comparisons. "
            : ""}
        A larger upper layer is searched by following its edges toward closer
        nodes, rather than scanning every landmark.
      </figcaption>*/}
    </Visual>
  );
}

function frameCopy(frame: Step, previous?: Step) {
  const id = frame.vis.considering;
  const previousBest = previous?.vis.dynamic ?? [];
  switch (frame.line) {
    case "s2":
      return [
        "Start with P in both buckets",
        "P is the best node we know here, and its neighbors still need checking. Best-so-far has three slots; to-check starts with one pending node.",
      ];
    case "s9": {
      const current = frame.vis.current!;
      const unseenNeighbors = neighborsAt(
        graph,
        current,
        frame.vis.layer ?? 0,
      ).filter((neighbor) => !frame.vis.visited.includes(neighbor));
      return [
        `Explore ${label(current)}`,
        unseenNeighbors.length === 0
          ? `Take ${label(current)} out of to-check because it is the closest pending node. All of its neighbors have already been seen in this layer, so skip them instead of checking the same nodes again. The buckets do not change.`
          : `Take ${label(current)} out of to-check because it is the closest pending node. Check its previously unseen neighbors next.`,
      ];
    }
    case "s13": {
      const evicted = previousBest.find((n) => !frame.vis.dynamic.includes(n));
      return [
        `Add ${label(id!)} to both buckets`,
        evicted === undefined
          ? `${label(id!)} is ${score(id!)} from the query. There is room, so keep it in best-so-far and queue it in to-check. A free slot lets us keep an alternative even when it is farther away.`
          : `${label(id!)} is ${score(id!)} away, closer than ${label(evicted)} at ${score(evicted)}. Add it to both buckets and remove ${label(evicted)} from best-so-far to stay within three slots. Any pending entry for ${label(evicted)} stays in to-check.`,
      ];
    }
    case "s12":
      return [
        `Skip ${label(id!)}`,
        `${label(id!)} is ${score(id!)} away. Best-so-far is full, and its farthest node is closer. Do not add ${label(id!)} to either bucket or explore through it.`,
      ];
    case "s8": {
      const next = byDistance(previous?.vis.candidates ?? [])[0];
      const worst = byDistance(frame.vis.dynamic).at(-1)!;
      return [
        "Stop before expanding the next node",
        `${label(next)} at ${score(next)} is the closest pending node, but it is farther than our worst kept node, ${label(worst)} at ${score(worst)}. Every other pending node is at least as far away. Stop here instead of exploring their neighbors.`,
      ];
    }
    default:
      return [
        "Return the closest k results",
        "We asked for k = 2. Return the closest two nodes from best-so-far: R and T. The third slot helped the search explore; it does not create a third answer.",
      ];
  }
}

const example = searchLessonExample();

export function SearchBucketsWalkthrough() {
  const clipId = useId();
  const [step, setStep] = useState(0);
  const frame = example.frames[step];
  const previous = example.frames[step - 1];
  const [title, explanation] = frameCopy(frame, previous);
  const pending = byDistance(
    frame.line === "s8" ? previous.vis.candidates : frame.vis.candidates,
  );
  const best = byDistance(frame.vis.dynamic);
  const returned = frame.line === "k6";
  const focus =
    frame.line === "s12" || frame.line === "s13"
      ? frame.vis.considering
      : frame.vis.current;
  const expanding = frame.vis.current;
  const considering =
    frame.line === "s12" || frame.line === "s13"
      ? frame.vis.considering
      : undefined;
  const showFullGraph = focus !== undefined && focus < 15;
  return (
    <Visual title="k (requested no. of results) = 2 · best-so-far capacity = 3">
      <div className="search-step-copy" aria-live="polite">
        <h4>{title}</h4>
        <p>{explanation}</p>
      </div>
      <div className="search-expansion-context" aria-live="polite">
        {expanding === undefined ? (
          <span>No node selected yet</span>
        ) : (
          <>
            <span>Checking neighbors of</span>
            <b>{label(expanding)}</b>
            {considering !== undefined && (
              <small>Now evaluating {label(considering)}</small>
            )}
          </>
        )}
      </div>
      <svg
        className={`search-lesson-graph bucket-graph${showFullGraph ? "" : " closeup"}`}
        viewBox={showFullGraph ? "0 0 600 345" : "330 175 245 140"}
        role="img"
        aria-label={`${title}. ${expanding !== undefined ? `Checking neighbors of ${label(expanding)}. ` : ""}${considering !== undefined ? `Now evaluating ${label(considering)}. ` : ""}${showFullGraph ? "Zoomed out to show the distant neighbor in the full graph." : "A close-up of P, Q, R, S, and T in the bottom-right cluster of the same graph."}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={330} y={175} width={245} height={140} />
          </clipPath>
        </defs>
        <g clipPath={showFullGraph ? undefined : `url(#${clipId})`}>
          <GraphDrawing
            best={returned ? frame.vis.results : best}
            current={focus}
            rejected={frame.line === "s12" ? frame.vis.considering : undefined}
            labels={[
              15,
              16,
              17,
              18,
              19,
              ...(focus !== undefined ? [focus] : []),
            ]}
          />
        </g>
      </svg>
      <p className="search-zoom-note">
        *
        {showFullGraph
          ? "Zoomed out to show the distant neighbor."
          : "Close-up of the same bottom-right cluster."}{" "}
        Distances below are to the query.
      </p>
      <div className="search-buckets" aria-live="polite">
        <div className="search-bucket best">
          <h4>
            Best-so-far <span>{best.length} / 3</span>
          </h4>
          <p>Closest found · keep up to 3</p>
          <ol>
            {best.map((id, i) => (
              <li key={id} className={returned && i < 2 ? "returned" : ""}>
                <b>{label(id)}</b>
                <span>{score(id)}</span>
                <small>
                  {returned && i < 2
                    ? "return"
                    : i === best.length - 1
                      ? "farthest kept"
                      : "kept"}
                </small>
              </li>
            ))}
            {Array.from({ length: 3 - best.length }, (_, i) => (
              <li className="empty" key={`empty-${i}`}>
                Empty slot
              </li>
            ))}
          </ol>
        </div>
        <div className="search-bucket pending">
          <h4>
            To-check <span>{pending.length} pending</span>
          </h4>
          <p>Neighbors still to explore · closest first</p>
          <ol>
            {pending.map((id, i) => (
              <li key={id}>
                <b>{label(id)}</b>
                <span>{score(id)}</span>
                <small>
                  {frame.line === "s8"
                    ? "not expanded"
                    : i === 0
                      ? "next"
                      : "pending"}
                </small>
              </li>
            ))}
          </ol>
          {pending.length === 0 && (
            <p className="search-empty">
              {returned ? "Search finished" : "No queued nodes right now"}
            </p>
          )}
        </div>
      </div>
      <StepControls
        step={step}
        count={example.frames.length}
        setStep={setStep}
        name="Bucket walkthrough"
      />
    </Visual>
  );
}

export function SearchLayerSizesVisual() {
  const bottomNodes: Array<readonly [number, number]> = ([
    [100, 335],
    [125, 320],
    [145, 342],
    [170, 326],
    [190, 350],
    [115, 360],
    [142, 370],
    [165, 358],
    [200, 330],
    [215, 365],
    [175, 378],
    [128, 385],
    [205, 392],
    [230, 380],
    [255, 394],
    [280, 382],
    [305, 400],
    [215, 416],
    [240, 426],
    [270, 418],
    [295, 432],
    [320, 414],
    [245, 405],
    [285, 405],
    [325, 388],
    [330, 335],
    [355, 320],
    [380, 342],
    [405, 326],
    [430, 348],
    [445, 330],
    [345, 360],
    [370, 372],
    [400, 360],
    [425, 378],
    [455, 365],
    [390, 385],
    [435, 395],
    [460, 382],
    [485, 400],
    [510, 385],
    [535, 405],
    [560, 390],
    [450, 420],
    [475, 430],
    [505, 418],
    [530, 432],
    [555, 420],
    [490, 440],
    [570, 438],
  ] as const).map(([x, y]) => [x, 342 + Math.round((y - 320) / 2)]);
  const bottomEdges: Array<readonly [number, number]> = [];

  let clusterStart = 0;
  for (const clusterSize of [12, 13, 12, 13]) {
    for (let index = 0; index < clusterSize - 1; index += 1) {
      bottomEdges.push([clusterStart + index, clusterStart + index + 1]);
      if (index % 2 === 0 && index < clusterSize - 2) {
        bottomEdges.push([clusterStart + index, clusterStart + index + 2]);
      }
    }
    clusterStart += clusterSize;
  }
  bottomEdges.push([8, 25], [9, 12], [21, 37], [35, 38]);

  const layers = [
    {
      name: "Layer 3",
      plane: "M55 15H555L590 95H90Z",
      nodes: [
        [235, 52],
        [300, 34],
        [365, 57],
        [425, 38],
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [0, 2],
        [1, 3],
      ],
    },
    {
      name: "Layer 2",
      plane: "M55 120H555L590 200H90Z",
      nodes: [
        [180, 160],
        [208, 143],
        [235, 174],
        [270, 155],
        [365, 155],
        [395, 138],
        [430, 167],
        [468, 149],
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [0, 2],
        [1, 3],
        [4, 5],
        [5, 6],
        [6, 7],
        [4, 6],
        [5, 7],
        [3, 4],
      ],
    },
    {
      name: "Layer 1",
      plane: "M55 225H555L590 305H90Z",
      nodes: [
        [140, 265],
        [170, 248],
        [195, 275],
        [220, 257],
        [180, 290],
        [300, 260],
        [330, 243],
        [355, 275],
        [385, 253],
        [340, 297],
        [445, 265],
        [475, 243],
        [500, 280],
        [530, 260],
        [480, 298],
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [2, 4],
        [0, 2],
        [5, 6],
        [6, 7],
        [7, 8],
        [8, 5],
        [7, 9],
        [5, 7],
        [10, 11],
        [11, 12],
        [12, 13],
        [13, 10],
        [12, 14],
        [10, 12],
        [3, 5],
        [8, 10],
      ],
    },
    {
      name: "Layer 0",
      plane: "M55 330H555L590 410H90Z",
      nodes: bottomNodes,
      edges: bottomEdges,
    },
  ] as const;

  return (
    <Visual title="The same graph, from sparse to dense">
      <svg
        className="search-layer-stack"
        viewBox="0 0 650 455"
        role="img"
        aria-label="Four graph layers of equal size, made of irregular clusters with equally sized nodes. The top has four nodes, the next layers have eight and fifteen nodes, and the bottom has fifty nodes."
      >
        {layers.map((layer) => (
          <g key={layer.name}>
            <path className="layer-plane" d={layer.plane} />
            <g className="visual-edge">
              {layer.edges.map(([from, to]) => {
                const start = layer.nodes[from]!;
                const end = layer.nodes[to]!;
                return (
                  <line
                    key={`${from}-${to}`}
                    x1={start[0]}
                    y1={start[1]}
                    x2={end[0]}
                    y2={end[1]}
                  />
                );
              })}
            </g>
            {layer.nodes.map(([x, y]) => (
              <circle cx={x} cy={y} key={`${x}-${y}`} r="4" />
            ))}
          </g>
        ))}
      </svg>
    </Visual>
  );
}
