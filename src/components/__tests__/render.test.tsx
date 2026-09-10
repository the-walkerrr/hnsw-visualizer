import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import App from '../../App'
import { emptyGraph } from '../../hnsw/graph'
import { CONTROL_GUIDES } from '../../lessons/controlGuides'
import {
  DispatchCtx,
  StateCtx,
  initialState,
  playgroundEntryActions,
  reducer,
  type AppState,
  type RightTab,
  type ScriptOp,
} from '../../state/store'
import { CanvasToolbar } from '../CanvasToolbar'
import { Explainer } from '../Explainer'
import { ExplanationPage } from '../ExplanationPage'
import { GraphCanvas } from '../GraphCanvas'
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
const seededState = () => script(initialState(), [{ t: 'preset', id: 'clusters', n: 48, seed: 7 }])

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
  ['seeded graph', seededState()],
  ['mid-search', script(seededState(), [{ t: 'search', at: [500, 320] }])],
  ['mid-insert', script(initialState(), [{ t: 'insert', at: [500, 320] }])],
  [
    'mid-hard-delete',
    script(seededState(), [{ t: 'deleteNearest', at: [232, 172], mode: 'hard' }]),
  ],
  [
    'with tombstones',
    script(seededState(), [
      { t: 'deleteNearest', at: [232, 172], mode: 'soft' },
      { t: 'deleteNearest', at: [250, 150], mode: 'soft' },
    ]),
  ],
  [
    'mid-in-place-update',
    script(seededState(), [
      { t: 'updateNearest', at: [232, 172], to: [760, 470], mode: 'in-place' },
    ]),
  ],
  ['single-layer view', script(initialState(), [{ t: 'view', mode: 'layer', layer: 0 }])],
  [
    'node selected',
    script(seededState(), [{ t: 'selectNearest', at: [232, 172] }]),
  ],
  ['cosine metric', script(seededState(), [{ t: 'params', patch: { metric: 'cosine' } }])],
  [
    'simple selection, tiny M',
    script(seededState(), [
      { t: 'params', patch: { neighborRule: 'simple', M: 2, Mmax: 2, Mmax0: 3 } },
    ]),
  ],
]

describe('render smoke', () => {
  it('the whole app renders', () => {
    const html = renderToStaticMarkup(<StoreLess />)
    expect(html).toContain('HNSW Explorer')
    expect(html).toContain('Learn')
    expect(html).toContain('Open playground')
    expect(html).toContain('Read the mobile-friendly guide')
  })

  it('shows concise guidance in the setup and replay surfaces', () => {
    expect(render(initialState(), <BuildPanel />)).toContain('Run a search')
    expect(render(initialState(), <Transport />)).toContain('Run a search to begin')
    expect(render(initialState(), <Explainer onOpenExplanation={() => {}} />)).toContain('Learn the basics')
  })

  it('presents the concepts as titled chapters before the optional control reference', () => {
    const html = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} />)
    expect(html).toContain('A visual guide to HNSW')
    expect(html).toContain('First, turn similarity into a map')
    expect(html).toContain('A search repeatedly asks one question')
    expect(html).toContain('Spend more work to miss less often')
    expect(html).toContain('Every new vector finds its own place')
    expect(html.indexOf('First, turn similarity into a map')).toBeLessThan(html.indexOf('Optional reference'))
    expect(html.match(/<figure/g)?.length).toBeGreaterThanOrEqual(4)
    const visibleText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(visibleText).not.toMatch(/\b(?:Params|Code|Metrics) tab\b/)
  })

  it('gives every adjustable control a Learn anchor and input-specific explanations', () => {
    const learn = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} />)
    const panels = `${render(initialState(), <BuildPanel />)}${render(initialState(), <ParamsPanel />)}`
    for (const guide of Object.values(CONTROL_GUIDES)) {
      expect(learn, guide.label).toContain(`id="${guide.id}"`)
      expect(panels, guide.label).toContain(`href="/learn#${guide.id}"`)
    }
    expect(learn).not.toContain('Decrease / off')
    expect(learn).not.toContain('Increase / on')
    expect(learn).toContain('Input: 2–24')
    expect(learn).toContain('Euclidean (L2)')
    expect(learn).toContain('Two moons')
    expect(learn).toContain('href="#lesson-4"')
    expect(learn).toContain('See how efConstruction is used during insertion')
    expect(learn).toContain('href="#lesson-6"')
    expect(learn).toContain('See how efSearch controls a query')
    expect(panels).not.toContain('Decrease / off')
    expect(panels).not.toContain('Increase / on')
    expect(panels).toContain('Input: 2–24')
    expect(panels).toContain('Euclidean (L2)')
    expect(panels).toContain('Two moons')
  })

  it('shows the live vector count in the build panel', () => {
    expect(render(initialState(), <BuildPanel />)).toContain('aria-label="Vectors value" min="0" max="400" value="0"')
    const inserted = script(initialState(), [{ t: 'insert', at: [500, 320] }])
    expect(render(inserted, <BuildPanel />)).toContain('aria-label="Vectors value" min="0" max="400" value="1"')
  })

  it('keeps ordinary playground entry empty and seeds only the guided first search', () => {
    const empty = initialState()
    const direct = playgroundEntryActions(empty, 'empty').reduce(reducer, empty)
    expect(direct.graph.nodes.size).toBe(0)
    expect(direct.tool).toBe('insert')

    const guided = playgroundEntryActions(empty, 'guided').reduce(reducer, empty)
    expect(guided.graph.nodes.size).toBe(48)
    expect(guided.dataset).toEqual({ id: 'clusters', n: 48, seed: 7 })
    expect(guided.tool).toBe('search')
    expect(guided.rightTab).toBe('build')
  })

  it('labels the Learn-page seeded and empty playground paths distinctly', () => {
    const html = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} />)
    expect(html).toContain('Start with an example')
    expect(html).toContain('Open an empty playground')
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
    const s = script(seededState(), [{ t: 'insert', at: [500, 320] }])
    expect(s.trace!.steps.length).toBeGreaterThan(10)
    for (const [i] of s.trace!.steps.entries()) {
      expect(render({ ...s, step: i }, <GraphCanvas />).length, `step ${i}`).toBeGreaterThan(0)
      expect(render({ ...s, step: i }, <Explainer />)).toContain('</p>')
    }
  })

  it('every step of a search trace renders in both view modes', () => {
    const s = script(seededState(), [{ t: 'search', at: [500, 320] }])
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
    const base = seededState()
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

  it('offers keyboard-operable node selection and movement controls', () => {
    const selected = script(seededState(), [{ t: 'selectNearest', at: [232, 172] }])
    const html = render(selected, <NodePanel />)
    expect(html).toContain('id="node-picker"')
    expect(html).toContain('id="node-x"')
    expect(html).toContain('id="node-y"')
    expect(html).toContain('Move node')
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
