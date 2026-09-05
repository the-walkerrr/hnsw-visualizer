import { CONTROL_GUIDES, type ControlGuideKey } from '../../lessons/controlGuides'

export function ControlHelp({ guide: key }: { guide: ControlGuideKey }) {
  const guide = CONTROL_GUIDES[key]
  const href = `/learn#${guide.id}`
  return (
    <details className="control-help">
      <summary>What does this change?</summary>
      <div className="control-help-body">
        <p>{guide.plain}</p>
        <dl>
          <div><dt>Decrease / off</dt><dd>{guide.lower}</dd></div>
          <div><dt>Increase / on</dt><dd>{guide.higher}</dd></div>
        </dl>
        <p className="control-timing">{guide.when}</p>
        <a href={href} onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          window.history.pushState({}, '', href)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}>Read the full explanation in Learn <span aria-hidden="true">→</span></a>
      </div>
    </details>
  )
}
