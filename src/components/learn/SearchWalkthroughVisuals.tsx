import { Visual } from "./Visual";

export function SearchListsVisual() {
  return (
    <Visual title="Possible answers vs. connections left to explore">
      <div id="w-per-layer" className="search-list-pair">
        <div>
          <h4>Best so far</h4>
          <p>The closest matches found so far. These are the items you might return as the answer.</p>
          <span className="search-list-item best">Road-running shoe</span>
          <small>Can stay after its links are explored. Leaves if better matches replace it.</small>
        </div>
        <div>
          <h4>To check</h4>
          <p>Items whose links haven’t been explored yet. Take the closest one first.</p>
          <span className="search-list-item pending">Road-running shoe</span>
          <small>Leaves when taken for exploration. Can stay here even if replaced in Best so far.</small>
        </div>
      </div>
    </Visual>
  );
}
