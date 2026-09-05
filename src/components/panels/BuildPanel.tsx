import { WORLD } from '../../hnsw/constants'
import { liveNodes } from '../../hnsw/graph'
import { PRESETS, preset, type PresetId } from '../../hnsw/presets'
import { makeRng } from '../../hnsw/rng'
import { useApp, useDispatch, useScript } from '../../state/store'
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
  const currentPreset = preset(dataset.id)
  const rebuild = (id = dataset.id, n = vectorCount || dataset.n) => script([{ t: 'preset', id, n, seed: dataset.seed }])
  const randomPoint = () => { const rng = makeRng((Date.now() ^ state.graph.nextSeq) >>> 0); return [40 + rng() * (WORLD.width - 80), 40 + rng() * (WORLD.height - 80)] as const }

  return <div className="pane-scroll">
    <div className="panel-intro"><h2>Start an experiment</h2><p>1. Pick some dots. 2. Choose Search or Insert. 3. Click the canvas or use a random point.</p></div>
    <div className="section-title">Dataset</div>
    <div className="field"><div className="field-head"><label htmlFor="preset">Shape</label></div><select id="preset" value={dataset.id} onChange={(e) => rebuild(e.target.value as PresetId)}>{PRESETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="hint">{currentPreset.blurb}</p><ControlHelp guide="dataset"/></div>
    <RangeField id="count" label="Vectors" value={vectorCount} min={0} max={400} hint="Use 24–80 while learning so individual routes stay visible." guide="vectors" onChange={(n) => rebuild(dataset.id, n)}/>
    <div className="row"><button className="button secondary compact" onClick={() => rebuild()}>Rebuild same graph</button><button className="button ghost compact" onClick={() => script([{ t: 'clear' }])}>Clear</button></div>

    <div className="section-title">Operation</div>
    <div className="operation-grid"><button className="operation-button" onClick={() => script([{ t: 'tool', tool: 'search' }, { t: 'search', at: [...randomPoint()] }])}><span>Search</span><small>Place a random query</small><b aria-hidden="true">→</b></button><button className="operation-button" onClick={() => script([{ t: 'tool', tool: 'insert' }, { t: 'insert', at: [...randomPoint()] }])}><span>Insert</span><small>Add a random vector</small><b aria-hidden="true">＋</b></button></div>
    <RangeField id="k" label="Results requested (k)" value={k} min={1} max={20} hint="How many nearest dots the search should return." guide="k" onChange={(value) => dispatch({ type: 'setK', k: value })}/>

    <button className="advanced-link" onClick={() => dispatch({ type: 'setRightTab', tab: 'params' })}>Tune search and graph settings <span aria-hidden="true">→</span></button>
  </div>
}
