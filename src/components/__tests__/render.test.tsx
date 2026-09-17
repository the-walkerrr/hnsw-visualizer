import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import App from '../../App'
import { emptyGraph } from '../../hnsw/graph'
import { CONTROL_GUIDES } from '../../lessons/controlGuides'
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
import { BarChart, LineChart } from '../Charts'
import { Explainer } from '../Explainer'
import { slotLabel } from '../formatCount'
import { OperationNotice } from '../OperationNotice'
import { ExplanationPage } from '../ExplanationPage'
import { GraphCanvas } from '../GraphCanvas'
import { InsertReplayPrompt } from '../InsertReplayPrompt'
import { Transport } from '../Transport'
import { BuildPanel } from '../panels/BuildPanel'
import { CodePanel } from '../panels/CodePanel'
import { DetailsPanel } from '../panels/DetailsPanel'
import { NodePanel } from '../panels/NodePanel'
import { ParamsPanel } from '../panels/ParamsPanel'
import { numericFeedbackMatches } from '../panels/numericFeedback'
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
  ['details', () => <DetailsPanel />],
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
  it('does not expose the removed Experiments section in Playground navigation', () => {
    vi.stubGlobal('window', { location: { pathname: '/playground' } })
    try {
      const html = renderToStaticMarkup(<StoreLess />)
      expect(html).toContain('aria-label="Playground panels"')
      expect(html).not.toContain('Experiments')
      expect(html).toContain('>Details</button>')
      expect(html).not.toContain('>Results</button>')
      expect(html.indexOf('>Details</button>')).toBeLessThan(html.indexOf('>Search</button>'))
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('shows live graph structure and links tombstones to Learn', () => {
    const empty = render(initialState(), <DetailsPanel />)
    expect(empty).toContain('Current graph')
    expect(empty).toContain('No layers yet')
    expect(empty).toContain('href="/learn#soft-delete"')
    expect(empty).not.toContain('<details class="panel-disclosure"')
    expect(empty.match(/<section class="panel-disclosure details-section">/g)).toHaveLength(2)

    const state = script(seededState(), [{ t: 'deleteNearest', at: [232, 172], mode: 'soft' }, { t: 'seek', to: 'end' }])
    const deleted = [...state.graph.nodes.values()].find((node) => node.deleted)!
    const html = render(state, <DetailsPanel />)
    expect(html).toContain('aria-label="Graph summary"')
    expect(html).toContain('across all layers')
    expect(html).toContain('avg links')
    expect(html).toContain('groups')
    expect(html).toContain(`<b>${deleted.label}</b><small>id ${deleted.id}</small>`)
    expect(html).toContain('What is a tombstone?')
  })

  it('the whole app renders', () => {
    const html = renderToStaticMarkup(<StoreLess />)
    expect(html).toContain('HNSW Explorer')
    expect(html).toContain('Learn')
    expect(html).toContain('Open Playground')
    expect(html).toContain('Read the mobile-friendly guide')
  })

  it('shows concise guidance in the setup and replay surfaces', () => {
    expect(render(initialState(), <BuildPanel />)).toContain('Find nearby dots')
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

  it('explains rejected candidates in natural language with the live distance comparison', () => {
    const state = script(seededState(), [{ t: 'search', at: [500, 320] }])
    const index = state.trace!.steps.findIndex((step) => step.line === 's12')
    expect(index).toBeGreaterThanOrEqual(0)
    const html = render({ ...state, step: index }, <Explainer />)
    expect(html).toContain('class="explainer"')
    expect(html).toContain('The best-found list is full')
    expect(html).toContain('not closer than the farthest best candidate')
    expect(html).toContain('The search continues with its other open routes')
  })

  it('presents one section at a time, in beginner-to-advanced order, with prev/next paging', () => {
    const order = ['chapter-problem', 'chapter-search', 'chapter-insert', 'chapter-delete', 'chapter-practice', 'advanced-learning']
    const first = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} />)
    for (let i = 1; i < order.length; i++) expect(first.indexOf(`href="#${order[i - 1]}"`)).toBeLessThan(first.indexOf(`href="#${order[i]}"`))
    expect(first.match(/class="guide-chapter/g)).toHaveLength(1)
    expect(first).toContain('id="chapter-problem"')
    expect(first).not.toContain('id="chapter-search"')
    expect(first).toContain('Part 01 of 05')
    // First section: only a "next" link in the pager, no "previous".
    expect(first).toContain('class="section-pager"')
    expect(first).toContain('href="#chapter-search"')

    const middle = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} initialSection="chapter-insert" />)
    expect(middle.match(/class="guide-chapter/g)).toHaveLength(1)
    expect(middle).toContain('href="#chapter-search"') // previous
    expect(middle).toContain('href="#chapter-delete"') // next
    expect(middle).not.toContain('id="chapter-delete"')

    const deleteSection = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} initialSection="chapter-delete" />)
    expect(deleteSection).toContain('aria-label="The three parts of soft-deleting a dot"')
    expect(deleteSection).toContain('id="soft-delete"')
    expect(deleteSection).toContain('id="hard-delete"')
    expect(deleteSection).not.toContain('id="chapter-practice"')
    const visibleText = deleteSection.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(visibleText).not.toMatch(/\b(?:Params|Code|Metrics) tab\b/)

    const advanced = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} initialSection="advanced-learning" />)
    expect(advanced.match(/class="guide-chapter/g)).toHaveLength(1)
    expect(advanced).toContain('id="advanced-learning"')
    expect(advanced).not.toContain('id="chapter-practice"')
    expect(advanced).toContain('Advanced reference')
    expect(advanced).toContain('href="#chapter-practice"') // previous, no next on the last section
  })

  it('keeps algorithm explanations in Learn and points the retired playground panel there', () => {
    const learn = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} initialSection="advanced-learning" />)
    const retiredPanel = render(initialState(), <CodePanel />)
    expect(learn).toContain('id="algorithm-steps"')
    for (const id of ['knn-search', 'search-layer', 'insert', 'select-neighbors', 'delete', 'update']) {
      expect(learn).toContain(`id="algorithm-${id}"`)
    }
    expect(learn).toContain('The main guide uses everyday language')
    expect(learn).toContain('class="learn-disclosure algorithm-listing"')
    expect(learn.indexOf('id="algorithm-insert"')).toBeLessThan(learn.indexOf('id="algorithm-search-layer"'))
    expect(learn.indexOf('id="algorithm-search-layer"')).toBeLessThan(learn.indexOf('id="algorithm-select-neighbors"'))
    expect(learn.indexOf('id="algorithm-select-neighbors"')).toBeLessThan(learn.indexOf('id="algorithm-knn-search"'))
    expect(retiredPanel).toContain('href="/learn#algorithm-steps"')
    expect(retiredPanel).not.toContain('SEARCH-LAYER(q, ep, ef, lc)')
  })

  it('explains update strategies in Learn and links the Update panel to them', () => {
    const learn = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} initialSection="advanced-learning" />)
    const panel = render(initialState(), <NodePanel />)
    expect(learn).toContain('id="chapter-update"')
    expect(learn).toContain('id="update-reinsert"')
    expect(learn).toContain('id="update-in-place"')
    expect(learn).toContain('rebuild links from its old neighborhood')
    expect(learn.indexOf('id="chapter-update"')).toBeGreaterThan(learn.indexOf('id="advanced-learning"'))
    expect(panel).toContain('Select a dot to inspect it')
    expect(panel).toContain('href="/learn#chapter-update"')
    expect(panel).toContain('Compare update strategies')
  })

  it('explains alternate search routes without an overloaded interactive comparison', () => {
    const html = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} initialSection="chapter-search" />)
    expect(html).toContain('id="keep-routes-exercise"')
    expect(html).toContain('The first promising path can be a dead end')
    expect(html).toContain('If one path stops improving, it tries another')
    expect(html).toContain('Remembering more options can find a better match')
    expect(html).not.toContain('class="ef-demo"')
    expect(html).not.toContain('BEST_CANDIDATES')
    expect(html).not.toContain('CANDIDATES_TO_CHECK')
  })

  it('uses meaning-first variable names across Learn and Playground copy', () => {
    const state = script(seededState(), [{ t: 'search', at: [500, 320] }])
    const rejected = state.trace!.steps.findIndex((step) => step.line === 's12')
    const beginnerLearn = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} />)
    const html = [
      beginnerLearn,
      render(initialState(), <BuildPanel />),
      render(initialState(), <ParamsPanel />),
      render({ ...state, step: rejected }, <Explainer />),
      render({ ...state, step: rejected }, <QueuesPanel />),
    ].join(' ')
    const visibleText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    for (const term of ['NUM_RESULTS_REQUESTED', 'SEARCH_WIDTH', 'BUILD_WIDTH', 'TARGET_CONNECTIONS', 'BEST_CANDIDATES', 'CANDIDATES_TO_CHECK']) expect(visibleText).not.toContain(term)
    expect(visibleText).not.toMatch(/\b(?:efSearch|efConstruction|Mmax0|Mmax|mL)\b/)
    expect(html).not.toMatch(/<code>[kqWC]<\/code>/)
    expect(html).not.toMatch(/(?:BEST|CANDIDATES)<em>/)
  })

  it('explains the layer roles and keeps queue details optional', () => {
    const learn = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} initialSection="chapter-search" />)
    expect(learn).toContain('id="w-per-layer"')
    expect(learn).toContain('The small upper layers help the search cross the map quickly')
    expect(learn).toContain('On the bottom layer, explore more than one promising route')

    const state = script(seededState(), [{ t: 'search', at: [500, 320] }])
    for (const base of [false, true]) {
      const index = state.trace!.steps.findIndex((step) => step.line === 's2' && (step.vis.layer === 0) === base)
      expect(index).toBeGreaterThanOrEqual(0)
      const html = render({ ...state, step: index }, <QueuesPanel />)
      expect(html).toContain(base ? 'bottom layer keeps several promising routes open' : 'upper layer quickly finds a better starting area')
      expect(html).toContain('How to read these lists')
    }
    const insert = script(seededState(), [{ t: 'insert', at: [500, 320] }])
    const index = insert.trace!.steps.findIndex((step) => step.line === 's2')
    expect(render({ ...insert, step: index }, <QueuesPanel />)).not.toContain('Why these sizes?')
  })

  it('shows the two-hop pool instead of W/C during an in-place update', () => {
    const state = script(seededState(), [
      { t: 'updateNearest', at: [232, 172], to: [760, 470], mode: 'in-place' },
      { t: 'seek', to: 'end' },
    ])
    const html = render(state, <QueuesPanel />)
    expect(html).toContain('Inside the local repair')
    expect(html).toContain('Candidate pool')
    expect(html).toContain('Selected neighbors')
    expect(html).toContain('Rejected / not selected')
    expect(html).toContain('href="/learn#update-in-place"')
    expect(html).not.toContain('Best so far')
    expect(html).not.toContain('To check')
  })

  it('links adjustable controls to concise references except the simplified result count', () => {
    const learn = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} initialSection="advanced-learning" />)
    const panels = `${render(initialState(), <BuildPanel />)}${render(initialState(), <ParamsPanel />)}`
    for (const guide of Object.values(CONTROL_GUIDES)) {
      expect(learn, guide.label).toContain(`id="${guide.id}"`)
      expect(learn, guide.label).toContain(guide.plain)
      expect(learn, guide.label).toContain(guide.when)
      if (guide.id === CONTROL_GUIDES.k.id) {
        expect(panels).not.toContain(`href="/learn#${guide.id}"`)
      } else {
        expect(panels, guide.label).toContain(`href="/learn#${guide.id}"`)
        expect(panels, guide.label).toContain(`Learn how ${guide.label} works`)
      }
    }
    expect(panels).not.toContain('What does this change?')
    expect(panels).not.toContain('control-help-body')
    expect(learn).not.toContain('Decrease / off')
    expect(learn).not.toContain('Increase / on')
    expect(learn).not.toContain('Input: 2–24')
    expect(learn).not.toContain('EXAMPLE</span>')
    expect(learn).toContain('href="#chapter-insert"')
    expect(learn).toContain('See how build width is used during insertion')
    expect(learn).toContain('href="#chapter-search"')
    expect(learn).toContain('See how search width controls a query')
    expect(panels).not.toContain('Decrease / off')
    expect(panels).not.toContain('Increase / on')
    expect(panels).not.toContain('Input: 2–24')
    expect(panels).not.toContain('Two interleaved curves that make nearby-looking dots harder to connect correctly.')
  })

  it('groups search and insertion controls by task', () => {
    const search = render(initialState(), <BuildPanel />)
    const empty = render(initialState(), <ParamsPanel />)
    expect(search).toContain('id="k"')
    expect(search).toContain('id="param-efs"')
    expect(search).not.toContain('Search options')
    expect(search).not.toContain('How many close matches do you want?')
    expect(search).not.toContain('Learn how Number of results requested works')
    expect(search).not.toContain('Choose a new target')
    expect(search).not.toContain('Rerun this target')
    expect(search).not.toContain('Then press Play below the graph')
    expect(search).not.toContain('id="preset"')
    expect(search).not.toContain('id="count"')
    expect(empty).toContain('id="preset"')
    expect(empty).toContain('aria-label="Vectors value"')
    expect(empty).toContain('id="count" type="range" min="0" max="400" step="1" value="0"')
    expect(empty).toContain('id="param-M"')
    expect(empty).toContain('id="efc"')
    expect(empty).toContain('Add random dot')
    expect(empty).not.toContain('Add one dot')
    expect(empty).not.toContain('Clear dots')
    expect(empty).not.toContain('Reset parameters')
    expect(empty).not.toContain('id="k"')
    expect(empty).not.toContain('id="param-efs"')
    const inserted = script(initialState(), [{ t: 'insert', at: [500, 320] }])
    expect(render(inserted, <ParamsPanel />)).toContain('id="count" type="range" min="0" max="400" step="1" value="1"')
  })

  it('only prompts for the Search tool when another canvas tool is active', () => {
    expect(render(seededState(), <BuildPanel />)).not.toContain('Current canvas tool')
    const html = render({ ...seededState(), tool: 'insert' }, <BuildPanel />)
    expect(html).not.toContain('Current canvas tool')
    expect(html).toContain('Select Search above the graph to place a target')
    expect(html).toContain('Use Search tool')
    expect(html).toContain('then place a target on the graph')
  })

  it('offers a separate guided routes exercise without replacing general resume', () => {
    const html = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} onStartFirstSearch={() => {}} initialSection="chapter-search" />)
    expect(html).toContain('Watch one search in Playground')
    expect(html).toContain('Start guided search')
    expect(html).toContain('Try it in Playground')
  })

  it('introduces the graph with a concrete similarity example before search', () => {
    const html = render(initialState(), <ExplanationPage onOpenPlayground={() => {}} />)
    expect(html).toContain('Imagine every song in a music app as a dot')
    expect(html).toContain('Songs that sound similar are placed close together')
    expect(html).toContain('The slow, exact way')
    expect(html).toContain('role="img" aria-labelledby="graph-search-title graph-search-desc"')
    expect(html).toContain('class="scan-list"')
  })

  it('uses mobile-friendly homepage actions and discloses the full playground width requirement', () => {
    const html = renderToStaticMarkup(<StoreLess />)
    expect(html).toContain('See how search works')
    expect(html).toContain('Open Playground')
    expect(html).toContain('viewport at least 900 px wide')
  })

  it('uses correct singular grammar for candidate slots', () => {
    expect(slotLabel(1)).toBe('1 slot')
    expect(slotLabel(2)).toBe('2 slots')
  })

  it('keeps coupled connection settings inside the optional quality section', () => {
    const html = render(initialState(), <ParamsPanel />)
    expect(html).toContain('<summary>Graph quality <span>Optional · rebuilds</span></summary>')
    expect(html).toContain('resets related limits to 5 and 10, and the layer balance to 0.62')
  })

  it('keeps numeric correction feedback only while its value and bounds are current', () => {
    const feedback = { value: 2, min: 2, max: 24, step: 1 }
    expect(numericFeedbackMatches(feedback, 2, 2, 24, 1)).toBe(true)
    expect(numericFeedbackMatches(feedback, 5, 2, 24, 1)).toBe(false)
    expect(numericFeedbackMatches(feedback, 2, 5, 32, 1)).toBe(false)
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

  it('renders visible chart axis titles', () => {
    const line = render(initialState(), <LineChart title="Example line" xTitle="Input units" yTitle="Output units" points={[{ x: 1, y: 2 }, { x: 2, y: 3 }]} />)
    expect(line).toContain('data-axis="x"')
    expect(line).toContain('>Input units</text>')
    expect(line).toContain('data-axis="y"')
    expect(line).toContain('>Output units</text>')

    const bars = render(initialState(), <BarChart title="Example bars" labelTitle="Method" valueTitle="Checks / query" horizontal bars={[{ label: 'A', value: 2 }, { label: 'B', value: 3 }]} />)
    expect(bars).toContain('data-axis="x"')
    expect(bars).toContain('>Checks / query</text>')
    expect(bars).toContain('data-axis="y"')
    expect(bars).toContain('>Method</text>')
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

  it('offers node movement controls after graph selection', () => {
    const selected = script(seededState(), [{ t: 'selectNearest', at: [232, 172] }])
    const html = render(selected, <NodePanel />)
    expect(html).not.toContain('id="node-picker"')
    expect(html).not.toContain('Select a node…')
    expect(html).toContain('aria-label="Update strategy"')
    expect(html).toContain('Reinsert')
    expect(html).toContain('In place')
    expect(html).toContain('href="/learn#chapter-update"')
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
