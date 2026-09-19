import { useState } from "react";
import { edgesOnLayer } from "../../hnsw/graph";
import {
  SEARCH_WIDTH_GRAPH,
  SEARCH_WIDTH_MAX,
  SEARCH_WIDTH_QUERY,
  SEARCH_WIDTH_TRUTH,
  searchWidthExample,
} from "../../lessons/searchWidthExample";
import { Visual } from "./Visual";

const EDGES = edgesOnLayer(SEARCH_WIDTH_GRAPH, 0);
const NODES = [...SEARCH_WIDTH_GRAPH.nodes.values()];

export function SearchWidthVisual() {
  const [width, setWidth] = useState(1);
  const { visited, result } = searchWidthExample(width);
  const found = result === SEARCH_WIDTH_TRUTH;

  return (
    <Visual title="Try a low and a high search width">
      <div className="width-slider-row">
        <label htmlFor="search-width-demo">Search width</label>
        <input
          id="search-width-demo"
          type="range"
          min={1}
          max={SEARCH_WIDTH_MAX}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
        <span className="width-slider-value">{width}</span>
      </div>
      <svg
        viewBox="0 0 340 220"
        role="img"
        aria-label={`Search with a width of ${width}: checked ${visited.length} of ${NODES.length} dots, ${found ? "found the closest one" : "missed the closest one"}`}
      >
        <g className="visual-edge">
          {EDGES.map(([a, b]) => {
            const av = SEARCH_WIDTH_GRAPH.nodes.get(a)!.vec,
              bv = SEARCH_WIDTH_GRAPH.nodes.get(b)!.vec;
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
        {NODES.map((n) => (
          <g
            key={n.id}
            className={`visual-node${
              n.id === result
                ? " route-result"
                : n.id === SEARCH_WIDTH_TRUTH
                  ? " route-truth"
                  : visited.includes(n.id)
                    ? ""
                    : " route-unseen"
            }`}
            transform={`translate(${n.vec[0]} ${n.vec[1]})`}
          >
            <circle r={n.id === result ? 9 : 5} />
          </g>
        ))}
        <g className="query-mark">
          <path
            d={`M${SEARCH_WIDTH_QUERY[0] - 7} ${SEARCH_WIDTH_QUERY[1] - 7}l14 14m0-14-14 14`}
          />
        </g>
      </svg>
      <p>
        Checked <b>{visited.length}</b> of {NODES.length} dots and{" "}
        {found ? (
          <>
            found <b>the closest dot</b>.
          </>
        ) : (
          <>
            settled for a farther dot — the true closest one (dashed outline)
            was never checked closely enough.
          </>
        )}
      </p>
      <figcaption>
        A low width can stop too early and settle for a decent-looking match.
        A higher width checks more dots before deciding, so it is more likely
        to find the true nearest one — though checking more also costs more
        work, even after the answer stops improving.
      </figcaption>
    </Visual>
  );
}
