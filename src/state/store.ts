import { createContext, useCallback, useContext, useMemo, type Dispatch } from 'react'
import {
  DEFAULT_PARAMS,
  buildIndex,
  runHardDelete,
  runInsert,
  runRestore,
  runSearch,
  runSoftDelete,
  runUpdate,
} from '../hnsw/algorithm'
import { emptyGraph, liveNodes } from '../hnsw/graph'
import { distance } from '../hnsw/metric'
import { preset, type PresetId } from '../hnsw/presets'
import type { Graph, NodeId, Params, Trace, Vec } from '../hnsw/types'

export type ViewMode = 'layer' | 'stack'
export type Tool = 'search' | 'insert' | 'select'
export type Granularity = 'coarse' | 'fine'
export type RightTab = 'build' | 'params' | 'code' | 'node' | 'metrics' | 'lab'

/** Declarative operations. Guide examples and controls both emit these, so the
 *  learn page can put the app into any state without reaching into component internals. */
export type ScriptOp =
  | { t: 'clear' }
  | { t: 'preset'; id: PresetId; n: number; seed?: number; append?: boolean }
  | { t: 'params'; patch: Partial<Params> }
  | { t: 'insert'; at: Vec; level?: number; label?: string; animate?: boolean }
  | { t: 'search'; at: Vec; animate?: boolean }
  | { t: 'deleteNearest'; at: Vec; mode: 'soft' | 'hard' }
  | { t: 'updateNearest'; at: Vec; to: Vec; mode: 'reinsert' | 'in-place' }
  | { t: 'selectNearest'; at: Vec }
  | { t: 'view'; mode?: ViewMode; layer?: number }
  | { t: 'tool'; tool: Tool }
  | { t: 'k'; k: number }
  | { t: 'tab'; tab: RightTab }
  | { t: 'closeTrace' }
  | { t: 'seek'; to: 'start' | 'end' }

export interface LogEntry {
  id: number
  label: string
  detail: string
}

export interface AppState {
  params: Params
  graph: Graph
  trace: Trace | null
  step: number
  playing: boolean
  speed: number
  granularity: Granularity
  viewMode: ViewMode
  layer: number
  ghostLayers: boolean
  selected: NodeId | null
  tool: Tool
  k: number
  animate: boolean
  deleteMode: 'soft' | 'hard'
  updateMode: 'reinsert' | 'in-place'
  rightTab: RightTab
  dataset: { id: PresetId; n: number; seed: number }
  log: LogEntry[]
  logSeq: number
}

export type Action =
  | { type: 'script'; ops: ScriptOp[] }
  | { type: 'setParams'; patch: Partial<Params> }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'tick' }
  | { type: 'stepBy'; delta: number }
  | { type: 'seek'; index: number }
  | { type: 'setSpeed'; speed: number }
  | { type: 'setGranularity'; g: Granularity }
  | { type: 'setViewMode'; mode: ViewMode }
  | { type: 'setLayer'; layer: number }
  | { type: 'toggleGhost' }
  | { type: 'select'; id: NodeId | null }
  | { type: 'setTool'; tool: Tool }
  | { type: 'setK'; k: number }
  | { type: 'toggleAnimate' }
  | { type: 'setDeleteMode'; mode: 'soft' | 'hard' }
  | { type: 'setUpdateMode'; mode: 'reinsert' | 'in-place' }
  | { type: 'setRightTab'; tab: RightTab }
  | { type: 'deleteNode'; id: NodeId; mode: 'soft' | 'hard' }
  | { type: 'restoreNode'; id: NodeId }
  | { type: 'moveNode'; id: NodeId; to: Vec }
  | { type: 'closeTrace' }

export function initialState(): AppState {
  const dataset = { id: 'clusters' as PresetId, n: 48, seed: 7 }
  const params = { ...DEFAULT_PARAMS }
  return {
    params,
    graph: emptyGraph(),
    trace: null,
    step: 0,
    playing: false,
    speed: 3,
    granularity: 'coarse',
    viewMode: 'stack',
    layer: 0,
    ghostLayers: true,
    selected: null,
    tool: 'insert',
    k: 5,
    animate: true,
    deleteMode: 'soft',
    updateMode: 'reinsert',
    rightTab: 'build',
    dataset,
    log: [],
    logSeq: 0,
  }
}

// ------------------------------------------------------------------ helpers

export function nearestNode(g: Graph, at: Vec, params: Params, liveOnly = false): NodeId | null {
  let best: NodeId | null = null
  let bestD = Infinity
  for (const n of g.nodes.values()) {
    if (liveOnly && n.deleted) continue
    // Screen-space pick, so clicking always selects what is under the cursor
    // even when the metric is cosine.
    const d = distance(at, n.vec, params.metric === 'cosine' ? 'euclidean' : params.metric)
    if (d < bestD) {
      bestD = d
      best = n.id
    }
  }
  return best
}

/** Index of the next step to show, honouring the coarse/fine filter. */
export function advance(state: AppState, from: number, delta: number): number {
  const steps = state.trace?.steps
  if (!steps || steps.length === 0) return 0
  const dir = Math.sign(delta)
  let i = from
  for (let n = 0; n < Math.abs(delta); n++) {
    let j = i + dir
    if (state.granularity === 'coarse') {
      while (j > 0 && j < steps.length - 1 && steps[j].weight === 'minor') j += dir
    }
    if (j < 0 || j > steps.length - 1) break
    i = j
  }
  return i
}

function withTrace(state: AppState, graph: Graph, trace: Trace, label: string): AppState {
  const animate = state.animate && trace.steps.length > 0
  const detail = trace.steps.length
    ? `${trace.steps.length} steps · ${trace.stats.distCalls} distance computations`
    : ''
  return {
    ...state,
    graph,
    trace,
    step: animate ? 0 : Math.max(trace.steps.length - 1, 0),
    playing: animate && state.playing,
    log: [{ id: state.logSeq, label, detail }, ...state.log].slice(0, 40),
    logSeq: state.logSeq + 1,
  }
}

function applyOp(state: AppState, op: ScriptOp): AppState {
  switch (op.t) {
    case 'clear':
      return { ...state, graph: emptyGraph(), trace: null, step: 0, selected: null, log: [] }
    case 'preset': {
      const dataset = { id: op.id, n: op.n, seed: op.seed ?? state.dataset.seed }
      const vecs = preset(op.id).make(op.n, dataset.seed)
      const base = op.append ? state.graph : emptyGraph()
      return {
        ...state,
        dataset,
        graph: buildIndex(base, state.params, vecs),
        trace: null,
        step: 0,
        selected: null,
      }
    }
    case 'params': {
      const merged = { ...state.params, ...op.patch }
      // The degree caps can never sit below M. Algorithm 1 re-selects the
      // *neighbours* of a new node when they overflow, but never the new node
      // itself, so Mmax < M would be violated by the very next insert.
      const params: Params = {
        ...merged,
        Mmax: Math.max(merged.Mmax, merged.M),
        Mmax0: Math.max(merged.Mmax0, merged.M),
      }
      // Rebuilding is the honest thing to do: M and efConstruction change the
      // graph itself, not just how it is searched.
      const structural =
        op.patch.M !== undefined ||
        op.patch.Mmax !== undefined ||
        op.patch.Mmax0 !== undefined ||
        op.patch.efConstruction !== undefined ||
        op.patch.mL !== undefined ||
        op.patch.metric !== undefined ||
        op.patch.neighborRule !== undefined ||
        op.patch.extendCandidates !== undefined ||
        op.patch.keepPrunedConnections !== undefined ||
        op.patch.seed !== undefined
      if (!structural) return { ...state, params }
      const ordered = [...state.graph.nodes.values()].sort((a, b) => a.seq - b.seq)
      // Labels are carried across the rebuild: the reader is watching "node 37",
      // and it must still be node 37 afterwards. Ids are *not* stable (a fresh
      // graph numbers from zero), so the selection is re-anchored by label.
      const graph = buildIndex(
        emptyGraph(),
        params,
        ordered.map((n) => n.vec),
        ordered.map((n) => n.label),
      )
      const selectedLabel =
        state.selected !== null ? state.graph.nodes.get(state.selected)?.label : undefined
      const selected =
        selectedLabel === undefined
          ? null
          : ([...graph.nodes.values()].find((n) => n.label === selectedLabel)?.id ?? null)
      return { ...state, params, graph, selected, trace: null, step: 0 }
    }
    case 'insert': {
      const { graph, trace } = runInsert(state.graph, state.params, op.at, {
        label: op.label,
        level: op.level,
      })
      const next = withTrace(state, graph, trace, trace.title)
      return op.animate === false ? { ...next, step: trace.steps.length - 1 } : next
    }
    case 'search': {
      const { trace } = runSearch(state.graph, state.params, op.at, state.k)
      const next = withTrace(state, state.graph, trace, trace.title)
      return op.animate === false ? { ...next, step: trace.steps.length - 1 } : next
    }
    case 'deleteNearest': {
      const id = nearestNode(state.graph, op.at, state.params, op.mode === 'soft')
      if (id === null) return state
      return applyDelete(state, id, op.mode)
    }
    case 'updateNearest': {
      const id = nearestNode(state.graph, op.at, state.params, true)
      if (id === null) return state
      const { graph, trace } = runUpdate(state.graph, state.params, id, op.to, op.mode)
      return withTrace(state, graph, trace, trace.title)
    }
    case 'selectNearest':
      return { ...state, selected: nearestNode(state.graph, op.at, state.params) }
    case 'view':
      return {
        ...state,
        viewMode: op.mode ?? state.viewMode,
        layer: op.layer ?? state.layer,
      }
    case 'tool':
      return { ...state, tool: op.tool }
    case 'k':
      return { ...state, k: op.k }
    case 'tab':
      return { ...state, rightTab: op.tab }
    case 'closeTrace':
      return { ...state, trace: null, step: 0, playing: false }
    case 'seek':
      return {
        ...state,
        step: op.to === 'start' ? 0 : Math.max((state.trace?.steps.length ?? 1) - 1, 0),
        playing: false,
      }
  }
}

function applyDelete(state: AppState, id: NodeId, mode: 'soft' | 'hard'): AppState {
  const node = state.graph.nodes.get(id)
  if (!node) return state
  if (mode === 'soft' && node.deleted) {
    const { graph, trace } = runRestore(state.graph, state.params, id)
    return withTrace(state, graph, trace, trace.title)
  }
  const { graph, trace } =
    mode === 'soft'
      ? runSoftDelete(state.graph, state.params, id)
      : runHardDelete(state.graph, state.params, id)
  const next = withTrace(state, graph, trace, trace.title)
  return mode === 'hard' ? { ...next, selected: null } : next
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'script':
      return action.ops.reduce(applyOp, state)
    case 'setParams':
      return applyOp(state, { t: 'params', patch: action.patch })
    case 'play':
      return state.trace
        ? { ...state, playing: true, step: state.step >= state.trace.steps.length - 1 ? 0 : state.step }
        : state
    case 'pause':
      return { ...state, playing: false }
    case 'tick': {
      if (!state.trace) return { ...state, playing: false }
      const next = advance(state, state.step, 1)
      if (next === state.step) return { ...state, playing: false }
      return { ...state, step: next }
    }
    case 'stepBy':
      return { ...state, playing: false, step: advance(state, state.step, action.delta) }
    case 'seek':
      return { ...state, playing: false, step: action.index }
    case 'setSpeed':
      return { ...state, speed: action.speed }
    case 'setGranularity':
      return { ...state, granularity: action.g }
    case 'setViewMode':
      return { ...state, viewMode: action.mode }
    case 'setLayer':
      return { ...state, layer: action.layer }
    case 'toggleGhost':
      return { ...state, ghostLayers: !state.ghostLayers }
    case 'select':
      return { ...state, selected: action.id }
    case 'setTool':
      return { ...state, tool: action.tool }
    case 'setK':
      return { ...state, k: action.k }
    case 'toggleAnimate':
      return { ...state, animate: !state.animate }
    case 'setDeleteMode':
      return { ...state, deleteMode: action.mode }
    case 'setUpdateMode':
      return { ...state, updateMode: action.mode }
    case 'setRightTab':
      return { ...state, rightTab: action.tab }
    case 'deleteNode':
      return applyDelete(state, action.id, action.mode)
    // The canvas draws mid-trace *snapshots*, so a node the user can see and
    // click may already be gone from the committed graph — a hard delete that is
    // still replaying, for instance. Every action that carries an id from the
    // view back into the index has to tolerate that.
    case 'restoreNode': {
      if (!state.graph.nodes.has(action.id)) return state
      const { graph, trace } = runRestore(state.graph, state.params, action.id)
      return withTrace(state, graph, trace, trace.title)
    }
    case 'moveNode': {
      if (!state.graph.nodes.has(action.id)) return state
      const { graph, trace } = runUpdate(
        state.graph,
        state.params,
        action.id,
        action.to,
        state.updateMode,
      )
      return withTrace(state, graph, trace, trace.title)
    }
    case 'closeTrace':
      return { ...state, trace: null, step: 0, playing: false }
  }
}

export const StateCtx = createContext<AppState | null>(null)
export const DispatchCtx = createContext<Dispatch<Action> | null>(null)

export function useApp(): AppState {
  const s = useContext(StateCtx)
  if (!s) throw new Error('useApp outside StoreProvider')
  return s
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchCtx)
  if (!d) throw new Error('useDispatch outside StoreProvider')
  return d
}

export function useScript(): (ops: ScriptOp[]) => void {
  const dispatch = useDispatch()
  return useCallback((ops: ScriptOp[]) => dispatch({ type: 'script', ops }), [dispatch])
}

/** The graph the canvas should draw: mid-trace snapshot, or the committed graph. */
export function useViewGraph(): Graph {
  const { graph, trace, step } = useApp()
  return useMemo(() => trace?.steps[step]?.graph ?? graph, [graph, trace, step])
}

/** The layer the current step is acting on, falling back to the most recent
 *  layer the trace touched so the view never jumps to a blank plane. While a
 *  trace is loaded this wins over the manual layer choice, and the toolbar and
 *  the canvas both read it so they can never disagree. */
export function useShownLayer(): { layer: number; fromTrace: number | null } {
  const { trace, step, layer, graph } = useApp()
  return useMemo(() => {
    const top = graph.entry === null ? 0 : graph.topLayer
    let fromTrace: number | null = null
    if (trace) {
      for (let i = step; i >= 0; i--) {
        if (trace.steps[i].vis.layer !== null) {
          fromTrace = trace.steps[i].vis.layer
          break
        }
      }
    }
    return { layer: Math.min(fromTrace ?? layer, Math.max(top, 0)), fromTrace }
  }, [trace, step, layer, graph])
}

export function useCurrentStep() {
  const { trace, step } = useApp()
  return trace?.steps[step] ?? null
}

export function useLiveCount(): number {
  const g = useViewGraph()
  return useMemo(() => liveNodes(g).length, [g])
}
