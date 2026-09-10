import { WORLD } from '../../hnsw/constants'
import { liveNodes } from '../../hnsw/graph'
import { PRESETS, type PresetId } from '../../hnsw/presets'
import { makeRng } from '../../hnsw/rng'
import { editsLocked, useApp, useDispatch, useScript } from '../../state/store'
import { ControlHelp } from './ControlHelp'

function RangeField({ id, label, value, min, max, hint, guide, onChange }: { id: string; label: string; value: number; min: number; max: number; hint: string; guide: 'vectors' | 'k'; onChange: (value: number) => void }) {
  return <div className="field"><div className="field-head"><label htmlFor={id}>{label}</label><input className="number-control" type="number" aria-label={`${label} value`} min={min} max={max} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}/></div><input id={id} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}/><p className="hint">{hint}</p><ControlHelp guide={guide}/></div>
}

export function BuildPanel() {
  const state = useApp()
  const dispatch = useDispatch()
  const script = useScript()
  const { dataset, k } = state
  const vectorCount = liveNodes(state.graph).length
  const rebuild = (id = dataset.id, n = vectorCount || dataset.n) => script([{ t: 'preset', id, n, seed: dataset.seed }])
  const randomPoint = () => { const rng = makeRng((Date.now() ^ state.graph.nextSeq) >>> 0); return [40 + rng() * (WORLD.width - 80), 40 + rng() * (WORLD.height - 80)] as const }

  return <fieldset className="pane-scroll panel-fields" disabled={editsLocked(state)}>
    <div className="panel-intro"><p className="section-kicker">Start here</p><h2>Find the closest dots.</h2><p>Choose a spot on the canvas, or let us pick one.</p></div>
    <button className="button primary run-search" disabled={!vectorCount} onClick={() => script([{ t: 'tool', tool: 'search' }, { t: 'search', at: [...randomPoint()] }])}>Run a search <span aria-hidden="true">→</span></button>
    <p className="search-next">{vectorCount ? 'Then press Play below the graph to watch it work.' : 'Add dots below to start searching.'}</p>
    <RangeField id="k" label="Results requested (k)" value={k} min={1} max={20} hint="How many close matches do you want?" guide="k" onChange={(value) => dispatch({ type: 'setK', k: value })}/>
    <details className="advanced-details" open={vectorCount === 0 ? true : undefined}><summary>Change the dots <span>{vectorCount} dots</span></summary><div className="details-body">
    <div className="field"><div className="field-head"><label htmlFor="preset">Shape</label></div><select id="preset" value={dataset.id} onChange={(e) => rebuild(e.target.value as PresetId)}>{PRESETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ControlHelp guide="dataset"/></div>
    <RangeField id="count" label="Vectors" value={vectorCount} min={0} max={400} hint="Use 24–80 while learning so individual routes stay visible." guide="vectors" onChange={(n) => rebuild(dataset.id, n)}/>
    <div className="row"><button className="button secondary compact" onClick={() => script([{ t: 'tool', tool: 'insert' }, { t: 'insert', at: [...randomPoint()] }])}>Add one dot</button><button className="button ghost compact" onClick={() => script([{ t: 'clear' }])}>Clear dots</button></div>
    </div></details>
    <div className="explore-tip"><b>Curious about accuracy?</b><p>Try a different search effort in Tune, then run another search.</p><button className="advanced-link" onClick={() => dispatch({ type: 'setRightTab', tab: 'params' })}>Adjust search effort →</button></div>
  </fieldset>
}
