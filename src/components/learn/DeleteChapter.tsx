import { DeleteVisual } from "./FlowVisuals";

export function DeleteChapter() {
  return (
    <section id="chapter-delete" className="guide-chapter">
      <span id="soft-delete" className="anchor-alias" />
      <header className="chapter-heading">
        <span>04</span>
        <div>
          <p className="section-kicker">Delete</p>
          <h2>A deleted dot can still guide the search.</h2>
          <p>
            Think of a shop closed for renovation but still standing — you
            can walk past it to reach other stores, just not buy anything. A
            soft delete works the same way: the dot’s paths stay open for
            searches to pass through, but it won’t be returned as a result.
          </p>
        </div>
      </header>
      <div className="lesson-block">
        <DeleteVisual />
        <div id="hard-delete" className="simple-callout">
          <b>When should the dot disappear completely?</b>
          <p>
            A hard delete actually demolishes the shop and reroutes the
            street around the gap — it frees the space for good, with no
            undo. A soft-deleted dot, by contrast, can simply reopen.
          </p>
        </div>
      </div>
    </section>
  );
}
