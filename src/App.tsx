import { useEffect } from 'react'
import { CanvasToolbar } from './components/CanvasToolbar'
import { Explainer } from './components/Explainer'
import { GraphCanvas } from './components/GraphCanvas'
import { LessonPanel } from './components/LessonPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { Transport } from './components/Transport'
import { BuildPanel } from './components/panels/BuildPanel'
import { CodePanel } from './components/panels/CodePanel'
import { LabPanel } from './components/panels/LabPanel'
import { MetricsPanel } from './components/panels/MetricsPanel'
import { NodePanel } from './components/panels/NodePanel'
import { ParamsPanel } from './components/panels/ParamsPanel'
import { graphStats } from './hnsw/metrics'
import { useApp, useDispatch, useViewGraph, type RightTab } from './state/store'

const TABS: Array<[RightTab, string, string]> = [
  ['build', 'Build', 'Dataset, operations and history'],
  ['params', 'Params', 'Every knob, with what it does'],
  ['code', 'Code', 'The pseudocode, following along'],
  ['node', 'Node', 'Inspect the selected node'],
  ['metrics', 'Metrics', 'Cost, recall and graph shape'],
  ['lab', 'Lab', 'Sweeps and comparisons'],
]

export default function App() {
  const state = useApp()
  const dispatch = useDispatch()
  const graph = useViewGraph()
  const stats = graphStats(graph)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
      if (e.key === ' ') {
        e.preventDefault()
        dispatch({ type: state.playing ? 'pause' : 'play' })
      } else if (e.key === 'ArrowRight') {
        dispatch({ type: 'stepBy', delta: 1 })
      } else if (e.key === 'ArrowLeft') {
        dispatch({ type: 'stepBy', delta: -1 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, state.playing])

  const Panel = {
    build: BuildPanel,
    params: ParamsPanel,
    code: CodePanel,
    node: NodePanel,
    metrics: MetricsPanel,
    lab: LabPanel,
  }[state.rightTab]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>HNSW Explorer</h1>
          <span>Hierarchical Navigable Small World graphs, step by step</span>
        </div>
        {!state.lessonOpen && (
          <button className="iconbtn" onClick={() => dispatch({ type: 'toggleLessonPanel' })}>
            ▸ lessons
          </button>
        )}
        <div className="spacer" />
        <div className="stat-strip">
          <div className="stat">
            <b>{stats.live}</b>
            <span>vectors</span>
          </div>
          <div className="stat">
            <b>{stats.total ? stats.topLayer + 1 : 0}</b>
            <span>layers</span>
          </div>
          <div className="stat">
            <b>{stats.edges}</b>
            <span>edges</span>
          </div>
          <div className="stat">
            <b>{state.params.M}</b>
            <span>M</span>
          </div>
          <div className="stat">
            <b>{state.params.efSearch}</b>
            <span>ef search</span>
          </div>
          {stats.deleted > 0 && (
            <div className="stat">
              <b>{stats.deleted}</b>
              <span>tombstoned</span>
            </div>
          )}
        </div>
        <ThemeToggle />
      </header>

      <div className={`layout${state.lessonOpen ? '' : ' no-left'}`}>
        {state.lessonOpen ? <LessonPanel /> : <div className="pane pane-left" />}

        <section className="pane pane-center">
          <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0 }}>
            <GraphCanvas />
            <CanvasToolbar />
          </div>
          <Transport />
          <Explainer />
        </section>

        <aside className="pane">
          <div className="tabs" role="tablist">
            {TABS.map(([id, label, title]) => (
              <button
                key={id}
                role="tab"
                title={title}
                aria-selected={state.rightTab === id}
                onClick={() => dispatch({ type: 'setRightTab', tab: id })}
              >
                {label}
              </button>
            ))}
          </div>
          <Panel />
        </aside>
      </div>
    </div>
  )
}
