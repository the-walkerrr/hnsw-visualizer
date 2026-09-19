export function PracticeChapter({
  onOpenPlayground,
}: {
  onOpenPlayground: () => void;
}) {
  return (
    <section id="chapter-practice" className="guide-chapter">
      <header className="chapter-heading">
        <span>05</span>
        <div>
          <p className="section-kicker">Try it</p>
          <h2>Change one thing at a time.</h2>
          <p>
            Reading only gets you so far — this is where it actually clicks.
            Tweak one control, then watch what happens.
          </p>
        </div>
      </header>
      <div className="lesson-block practice-grid">
        <div>
          <b>1 · Search</b>
          <p>
            Place a target and step forward. Watch the route move from an
            overview layer to the full graph.
          </p>
        </div>
        <div>
          <b>2 · Compare</b>
          <p>
            Keep the same target, open a few more search routes, and see
            whether the result improves.
          </p>
        </div>
        <div>
          <b>3 · Insert</b>
          <p>
            Add one dot. Notice that it searches for a neighborhood before
            creating links.
          </p>
        </div>
        <div>
          <b>4 · Delete</b>
          <p>
            Soft-delete a dot, then search again. The route may still pass
            through it, but it will not appear in the results.
          </p>
        </div>
        <button
          className="button primary learn-open-playground"
          onClick={onOpenPlayground}
        >
          Open Playground →
        </button>
      </div>
    </section>
  );
}
