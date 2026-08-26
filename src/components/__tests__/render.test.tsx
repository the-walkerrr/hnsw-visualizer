import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import App from '../../App'
import { emptyGraph } from '../../hnsw/graph'
import {
  DispatchCtx,
  StateCtx,
  initialState,
  reducer,
  type AppState,
  type RightTab,
  type ScriptOp,
} from '../../state/store'
import { CanvasToolbar } from '../CanvasToolbar'
import { Explainer } from '../Explainer'
import { GraphCanvas } from '../GraphCanvas'
import { LessonPanel } from '../LessonPanel'
import { Transport } from '../Transport'
import { BuildPanel } from '../panels/BuildPanel'
import { CodePanel } from '../panels/CodePanel'
import { LabPanel } from '../panels/LabPanel'
import { MetricsPanel } from '../panels/MetricsPanel'
import { NodePanel } from '../panels/NodePanel'
import { ParamsPanel } from '../panels/ParamsPanel'

/** Render a component against an exact app state. renderToStaticMarkup runs the
 *  whole component tree without a DOM, which is all that is needed to catch
 *  render-time crashes across every combination of algorithm state. */
function render(state: AppState, el: ReactElement): string {
  return renderToStaticMarkup(
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={() => {}}>{el}</DispatchCtx.Provider>
    </StateCtx.Provider>,
  )
}

const script = (state: AppState, ops: ScriptOp[]) => reducer(state, { type: 'script', ops })

const PANELS: Array<[RightTab, () => ReactElement]> = [
  ['build', () => <BuildPanel />],
  ['params', () => <ParamsPanel />],
  ['code', () => <CodePanel />],
  ['node', () => <NodePanel />],
  ['metrics', () => <MetricsPanel />],
  ['lab', () => <LabPanel />],
]

const SCENARIOS: Array<[string, AppState]> = [
  ['default', initialState()],
  ['empty index', script(initialState(), [{ t: 'clear' }])],
  ['mid-search', script(initialState(), [{ t: 'search', at: [500, 320] }])],
  ['mid-insert', script(initialState(), [{ t: 'insert', at: [500, 320] }])],
  [
    'mid-hard-delete',
    script(initialState(), [{ t: 'deleteNearest', at: [232, 172], mode: 'hard' }]),
  ],
  [
    'with tombstones',
    script(initialState(), [
      { t: 'deleteNearest', at: [232, 172], mode: 'soft' },
      { t: 'deleteNearest', at: [250, 150], mode: 'soft' },
    ]),
  ],
  [
    'mid-in-place-update',
    script(initialState(), [
      { t: 'updateNearest', at: [232, 172], to: [760, 470], mode: 'in-place' },
    ]),
  ],
  ['single-layer view', script(initialState(), [{ t: 'view', mode: 'layer', layer: 0 }])],
  [
    'node selected',
    script(initialState(), [{ t: 'selectNearest', at: [232, 172] }]),
  ],
  ['cosine metric', script(initialState(), [{ t: 'params', patch: { metric: 'cosine' } }])],
  [
    'simple selection, tiny M',
    script(initialState(), [
      { t: 'params', patch: { neighborRule: 'simple', M: 2, Mmax: 2, Mmax0: 3 } },
    ]),
  ],
]

describe('render smoke', () => {
  it('the whole app renders', () => {
    const html = renderToStaticMarkup(<StoreLess />)
    expect(html).toContain('HNSW Explorer')
    expect(html).toContain('all layers')
  })

  it.each(SCENARIOS)('canvas + transport + explainer render: %s', (_name, state) => {
    const els = [
      <GraphCanvas key="canvas" />,
      <Transport key="transport" />,
      <Explainer key="explainer" />,
      <CanvasToolbar key="toolbar" />,
    ]
    for (const el of els) {
      expect(render(state, el).length).toBeGreaterThan(0)
    }
  })

  it.each(SCENARIOS)('every right-hand panel renders: %s', (_name, state) => {
    for (const [tab, make] of PANELS) {
      const html = render({ ...state, rightTab: tab }, make())
      expect(html.length, tab).toBeGreaterThan(0)
    }
  })

  it('every step of an insert trace renders', () => {
    const s = script(initialState(), [{ t: 'insert', at: [500, 320] }])
    expect(s.trace!.steps.length).toBeGreaterThan(10)
    for (const [i] of s.trace!.steps.entries()) {
      expect(render({ ...s, step: i }, <GraphCanvas />).length, `step ${i}`).toBeGreaterThan(0)
      expect(render({ ...s, step: i }, <Explainer />)).toContain('</p>')
    }
  })

  it('every step of a search trace renders in both view modes', () => {
    const s = script(initialState(), [{ t: 'search', at: [500, 320] }])
    for (const [i] of s.trace!.steps.entries()) {
      for (const mode of ['stack', 'layer'] as const) {
        expect(
          render({ ...s, step: i, viewMode: mode }, <GraphCanvas />).length,
          `step ${i} ${mode}`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('every step of a hard delete renders, including the entry-point promotion', () => {
    const base = initialState()
    const s = reducer(base, { type: 'deleteNode', id: base.graph.entry!, mode: 'hard' })
    for (const [i] of s.trace!.steps.entries()) {
      expect(render({ ...s, step: i }, <GraphCanvas />).length, `step ${i}`).toBeGreaterThan(0)
    }
  })

  it('an empty graph renders every panel without an entry point', () => {
    const s: AppState = { ...initialState(), graph: emptyGraph(), trace: null, selected: null }
    for (const [tab, make] of PANELS) {
      expect(render({ ...s, rightTab: tab }, make()).length, tab).toBeGreaterThan(0)
    }
    expect(render(s, <GraphCanvas />)).toContain('svg')
  })

  it('every lesson step renders its panel content', () => {
    let s = initialState()
    for (let lesson = 0; lesson < 10; lesson++) {
      for (let step = 0; step < 4; step++) {
        s = { ...s, lesson, lessonStep: step }
        const html = render(s, <LessonPanel />)
        expect(html, `lesson ${lesson} step ${step}`).toContain('Lesson')
      }
    }
  })
})

/** The real App needs the provider, which owns its own state. */
function StoreLess() {
  const state = initialState()
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={() => {}}>
        <App />
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}
