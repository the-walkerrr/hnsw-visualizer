import { CONTROL_GUIDES, type ControlGuideKey } from '../../lessons/controlGuides'
import { followLearnReference } from '../../learnReferenceNavigation'

export function ControlHelp({ guide: key }: { guide: ControlGuideKey }) {
  const guide = CONTROL_GUIDES[key]
  const href = `/learn#${guide.id}`
  return (
    <details className="control-help">
      <summary>What does this change?</summary>
      <div className="control-help-body">
        <p>{guide.plain}</p>
        <dl>
          {guide.inputs.map((input) => <div key={input.label}><dt>{input.label}</dt><dd>{input.explanation}</dd></div>)}
        </dl>
        <p className="control-timing">{guide.when}</p>
        <a href={href} data-learn-reference onClick={followLearnReference}>Read the full explanation in Learn <span aria-hidden="true">→</span></a>
      </div>
    </details>
  )
}
