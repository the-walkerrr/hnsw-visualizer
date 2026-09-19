import { Visual } from "./Visual";

type MiniNode = { id: string; x: number; y: number };

// Three dots sit on the top layer, scattered rather than lined up, each
// roughly above the loose bottom-layer cluster it also belongs to (same id =
// same dot, drawn again one layer down). Both layers share one plane shape
// (same width, same skew) so they read as the same size, seen from the same
// angle.
const CLUSTER_TOP: MiniNode[] = [
  { id: "t1", x: 90, y: 55 },
  { id: "t2", x: 200, y: 95 },
  { id: "t3", x: 310, y: 60 },
];

const CLUSTER_BOTTOM: MiniNode[] = [
  { id: "t1", x: 90, y: 200 },
  { id: "m1", x: 65, y: 232 },
  { id: "m2", x: 115, y: 245 },
  { id: "t2", x: 200, y: 225 },
  { id: "m3", x: 175, y: 262 },
  { id: "m4", x: 225, y: 195 },
  { id: "t3", x: 305, y: 210 },
  { id: "m5", x: 278, y: 245 },
  { id: "m6", x: 322, y: 178 },
];

// One shared skew for both layer planes, so they look like the same floor
// seen from the same angle, just stacked at different heights. Sized wide
// enough that both query marks land inside their plane, not past its edge.
const PLANE_WIDTH = 320;
const PLANE_SKEW = { dx: 18, dy: 105 };
function planePath(x: number, y: number) {
  return `M${x},${y} L${x + PLANE_WIDTH},${y} L${x + PLANE_WIDTH + PLANE_SKEW.dx},${y + PLANE_SKEW.dy} L${x + PLANE_SKEW.dx},${y + PLANE_SKEW.dy} Z`;
}
const TOP_PLANE = { x: 30, y: 25 };
const BOTTOM_PLANE = { x: 30, y: 170 };

const CLUSTER_TOP_EDGES: Array<[string, string]> = [
  ["t1", "t2"],
  ["t2", "t3"],
];

const CLUSTER_BOTTOM_EDGES: Array<[string, string]> = [
  ["t1", "m1"],
  ["t1", "m2"],
  ["m1", "m2"],
  ["t2", "m3"],
  ["t2", "m4"],
  ["m3", "m4"],
  ["t3", "m5"],
  ["t3", "m6"],
  ["m5", "m6"],
  ["t1", "t2"],
  ["t2", "t3"],
];

const QUERY_TOP = { x: 338, y: 88 };
const QUERY_BOTTOM = { x: 345, y: 200 };
const GRAPH_SEARCH_RESULT_ID = "m6";
const GRAPH_SEARCH_BOTTOM_BY_ID = new Map(
  CLUSTER_BOTTOM.map((n) => [n.id, n] as const),
);

export function GraphSearchVisual() {
  const resultNode = GRAPH_SEARCH_BOTTOM_BY_ID.get(GRAPH_SEARCH_RESULT_ID)!;
  const lastTop = CLUSTER_TOP[CLUSTER_TOP.length - 1];
  const lastTopBottom = GRAPH_SEARCH_BOTTOM_BY_ID.get(lastTop.id)!;
  return (
    <Visual title="A few shortcuts above, every dot below">
      <svg
        viewBox="-30 -20 430 340"
        role="img"
        aria-labelledby="graph-search-title graph-search-desc"
      >
        <title id="graph-search-title">
          A search crossing a small top layer into the clustered bottom layer
        </title>
        <desc id="graph-search-desc">
          Two planes of the same size and angle give the layers depth. The
          bottom layer holds every dot in a few loose clusters, with no boundary
          drawn around them. The top layer holds just three scattered dots, each
          above one cluster. Dashed lines connect each top dot to the same dot
          below, and another dashed line connects the query mark shown in both
          layers. A highlighted route starts at one top dot, crosses the top
          layer, drops into the bottom layer, and ends at the dot nearest the
          query.
        </desc>
        <g transform="rotate(-6 199 150)">
          <g className="layer-plane">
            <path d={planePath(TOP_PLANE.x, TOP_PLANE.y)} />
            <path d={planePath(BOTTOM_PLANE.x, BOTTOM_PLANE.y)} />
          </g>
          <g className="layer-label">
            <text x={-5} y={50}>
              L 1
            </text>
            <text x={-5} y={195}>
              L 0
            </text>
          </g>
          <g className="layer-vertical">
            {CLUSTER_TOP.map((t) => {
              const b = GRAPH_SEARCH_BOTTOM_BY_ID.get(t.id)!;
              return (
                <line key={t.id} x1={t.x} y1={t.y + 5} x2={b.x} y2={b.y - 4} />
              );
            })}
            <line
              x1={QUERY_TOP.x}
              y1={QUERY_TOP.y + 6}
              x2={QUERY_BOTTOM.x}
              y2={QUERY_BOTTOM.y - 6}
            />
          </g>
          <g className="visual-edge">
            {CLUSTER_BOTTOM_EDGES.map(([a, b]) => {
              const av = GRAPH_SEARCH_BOTTOM_BY_ID.get(a)!,
                bv = GRAPH_SEARCH_BOTTOM_BY_ID.get(b)!;
              return (
                <line
                  key={`b-${a}-${b}`}
                  x1={av.x}
                  y1={av.y}
                  x2={bv.x}
                  y2={bv.y}
                />
              );
            })}
            {CLUSTER_TOP_EDGES.map(([a, b]) => {
              const av = CLUSTER_TOP.find((n) => n.id === a)!,
                bv = CLUSTER_TOP.find((n) => n.id === b)!;
              return (
                <line
                  key={`t-${a}-${b}`}
                  x1={av.x}
                  y1={av.y}
                  x2={bv.x}
                  y2={bv.y}
                />
              );
            })}
          </g>
          <g className="visual-node">
            {CLUSTER_BOTTOM.map((n) => (
              <circle key={`b-${n.id}`} cx={n.x} cy={n.y} r={4} />
            ))}
            {CLUSTER_TOP.map((n) => (
              <circle key={`t-${n.id}`} cx={n.x} cy={n.y} r={5} />
            ))}
          </g>
          <path
            className="search-route"
            d={`M${CLUSTER_TOP[0].x},${CLUSTER_TOP[0].y} L${CLUSTER_TOP[1].x},${CLUSTER_TOP[1].y} L${lastTop.x},${lastTop.y} L${lastTopBottom.x},${lastTopBottom.y} L${resultNode.x},${resultNode.y}`}
          />
          <g className="route-points">
            <circle cx={CLUSTER_TOP[0].x} cy={CLUSTER_TOP[0].y} r={5} />
            <circle cx={CLUSTER_TOP[1].x} cy={CLUSTER_TOP[1].y} r={5} />
            <circle cx={lastTop.x} cy={lastTop.y} r={5} />
            <circle cx={lastTopBottom.x} cy={lastTopBottom.y} r={5} />
            <circle
              className="result"
              cx={resultNode.x}
              cy={resultNode.y}
              r={6}
            />
          </g>
          <text
            className="visual-caption"
            x={CLUSTER_TOP[0].x}
            y={CLUSTER_TOP[0].y - 12}
            textAnchor="middle"
          >
            start
          </text>
          <g className="query-mark">
            <path
              d={`M${QUERY_TOP.x - 6} ${QUERY_TOP.y - 6}l12 12m0-12-12 12`}
            />
            <path
              d={`M${QUERY_BOTTOM.x - 6} ${QUERY_BOTTOM.y - 6}l12 12m0-12-12 12`}
            />
          </g>
          <text
            className="visual-caption"
            x={QUERY_TOP.x}
            y={QUERY_TOP.y - 10}
            textAnchor="middle"
          >
            query
          </text>
        </g>
      </svg>
      <figcaption>
        Only three dots sit on the top layer, each above one loose cluster
        below. A dashed line marks a dot that appears in both layers. The route
        crosses the top layer, drops down, and lands on the dot nearest the
        request.
      </figcaption>
    </Visual>
  );
}
