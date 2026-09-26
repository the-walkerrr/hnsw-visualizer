import { LinearScanVisual } from "./LinearScanVisual";
import { GraphSearchVisual } from "./GraphSearchVisual";

export function ProblemChapter() {
  return (
    <section id="chapter-problem" className="guide-chapter">
      <span id="chapter-connect" className="anchor-alias" />
      <header className="chapter-heading">
        <span>01</span>
        <div>
          <p className="section-kicker">The need</p>
          <h2>Why do we need HNSW?</h2>
          <p>
            Imagine an online store with millions of products. If you search
            for a “comfortable running shoe,” comparing your search with
            every product would be slow. HNSW quickly moves through
            connected, similar products, skips unlikely matches, and focuses
            on the most promising ones.
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
            Compare the query with every product, sort all the results, and
            return the closest <b>k</b>. This is accurate, but the work grows
            with every product added to the store.
          </p>
        </div>
        <div
          className="simple-callout"
          style={{ borderLeft: "3px solid var(--green)" }}
        >
          <b>The HNSW way</b>
          <p>
            Use graph connections and small upper layers to reach a promising
            area quickly. Then check nearby items more closely and return the
            top <b>k</b> matches.
          </p>
        </div>
        <div className="visual-pair">
          <LinearScanVisual />
          <GraphSearchVisual />
        </div>
      </div>
    </section>
  );
}
