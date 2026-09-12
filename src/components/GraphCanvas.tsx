import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { edgesOnLayer } from '../hnsw/graph'
import { distance } from '../hnsw/metric'
import type { Graph, HNode, NodeId, Step, Vec } from '../hnsw/types'
import { GRAPH_LABEL_SCALES, editsLocked, useApp, useDispatch, useShownLayer, useViewGraph, type GraphLabelScale } from '../state/store'
import {
  DEFAULT_CAMERA,
  ZOOM_MAX,
  ZOOM_MIN,
  cameraTransform,
  isFramed,
  reframed,
  withPitch,
  withYaw,
  zoomAt,
  type Camera,
} from './camera'
import { layerProjector, stackProjector, type Hit, type Projector } from './project'
import { TraceLegend } from './CanvasToolbar'

const f1 = (x: number) => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(1))

interface Hover {
  id: NodeId
  layer: number
  sx: number
  sy: number
}

export function GraphCanvas({
  isFullscreen = false,
  onToggleFullscreen,
}: {
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
} = {}) {
  const state = useApp()
  const dispatch = useDispatch()
  const locked = editsLocked(state)
  const graph = useViewGraph()
  const svgRef = useRef<SVGSVGElement>(null)
  const worldRef = useRef<SVGGElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const [drag, setDrag] = useState<{ id: NodeId; at: Vec; layer: number } | null>(null)
  const [pendingMove, setPendingMove] = useState<{ id: NodeId; to: Vec } | null>(null)
  const [cam, setCam] = useState<Camera>(DEFAULT_CAMERA)
  const labelScale = state.graphLabelScale

  const step = state.trace?.steps[state.step] ?? null
  const { layer: shownLayer, fromTrace: traceLayer } = useShownLayer()
  const topLayer = graph.entry === null ? 0 : graph.topLayer
  const proj = useMemo(
    () =>
      state.viewMode === 'stack'
        ? stackProjector(topLayer, { yaw: cam.yaw, pitch: cam.pitch })
        : layerProjector(state.guided ? { width: 380, height: 255 } : undefined),
    [state.viewMode, state.guided, topLayer, cam.yaw, cam.pitch],
  )
  const layers = state.viewMode === 'stack' ? range(topLayer, 0) : [shownLayer]

  // The two views live in different coordinate spaces, so a pan/zoom carried
  // across the switch would land somewhere meaningless. Orientation survives.
  // Adjusting state during render (rather than in an effect) avoids rendering
  // one frame with the stale camera.
  const [lastMode, setLastMode] = useState(state.viewMode)
  if (lastMode !== state.viewMode) {
    setLastMode(state.viewMode)
    setCam((c) => reframed(c))
  }

  /** Pointer position in SVG user space (before the camera transform). */
  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    return new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  }, [])

  /** Screen pixels per SVG user unit, for converting drag deltas. */
  const svgScale = () => svgRef.current?.getScreenCTM()?.a ?? 1

  const zoomBy = useCallback(
    (factor: number) => {
      const rect = frameRef.current?.getBoundingClientRect()
      const centre = rect
        ? svgPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        : null
      setCam((c) => (centre ? zoomAt(c, factor, centre) : c))
    },
    [svgPoint, setCam],
  )

  // Wheel has to be a non-passive listener to be able to preventDefault, which
  // React's onWheel cannot promise.
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const at = svgPoint(e.clientX, e.clientY)
      if (!at) return
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016))
      setCam((c) => zoomAt(c, factor, at))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [svgPoint])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.movingNode !== null) {
        if (e.key === 'Escape') {
          setDrag(null)
          dispatch({ type: 'cancelNodeMove' })
        }
        return
      }
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return
      if (e.key === '+' || e.key === '=') zoomBy(1.25)
      else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.25)
      else if (e.key === '0') setCam((c) => ({ ...reframed(c), yaw: DEFAULT_CAMERA.yaw, pitch: DEFAULT_CAMERA.pitch }))
      else if (e.key === '[') setCam((c) => withYaw(c, c.yaw - Math.PI / 12))
      else if (e.key === ']') setCam((c) => withYaw(c, c.yaw + Math.PI / 12))
      else if (e.key === ',') setCam((c) => withPitch(c, c.pitch - 0.04))
      else if (e.key === '.') setCam((c) => withPitch(c, c.pitch + 0.04))
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomBy, dispatch, state.movingNode])

  useEffect(() => () => dispatch({ type: 'cancelNodeMove' }), [dispatch])

  const sets = useMemo(() => {
    const v = step?.vis
    return {
      visited: new Set(v?.visited ?? []),
      cand: new Set(v?.candidates ?? []),
      dyn: new Set(v?.dynamic ?? []),
      results: new Set(v?.results ?? []),
      accepted: new Set(v?.accepted ?? []),
      rejected: new Set(v?.rejected ?? []),
    }
  }, [step])

  /** Pointer → data coordinates, plus which layer's plane was clicked. The
   *  camera transform lives on the world group, so its own CTM does the
   *  zoom/pan/rotate inverse for us. */
  function dataAt(
    e: { clientX: number; clientY: number },
    targetLayers: number[] = layers,
  ): Hit | null {
    const ctm = worldRef.current?.getScreenCTM()
    if (!ctm) return null
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return proj.from([pt.x, pt.y], targetLayers)
  }

  /**
   * Nearest node in *screen* space, so picking matches what the eye sees.
   *
   * Two radii: a tight one that counts as landing on the node (and so may start
   * a drag), and a forgiving one that still selects it. Requiring a pixel-exact
   * hit to inspect a 7px dot is needlessly punishing.
   */
  function pick(
    e: { clientX: number; clientY: number },
    reach: 'exact' | 'near' = 'exact',
  ): { id: NodeId; layer: number } | null {
    const ctm = worldRef.current?.getScreenCTM()
    if (!ctm) return null
    // Compare in screen pixels: a hit target must not grow when you zoom in.
    let best: { id: NodeId; layer: number } | null = null
    let bestD = (reach === 'exact' ? 15 : 46) ** 2
    for (const layer of layers) {
      for (const n of graph.nodes.values()) {
        if (n.level < layer) continue
        const [wx, wy] = proj.to(n.vec, layer)
        const sx = ctm.a * wx + ctm.c * wy + ctm.e
        const sy = ctm.b * wx + ctm.d * wy + ctm.f
        const d = (sx - e.clientX) ** 2 + (sy - e.clientY) ** 2
        if (d < bestD) {
          bestD = d
          best = { id: n.id, layer }
        }
      }
    }
    return best
  }

  /**
   * One pointer, three jobs, disambiguated by where it went down and how far it
   * moved: on a node with the select tool it drags that vector, with shift (or
   * the middle/right button) it orbits the stack, and otherwise it pans —
   * unless it never really moved, in which case it was a click and the active
   * tool acts.
   */
  const gesture = useRef<{
    kind: 'pan' | 'rotate'
    cam: Camera
    clientX: number
    clientY: number
    moved: boolean
  } | null>(null)
  /** Mirrors `gesture` for rendering only — a ref cannot drive the cursor. */
  const [dragging, setDragging] = useState<'pan' | 'rotate' | null>(null)

  function onPointerDown(e: ReactPointerEvent) {
    const hit = pick(e)
    if (locked && hit) {
      dispatch({ type: 'select', id: hit.id })
      return
    }
    if (state.tool === 'select' && (hit || pick(e, 'near'))) {
      const target = hit ?? pick(e, 'near')!
      dispatch({ type: 'select', id: target.id })
      if (hit) {
        const at = graph.nodes.get(hit.id)?.vec
        if (at) {
          dispatch({ type: 'beginNodeMove', id: hit.id })
          setDrag({ id: hit.id, at, layer: hit.layer })
        }
        e.currentTarget.setPointerCapture(e.pointerId)
        return
      }
    }
    const orbit = (e.shiftKey || e.button === 1 || e.button === 2) && proj.stacked
    gesture.current = {
      kind: orbit ? 'rotate' : 'pan',
      cam,
      clientX: e.clientX,
      clientY: e.clientY,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (drag) {
      // In the stacked view several layer planes overlap in screen space. Once
      // a drag begins, keep projecting onto the plane the node was picked on;
      // otherwise the pointer can cross a nearer plane and make the node jump.
      const spot = dataAt(e, [drag.layer])
      if (spot) setDrag({ ...drag, at: spot.at })
      return
    }
    const g = gesture.current
    if (g) {
      const dx = e.clientX - g.clientX
      const dy = e.clientY - g.clientY
      if (!g.moved && Math.hypot(dx, dy) > 4) {
        g.moved = true
        setDragging(g.kind)
      }
      if (!g.moved) return
      if (g.kind === 'rotate') {
        setCam(
          withPitch(
            withYaw(g.cam, g.cam.yaw + dx * 0.006),
            g.cam.pitch - dy * 0.0016,
          ),
        )
      } else {
        const k = svgScale()
        setCam({ ...g.cam, tx: g.cam.tx + dx / k, ty: g.cam.ty + dy / k })
      }
      if (hover) setHover(null)
      return
    }
    const hit = pick(e)
    if (!hit) {
      if (hover) setHover(null)
      return
    }
    const rect = svgRef.current!.getBoundingClientRect()
    setHover({ ...hit, sx: e.clientX - rect.left, sy: e.clientY - rect.top })
  }

  function onPointerUp(e?: ReactPointerEvent) {
    if (drag) {
      const original = graph.nodes.get(drag.id)?.vec
      const moved = original ? distance(original, drag.at, 'euclidean') > 4 : false
      if (moved && e) setPendingMove({ id: drag.id, to: drag.at })
      dispatch({ type: 'cancelNodeMove' })
      setDrag(null)
      gesture.current = null
      setDragging(null)
      return
    }
    const g = gesture.current
    gesture.current = null
    setDragging(null)
    // A press that never moved is a click, so the tool still acts.
    if (!g || g.moved || !e || locked) return
    const spot = dataAt(e)
    if (!spot) return
    if (state.tool === 'insert') dispatch({ type: 'script', ops: [{ t: 'insert', at: spot.at }, { t: 'seek', to: 'end' }] })
    else if (state.tool === 'search') dispatch({ type: 'script', ops: [{ t: 'search', at: spot.at }] })
  }

  const beam = useMemo(() => {
    if (!step?.vis.query || state.params.metric !== 'euclidean') return null
    const ids = step.vis.dynamic
    if (ids.length === 0) return null
    let r = 0
    for (const id of ids) {
      const n = graph.nodes.get(id)
      if (n) r = Math.max(r, distance(step.vis.query, n.vec, 'euclidean'))
    }
    return r
  }, [step, graph, state.params.metric])

  const hoverNode = hover ? graph.nodes.get(hover.id) : undefined

  return (
    <div
      className={
        'canvas-frame tool-' +
        (locked ? 'locked' : state.tool) +
        (dragging === 'pan' ? ' panning' : dragging === 'rotate' ? ' orbiting' : '')
      }
      ref={frameRef}
    >
      <svg
        ref={svgRef}
        viewBox={proj.viewBox}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => onPointerUp()}
        onLostPointerCapture={() => onPointerUp()}
        onContextMenu={(e) => e.preventDefault()}
        onPointerLeave={() => {
          setHover(null)
        }}
        role="img"
        aria-label="HNSW graph"
      >
        <defs>
          <pattern id="tomb" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--text-3)" strokeWidth="1.4" />
          </pattern>
        </defs>
        <g ref={worldRef} transform={cameraTransform(cam)}>
        {layers.map((layer) => {
          const active = !state.trace || traceLayer === null || traceLayer === layer
          const opacity = proj.stacked ? (active ? 1 : 0.42) : 1
          return (
            <g key={layer} opacity={opacity}>
              <path
                d={proj.plane(layer)}
                fill="var(--surface-2)"
                fillOpacity={proj.stacked ? 0.55 : 0.35}
                stroke="var(--line)"
                strokeWidth={1}
              />
              {proj.stacked && (
                <text
                  x={proj.to([0, 0], layer)[0] - 8}
                  y={proj.to([0, 0], layer)[1] - 6}
                  fontSize={13 * labelScale}
                  fontFamily="var(--mono)"
                  fill={active ? 'var(--text-2)' : 'var(--text-3)'}
                  fontWeight={600}
                >
                  L{layer}
                </text>
              )}
              {proj.stacked && layer > 0 && <Verticals graph={graph} layer={layer} proj={proj} />}
              <Edges graph={graph} layer={layer} proj={proj} step={step} />
              {step && step.vis.layer === layer && (
                <StepOverlay graph={graph} layer={layer} proj={proj} step={step} beam={beam} labelScale={labelScale} />
              )}
              <Nodes
                graph={graph}
                layer={layer}
                proj={proj}
                step={step}
                sets={sets}
                selected={state.selected}
                labels={graph.nodes.size <= proj.labelLimit}
                dragging={drag}
                zoom={cam.z}
                labelScale={labelScale}
              />
              {step?.vis.query &&
                step.vis.queryLabel === 'q' &&
                (!proj.stacked || traceLayer === null || traceLayer === layer) && (
                  <QueryMark at={step.vis.query} layer={layer} proj={proj} zoom={cam.z} labelScale={labelScale} />
                )}
            </g>
          )
        })}
        {drag && <DragGhost graph={graph} drag={drag} proj={proj} layer={drag.layer} zoom={cam.z} />}
        </g>
      </svg>

      <CameraControls
        cam={cam}
        stacked={proj.stacked}
        onZoom={zoomBy}
        onReset={() => setCam((c) => ({ ...reframed(c), yaw: DEFAULT_CAMERA.yaw, pitch: DEFAULT_CAMERA.pitch }))}
        onYaw={(d) => setCam((c) => withYaw(c, c.yaw + d))}
        onPitch={(d) => setCam((c) => withPitch(c, c.pitch + d))}
        labelScale={labelScale}
        onLabelScale={(scale) => dispatch({ type: 'setGraphLabelScale', scale })}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
      />

      {!state.trace && graph.nodes.size === 0 && (
        <div className="canvas-overlay bl">
          <div className="legend">
            <span>No dots yet. Select Insert to add one, or open the Insert panel to build a dataset.</span>
          </div>
        </div>
      )}

      {hoverNode && (
        <NodeTip node={hoverNode} graph={graph} hover={hover!} step={step} metric={state.params.metric} />
      )}
      <AlertDialog.Root open={pendingMove !== null} onOpenChange={(open) => { if (!open) setPendingMove(null) }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="dialog-content">
            <AlertDialog.Title className="dialog-title">
              Move node {pendingMove ? graph.nodes.get(pendingMove.id)?.label ?? pendingMove.id : ''}?
            </AlertDialog.Title>
            <AlertDialog.Description className="dialog-description">
              Moving this node to [{pendingMove ? f1(pendingMove.to[0]) : ''}, {pendingMove ? f1(pendingMove.to[1]) : ''}] will update its links using <b>{state.updateMode}</b> mode.
            </AlertDialog.Description>
            <div className="dialog-actions">
              <AlertDialog.Cancel asChild><button className="iconbtn">Cancel</button></AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button className="iconbtn" onClick={() => {
                  if (pendingMove) dispatch({ type: 'moveNode', id: pendingMove.id, to: pendingMove.to })
                  setPendingMove(null)
                }}>Move node</button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}

function range(from: number, to: number): number[] {
  const out: number[] = []
  for (let i = from; i >= to; i--) out.push(i)
  return out
}

function Verticals({ graph, layer, proj }: { graph: Graph; layer: number; proj: Projector }) {
  return (
    <g stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 4" opacity={0.7}>
      {[...graph.nodes.values()]
        .filter((n) => n.level >= layer)
        .map((n) => {
          const a = proj.to(n.vec, layer)
          const b = proj.to(n.vec, layer - 1)
          return (
            <line
              key={n.id}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
    </g>
  )
}

function Edges({
  graph,
  layer,
  proj,
  step,
}: {
  graph: Graph
  layer: number
  proj: Projector
  step: Step | null
}) {
  const edges = useMemo(() => edgesOnLayer(graph, layer), [graph, layer])
  const newKeys = new Set((step?.vis.newEdges ?? []).map(key))
  const current = step?.vis.current
  return (
    <g fill="none" strokeLinecap="round">
      {edges.map(([a, b]) => {
        const na = graph.nodes.get(a)
        const nb = graph.nodes.get(b)
        if (!na || !nb) return null
        const p = proj.to(na.vec, layer)
        const q = proj.to(nb.vec, layer)
        const isNew = newKeys.has(key([a, b]))
        const onCurrent = current !== undefined && (a === current || b === current)
        const stroke = isNew ? 'var(--c-result)' : onCurrent ? 'var(--c-current)' : 'var(--edge)'
        return (
          <line
            key={`${a}:${b}`}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            stroke={stroke}
            strokeWidth={isNew ? 2.8 : onCurrent ? 2.2 : 1.3}
            opacity={isNew || onCurrent ? 1 : 0.9}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </g>
  )
}

/** Step-specific decoration: dropped edges (which no longer exist in the
 *  snapshot), the "why was this pruned" line, and the beam radius. */
function StepOverlay({
  graph,
  layer,
  proj,
  step,
  beam,
  labelScale,
}: {
  graph: Graph
  layer: number
  proj: Projector
  step: Step
  beam: number | null
  labelScale: GraphLabelScale
}) {
  const v = step.vis
  const pos = (id: NodeId) => {
    const n = graph.nodes.get(id)
    return n ? proj.to(n.vec, layer) : null
  }
  return (
    <g fill="none">
      {beam !== null && v.query && !proj.stacked && (
        <circle
          cx={proj.to(v.query, layer)[0]}
          cy={proj.to(v.query, layer)[1]}
          r={beam}
          stroke="var(--c-w)"
          strokeWidth={1.2}
          strokeDasharray="5 5"
          opacity={0.7}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {v.removedEdges.map(([a, b], i) => {
        const p = pos(a)
        const q = pos(b)
        if (!p || !q) return null
        return (
          <line
            key={`r${i}`}
            x1={p[0]}
            y1={p[1]}
            x2={q[0]}
            y2={q[1]}
            stroke="var(--c-reject)"
            strokeWidth={2}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {v.blocker !== undefined && v.considering !== undefined && (
        <BlockerMark a={pos(v.considering)} b={pos(v.blocker)} labelScale={labelScale} />
      )}
      {v.current !== undefined && v.query && (
        <DistLine a={proj.to(v.query, layer)} b={pos(v.current)} />
      )}
    </g>
  )
}

function BlockerMark({ a, b, labelScale }: { a: [number, number] | null; b: [number, number] | null; labelScale: GraphLabelScale }) {
  if (!a || !b) return null
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  return (
    <g>
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke="var(--c-reject)"
        strokeWidth={1.8}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={mx}
        y={my - 4}
        fontSize={12 * labelScale}
        fontWeight={700}
        fill="var(--c-reject)"
        textAnchor="middle"
      >
        ✕
      </text>
    </g>
  )
}

function DistLine({ a, b }: { a: [number, number]; b: [number, number] | null }) {
  if (!b) return null
  return (
    <line
      x1={a[0]}
      y1={a[1]}
      x2={b[0]}
      y2={b[1]}
      stroke="var(--c-query)"
      strokeWidth={1.4}
      strokeDasharray="4 3"
      opacity={0.85}
      vectorEffect="non-scaling-stroke"
    />
  )
}

interface NodeSets {
  visited: Set<NodeId>
  cand: Set<NodeId>
  dyn: Set<NodeId>
  results: Set<NodeId>
  accepted: Set<NodeId>
  rejected: Set<NodeId>
}

function Nodes({
  graph,
  layer,
  proj,
  step,
  sets,
  selected,
  labels,
  dragging,
  zoom,
  labelScale,
}: {
  graph: Graph
  layer: number
  proj: Projector
  step: Step | null
  sets: NodeSets
  selected: NodeId | null
  labels: boolean
  dragging: { id: NodeId; at: Vec; layer: number } | null
  zoom: number
  labelScale: GraphLabelScale
}) {
  const v = step?.vis
  const onLayer = [...graph.nodes.values()].filter((n) => n.level >= layer)
  const r = proj.nodeR
  const invZoom = 1 / Math.max(zoom, 0.0001)
  return (
    <g>
      {onLayer.map((n) => {
        const at = dragging?.id === n.id ? dragging.at : n.vec
        const [x, y] = proj.to(at, layer)
        const isCurrent = v?.current === n.id
        const isConsidering = v?.considering === n.id
        const isResult = sets.results.has(n.id)
        const isFocus = v?.focus === n.id
        const isEntry = graph.entry === n.id
        const inW = sets.dyn.has(n.id)
        const inC = sets.cand.has(n.id)
        const visited = sets.visited.has(n.id)
        const accepted = sets.accepted.has(n.id)
        const rejected = sets.rejected.has(n.id)

        let fill = 'var(--node-fill)'
        let stroke = 'var(--node)'
        let width = 1.4
        let radius = r
        if (visited) stroke = 'var(--c-visited)'
        if (inC) {
          stroke = 'var(--c-cand)'
          width = 1.9
        }
        if (accepted) {
          stroke = 'var(--c-result)'
          width = 2.2
        }
        if (rejected) {
          stroke = 'var(--c-reject)'
          width = 2
        }
        if (isResult) {
          fill = 'var(--c-result)'
          stroke = 'var(--c-result)'
        }
        if (isConsidering) {
          stroke = 'var(--c-current)'
          width = 2.2
        }
        if (isCurrent) {
          fill = 'var(--c-current)'
          stroke = 'var(--c-current)'
          radius = r + 1.6
        }
        const showLabel =
          labels ||
          isCurrent ||
          isConsidering ||
          isResult ||
          isFocus ||
          isEntry ||
          inW ||
          accepted ||
          rejected

        return (
          <g key={n.id}>
            <g transform={`translate(${x} ${y})`}>
              <g transform={`scale(${invZoom})`}>
                {inW && (
                  <circle
                    cx={0}
                    cy={0}
                    r={radius + 3.4}
                    fill="none"
                    stroke="var(--c-w)"
                    strokeWidth={1.6}
                  />
                )}
                {isEntry && (
                  <circle
                    cx={0}
                    cy={0}
                    r={radius + 6}
                    fill="none"
                    stroke="var(--c-entry)"
                    strokeWidth={2.2}
                  />
                )}
                {isFocus && (
                  <circle
                    cx={0}
                    cy={0}
                    r={radius + 8.5}
                    fill="none"
                    stroke="var(--c-query)"
                    strokeWidth={1.6}
                    strokeDasharray="3 3"
                  />
                )}
                {selected === n.id && (
                  <circle
                    cx={0}
                    cy={0}
                    r={radius + 5}
                    fill="none"
                    stroke="var(--text-1)"
                    strokeWidth={1.4}
                  />
                )}
                <circle
                  cx={0}
                  cy={0}
                  r={radius}
                  fill={n.deleted ? 'url(#tomb)' : fill}
                  stroke={stroke}
                  strokeWidth={width}
                  strokeDasharray={n.deleted ? '3 2' : undefined}
                  opacity={n.deleted ? 0.85 : 1}
                />
                {showLabel && (
                  <text
                    x={radius + 3}
                    y={-radius - 1}
                    fontSize={(proj.stacked ? 13 : 11) * labelScale}
                    fontFamily="var(--mono)"
                    fill={isCurrent || isResult || isFocus ? 'var(--text-1)' : 'var(--text-2)'}
                    fontWeight={isCurrent || isResult || isFocus || isEntry ? 600 : 400}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            </g>
          </g>
        )
      })}
    </g>
  )
}

function QueryMark({ at, layer, proj, zoom, labelScale }: { at: Vec; layer: number; proj: Projector; zoom: number; labelScale: GraphLabelScale }) {
  const [x, y] = proj.to(at, layer)
  const s = proj.nodeR * 1.8
  const invZoom = 1 / Math.max(zoom, 0.0001)
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`scale(${invZoom})`} stroke="var(--c-query)" strokeWidth={2.4}>
        <line x1={-s} y1={0} x2={s} y2={0} />
        <line x1={0} y1={-s} x2={0} y2={s} />
        <circle cx={0} cy={0} r={proj.nodeR * 1.15} fill="var(--c-query)" stroke="none" />
        <text
          x={s + 3}
          y={s + 3}
          fontSize={12 * labelScale}
          fontFamily="var(--mono)"
          fill="var(--c-query)"
          stroke="none"
          fontWeight={600}
        >
          q
        </text>
      </g>
    </g>
  )
}

function DragGhost({
  graph,
  drag,
  proj,
  layer,
  zoom,
}: {
  graph: Graph
  drag: { id: NodeId; at: Vec; layer: number }
  proj: Projector
  layer: number
  zoom: number
}) {
  const n = graph.nodes.get(drag.id)
  if (!n) return null
  const a = proj.to(n.vec, layer)
  const b = proj.to(drag.at, layer)
  const invZoom = 1 / Math.max(zoom, 0.0001)
  return (
    <g>
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke="var(--c-query)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <g transform={`translate(${b[0]} ${b[1]})`}>
        <g transform={`scale(${invZoom})`}>
          <circle cx={0} cy={0} r={proj.nodeR + 2} fill="none" stroke="var(--c-query)" strokeWidth={2} />
        </g>
      </g>
    </g>
  )
}

function NodeTip({
  node,
  graph,
  hover,
  step,
  metric,
}: {
  node: HNode
  graph: Graph
  hover: Hover
  step: Step | null
  metric: 'euclidean' | 'manhattan' | 'cosine'
}) {
  const q = step?.vis.query
  const deg = node.neighbors.map((l) => l.length)
  return (
    <div
      className="node-tip"
      style={{
        left: Math.max(6, hover.sx + 14),
        top: Math.max(6, hover.sy - 10),
      }}
    >
      <b>{node.label}</b> {node.deleted && <span className="chip warn">tombstoned</span>}
      {graph.entry === node.id && <span className="chip accent">entry point</span>}
      <dl>
        <dt>vector</dt>
        <dd>
          [{node.vec[0].toFixed(0)}, {node.vec[1].toFixed(0)}]
        </dd>
        <dt>top layer</dt>
        <dd>{node.level}</dd>
        <dt>degree / layer</dt>
        <dd>{deg.join(' · ')}</dd>
        {q && (
          <>
            <dt>distance to q</dt>
            <dd>{f1(distance(q, node.vec, metric))}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

const key = ([a, b]: [NodeId, NodeId]) => (a < b ? `${a}:${b}` : `${b}:${a}`)

function CameraControls({
  cam,
  stacked,
  onZoom,
  onReset,
  onYaw,
  onPitch,
  labelScale,
  onLabelScale,
  isFullscreen,
  onToggleFullscreen,
}: {
  cam: Camera
  stacked: boolean
  onZoom: (factor: number) => void
  onReset: () => void
  onYaw: (delta: number) => void
  onPitch: (delta: number) => void
  labelScale: GraphLabelScale
  onLabelScale: (scale: GraphLabelScale) => void
  isFullscreen: boolean
  onToggleFullscreen?: () => void
}) {
  const step = Math.PI / 12
  const labelIndex = GRAPH_LABEL_SCALES.indexOf(labelScale)
  return (
    <div className="canvas-footer">
      <TraceLegend />
      <div className="canvas-footer-actions">
        <details className="graph-settings">
          <summary aria-label="Graph display settings" title="Graph display settings">
            <svg className="gear-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>
          </summary>
          <div className="graph-settings-popover">
            {stacked && <div className="graph-settings-group">
              <span>Rotate and tilt</span>
              <div className="segmented" role="group" aria-label="Orientation">
                <button aria-label="Rotate left" title="Spin the stack left ( [ )" onClick={() => onYaw(-step)}>↺</button>
                <button aria-label="Rotate right" title="Spin the stack right ( ] )" onClick={() => onYaw(step)}>↻</button>
                <button aria-label="Tilt toward edge-on" title="Tilt towards edge-on ( , )" onClick={() => onPitch(-0.05)}>⌄</button>
                <button aria-label="Tilt toward top-down" title="Tilt towards top-down ( . )" onClick={() => onPitch(0.05)}>⌃</button>
              </div>
            </div>}
            <div className="graph-settings-group">
              <span>Text size</span>
              <div className="segmented" role="group" aria-label="Graph text size">
                <button aria-label="Decrease graph text size" title="Decrease graph text size" disabled={labelIndex === 0} onClick={() => onLabelScale(GRAPH_LABEL_SCALES[Math.max(0, labelIndex - 1)])}>A−</button>
                <button aria-label="Reset graph text size" title="Reset graph text size" disabled={labelScale === 1} onClick={() => onLabelScale(1)}>{Math.round(labelScale * 100)}%</button>
                <button aria-label="Increase graph text size" title="Increase graph text size" disabled={labelIndex === GRAPH_LABEL_SCALES.length - 1} onClick={() => onLabelScale(GRAPH_LABEL_SCALES[Math.min(GRAPH_LABEL_SCALES.length - 1, labelIndex + 1)])}>A+</button>
              </div>
            </div>
            <div className="graph-settings-group">
              <span>Zoom</span>
              <div className="segmented" role="group" aria-label="Zoom">
                <button aria-label="Zoom out" title="Zoom out ( − )" onClick={() => onZoom(1 / 1.3)} disabled={cam.z <= ZOOM_MIN}>−</button>
                <button aria-label="Zoom in" title="Zoom in ( + )" onClick={() => onZoom(1.3)} disabled={cam.z >= ZOOM_MAX}>+</button>
                <button aria-label="Reset view" title="Reset the view ( 0 )" onClick={onReset} disabled={isFramed(cam) && cam.yaw === DEFAULT_CAMERA.yaw && cam.pitch === DEFAULT_CAMERA.pitch}>{isFramed(cam) ? 'fit' : `${cam.z.toFixed(1)}×`}</button>
              </div>
            </div>
          </div>
        </details>
        <button className="graph-footer-button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onToggleFullscreen}>
          <svg viewBox="0 0 20 20" aria-hidden="true">{isFullscreen ? <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5"/> : <path d="M8 3H3v5M12 3h5v5M8 17H3v-5M12 17h5v-5"/>}</svg>
        </button>
      </div>
    </div>
  )
}
