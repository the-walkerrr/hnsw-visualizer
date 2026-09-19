import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { distance } from '../../hnsw/metric'
import type { NodeId, Vec } from '../../hnsw/types'
import { editsLocked, useApp, useDispatch, useShownLayer, useViewGraph } from '../../state/store'
import {
  DEFAULT_CAMERA,
  cameraTransform,
  reframed,
  withPitch,
  withYaw,
  zoomAt,
  type Camera,
} from '../camera'
import { layerProjector, stackProjector, type Hit } from '../project'
import { f1 } from './format'
import { Verticals } from './Verticals'
import { Edges } from './Edges'
import { StepOverlay } from './StepOverlay'
import { Nodes } from './Nodes'
import { QueryMark } from './QueryMark'
import { DragGhost } from './DragGhost'
import { NodeTip } from './NodeTip'
import { CameraControls } from './CameraControls'

export interface Hover {
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
                  Layer {layer}
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
