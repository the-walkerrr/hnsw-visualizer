import { CONTROL_GUIDES, type ControlGuideKey } from '../lessons/controlGuides'
import { followLearnReference } from '../learnReferenceNavigation'

export function ParameterLink({ name, label }: { name: ControlGuideKey; label?: string }) {
  const guide = CONTROL_GUIDES[name]
  return <a className="parameter-ref" href={`/learn#${guide.id}`} title={`Open the ${guide.label} reference`} data-learn-reference onClick={followLearnReference}><code>{label ?? name}</code><span aria-hidden="true">↗</span></a>
}
