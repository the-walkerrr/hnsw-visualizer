import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useState } from 'react'
import { WORLD } from '../../hnsw/constants'
import { liveNodes } from '../../hnsw/graph'
import { METRIC_LABEL, METRIC_NOTE } from '../../hnsw/metric'
import { PRESETS, type PresetId } from '../../hnsw/presets'
import { makeRng } from '../../hnsw/rng'
import type { Metric } from '../../hnsw/types'
import { editsLocked, useApp, useDispatch, useScript } from '../../state/store'
import { ControlHelp } from './ControlHelp'
import type { NumericFeedback } from './numericFeedback'
import { Slider } from './Slider'

export function ParamsPanel() {
  const state = useApp()
  const { params } = state
  const dispatch = useDispatch()
  const script = useScript()
  const [feedback, setFeedback] = useState<Record<string, NumericFeedback | undefined>>({})
  const feedbackProps = (id: string) => ({
    feedback: feedback[id],
    onFeedback: (next: NumericFeedback | null) => setFeedback((current) => ({ ...current, [id]: next ?? undefined })),
  })
  const set = (patch: Partial<typeof params>) => dispatch({ type: 'setParams', patch })
  const vectorCount = liveNodes(state.graph).length
  const { dataset } = state
  const [pendingVectorCount, setPendingVectorCount] = useState<number | null>(null)
  const rebuild = (id = dataset.id, n = vectorCount || dataset.n) => script([{ t: 'preset', id, n, seed: dataset.seed }])
  const changeVectorCount = (n: number) => {
    if (state.customGraph && vectorCount > 0) setPendingVectorCount(n)
    else rebuild(dataset.id, n)
  }
  const randomPoint = () => { const rng = makeRng((Date.now() ^ state.graph.nextSeq) >>> 0); return [40 + rng() * (WORLD.width - 80), 40 + rng() * (WORLD.height - 80)] as const }

  return <>
  <fieldset className="pane-scroll panel-fields" disabled={editsLocked(state)}>
    <div className="panel-intro"><p className="section-kicker">Insert</p><h2>Build and add dots.</h2><p>Choose a shape or add a random dot. Each new dot searches first, then connects to its neighborhood.</p></div>
    <div className="field"><div className="field-head"><label htmlFor="preset">Shape</label></div><select id="preset" value={dataset.id} onChange={(e) => rebuild(e.target.value as PresetId)}>{PRESETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ControlHelp guide="dataset"/></div>
    <Slider {...feedbackProps('count')} id="count" label="Vectors" value={vectorCount} min={0} max={400} hint="Use 24–80 while learning so individual routes stay visible. Range: 0–400." guide="vectors" onChange={changeVectorCount}/>
    <div className="row dataset-actions">
      <button className="button secondary compact" onClick={() => script([{ t: 'tool', tool: 'insert' }, { t: 'insert', at: [...randomPoint()] }, { t: 'seek', to: 'end' }])}>Add random dot</button>
    </div>
    <details className="advanced-details"><summary>Graph quality <span>Optional · rebuilds</span></summary><div className="details-body">
      <Slider {...feedbackProps('param-M')} id="param-M" label="Connections kept per dot" value={params.M} min={2} max={24} hint={`More connections create more routes, but make the graph busier. Changing this resets related limits to ${params.M} and ${params.M * 2}, and the layer balance to ${(1 / Math.log(Math.max(params.M, 2))).toFixed(2)}.`} guide="M" onChange={(M) => { setFeedback((current) => ({ ...current, Mmax: undefined, Mmax0: undefined, mL: undefined })); set({ M, Mmax: M, Mmax0: M * 2, mL: 1 / Math.log(Math.max(M, 2)) }) }}/>
      <Slider {...feedbackProps('efc')} id="efc" label="Routes checked while inserting" value={params.efConstruction} min={1} max={200} hint="More checking can create better links, but takes longer." guide="efConstruction" onChange={(efConstruction) => set({ efConstruction })}/>
    <Slider {...feedbackProps('mL')} id="mL" label="Layer multiplier" value={params.mL} min={0.1} max={2} step={0.01} format={(v) => v.toFixed(2)} hint={`Usual value for ${params.M} target connections: ${(1 / Math.log(Math.max(params.M, 2))).toFixed(2)}.`} guide="mL" onChange={(mL) => set({ mL })}/>
    <div className="field"><div className="field-head"><label htmlFor="metric">Distance metric</label></div><select id="metric" value={params.metric} onChange={(e) => set({ metric: e.target.value as Metric })}>{(Object.keys(METRIC_LABEL) as Metric[]).map((metric) => <option key={metric} value={metric}>{METRIC_LABEL[metric]}</option>)}</select><p className="hint">{METRIC_NOTE[params.metric]}</p><ControlHelp guide="metric"/></div>

      <Slider {...feedbackProps('Mmax')} id="Mmax" label="Maximum connections above the base layer" value={params.Mmax} min={params.M} max={32} hint={`Hard edge limit; cannot be lower than the target (${params.M}).`} guide="Mmax" onChange={(Mmax) => set({ Mmax })}/>
      <Slider {...feedbackProps('Mmax0')} id="Mmax0" label="Maximum connections on the base layer" value={params.Mmax0} min={params.M} max={64} hint="Hard edge limit on the bottom layer; usually twice the target connections." guide="Mmax0" onChange={(Mmax0) => set({ Mmax0 })}/>
      <Slider {...feedbackProps('seed')} id="seed" label="Level random seed" value={params.seed} min={1} max={200} hint="A repeatable way to reshuffle random layer assignments." guide="seed" onChange={(seed) => set({ seed })}/>
      <div className="field"><span className="field-label">Neighbor selection</span><div className="segmented full" role="group" aria-label="Selection rule">{(['heuristic', 'simple'] as const).map((rule) => <button key={rule} aria-pressed={params.neighborRule === rule} onClick={() => set({ neighborRule: rule })}>{rule}</button>)}</div><p className="hint">{params.neighborRule === 'heuristic' ? 'Keeps edges pointing in different directions.' : 'Keeps only the nearest candidates.'}</p><ControlHelp guide="neighborRule"/></div>
      <div className="field switch-field"><label className="checkline"><input type="checkbox" checked={params.extendCandidates} onChange={(e) => set({ extendCandidates: e.target.checked })}/><span><b>Extend candidates</b><small>Also consider neighbors of candidates.</small></span></label><ControlHelp guide="extendCandidates"/></div>
      <div className="field switch-field"><label className="checkline"><input type="checkbox" checked={params.keepPrunedConnections} onChange={(e) => set({ keepPrunedConnections: e.target.checked })}/><span><b>Keep pruned connections</b><small>Use rejected candidates to fill empty edge slots.</small></span></label><ControlHelp guide="keepPrunedConnections"/></div>
    </div></details>
  </fieldset>
  <AlertDialog.Root open={pendingVectorCount !== null} onOpenChange={(open) => { if (!open) setPendingVectorCount(null) }}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="dialog-overlay" />
      <AlertDialog.Content className="dialog-content">
        <AlertDialog.Title className="dialog-title">Replace your custom graph?</AlertDialog.Title>
        <AlertDialog.Description className="dialog-description">
          {pendingVectorCount === 0
            ? 'Setting Vectors to 0 removes every current dot, edge, and replay. Your custom graph cannot be restored.'
            : `Setting Vectors to ${pendingVectorCount ?? vectorCount} replaces every current dot, edge, and replay with ${pendingVectorCount ?? vectorCount} newly generated ${dataset.id} vectors inserted into a new graph. Your custom layout cannot be restored.`}
        </AlertDialog.Description>
        <div className="dialog-actions">
          <AlertDialog.Cancel asChild><button className="button compact">Keep custom graph</button></AlertDialog.Cancel>
          <AlertDialog.Action asChild><button className="button compact danger" onClick={() => {
            if (pendingVectorCount !== null) rebuild(dataset.id, pendingVectorCount)
            setPendingVectorCount(null)
          }}>Replace graph</button></AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
  </>
}
