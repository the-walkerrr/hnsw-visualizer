import { InsertVisual, LevelDrawVisual } from "./FlowVisuals";

export function InsertChapter() {
  return (
    <section id="chapter-insert" className="guide-chapter">
      <span id="lesson-4" className="anchor-alias" />
      <header className="chapter-heading">
        <span>03</span>
        <div>
          <p className="section-kicker">Insert</p>
          <h2>A new dot searches first, then connects.</h2>
          <p>
            Adding a new item is like moving into a neighborhood: you scope
            out who already lives nearby before deciding who to connect with.
            Insertion reuses the very search you just learned to find the
            new dot a good neighborhood.
          </p>
        </div>
      </header>
      <div className="lesson-block">
        <InsertVisual />
        <div className="simple-callout">
          <b>The useful connection</b>
          <p>
            Search asks, “Which stored dots are near this request?” Insert
            asks the same question for a new dot, then turns a few of those
            answers into links.
          </p>
        </div>
        <div className="simple-callout">
          <b>Which layers does it join?</b>
          <p>
            Before connecting, a new dot flips a coin to decide how high it
            climbs — heads, it keeps going; tails, it stops. Most dots land
            tails on the first flip and stay on the bottom layer; a rare few
            keep winning and become the shortcuts Search relies on. It’s
            pure chance, never a judgment about the dot.
          </p>
        </div>
        <LevelDrawVisual />
      </div>
    </section>
  );
}
