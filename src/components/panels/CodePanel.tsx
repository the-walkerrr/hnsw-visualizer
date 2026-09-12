import { followLearnReference } from '../../learnReferenceNavigation'

export function CodePanel() {
  return <div className="pane-scroll panel-intro">
    <p className="section-kicker">Moved to Learn</p>
    <h2>Algorithm steps now have their own reading section.</h2>
    <p>The pseudocode is easier to follow after the visual explanation of search, insert, and delete.</p>
    <a className="button secondary" href="/learn#algorithm-steps" data-learn-reference onClick={followLearnReference}>Open algorithm steps →</a>
  </div>
}
