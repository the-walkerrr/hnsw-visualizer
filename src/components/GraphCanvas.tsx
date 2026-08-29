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
import { useApp, useDispatch, useShownLayer, useViewGraph } from '../state/store'
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

const f1 = (x: number) => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(1))

interface Hover {
  id: NodeId
  layer: number
  sx: number
  sy: number
}

export function GraphCanvas() {
  const state = useApp()
  const dispatch = useDispatch()
  const graph = useViewGraph()
  const svgRef = useRef<SVGSVGElement>(null)
  const worldRef = useRef<SVGGElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const [drag, setDrag] = useState<{ id: NodeId; at: Vec; layer: number } | null>(null)
  const [cam, setCam] = useState<Camera>(DEFAULT_CAMERA)

  const step = state.trace?.steps[state.step] ?? null
  const { layer: shownLayer, fromTrace: traceLayer } = useShownLayer()
  const topLayer = graph.entry === null ? 0 : graph.topLayer
  const proj = useMemo(
    () =>
      state.viewMode === 'stack'
        ? stackProjector(topLayer, { yaw: cam.yaw, pitch: cam.pitch })
        : layerProjector(),
    [state.viewMode, topLayer, cam.yaw, cam.pitch],
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
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return
      if (e.key === '+' || e.key === '=') zoomBy(1.25)
      else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.25)
      else if (e.key === '0') setCam((c) => reframed(c))
      else if (e.key === '[') setCam((c) => withYaw(c, c.yaw - Math.PI / 12))
      else if (e.key === ']') setCam((c) => withYaw(c, c.yaw + Math.PI / 12))
      else if (e.key === ',') setCam((c) => withPitch(c, c.pitch - 0.04))
      else if (e.key === '.') setCam((c) => withPitch(c, c.pitch + 0.04))
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomBy])

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
  function dataAt(e: { clientX: number; clientY: number }): Hit | null {
    const ctm = worldRef.current?.getScreenCTM()
    if (!ctm) return null
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return proj.from([pt.x, pt.y], layers)
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
    if (state.tool === 'select' && (hit || pick(e, 'near'))) {
      const target = hit ?? pick(e, 'near')!
      dispatch({ type: 'select', id: target.id })
      if (hit) {
        const at = graph.nodes.get(hit.id)?.vec
        if (at) setDrag({ id: hit.id, at, layer: hit.layer })
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
      const spot = dataAt(e)
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
      if (moved) dispatch({ type: 'moveNode', id: drag.id, to: drag.at })
      setDrag(null)
      gesture.current = null
      setDragging(null)
      return
    }
    const g = gesture.current
    gesture.current = null
    setDragging(null)
    // A press that never moved is a click, so the tool still acts.
    if (!g || g.moved || !e) return
    const spot = dataAt(e)
    if (!spot) return
    if (state.tool === 'insert') dispatch({ type: 'script', ops: [{ t: 'insert', at: spot.at }] })
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
        state.tool +
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
        onContextMenu={(e) => e.preventDefault()}
        onPointerLeave={() => {
          setHover(null)
          onPointerUp()
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
                  fontSize={13}
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
                <StepOverlay graph={graph} layer={layer} proj={proj} step={step} beam={beam} />
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
              />
              {step?.vis.query &&
                step.vis.queryLabel === 'q' &&
                (!proj.stacked || traceLayer === null || traceLayer === layer) && (
                  <QueryMark at={step.vis.query} layer={layer} proj={proj} />
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
        onReset={() => setCam((c) => ({ ...reframed(c), yaw: 0, pitch: DEFAULT_CAMERA.pitch }))}
        onYaw={(d) => setCam((c) => withYaw(c, c.yaw + d))}
        onPitch={(d) => setCam((c) => withPitch(c, c.pitch + d))}
      />

      {!state.trace && graph.nodes.size === 0 && (
        <div className="canvas-overlay bl">
          <div className="legend">
            <span>The index is empty — switch to the insert tool and click to add vectors.</span>
          </div>
        </div>
      )}

      {hoverNode && (
        <NodeTip node={hoverNode} graph={graph} hover={hover!} step={step} metric={state.params.metric} />
      )}
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
}: {
  graph: Graph
  layer: number
  proj: Projector
  step: Step
  beam: number | null
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
        <BlockerMark a={pos(v.considering)} b={pos(v.blocker)} />
      )}
      {v.current !== undefined && v.query && (
        <DistLine a={proj.to(v.query, layer)} b={pos(v.current)} />
      )}
    </g>
  )
}

function BlockerMark({ a, b }: { a: [number, number] | null; b: [number, number] | null }) {
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
        fontSize={12}
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
                    fontSize={proj.stacked ? 13 : 11}
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

function QueryMark({ at, layer, proj }: { at: Vec; layer: number; proj: Projector }) {
  const [x, y] = proj.to(at, layer)
  const s = 10
  return (
    <g stroke="var(--c-query)" strokeWidth={2.4}>
      <line x1={x - s} y1={y} x2={x + s} y2={y} />
      <line x1={x} y1={y - s} x2={x} y2={y + s} />
      <circle cx={x} cy={y} r={4} fill="var(--c-query)" stroke="none" />
      <text
        x={x + 10}
        y={y + 13}
        fontSize={11}
        fontFamily="var(--mono)"
        fill="var(--c-query)"
        stroke="none"
        fontWeight={600}
      >
        q
      </text>
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
}: {
  cam: Camera
  stacked: boolean
  onZoom: (factor: number) => void
  onReset: () => void
  onYaw: (delta: number) => void
  onPitch: (delta: number) => void
}) {
  const step = Math.PI / 12
  return (
    <div
      className="canvas-overlay camera"
      title="Scroll to zoom · drag to pan · shift-drag to orbit · 0 to reset"
    >
      {stacked && (
        <div className="segmented" role="group" aria-label="Orientation">
          <button title="Spin the stack left ( [ )" onClick={() => onYaw(-step)}>
            ↺
          </button>
          <button title="Spin the stack right ( ] )" onClick={() => onYaw(step)}>
            ↻
          </button>
          <button title="Tilt towards edge-on ( , )" onClick={() => onPitch(-0.05)}>
            ⌄
          </button>
          <button title="Tilt towards top-down ( . )" onClick={() => onPitch(0.05)}>
            ⌃
          </button>
        </div>
      )}
      {stacked && <span className="chip">⇧drag = orbit</span>}
      <div className="segmented" role="group" aria-label="Zoom">
        <button title="Zoom out ( − )" onClick={() => onZoom(1 / 1.3)} disabled={cam.z <= ZOOM_MIN}>
          −
        </button>
        <button title="Zoom in ( + )" onClick={() => onZoom(1.3)} disabled={cam.z >= ZOOM_MAX}>
          +
        </button>
        <button
          title="Reset the view ( 0 )"
          onClick={onReset}
          disabled={isFramed(cam) && cam.yaw === 0}
        >
          {isFramed(cam) ? 'fit' : `${cam.z.toFixed(1)}×`}
        </button>
      </div>
    </div>
  )
}
