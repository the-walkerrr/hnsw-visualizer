import { PITCH_MAX, PITCH_MIN, type Orientation } from './project'

/**
 * The view transform sitting between the projection and the screen: a uniform
 * zoom with pan, plus the orientation handed to the stacked projector.
 *
 * Zoom and pan live in SVG user space as `translate(tx ty) scale(z)`, so the
 * browser's own CTM inverse still resolves pointer positions for us — no
 * hand-rolled inverse mapping, and `vector-effect: non-scaling-stroke` keeps
 * line weights constant however far in you go.
 */
export interface Camera extends Orientation {
  z: number
  tx: number
  ty: number
}

export const DEFAULT_CAMERA: Camera = { z: 1, tx: 0, ty: 0, yaw: 0, pitch: 0.26 }
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 14

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const cameraTransform = (c: Camera) => `translate(${c.tx} ${c.ty}) scale(${c.z})`

export const isFramed = (c: Camera) => c.z === 1 && c.tx === 0 && c.ty === 0

/** Zoom about a fixed point given in SVG user space, so whatever is under the
 *  cursor stays under the cursor. */
export function zoomAt(c: Camera, factor: number, at: { x: number; y: number }): Camera {
  const z = clamp(c.z * factor, ZOOM_MIN, ZOOM_MAX)
  if (z === c.z) return c
  // The content point currently under `at`, then solve for the pan that keeps
  // it there at the new scale.
  const wx = (at.x - c.tx) / c.z
  const wy = (at.y - c.ty) / c.z
  return { ...c, z, tx: at.x - wx * z, ty: at.y - wy * z }
}

/** Zoom about the middle of the viewport — what the +/− buttons do. */
export function zoomCentred(c: Camera, factor: number, centre: { x: number; y: number }): Camera {
  return zoomAt(c, factor, centre)
}

export const withPitch = (c: Camera, pitch: number): Camera => ({
  ...c,
  pitch: clamp(pitch, PITCH_MIN, PITCH_MAX),
})

export const withYaw = (c: Camera, yaw: number): Camera => ({ ...c, yaw })

export const reframed = (c: Camera): Camera => ({ ...c, z: 1, tx: 0, ty: 0 })
