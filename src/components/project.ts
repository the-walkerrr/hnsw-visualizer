import { WORLD } from '../hnsw/constants'
import type { Vec } from '../hnsw/types'

export interface Hit {
  at: Vec
  layer: number
}

/** Orientation of the stacked view: yaw spins the planes about the vertical
 *  axis, pitch tilts between edge-on and top-down. */
export interface Orientation {
  yaw: number
  pitch: number
}

export const DEFAULT_ORIENTATION: Orientation = { yaw: -Math.PI / 6, pitch: 0.26 }
export const PITCH_MIN = 0.1
export const PITCH_MAX = 0.5

export interface Projector {
  /** Data point → SVG user space, for a given layer. */
  to: (v: Vec, layer: number) => [number, number]
  /**
   * SVG user space → data point. Which plane was clicked matters in the stacked
   * view: the same screen point means a different vector on every layer, so the
   * candidate layers are tried and the one whose plane actually contains the
   * point wins.
   */
  from: (p: [number, number], layers: number[]) => Hit
  viewBox: string
  /** Corner path of one layer's plane. */
  plane: (layer: number) => string
  nodeR: number
  /** Above this node count, only highlighted nodes get a label. */
  labelLimit: number
  stacked: boolean
}

const W = WORLD.width
const H = WORLD.height
const CX = W / 2
const CY = H / 2
export const STACK_PLANE_PADDING = H * 0.1
const PLANE_W = W + STACK_PLANE_PADDING * 2
const PLANE_H = H + STACK_PLANE_PADDING * 2
/** Half-diagonal: the furthest a padded plane can get from the centre, whatever the
 *  yaw. Using it for the horizontal bound keeps the scale rock steady while
 *  rotating instead of pumping in and out. */
const PLANE_RADIUS = Math.hypot(PLANE_W, PLANE_H) / 2

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function layerProjector(bounds?: { width: number; height: number }): Projector {
  const W = bounds?.width ?? WORLD.width
  const H = bounds?.height ?? WORLD.height
  const planePad = Math.min(W, H) * 0.1
  const outerPad = 26
  return {
    to: (v) => [v[0], v[1]],
    from: (p, layers) => ({
      at: [clamp(p[0], 0, W), clamp(p[1], 0, H)],
      layer: layers[layers.length - 1] ?? 0,
    }),
    viewBox: `${-planePad - outerPad} ${-planePad - outerPad} ${W + (planePad + outerPad) * 2} ${H + (planePad + outerPad) * 2}`,
    plane: () => `M${-planePad} ${-planePad} H${W + planePad} V${H + planePad} H${-planePad} Z`,
    nodeR: 7,
    labelLimit: 60,
    stacked: false,
  }
}

/** A rotatable, tiltable projection so every layer can be seen as its own
 *  plane, stacked in the order searches walk them: top layer at the top. */
export function stackProjector(topLayer: number, o: Orientation): Projector {
  const cos = Math.cos(o.yaw)
  const sin = Math.sin(o.yaw)
  const pitch = clamp(o.pitch, PITCH_MIN, PITCH_MAX)
  // Layer separation is exactly the depth a plane occupies at *this* angle, plus
  // visible breathing room. So the planes never collide however far you spin — a screen point
  // maps to exactly one plane — while a head-on view stays as compact as it can
  // be, which is the view people spend their time in. Sizing the gap for the
  // worst-case angle instead would shrink the default stack by a third.
  const gap = (Math.abs(PLANE_W * sin) + Math.abs(PLANE_H * cos)) * pitch + 40

  const to = (v: Vec, layer: number): [number, number] => {
    const dx = v[0] - CX
    const dy = v[1] - CY
    return [dx * cos - dy * sin, (dx * sin + dy * cos) * pitch - layer * gap]
  }

  const corners = (layer: number) =>
    ([
      [-STACK_PLANE_PADDING, -STACK_PLANE_PADDING],
      [W + STACK_PLANE_PADDING, -STACK_PLANE_PADDING],
      [W + STACK_PLANE_PADDING, H + STACK_PLANE_PADDING],
      [-STACK_PLANE_PADDING, H + STACK_PLANE_PADDING],
    ] as Vec[]).map((c) => to(c, layer))

  const ys: number[] = []
  for (let l = 0; l <= Math.max(topLayer, 0); l++) for (const c of corners(l)) ys.push(c[1])
  // Leave enough room for enlarged node labels and the layer label at every
  // orientation; these extend beyond the plane itself.
  const pad = 56
  const minY = Math.min(...ys) - pad
  const maxY = Math.max(...ys) + pad

  return {
    to,
    from: (p, layers) => {
      let best = { at: [CX, CY] as Vec, layer: layers[layers.length - 1] ?? 0 }
      let bestMiss = Infinity
      // Front to back: layer 0 is painted last, so when planes do overlap the
      // one visually on top is the one the click belongs to.
      const order = (layers.length ? [...layers] : [0]).sort((a, b) => a - b)
      for (const layer of order) {
        // Invert the rotation for this plane's depth.
        const depth = (p[1] + layer * gap) / pitch
        const dx = p[0] * cos + depth * sin
        const dy = -p[0] * sin + depth * cos
        const x = dx + CX
        const y = dy + CY
        const miss =
          Math.max(0, -x) + Math.max(0, x - W) + Math.max(0, -y) + Math.max(0, y - H)
        if (miss < bestMiss) {
          bestMiss = miss
          best = { at: [clamp(x, 0, W), clamp(y, 0, H)], layer }
        }
        if (miss === 0) break
      }
      return best
    },
    viewBox: `${-PLANE_RADIUS - pad} ${minY} ${(PLANE_RADIUS + pad) * 2} ${maxY - minY}`,
    plane: (layer) => {
      const c = corners(layer)
      return `M${c[0][0]} ${c[0][1]} L${c[1][0]} ${c[1][1]} L${c[2][0]} ${c[2][1]} L${c[3][0]} ${c[3][1]} Z`
    },
    nodeR: 7.4,
    labelLimit: 24,
    stacked: true,
  }
}
