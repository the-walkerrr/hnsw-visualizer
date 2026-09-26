type PrerequisiteConcept =
  | "embedding"
  | "node"
  | "edge"
  | "graph"
  | "query"
  | "score"
  | "recall";

const concepts: Array<{
  id: PrerequisiteConcept;
  title: string;
  description: string;
}> = [
  {
    id: "embedding",
    title: "Embedding (vector)",
    description:
      "A list of numbers that represents an item. Similar items should receive embeddings that are close together in vector space.",
  },
  {
    id: "node",
    title: "Node",
    description:
      "One stored item in the graph, such as a product, image, or document.",
  },
  {
    id: "edge",
    title: "Edge and neighbor",
    description:
      "An edge connects two nodes. Nodes connected by an edge are neighbors and can be reached directly from each other.",
  },
  {
    id: "graph",
    title: "Graph",
    description:
      "A collection of nodes connected by edges. HNSW searches by moving through these connections instead of checking every stored item.",
  },
  {
    id: "query",
    title: "Query",
    description:
      "The item we want matches for. It must be converted into an embedding using the same model as the stored items. The orange cross in the diagram marks the query.",
  },
  {
    id: "score",
    title: "Distance or similarity score",
    description:
      "A number that compares two embeddings. Smaller Euclidean distance means closer; larger cosine similarity means more alike. This guide uses Euclidean distance.",
  },
  {
    id: "recall",
    title: "Recall",
    description:
      "We calculate recall with test data that has known inputs and expected outputs. If the search finds 4 of the 5 expected results, recall is 80%.",
  },
];

const visualLabels: Record<PrerequisiteConcept, string> = {
  embedding: "An item converted into a four-number embedding vector.",
  node: "One item represented as a single graph node.",
  edge: "Two neighboring nodes joined by an edge, beside an unconnected node.",
  graph: "Six nodes joined by edges to form a small graph.",
  query: "A query cross positioned among several stored nodes.",
  score: "A query compared with a close node and a farther node using distances.",
  recall: "Four of five correct results found, giving eighty percent recall.",
};

function PrerequisiteVisual({ concept }: { concept: PrerequisiteConcept }) {
  return (
    <svg
      className={`prerequisite-visual prerequisite-${concept}`}
      viewBox="0 0 240 112"
      role="img"
      aria-label={visualLabels[concept]}
    >
      {concept === "embedding" && (
        <>
          <circle className="prerequisite-node accent" cx="30" cy="56" r="14" />
          <path className="prerequisite-arrow" d="M50 56H76m-7-6 7 6-7 6" />
          {["0.72", "0.18", "0.91", "0.34"].map((value, index) => (
            <g key={value}>
              <rect
                className="prerequisite-vector-cell"
                x={84 + index * 36}
                y="40"
                width="32"
                height="32"
                rx="4"
              />
              <text
                className="prerequisite-value"
                x={100 + index * 36}
                y="60"
                textAnchor="middle"
              >
                {value}
              </text>
            </g>
          ))}
        </>
      )}

      {concept === "node" && (
        <circle className="prerequisite-node accent" cx="120" cy="56" r="19" />
      )}

      {concept === "edge" && (
        <>
          <line className="prerequisite-edge accent" x1="58" y1="52" x2="128" y2="52" />
          <circle className="prerequisite-node accent" cx="58" cy="52" r="12" />
          <circle className="prerequisite-node accent" cx="128" cy="52" r="12" />
          <circle className="prerequisite-node" cx="194" cy="52" r="12" />
        </>
      )}

      {concept === "graph" && (
        <>
          <g className="prerequisite-edge">
            <line x1="48" y1="38" x2="104" y2="26" />
            <line x1="48" y1="38" x2="78" y2="82" />
            <line x1="104" y1="26" x2="132" y2="64" />
            <line x1="78" y1="82" x2="132" y2="64" />
            <line x1="132" y1="64" x2="182" y2="34" />
            <line x1="132" y1="64" x2="194" y2="82" />
            <line x1="182" y1="34" x2="194" y2="82" />
          </g>
          {[
            [48, 38],
            [104, 26],
            [78, 82],
            [132, 64],
            [182, 34],
            [194, 82],
          ].map(([x, y]) => (
            <circle className="prerequisite-node" cx={x} cy={y} key={`${x}-${y}`} r="8" />
          ))}
        </>
      )}

      {concept === "query" && (
        <>
          <g className="prerequisite-edge">
            <line x1="42" y1="38" x2="98" y2="72" />
            <line x1="98" y1="72" x2="162" y2="34" />
            <line x1="162" y1="34" x2="198" y2="78" />
          </g>
          {[
            [42, 38],
            [98, 72],
            [162, 34],
            [198, 78],
          ].map(([x, y]) => (
            <circle className="prerequisite-node" cx={x} cy={y} key={`${x}-${y}`} r="8" />
          ))}
          <g className="prerequisite-query">
            <path d="M116 39l16 16m0-16-16 16" />
          </g>
        </>
      )}

      {concept === "score" && (
        <>
          <g className="prerequisite-query">
            <path d="M31 48l14 14m0-14-14 14" />
          </g>
          <line className="prerequisite-distance close" x1="46" y1="55" x2="103" y2="42" />
          <line className="prerequisite-distance far" x1="46" y1="57" x2="190" y2="75" />
          <circle className="prerequisite-node accent" cx="103" cy="42" r="9" />
          <circle className="prerequisite-node" cx="190" cy="75" r="9" />
          <text className="prerequisite-value" x="76" y="38" textAnchor="middle">1.4</text>
          <text className="prerequisite-value" x="124" y="79" textAnchor="middle">4.8</text>
        </>
      )}

      {concept === "recall" && (
        <>
          {[50, 85, 120, 155, 190].map((x, index) => (
            <circle
              className={`prerequisite-node${index < 4 ? " found" : ""}`}
              cx={x}
              cy="42"
              key={x}
              r="10"
            />
          ))}
          <text className="prerequisite-recall-value" x="120" y="88" textAnchor="middle">
            4 / 5 = 80%
          </text>
        </>
      )}
    </svg>
  );
}

export function PrerequisitesChapter() {
  return (
    <section id="chapter-prerequisites" className="guide-chapter">
      <header className="chapter-heading">
        <span>00</span>
        <div>
          <p className="section-kicker">Prerequisites</p>
          <h2>Basic ideas to know first</h2>
          <p>
            HNSW is easier to understand when a few common search and graph
            terms are already familiar. These short definitions are enough for
            the rest of this guide.
          </p>
        </div>
      </header>

      <div className="prerequisite-list">
        {concepts.map((concept) => (
          <article className="prerequisite-item" key={concept.id}>
            <div className="prerequisite-copy">
              <h3>{concept.title}</h3>
              <p>{concept.description}</p>
            </div>
            <PrerequisiteVisual concept={concept.id} />
          </article>
        ))}
      </div>
    </section>
  );
}
