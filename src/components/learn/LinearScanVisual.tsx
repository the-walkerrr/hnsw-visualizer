import { EF_GRAPH, EF_QUERY } from "../../lessons/efSearchExample";
import { distance } from "../../hnsw/metric";
import { Visual } from "./Visual";

const LINEAR_SCAN_NODES = [...EF_GRAPH.nodes.values()];
const LINEAR_SCAN_NEAREST = LINEAR_SCAN_NODES.reduce((best, n) =>
  distance(n.vec, EF_QUERY, "euclidean") <
  distance(best.vec, EF_QUERY, "euclidean")
    ? n
    : best,
);

export function LinearScanVisual() {
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
