import {
  ProductGraphVisual,
  SearchBucketsWalkthrough,
  SearchLayersWalkthrough,
  SearchLayerSizesVisual,
} from "./SearchAlgorithmVisuals";

type AdmissionNode = {
  id: string;
  distance: string;
  isNew?: boolean;
};

type AdmissionState = {
  best: Array<AdmissionNode | null>;
  pending: Array<AdmissionNode | null>;
};

const admissionExamples: Array<{
  newNode?: AdmissionNode;
  before: AdmissionState;
  after: AdmissionState;
  label: string;
}> = [
  {
    newNode: { id: "N", distance: "4.2", isNew: true },
    before: {
      best: [
        { id: "A", distance: "1.2" },
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        null,
      ],
      pending: [
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        null,
        null,
      ],
    },
    after: {
      best: [
        { id: "A", distance: "1.2" },
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        { id: "N", distance: "4.2", isNew: true },
      ],
      pending: [
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        { id: "N", distance: "4.2", isNew: true },
        null,
      ],
    },
    label: "The new node fills the open best-so-far slot and enters to-check",
  },
  {
    newNode: { id: "N", distance: "3.7", isNew: true },
    before: {
      best: [
        { id: "A", distance: "1.2" },
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        { id: "D", distance: "5.6" },
      ],
      pending: [
        { id: "C", distance: "3.1" },
        { id: "D", distance: "5.6" },
        null,
        null,
      ],
    },
    after: {
      best: [
        { id: "A", distance: "1.2" },
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        { id: "N", distance: "3.7", isNew: true },
      ],
      pending: [
        { id: "C", distance: "3.1" },
        { id: "N", distance: "3.7", isNew: true },
        { id: "D", distance: "5.6" },
        null,
      ],
    },
    label:
      "The closer new node replaces the farthest best-so-far node and enters to-check",
  },
  {
    newNode: { id: "N", distance: "6.8", isNew: true },
    before: {
      best: [
        { id: "A", distance: "1.2" },
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        { id: "D", distance: "5.6" },
      ],
      pending: [
        { id: "C", distance: "3.1" },
        { id: "D", distance: "5.6" },
        null,
        null,
      ],
    },
    after: {
      best: [
        { id: "A", distance: "1.2" },
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        { id: "D", distance: "5.6" },
      ],
      pending: [
        { id: "C", distance: "3.1" },
        { id: "D", distance: "5.6" },
        null,
        null,
      ],
    },
    label: "The farther new node is rejected and both buckets stay unchanged",
  },
  {
    before: {
      best: [
        { id: "A", distance: "1.2" },
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        { id: "D", distance: "5.0" },
      ],
      pending: [
        { id: "Q", distance: "5.3" },
        { id: "R", distance: "6.0" },
        null,
        null,
      ],
    },
    after: {
      best: [
        { id: "A", distance: "1.2" },
        { id: "B", distance: "2.4" },
        { id: "C", distance: "3.1" },
        { id: "D", distance: "5.0" },
      ],
      pending: [null, null, null, null],
    },
    label:
      "The closest pending node is farther than the farthest kept node, so exploration stops and to-check is cleared",
  },
];

function AdmissionSlots({ slots }: { slots: Array<AdmissionNode | null> }) {
  return (
    <div className="admission-slots">
      {slots.map((node, index) => (
        <span
          className={`admission-slot${node?.isNew ? " new" : ""}${
            node ? "" : " vacant"
          }`}
          key={`${node?.id ?? "empty"}-${index}`}
        >
          {node && (
            <>
              <b>{node.id}</b>
              <small>{node.distance}</small>
            </>
          )}
        </span>
      ))}
    </div>
  );
}

function AdmissionBuckets({ state }: { state: AdmissionState }) {
  return (
    <div className="admission-buckets">
      <div className="admission-bucket-row">
        <span>Best-so-far</span>
        <AdmissionSlots slots={state.best} />
      </div>
      <div className="admission-bucket-row">
        <span>To-check</span>
        <AdmissionSlots slots={state.pending} />
      </div>
    </div>
  );
}

function AdmissionRuleVisual({ index }: { index: number }) {
  const example = admissionExamples[index];

  return (
    <div
      className="admission-rule-visual"
      role="img"
      aria-label={example.label}
    >
      <div className="admission-phase before">
        <strong>Before</strong>
        {example.newNode ? (
          <div className="admission-before-layout">
            <div className="admission-new-node">
              <span>New node</span>
              <AdmissionSlots slots={[example.newNode]} />
            </div>
            <AdmissionBuckets state={example.before} />
          </div>
        ) : (
          <AdmissionBuckets state={example.before} />
        )}
      </div>
      <span className="admission-arrow" aria-hidden="true">
        →
      </span>
      <div className="admission-phase after">
        <strong>After</strong>
        <AdmissionBuckets state={example.after} />
      </div>
    </div>
  );
}

export function SearchChapter({
  onStartFirstSearch,
}: {
  onStartFirstSearch?: () => void;
}) {
  return (
    <section
      id="chapter-search"
      className="guide-chapter search-algorithm-chapter"
    >
      <header className="chapter-heading">
        <span>02</span>
        <div>
          <p className="section-kicker">Search</p>
          <h2>Most important piece HNSW</h2>
          <p>
            We represent each product as an embedding vector, such as [0.65,
            0.23, …]. To find similar products, we compare their vectors using
            measures such as Euclidean distance or cosine similarity. For
            simplicity, this explanation uses Euclidean distance. Assume we
            already have a graph whose nodes represent products and whose edges
            connect them. Nearby products tend to form clusters, with a few
            edges linking one cluster to another. Our goal is to find the
            cluster closest to the query and return the k closest products.
          </p>
        </div>
      </header>

      <div className="lesson-block">
        <h3>1. Place the query in the graph’s vector space</h3>
        <p>
          Convert the query product into an embedding vector and place it in the
          graph’s vector space. Here are 20 products from our imagined graph,
          scattered across four loose clusters, along with an example query near
          one of them. The cross marks the query’s position; it is a reference
          for measuring distance, not a product inserted into the graph.
        </p>
        <ProductGraphVisual />
      </div>

      <div className="lesson-block">
        <h3>2. Which node should we start from?</h3>
        <p>
          But how do we know which node to start from? A poor starting point can
          send us through a distant part of the graph before we reach the right
          neighborhood. A good starting point puts useful candidates within a
          few connections.
        </p>
        <p>
          <b>A</b> begins across the graph. <b>P</b> begins in the query’s
          neighborhood, with promising connections nearby. We want a way to
          reach a start like <b>P</b> without measuring every product first.
        </p>
        <ProductGraphVisual starts />
        {/*<p>
          We can see a good starting region in this small drawing. The algorithm
          cannot see the whole map that way: finding the nearest starting node
          by comparing every product would already do the expensive work we
          hoped to avoid. We need a cheaper way to get approximately into the
          right region.
        </p>*/}
      </div>

      <div id="chapter-layers" className="lesson-block">
        <h3>3. Add a small layer of landmarks</h3>
        <p>
          What if one node could approximately represent a cluster when choosing
          where to begin? Put a few such nodes in a second layer above the full
          graph (The building of these layers will be explained in later
          topics). Instead of making our first decision among all 20 products,
          we can orient ourselves using just four: A, F, K, and P.
        </p>
        <p>
          These landmarks are the same product nodes that exist below, with
          additional connections in the upper layer. They are not new averages
          of their clusters.
        </p>
        <p>
          HNSW stores an entry point in its highest layer. In our example that
          is A. Compare the query with A and the nodes linked to it, move toward
          the closest one, then use that node as the starting point below. Click
          Next to reveal the four distances, and Next again to follow the
          selected node down into the full graph.
        </p>
        <SearchLayersWalkthrough />
      </div>

      <div id="keep-routes-exercise" className="lesson-block">
        <h3>4. We have a start. Where should we stop?</h3>
        <p>
          Now we start at P in the bottom layer. Suppose we want{" "}
          <b>k results</b>; for this example, k = 2. Should we take the first
          two neighbors we encounter? Their order does not tell us how close
          they are to the query. A better product might be another edge away,
          through a node we have not explored yet.
        </p>
        <p>
          But if we keep checking every neighbor and every neighbor’s neighbors,
          we could visit the entire graph. That loses the efficiency we wanted.
        </p>
        <div className="search-tradeoff" aria-label="Search effort tradeoff">
          <div>
            <b>Stop sooner</b>
            <p>
              Fewer distance checks, faster answers. A promising route may
              remain unexplored, so closer products can be missed.
            </p>
          </div>
          <div>
            <b>Explore more</b>
            <p>
              Keep more alternatives and give them a chance. This usually
              improves the chance of finding the nearest products, at the cost
              of more work. And also after a certain point, we might not get
              closer nodes than the existing nodes.
            </p>
          </div>
        </div>
        <p>
          We need to remember both the closest products discovered so far and
          the promising places whose neighbors still need checking. Those are
          different jobs, so the search keeps two buckets.
        </p>
      </div>

      <div id="c-admission-rule" className="lesson-block">
        <h3>5. Keep answers and unfinished exploration in two buckets</h3>
        <dl className="term-grid search-terms">
          <div>
            <dt>Best-so-far</dt>
            <dd>
              “Which are the closest nodes I have found?” A limited bucket of
              possible answers, including nodes whose neighbors we have already
              explored.
            </dd>
          </div>
          <div>
            <dt>To-check</dt>
            <dd>
              “Whose neighbors should I explore next?” Pending nodes ordered by
              distance to the query. Always take the closest pending node first.
            </dd>
          </div>
        </dl>
        <p className="search-after-card">
          Put our starting node P into both buckets. When we take a node from
          to-check, remove it from that bucket and inspect its neighbors. Keep
          track of which nodes have already been seen so loops in the graph do
          not make us check the same node again within this layer.
        </p>
        <p>
          For each previously unseen neighbor, measure its distance to the
          query:
        </p>
        <ol className="search-admission-rules">
          <li>
            <b>If best-so-far has room,</b> add the neighbor to both buckets.
            Even a farther node may be worth exploring while there is room for
            alternatives.
            <AdmissionRuleVisual index={0} />
          </li>
          <li>
            <b>
              If best-so-far is full and the new node is closer than its
              farthest member,
            </b>{" "}
            add the new node to both buckets and remove that farthest member
            from best-so-far.
            <AdmissionRuleVisual index={1} />
          </li>
          <li>
            <b>Otherwise, skip the new node.</b> It enters neither bucket, so we
            will not follow its connections in this search.
            <AdmissionRuleVisual index={2} />
          </li>
          <li>
            <p>
              Before exploring the next pending node from to-check bucket,
              compare it with the farthest node in best-so-far. If it is farther
              than the farthest kept node, stop. Every other pending node is at
              least as far away.
            </p>
            <AdmissionRuleVisual index={3} />
          </li>
        </ol>
        <p>
          Removing a node from best-so-far does not automatically remove its
          pending entry from to-check. One bucket tracks possible answers; the
          other tracks unfinished exploration.
        </p>
        <SearchBucketsWalkthrough />
      </div>

      <div id="ef-search-explained" className="lesson-block">
        <h3>6. How Big Should the Best-So-Far Bucket Be?</h3>
        <p>
          The best-so-far capacity is called efSearch We choose <b>efSearch</b>{" "}
          based on <b>recall</b> — how many of the true nearest neighbors HNSW
          manages to find. Start with a small efSearch, then gradually increase
          it and measure recall.
          <br /> <br />
          For example: <br />
          efSearch = 10 → recall 80% <br /> efSearch = 20 → recall 92% <br />
          efSearch = 40 → recall 98%
          <br /> efSearch = 80 → recall 98% <br /> <br />
          At first, increasing efSearch usually improves recall because HNSW
          explores more candidates. But after some point, recall stops
          improving. Increasing efSearch further only makes the search slower
          without finding better results. So the goal is to choose the smallest
          efSearch where recall is already good enough and has mostly stopped
          improving.
        </p>
        <p></p>
      </div>

      <div id="w-per-layer" className="lesson-block">
        <h3>7. Repeat the idea across more layers</h3>
        <p>
          The index layers keeps on increasing when the data points increase.
        </p>
        <SearchLayerSizesVisual />
        {/*<p className="search-source">
          Algorithm reference:{" "}
          <a
            href="https://arxiv.org/abs/1603.09320"
            target="_blank"
            rel="noreferrer"
          >
            Malkov &amp; Yashunin’s HNSW paper
          </a>
          , SEARCH-LAYER and K-NN-SEARCH.
        </p>*/}
        {onStartFirstSearch && (
          <button className="button secondary" onClick={onStartFirstSearch}>
            See it live in Playground →
          </button>
        )}
      </div>
    </section>
  );
}
