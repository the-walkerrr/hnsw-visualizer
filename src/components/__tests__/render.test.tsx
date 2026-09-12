import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import App from '../../App'
import { emptyGraph } from '../../hnsw/graph'
import { distance } from '../../hnsw/metric'
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
import { OperationNotice } from '../OperationNotice'
import { ExplanationPage } from '../ExplanationPage'
import { GraphCanvas } from '../GraphCanvas'
import { InsertReplayPrompt } from '../InsertReplayPrompt'
import { Transport } from '../Transport'
import { BuildPanel } from '../panels/BuildPanel'
import { CodePanel } from '../panels/CodePanel'
import { LabPanel } from '../panels/LabPanel'
import { MetricsPanel } from '../panels/MetricsPanel'
import { NodePanel } from '../panels/NodePanel'
import { ParamsPanel } from '../panels/ParamsPanel'
import { QueuesPanel } from '../panels/QueuesPanel'

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
  ['queues', () => <QueuesPanel />],
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
    expect(render(initialState(), <BuildPanel />)).toContain('Choose a new target')
    expect(render(initialState(), <Transport />)).toContain('Insert a dot to begin')
    expect(render(initialState(), <Explainer onOpenExplanation={() => {}} />)).toContain('Learn the basics')
    const graph = render(initialState(), <GraphCanvas />)
    expect(graph).toContain('aria-label="Graph text size"')
    expect(graph).toContain('aria-label="Increase graph text size"')
    expect(graph).toContain('aria-label="Reset graph text size" title="Reset graph text size" disabled="">100%')
    expect(render(seededState(), <CanvasToolbar />)).toContain('Clear nodes</button>')
    expect(render(initialState(), <CanvasToolbar />)).toContain('disabled="" title="The graph is already empty"')
  })

  it('offers an exact-step replay after showing a finished insert', () => {
    const inserted = script(initialState(), [{ t: 'insert', at: [500, 320] }, { t: 'seek', to: 'end' }])
    const html = render(inserted, <InsertReplayPrompt />)
    expect(inserted.step).toBe(inserted.trace!.steps.length - 1)
    expect(html).toContain('You’re seeing the finished graph')
    expect(html).toContain('Watch exact steps')
    expect(html).toContain('aria-label="Dismiss insert replay tip"')
    expect(render({ ...inserted, step: 0 }, <InsertReplayPrompt />)).toBe('')
  })

  it('collapses replay guidance while keeping its controls available', () => {
    const state = script(seededState(), [{ t: 'search', at: [500, 320] }])
    const html = render(state, <OperationNotice />)
    expect(html).toContain('<details class="operation-notice">')
    expect(html).not.toContain(' open=')
    expect(html).toContain('<summary>Replay paused')
    expect(html).toContain('Finish</button>')
    expect(html).toContain('End replay</button>')
    expect(render({ ...state, playing: true }, <OperationNotice />)).toContain('<summary>Replay running')
    expect(render({ ...state, step: state.trace!.steps.length - 1 }, <OperationNotice />)).toBe('')
    expect(render({ ...initialState(), movingNode: 0 }, <OperationNotice />)).toContain('release to finish, Esc to cancel')
  })

  it('explains rejected candidates using the live bucket and distance comparison', () => {
    const state = script(seededState(), [{ t: 'search', at: [500, 320] }])
    const index = state.trace!.steps.findIndex((step) => step.line === 's12')
    expect(index).toBeGreaterThanOrEqual(0)
    const step = state.trace!.steps[index]
    const candidate = step.graph.nodes.get(step.vis.considering!)!
    const farthest = step.graph.nodes.get(step.vis.dynamic.at(-1)!)!
    const html = render({ ...state, step: index }, <Explainer />)
    expect(html).toContain('class="explainer"')
    expect(html).toContain(`full (${step.vis.dynamic.length}/${step.vis.searchEf})`)
    for (const node of [candidate, farthest]) {
      expect(html).toContain(distance(node.vec, step.vis.query!, step.vis.searchMetric!).toFixed(2))
    }
    expect(html).toContain('not closer than W’s farthest dot')
    expect(html).toContain('W stays unchanged')
    expect(html).toContain('not added to C (to check)')
    expect(html).toContain('The search continues with other neighbors and queued dots')
  })

  it('presents the algorithm as a problem-first sequence before the parameter reference', () => {
    const html = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} />)
    const headings = [
      'Find similar items without checking everything',
      'Connect similar vectors into neighborhoods',
      'Layers turn a long walk into a few big jumps',
      'Search from coarse layers to fine ones',
      'An insert searches first, then makes links',
      'Delete cheaply, or remove and repair',
      'Parameter reference',
      'Read the algorithm one operation at a time',
    ]
    for (let i = 1; i < headings.length; i++) expect(html.indexOf(`<h2>${headings[i - 1]}`)).toBeLessThan(html.indexOf(`<h2>${headings[i]}`))
    expect(html).toContain('Brute force is simple and exact')
    expect(html.match(/<figure/g)?.length).toBeGreaterThanOrEqual(6)
    expect(html).toContain('class="neighbor-choice-visual"')
    expect(html).toContain('Choose two useful directions')
    expect(html).toContain('Soft delete keeps the tombstoned node and all four spokes')
    expect(html).toContain('the two green links are selected best-effort repairs')
    const visibleText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(visibleText).not.toMatch(/\b(?:Params|Code|Metrics) tab\b/)
  })

  it('keeps algorithm explanations in Learn and points the retired playground panel there', () => {
    const learn = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} />)
    const retiredPanel = render(initialState(), <CodePanel />)
    expect(learn).toContain('id="algorithm-steps"')
    for (const id of ['knn-search', 'search-layer', 'insert', 'select-neighbors', 'delete', 'update']) {
      expect(learn).toContain(`id="algorithm-${id}"`)
    }
    expect(learn).toContain('How to read the listings')
    expect(learn).not.toContain('class="learn-disclosure algorithm-listing"')
    expect(learn.indexOf('id="algorithm-insert"')).toBeLessThan(learn.indexOf('id="algorithm-search-layer"'))
    expect(learn.indexOf('id="algorithm-search-layer"')).toBeLessThan(learn.indexOf('id="algorithm-select-neighbors"'))
    expect(learn.indexOf('id="algorithm-select-neighbors"')).toBeLessThan(learn.indexOf('id="algorithm-knn-search"'))
    expect(learn).toContain('href="#algorithm-knn-search"')
    expect(learn).toContain('href="#algorithm-insert"')
    expect(learn).toContain('href="#algorithm-delete"')
    expect(retiredPanel).toContain('href="/learn#algorithm-steps"')
    expect(retiredPanel).not.toContain('SEARCH-LAYER(q, ep, ef, lc)')
  })

  it('defines search notation in plain language before the interactive search example', () => {
    const html = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} />)
    expect(html).toContain('Search notation, before the example')
    expect(html).toContain('href="/learn#control-ef-search"')
    expect(html).toContain('data-learn-reference="true"')
    expect(html).toContain('<code>W</code> · best so far')
    expect(html).toContain('<code>C</code> · to check')
    expect(html).toContain('W remembers possible answers')
    expect(html).toContain('does not set the result count')
    expect(html).toContain('When do we add a node to C, and when do we stop?')
    expect(html).toContain('put the entry point in both C and W')
    expect(html).toContain('add it to both C and W when W has an empty slot')
    expect(html).toContain('If C is empty, or its nearest node is farther from q than W’s farthest node, end this layer')
    expect(html).toContain('After L0 ends, return the closest')
    expect(html.indexOf('Search notation, before the example')).toBeLessThan(html.indexOf('id="four-dot-search"'))
    expect(html.indexOf('id="c-admission-rule"')).toBeLessThan(html.indexOf('id="four-dot-search"'))
  })

  it('explains per-layer W capacities and their purpose in Learn and live queues', () => {
    const learn = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} />)
    expect(learn).toContain('id="w-per-layer"')
    expect(learn).toContain('Upper layers · W has 1 slot')
    expect(learn).toContain('Layer 0 · W uses the larger of')
    expect(learn).toContain('Only the best node found is passed down')

    const state = script(seededState(), [{ t: 'search', at: [500, 320] }])
    for (const base of [false, true]) {
      const index = state.trace!.steps.findIndex((step) => step.line === 's2' && (step.vis.layer === 0) === base)
      expect(index).toBeGreaterThanOrEqual(0)
      const html = render({ ...state, step: index }, <QueuesPanel />)
      expect(html).toContain(base ? 'alternative routes for better accuracy' : 'One slot keeps navigation fast')
      expect(html).toContain('href="/learn#w-per-layer"')
    }
    const insert = script(seededState(), [{ t: 'insert', at: [500, 320] }])
    const index = insert.trace!.steps.findIndex((step) => step.line === 's2')
    expect(render({ ...insert, step: index }, <QueuesPanel />)).not.toContain('Why these sizes?')
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
    expect(learn).toContain('“Pruned” means rejected as a redundant connection')
    expect(learn).toContain('Example: M = 3')
    expect(learn).toContain('Off leaves N with two links. On uses the empty third slot for B.')
    expect(learn).toContain('href="#chapter-insert"')
    expect(learn).toContain('See how efConstruction is used during insertion')
    expect(learn).toContain('href="#chapter-search"')
    expect(learn).toContain('See how efSearch controls a query')
    expect(panels).not.toContain('Decrease / off')
    expect(panels).not.toContain('Increase / on')
    expect(panels).toContain('Input: 2–24')
    expect(panels).toContain('Euclidean (L2)')
    expect(panels).toContain('Two moons')
  })

  it('groups search and insertion controls with their actions', () => {
    const search = render(initialState(), <BuildPanel />)
    const empty = render(initialState(), <ParamsPanel />)
    expect(search).toContain('id="k"')
    expect(search).toContain('id="param-efs"')
    expect(search).not.toContain('id="preset"')
    expect(search).not.toContain('id="count"')
    expect(empty).toContain('id="preset"')
    expect(empty).toContain('aria-label="Vectors value"')
    expect(empty).toContain('id="count" type="range" min="0" max="400" step="1" value="0"')
    expect(empty).toContain('id="param-M"')
    expect(empty).toContain('id="efc"')
    expect(empty).not.toContain('id="k"')
    expect(empty).not.toContain('id="param-efs"')
    const inserted = script(initialState(), [{ t: 'insert', at: [500, 320] }])
    expect(render(inserted, <ParamsPanel />)).toContain('id="count" type="range" min="0" max="400" step="1" value="1"')
  })

  it('keeps ordinary playground entry empty and seeds only the guided first search', () => {
    const empty = initialState()
    const direct = playgroundEntryActions(empty, 'empty').reduce(reducer, empty)
    expect(direct.graph.nodes.size).toBe(0)
    expect(direct.tool).toBe('insert')

    const guided = playgroundEntryActions(empty, 'guided').reduce(reducer, empty)
    expect(guided.graph.nodes.size).toBe(4)
    expect(guided.trace?.op).toBe('search')
    expect(guided.step).toBe(0)
    expect(guided.playing).toBe(false)
    expect(guided.granularity).toBe('fine')
    expect(guided.tool).toBe('search')
    expect(guided.rightTab).toBe('queues')
  })

  it('labels the Learn-page seeded and empty playground paths distinctly', () => {
    const html = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} />)
    expect(html).toContain('Open guided search')
    expect(html).toContain('Open or resume Playground')
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
    expect(html).toContain('aria-label="Update strategy"')
    expect(html).toContain('Reinsert')
    expect(html).toContain('In place')
    expect(html).toContain('href="/learn#algorithm-update"')
    expect(html).toContain('id="node-x"')
    expect(html).toContain('id="node-y"')
    expect(html).toContain('Move node')
    expect(html).toContain('href="/learn#soft-delete"')
    expect(html).toContain('href="/learn#hard-delete"')
    expect(html.indexOf('soft delete')).toBeLessThan(html.indexOf('coordinate-form'))
  })

  it('labels the node editing canvas tool as Update', () => {
    const html = render(seededState(), <CanvasToolbar />)
    expect(html).toContain('aria-label="Update"')
    expect(html).not.toContain('>Update</span>')
    expect(html).not.toContain('>Inspect</span>')
  })

  it('groups graph display controls behind settings beside fullscreen', () => {
    const html = render(seededState(), <GraphCanvas onToggleFullscreen={() => {}} />)
    expect(html).toContain('aria-label="Graph display settings"')
    expect(html).toContain('class="gear-icon"')
    expect(html).toContain('class="graph-settings-popover"')
    expect(html).toContain('aria-label="Enter fullscreen"')
    expect(html.indexOf('class="legend"')).toBeLessThan(html.indexOf('class="canvas-footer-actions"'))
  })

  it('shows a tool-specific prompt when replay is clear', () => {
    const state = seededState()
    expect(render({ ...state, tool: 'search' }, <Transport />)).toContain('Run a search to begin')
    expect(render({ ...state, tool: 'insert' }, <Transport />)).toContain('Insert a dot to begin')
    expect(render({ ...state, tool: 'select' }, <Transport />)).toContain('Update a dot to begin')
  })

  it('uses compact settings and explanation controls', () => {
    const state = seededState()
    const transport = render(state, <Transport />)
    const explainer = render(state, <Explainer />)
    expect(transport).toContain('aria-label="Playback settings"')
    expect(transport).toContain('class="gear-icon"')
    expect(transport).not.toContain('>Settings</summary>')
    expect(explainer).toContain('aria-label="Collapse explanation"')
    expect(explainer).toContain('aria-expanded="true"')
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
