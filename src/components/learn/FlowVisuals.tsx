export function InsertVisual() {
  return (
    <div className="learn-flow" aria-label="The three parts of inserting a dot">
      <div>
        <span>1</span>
        <b>Search</b>
        <p>Use the existing graph to find the new dot’s neighborhood.</p>
      </div>
      <div>
        <span>2</span>
        <b>Connect</b>
        <p>Link the new dot to a few useful nearby dots.</p>
      </div>
      <div>
        <span>3</span>
        <b>Tidy</b>
        <p>Trim crowded links so the graph stays easy to navigate.</p>
      </div>
    </div>
  );
}

export function LevelDrawVisual() {
  return (
    <div
      className="learn-flow"
      aria-label="How a new dot picks which layers it joins"
    >
      <div>
        <span>1</span>
        <b>Start on the bottom layer</b>
        <p>Every new dot lands here — this is where every dot lives.</p>
      </div>
      <div>
        <span>2</span>
        <b>Flip a coin</b>
        <p>Heads, it climbs one layer higher. Tails, it stops right here.</p>
      </div>
      <div>
        <span>3</span>
        <b>Keep flipping</b>
        <p>
          Every win earns another flip. Most dots stop after the very first one.
        </p>
      </div>
    </div>
  );
}

export function DeleteVisual() {
  return (
    <div
      className="learn-flow"
      aria-label="The three parts of soft-deleting a dot"
    >
      <div>
        <span>1</span>
        <b>Mark</b>
        <p>Flag the dot as deleted instead of erasing it immediately.</p>
      </div>
      <div>
        <span>2</span>
        <b>Hide</b>
        <p>Stop returning the dot as a search result.</p>
      </div>
      <div>
        <span>3</span>
        <b>Keep the route</b>
        <p>Leave its links in place so searches can still pass through it.</p>
      </div>
    </div>
  );
}
