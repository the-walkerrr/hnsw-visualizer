import { LayersVisual } from "./LayersVisual";
import { SearchWidthVisual } from "./SearchWidthVisual";

export function SearchChapter({
  onStartFirstSearch,
}: {
  onStartFirstSearch?: () => void;
}) {
  return (
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
            As we saw earlier, HNSW starts at the top layer and moves down,
            getting closer to the query at each step. At the bottom layer, it
            explores the nearby nodes more carefully to find the closest
            matches. A few parameters control how thorough this search is. For
            now, assume the graph is already built—we’ll cover how HNSW builds
            it in the next section.
          </p>
        </div>
      </header>
      <div className="lesson-block">
        <LayersVisual />
        <span id="keep-routes-exercise" className="anchor-alias" />
        <h2>But what parameters decides a good search?</h2>
        <p>
          Imagine you’re looking for the best mangoes in a huge orchard
          connected to each other like a graph, but your basket can only hold a
          limited number at a time.
        </p>

        <p>
          You find a good mango and keep it in your best mangoes basket. But
          finding a good mango gives you another idea: What if there are even
          better mangoes near this one? So you also want to remember that this
          mango's neighborhood still needs to be explored.
        </p>
        <p>
          Now we have two different questions to answer: Which are the best
          mangoes I’ve found so far? Which mangoes neighbors should I explore
          next?
        </p>
        <p>
          Trying to use one basket for both jobs gets messy, so HNSW keeps two.
          The first is the <b>best-so-far</b> basket. It keeps the best mangoes
          you currently know about. If it is full and you find a better mango,
          the worst one gets removed. The second is the <b>to-check</b> basket.
          It keeps promising mangoes whose neighbors may still be worth
          exploring. Whenever we find a good mango that can be added to{" "}
          <b>best-so-far</b> basket, we add it to the
          <b>to-check</b> basket as well. Then we repeatedly take the best mango
          from
          <b>to-check</b> basket, remove it, and explore its neighbors. And the
          two baskets don't always contain the same mangoes. A mango might get
          pushed out of the best-so-far basket when better ones are found, while
          it can still remain in the to-check basket until HNSW decides whether
          exploring it is worthwhile.
        </p>

        <ol className="explanation-steps">
          <li>
            <span>
              It might be one of the best mangoes you've found so far, so you
              keep it in your <b>best mangoes basket</b>.
            </span>
          </li>

          <li>
            <span>
              Its nearby mangoes might also be good, so you still need to{" "}
              <b>explore its neighbors</b>.
            </span>
          </li>
        </ol>

        <p>But now there's a new problem:</p>

        <p>
          <b>
            How do we remember which good mangoes still need to have their
            neighbors checked?
          </b>
        </p>

        <p>
          So we keep a second bucket: the <b>to-check bucket</b>.
        </p>

        <p>
          When we find a promising mango, we add it to this bucket. Later, we
          pick the most promising mango from the bucket, check its neighbors,
          and then remove it because we're done exploring around it.
        </p>

        <p>So the two buckets have different jobs:</p>

        <ul className="explanation-steps">
          <li>
            <b>Best-so-far basket:</b>{" "}
            <span>"Which are the best mangoes I've found?"</span>
          </li>
          <li>
            <b>To-check bucket:</b>{" "}
            <span>
              "Which promising mangoes do I still need to explore around?"
            </span>
          </li>
        </ul>

        <p>
          A mango can be in both at the same time: it can be one of your best
          mangoes <b>and</b> still have unexplored neighbors.
        </p>
        {onStartFirstSearch && (
          <button className="button secondary" onClick={onStartFirstSearch}>
            See it live in Playground →
          </button>
        )}
        {/*<SearchWidthVisual />*/}
        {/*{onStartFirstSearch && (
          <aside className="try-panel desktop-lesson-action">
            <div>
              <span>LEARN BY DOING</span>
              <h3>Watch one search in Playground</h3>
              <p>
                Follow the route one step at a time and see when the search
                keeps or skips a dot.
              </p>
            </div>
            <button className="button primary" onClick={onStartFirstSearch}>
              Start guided search →
            </button>
          </aside>
        )}*/}
      </div>
    </section>
  );
}
