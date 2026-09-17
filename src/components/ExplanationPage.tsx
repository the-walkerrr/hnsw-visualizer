import { useEffect, useRef, useState, type ReactNode } from "react";
import { LISTINGS, type Listing } from "../hnsw/pseudocode";
import { edgesOnLayer } from "../hnsw/graph";
import { distance } from "../hnsw/metric";
import { CONTROL_GUIDES, type ControlGuide } from "../lessons/controlGuides";
import {
  EF_GRAPH,
  EF_QUERY,
  efSearchExample,
} from "../lessons/efSearchExample";
import {
  followLearnReference,
  LEARN_REFERENCE_EVENT,
  prepareLearnReturn,
  readLearnReturnPoint,
  type LearnReturnPoint,
} from "../learnReferenceNavigation";

const SECTION_NAV = [
  { id: "chapter-problem", number: "01", label: "The need" },
  { id: "chapter-search", number: "02", label: "Search" },
  { id: "chapter-insert", number: "03", label: "Insert" },
  { id: "chapter-delete", number: "04", label: "Delete" },
  { id: "chapter-practice", number: "05", label: "Try it" },
  { id: "advanced-learning", number: "+", label: "Advanced" },
] as const;

type SectionId = (typeof SECTION_NAV)[number]["id"];
const SECTION_IDS: readonly string[] = SECTION_NAV.map((s) => s.id);

// Sub-anchors (deep links from Playground panels, ParameterLink, etc.) that
// live inside a section but aren't the section's own id.
const ANCHOR_SECTION: Record<string, SectionId> = {
  "chapter-connect": "chapter-problem",
  "chapter-layers": "chapter-search",
  "ef-search-explained": "chapter-search",
  "w-per-layer": "chapter-search",
  "c-admission-rule": "chapter-search",
  "keep-routes-exercise": "chapter-search",
  "lesson-4": "chapter-insert",
  "soft-delete": "chapter-delete",
  "hard-delete": "chapter-delete",
  "chapter-update": "advanced-learning",
  "update-reinsert": "advanced-learning",
  "update-in-place": "advanced-learning",
  "parameter-guide": "advanced-learning",
  "algorithm-steps": "advanced-learning",
};
for (const guide of Object.values(CONTROL_GUIDES))
  ANCHOR_SECTION[guide.id] = "advanced-learning";
for (const listing of LISTINGS)
  ANCHOR_SECTION[`algorithm-${listing.id}`] = "advanced-learning";

function sectionFor(id: string): SectionId | null {
  if (SECTION_IDS.includes(id)) return id as SectionId;
  return ANCHOR_SECTION[id] ?? null;
}

function SectionPager({ current }: { current: SectionId }) {
  const index = SECTION_IDS.indexOf(current);
  const prev = index > 0 ? SECTION_NAV[index - 1] : null;
  const next = index < SECTION_NAV.length - 1 ? SECTION_NAV[index + 1] : null;
  return (
    <nav className="section-pager" aria-label="Section navigation">
      {prev ? (
        <a className="button quiet" href={`#${prev.id}`}>
          <span aria-hidden="true">←</span> {prev.label}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a className="button primary" href={`#${next.id}`}>
          {next.label} <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}

function Visual({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="lesson-visual">
      <div className="visual-label">{title}</div>
      {children}
    </figure>
  );
}

const LINEAR_SCAN_NODES = [...EF_GRAPH.nodes.values()];
const LINEAR_SCAN_NEAREST = LINEAR_SCAN_NODES.reduce((best, n) =>
  distance(n.vec, EF_QUERY, "euclidean") <
  distance(best.vec, EF_QUERY, "euclidean")
    ? n
    : best,
);

function LinearScanVisual() {
  return (
    <Visual title="Checking every stored item, one by one">
      <div className="scan-header" aria-hidden="true">
        <span className="scan-step" />
        <span className="scan-bar" style={{ visibility: "hidden" }} />
        <span className="scan-score-label">distance from query</span>
      </div>
      <ol
        className="scan-list"
        aria-label="Comparing the request with every stored item in turn"
      >
        {LINEAR_SCAN_NODES.map((n, i) => (
          <li
            key={n.id}
            className={
              n.id === LINEAR_SCAN_NEAREST.id ? "scan-match" : undefined
            }
          >
            <span className="scan-step">{i + 1}</span>
            <span className="scan-bar" aria-hidden="true" />
            <span className="scan-score">
              {distance(n.vec, EF_QUERY, "euclidean").toFixed(2)}
            </span>
            {n.id === LINEAR_SCAN_NEAREST.id && (
              <span className="scan-result">✓ closest</span>
            )}
          </li>
        ))}
      </ol>
      <figcaption>
        Comparing the request against every stored item always finds the true
        closest one — the cost is checking all of them, one at a time.
      </figcaption>
    </Visual>
  );
}

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

function GraphSearchVisual() {
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

function LayersVisual() {
  return (
    <Visual title="High layers make long jumps; the bottom layer finishes the search">
      <svg
        viewBox="0 0 720 300"
        role="img"
        aria-labelledby="layers-title layers-desc"
      >
        <title id="layers-title">A three-layer search route</title>
        <desc id="layers-desc">
          The search moves across a small overview layer, descends through a
          middle layer, and finishes among all dots on the bottom layer.
        </desc>
        <g className="layer-plane">
          <path d="m90 32 525 0 48 45-525 0Z" />
          <path d="m70 120 545 0 48 45-545 0Z" />
          <path d="m50 214 565 0 48 45-565 0Z" />
        </g>
        <g className="layer-label">
          <text x="15" y="58">
            Overview
          </text>
          <text x="15" y="146">
            Middle
          </text>
          <text x="15" y="240">
            All dots
          </text>
        </g>
        <g className="visual-edge">
          <path d="M176 55h277M147 143l112-4 114 6 138-3M115 238l75-7 72 14 75-12 76 18 77-15 83 12" />
        </g>
        <g className="visual-node">
          <circle cx="176" cy="55" r="7" />
          <circle cx="453" cy="55" r="7" />
          <circle cx="147" cy="143" r="6" />
          <circle cx="259" cy="139" r="6" />
          <circle cx="373" cy="145" r="6" />
          <circle cx="511" cy="142" r="6" />
          <circle cx="115" cy="238" r="5" />
          <circle cx="190" cy="231" r="5" />
          <circle cx="262" cy="245" r="5" />
          <circle cx="337" cy="233" r="5" />
          <circle cx="413" cy="251" r="5" />
          <circle cx="490" cy="236" r="5" />
          <circle cx="573" cy="248" r="5" />
        </g>
        <g className="layer-vertical">
          <path d="M176 62 147 136M453 62l58 74M147 149l-32 83M259 145l3 94M373 151l40 94M511 148l62 94" />
        </g>
        <path
          className="search-route"
          d="M176 55h277l58 87-138 3 40 106 77-15"
        />
        <g className="route-points">
          <circle cx="176" cy="55" r="8" />
          <circle cx="453" cy="55" r="8" />
          <circle cx="511" cy="142" r="8" />
          <circle cx="373" cy="145" r="8" />
          <circle cx="413" cy="251" r="8" />
          <circle className="result" cx="490" cy="236" r="9" />
        </g>
      </svg>
      <figcaption>
        Every dot lives on the bottom layer. A few also appear above it,
        creating shortcuts—like highways above neighborhood streets.
      </figcaption>
    </Visual>
  );
}

const KEPT_ROUTE_WIDTHS = [1, 2];
const KEPT_ROUTE_EDGES = edgesOnLayer(EF_GRAPH, 0);
const KEPT_ROUTE_NODES = [...EF_GRAPH.nodes.values()];
const KEPT_ROUTE_NEAREST = KEPT_ROUTE_NODES.reduce((best, n) =>
  distance(n.vec, EF_QUERY, "euclidean") <
  distance(best.vec, EF_QUERY, "euclidean")
    ? n
    : best,
);

function KeptRoutesVisual() {
  const panels = KEPT_ROUTE_WIDTHS.map((width) => {
    const { trace } = efSearchExample(width);
    return {
      width,
      visited: trace.steps.at(-1)!.vis.visited as number[],
      result: trace.results[0].id,
    };
  });
  return (
    <Visual title="Keeping one extra route can change the outcome">
      <div className="route-compare">
        {panels.map(({ width, visited, result }) => (
          <div className="route-panel" key={width}>
            <svg
              viewBox="0 0 340 220"
              role="img"
              aria-label={`Search keeping ${width} route${width === 1 ? "" : "s"} open`}
            >
              <g className="visual-edge">
                {KEPT_ROUTE_EDGES.map(([a, b]) => {
                  const av = EF_GRAPH.nodes.get(a)!.vec,
                    bv = EF_GRAPH.nodes.get(b)!.vec;
                  return (
                    <line
                      key={`${a}-${b}`}
                      x1={av[0]}
                      y1={av[1]}
                      x2={bv[0]}
                      y2={bv[1]}
                      className={
                        visited.includes(a) && visited.includes(b)
                          ? "kept-edge"
                          : undefined
                      }
                    />
                  );
                })}
              </g>
              {KEPT_ROUTE_NODES.map((n) => (
                <g
                  key={n.id}
                  className={`visual-node${n.id === result ? " route-result" : visited.includes(n.id) ? "" : " route-unseen"}`}
                  transform={`translate(${n.vec[0]} ${n.vec[1]})`}
                >
                  <circle r={n.id === result ? 11 : 8} />
                  <text className="visual-caption" y={-14} textAnchor="middle">
                    {n.label}
                  </text>
                </g>
              ))}
              <g className="query-mark">
                <path
                  d={`M${EF_QUERY[0] - 7} ${EF_QUERY[1] - 7}l14 14m0-14-14 14`}
                />
              </g>
            </svg>
            <p>
              <b>
                Keep {width} route{width === 1 ? "" : "s"} open
              </b>{" "}
              → finds {EF_GRAPH.nodes.get(result)!.label}
              {result === KEPT_ROUTE_NEAREST.id
                ? ", the closest dot"
                : ", not the closest dot"}
              .
            </p>
          </div>
        ))}
      </div>
      <figcaption>
        Same dots, same target — only the number of open routes changes, and
        with it, whether the search finds the truly closest one.
      </figcaption>
    </Visual>
  );
}

function InsertVisual() {
  return (
    <div className="learn-flow" aria-label="The three parts of inserting a dot">
      <div>
        <span>1</span>
        <b>Search</b>
        <p>Use the existing graph to find the new dot’s neighborhood.</p>
      </div>
      <div>
        <span>2</span>
        <b>Connect</b>
        <p>Link the new dot to a few useful nearby dots.</p>
      </div>
      <div>
        <span>3</span>
        <b>Tidy</b>
        <p>Trim crowded links so the graph stays easy to navigate.</p>
      </div>
    </div>
  );
}

function LevelDrawVisual() {
  return (
    <div
      className="learn-flow"
      aria-label="How a new dot picks which layers it joins"
    >
      <div>
        <span>1</span>
        <b>Start on the bottom layer</b>
        <p>Every new dot lands here — this is where every dot lives.</p>
      </div>
      <div>
        <span>2</span>
        <b>Flip a coin</b>
        <p>Heads, it climbs one layer higher. Tails, it stops right here.</p>
      </div>
      <div>
        <span>3</span>
        <b>Keep flipping</b>
        <p>
          Every win earns another flip. Most dots stop after the very first one.
        </p>
      </div>
    </div>
  );
}

function DeleteVisual() {
  return (
    <div
      className="learn-flow"
      aria-label="The three parts of soft-deleting a dot"
    >
      <div>
        <span>1</span>
        <b>Mark</b>
        <p>Flag the dot as deleted instead of erasing it immediately.</p>
      </div>
      <div>
        <span>2</span>
        <b>Hide</b>
        <p>Stop returning the dot as a search result.</p>
      </div>
      <div>
        <span>3</span>
        <b>Keep the route</b>
        <p>Leave its links in place so searches can still pass through it.</p>
      </div>
    </div>
  );
}

function ControlCard({ guide }: { guide: ControlGuide }) {
  return (
    <details id={guide.id} className="learn-disclosure control-reference">
      <summary>{guide.label}</summary>
      <div className="disclosure-content">
        <p>{guide.plain}</p>
        <p className="hint">{guide.when}</p>
        {guide.learnMore && (
          <a
            className="control-deep-link"
            href={guide.learnMore.href}
            data-learn-reference
            onClick={followLearnReference}
          >
            {guide.learnMore.label} →
          </a>
        )}
      </div>
    </details>
  );
}

function AlgorithmListing({ listing }: { listing: Listing }) {
  return (
    <details
      id={`algorithm-${listing.id}`}
      className="learn-disclosure algorithm-listing"
    >
      <summary>
        <code>{listing.title}</code>
        <span>{listing.subtitle}</span>
      </summary>
      <div className="algorithm-listing-content">
        <div className="code">
          {listing.lines.map((line) => (
            <span
              key={line.key}
              className={`ln${line.indent === 0 ? " head" : ""}`}
              title={line.note}
            >
              {"  ".repeat(line.indent)}
              {line.text}
            </span>
          ))}
        </div>
      </div>
    </details>
  );
}

export function ExplanationPage({
  onOpenPlayground,
  onStartFirstSearch,
  initialSection,
}: {
  onOpenPlayground: () => void;
  onStartFirstSearch?: () => void;
  /** Only for tests/no-DOM rendering, where there is no `window.location` to read. */
  initialSection?: SectionId;
}) {
  const page = useRef<HTMLElement>(null);
  const [section, setSection] = useState<SectionId>(() => {
    if (initialSection) return initialSection;
    try {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const fromHash = hash ? sectionFor(hash) : null;
      if (fromHash) return fromHash;
      const saved = sessionStorage.getItem("hnsw-learn-section");
      if (saved && SECTION_IDS.includes(saved)) return saved as SectionId;
    } catch {
      /* Storage/hash access is optional. */
    }
    return "chapter-problem";
  });
  const [returnPoint, setReturnPoint] = useState<LearnReturnPoint | null>(
    readLearnReturnPoint,
  );

  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const reveal = () => {
      let hash: string;
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const target = hash ? sectionFor(hash) : null;
      if (target) {
        setSection(target);
        try {
          sessionStorage.setItem("hnsw-learn-section", target);
        } catch {
          /* Storage is optional. */
        }
      }
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          const targetEl = hash ? document.getElementById(hash) : null;
          if (!targetEl) {
            element.scrollTop = 0;
            return;
          }
          let parent: HTMLElement | null = targetEl;
          while (parent) {
            if (parent instanceof HTMLDetailsElement) parent.open = true;
            parent = parent.parentElement;
          }
          targetEl.scrollIntoView({ block: "start" });
        }),
      );
    };
    const revealReference = () => {
      setReturnPoint(readLearnReturnPoint());
      reveal();
    };
    const frame = window.requestAnimationFrame(revealReference);
    window.addEventListener("hashchange", revealReference);
    window.addEventListener("popstate", revealReference);
    const showReturn = (event: Event) =>
      setReturnPoint((event as CustomEvent<LearnReturnPoint>).detail);
    window.addEventListener(LEARN_REFERENCE_EVENT, showReturn);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", revealReference);
      window.removeEventListener("popstate", revealReference);
      window.removeEventListener(LEARN_REFERENCE_EVENT, showReturn);
    };
  }, []);

  const continueReading = () => {
    if (!returnPoint) return;
    prepareLearnReturn(returnPoint);
    setReturnPoint(null);
    window.history.replaceState({}, "", returnPoint.href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main
      ref={page}
      className="explanation-page beginner-guide simplified-learn"
    >
      {returnPoint && (
        <button
          type="button"
          className="continue-reading"
          onClick={continueReading}
        >
          <span aria-hidden="true">←</span> Continue where you left
        </button>
      )}
      <div className="guide-wrap">
        <header className="guide-hero">
          <h1>Find similar things without checking everything.</h1>
        </header>

        <div className="guide-layout">
          <nav className="guide-toc" aria-label="Learn HNSW contents">
            {SECTION_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={section === item.id ? "page" : undefined}
              >
                <span>{item.number}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="guide-content">
            {section === "chapter-problem" && (
              <section id="chapter-problem" className="guide-chapter">
                <span id="chapter-connect" className="anchor-alias" />
                <header className="chapter-heading">
                  <span>01</span>
                  <div>
                    <p className="section-kicker">The need</p>
                    <h2>Why do we need HNSW?</h2>
                    <p>
                      Imagine an online store with millions of products. If you
                      search for a “comfortable running shoe,” comparing your
                      search with every product would be slow. HNSW quickly
                      moves through connected, similar products, skips unlikely
                      matches, and focuses on the most promising ones.
                    </p>
                  </div>
                </header>
                <div className="lesson-block">
                  <div
                    className="simple-callout"
                    style={{ borderLeft: "3px solid var(--red)" }}
                  >
                    <b>The slow, exact way</b>
                    <p>
                      Convert each product into an embedding vector. Compare the
                      query vector with every product vector, calculate their
                      similarity scores, sort the results, and return the top{" "}
                      <b>k</b> most similar products.
                    </p>
                  </div>
                  <div
                    className="simple-callout"
                    style={{ borderLeft: "3px solid var(--green)" }}
                  >
                    <b>The HNSW way</b>
                    <p>
                      It connects similar vectors with edges and builds a few
                      smaller layers on top. These layers help the search
                      quickly reach the right area. From there, it checks nearby
                      vectors more closely and returns the top <b>k</b> closest
                      matches.
                    </p>
                  </div>
                  <div className="visual-pair">
                    <LinearScanVisual />
                    <GraphSearchVisual />
                  </div>
                </div>
              </section>
            )}

            {section === "chapter-search" && (
              <section id="chapter-search" className="guide-chapter">
                <span id="chapter-layers" className="anchor-alias" />
                <span id="ef-search-explained" className="anchor-alias" />
                <span id="w-per-layer" className="anchor-alias" />
                <span id="c-admission-rule" className="anchor-alias" />
                <header className="chapter-heading">
                  <span>02</span>
                  <div>
                    <p className="section-kicker">Search</p>
                    <h2>From layer to layer</h2>
                    <p>
                      As we saw earlier, HNSW starts at the top layer and moves
                      down, getting closer to the query at each step. At the
                      bottom layer, it explores the nearby nodes more carefully
                      to find the closest matches. A few parameters control how
                      thorough this search is. For now, assume the graph is
                      already built—we’ll cover how HNSW builds it in the next
                      section.
                    </p>
                  </div>
                </header>
                <div className="lesson-block">
                  <LayersVisual />
                  <ol className="explanation-steps">
                    <li>
                      <b>Start high.</b>
                      <span>Begin on the smallest overview layer.</span>
                    </li>
                    <li>
                      <b>Move closer.</b>
                      <span>
                        Follow a link when it brings the search nearer to the
                        request.
                      </span>
                    </li>
                    <li>
                      <b>Move down.</b>
                      <span>
                        Use the best dot so far as the start for the next layer.
                      </span>
                    </li>
                    <li>
                      <b>Keep a few options.</b>
                      <span>
                        On the bottom layer, explore more than one promising
                        route before returning results.
                      </span>
                    </li>
                  </ol>
                  <div id="keep-routes-exercise" className="route-explanation">
                    <p className="section-kicker">Why keep a few options?</p>
                    <h3>The first promising path can be a dead end.</h3>
                    <p>
                      Think of two possible routes to a new café — pick wrong,
                      and a better street just around the corner might go
                      unnoticed. HNSW remembers a few unexplored dots for
                      exactly this reason. If one path stops improving, it tries
                      another. Remembering more options can find a better match,
                      at the cost of a little extra checking.
                    </p>
                  </div>
                  <KeptRoutesVisual />
                  {onStartFirstSearch && (
                    <aside className="try-panel desktop-lesson-action">
                      <div>
                        <span>LEARN BY DOING</span>
                        <h3>Watch one search in Playground</h3>
                        <p>
                          Follow the route one step at a time and see when the
                          search keeps or skips a dot.
                        </p>
                      </div>
                      <button
                        className="button primary"
                        onClick={onStartFirstSearch}
                      >
                        Start guided search →
                      </button>
                    </aside>
                  )}
                </div>
              </section>
            )}

            {section === "chapter-insert" && (
              <section id="chapter-insert" className="guide-chapter">
                <span id="lesson-4" className="anchor-alias" />
                <header className="chapter-heading">
                  <span>03</span>
                  <div>
                    <p className="section-kicker">Insert</p>
                    <h2>A new dot searches first, then connects.</h2>
                    <p>
                      Adding a new item is like moving into a neighborhood: you
                      scope out who already lives nearby before deciding who to
                      connect with. Insertion reuses the very search you just
                      learned to find the new dot a good neighborhood.
                    </p>
                  </div>
                </header>
                <div className="lesson-block">
                  <InsertVisual />
                  <div className="simple-callout">
                    <b>The useful connection</b>
                    <p>
                      Search asks, “Which stored dots are near this request?”
                      Insert asks the same question for a new dot, then turns a
                      few of those answers into links.
                    </p>
                  </div>
                  <div className="simple-callout">
                    <b>Which layers does it join?</b>
                    <p>
                      Before connecting, a new dot flips a coin to decide how
                      high it climbs — heads, it keeps going; tails, it stops.
                      Most dots land tails on the first flip and stay on the
                      bottom layer; a rare few keep winning and become the
                      shortcuts Search relies on. It’s pure chance, never a
                      judgment about the dot.
                    </p>
                  </div>
                  <LevelDrawVisual />
                </div>
              </section>
            )}

            {section === "chapter-delete" && (
              <section id="chapter-delete" className="guide-chapter">
                <span id="soft-delete" className="anchor-alias" />
                <header className="chapter-heading">
                  <span>04</span>
                  <div>
                    <p className="section-kicker">Delete</p>
                    <h2>A deleted dot can still guide the search.</h2>
                    <p>
                      Think of a shop closed for renovation but still standing —
                      you can walk past it to reach other stores, just not buy
                      anything. A soft delete works the same way: the dot’s
                      paths stay open for searches to pass through, but it won’t
                      be returned as a result.
                    </p>
                  </div>
                </header>
                <div className="lesson-block">
                  <DeleteVisual />
                  <div id="hard-delete" className="simple-callout">
                    <b>When should the dot disappear completely?</b>
                    <p>
                      A hard delete actually demolishes the shop and reroutes
                      the street around the gap — it frees the space for good,
                      with no undo. A soft-deleted dot, by contrast, can simply
                      reopen.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {section === "chapter-practice" && (
              <section id="chapter-practice" className="guide-chapter">
                <header className="chapter-heading">
                  <span>05</span>
                  <div>
                    <p className="section-kicker">Try it</p>
                    <h2>Change one thing at a time.</h2>
                    <p>
                      Reading only gets you so far — this is where it actually
                      clicks. Tweak one control, then watch what happens.
                    </p>
                  </div>
                </header>
                <div className="lesson-block practice-grid">
                  <div>
                    <b>1 · Search</b>
                    <p>
                      Place a target and step forward. Watch the route move from
                      an overview layer to the full graph.
                    </p>
                  </div>
                  <div>
                    <b>2 · Compare</b>
                    <p>
                      Keep the same target, open a few more search routes, and
                      see whether the result improves.
                    </p>
                  </div>
                  <div>
                    <b>3 · Insert</b>
                    <p>
                      Add one dot. Notice that it searches for a neighborhood
                      before creating links.
                    </p>
                  </div>
                  <div>
                    <b>4 · Delete</b>
                    <p>
                      Soft-delete a dot, then search again. The route may still
                      pass through it, but it will not appear in the results.
                    </p>
                  </div>
                  <button
                    className="button primary learn-open-playground"
                    onClick={onOpenPlayground}
                  >
                    Open Playground →
                  </button>
                </div>
              </section>
            )}

            {section === "advanced-learning" && (
              <section
                id="advanced-learning"
                className="guide-chapter advanced-learning"
              >
                <header className="chapter-heading">
                  <span>+</span>
                  <div>
                    <p className="section-kicker">Advanced</p>
                    <h2>Advanced reference</h2>
                    <p>
                      Updates, controls, and pseudocode — open a topic only when
                      you want its exact detail.
                    </p>
                  </div>
                </header>
                <div className="advanced-learning-body">
                  <section id="chapter-update" className="advanced-topic">
                    <h2>Moving a dot</h2>
                    <p id="update-reinsert">
                      <b>Reinsert:</b> remove the old links, search broadly near
                      the new position, and connect again.
                    </p>
                    <p id="update-in-place">
                      <b>Local repair:</b> keep the dot’s layer and rebuild
                      links from its old neighborhood. It does less work but may
                      miss better routes after a large move.
                    </p>
                  </section>
                  <section id="parameter-guide" className="advanced-topic">
                    <h2>Control reference</h2>
                    <p>
                      Open a control only when you want its exact purpose and
                      when it takes effect.
                    </p>
                    <div className="reference-library">
                      {Object.values(CONTROL_GUIDES).map((guide) => (
                        <ControlCard key={guide.id} guide={guide} />
                      ))}
                    </div>
                  </section>
                  <section id="algorithm-steps" className="advanced-topic">
                    <h2>Pseudocode</h2>
                    <p>
                      The main guide uses everyday language. These listings keep
                      the exact names used by the step-by-step code view.
                    </p>
                    <div className="reference-library algorithm-library">
                      {LISTINGS.map((listing) => (
                        <AlgorithmListing key={listing.id} listing={listing} />
                      ))}
                    </div>
                  </section>
                </div>
              </section>
            )}
            <SectionPager current={section} />
          </div>
        </div>
      </div>
    </main>
  );
}
