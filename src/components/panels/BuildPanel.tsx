import { liveNodes } from '../../hnsw/graph'
import { editsLocked, useApp, useDispatch } from '../../state/store'
import { RangeField } from './RangeField'

export function BuildPanel() {
  const state = useApp()
  const dispatch = useDispatch()
  const { k, params } = state
  const vectorCount = liveNodes(state.graph).length

  return <fieldset className="pane-scroll panel-fields" disabled={editsLocked(state)}>
    <div className="panel-intro"><p className="section-kicker">Search</p><h2>Find nearby dots.</h2><p>Choose how many results you want, then place a target on the graph.</p></div>
    {!vectorCount && <div className="note"><p>Add dots before searching.</p><button className="button secondary compact" onClick={() => dispatch({ type: 'setTool', tool: 'insert' })}>Open Insert →</button></div>}
    {!!vectorCount && state.tool !== 'search' && <div className="note canvas-tool-status"><p>Select Search above the graph to place a target.</p><button className="button secondary compact" onClick={() => dispatch({ type: 'setTool', tool: 'search' })}>Use Search tool</button></div>}
    <RangeField id="k" label="Number of results requested" value={k} min={1} max={20} onChange={(value) => dispatch({ type: 'setK', k: value })}/>
    <RangeField id="param-efs" label="Routes kept open" value={params.efSearch} min={1} max={200} hint="More routes can find better matches, but take more work." guide="efSearch" onChange={(efSearch) => dispatch({ type: 'setParams', patch: { efSearch } })}/>
    {k > vectorCount && vectorCount > 0 && <p className="note" role="status">You requested {k} matches, but only {vectorCount} live {vectorCount === 1 ? 'dot is' : 'dots are'} available. At most {vectorCount} can be returned.</p>}
  </fieldset>
}
