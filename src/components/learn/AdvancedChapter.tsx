import { LISTINGS } from "../../hnsw/pseudocode";
import { CONTROL_GUIDES } from "../../lessons/controlGuides";
import { ControlCard, AlgorithmListing } from "./AdvancedReference";

export function AdvancedChapter() {
  return (
    <section id="advanced-learning" className="guide-chapter advanced-learning">
      <header className="chapter-heading">
        <span>+</span>
        <div>
          <p className="section-kicker">Advanced</p>
          <h2>Advanced reference</h2>
          <p>
            Updates, controls, and pseudocode — open a topic only when you
            want its exact detail.
          </p>
        </div>
      </header>
      <div className="advanced-learning-body">
        <section id="chapter-update" className="advanced-topic">
          <h2>Moving a dot</h2>
          <p id="update-reinsert">
            <b>Reinsert:</b> remove the old links, search broadly near the
            new position, and connect again.
          </p>
          <p id="update-in-place">
            <b>Local repair:</b> keep the dot’s layer and rebuild links from
            its old neighborhood. It does less work but may miss better
            routes after a large move.
          </p>
        </section>
        <section id="parameter-guide" className="advanced-topic">
          <h2>Control reference</h2>
          <p>
            Open a control only when you want its exact purpose and when it
            takes effect.
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
            The main guide uses everyday language. These listings keep the
            exact names used by the step-by-step code view.
          </p>
          <div className="reference-library algorithm-library">
            {LISTINGS.map((listing) => (
              <AlgorithmListing key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
