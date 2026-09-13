import { CONTROL_GUIDES, type ControlGuideKey } from '../../lessons/controlGuides'
import { followLearnReference } from '../../learnReferenceNavigation'

export function ControlHelp({ guide: key }: { guide: ControlGuideKey }) {
  const guide = CONTROL_GUIDES[key]
  const href = `/learn#${guide.id}`
  return (
    <a className="control-help-link" href={href} data-learn-reference onClick={followLearnReference}>
      Learn how {guide.label} works <span aria-hidden="true">→</span>
    </a>
  )
}
