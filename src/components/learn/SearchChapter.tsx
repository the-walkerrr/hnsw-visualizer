import {
  ProductGraphVisual,
  SearchBucketsWalkthrough,
  SearchLayersWalkthrough,
  SearchLayerSizesVisual,
} from "./SearchAlgorithmVisuals";

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
          <h2>Find nearby products without checking everything</h2>
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
          <b> Where do we stop, and what do we give up when we stop sooner?</b>
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
              of more work.
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
          to-check, remove it from that bucket and inspect its neighbors. It can
          stay in best-so-far: finishing its exploration does not make it a
          worse answer. Keep track of which nodes have already been seen so
          loops in the graph do not make us check the same node again within
          this layer.
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
          </li>
          <li>
            <b>
              If best-so-far is full and the new node is closer than its
              farthest member,
            </b>{" "}
            add the new node to both buckets and remove that farthest member
            from best-so-far.
          </li>
          <li>
            <b>Otherwise, skip the new node.</b> It enters neither bucket, so we
            will not follow its connections in this search.
          </li>
        </ol>
        <p>
          Removing a node from best-so-far does not automatically remove its
          pending entry from to-check. One bucket tracks possible answers; the
          other tracks unfinished exploration. Watch them separate as better
          nodes arrive below.
        </p>
        <SearchBucketsWalkthrough />
      </div>

      <div id="ef-search-explained" className="lesson-block">
        <h3>6. Configure the room for alternatives</h3>
        <p>
          The bottom layer’s <b>best-so-far capacity is called efSearch</b>. It
          is separate from k: k says how many answers to return; efSearch says
          how many promising nodes to retain during the search. Our walkthrough
          keeps three candidates but returns only the closest two. Choose a
          capacity of at least k; this visualizer enforces that minimum.
        </p>
        <p>
          A small capacity fills quickly, so a new node must be quite close to
          earn a place. That prunes exploration sooner. With more slots, farther
          candidates can remain useful routes to undiscovered neighbors. The
          search typically does more distance checks, but has a better chance of
          finding the true nearest products. Increasing the capacity is not a
          promise that every query’s answer will improve.
        </p>
        <p>
          This number limits best-so-far, <b>not the total nodes visited</b> or
          the size of to-check. Slots can be reused many times as closer nodes
          replace farther ones. To-check can also retain candidates that have
          since left best-so-far.
        </p>
        <h3 className="lesson-subheading">The stopping comparison</h3>
        <p>
          Before exploring the next pending node, compare its distance with the
          farthest node in best-so-far. If the closest pending node is already
          <b> farther than the farthest kept node</b>, stop. All other pending
          nodes are at least as far away, so none of those nodes themselves
          would improve our kept set. A tie does not trigger this stopping rule.
          Also stop if to-check becomes empty after finishing the current node’s
          neighbors.
        </p>
        <div
          className="search-stop-comparison"
          aria-label="Example stopping comparison"
        >
          <div>
            <small>Closest pending</small>
            <b>Q · 5.3</b>
          </div>
          <span aria-hidden="true">&gt;</span>
          <div>
            <small>Farthest kept</small>
            <b>S · 5.0</b>
          </div>
          <p>Stop expanding. Return the closest k from best-so-far.</p>
        </div>
        <p>
          Notice what this does <em>not</em> prove: an unvisited neighbor beyond
          a farther pending node could still be closer to the query. The rule
          saves work by deciding those routes are no longer promising enough.
          This is why HNSW gives <b>approximate nearest neighbors</b>, and why
          allowing a larger best-so-far bucket can help.
        </p>
      </div>

      <div id="w-per-layer" className="lesson-block">
        <h3>7. Repeat the idea across more layers</h3>
        <p>
          A huge graph can have several upper layers, with fewer nodes as we go
          up. Start at the highest layer’s stored entry point, follow
          connections toward the query, then descend using the closest node
          found. Repeat until reaching the bottom layer, where every product is
          available.
        </p>
        <SearchLayerSizesVisual />
        <p>
          For a standard HNSW query,{" "}
          <b>best-so-far has capacity 1 on every upper layer</b>. We only need
          one useful entry point for the next layer. Keeping just the closest
          node found makes these passes fast: accept a neighbor only if it
          improves the current best distance, and stop when no pending node can
          improve that position. One slot does not mean one distance
          calculation; the search can follow several improving steps.
        </p>
        <p>
          At the bottom, use the larger efSearch capacity. This is where we
          spend the effort to retain alternative routes and collect k good
          results. Each layer starts fresh buckets seeded with the node carried
          down; the query stays the same throughout the search.
        </p>
        <p className="search-source">
          Algorithm reference:{" "}
          <a
            href="https://arxiv.org/abs/1603.09320"
            target="_blank"
            rel="noreferrer"
          >
            Malkov &amp; Yashunin’s HNSW paper
          </a>
          , SEARCH-LAYER and K-NN-SEARCH.
        </p>
        {onStartFirstSearch && (
          <button className="button secondary" onClick={onStartFirstSearch}>
            See it live in Playground →
          </button>
        )}
      </div>
    </section>
  );
}
