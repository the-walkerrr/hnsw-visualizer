import type { Listing } from "../../hnsw/pseudocode";
import type { ControlGuide } from "../../lessons/controlGuides";
import { followLearnReference } from "../../learnReferenceNavigation";

export function ControlCard({ guide }: { guide: ControlGuide }) {
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

export function AlgorithmListing({ listing }: { listing: Listing }) {
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
